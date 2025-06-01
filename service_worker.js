// service_worker.js - Manifest V3 背景脚本

// 监听插件图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
    // 检查是否为 X.com 页面
    if (tab.url && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
      try {
        // 向内容脚本发送消息来切换面板
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'togglePanel' 
        });
      } catch (error) {
        console.log('无法发送消息到内容脚本:', error);
        // 如果内容脚本未加载，尝试注入
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_script.js']
          });
          
          // 重新尝试发送消息
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, { 
                action: 'togglePanel' 
              });
            } catch (retryError) {
              console.log('重试发送消息失败:', retryError);
            }
          }, 100);
        } catch (injectError) {
          console.log('注入内容脚本失败:', injectError);
        }
      }
    } else {
      // 如果不在 X.com 页面，显示提示
      chrome.action.setBadgeText({
        text: '!',
        tabId: tab.id
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#FF0000',
        tabId: tab.id
      });
      
      // 3秒后清除徽章
      setTimeout(() => {
        chrome.action.setBadgeText({
          text: '',
          tabId: tab.id
        });
      }, 3000);
    }
  });
  
  // 监听标签页更新事件，清除徽章
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }
  });
  
  // 安装时初始化存储
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['specialUsers'], (result) => {
      if (!result.specialUsers) {
        chrome.storage.local.set({ specialUsers: [] });
      }
    });
  });