// 全局状态
let params = [];
let headers = [];
let pinnedParams = new Set();
let searchQuery = '';
let headerTemplates = []; // 保存的Header模板列表

// DOM元素
const urlInput = document.getElementById('urlInput');
const parseBtn = document.getElementById('parseBtn');
const refreshBtn = document.getElementById('refreshBtn');
const clearBtn = document.getElementById('clearBtn');
const searchInput = document.getElementById('searchInput');
const paramsList = document.getElementById('paramsList');
const headersList = document.getElementById('headersList');
const addParamBtn = document.getElementById('addParamBtn');
const addHeaderBtn = document.getElementById('addHeaderBtn');
const applyParamsBtn = document.getElementById('applyParamsBtn');
const applyHeadersBtn = document.getElementById('applyHeadersBtn');
const exportHeadersBtn = document.getElementById('exportHeadersBtn');
const importHeadersBtn = document.getElementById('importHeadersBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前标签页URL
  await loadCurrentUrl();
  
  // 从存储加载数据
  await loadFromStorage();
  
  // 加载当前domain的headers（如果已应用过）
  await loadCurrentDomainHeaders();
  
  // 从文件系统自动加载模板
  await autoLoadTemplatesFromFiles();
  
  // 绑定事件
  bindEvents();
  
  // 渲染参数和headers
  renderParams();
  renderHeaders();
});

// 加载当前domain的headers
async function loadCurrentDomainHeaders() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const domain = url.hostname;
      const domainStorageKey = `domainHeaders_${domain}`;
      
      const result = await chrome.storage.local.get([domainStorageKey]);
      if (result[domainStorageKey] && Array.isArray(result[domainStorageKey])) {
        // 如果当前headers为空，或者domain的headers与当前不同，则加载domain的headers
        if (headers.length === 0 || 
            JSON.stringify(headers.map(h => ({key: h.key, value: h.value}))) !== 
            JSON.stringify(result[domainStorageKey])) {
          headers = result[domainStorageKey].map(h => ({
            id: Date.now() + Math.random(),
            key: h.key,
            value: h.value
          }));
        }
      }
    }
  } catch (error) {
    console.error('加载当前domain headers失败:', error);
  }
}

// 从文件系统自动加载模板
async function autoLoadTemplatesFromFiles() {
  try {
    // Chrome插件无法直接读取下载文件夹中的文件内容
    // 但我们可以通过chrome.storage.local持久化模板数据
    // 模板数据已经在loadFromStorage()中加载了
    
    // 这里可以添加额外的同步逻辑，比如检查文件是否存在
    // 由于API限制，实际的文件读取需要通过用户手动导入
    // 但storage中的数据已经足够持久化了
    
    // 确保模板数据已正确加载
    if (headerTemplates && headerTemplates.length > 0) {
      console.log(`已加载 ${headerTemplates.length} 个模板`);
    }
  } catch (error) {
    console.warn('自动加载模板文件失败:', error);
  }
}

// 加载当前标签页URL
async function loadCurrentUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      urlInput.value = tab.url;
      parseUrl(tab.url);
    }
  } catch (error) {
    console.error('获取当前URL失败:', error);
  }
}

// 从存储加载数据
async function loadFromStorage() {
  try {
    const result = await chrome.storage.local.get(['params', 'headers', 'pinnedParams', 'headerTemplates']);
    if (result.params) params = result.params;
    if (result.headers) headers = result.headers;
    if (result.pinnedParams) pinnedParams = new Set(result.pinnedParams);
    if (result.headerTemplates) headerTemplates = result.headerTemplates;
  } catch (error) {
    console.error('加载存储数据失败:', error);
  }
}

// 加载当前domain的headers（如果已应用过）
async function loadCurrentDomainHeaders() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const domain = url.hostname;
      const domainStorageKey = `domainHeaders_${domain}`;
      
      const result = await chrome.storage.local.get([domainStorageKey]);
      if (result[domainStorageKey] && Array.isArray(result[domainStorageKey]) && result[domainStorageKey].length > 0) {
        // 加载domain的headers到当前headers数组
        headers = result[domainStorageKey].map(h => ({
          id: Date.now() + Math.random(),
          key: h.key,
          value: h.value
        }));
        console.log(`已加载domain ${domain} 的headers:`, headers);
      }
    }
  } catch (error) {
    console.error('加载当前domain headers失败:', error);
  }
}

// 保存到存储
async function saveToStorage() {
  try {
    await chrome.storage.local.set({
      params,
      headers,
      pinnedParams: Array.from(pinnedParams),
      headerTemplates
    });
  } catch (error) {
    console.error('保存数据失败:', error);
  }
}

