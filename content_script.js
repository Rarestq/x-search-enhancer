// content_script.js - 主要内容脚本

class XSearchEnhancer {
    constructor() {
      this.panel = null;
      this.specialUsers = [];
      this.currentUsername = null;
      // 20250602 新增：isPanelGloballyOpen 状态的本地副本，可选，但有助于减少频繁读取storage
      this.isPanelGloballyOpenState = false; 
      this.init();
    }
  
    async init() {
      // 加载特别关注用户列表
      await this.loadSpecialUsers();

      // 20250602 新增：检查并根据 isPanelGloballyOpen 状态显示面板
      try {
        const result = await chrome.storage.local.get(['isPanelGloballyOpen']);
        this.isPanelGloballyOpenState = !!result.isPanelGloballyOpen; // 更新本地副本
        if (result.isPanelGloballyOpen) {
          if (window.location.href.includes('x.com') || window.location.href.includes('twitter.com')) {
            this.createPanel(); // 如果已激活且在 X 页面，则创建面板
          }
        }
      } catch (error) {
        console.error('Error reading panel persistence state:', error);
      }
      
      // 监听来自背景脚本的消息
      // 确保异步操作完成后调用 sendResponse，并且返回 true 来表明是异步响应。
      // 这是 Chrome 扩展消息传递的最佳实践，可以避免 "The message port closed before a response was received" 的错误。
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'togglePanel') {
          this.togglePanel().then(() => { // togglePanel 现在是 async
             sendResponse({status: "panel action processed"});
          }).catch(error => {
             console.error("Error toggling panel:", error);
             sendResponse({status: "error", message: error.toString()});
          });
          return true; // 关键：表示会异步发送响应
        }
      });
  
      // 检查当前页面类型并执行相应操作
      this.handlePageType();
      
      // 监听 URL 变化（SPA 路由）
      this.observeUrlChange();
    }
  
    // 加载特别关注用户列表
    async loadSpecialUsers() {
      return new Promise((resolve) => {
        chrome.storage.local.get(['specialUsers'], (result) => {
          this.specialUsers = result.specialUsers || [];
          resolve();
        });
      });
    }
  
    // 保存特别关注用户列表
    async saveSpecialUsers() {
      return new Promise((resolve) => {
        chrome.storage.local.set({ specialUsers: this.specialUsers }, () => {
          resolve();
        });
      });
    }
  
    // 监听 URL 变化
    observeUrlChange() {
        let currentUrl = window.location.href;
        
        const observer = new MutationObserver(async () => { // 将回调设为 async
          if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            // 使用 console.log 区分插件日志，例如添加一个统一前缀
            console.log('XSE: URL changed to:', currentUrl);

            // --- 新增：检查扩展上下文是否有效 ---
            if (!chrome.runtime || !chrome.runtime.id) {
              console.warn('XSE: Extension context invalidated. Observer will not proceed.');
              // 在某些情况下，您可能希望在这里断开观察者：
              // observer.disconnect();
              return;
            }
            // --- 结束新增检查 ---
  
            // 检查是否仍在 X.com 或 twitter.com 页面
            if (window.location.href.includes('x.com') || window.location.href.includes('twitter.com')) {
              try {
                const result = await chrome.storage.local.get(['isPanelGloballyOpen']);
                console.log('XSE: Panel persistence status on URL change:', result.isPanelGloballyOpen); // 用于调试
                console.log('[XSE: 本地存储]Panel persistence status on URL change:', this.isPanelGloballyOpenState); // 用于调试
  
                if (result.isPanelGloballyOpen) {
                  // 检查面板是否还存在于 DOM 中
                  if (!document.getElementById('x-search-enhancer-panel')) {
                    console.log('XSE: Panel not in DOM after URL change, recreating...'); // 用于调试
                    this.createPanel(); // 如果面板因SPA导航被移除，且标记为应打开，则重新创建
                  } else {
                    console.log('XSE: Panel still in DOM after URL change.'); // 用于调试
                  }
                }
              } catch (error) {
                // 更具体地捕获和处理 "context invalidated" 错误
                if (error.message && error.message.toLowerCase().includes('extension context invalidated')) {
                  console.warn('XSE: Caught error - Extension context invalidated during chrome.storage.local.get:', error.message);
                } else {
                  console.error('XSE: Error checking/recreating panel on URL change:', error);
                }
              }
            }
            // else: 如果导航到了非 X 页面，面板自然会消失，isPanelGloballyOpen 状态不变，
            // 等待 service_worker 在下次图标点击非X页面时将其设为 false，或用户返回X页面时自动重开（如果之前是true）
  
            // 原有的 handlePageType 调用，可以保留用于处理页面特有的按钮等
            // 延迟是为了确保页面内容（尤其是SPA切换后的内容）有足够时间加载
            setTimeout(() => {
              // --- 新增：在 setTimeout回调中也检查上下文 ---
              if (!chrome.runtime || !chrome.runtime.id) {
                console.warn('XSE: Extension context invalidated. Skipping handlePageType inside setTimeout.');
                return;
              }
              // --- 结束新增检查 ---
              this.handlePageType();
            }, 2000); // 等待页面加载
          }
        });

        // 确保 document.body 存在才开始观察
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        } else {
          // 如果 document.body 还不存在 (理论上 "run_at": "document_end" 时应该存在)
          // 可以等待 DOMContentLoaded
          document.addEventListener('DOMContentLoaded', () => {
            if(document.body) { // 再次确认
                observer.observe(document.body, {
                  childList: true,
                  subtree: true
                });
            }
          });
        }
    
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // 监听推文流更新 (这部分逻辑与面板持久化不直接相关，保持不变)
        this.observeTweetStream();
      }
  
    // 监听推文流的变化，实时添加徽章
    observeTweetStream() {
      const tweetObserver = new MutationObserver(() => {
        this.addSearchResultsBadges();
      });
      
      // 观察主要内容区域
      const mainContent = document.querySelector('main[role="main"]') || document.body;
      if (mainContent) {
        tweetObserver.observe(mainContent, {
          childList: true,
          subtree: true
        });
      }
    }
  
    // 根据页面类型执行相应操作
    handlePageType() {
      const url = window.location.href;
      
      if (this.isUserProfilePage(url)) {
        this.addUserProfileButton();
      }
      
      // 为搜索结果添加徽章
      setTimeout(() => {
        this.addSearchResultsBadges();
      }, 1000);
    }
  
    // 检查是否为用户主页
    isUserProfilePage(url) {
      const userProfileRegex = /^https?:\/\/(x\.com|twitter\.com)\/([^\/\?#]+)(?:\/?)$/;
      const match = url.match(userProfileRegex);
      
      if (match) {
        const username = match[2];
        const excludedPaths = ['home', 'explore', 'notifications', 'messages', 'bookmarks', 'lists', 'profile', 'more', 'compose', 'search', 'settings', 'help', 'i', 'intent'];
        
        if (!excludedPaths.includes(username.toLowerCase())) {
          this.currentUsername = username;
          return true;
        }
      }
      
      return false;
    }
  
    // 检查是否为搜索结果页
    isSearchResultsPage(url) {
      return url.includes('/search?q=') || url.includes('/search?f=');
    }
  
    // 在用户主页添加特别关注按钮
    addUserProfileButton() {
      // 移除已存在的按钮
      const existingButton = document.querySelector('.x-search-enhancer-follow-btn');
      if (existingButton) {
        existingButton.remove();
      }
  
      // 查找用户名元素
      const usernameSelectors = [
        '[data-testid="UserName"]',
        '[role="heading"][aria-level="2"]',
        'h2[role="heading"]'
      ];
  
      let usernameElement = null;
      for (const selector of usernameSelectors) {
        usernameElement = document.querySelector(selector);
        if (usernameElement) break;
      }
  
      if (usernameElement) {
        this.createFollowButton(usernameElement);
      } else {
        setTimeout(() => {
          this.addUserProfileButton();
        }, 2000);
      }
    }
  
    // 创建特别关注按钮（用户主页）
    createFollowButton(parentElement) {
      const isSpecialUser = this.specialUsers.some(user => user.username === this.currentUsername);
      
      const button = document.createElement('button');
      button.className = 'x-search-enhancer-follow-btn';
      button.innerHTML = isSpecialUser ? '⭐' : '☆';
      button.title = isSpecialUser ? '从特别关注中移除' : '添加到特别关注';
  
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        await this.toggleSpecialUser(this.currentUsername, button);
      });
  
      parentElement.appendChild(button);
    }
  
    // 切换特别关注用户状态
    async toggleSpecialUser(username, button) {
      const existingUserIndex = this.specialUsers.findIndex(user => user.username === username);
      
      if (existingUserIndex !== -1) {
        // 移除
        this.specialUsers.splice(existingUserIndex, 1);
        button.innerHTML = '☆';
        button.title = '添加到特别关注';
      } else {
        // 添加 - 获取用户显示名
        const displayName = await this.getUserDisplayName(username);
        this.specialUsers.push({
          username: username,
          displayName: displayName || username
        });
        button.innerHTML = '⭐';
        button.title = '从特别关注中移除';
      }
      
      await this.saveSpecialUsers();
      
      // 更新面板中的用户列表
      if (this.panel) {
        this.updatePanelUserList();
      }
    }
  
    // 获取用户显示名
    async getUserDisplayName(username) {
      try {
        // 尝试从当前页面获取显示名
        const userNameElements = document.querySelectorAll('[data-testid="User-Name"]');
        for (const element of userNameElements) {
          const link = element.querySelector('a[role="link"]');
          if (link && link.getAttribute('href') === `/${username}`) {
            const displayNameElement = element.querySelector('[dir="ltr"]');
            if (displayNameElement) {
              return displayNameElement.textContent.trim();
            }
          }
        }
        return username;
      } catch (error) {
        return username;
      }
    }
  
    // 在搜索结果中添加徽章 - 只为特别关注用户添加
    addSearchResultsBadges() {
      const tweets = document.querySelectorAll('[data-testid="tweet"]');
      
      tweets.forEach(tweet => {
        if (tweet.querySelector('.x-search-enhancer-badge')) {
          return;
        }
  
        const userLink = tweet.querySelector('[data-testid="User-Name"] a[role="link"]');
        if (!userLink) return;
  
        const href = userLink.getAttribute('href');
        if (!href) return;
  
        const username = href.replace('/', '');
        
        if (this.specialUsers.some(user => user.username === username)) {
          this.addBadgeToTweet(tweet, userLink);
        }
      });
    }
  
    // 为推文添加徽章
    addBadgeToTweet(tweet, userLink) {
      const badge = document.createElement('span');
      badge.className = 'x-search-enhancer-badge';
      badge.innerHTML = '⭐';
      badge.title = '特别关注用户';
  
      const userNameContainer = userLink.closest('[data-testid="User-Name"]');
      if (userNameContainer) {
        userNameContainer.appendChild(badge);
      }
    }
  
    // 切换面板显示
    async togglePanel() {
      if (this.panel) { // 如果面板存在，表示要关闭
        try {
            await chrome.storage.local.set({ isPanelGloballyOpen: false });
            console.log('Panel persistence disabled by user (toggle).');
          } catch (error) {
            console.error('Failed to disable panel persistence (toggle):', error);
          }
        this.removePanel(); 
      } else { // 面板不存在，表示要创建
        this.createPanel(); // createPanel 内部不处理 isPanelGloballyOpen
        try {
            await chrome.storage.local.set({ isPanelGloballyOpen: true });
            this.isPanelGloballyOpenState = true; // 更新本地副本
            console.log('Panel persistence enabled.');
          } catch (error) {
            console.error('Failed to enable panel persistence:', error);
          }
      }
    }
  
    // 创建搜索面板 - Apple Design 风格
    async createPanel() {
      const panelContainer = document.createElement('div');
      panelContainer.id = 'x-search-enhancer-panel';
  
      panelContainer.innerHTML = `
        <div>
          <!-- 头部 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px;">
            <h2>X 搜索增强</h2>
            <button id="close-panel">×</button>
          </div>
  
          <!-- 搜索框 -->
          <div style="margin-bottom: 28px;">
            <div class="search-input-container">
              <div class="search-icon">🔍</div>
              <input 
                type="text" 
                id="search-keywords" 
                placeholder="搜索关键词..." 
              >
            </div>
          </div>
  
          <!-- 特别关注用户列表 -->
          <div style="margin-bottom: 28px;">
            <h3>
              特别关注
              <div class="user-count-badge">${this.specialUsers.length}</div>
            </h3>
            <div id="special-users-container">
              <div id="special-users-list">
                <!-- 用户列表将在这里动态生成 -->
              </div>
            </div>
          </div>
  
          <!-- 搜索按钮 -->
          <button id="execute-search">
            开始搜索
          </button>
        </div>
      `;
  
      document.body.appendChild(panelContainer);
      this.panel = panelContainer;
  
      this.bindPanelEvents();
      this.updatePanelUserList();
    }
  
    // 绑定面板事件
    bindPanelEvents() {
      // 关闭按钮
      if (document.getElementById('close-panel')) { // 确保元素存在
        document.getElementById('close-panel').addEventListener('click', async () => {
          // 20250602 新增：在关闭面板时，设置 isPanelGloballyOpen 为 false
          try {
            await chrome.storage.local.set({ isPanelGloballyOpen: false });
            this.isPanelGloballyOpenState = false; // 更新本地副本
            console.log('Panel persistence disabled by user (panel close button).');
          } catch (error) {
            console.error('Failed to disable panel persistence (panel close):', error);
          }
          this.removePanel(); // removePanel 不再需要单独设置 isPanelGloballyOpen
        });
      }
  
      // 执行搜索
      document.getElementById('execute-search').addEventListener('click', () => {
        this.executeSearch();
      });
  
      // 按 Enter 执行搜索
      document.getElementById('search-keywords').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.executeSearch();
        }
      });
  
      // 点击面板外部关闭面板
      document.addEventListener('click', (e) => {
        if (this.panel && !this.panel.contains(e.target)) {
          // 延迟关闭，避免误触
          setTimeout(() => {
            if (this.panel && !this.panel.matches(':hover')) {
              this.removePanel();
            }
          }, 200);
        }
      });
    }
  
    // 更新面板中的用户列表
    updatePanelUserList() {
      const userListContainer = document.getElementById('special-users-list');
      if (!userListContainer) return;
  
      // 更新计数器
      const counter = this.panel.querySelector('.user-count-badge');
      if (counter) {
        counter.textContent = this.specialUsers.length;
      }
  
      if (this.specialUsers.length === 0) {
        userListContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⭐</div>
            <div>暂无特别关注用户</div>
            <div class="empty-state-subtitle">在用户主页点击 ☆ 添加用户</div>
          </div>
        `;
        return;
      }
  
      userListContainer.innerHTML = this.specialUsers.map((user, index) => `
        <div class="special-user-item" data-username="${user.username}">
          <div class="user-info">
            <div class="user-indicator"></div>
            <div class="user-details">
              <div class="user-display-name">${user.displayName}</div>
              <div class="user-username">@${user.username}</div>
            </div>
          </div>
          <button class="remove-user" data-username="${user.username}">×</button>
        </div>
      `).join('');
  
      // 绑定用户项点击事件
      userListContainer.querySelectorAll('.special-user-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.classList.contains('remove-user')) {
            const username = item.dataset.username;
            window.open(`https://x.com/${username}`, '_blank');
          }
        });
      });
  
      // 绑定移除按钮事件
      userListContainer.querySelectorAll('.remove-user').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const username = e.target.dataset.username;
          this.specialUsers = this.specialUsers.filter(user => user.username !== username);
          await this.saveSpecialUsers();
          this.updatePanelUserList();
          
          // 更新用户主页按钮状态
          if (this.currentUsername === username) {
            const profileButton = document.querySelector('.x-search-enhancer-follow-btn');
            if (profileButton) {
              profileButton.innerHTML = '☆';
              profileButton.title = '添加到特别关注';
            }
          }
        });
      });
    }
  
    // 执行搜索
    executeSearch() {
      const keywords = document.getElementById('search-keywords').value.trim();
      
      if (!keywords) {
        // 搜索框错误状态
        const searchInput = document.getElementById('search-keywords');
        searchInput.classList.add('error-state');
        setTimeout(() => {
          searchInput.classList.remove('error-state');
        }, 500);
        return;
      }
  
      let searchQuery = keywords;
      
      // 如果有特别关注用户，则限制搜索范围
      if (this.specialUsers.length > 0) {
        const usernames = this.specialUsers.map(user => `from:${user.username}`).join(' OR ');
        searchQuery = `(${usernames}) ${keywords}`;
      }
      
      const encodedQuery = encodeURIComponent(searchQuery);
      const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query`;
      
      // 添加搜索动画效果
      const searchBtn = document.getElementById('execute-search');
      searchBtn.innerHTML = '搜索中...';
      searchBtn.style.opacity = '0.7';
      
      setTimeout(() => {
        window.location.href = searchUrl;
      }, 300);
    }
  
    // 移除面板：removePanel() 自身的核心职责是移除 DOM 元素和清理状态，isPanelGloballyOpen 的管理最好放在触发关闭动作的源头
    removePanel() {
      if (this.panel) {
        // 20250602 新增：当通过 togglePanel (用户再次点击插件图标) 关闭时，也应设置 isPanelGloballyOpen = false
        // 这一步现在由 togglePanel (如果 panel 存在则调用 removePanel) 处理
        // 或者由面板内关闭按钮的事件处理程序处理
        // 为了确保，如果调用 removePanel 意味着用户想要关闭它，我们可以在这里也设置：
        (async () => {
            try {
                // 只有当 removePanel 是由用户显式操作（如 togglePanel 或内部关闭按钮）触发时，才应设置为 false
                // 避免在页面卸载等自动移除时错误地改变用户意图
                // 鉴于此，将 isPanelGloballyOpen 的设置放在调用 removePanel 的地方更精确
                // 此处暂时不修改 isPanelGloballyOpen，依赖调用者
            } catch (error) {
                // console.error('Failed to update panel persistence on remove:', error);
            }
        })();


        this.panel.style.animation = 'slideOutPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => {
          if (this.panel) {
            this.panel.remove();
            this.panel = null;
          }
        }, 300);
      }
    }
  }
  
  // 更安全的实例化：
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const xSearchEnhancer = new XSearchEnhancer();
    });
  } else {
    const xSearchEnhancer = new XSearchEnhancer();
  }