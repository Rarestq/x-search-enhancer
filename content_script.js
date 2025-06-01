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
  
    // 监听推文流的变化，实时添加星标按钮
    observeTweetStream() {
      const tweetObserver = new MutationObserver(() => {
        this.addStarButtonsToTweets();
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
      
      // 为所有推文添加星标按钮
      setTimeout(() => {
        this.addStarButtonsToTweets();
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
  
    // 为推文添加星标按钮
    addStarButtonsToTweets() {
      const tweets = document.querySelectorAll('[data-testid="tweet"]');
      
      tweets.forEach(tweet => {
        // 检查是否已添加按钮
        if (tweet.querySelector('.x-search-enhancer-tweet-star')) {
          return;
        }
        
        // 查找用户名链接
        const userLink = tweet.querySelector('[data-testid="User-Name"] a[role="link"]');
        if (!userLink) return;
        
        const href = userLink.getAttribute('href');
        if (!href) return;
        
        const username = href.replace('/', '');
        
        // 创建星标按钮
        this.createTweetStarButton(tweet, username, userLink);
      });
    }
  
    // 创建推文中的星标按钮
    createTweetStarButton(tweet, username, userLink) {
      const isSpecialUser = this.specialUsers.some(user => user.username === username);
      
      const button = document.createElement('button');
      button.className = 'x-search-enhancer-tweet-star';
      button.innerHTML = isSpecialUser ? '⭐' : '☆';
      button.title = isSpecialUser ? '从特别关注中移除' : '添加到特别关注';
      button.style.cssText = `
        margin-left: 6px;
        background: none;
        border: none;
        font-size: 14px;
        cursor: pointer;
        color: #1d9bf0;
        padding: 2px 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
        opacity: 0.7;
      `;
      
      button.addEventListener('mouseover', () => {
        button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
        button.style.opacity = '1';
      });
      
      button.addEventListener('mouseout', () => {
        button.style.backgroundColor = 'transparent';
        button.style.opacity = '0.7';
      });
      
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        await this.toggleSpecialUser(username, button);
      });
      
      // 将按钮添加到用户名旁边
      const userNameContainer = userLink.closest('[data-testid="User-Name"]');
      if (userNameContainer) {
        userNameContainer.appendChild(button);
      }
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
      
      // 更新所有相关按钮
      this.updateAllStarButtons(username);
      
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
  
    // 更新所有相同用户的星标按钮
    updateAllStarButtons(username) {
      const isSpecialUser = this.specialUsers.some(user => user.username === username);
      const buttons = document.querySelectorAll('.x-search-enhancer-tweet-star');
      
      buttons.forEach(button => {
        const userLink = button.parentElement.querySelector('a[role="link"]');
        if (userLink && userLink.getAttribute('href') === `/${username}`) {
          button.innerHTML = isSpecialUser ? '⭐' : '☆';
          button.title = isSpecialUser ? '从特别关注中移除' : '添加到特别关注';
        }
      });
      
      // 更新用户主页按钮
      if (this.currentUsername === username) {
        const profileButton = document.querySelector('.x-search-enhancer-follow-btn');
        if (profileButton) {
          profileButton.innerHTML = isSpecialUser ? '⭐' : '☆';
          profileButton.title = isSpecialUser ? '从特别关注中移除' : '添加到特别关注';
        }
      }
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
      button.style.cssText = `
        margin-left: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #1d9bf0;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      `;
  
      button.addEventListener('mouseover', () => {
        button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
        button.style.transform = 'scale(1.1)';
      });
  
      button.addEventListener('mouseout', () => {
        button.style.backgroundColor = 'transparent';
        button.style.transform = 'scale(1)';
      });
  
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        await this.toggleSpecialUser(this.currentUsername, button);
      });
  
      parentElement.appendChild(button);
    }
  
    // 在搜索结果中添加徽章
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
      badge.style.cssText = `
        margin-left: 4px;
        color: #ffd700;
        font-size: 12px;
        animation: sparkle 2s infinite ease-in-out;
      `;
  
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
      panelContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        max-height: calc(100vh - 40px);
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.2);
        z-index: 10000;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
        animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      `;
  
      panelContainer.innerHTML = `
        <div style="padding: 24px;">
          <!-- 头部 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #1d1d1f;">X 搜索增强</h2>
            <button id="close-panel" style="
              width: 28px; 
              height: 28px; 
              border-radius: 50%; 
              background: rgba(120, 120, 128, 0.16); 
              border: none; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              cursor: pointer; 
              font-size: 14px; 
              color: #8e8e93;
              transition: all 0.2s ease;
            ">×</button>
          </div>
  
          <!-- 搜索框 -->
          <div style="margin-bottom: 24px;">
            <div style="position: relative;">
              <input 
                type="text" 
                id="search-keywords" 
                placeholder="搜索关键词..." 
                style="
                  width: 100%; 
                  padding: 12px 16px; 
                  border: 1px solid rgba(120, 120, 128, 0.2); 
                  border-radius: 10px; 
                  font-size: 16px; 
                  background: rgba(118, 118, 128, 0.06);
                  outline: none;
                  transition: all 0.2s ease;
                "
              >
            </div>
          </div>
  
          <!-- 特别关注用户列表 -->
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1d1d1f;">特别关注</h3>
            <div id="special-users-container" style="
              max-height: 200px; 
              overflow-y: auto; 
              border-radius: 10px; 
              background: rgba(118, 118, 128, 0.06);
            ">
              <div id="special-users-list">
                <!-- 用户列表将在这里动态生成 -->
              </div>
            </div>
          </div>
  
          <!-- 搜索按钮 -->
          <button id="execute-search" style="
            width: 100%; 
            padding: 12px; 
            background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%); 
            color: white; 
            border: none; 
            border-radius: 10px; 
            font-size: 16px; 
            font-weight: 600; 
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
          ">
            搜索
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
  
      // 关闭按钮悬停效果
      const closeBtn = document.getElementById('close-panel');
      closeBtn.addEventListener('mouseover', () => {
        closeBtn.style.backgroundColor = 'rgba(120, 120, 128, 0.24)';
      });
      closeBtn.addEventListener('mouseout', () => {
        closeBtn.style.backgroundColor = 'rgba(120, 120, 128, 0.16)';
      });
  
      // 搜索框焦点效果
      const searchInput = document.getElementById('search-keywords');
      searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = '#007AFF';
        searchInput.style.backgroundColor = 'white';
        searchInput.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
      });
      searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = 'rgba(120, 120, 128, 0.2)';
        searchInput.style.backgroundColor = 'rgba(118, 118, 128, 0.06)';
        searchInput.style.boxShadow = 'none';
      });
  
      // 搜索按钮悬停效果
      const searchBtn = document.getElementById('execute-search');
      searchBtn.addEventListener('mouseover', () => {
        searchBtn.style.transform = 'translateY(-1px)';
        searchBtn.style.boxShadow = '0 6px 16px rgba(0, 122, 255, 0.4)';
      });
      searchBtn.addEventListener('mouseout', () => {
        searchBtn.style.transform = 'translateY(0)';
        searchBtn.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.3)';
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
  
      if (this.specialUsers.length === 0) {
        userListContainer.innerHTML = `
          <div style="padding: 16px; text-align: center; color: #8e8e93; font-size: 14px;">
            暂无特别关注用户
          </div>
        `;
        return;
      }
  
      userListContainer.innerHTML = this.specialUsers.map((user) => `
        <div class="special-user-item" data-username="${user.username}" style="
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 12px 16px; 
          border-bottom: 1px solid rgba(120, 120, 128, 0.1);
          cursor: pointer;
          transition: background-color 0.2s ease;
        ">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 500; color: #1d1d1f; font-size: 14px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${user.displayName}
            </div>
            <div style="color: #8e8e93; font-size: 12px;">@${user.username}</div>
          </div>
          <button class="remove-user" data-username="${user.username}" style="
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            background: rgba(255, 59, 48, 0.1); 
            border: none; 
            color: #FF3B30; 
            cursor: pointer; 
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          ">×</button>
        </div>
      `).join('');
  
      // 绑定用户项点击事件
      userListContainer.querySelectorAll('.special-user-item').forEach(item => {
        item.addEventListener('mouseover', () => {
          if (!item.querySelector('.remove-user:hover')) {
            item.style.backgroundColor = 'rgba(118, 118, 128, 0.1)';
          }
        });
        item.addEventListener('mouseout', () => {
          item.style.backgroundColor = 'transparent';
        });
        
        item.addEventListener('click', (e) => {
          if (!e.target.classList.contains('remove-user')) {
            const username = item.dataset.username;
            window.open(`https://x.com/${username}`, '_blank');
          }
        });
      });
  
      // 绑定移除按钮事件
      userListContainer.querySelectorAll('.remove-user').forEach(btn => {
        btn.addEventListener('mouseover', () => {
          btn.style.backgroundColor = 'rgba(255, 59, 48, 0.2)';
          btn.parentElement.style.backgroundColor = 'transparent';
        });
        btn.addEventListener('mouseout', () => {
          btn.style.backgroundColor = 'rgba(255, 59, 48, 0.1)';
        });
        
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const username = e.target.dataset.username;
          this.specialUsers = this.specialUsers.filter(user => user.username !== username);
          await this.saveSpecialUsers();
          this.updatePanelUserList();
          this.updateAllStarButtons(username);
        });
      });
    }
  
    // 执行搜索
    executeSearch() {
      const keywords = document.getElementById('search-keywords').value.trim();
      
      if (!keywords) {
        // 搜索框抖动效果
        const searchInput = document.getElementById('search-keywords');
        searchInput.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
          searchInput.style.animation = '';
        }, 500);
        return;
      }
  
      const encodedQuery = encodeURIComponent(keywords);
      const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query`;
      
      window.location.href = searchUrl;
    }
  
    // 移除面板
    removePanel() {
      if (this.panel) {
        this.panel.style.animation = 'slideOutRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
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