// 绑定事件
function bindEvents() {
  parseBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) {
      parseUrl(url);
    }
  });

  refreshBtn.addEventListener('click', () => {
    loadCurrentUrl();
  });

  clearBtn.addEventListener('click', () => {
    params = [];
    headers = [];
    pinnedParams.clear();
    urlInput.value = '';
    renderParams();
    renderHeaders();
    saveToStorage();
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderParams();
  });

  addParamBtn.addEventListener('click', () => {
    addParam('', '');
  });

  addHeaderBtn.addEventListener('click', () => {
    addHeader('', '');
  });

  applyParamsBtn.addEventListener('click', () => {
    applyParams();
  });

  applyHeadersBtn.addEventListener('click', () => {
    applyHeaders();
  });

  exportHeadersBtn.addEventListener('click', () => {
    exportHeadersToFile();
  });

  importHeadersBtn.addEventListener('click', () => {
    importHeadersFromFile();
  });

  // 标签页切换
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // URL输入框回车解析
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      parseBtn.click();
    }
  });
}

// 解析URL
function parseUrl(url) {
  try {
    const urlObj = new URL(url);
    const newParams = [];
    
    // 解析查询参数
    urlObj.searchParams.forEach((value, key) => {
      newParams.push({ key, value, id: Date.now() + Math.random() });
    });

    // 合并现有参数（保留已固定的参数）
    const existingKeys = new Set(params.map(p => p.key));
    newParams.forEach(newParam => {
      if (!existingKeys.has(newParam.key)) {
        params.push(newParam);
      }
    });

    // 排序：固定的参数在前
    sortParams();
    
    renderParams();
    saveToStorage();
  } catch (error) {
    alert('URL格式错误，请检查URL是否正确');
    console.error('解析URL失败:', error);
  }
}

// 排序参数（固定的在前）
function sortParams() {
  params.sort((a, b) => {
    const aPinned = pinnedParams.has(a.id);
    const bPinned = pinnedParams.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });
}

// 渲染参数列表
function renderParams() {
  paramsList.innerHTML = '';

  if (params.length === 0) {
    paramsList.innerHTML = '<div class="empty-state">请先输入URL并点击解析</div>';
    return;
  }

  // 过滤参数
  let filteredParams = params;
  if (searchQuery) {
    filteredParams = params.filter(p => 
      p.key.toLowerCase().includes(searchQuery) || 
      p.value.toLowerCase().includes(searchQuery)
    );
  }

  if (filteredParams.length === 0) {
    paramsList.innerHTML = '<div class="empty-state">未找到匹配的参数</div>';
    return;
  }

  // 创建参数项
  filteredParams.forEach((param, index) => {
    const item = createParamItem(param, index);
    paramsList.appendChild(item);
  });

  // 初始化拖拽
  initDragAndDrop();
}

// 创建参数项
function createParamItem(param, index) {
  const item = document.createElement('div');
  item.className = `param-item ${pinnedParams.has(param.id) ? 'pinned' : ''}`;
  item.draggable = true;
  item.dataset.id = param.id;
  item.dataset.index = index;

  const isPinned = pinnedParams.has(param.id);

  item.innerHTML = `
    <div class="drag-handle">☰</div>
    <button class="btn-pin ${isPinned ? 'pinned' : ''}" title="${isPinned ? '取消固定' : '固定到顶部'}">
      ${isPinned ? '📌' : '📍'}
    </button>
    <div class="param-key">
      <input type="text" value="${escapeHtml(param.key)}" placeholder="参数名" />
    </div>
    <div class="param-value">
      <input type="text" value="${escapeHtml(param.value)}" placeholder="参数值" />
    </div>
    <div class="param-actions">
      <button class="btn btn-danger delete-btn">删除</button>
    </div>
  `;

  // 绑定事件
  const keyInput = item.querySelector('.param-key input');
  const valueInput = item.querySelector('.param-value input');
  const deleteBtn = item.querySelector('.delete-btn');
  const pinBtn = item.querySelector('.btn-pin');

  keyInput.addEventListener('input', (e) => {
    param.key = e.target.value;
    saveToStorage();
  });

  valueInput.addEventListener('input', (e) => {
    param.value = e.target.value;
    saveToStorage();
  });

  deleteBtn.addEventListener('click', () => {
    params = params.filter(p => p.id !== param.id);
    pinnedParams.delete(param.id);
    renderParams();
    saveToStorage();
  });

  pinBtn.addEventListener('click', () => {
    if (pinnedParams.has(param.id)) {
      pinnedParams.delete(param.id);
    } else {
      pinnedParams.add(param.id);
    }
    sortParams();
    renderParams();
    saveToStorage();
  });

  return item;
}

