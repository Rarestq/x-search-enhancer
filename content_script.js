// content_script.js - 主要内容脚本

/**
 * @file content_script.js
 * @description X Search Enhancer 浏览器扩展的核心内容脚本。
 * 负责在 X.com (Twitter) 页面上注入UI元素、处理用户交互、
 * 管理特别关注用户列表，并执行增强的搜索功能。
 *
 * 本脚本的“模块1”更新引入了健壮的DOM交互层，包括：
 * 1. DOM_SELECTORS: 集中管理DOM选择器。
 * 2. findElementAdvanced: 一个高级的元素查找工具，
 * 使用MutationObserver来更可靠地定位动态加载的元素。
 *
 * 针对用户反馈调整星标按钮的放置位置和大小。
 */

// -----------------------------------------------------------------------------
// 模块1: 健壮的 DOM 交互层
// -----------------------------------------------------------------------------

/**
 * @constant {object} DOM_SELECTORS
 * @description 存储扩展中使用的所有DOM选择器，便于维护和更新。
 * 选择器按其用途或相关页面区域进行组织。
 */
const DOM_SELECTORS = {
    // X.com/Twitter 页面元素
    TWEET_ARTICLE: 'article[data-testid="tweet"]',
    TWEET_USER_NAME_LINK: '[data-testid="User-Name"] a[role="link"]',
    TWEET_USER_NAME_CONTAINER: '[data-testid="User-Name"]',

    PROFILE_PAGE: {
        // 主要用于定位用户名和用户ID所在的行或其直接父容器
        USER_NAME_LINE_CONTAINER: [ // 按顺序尝试
            'div[data-testid="UserName"]', // X.com 用户名显示元素
            // 如果上面那个选择器不够精确，或者按钮需要放在其父级
            // 'div[data-testid="UserProfileHeader_Items"] h2[role="heading"]', // 另一个可能的父容器
        ],
        // 用于提取用户名的更具体的元素（如果USER_NAME_LINE_CONTAINER是容器）
        USER_DISPLAY_NAME_IN_CONTAINER: 'span > span > span', // 假设在UserName容器内的结构
        // 也可以添加一个选择器来定位用户句柄 (@username) 元素，如果需要并排显示
        // USER_HANDLE_ELEMENT: 'div[data-testid="UserName"] + div span[dir="ltr"]',
    },

    MAIN_CONTENT_AREA: 'main[role="main"]',
    PRIMARY_COLUMN: 'div[data-testid="primaryColumn"]',

    PANEL: {
        ID: 'x-search-enhancer-panel',
        CLOSE_BUTTON: '#close-panel',
        SEARCH_INPUT: '#search-keywords',
        EXECUTE_SEARCH_BUTTON: '#execute-search',
        SPECIAL_USERS_LIST_CONTAINER: '#special-users-list',
        USER_COUNT_BADGE: '.user-count-badge',
        EMPTY_STATE_CONTAINER: '#special-users-list .empty-state',
        SPECIAL_USER_ITEM: '.special-user-item',
        REMOVE_USER_BUTTON: '.remove-user',
    }
};

/**
 * 异步查找DOM中的元素，支持多个选择器和MutationObserver。
 * @async
 * @param {string|string[]} selectors - 单个CSS选择器字符串或CSS选择器字符串数组。
 * 如果提供数组，将按顺序尝试直到找到元素。
 * @param {Node} [baseElement=document] - 在此基础元素内搜索。默认为整个文档。
 * @param {number} [timeout=7000] - 等待元素出现的超时时间（毫秒）。
 * @returns {Promise<Element|null>} 返回一个Promise，解析为找到的DOM元素，如果在超时内未找到则解析为null。
 */
async function findElementAdvanced(selectors, baseElement = document, timeout = 7000) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
        try {
            const element = baseElement.querySelector(selector);
            if (element) {
                return element;
            }
        } catch (e) {
            console.warn(`XSE: Invalid selector "${selector}" during direct find:`, e);
        }
    }

    return new Promise((resolve) => {
        let observer;
        const timer = setTimeout(() => {
            if (observer) observer.disconnect();
            resolve(null);
        }, timeout);

        observer = new MutationObserver((mutationsList, obs) => {
            for (const selector of selectorArray) {
                try {
                    const element = baseElement.querySelector(selector);
                    if (element) {
                        clearTimeout(timer);
                        obs.disconnect();
                        resolve(element);
                        return;
                    }
                } catch (e) {
                    // console.warn(`XSE: Invalid selector "${selector}" in MutationObserver:`, e);
                }
            }
        });

        observer.observe(baseElement === document ? document.documentElement : baseElement, {
            childList: true,
            subtree: true
        });
    });
}
// -----------------------------------------------------------------------------
// End of Module 1
// -----------------------------------------------------------------------------

