// ==================== 国际化辅助函数 ====================

// 获取国际化消息的快捷函数
function i18n(key, ...substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

// 初始化页面上的所有国际化文本
function initI18n() {
  // 替换 data-i18n 属性（textContent）
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });

  // 替换 data-i18n-placeholder 属性
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.placeholder = msg;
  });

  // 替换 data-i18n-title 属性
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.title = msg;
  });

  // 设置html的lang属性
  const uiLang = chrome.i18n.getUILanguage();
  document.documentElement.lang = uiLang.startsWith('zh') ? 'zh-CN' : 'en';
}

// ==================== 全局状态 ====================

let params = [];
let headers = [];
let pinnedParams = new Set();
let searchQuery = '';
let headerTemplates = []; // 保存的Header模板列表

// ==================== DOM元素 ====================

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

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', async () => {
  // 初始化国际化
  initI18n();

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

// ==================== 数据加载 ====================

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
    console.error('Failed to load domain headers:', error);
  }
}

// 从文件系统自动加载模板
async function autoLoadTemplatesFromFiles() {
  try {
    if (headerTemplates && headerTemplates.length > 0) {
      console.log(`Loaded ${headerTemplates.length} templates`);
    }
  } catch (error) {
    console.warn('Auto-load templates failed:', error);
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
    console.error('Failed to get current URL:', error);
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
    console.error('Failed to load storage:', error);
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
        headers = result[domainStorageKey].map(h => ({
          id: Date.now() + Math.random(),
          key: h.key,
          value: h.value
        }));
        console.log(`Loaded headers for domain ${domain}:`, headers);
      }
    }
  } catch (error) {
    console.error('Failed to load domain headers:', error);
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
    console.error('Failed to save storage:', error);
  }
}

// ==================== 事件绑定 ====================

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

// ==================== URL解析 ====================