// 添加参数
function addParam(key, value) {
  const newParam = {
    id: Date.now() + Math.random(),
    key,
    value
  };
  params.push(newParam);
  renderParams();
  saveToStorage();
}

// 初始化拖拽功能
let draggedItem = null;
let draggedItemId = null;

function initDragAndDrop() {
  const items = paramsList.querySelectorAll('.param-item');

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      draggedItemId = item.dataset.id;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.innerHTML);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      // 清理所有拖拽相关的样式
      items.forEach(i => i.classList.remove('drag-over'));
      draggedItem = null;
      draggedItemId = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      // 添加视觉反馈
      if (item !== draggedItem) {
        item.classList.add('drag-over');
      }
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      
      if (draggedItem && draggedItemId && item !== draggedItem) {
        const targetId = item.dataset.id;
        
        const draggedIndex = params.findIndex(p => p.id == draggedItemId);
        const targetIndex = params.findIndex(p => p.id == targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          // 移动参数
          const [moved] = params.splice(draggedIndex, 1);
          params.splice(targetIndex, 0, moved);
          
          // 重新排序（保持固定参数在前）
          sortParams();
          renderParams();
          saveToStorage();
        }
      }
    });
  });

  // 在列表容器上处理drop事件（用于拖到列表末尾）
  paramsList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  paramsList.addEventListener('drop', (e) => {
    e.preventDefault();
    
    if (draggedItemId) {
      const afterElement = getDragAfterElement(paramsList, e.clientY);
      const draggedIndex = params.findIndex(p => p.id == draggedItemId);
      
      if (draggedIndex !== -1) {
        if (afterElement == null) {
          // 拖到末尾
          const [moved] = params.splice(draggedIndex, 1);
          params.push(moved);
        } else {
          const targetId = afterElement.dataset.id;
          const targetIndex = params.findIndex(p => p.id == targetId);
          
          if (targetIndex !== -1) {
            const [moved] = params.splice(draggedIndex, 1);
            params.splice(targetIndex, 0, moved);
          }
        }
        
        sortParams();
        renderParams();
        saveToStorage();
      }
    }
  });
}

// 获取拖拽后的元素位置
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.param-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 渲染Headers列表
function renderHeaders() {
  headersList.innerHTML = '';

  if (headers.length === 0) {
    headersList.innerHTML = '<div class="empty-state">暂无Headers</div>';
    return;
  }

  headers.forEach((header, index) => {
    const item = createHeaderItem(header, index);
    headersList.appendChild(item);
  });
}

// 创建Header项
function createHeaderItem(header, index) {
  const item = document.createElement('div');
  item.className = 'header-item';
  item.dataset.id = header.id;

  item.innerHTML = `
    <div class="header-key">
      <input type="text" value="${escapeHtml(header.key)}" placeholder="Header名称" />
    </div>
    <div class="header-value">
      <input type="text" value="${escapeHtml(header.value)}" placeholder="Header值" />
    </div>
    <div class="header-actions-item">
      <button class="btn btn-danger delete-btn">删除</button>
    </div>
  `;

  // 绑定事件
  const keyInput = item.querySelector('.header-key input');
  const valueInput = item.querySelector('.header-value input');
  const deleteBtn = item.querySelector('.delete-btn');

  keyInput.addEventListener('input', (e) => {
    header.key = e.target.value;
    saveToStorage();
  });

  valueInput.addEventListener('input', (e) => {
    header.value = e.target.value;
    saveToStorage();
  });

  deleteBtn.addEventListener('click', () => {
    headers = headers.filter(h => h.id !== header.id);
    renderHeaders();
    saveToStorage();
  });

  return item;
}

// 添加Header
function addHeader(key, value) {
  const newHeader = {
    id: Date.now() + Math.random(),
    key,
    value
  };
  headers.push(newHeader);
  renderHeaders();
  saveToStorage();
}

// 应用参数
async function applyParams() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      alert('无法获取当前标签页');
      return;
    }

    const urlObj = new URL(tab.url);
    
    // 清空现有参数
    urlObj.search = '';
    
    // 添加新参数
    params.forEach(param => {
      if (param.key && param.value) {
        urlObj.searchParams.append(param.key, param.value);
      }
    });

    // 导航到新URL
    await chrome.tabs.update(tab.id, { url: urlObj.toString() });
    
    // 更新输入框
    urlInput.value = urlObj.toString();
  } catch (error) {
    alert('应用参数失败: ' + error.message);
    console.error('应用参数失败:', error);
  }
}

