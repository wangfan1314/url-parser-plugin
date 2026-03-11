// Content script - 用于获取当前页面信息
// 这个文件主要用于与popup通信，获取当前页面的URL

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentUrl') {
    sendResponse({ url: window.location.href });
  }
  return true;
});