class XSearchEnhancer {
    constructor() {
      this.panel = null;
      this.specialUsers = [];
      this.currentUsername = null;
      this.isPanelGloballyOpenState = false; // 本地缓存的插件面板打开状态
      // this.init(); // init 将在 initializeExtension 中被调用
    }

    /**
     * 设置并持久化面板的打开/关闭状态。
     * @param {boolean} isOpen - 面板是否应该打开。
     * @async
     */
    async setPanelOpenState(isOpen) {
        this.isPanelGloballyOpenState = isOpen;
        // console.log(`XSE: Setting panel state to: ${isOpen}`);

        if (chrome.runtime && chrome.runtime.id) {
            try {
                await chrome.storage.local.set({ isPanelGloballyOpen: isOpen });
                // console.log(`XSE: Panel persistence set to ${isOpen} in chrome.storage.local.`);
            } catch (error) {
                if (error.message && error.message.includes("Extension context invalidated")) {
                    console.warn(`XSE: Failed to set panel persistence to ${isOpen}: Context invalidated.`);
                } else {
                    console.error(`XSE: Failed to set panel persistence to ${isOpen}:`, error);
                }
            }
        } else {
            console.warn(`XSE: Context invalidated before setting panel persistence to ${isOpen}.`);
        }
    }

    async init() {
      await this.loadSpecialUsers();

      // 检查上下文有效性
      if (chrome.runtime && chrome.runtime.id) {
        try {
          const result = await chrome.storage.local.get(['isPanelGloballyOpen']);
          // 从存储中读取初始状态并更新本地缓
          this.isPanelGloballyOpenState = !!result.isPanelGloballyOpen;
          if (result.isPanelGloballyOpen) {
            if (window.location.href.includes('x.com') || window.location.href.includes('twitter.com')) {
              this.createPanel();
            }
          }
        } catch (error) {
          if (error.message && error.message.includes("Extension context invalidated")) {
            console.warn('XSE: Context invalidated during initial panel state check.');
          } else {
            console.error('XSE: Error reading panel persistence state:', error);
          }
        }
      } else {
        console.warn('XSE: Extension context invalidated at init.');
      }

      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'togglePanel') {
          this.togglePanel().then(() => { // togglePanel 现在会处理状态持久化
             sendResponse({status: "panel action processed"});
          }).catch(error => {
             console.error("XSE: Error toggling panel:", error);
             sendResponse({status: "error", message: error.toString()});
          });
          return true;
        }
      });

      this.handlePageType();
      this.observeUrlChange();
    }

    async loadSpecialUsers() {
        return new Promise((resolve) => {
          // 检查上下文有效性
          if (chrome.runtime && chrome.runtime.id) {
              chrome.storage.local.get(['specialUsers'], (result) => {
                if (chrome.runtime.lastError) {
                  console.warn('XSE: Error loading special users (context likely invalidated):', chrome.runtime.lastError.message);
                  this.specialUsers = []; // 发生错误时，使用空数组作为后备
                } else {
                  this.specialUsers = result.specialUsers || [];
                }
                resolve();
              });
          } else {
              console.warn('XSE: Context invalidated before loading special users.');
              this.specialUsers = [];
              resolve();
          }
        });
    }

    async saveSpecialUsers() {
        return new Promise((resolve) => {
          // 检查上下文有效性
          if (chrome.runtime && chrome.runtime.id) {
              chrome.storage.local.set({ specialUsers: this.specialUsers }, () => {
                if (chrome.runtime.lastError) {
                  console.warn('XSE: Error saving special users (context likely invalidated):', chrome.runtime.lastError.message);
                }
                resolve();
              });
          } else {
              console.warn('XSE: Context invalidated before saving special users.');
              resolve();
          }
        });
    }

    observeUrlChange() {
        let currentUrl = window.location.href;

        const observer = new MutationObserver(async () => {
          if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            console.log('XSE: URL changed to:', currentUrl);

            if (!chrome.runtime || !chrome.runtime.id) {
              console.warn('XSE: Extension context invalidated. Observer will not proceed.');
              return;
            }

            if (window.location.href.includes('x.com') || window.location.href.includes('twitter.com')) {
                // 当URL变化时，如果isPanelGloballyOpenState为true，则尝试重新创建面板
                // 注意：这里不需要再次读取chrome.storage，直接使用缓存的 this.isPanelGloballyOpenState
                if (this.isPanelGloballyOpenState) {
                    if (!document.getElementById(DOM_SELECTORS.PANEL.ID)) {
                      // console.log('XSE: Panel not in DOM after URL change (state was true), recreating...');
                      this.createPanel();
                    }
                } else {
                    // 如果状态是false，但面板由于某种原因（例如，之前的错误）仍然存在，则移除它
                    if (this.panel) {
                        // console.log('XSE: Panel state is false, but panel exists on URL change. Removing.');
                        this.removePanel(); // removePanel 不改变状态，仅移除DOM
                    }
                }
              } else {
                  // 如果导航到非X页面，并且面板存在，则移除面板 (但不改变持久化状态)
                  if (this.panel) {
                      // console.log('XSE: Navigated off X.com, removing panel visually.');
                      this.removePanel();
                }
            }
            const primaryColumn = await findElementAdvanced(DOM_SELECTORS.PRIMARY_COLUMN, document, 5000);
            if (primaryColumn) {
                if (!chrome.runtime || !chrome.runtime.id) {
                    console.warn('XSE: Extension context invalidated. Skipping handlePageType inside URL observer.');
                    return;
                }
                this.handlePageType();
            } else {
                console.warn("XSE: Primary column not found after URL change. Skipping handlePageType.");
            }
          }
        });
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            if(document.body) {
                observer.observe(document.body, {
                  childList: true,
                  subtree: true
                });
            }
          });
        }
        this.observeTweetStream();
      }

    async observeTweetStream() {
      const mainContent = await findElementAdvanced(DOM_SELECTORS.PRIMARY_COLUMN, document, 10000);

      if (mainContent) {
        const tweetObserver = new MutationObserver((mutations) => {
            let addedNodes = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    addedNodes = true;
                    break;
                }
            }
            if (addedNodes) {
                this.addSearchResultsBadges();
            }
        });

        tweetObserver.observe(mainContent, {
          childList: true,
          subtree: true
        });
      } else {
        console.warn('XSE: Main content area for tweet stream not found after timeout. Badges might not be added.');
      }
    }

    /**
     * 处理当前页面类型，精确控制 addUserProfileButton 的调用。
     * @async
     */
    async handlePageType() {
        const url = window.location.href;
  
        // isUserProfilePage 会设置或清空 this.currentUsername
        if (this.isUserProfilePage(url) && this.currentUsername) {
          // 只有当确定是用户配置页并且成功获取了用户名时才添加按钮
          await this.addUserProfileButton();
        } else {
          // 如果不是用户配置页，或者未能从URL解析出用户名，
          // 则尝试移除可能存在的旧按钮（例如SPA切换后残留的）
          const existingButton = document.querySelector('.x-search-enhancer-follow-btn');
          if (existingButton) {
            existingButton.remove();
            // console.log("XSE: Removed lingering follow button as current page is not a user profile or username is missing.");
          }
        }
  
        // 为搜索结果添加星标徽章
        const primaryColumn = await findElementAdvanced(DOM_SELECTORS.PRIMARY_COLUMN);
        if (primaryColumn) {
            this.addSearchResultsBadges();
        }
    }

    /**
     * 查是否为用户主页，并设置 this.currentUsername。
     * @param {string} url - 当前页面的URL。
     * @returns {boolean} 如果是用户主页则返回true，否则返回false。
     */
    isUserProfilePage(url) {
        const userProfileRegex = /^https?:\/\/(x\.com|twitter\.com)\/([^\/\?#]+)(?:\/?)$/;
        const match = url.match(userProfileRegex);
  
        if (match) {
          const usernameFromUrl = match[2];
          // 扩展的排除路径列表，避免将功能性页面误认为用户配置页
          const excludedPaths = [
              'home', 'explore', 'notifications', 'messages', 'bookmarks', 'lists',
              'profile', // 'profile' 本身通常不是用户名，但 x.com/profile/settings 之类的需要排除
              'i', // 用于 intents, embeds 等
              'settings', 'search', 'compose', 'tos', 'privacy', 'about', 'jobs', 'status',
              'verified-choose', 'search-advanced', 'help', 'display', 'logout', 'login',
              'signup', 'flow', 'following', 'followers', 'topics', 'communities', 'premium',
              'hashtag', 'explore', 'connect_people', 'topics_picker', // 更多可能的非用户路径
              // 检查路径中是否包含通常与操作相关的子路径
          ];
  
          // 确保提取的 usernameFromUrl 不是排除列表中的，并且不包含进一步的路径分隔符 (如 /status/)
          // 同时，用户名通常不应过短或包含特殊字符（这里简化处理，主要排除已知路径）
          if (!excludedPaths.includes(usernameFromUrl.toLowerCase()) &&
              !usernameFromUrl.includes('/') &&
              usernameFromUrl.length > 0 && // 用户名通常有一定长度
              !['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(usernameFromUrl) // 排除纯数字的路径 (通常不是用户名)
             ) {
            this.currentUsername = usernameFromUrl;
            // console.log(`XSE: User profile page detected. Username set to: ${this.currentUsername}`);
            return true;
          }
        }
  
        // 如果不匹配用户配置页的模式，则清空当前用户名
        this.currentUsername = null;
        return false;
      }

    isSearchResultsPage(url) {
      return url.includes('/search?q=') || url.includes('/search?f=');
    }

    async addUserProfileButton() {
      // 首先移除任何已存在的按钮，以防重复添加
      const existingButton = document.querySelector('.x-search-enhancer-follow-btn');
      if (existingButton) {
        existingButton.remove();
      }

      // 使用findElementAdvanced等待用户名容器出现，超时时间为10秒
      const userNameLineContainer = await findElementAdvanced(DOM_SELECTORS.PROFILE_PAGE.USER_NAME_LINE_CONTAINER, document, 10000);

      if (userNameLineContainer) {
        // console.log("XSE: Username line container found for profile button:", userNameLineContainer);
        this.createFollowButton(userNameLineContainer);
      } else {
        // 如果超时后仍未找到容器，则记录警告，按钮不会被添加
        // 用户应检查 DOM_SELECTORS.PROFILE_PAGE.USER_NAME_LINE_CONTAINER 是否需要更新
        console.warn(`XSE: Username line container not found on profile page after 10s timeout. Follow button not added. URL: ${window.location.href}. Ensure DOM_SELECTORS.PROFILE_PAGE.USER_NAME_LINE_CONTAINER is up-to-date.`);
      }
    }

    createFollowButton(parentElement) {
      if (!this.currentUsername) {
        console.warn("XSE: currentUsername is not set. Cannot create follow button.");
        return;
      }
      if (parentElement.querySelector('.x-search-enhancer-follow-btn')) {
        console.log("XSE: Follow button already exists in parent. Skipping creation.");
        return;
      }

      const isSpecialUser = this.specialUsers.some(user => user.username === this.currentUsername);

      const button = document.createElement('button');
      button.className = 'x-search-enhancer-follow-btn';
      button.innerHTML = isSpecialUser ? '⭐' : '☆';
      button.title = isSpecialUser ? '从特别关注中移除' : '添加到特别关注';

      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡到父元素，以防意外导航或操作
        await this.toggleSpecialUser(this.currentUsername, button);
      });

      // 将按钮附加到父元素的末尾
      // parentElement 通常是包含用户名的那一行元素
      parentElement.appendChild(button);
      console.log("XSE: Follow button created and appended to:", parentElement);
    }

    async toggleSpecialUser(username, buttonElement) {
      const existingUserIndex = this.specialUsers.findIndex(user => user.username === username);

      if (existingUserIndex !== -1) {
        this.specialUsers.splice(existingUserIndex, 1);
        if (buttonElement) {
            buttonElement.innerHTML = '☆';
            buttonElement.title = '添加到特别关注';
        }
      } else {
        const displayName = await this.getUserDisplayName(username);
        this.specialUsers.push({
          username: username,
          displayName: displayName || username
        });
        if (buttonElement) {
            buttonElement.innerHTML = '⭐';
            buttonElement.title = '从特别关注中移除';
        }
      }

      await this.saveSpecialUsers();

      if (this.panel) {
        this.updatePanelUserList();
      }
    }

    async getUserDisplayName(username) {
      const userNameContainer = await findElementAdvanced(DOM_SELECTORS.PROFILE_PAGE.USER_NAME_LINE_CONTAINER[0]);
      if (userNameContainer) {
          // 尝试从容器内提取更精确的显示名
          const displayNameElement = userNameContainer.querySelector(DOM_SELECTORS.PROFILE_PAGE.USER_DISPLAY_NAME_IN_CONTAINER);
          if (displayNameElement) {
              const nameText = displayNameElement.textContent?.trim();
              if (nameText) return nameText;
          }
          // 如果特定选择器找不到，回退到容器的文本内容
          const containerText = userNameContainer.textContent?.split('\n')[0].trim(); // 取第一行并去除换行
          if (containerText) return containerText;
      }
      return username;
    }

    addSearchResultsBadges() {
      const tweets = document.querySelectorAll(DOM_SELECTORS.TWEET_ARTICLE);

      tweets.forEach(tweet => {
        if (tweet.querySelector('.x-search-enhancer-badge')) {
          return;
        }
        const userLink = tweet.querySelector(DOM_SELECTORS.TWEET_USER_NAME_LINK);
        if (!userLink) return;

        const href = userLink.getAttribute('href');
        if (!href) return;

        const usernameMatch = href.match(/^\/([^\/\?#]+)/);
        if (!usernameMatch || !usernameMatch[1]) return;
        const username = usernameMatch[1];

        if (this.specialUsers.some(user => user.username === username)) {
          this.addBadgeToTweet(tweet, userLink);
        }
      });
    }

    addBadgeToTweet(tweetArticle, userLinkElement) {
      const badge = document.createElement('span');
      badge.className = 'x-search-enhancer-badge';
      badge.innerHTML = '⭐';
      badge.title = '特别关注用户';

      const userNameContainer = userLinkElement.closest(DOM_SELECTORS.TWEET_USER_NAME_CONTAINER);
      if (userNameContainer) {
        if (!userNameContainer.querySelector('.x-search-enhancer-badge')) {
            userNameContainer.appendChild(badge);
        }
      } else {
          userLinkElement.parentElement?.appendChild(badge);
      }
    }

    async togglePanel() {
        if (this.panel) { // 如果面板存在，表示要关闭
          await this.setPanelOpenState(false); // 更新状态为关闭
          this.removePanel(); // 仅移除DOM
        } else { // 面板不存在，表示要创建
          this.createPanel(); // 创建面板DOM
          await this.setPanelOpenState(true);  // 更新状态为打开
        }
    }

    createPanel() {
      if (document.getElementById(DOM_SELECTORS.PANEL.ID)) {
        this.panel = document.getElementById(DOM_SELECTORS.PANEL.ID);
        // 如果面板已存在，可能需要刷新其内容，但状态管理不在这里做
        this.updatePanelUserList();
        return;
      }

      const panelContainer = document.createElement('div');
      panelContainer.id = DOM_SELECTORS.PANEL.ID;

      panelContainer.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px;">
            <h2>X 搜索增强</h2>
            <button id="${DOM_SELECTORS.PANEL.CLOSE_BUTTON.substring(1)}">×</button>
          </div>
          <div style="margin-bottom: 28px;">
            <div class="search-input-container">
              <div class="search-icon">🔍</div>
              <input type="text" id="${DOM_SELECTORS.PANEL.SEARCH_INPUT.substring(1)}" placeholder="搜索关键词...">
            </div>
          </div>
          <div style="margin-bottom: 28px;">
            <h3>
              特别关注
              <div class="user-count-badge">${this.specialUsers.length}</div>
            </h3>
            <div id="${DOM_SELECTORS.PANEL.SPECIAL_USERS_LIST_CONTAINER.substring(1)}">
            </div>
          </div>
          <button id="${DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON.substring(1)}">开始搜索</button>
        </div>
      `;

      document.body.appendChild(panelContainer);
      this.panel = panelContainer;

      this.bindPanelEvents();
      this.updatePanelUserList();
    }

    bindPanelEvents() {
      if (!this.panel) return;

      const closeButton = this.panel.querySelector(DOM_SELECTORS.PANEL.CLOSE_BUTTON);
      if (closeButton) {
        closeButton.addEventListener('click', async () => {
          await this.setPanelOpenState(false); // 更新状态为关闭
          this.removePanel(); // 仅移除DOM
        });
      }

      const executeSearchButton = this.panel.querySelector(DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON);
      if (executeSearchButton) {
          executeSearchButton.addEventListener('click', () => this.executeSearch());
      }

      const searchKeywordsInput = this.panel.querySelector(DOM_SELECTORS.PANEL.SEARCH_INPUT);
      if (searchKeywordsInput) {
          searchKeywordsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              this.executeSearch();
            }
          });
      }
    }

    updatePanelUserList() {
      if (!this.panel) return;

      const userListContainer = this.panel.querySelector(DOM_SELECTORS.PANEL.SPECIAL_USERS_LIST_CONTAINER);
      if (!userListContainer) return;

      const counter = this.panel.querySelector(DOM_SELECTORS.PANEL.USER_COUNT_BADGE);
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

      userListContainer.innerHTML = this.specialUsers.map(user => `
        <div class="special-user-item" data-username="${user.username}">
          <div class="user-info">
            <div class="user-indicator"></div>
            <div class="user-details">
              <div class="user-display-name">${user.displayName || user.username}</div>
              <div class="user-username">@${user.username}</div>
            </div>
          </div>
          <button class="remove-user" data-username="${user.username}" title="移除用户">×</button>
        </div>
      `).join('');

      userListContainer.querySelectorAll(DOM_SELECTORS.PANEL.SPECIAL_USER_ITEM).forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.classList.contains('remove-user')) {
            const username = item.dataset.username;
            window.open(`https://x.com/${username}`, '_blank');
          }
        });
      });

      userListContainer.querySelectorAll(DOM_SELECTORS.PANEL.REMOVE_USER_BUTTON).forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const username = e.target.dataset.username;
          this.specialUsers = this.specialUsers.filter(user => user.username !== username);
          await this.saveSpecialUsers();
          this.updatePanelUserList();

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

    executeSearch() {
      if (!this.panel) return;
      const keywordsInput = this.panel.querySelector(DOM_SELECTORS.PANEL.SEARCH_INPUT);
      if (!keywordsInput) return;

      const keywords = keywordsInput.value.trim();

      if (!keywords) {
        keywordsInput.classList.add('error-state');
        setTimeout(() => {
          keywordsInput.classList.remove('error-state');
        }, 500);
        return;
      }

      let searchQuery = keywords;
      if (this.specialUsers.length > 0) {
        const usernames = this.specialUsers.map(user => `from:${user.username}`).join(' OR ');
        searchQuery = `(${usernames}) ${keywords}`;
      }

      const encodedQuery = encodeURIComponent(searchQuery);
      const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query`;

      const searchBtn = this.panel.querySelector(DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON);
      if (searchBtn) {
          searchBtn.innerHTML = '搜索中...';
          searchBtn.style.opacity = '0.7';
      }

      setTimeout(() => {
        window.location.href = searchUrl;
      }, 300);
    }

    removePanel() {
      if (this.panel) {
        this.panel.style.animation = 'slideOutPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => {
          if (this.panel) {
            this.panel.remove();
            this.panel = null;
          }
        }, 290);
      }
    }
  }

/**
 * @async
 * @function initializeExtension
 * @description 异步初始化扩展。它会等待页面关键区域加载完成后再实例化 XSearchEnhancer。
 * 这是模块2 - 动态内容加载处理器的核心部分，确保扩展在页面准备好后才启动。
 */
async function initializeExtension() {
    // 检查扩展上下文是否仍然有效，以防页面在DOMContentLoaded后迅速卸载
    if (!(chrome.runtime && chrome.runtime.id)) {
        console.warn('XSE: Context invalidated before extension initialization could start.');
        return;
    }

    // 等待一个核心的页面容器元素出现，表明页面已基本加载。
    // DOM_SELECTORS.MAIN_CONTENT_AREA (main[role="main"]) 是一个不错的选择。
    // 给与一个相对宽松的超时时间，因为这是首次加载。
    const mainPageArea = await findElementAdvanced(DOM_SELECTORS.MAIN_CONTENT_AREA, document, 15000); // 等待最多15秒

    if (mainPageArea) {
        // console.log("XSE: Main content area found, initializing XSearchEnhancer.");
        // 再次检查上下文，因为 await 可能会有延迟
        if (chrome.runtime && chrome.runtime.id) {
            const xSearchEnhancer = new XSearchEnhancer();
            await xSearchEnhancer.init(); // 调用 init 方法
        } else {
            console.warn('XSE: Context invalidated just before XSearchEnhancer instantiation.');
        }
    } else {
        console.warn(`XSE: Main content area (${DOM_SELECTORS.MAIN_CONTENT_AREA}) not found after 15s timeout. XSearchEnhancer not initialized. URL:`, window.location.href);
    }
}

// 扩展启动逻辑
// 确保在文档基本结构加载完成后开始尝试初始化。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  // 如果 DOMContentLoaded 已经触发，则直接尝试初始化。
  initializeExtension();
}