function parseUrl(url) {
  try {
    const urlObj = new URL(url);
    const newParams = [];

    urlObj.searchParams.forEach((value, key) => {
      newParams.push({ key, value, id: Date.now() + Math.random() });
    });

    const existingKeys = new Set(params.map(p => p.key));
    newParams.forEach(newParam => {
      if (!existingKeys.has(newParam.key)) {
        params.push(newParam);
      }
    });

    sortParams();
    renderParams();
    saveToStorage();
  } catch (error) {
    alert(i18n('urlFormatError'));
    console.error('Failed to parse URL:', error);
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

// ==================== 参数渲染 ====================

function renderParams() {
  paramsList.innerHTML = '';

  if (params.length === 0) {
    paramsList.innerHTML = `<div class="empty-state">${i18n('emptyParams')}</div>`;
    return;
  }

  let filteredParams = params;
  if (searchQuery) {
    filteredParams = params.filter(p =>
      p.key.toLowerCase().includes(searchQuery) ||
      p.value.toLowerCase().includes(searchQuery)
    );
  }

  if (filteredParams.length === 0) {
    paramsList.innerHTML = `<div class="empty-state">${i18n('noMatchingParams')}</div>`;
    return;
  }

  filteredParams.forEach((param, index) => {
    const item = createParamItem(param, index);
    paramsList.appendChild(item);
  });

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
    <button class="btn-pin ${isPinned ? 'pinned' : ''}" title="${isPinned ? i18n('unpinParam') : i18n('pinToTop')}">
      ${isPinned ? '📌' : '📍'}
    </button>
    <div class="param-key">
      <input type="text" value="${escapeHtml(param.key)}" placeholder="${i18n('paramNamePlaceholder')}" />
    </div>
    <div class="param-value">
      <input type="text" value="${escapeHtml(param.value)}" placeholder="${i18n('paramValuePlaceholder')}" />
    </div>
    <div class="param-actions">
      <button class="btn btn-danger delete-btn">${i18n('deleteBtn')}</button>
    </div>
  `;

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

// ==================== 拖拽功能 ====================

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
      items.forEach(i => i.classList.remove('drag-over'));
      draggedItem = null;
      draggedItemId = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
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
          const [moved] = params.splice(draggedIndex, 1);
          params.splice(targetIndex, 0, moved);
          sortParams();
          renderParams();
          saveToStorage();
        }
      }
    });
  });

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

// ==================== Headers渲染 ====================

function renderHeaders() {
  headersList.innerHTML = '';

  if (headers.length === 0) {
    headersList.innerHTML = `<div class="empty-state">${i18n('emptyHeaders')}</div>`;
    return;
  }

  headers.forEach((header, index) => {
    const item = createHeaderItem(header, index);
    headersList.appendChild(item);
  });
}

function createHeaderItem(header, index) {
  const item = document.createElement('div');
  item.className = 'header-item';
  item.dataset.id = header.id;

  item.innerHTML = `
    <div class="header-key">
      <input type="text" value="${escapeHtml(header.key)}" placeholder="${i18n('headerNamePlaceholder')}" />
    </div>
    <div class="header-value">
      <input type="text" value="${escapeHtml(header.value)}" placeholder="${i18n('headerValuePlaceholder')}" />
    </div>
    <div class="header-actions-item">
      <button class="btn btn-danger delete-btn">${i18n('deleteBtn')}</button>
    </div>
  `;

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

// ==================== 应用参数和Headers ====================

async function applyParams() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      alert(i18n('cannotGetTab'));
      return;
    }

    const urlObj = new URL(tab.url);
    urlObj.search = '';

    params.forEach(param => {
      if (param.key && param.value) {
        urlObj.searchParams.append(param.key, param.value);
      }
    });

    await chrome.tabs.update(tab.id, { url: urlObj.toString() });
    urlInput.value = urlObj.toString();
  } catch (error) {
    alert(i18n('applyParamsFailed') + error.message);
    console.error('Failed to apply params:', error);
  }
}

async function applyHeaders() {
  try {
    const validHeaders = headers.filter(h => h.key && h.value);

    if (validHeaders.length === 0) {
      alert(i18n('addValidHeader'));
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      alert(i18n('cannotGetTab'));
      return;
    }

    chrome.runtime.sendMessage({
      action: 'injectHeaders',
      headers: validHeaders,
      tabId: tab.id
    }, (response) => {
      if (response && response.success) {
        alert(i18n('headersApplied'));
      } else {
        alert(i18n('applyHeadersFailed') + (response?.error || i18n('unknownError')));
      }
    });
  } catch (error) {
    alert(i18n('applyHeadersFailed') + error.message);
    console.error('Failed to apply headers:', error);
  }
}

// ==================== 标签页切换 ====================

function switchTab(tab) {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tab}Tab`);
  });
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Header模板管理功能 ====================

function renderTemplates() {
  if (typeof templatesList === 'undefined' || !templatesList) return;
  templatesList.innerHTML = '';

  if (headerTemplates.length === 0) {
    templatesList.innerHTML = `<div class="empty-state">${i18n('noSavedTemplates')}</div>`;
    return;
  }

  headerTemplates.forEach((template, index) => {
    const item = createTemplateItem(template, index);
    templatesList.appendChild(item);
  });
}

function createTemplateItem(template, index) {
  const item = document.createElement('div');
  item.className = 'template-item';
  item.dataset.id = template.id;

  const headerCount = template.headers ? template.headers.length : 0;
  const date = new Date(template.saveTime).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  item.innerHTML = `
    <div class="template-name">${escapeHtml(template.name)}</div>
    <div class="template-meta">${i18n('headerCount', String(headerCount))} · ${date}</div>
    <div class="template-actions">
      <button class="btn btn-primary load-template-btn" title="${i18n('loadBtn')}">${i18n('loadBtn')}</button>
      <button class="btn btn-danger delete-template-btn" title="${i18n('deleteBtn')}">${i18n('deleteBtn')}</button>
    </div>
  `;

  const loadBtn = item.querySelector('.load-template-btn');
  const deleteBtn = item.querySelector('.delete-template-btn');

  loadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    loadTemplate(template.id);
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(i18n('confirmDeleteTemplate', template.name))) {
      deleteTemplate(template.id);
    }
  });

  return item;
}