// 应用Headers
async function applyHeaders() {
  try {
    // 发送消息到background script来注入headers
    const validHeaders = headers.filter(h => h.key && h.value);
    
    if (validHeaders.length === 0) {
      alert('请至少添加一个有效的Header');
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      alert('无法获取当前标签页');
      return;
    }

    // 发送消息到background script
    chrome.runtime.sendMessage({
      action: 'injectHeaders',
      headers: validHeaders,
      tabId: tab.id
    }, (response) => {
      if (response && response.success) {
        alert('Headers已应用，请刷新页面查看效果');
      } else {
        alert('应用Headers失败: ' + (response?.error || '未知错误'));
      }
    });
  } catch (error) {
    alert('应用Headers失败: ' + error.message);
    console.error('应用Headers失败:', error);
  }
}

// 切换标签页
function switchTab(tab) {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tab}Tab`);
  });
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Header模板管理功能 ====================

// 渲染模板列表
function renderTemplates() {
  templatesList.innerHTML = '';

  if (headerTemplates.length === 0) {
    templatesList.innerHTML = '<div class="empty-state">暂无保存的模板</div>';
    return;
  }

  headerTemplates.forEach((template, index) => {
    const item = createTemplateItem(template, index);
    templatesList.appendChild(item);
  });
}

// 创建模板项
function createTemplateItem(template, index) {
  const item = document.createElement('div');
  item.className = 'template-item';
  item.dataset.id = template.id;

  const headerCount = template.headers ? template.headers.length : 0;
  const date = new Date(template.saveTime).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  item.innerHTML = `
    <div class="template-name">${escapeHtml(template.name)}</div>
    <div class="template-meta">${headerCount}个Header · ${date}</div>
    <div class="template-actions">
      <button class="btn btn-primary load-template-btn" title="加载">加载</button>
      <button class="btn btn-danger delete-template-btn" title="删除">删除</button>
    </div>
  `;

  // 绑定事件
  const loadBtn = item.querySelector('.load-template-btn');
  const deleteBtn = item.querySelector('.delete-template-btn');

  loadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    loadTemplate(template.id);
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`确定要删除模板"${template.name}"吗？`)) {
      deleteTemplate(template.id);
    }
  });

  return item;
}

// 显示保存模板对话框
function showSaveTemplateModal() {
  const validHeaders = headers.filter(h => h.key && h.value);
  
  if (validHeaders.length === 0) {
    alert('请先添加至少一个有效的Header');
    return;
  }

  const name = prompt('请输入模板名称:', `Header模板_${new Date().toLocaleDateString()}`);
  
  if (name && name.trim()) {
    saveHeaderTemplate(name.trim(), validHeaders);
  }
}

// 保存Header模板到浏览器存储和文件系统
async function saveHeaderTemplate(name, headersToSave) {
  const template = {
    id: Date.now() + Math.random(),
    name: name,
    headers: headersToSave.map(h => ({ key: h.key, value: h.value })),
    saveTime: Date.now()
  };

  headerTemplates.push(template);
  await saveToStorage();
  
  // 自动保存到文件系统
  await autoSaveTemplateToFile(template);
  
  alert(`模板"${name}"已保存！`);
}

// 自动保存模板到文件系统
async function autoSaveTemplateToFile(template) {
  try {
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      template: template,
      headers: template.headers
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 保存到固定位置：下载文件夹下的插件专用文件夹
    const filename = `url-parser-plugin/templates/${template.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${template.id}.json`;

    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    });

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.warn('自动保存模板到文件失败:', error);
    // 不显示错误，因为浏览器存储已经保存成功
  }
}

// 加载模板
function loadTemplate(templateId) {
  const template = headerTemplates.find(t => t.id == templateId);
  
  if (!template || !template.headers) {
    alert('模板不存在或已损坏');
    return;
  }

  if (confirm(`确定要加载模板"${template.name}"吗？当前Headers将被替换。`)) {
    // 清空现有headers
    headers = [];
    
    // 加载模板中的headers
    template.headers.forEach(h => {
      headers.push({
        id: Date.now() + Math.random(),
        key: h.key,
        value: h.value
      });
    });

    renderHeaders();
    saveToStorage();
    alert(`模板"${template.name}"已加载！`);
  }
}

// 删除模板
function deleteTemplate(templateId) {
  headerTemplates = headerTemplates.filter(t => t.id != templateId);
  saveToStorage();
}

// 导出Headers到文件（保存到下载文件夹，支持导出为模板）
async function exportHeadersToFile() {
  const validHeaders = headers.filter(h => h.key && h.value);
  
  if (validHeaders.length === 0) {
    alert('没有可导出的Headers');
    return;
  }

  // 询问是否导出为模板
  const exportAsTemplate = confirm('是否导出为模板格式？\n点击"确定"导出为模板，点击"取消"仅导出Headers');
  
  try {
    let exportData;
    let filename;
    
    if (exportAsTemplate) {
      // 导出为模板格式
      const templateName = prompt('请输入模板名称:', `Header模板_${new Date().toLocaleDateString()}`);
      if (!templateName || !templateName.trim()) {
        return; // 用户取消
      }
      
      const template = {
        id: Date.now() + Math.random(),
        name: templateName.trim(),
        headers: validHeaders.map(h => ({ key: h.key, value: h.value })),
        saveTime: Date.now()
      };
      
      exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        template: template,
        headers: validHeaders.map(h => ({ key: h.key, value: h.value }))
      };
      
      const safeName = templateName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      filename = `url-parser-plugin/templates/${safeName}_${template.id}.json`;
    } else {
      // 仅导出Headers
      exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        headers: validHeaders.map(h => ({ key: h.key, value: h.value }))
      };
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      filename = `headers_${timestamp}.json`;
    }

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 使用Downloads API下载文件
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false // 直接保存到默认下载文件夹，不弹出对话框
    });

    // 清理URL对象
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (exportAsTemplate) {
      // 如果导出为模板，同时保存到浏览器存储
      const template = exportData.template;
      headerTemplates.push(template);
      await saveToStorage();
      alert(`模板"${template.name}"已导出并保存！`);
    } else {
      alert(`Headers已导出到下载文件夹: ${filename}`);
    }
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + error.message);
    
    // 备用方案：使用a标签下载
    try {
      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        headers: validHeaders.map(h => ({ key: h.key, value: h.value }))
      };
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `headers_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      alert('Headers已导出（备用方案）');
    } catch (fallbackError) {
      alert('导出失败，请检查权限设置');
    }
  }
}

