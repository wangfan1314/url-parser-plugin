// Background service worker - 用于处理Header注入和Badge显示

// 存储要注入的headers
const headerMap = new Map();

// ==================== Badge 自动显示 ====================

// 更新扩展图标的Badge（显示URL参数数量）
function updateBadge(tabId, url) {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }
    const urlObj = new URL(url);
    const paramCount = [...urlObj.searchParams].length;

    if (paramCount > 0) {
      // URL有参数时，显示参数数量
      chrome.action.setBadgeText({ text: String(paramCount), tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea', tabId });
      chrome.action.setBadgeTextColor({ color: '#ffffff', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch (e) {
    // 忽略无效URL
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// 监听标签页URL变化，更新Badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    updateBadge(tabId, changeInfo.url);
  }
  if (changeInfo.status === 'complete' && tab.url) {
    updateBadge(tabId, tab.url);
  }
});

// 切换标签页时更新Badge
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      updateBadge(activeInfo.tabId, tab.url);
    }
  } catch (e) {
    // 忽略错误
  }
});

// 插件启动时，恢复所有保存的headers规则
chrome.runtime.onStartup.addListener(() => {
  restoreAllHeaders();
});

chrome.runtime.onInstalled.addListener(() => {
  restoreAllHeaders();
});

// 插件启动时立即恢复（不等待事件）
restoreAllHeaders();

// 恢复所有保存的headers
async function restoreAllHeaders() {
  try {
    const result = await chrome.storage.local.get(null);
    const domainHeaderMap = {};
    
    // 收集所有按domain保存的headers
    Object.keys(result).forEach(key => {
      if (key.startsWith('domainHeaders_')) {
        const domain = key.replace('domainHeaders_', '');
        domainHeaderMap[domain] = result[key];
      }
    });
    
    console.log(`发现 ${Object.keys(domainHeaderMap).length} 个domain需要恢复headers`);
    
    // 为每个domain重新应用headers规则
    for (const [domain, headers] of Object.entries(domainHeaderMap)) {
      if (Array.isArray(headers) && headers.length > 0) {
        try {
          await applyHeadersForDomain(domain, headers);
        } catch (error) {
          console.error(`恢复domain ${domain} 的headers失败:`, error);
        }
      }
    }
    
    console.log('Headers恢复完成');
  } catch (error) {
    console.error('恢复headers失败:', error);
  }
}

// 生成稳定的规则ID（基于domain和header key）
// 使用固定的起始ID范围，避免与其他扩展冲突
const RULE_ID_BASE = 1000000; // 从1000000开始，避免与其他规则冲突

