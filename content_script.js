// content_script.js - 主要内容脚本

class XSearchEnhancer {
    constructor() {
      this.panel = null;
      this.specialUsers = [];
      this.currentUsername = null;
      this.init();
    }
  
    async init() {
      // 加载特别关注用户列表
      await this.loadSpecialUsers();
      
      // 监听来自背景脚本的消息
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'togglePanel') {
          this.togglePanel();
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
      
      const observer = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href;
          setTimeout(() => {
            this.handlePageType();
          }, 1000); // 等待页面加载
        }
      });
  
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // 监听推文流更新
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
    togglePanel() {
      if (this.panel) {
        this.removePanel();
      } else {
        this.createPanel();
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
      document.getElementById('close-panel').addEventListener('click', () => {
        this.removePanel();
      });
  
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
  
    // 移除面板
    removePanel() {
      if (this.panel) {
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
  
  // 初始化插件
  const xSearchEnhancer = new XSearchEnhancer();