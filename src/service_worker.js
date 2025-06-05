// service_worker.js - Manifest V3 背景脚本

/**
 * 尝试向指定标签页发送消息。
 * @param {number} tabId - 目标标签页的ID。
 * @param {object} message - 要发送的消息对象。
 * @returns {Promise<boolean>} - 返回一个Promise，如果消息成功发送并得到响应则解析为true，否则解析为false。
 */
async function sendMessageToTab(tabId, message) {
  try {
    // console.log(`SW: Attempting to send message to tab ${tabId}:`, message);
    await chrome.tabs.sendMessage(tabId, message);
    // console.log(`SW: Message sent successfully to tab ${tabId}.`);
    return true; // 假设如果sendMessage没有抛出错误，即为成功（内容脚本会处理）
  } catch (error) {
    // console.warn(`SW: Failed to send message to tab ${tabId} (initial attempt):`, error.message);
    return false; // 明确表示发送失败
  }
}

/**
 * 尝试注入内容脚本到指定标签页。
 * @param {number} tabId - 目标标签页的ID。
 * @returns {Promise<boolean>} - 返回一个Promise，如果脚本成功注入则解析为true，否则解析为false。
 */
async function injectContentScript(tabId) {
  try {
    // console.log(`SW: Attempting to inject content script into tab ${tabId}.`);
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content_script.js'],
    });
    if (results && results.length > 0) {
      // executeScript 的结果是一个数组，每个frame一个结果对象。
      // 如果没有错误，通常表示成功。
      return true;
    }
    return false; // 或者根据 results[0].result 的内容判断
  } catch (error) {
    console.error(`SW: Failed to inject content script into tab ${tabId}:`, error.message);
    // 检查是否是由于权限问题或无效标签页
    if (error.message.includes('No tab with id') || error.message.includes('Cannot access contents of url')) {
      console.warn(`SW: Injection failed due to invalid tab or permissions for tab ${tabId}.`);
    }
    return false;
  }
}

// 监听插件图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    console.warn('SW: Action clicked on a tab without an ID (e.g., devtools window). Aborting.');
    return;
  }

  // 检查是否为 X.com 页面
  if (tab.url && (tab.url.startsWith('https://x.com/') || tab.url.startsWith('https://twitter.com/'))) {
    // console.log(`SW: Action clicked on X.com page (Tab ID: ${tab.id}).`);
    const message = { action: 'togglePanel' };

    let messageSent = await sendMessageToTab(tab.id, message);

    if (!messageSent) {
      const scriptInjected = await injectContentScript(tab.id);

      if (scriptInjected) {
        // console.log(`SW: Script injected. Retrying to send message to tab ${tab.id}.`);
        // 稍微延迟以确保内容脚本有足够时间初始化其消息监听器
        // 尽管 executeScript 的 Promise 解析意味着脚本已执行，但消息监听器的建立可能仍需一个事件循环
        await new Promise((resolve) => {
          // 保留一个小的延迟
          setTimeout(resolve, 100);
        });
        messageSent = await sendMessageToTab(tab.id, message);
        if (!messageSent) {
          console.warn(`SW: Failed to send message to tab ${tab.id} even after script injection and delay.`);
        }
      } else {
        console.warn(`SW: Script injection failed for tab ${tab.id}. Cannot send message.`);
      }
    }
  } else {
    // console.log(`SW: Action clicked on non-X.com page (Tab ID: ${tab.id}). URL: ${tab.url}`);
    // 如果不在 X.com 页面，显示提示徽章
    chrome.action.setBadgeText({ text: '!', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tab.id });

    // 设置 isPanelGloballyOpen 为 false，因为用户在非X页面点击了图标
    // 这假设用户在非X页面点击图标意味着他们不希望面板在下次访问X页面时自动打开
    try {
      await chrome.storage.local.set({ isPanelGloballyOpen: false });
      // console.log('SW: Panel persistence disabled: Not an X.com page and action icon clicked.');
    } catch (storageError) {
      console.error('SW: Failed to set panel persistence state (non-X page):', storageError);
    }

    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }, 3000);
  }
});

// 监听标签页更新事件，清除徽章 (保持不变)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (tab.url && (tab.url.startsWith('https://x.com/') || tab.url.startsWith('https://twitter.com/'))) {
      // 如果导航到X页面，清除可能存在的错误徽章
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// 安装时初始化存储 (保持不变)
chrome.runtime.onInstalled.addListener(async () => {
  // console.log("SW: Extension installed/updated.");
  try {
    const result = await chrome.storage.local.get(['specialUsers', 'isPanelGloballyOpen']);
    const update = {};
    if (!result.specialUsers) {
      update.specialUsers = [];
    }
    if (typeof result.isPanelGloballyOpen === 'undefined') {
      update.isPanelGloballyOpen = false; // 默认不自动打开
    }
    if (Object.keys(update).length > 0) {
      await chrome.storage.local.set(update);
      // console.log("SW: Initial storage values set:", update);
    }
  } catch (error) {
    console.warn('SW: Error initializing storage on install:', error);
  }
});