function showSaveTemplateModal() {
  const validHeaders = headers.filter(h => h.key && h.value);

  if (validHeaders.length === 0) {
    alert(i18n('addValidHeaderFirst'));
    return;
  }

  const defaultName = i18n('defaultTemplateName') + new Date().toLocaleDateString();
  const name = prompt(i18n('enterTemplateName'), defaultName);

  if (name && name.trim()) {
    saveHeaderTemplate(name.trim(), validHeaders);
  }
}

async function saveHeaderTemplate(name, headersToSave) {
  const template = {
    id: Date.now() + Math.random(),
    name: name,
    headers: headersToSave.map(h => ({ key: h.key, value: h.value })),
    saveTime: Date.now()
  };

  headerTemplates.push(template);
  await saveToStorage();
  await autoSaveTemplateToFile(template);

  alert(i18n('templateSaved', name));
}

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

    const filename = `url-parser-plugin/templates/${template.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${template.id}.json`;

    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    });

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.warn('Auto-save template to file failed:', error);
  }
}

function loadTemplate(templateId) {
  const template = headerTemplates.find(t => t.id == templateId);

  if (!template || !template.headers) {
    alert(i18n('templateNoExist'));
    return;
  }

  if (confirm(i18n('confirmLoadTemplate', template.name))) {
    headers = [];

    template.headers.forEach(h => {
      headers.push({
        id: Date.now() + Math.random(),
        key: h.key,
        value: h.value
      });
    });

    renderHeaders();
    saveToStorage();
    alert(i18n('templateLoaded', template.name));
  }
}

function deleteTemplate(templateId) {
  headerTemplates = headerTemplates.filter(t => t.id != templateId);
  saveToStorage();
}

// ==================== 导出/导入 ====================

async function exportHeadersToFile() {
  const validHeaders = headers.filter(h => h.key && h.value);

  if (validHeaders.length === 0) {
    alert(i18n('noExportHeaders'));
    return;
  }

  const exportAsTemplate = confirm(i18n('exportAsTemplatePrompt'));

  try {
    let exportData;
    let filename;

    if (exportAsTemplate) {
      const defaultName = i18n('defaultTemplateName') + new Date().toLocaleDateString();
      const templateName = prompt(i18n('enterTemplateName'), defaultName);
      if (!templateName || !templateName.trim()) {
        return;
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

    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    });

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (exportAsTemplate) {
      const template = exportData.template;
      headerTemplates.push(template);
      await saveToStorage();
      alert(i18n('templateExportedAndSaved', template.name));
    } else {
      alert(i18n('headersExportedTo', filename));
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert(i18n('exportFailed') + error.message);

    // 备用方案
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
      alert(i18n('headersExportedFallback'));
    } catch (fallbackError) {
      alert(i18n('exportFailedCheckPermissions'));
    }
  }
}

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
        const template = data.template;
        if (!headerTemplates.find(t => t.id == template.id)) {
          headerTemplates.push(template);
          await saveToStorage();
          alert(i18n('templateImported', template.name));
        } else {
          alert(i18n('templateAlreadyExists'));
        }
        return;
      }

      // 普通headers文件
      if (!data.headers || !Array.isArray(data.headers)) {
        alert(i18n('fileFormatError'));
        return;
      }

      if (data.headers.length === 0) {
        alert(i18n('noHeadersInFile'));
        return;
      }

      if (confirm(i18n('confirmImport', String(data.headers.length)))) {
        headers = [];

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
        alert(i18n('importSuccess', String(headers.length)));
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(i18n('importFailed') + error.message + i18n('importFailedTip'));
    }
  };

  input.click();
}

// 从文件系统同步模板
async function syncTemplatesFromFiles() {
  try {
    alert(i18n('syncSelectPrompt'));

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.multiple = true;

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
              headerTemplates[existingIndex] = template;
              updatedCount++;
            } else {
              headerTemplates.push(template);
              importedCount++;
            }
          }
        } catch (error) {
          console.warn(`Failed to process file ${file.name}:`, error);
        }
      }

      if (importedCount > 0 || updatedCount > 0) {
        await saveToStorage();
        alert(i18n('syncComplete', String(importedCount), String(updatedCount)));
      } else {
        alert(i18n('noValidTemplates'));
      }
    };

    input.click();
  } catch (error) {
    console.error('Sync templates failed:', error);
    alert(i18n('syncFailed') + error.message);
  }
}
