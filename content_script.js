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
    }
  
    // 根据页面类型执行相应操作
    handlePageType() {
      const url = window.location.href;
      
      if (this.isUserProfilePage(url)) {
        this.addUserProfileButton();
      } else if (this.isSearchResultsPage(url)) {
        setTimeout(() => {
          this.addSearchResultsBadges();
        }, 2000); // 等待搜索结果加载
      }
    }
  
    // 检查是否为用户主页
    isUserProfilePage(url) {
      // 匹配 x.com/username 格式，排除其他路径
      const userProfileRegex = /^https?:\/\/(x\.com|twitter\.com)\/([^\/\?#]+)(?:\/?)$/;
      const match = url.match(userProfileRegex);
      
      if (match) {
        const username = match[2];
        // 排除一些已知的非用户名路径
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
  
      // 查找用户名元素 - 尝试多个可能的选择器
      const usernameSelectors = [
        '[data-testid="UserName"]',
        '[role="heading"][aria-level="2"]',
        'h2[role="heading"]',
        '.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0'
      ];
  
      let usernameElement = null;
      for (const selector of usernameSelectors) {
        usernameElement = document.querySelector(selector);
        if (usernameElement) break;
      }
  
      if (!usernameElement) {
        // 如果找不到精确元素，尝试查找包含用户名的元素
        const headings = document.querySelectorAll('h2, [role="heading"]');
        for (const heading of headings) {
          if (heading.textContent && heading.textContent.includes('@')) {
            usernameElement = heading;
            break;
          }
        }
      }
  
      if (usernameElement) {
        this.createFollowButton(usernameElement);
      } else {
        // 延迟重试
        setTimeout(() => {
          this.addUserProfileButton();
        }, 2000);
      }
    }
  
    // 创建特别关注按钮
    createFollowButton(parentElement) {
      const isSpecialUser = this.specialUsers.includes(this.currentUsername);
      
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
        transition: background-color 0.2s;
      `;
  
      button.addEventListener('mouseover', () => {
        button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
      });
  
      button.addEventListener('mouseout', () => {
        button.style.backgroundColor = 'transparent';
      });
  
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.specialUsers.includes(this.currentUsername)) {
          // 移除
          this.specialUsers = this.specialUsers.filter(user => user !== this.currentUsername);
          button.innerHTML = '☆';
          button.title = '添加到特别关注';
        } else {
          // 添加
          this.specialUsers.push(this.currentUsername);
          button.innerHTML = '⭐';
          button.title = '从特别关注中移除';
        }
        
        await this.saveSpecialUsers();
        
        // 更新面板中的用户列表
        if (this.panel) {
          this.updatePanelUserList();
        }
      });
  
      // 将按钮添加到用户名旁边
      parentElement.appendChild(button);
    }
  
    // 在搜索结果中添加徽章
    addSearchResultsBadges() {
      // 查找所有推文
      const tweets = document.querySelectorAll('[data-testid="tweet"]');
      
      tweets.forEach(tweet => {
        // 检查是否已添加徽章
        if (tweet.querySelector('.x-search-enhancer-badge')) {
          return;
        }
  
        // 查找用户名链接
        const userLink = tweet.querySelector('[data-testid="User-Name"] a[role="link"]');
        if (!userLink) return;
  
        const href = userLink.getAttribute('href');
        if (!href) return;
  
        const username = href.replace('/', '');
        
        // 检查是否为特别关注用户
        if (this.specialUsers.includes(username)) {
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
      `;
  
      // 找到合适的位置插入徽章
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
  
    // 创建搜索面板
    async createPanel() {
      // 创建面板容器
      const panelContainer = document.createElement('div');
      panelContainer.id = 'x-search-enhancer-panel';
      panelContainer.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 350px;
        height: 100vh;
        background: white;
        border-left: 1px solid #e1e8ed;
        z-index: 10000;
        overflow-y: auto;
        box-shadow: -2px 0 10px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
  
      // 创建面板内容
      panelContainer.innerHTML = `
        <div style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px; font-weight: bold;">X搜索增强</h2>
            <button id="close-panel" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #536471;">×</button>
          </div>
  
          <!-- 关键词输入 -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">搜索关键词:</label>
            <input type="text" id="search-keywords" placeholder="输入搜索关键词..." style="width: 100%; padding: 8px; border: 1px solid #cfd9de; border-radius: 4px; font-size: 14px;">
          </div>
  
          <!-- 内容类型筛选 -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">内容类型:</label>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="filter-images" style="margin-right: 8px;">
                <span>包含图片</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="filter-videos" style="margin-right: 8px;">
                <span>包含视频</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="filter-gifs" style="margin-right: 8px;">
                <span>包含GIF</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="filter-links" style="margin-right: 8px;">
                <span>包含链接</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="filter-text" style="margin-right: 8px;">
                <span>纯文本</span>
              </label>
            </div>
          </div>
  
          <!-- 特别关注用户 -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">特别关注用户:</label>
            <div id="special-users-container">
              <div id="special-users-list" style="margin-bottom: 10px;">
                <!-- 用户列表将在这里动态生成 -->
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="radio" name="user-selection" id="select-single" style="margin-right: 8px;">
                  <span>搜索单个选中用户</span>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="radio" name="user-selection" id="select-all" style="margin-right: 8px;">
                  <span>搜索所有特别关注用户</span>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="radio" name="user-selection" id="select-none" checked style="margin-right: 8px;">
                  <span>不限制用户</span>
                </label>
              </div>
            </div>
          </div>
  
          <!-- 搜索按钮 -->
          <button id="execute-search" style="width: 100%; padding: 12px; background: #1d9bf0; color: white; border: none; border-radius: 20px; font-size: 16px; font-weight: bold; cursor: pointer;">
            执行搜索
          </button>
        </div>
      `;
  
      document.body.appendChild(panelContainer);
      this.panel = panelContainer;
  
      // 绑定事件
      this.bindPanelEvents();
      
      // 更新用户列表
      this.updatePanelUserList();
    }
  
    // 绑定面板事件
    bindPanelEvents() {
      // 关闭按钮
      document.getElementById('close-panel').addEventListener('click', () => {
        this.removePanel();
      });
  
      // 执行搜索按钮
      document.getElementById('execute-search').addEventListener('click', () => {
        this.executeSearch();
      });
  
      // 点击面板外部关闭面板
      document.addEventListener('click', (e) => {
        if (this.panel && !this.panel.contains(e.target)) {
          // 不立即关闭，给用户一些时间操作
        }
      });
    }
  
    // 更新面板中的用户列表
    updatePanelUserList() {
      const userListContainer = document.getElementById('special-users-list');
      if (!userListContainer) return;
  
      if (this.specialUsers.length === 0) {
        userListContainer.innerHTML = '<p style="color: #536471; font-size: 14px; margin: 0;">暂无特别关注用户</p>';
        return;
      }
  
      userListContainer.innerHTML = this.specialUsers.map((username, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
          <label style="display: flex; align-items: center; cursor: pointer; flex: 1;">
            <input type="radio" name="selected-user" value="${username}" style="margin-right: 8px;">
            <span>@${username}</span>
          </label>
          <button class="remove-user" data-username="${username}" style="background: none; border: none; color: #f91880; cursor: pointer; font-size: 14px; padding: 2px 6px;">移除</button>
        </div>
      `).join('');
  
      // 绑定移除按钮事件
      userListContainer.querySelectorAll('.remove-user').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const username = e.target.dataset.username;
          this.specialUsers = this.specialUsers.filter(user => user !== username);
          await this.saveSpecialUsers();
          this.updatePanelUserList();
          
          // 更新页面上的按钮状态
          if (this.currentUsername === username) {
            const button = document.querySelector('.x-search-enhancer-follow-btn');
            if (button) {
              button.innerHTML = '☆';
              button.title = '添加到特别关注';
            }
          }
        });
      });
    }
  
    // 执行搜索
    executeSearch() {
      const keywords = document.getElementById('search-keywords').value.trim();
      const searchParams = [];
  
      // 添加关键词
      if (keywords) {
        searchParams.push(keywords);
      }
  
      // 添加内容类型筛选
      if (document.getElementById('filter-images').checked) {
        searchParams.push('filter:images');
      }
      if (document.getElementById('filter-videos').checked) {
        searchParams.push('filter:videos');
      }
      if (document.getElementById('filter-gifs').checked) {
        searchParams.push('filter:gifs');
      }
      if (document.getElementById('filter-links').checked) {
        searchParams.push('filter:links');
      }
      if (document.getElementById('filter-text').checked) {
        searchParams.push('-filter:media -filter:links');
      }
  
      // 添加用户筛选
      const userSelection = document.querySelector('input[name="user-selection"]:checked').id;
      
      if (userSelection === 'select-single') {
        const selectedUser = document.querySelector('input[name="selected-user"]:checked');
        if (selectedUser) {
          searchParams.push(`from:${selectedUser.value}`);
        }
      } else if (userSelection === 'select-all' && this.specialUsers.length > 0) {
        const userQueries = this.specialUsers.map(user => `from:${user}`).join(' OR ');
        searchParams.push(`(${userQueries})`);
      }
  
      // 构建搜索URL
      if (searchParams.length === 0) {
        alert('请至少输入一个搜索条件');
        return;
      }
  
      const searchQuery = searchParams.join(' ');
      const encodedQuery = encodeURIComponent(searchQuery);
      const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query`;
  
      // 跳转到搜索结果页
      window.location.href = searchUrl;
    }
  
    // 移除面板
    removePanel() {
      if (this.panel) {
        this.panel.remove();
        this.panel = null;
      }
    }
  }
  
  // 初始化插件
  const xSearchEnhancer = new XSearchEnhancer();