// 从文件导入Headers
function importHeadersFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 检查是否是模板文件格式
      if (data.template && data.template.headers) {
        // 这是模板文件，导入为模板
        const template = data.template;
        if (!headerTemplates.find(t => t.id == template.id)) {
          headerTemplates.push(template);
          await saveToStorage();
          alert(`成功导入模板"${template.name}"！`);
        } else {
          alert('该模板已存在');
        }
        return;
      }

      // 普通headers文件
      if (!data.headers || !Array.isArray(data.headers)) {
        alert('文件格式错误：缺少headers字段');
        return;
      }

      if (data.headers.length === 0) {
        alert('文件中没有Headers数据');
        return;
      }

      if (confirm(`确定要导入 ${data.headers.length} 个Headers吗？当前Headers将被替换。`)) {
        // 清空现有headers
        headers = [];

        // 导入headers
        data.headers.forEach(h => {
          if (h.key && h.value) {
            headers.push({
              id: Date.now() + Math.random(),
              key: h.key,
              value: h.value
            });
          }
        });

        renderHeaders();
        saveToStorage();
        alert(`成功导入 ${headers.length} 个Headers！`);
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败: ' + error.message + '\n请确保文件是有效的JSON格式');
    }
  };

  input.click();
}

// 从文件系统同步模板
async function syncTemplatesFromFiles() {
  try {
    // 提示用户选择模板文件夹或文件
    alert('请选择下载文件夹中的模板文件进行同步。\n模板文件通常位于：下载文件夹/url-parser-plugin/templates/');
    
    // 打开文件选择器，让用户选择模板文件
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.multiple = true; // 允许选择多个文件
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      let importedCount = 0;
      let updatedCount = 0;

      for (const file of files) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);

          if (data.template && data.template.headers) {
            const template = data.template;
            const existingIndex = headerTemplates.findIndex(t => t.id == template.id);
            
            if (existingIndex >= 0) {
              // 更新现有模板
              headerTemplates[existingIndex] = template;
              updatedCount++;
            } else {
              // 添加新模板
              headerTemplates.push(template);
              importedCount++;
            }
          }
        } catch (error) {
          console.warn(`处理文件 ${file.name} 失败:`, error);
        }
      }

      if (importedCount > 0 || updatedCount > 0) {
        await saveToStorage();
        alert(`同步完成！\n新增: ${importedCount} 个模板\n更新: ${updatedCount} 个模板`);
      } else {
        alert('没有找到有效的模板文件');
      }
    };

    input.click();
  } catch (error) {
    console.error('同步模板失败:', error);
    alert('同步模板失败: ' + error.message);
  }
}