function generateRuleId(domain, headerKey, index) {
  // 使用domain和header key生成hash，确保ID稳定且唯一
  const str = `${domain}_${headerKey}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  // 使用hash + index + 基础ID，确保唯一性
  const id = RULE_ID_BASE + Math.abs(hash) % 100000 + index;
  // 确保ID在有效范围内
  return Math.min(id, 2147483647);
}

// 为特定domain应用headers（不依赖tabId）
async function applyHeadersForDomain(domain, headers) {
  // 清理该domain的旧规则
  const storageKey = `domainRules_${domain}`;
  const stored = await chrome.storage.local.get([storageKey]);
  if (stored[storageKey] && Array.isArray(stored[storageKey]) && stored[storageKey].length > 0) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: stored[storageKey].map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0)
      });
    } catch (error) {
      console.warn('清理旧规则失败:', error);
    }
  }

  // 准备规则（使用稳定的ID生成策略）
  const rules = headers.map((header, index) => {
    const ruleId = generateRuleId(domain, header.key, index);
    
    return {
      id: ruleId,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: header.key,
            operation: 'set',
            value: header.value
          }
        ]
      },
      condition: {
        requestDomains: [domain],
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other', 'script', 'stylesheet', 'image', 'font', 'media', 'websocket', 'webtransport']
      }
    };
  });

    // 添加规则
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules,
        removeRuleIds: []
      });

      // 存储规则ID
      await chrome.storage.local.set({ 
        [storageKey]: rules.map(r => r.id)
      });
      
      console.log(`成功为domain ${domain} 应用 ${rules.length} 个header规则`);
      console.log('规则详情:', rules.map(r => ({
        id: r.id,
        header: r.action.requestHeaders[0].header,
        value: r.action.requestHeaders[0].value
      })));
      
      // 验证规则是否已添加
      const allRules = await chrome.declarativeNetRequest.getDynamicRules();
      const ourRules = allRules.filter(r => rules.some(rule => rule.id === r.id));
      console.log(`验证：找到 ${ourRules.length} 个已应用的规则`);
    } catch (error) {
      console.error(`应用headers规则失败 (domain: ${domain}):`, error);
      throw error;
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'injectHeaders') {
    const { headers, tabId } = request;
    
    // 存储headers
    headerMap.set(tabId, headers);
    
    // 使用declarativeNetRequest API注入headers
    injectHeadersWithDeclarativeNetRequest(headers, tabId)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('注入headers失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // 保持消息通道开放
  }
  
  if (request.action === 'clearHeaders') {
    const { tabId } = request;
    headerMap.delete(tabId);
    sendResponse({ success: true });
  }
});

// 使用declarativeNetRequest API注入headers
async function injectHeadersWithDeclarativeNetRequest(headers, tabId) {
  try {
    // 获取当前标签页信息
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      throw new Error('Cannot get tab info');
    }

    const url = new URL(tab.url);
    const domain = url.hostname;

    // 保存headers到storage（按domain保存，实现持久化）
    const domainStorageKey = `domainHeaders_${domain}`;
    await chrome.storage.local.set({
      [domainStorageKey]: headers.map(h => ({ key: h.key, value: h.value }))
    });

    // 应用headers到domain（持久化，不依赖tabId）
    await applyHeadersForDomain(domain, headers);

    // 同时保存tabId关联（用于清理）
    const tabStorageKey = `headerRules_${tabId}`;
    const domainRulesKey = `domainRules_${domain}`;
    const stored = await chrome.storage.local.get([domainRulesKey]);
    if (stored[domainRulesKey]) {
      await chrome.storage.local.set({
        [tabStorageKey]: stored[domainRulesKey]
      });
    }

    return true;
  } catch (error) {
    console.error('使用declarativeNetRequest注入headers失败:', error);
    throw error;
  }
}

// 监听标签页更新事件，确保页面刷新时headers仍然有效
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 在页面开始加载时就应用规则，确保规则在请求发送前就存在
  if (changeInfo.status === 'loading' && tab.url) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      // 检查该domain是否有保存的headers
      const storageKey = `domainHeaders_${domain}`;
      const stored = await chrome.storage.local.get([storageKey]);
      
      if (stored[storageKey] && Array.isArray(stored[storageKey]) && stored[storageKey].length > 0) {
        // 立即应用规则，不等待
        try {
          // 检查规则是否已存在
          const rulesKey = `domainRules_${domain}`;
          const rulesStored = await chrome.storage.local.get([rulesKey]);
          
          // 如果规则不存在或为空，立即重新应用
          if (!rulesStored[rulesKey] || rulesStored[rulesKey].length === 0) {
            console.log(`页面加载检测：为domain ${domain} 立即应用headers`);
            await applyHeadersForDomain(domain, stored[storageKey]);
          } else {
            // 验证规则是否真的存在
            const allRules = await chrome.declarativeNetRequest.getDynamicRules();
            const existingRules = allRules.filter(r => rulesStored[rulesKey].includes(r.id));
            
            if (existingRules.length === 0) {
              console.log(`规则丢失检测：为domain ${domain} 重新应用headers`);
              await applyHeadersForDomain(domain, stored[storageKey]);
            }
          }
        } catch (error) {
          console.warn(`页面加载时应用headers失败 (domain: ${domain}):`, error);
        }
      }
    } catch (error) {
      // 忽略错误（可能是chrome://等特殊URL）
    }
  }
});

// 标签页关闭时清理headers（但不删除domain规则，因为需要持久化）
chrome.tabs.onRemoved.addListener((tabId) => {
  headerMap.delete(tabId);
  
  // 只清理tabId关联，不删除domain规则
  chrome.storage.local.remove(`headerRules_${tabId}`);
});

// 注意：在Manifest V3中，我们使用declarativeNetRequest API来注入headers
// webRequest API的blocking模式在Manifest V3中已被移除，不再支持
// declarativeNetRequest是推荐的方案，性能更好且更安全

