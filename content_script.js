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
      SPECIAL_USERS_LIST_CONTAINER: '#special-users-list', // Assuming this is the correct ID for the list itself
      USER_COUNT_BADGE: '.user-count-badge', // Class for the badge
      // EMPTY_STATE_CONTAINER: '#special-users-list .empty-state', // This would be dynamically generated, not a fixed ID
      // SPECIAL_USER_ITEM: '.special-user-item', // Class for items
      // REMOVE_USER_BUTTON: '.remove-user', // Class for remove buttons

      TOGGLE_ADVANCED_FILTERS_BTN_ID: 'xse-toggle-advanced-filters-btn',
      ADVANCED_FILTERS_AREA_ID: 'xse-advanced-filters-area',
      
      FROM_USER_CONTAINER_ID: 'xse-from-user-container',
      FROM_USER_INPUT_ID: 'xse-from-user',
      
      // REMOVE Date related IDs
      // SINCE_DATE_INPUT_ID: 'xse-since-date',
      // UNTIL_DATE_INPUT_ID: 'xse-until-date',
      // DATE_ERROR_MESSAGE_ID: 'xse-date-error-message',

      // 20250603 ADD/MODIFY IDs for new filter buttons
      FILTER_TODAY_BTN_ID: 'xse-filter-today-btn',
      FILTER_VERIFIED_BTN_ID: 'xse-filter-verified-btn',
      FILTER_IMAGES_BTN_ID: 'xse-filter-images-btn',
      FILTER_VIDEOS_BTN_ID: 'xse-filter-videos-btn',
      FILTER_LINKS_BTN_ID: 'xse-filter-links-btn',
      EXCLUDE_REPLIES_BTN_ID: 'xse-filter-exclude-replies-btn',

      LANG_CODE_SELECT_ID: 'xse-lang-code',
      CLEAR_FILTERS_BTN_ID: 'xse-clear-filters-btn',
    }
};

// === Advance-filters ===
// 高级筛选持久化存储键名
const ADVANCED_FILTER_STORAGE_KEYS = {
  EXPANDED: 'xseAdvancedFiltersExpanded',
  FROM_USER: 'xseAdvancedFilterFromUser',
  // REMOVE Date related keys
  // SINCE_DATE: 'xseAdvancedFilterSinceDate',
  // UNTIL_DATE: 'xseAdvancedFilterUntilDate',
  // ADD key for "Today" filter
  FILTER_TODAY: 'xseAdvancedFilterToday',
  FILTER_VERIFIED: 'xseAdvancedFilterVerified',
  FILTER_IMAGES: 'xseAdvancedFilterImages',
  FILTER_VIDEOS: 'xseAdvancedFilterVideos',
  FILTER_LINKS: 'xseAdvancedFilterLinks',
  LANG_CODE: 'xseAdvancedFilterLangCode',
  EXCLUDE_REPLIES: 'xseAdvancedFilterExcludeReplies',
  // Add storage key for special users list expansion state 
  SPECIAL_USERS_EXPANDED: 'xseSpecialUsersExpanded'
};

// TODO：Placeholder for SVG icons - in a real scenario, these would be actual SVG strings or loaded from files.
const ICONS = {
  TODAY: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zM5 8V6h14v2H5z"/></svg>', // Example: Material 'event' icon
  VERIFIED: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>', // Example: Material 'verified' icon
  IMAGES: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>', // Example: Material 'image' icon
  VIDEOS: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>', // Example: Material 'videocam' icon
  LINKS: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>', // Example: Material 'link' icon
  EXCLUDE_REPLIES: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>', // Example: Material 'speaker_notes_off' (concept)
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
      // === Advance-filters ===
      // 用于存储高级筛选当前值的对象
      this.advancedFilterValues = this._getDefaultAdvancedFilterValues();
      this.isAdvancedFiltersExpanded = false; // 确保构造函数中初始化此状态

      // Add state for Special Users list expansion
      this.isSpecialUsersListExpanded = false; // 默认列表不展开显示全部
      this.initialSpecialUsersToShow = 2;    // 列表折叠时默认显示的用户数量
    }

    // === Advance-filters ===
    // 获取高级筛选默认值
    _getDefaultAdvancedFilterValues() {
      return {
          [ADVANCED_FILTER_STORAGE_KEYS.FROM_USER]: '',
          [ADVANCED_FILTER_STORAGE_KEYS.FILTER_TODAY]: false, // 20250603 REFACTOR ADVANCED FILTERS UI: ADDED
          [ADVANCED_FILTER_STORAGE_KEYS.FILTER_VERIFIED]: false,
          [ADVANCED_FILTER_STORAGE_KEYS.FILTER_IMAGES]: false,
          [ADVANCED_FILTER_STORAGE_KEYS.FILTER_VIDEOS]: false,
          [ADVANCED_FILTER_STORAGE_KEYS.FILTER_LINKS]: false,
          [ADVANCED_FILTER_STORAGE_KEYS.LANG_CODE]: '',
          [ADVANCED_FILTER_STORAGE_KEYS.EXCLUDE_REPLIES]: false,
      };
    }

    // --- UI 组件生成辅助方法 ---
    _createButton(id, text, { className = '', type = 'button', additionalClasses = [] } = {}) {
        const button = document.createElement('button');
        button.id = id;
        button.type = type;
        button.textContent = text;
        button.className = className; // 主要类名
        additionalClasses.forEach(cls => button.classList.add(cls)); // 添加额外类名
        return button;
    }

    _createLabeledInput(containerId, inputId, labelText, inputType = 'text', placeholder = '', { containerClasses = [], labelClasses = ['xse-label'], inputClasses = ['xse-input'] } = {}) {
        const container = document.createElement('div');
        if(containerId) container.id = containerId;
        container.classList.add('xse-filter-group'); // 通用分组类
        containerClasses.forEach(cls => container.classList.add(cls));

        const label = document.createElement('label');
        label.htmlFor = inputId;
        label.textContent = labelText;
        labelClasses.forEach(cls => label.classList.add(cls));
        
        const input = document.createElement('input');
        input.type = inputType;
        input.id = inputId;
        input.placeholder = placeholder;
        inputClasses.forEach(cls => input.classList.add(cls));
        if (inputType === 'date') {
            input.classList.add('xse-date-input'); // 特定日期输入类
        }

        container.appendChild(label);
        container.appendChild(input);
        return container;
    }
    
    _createLabeledCheckbox(checkboxId, labelText, { containerClasses = [], checkboxInputClasses = ['xse-checkbox-input'], labelClasses = ['xse-checkbox-label'], marginTop = '0px' } = {}) {
        const container = document.createElement('div');
        container.classList.add('xse-checkbox-container');
        containerClasses.forEach(cls => container.classList.add(cls));
        if (marginTop !== '0px') container.style.marginTop = marginTop; // 保留 marginTop 以便微调

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkboxInputClasses.forEach(cls => checkbox.classList.add(cls));

        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = labelText;
        labelClasses.forEach(cls => label.classList.add(cls));
        
        container.appendChild(checkbox);
        container.appendChild(label);
        return container;
    }

    _createLabeledSelect(selectId, labelText, optionsArray, { containerClasses = [], labelClasses = ['xse-label'], selectClasses = ['xse-select'] } = {}) {
        const container = document.createElement('div');
        container.classList.add('xse-filter-group');
        containerClasses.forEach(cls => container.classList.add(cls));

        const label = document.createElement('label');
        label.htmlFor = selectId;
        label.textContent = labelText;
        labelClasses.forEach(cls => label.classList.add(cls));

        const select = document.createElement('select');
        select.id = selectId;
        selectClasses.forEach(cls => select.classList.add(cls));

        optionsArray.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });

        container.appendChild(label);
        container.appendChild(select);
        return container;
    }

    // New helper for creating icon buttons ---
    _createFilterIconButton(id, labelText, iconSvg, storageKey, initialValue = false) {
      const button = document.createElement('button');
      button.id = id;
      button.type = 'button';
      button.classList.add('xse-filter-button');
      if (initialValue) {
          button.classList.add('active');
      }
      button.setAttribute('aria-pressed', String(initialValue));
      button.dataset.storageKey = storageKey; // Store the mapping to advancedFilterValues

      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'xse-filter-button-icon';
      iconWrapper.innerHTML = iconSvg; // Use the provided SVG string

      const labelWrapper = document.createElement('span');
      labelWrapper.className = 'xse-filter-button-label';
      labelWrapper.textContent = labelText;

      button.appendChild(iconWrapper);
      button.appendChild(labelWrapper);
      
      button.addEventListener('click', () => {
          const isActive = button.classList.toggle('active');
          button.setAttribute('aria-pressed', String(isActive));
          if (this.advancedFilterValues.hasOwnProperty(storageKey)) {
              this.advancedFilterValues[storageKey] = isActive;
          }
          this._savePersistentUiStates();
      });
      return button;
    }

    // --- 高级筛选区域渲染方法 ---
    _renderAdvancedFiltersArea() {
        const area = document.createElement('div');
        area.id = DOM_SELECTORS.PANEL.ADVANCED_FILTERS_AREA_ID;
        // area.style.display = 'none'; // Initial hiding is handled by CSS class 'xse-expanded' logic
        area.classList.add('xse-advanced-filters-area'); // 应用主区域样式
        area.setAttribute('role', 'region');
        area.setAttribute('aria-labelledby', DOM_SELECTORS.PANEL.TOGGLE_ADVANCED_FILTERS_BTN_ID);

        // 1. 指定用户 (From user) - Input field
        area.appendChild(this._createLabeledInput(
            DOM_SELECTORS.PANEL.FROM_USER_CONTAINER_ID, // 容器ID用于JS控制显隐
            DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID,
            '指定用户 (From user):',
            'text',
            'username'
        ));

        // --- MODIFICATION START: Replace checkboxes and date inputs with icon buttons ---
        // 2. Filter buttons group
        const filterButtonsGroup = document.createElement('div');
        filterButtonsGroup.classList.add('xse-filter-group', 'xse-filter-buttons-group');

        filterButtonsGroup.appendChild(this._createFilterIconButton(
            DOM_SELECTORS.PANEL.FILTER_TODAY_BTN_ID, '今日内容', ICONS.TODAY,
            ADVANCED_FILTER_STORAGE_KEYS.FILTER_TODAY,
            this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_TODAY]
        ));
        filterButtonsGroup.appendChild(this._createFilterIconButton(
            DOM_SELECTORS.PANEL.FILTER_VERIFIED_BTN_ID, '认证用户', ICONS.VERIFIED,
            ADVANCED_FILTER_STORAGE_KEYS.FILTER_VERIFIED,
            this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_VERIFIED]
        ));
        filterButtonsGroup.appendChild(this._createFilterIconButton(
            DOM_SELECTORS.PANEL.FILTER_IMAGES_BTN_ID, '包含图片', ICONS.IMAGES,
            ADVANCED_FILTER_STORAGE_KEYS.FILTER_IMAGES,
            this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_IMAGES]
        ));
        filterButtonsGroup.appendChild(this._createFilterIconButton(
            DOM_SELECTORS.PANEL.FILTER_VIDEOS_BTN_ID, '包含视频', ICONS.VIDEOS,
            ADVANCED_FILTER_STORAGE_KEYS.FILTER_VIDEOS,
            this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_VIDEOS]
        ));
        filterButtonsGroup.appendChild(this._createFilterIconButton(
            DOM_SELECTORS.PANEL.FILTER_LINKS_BTN_ID, '包含链接', ICONS.LINKS,
            ADVANCED_FILTER_STORAGE_KEYS.FILTER_LINKS,
            this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_LINKS]
        ));
        filterButtonsGroup.appendChild(this._createFilterIconButton(
            DOM_SELECTORS.PANEL.EXCLUDE_REPLIES_BTN_ID, '排除回复', ICONS.EXCLUDE_REPLIES,
            ADVANCED_FILTER_STORAGE_KEYS.EXCLUDE_REPLIES,
            this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.EXCLUDE_REPLIES]
        ));
        area.appendChild(filterButtonsGroup);
        // --- MODIFICATION END ---
        
        // 3. 语言 (Language) - Select dropdown
        const langOptions = [
            { text: '任意语言', value: '' }, { text: '中文', value: 'zh' },
            { text: '英语', value: 'en' }, { text: '日语', value: 'ja' },
            { text: '韩语', value: 'ko' },
        ];
        area.appendChild(this._createLabeledSelect(
          DOM_SELECTORS.PANEL.LANG_CODE_SELECT_ID,
          '语言:',
          langOptions,
          { selectClasses: ['xse-select', 'xse-button-like-select'] } // Add class for button-like styling
        ));
        
        // 4. 清除筛选 (Clear Filters) - Button
        const actionButtonsGroup = document.createElement('div');
        actionButtonsGroup.classList.add('xse-filter-group');
        actionButtonsGroup.style.marginTop = '20px';
        actionButtonsGroup.appendChild(this._createButton(
            DOM_SELECTORS.PANEL.CLEAR_FILTERS_BTN_ID,
            '清除筛选',
            { additionalClasses: ['xse-button'] }
        ));
        area.appendChild(actionButtonsGroup);

        return area;
    }

    // --- 20250603 新增：判断高级筛选条件是否都为空/默认值 ---
    _areAdvancedFiltersEffectivelyEmpty() {
      const defaults = this._getDefaultAdvancedFilterValues();
      for (const key in this.advancedFilterValues) {
          // 确保比较的是实际的筛选条件值，而不是其他可能的内部状态
          if (defaults.hasOwnProperty(key)) {
              if (this.advancedFilterValues[key] !== defaults[key]) {
                  // 只要有一个筛选条件不是默认值，就认为高级筛选不是空的
                  return false;
              }
          }
      }
      return true; // 所有高级筛选条件都处于默认值
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
      // === Advance-filters ===
      // 20250602 新增：在加载特别关注用户后，加载高级筛选状态
      await this._loadAdvancedFilterStates(); 

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

    // === Advance-filters ===
    // --- 新增：高级筛选状态持久化方法 ---
    async _loadAdvancedFilterStates() {
        return new Promise((resolve) => {
            if (chrome.runtime && chrome.runtime.id) {
                const keysToGet = [
                    ADVANCED_FILTER_STORAGE_KEYS.EXPANDED,
                    // Add SPECIAL_USERS_EXPANDED to keys to load
                    ADVANCED_FILTER_STORAGE_KEYS.SPECIAL_USERS_EXPANDED,
                    ...Object.values(ADVANCED_FILTER_STORAGE_KEYS).filter(
                        k => k !== ADVANCED_FILTER_STORAGE_KEYS.EXPANDED &&
                             k !== ADVANCED_FILTER_STORAGE_KEYS.SPECIAL_USERS_EXPANDED // 获取所有筛选条件的值
                    ) 
                    // More robust way to get all keys: Object.values(ADVANCED_FILTER_STORAGE_KEYS)
                    // However, the above ensures EXPANDED and SPECIAL_USERS_EXPANDED are explicitly listed
                    // A simpler way if all keys in ADVANCED_FILTER_STORAGE_KEYS are simple values:
                    // const keysToGet = Object.values(ADVANCED_FILTER_STORAGE_KEYS);
                ];

                // A cleaner way to get all keys if ADVANCED_FILTER_STORAGE_KEYS only contains string values for keys
                const allStorageKeys = Object.values(ADVANCED_FILTER_STORAGE_KEYS);

                chrome.storage.local.get(allStorageKeys, (result) => {
                    if (chrome.runtime.lastError) {
                        console.warn('XSE: Error loading advanced filter states:', chrome.runtime.lastError.message);
                        this.advancedFilterValues = this._getDefaultAdvancedFilterValues(); // 出错时使用默认值
                        this.isAdvancedFiltersExpanded = false; // 默认不展开
                        this.isSpecialUsersListExpanded = false;
                    } else {
                        this.isAdvancedFiltersExpanded = !!result[ADVANCED_FILTER_STORAGE_KEYS.EXPANDED];
                        this.isSpecialUsersListExpanded = !!result[ADVANCED_FILTER_STORAGE_KEYS.SPECIAL_USERS_EXPANDED];
                        
                        // Load other filter values
                        for (const key in this.advancedFilterValues) {
                          // 使用 Object.prototype.hasOwnProperty.call 确保只处理 result 对象自身的属性，
                          // 而不是原型链上的，这是一种更安全的做法。
                          if (Object.prototype.hasOwnProperty.call(result, key)) {
                              // 如果存储中有这个键，则使用存储中的值
                              this.advancedFilterValues[key] = result[key];
                          } else {
                              // 如果存储中没有这个键 (例如插件更新后新增的筛选条件，用户本地存储里还没有)
                              // 则检查默认值对象中是否有这个键，有则使用默认值
                              if (Object.prototype.hasOwnProperty.call(this._getDefaultAdvancedFilterValues(), key)) {
                                  this.advancedFilterValues[key] = this._getDefaultAdvancedFilterValues()[key];
                              }
                              // 如果默认值里也没有（理论上不应该发生，因为 this.advancedFilterValues 就是从默认值初始化的），
                              // 那么它会保持在构造函数或 _getDefaultAdvancedFilterValues 中的初始值。
                          }
                        }
                    }
                    // console.log("XSE: Loaded advanced filter states:", this.isAdvancedFiltersExpanded, this.advancedFilterValues);
                    resolve();
                });
            } else {
                console.warn('XSE: Context invalidated before loading advanced filter states.');
                this.advancedFilterValues = this._getDefaultAdvancedFilterValues();
                this.isAdvancedFiltersExpanded = false;
                resolve();
            }
        });
    }

    async _savePersistentUiStates() {
      if (!this.panel) { // 如果面板DOM不存在，则不执行任何操作
          // console.warn("XSE: Panel not found, cannot save advanced filter states.");
          return Promise.resolve(); // 返回一个已解决的Promise，避免调用方出错
      }

      // 1. 读取 "指定用户 (From user)" 输入框的值 (仅当其可见时)
      //    this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER] 应该在其 'input' 事件监听中已更新。
      //    此处可以再次确认，或者依赖于事件监听的正确性。
      const fromUserInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID}`);
      const fromUserContainer = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_CONTAINER_ID}`);
      if (fromUserContainer && !fromUserContainer.classList.contains('xse-hidden') && fromUserInput) {
          this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER] = fromUserInput.value;
      }
      // 如果 fromUserContainer 是隐藏的 (因为特别关注列表激活)，则 this.advancedFilterValues.FROM_USER 保留其之前的值。

      // 2. 读取各个筛选按钮的状态 (例如 "今日内容", "认证用户" 等)
      //    这些按钮的状态 (active/inactive) 应该在其各自的 click 事件监听器 
      //    (_createFilterIconButton内部) 中已经更新了 this.advancedFilterValues 中对应的布尔值。
      //    因此，这里不需要再次从DOM读取这些按钮的状态，this.advancedFilterValues 已经是最新。

      // 3. 读取语言选择下拉框的值
      const langSelect = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.LANG_CODE_SELECT_ID}`);
      if (langSelect) {
          this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.LANG_CODE] = langSelect.value;
      }

      // 4. this.isAdvancedFiltersExpanded 的值应该在高级筛选切换按钮的点击事件中已经被正确更新。

      // 5. 执行保存操作
      return new Promise((resolve) => {
          if (chrome.runtime && chrome.runtime.id) { // 检查插件上下文是否有效
              const statesToSave = {
                  // 保存高级筛选区域的展开/收起状态
                  [ADVANCED_FILTER_STORAGE_KEYS.EXPANDED]: this.isAdvancedFiltersExpanded,
                  [ADVANCED_FILTER_STORAGE_KEYS.SPECIAL_USERS_EXPANDED]: this.isSpecialUsersListExpanded,
                  // 保存所有筛选条件的值
                  // 使用展开运算符 (...) 来包含 this.advancedFilterValues 中的所有键值对
                  ...this.advancedFilterValues 
              };
              
              // console.log("XSE: Saving advanced filter states to chrome.storage.local:", statesToSave);
              
              chrome.storage.local.set(statesToSave, () => {
                  if (chrome.runtime.lastError) {
                      console.warn('XSE: Error saving advanced filter states to chrome.storage.local:', chrome.runtime.lastError.message);
                  } else {
                      // console.log("XSE: Advanced filter states saved successfully.");
                  }
                  resolve(); // 无论成功与否都 resolve Promise
              });
          } else {
              console.warn('XSE: Extension context invalidated before saving advanced filter states.');
              resolve(); // 上下文失效也 resolve Promise
          }
      });
    }
    
    // --- 更新：应用加载的筛选状态到UI ---
    _applyAdvancedFilterStatesToUI() {
        if (!this.panel) return;

        // 应用展开/收起状态
        const toggleBtn = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.TOGGLE_ADVANCED_FILTERS_BTN_ID}`);
        const filtersArea = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.ADVANCED_FILTERS_AREA_ID}`);
        if (toggleBtn && filtersArea) {
            if (this.isAdvancedFiltersExpanded) {
                filtersArea.classList.add('xse-expanded');
                filtersArea.classList.remove('xse-hidden'); // 确保移除隐藏类
                toggleBtn.textContent = '高级筛选 ▲';
                toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                // filtersArea.style.display = 'none';
                filtersArea.classList.remove('xse-expanded');
                // filtersArea.classList.add('xse-hidden'); // 初始隐藏由CSS的max-height:0 opacity:0处理
                toggleBtn.textContent = '高级筛选 ▼';
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        }

        // 应用各个筛选条件的值
        const fromUserInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID}`);
        if (fromUserInput) fromUserInput.value = this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER] || '';
        
        const sinceDateInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.SINCE_DATE_INPUT_ID}`);
        if (sinceDateInput) sinceDateInput.value = this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.SINCE_DATE] || '';

        const untilDateInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.UNTIL_DATE_INPUT_ID}`);
        if (untilDateInput) untilDateInput.value = this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.UNTIL_DATE] || '';

        const verifiedCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FILTER_VERIFIED_CHECKBOX_ID}`);
        if (verifiedCheckbox) verifiedCheckbox.checked = !!this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_VERIFIED];
        
        const imagesCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FILTER_IMAGES_CHECKBOX_ID}`);
        if (imagesCheckbox) imagesCheckbox.checked = !!this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_IMAGES];

        const videosCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FILTER_VIDEOS_CHECKBOX_ID}`);
        if (videosCheckbox) videosCheckbox.checked = !!this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_VIDEOS];

        const linksCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FILTER_LINKS_CHECKBOX_ID}`);
        if (linksCheckbox) linksCheckbox.checked = !!this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_LINKS];
        
        const langSelect = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.LANG_CODE_SELECT_ID}`);
        if (langSelect) langSelect.value = this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.LANG_CODE] || '';

        const excludeRepliesCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.EXCLUDE_REPLIES_CHECKBOX_ID}`);
        if (excludeRepliesCheckbox) excludeRepliesCheckbox.checked = !!this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.EXCLUDE_REPLIES];

        // 加载完值后，立即更新 from:user 区域的显隐
        this.updateAdvancedFiltersUI();
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
        // 如果面板已存在，确保应用存储的状态
        this._applyAdvancedFilterStatesToUI(); 
        // 如果面板已存在，可能需要刷新其内容，但状态管理不在这里做
        this.updatePanelUserList(); // 会间接调用 updateAdvancedFiltersUI
        return;
      }

      const panelContainer = document.createElement('div');
      panelContainer.id = DOM_SELECTORS.PANEL.ID;

      // panelContainer 将采用 flex column 布局 (在 CSS 中定义)

      // 20250603 新增：可滚动的内容区域
      const panelScrollableContent = document.createElement('div');
      panelScrollableContent.className = 'xse-panel-scrollable-content';

      // --- 将原面板的主要内容（除底部按钮外）放入 panelScrollableContent ---

      // 1. 标题和关闭按钮
      const headerDiv = document.createElement('div');
      // 样式直接在 content_styles.css 中通过 #x-search-enhancer-panel h2 和 #close-panel 控制
      Object.assign(headerDiv.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' });
      const title = document.createElement('h2');
      title.textContent = 'X-Search-Enhancer';
      headerDiv.appendChild(title);
      headerDiv.appendChild(this._createButton(DOM_SELECTORS.PANEL.CLOSE_BUTTON.substring(1), '×'));
      panelScrollableContent.appendChild(headerDiv);

      // 2. 搜索关键词输入区域
      const searchInputMainContainer = document.createElement('div');
      searchInputMainContainer.style.marginBottom = '28px'; // 保持原有的间距控制
      const searchInputContainer = document.createElement('div');
      searchInputContainer.className = 'search-input-container';
      const searchIcon = document.createElement('div');
      searchIcon.className = 'search-icon';
      searchIcon.innerHTML = '🔍';
      searchInputContainer.appendChild(searchIcon);
      const searchKeywordsInput = document.createElement('input');
      searchKeywordsInput.type = 'text';
      searchKeywordsInput.id = DOM_SELECTORS.PANEL.SEARCH_INPUT.substring(1);
      searchKeywordsInput.placeholder = '搜索 X 推文...';
      searchInputContainer.appendChild(searchKeywordsInput);
      searchInputMainContainer.appendChild(searchInputContainer);
      panelScrollableContent.appendChild(searchInputMainContainer);

      // 3. 高级筛选切换按钮
      const toggleAdvancedFiltersBtn = this._createButton(
          DOM_SELECTORS.PANEL.TOGGLE_ADVANCED_FILTERS_BTN_ID,
          '高级筛选 ▼' // Chinese: 高级筛选 ▼
      );
      toggleAdvancedFiltersBtn.setAttribute('aria-expanded', 'false');
      toggleAdvancedFiltersBtn.setAttribute('aria-controls', DOM_SELECTORS.PANEL.ADVANCED_FILTERS_AREA_ID);
      panelScrollableContent.appendChild(toggleAdvancedFiltersBtn);

      // 4. 高级筛选区域 (通过新方法渲染)
      const advancedFiltersArea = this._renderAdvancedFiltersArea();
      panelScrollableContent.appendChild(advancedFiltersArea);

      // 5 特别关注区域
      const specialUsersMainContainer = document.createElement('div');
      specialUsersMainContainer.style.marginBottom = '28px'; // 保持原有的间距控制
      const specialUsersHeader = document.createElement('h3');
      // --- MODIFICATION START: Change user count badge to a button for toggling list expansion ---
      // 使用 DOM_SELECTORS.PANEL.USER_COUNT_BADGE 作为类名，但元素是 button，并添加 ID
      specialUsersHeader.innerHTML = `特别关注 <button id="xse-special-users-toggle-btn" class="${DOM_SELECTORS.PANEL.USER_COUNT_BADGE.substring(1)}">${this.specialUsers.length}</button>`;
      // --- MODIFICATION END ---
      specialUsersMainContainer.appendChild(specialUsersHeader);
      const specialUsersListContainer = document.createElement('div');
      specialUsersListContainer.id = DOM_SELECTORS.PANEL.SPECIAL_USERS_LIST_CONTAINER.substring(1); // e.g., #special-users-list
      specialUsersMainContainer.appendChild(specialUsersListContainer);
      panelScrollableContent.appendChild(specialUsersMainContainer);

      // --- 将可滚动内容区域添加到主容器 ---
      panelContainer.appendChild(panelScrollableContent);

      // 20250603 新增：面板底部 (固定区域)
      const panelFooter = document.createElement('div');
      panelFooter.className = 'xse-panel-footer';
      
      // 将“开始搜索”按钮移到 panelFooter 中
      panelFooter.appendChild(this._createButton(
          DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON.substring(1), 
          '开始搜索'
      ));
      panelContainer.appendChild(panelFooter);

      document.body.appendChild(panelContainer);
      this.panel = panelContainer;

      this.bindPanelEvents();
      this._applyAdvancedFilterStatesToUI(); // 应用加载的或默认的状态到 UI
      this.updatePanelUserList(); // 更新特别关注列表，这也会调用 updateAdvancedFiltersUI
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

      // 高级筛选切换按钮事件
      const toggleAdvancedBtn = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.TOGGLE_ADVANCED_FILTERS_BTN_ID}`);
      if (toggleAdvancedBtn) {
        toggleAdvancedBtn.addEventListener('click', () => {
            const filtersArea = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.ADVANCED_FILTERS_AREA_ID}`);
            if (filtersArea) {
              // MODIFIED: 更新 this.isAdvancedFiltersExpanded 状态
              this.isAdvancedFiltersExpanded = !this.isAdvancedFiltersExpanded; // 切换当前的展开状态
              
              // 根据新状态更新UI
              if (this.isAdvancedFiltersExpanded) {
                  filtersArea.classList.add('xse-expanded');
                  filtersArea.classList.remove('xse-hidden'); 
              } else {
                  filtersArea.classList.remove('xse-expanded');
              }
              toggleAdvancedBtn.textContent = this.isAdvancedFiltersExpanded ? '高级筛选 ▲' : '高级筛选 ▼';
              toggleAdvancedBtn.setAttribute('aria-expanded', String(this.isAdvancedFiltersExpanded));
              
              // 最重要的一步：保存包括新的展开状态在内的所有高级筛选设置
              this._savePersistentUiStates(); 
            }
        });
      }

      const clearFiltersBtn = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.CLEAR_FILTERS_BTN_ID}`);
      if (clearFiltersBtn) {
          clearFiltersBtn.addEventListener('click', () => {
              this.advancedFilterValues = this._getDefaultAdvancedFilterValues(); // Resets all filter values
              this._applyAdvancedFilterStatesToUI(); // Applies these defaults back to the UI elements
              this._savePersistentUiStates(); // Saves the reset state
          });
      }

      // --- MODIFICATION START: Update event binding for new filter controls ---
      // Event listeners for icon buttons are now set within _createFilterIconButton.
      // Event listener for 'from user' input (if its value changes, save state)
      const fromUserInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID}`);
      if(fromUserInput) {
          fromUserInput.addEventListener('input', () => {
              const fromUserContainer = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_CONTAINER_ID}`);
              if(fromUserContainer && !fromUserContainer.classList.contains('xse-hidden')) { // Only save if visible
                this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER] = fromUserInput.value;
                this._savePersistentUiStates();
              }
          });
      }
      
      // Event listener for language select
      const langSelect = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.LANG_CODE_SELECT_ID}`);
      if (langSelect) {
          langSelect.addEventListener('change', () => {
              this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.LANG_CODE] = langSelect.value;
              this._savePersistentUiStates();
          });
      }
      // --- MODIFICATION END ---

      // --- MODIFICATION START: Add event listener for special users list toggle button ---
      const toggleSpecialUsersBtn = this.panel.querySelector('#xse-special-users-toggle-btn');
      if (toggleSpecialUsersBtn) {
          toggleSpecialUsersBtn.addEventListener('click', () => {
              this.isSpecialUsersListExpanded = !this.isSpecialUsersListExpanded;
              this.updatePanelUserList(); // Re-render the list with the new expansion state
              this._savePersistentUiStates(); // Persist the new expansion state
          });
      }
      // --- MODIFICATION END ---
    }

    updatePanelUserList() {
      if (!this.panel) return;

      const userListContainer = this.panel.querySelector(DOM_SELECTORS.PANEL.SPECIAL_USERS_LIST_CONTAINER);
      if (!userListContainer) {
        // console.warn("XSE: Special users list container not found in updatePanelUserList.");
        return;
      }

      const toggleBtn = this.panel.querySelector('#xse-special-users-toggle-btn'); 

      if (this.specialUsers.length === 0) {
        userListContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⭐</div>
            <div>暂无特别关注用户</div> 
            <div class="empty-state-subtitle">在用户主页点击 ☆ 添加用户</div>
          </div>
        `;
        if (toggleBtn) {
            toggleBtn.textContent = '0';
            toggleBtn.disabled = true; 
            toggleBtn.classList.remove('xse-toggle-active'); 
        }
        if (typeof this.updateAdvancedFiltersUI === 'function') {
            this.updateAdvancedFiltersUI();
        }
        return;
      }

      let usersToDisplay = this.specialUsers;
      let canToggle = false;

      // Logic to determine usersToDisplay and toggleBtn text now uses this.isSpecialUsersListExpanded
      // which should be correctly loaded from storage.
      if (this.specialUsers.length > this.initialSpecialUsersToShow) {
        canToggle = true;
        if (!this.isSpecialUsersListExpanded) { // Check the persisted state
          usersToDisplay = this.specialUsers.slice(0, this.initialSpecialUsersToShow);
        }
      }

      // Adjust HTML template to show displayName and @username on separate lines ---
      userListContainer.innerHTML = usersToDisplay.map(user => {
        // 确保 displayName 有值，如果为空则直接使用 username 作为第一行，避免显示 "undefined" 或空行
        const displayNameToShow = user.displayName || user.username;
        // 如果 displayName 本身就包含了 "@" + username (虽然理论上不应该，但做个预防)，则只显示 displayName
        // 但 displayName 不应包含 username，所以这里主要处理 displayName 为空的情况。
        
        return `
          <div class="special-user-item" data-username="${user.username}">
            <div class="user-info">
              <div class="user-indicator"></div>
              <div class="user-details">
                <div class="user-display-name">${displayNameToShow}</div>
                <div class="user-username">@${user.username}</div> 
              </div>
            </div>
            <button class="remove-user" data-username="${user.username}" title="移除用户">×</button>
          </div>
        `;
      }).join('');

      if (toggleBtn) {
        toggleBtn.disabled = false;
        if (canToggle) {
          if (this.isSpecialUsersListExpanded) {
            toggleBtn.textContent = `收起 (${this.specialUsers.length})`;
            toggleBtn.classList.add('xse-toggle-active');
          } else {
            toggleBtn.textContent = `显示其余 ${this.specialUsers.length - usersToDisplay.length} 条 (${this.specialUsers.length})`;
            toggleBtn.classList.remove('xse-toggle-active');
          }
          toggleBtn.style.cursor = 'pointer';
        } else {
          toggleBtn.textContent = String(this.specialUsers.length);
          toggleBtn.style.cursor = 'default';
          toggleBtn.classList.remove('xse-toggle-active');
        }
      }

      userListContainer.querySelectorAll('.special-user-item').forEach(item => {
        const userInfoArea = item.querySelector('.user-info');
        if (userInfoArea) {
            userInfoArea.addEventListener('click', (e) => {
                if (e.target.closest('.remove-user')) {
                    return;
                }
                const username = item.dataset.username;
                if (username) {
                    window.open(`https://x.com/${username}`, '_blank');
                }
            });
        }
        
        const removeButton = item.querySelector('.remove-user');
        if (removeButton) {
            removeButton.addEventListener('click', async (e) => {
              e.stopPropagation(); 
              const usernameToRemove = e.target.dataset.username;
              this.specialUsers = this.specialUsers.filter(user => user.username !== usernameToRemove);
              await this.saveSpecialUsers(); // This saves the user list
              this.updatePanelUserList(); // This re-renders the list and also updates the toggle button text

              // Note: this._savePersistentUiStates() which saves UI states like SPECIAL_USERS_EXPANDED
              // is NOT called here directly, because removing a user doesn't change the *expansion preference*.
              // The expansion preference is only changed by clicking the toggle button itself.

              if (this.currentUsername === usernameToRemove) {
                const profileButton = document.querySelector('.x-search-enhancer-follow-btn');
                if (profileButton) {
                  profileButton.innerHTML = '☆';
                  profileButton.title = '添加到特别关注';
                }
              }
            });
        }
      });

      if (typeof this.updateAdvancedFiltersUI === 'function') {
        this.updateAdvancedFiltersUI();
      }
    }

    // --- 更新：executeSearch 以整合高级筛选 ---
    executeSearch() {
      if (!this.panel) return;
      const keywordsInput = this.panel.querySelector(DOM_SELECTORS.PANEL.SEARCH_INPUT);
      if (!keywordsInput) return;

      const keywords = keywordsInput.value.trim();
      const placeholderPromptClass = 'xse-input-placeholder-prompt'; // 定义CSS类名

      // 检查用户搜索意图：如果没有关键词，高级筛选也为空，但有特别关注用户，则提示用户
      if (!keywords && this._areAdvancedFiltersEffectivelyEmpty() && this.specialUsers.length > 0) {
        const searchBtn = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON.substring(1)}`);
        const originalButtonText = '开始搜索'; 
        
        if (searchBtn && !searchBtn.dataset.isPrompting) { 
            searchBtn.dataset.isPrompting = 'true';
            const promptText = '请输入关键词或筛选';
            searchBtn.textContent = promptText;
            searchBtn.disabled = true;

            const originalPlaceholder = keywordsInput.placeholder;
            keywordsInput.placeholder = '请输入关键词或设置高级筛选';
            keywordsInput.classList.add(placeholderPromptClass); // 添加醒目样式类
            keywordsInput.focus(); 

            setTimeout(() => {
                if (this.panel && searchBtn.dataset.isPrompting === 'true') { 
                    searchBtn.textContent = originalButtonText;
                    searchBtn.disabled = false;
                    delete searchBtn.dataset.isPrompting;
                    if (keywordsInput.placeholder === '请输入关键词或设置高级筛选') {
                        keywordsInput.placeholder = originalPlaceholder;
                        keywordsInput.classList.remove(placeholderPromptClass); // 移除醒目样式类
                    }
                }
            }, 3000); 
        }
        console.log("XSE: Search aborted. No keywords or advanced filters, but special users are present. Prompting user.");
        return; 
      }

      let queryParts = [];

      // 1. 添加关键词 (如果存在)
      if (keywords) {
        queryParts.push(keywords);
      }

      // 2. 添加“特别关注”用户 (如果激活)
      // 或者，如果“特别关注”未激活，则使用高级筛选中的 from:user
      if (this.specialUsers.length > 0) {
        const usernames = this.specialUsers.map(user => `from:${user.username}`).join(' OR ');
        queryParts.push(`(${usernames})`);
      } else {
        // 仅当“特别关注”未激活且 from:user 可见且有值时，才使用高级筛选的 from:user
        const fromUserContainer = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_CONTAINER_ID}`);
        const fromUserInputVal = this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER];
        if (fromUserContainer && !fromUserContainer.classList.contains('xse-hidden') && fromUserInputVal) {
          queryParts.push(`from:${fromUserInputVal}`);
        }
      }

      // --- MODIFICATION START: 3、Add "Today's Content" logic and other filters ---
      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_TODAY]) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayDateString = `${year}-${month}-${day}`;
        queryParts.push(`since:${todayDateString}`);
        queryParts.push(`until:${todayDateString}`);
      }
      // REMOVE since: and until: logic for date inputs

      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_VERIFIED]) {
        queryParts.push('filter:verified');
      }
      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_IMAGES]) {
        queryParts.push('filter:images');
      }
      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_VIDEOS]) {
        queryParts.push('filter:videos');
      }
      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_LINKS]) {
        queryParts.push('filter:links');
      }
      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.LANG_CODE]) {
        queryParts.push(`lang:${this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.LANG_CODE]}`);
      }
      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.EXCLUDE_REPLIES]) {
        queryParts.push('-filter:replies');
      }
      // --- MODIFICATION END ---

      const finalSearchQuery = queryParts.join(' ').trim();

      // 如果没有任何有效的搜索条件（关键词、特别关注、高级筛选均为空）
      if (!finalSearchQuery) {
        const searchBtn = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON.substring(1)}`);
        if (searchBtn && !searchBtn.dataset.isPrompting) {
          searchBtn.dataset.isPrompting = 'true';
          searchBtn.textContent = '请输入搜索内容';
          searchBtn.disabled = true;
          const originalPlaceholder = keywordsInput.placeholder;
          keywordsInput.placeholder = '请输入搜索内容或设置高级筛选';
          keywordsInput.classList.add(placeholderPromptClass); // 添加醒目样式类
          keywordsInput.focus();
          setTimeout(() => {
              if (this.panel && searchBtn.dataset.isPrompting === 'true') {
                  searchBtn.textContent = '开始搜索';
                  searchBtn.disabled = false;
                  delete searchBtn.dataset.isPrompting;
                  if(keywordsInput.placeholder === '请输入搜索内容或设置高级筛选') {
                      keywordsInput.placeholder = originalPlaceholder; // 恢复原始 placeholder
                      keywordsInput.classList.remove(placeholderPromptClass); // 移除醒目样式类
                  }
              }
          }, 2000);
        }
        console.log("XSE: No search query to execute (all fields empty).");
        return;
      }

      const encodedQuery = encodeURIComponent(finalSearchQuery);
      const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query`;

      // const searchBtn = this.panel.querySelector(DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON);
      const searchBtn = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON.substring(1)}`);
      if (searchBtn) {
          searchBtn.innerHTML = '搜索中...';
          searchBtn.style.opacity = '0.7';
          searchBtn.disabled = true; // 禁用以防重复点击
      }

      // 实际跳转前，确保按钮状态在跳转失败或延迟的情况下能恢复
      // 但由于是页面跳转，当前脚本实例会销毁，所以主要靠新页面加载时重置
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

    updateAdvancedFiltersUI() {
        if (!this.panel) return;
        // console.log("XSE: updateAdvancedFiltersUI called. Special users count:", this.specialUsers.length);
        
        const fromUserContainer = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_CONTAINER_ID}`);
        const fromUserInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID}`);

        if (!fromUserContainer || !fromUserInput) {
            // console.warn("XSE: From user container or input not found in updateAdvancedFiltersUI.");
            return;
        }

        if (this.specialUsers.length > 0) {
            // fromUserContainer.style.display = 'none';
            fromUserContainer.classList.add('xse-hidden');
            // 当隐藏时，我们不应该清除 this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER]
            // 因为用户可能在“特别关注”列表为空时输入了内容，我们希望保留它。
            // executeSearch 会根据容器的可见性来决定是否使用 from:user。
            // UI上的输入框值可以保持不变，或者如果需要，可以临时清空UI上的值，但不影响存储的 this.advancedFilterValues.FROM_USER
            // fromUserInput.value = ''; // 仅清空UI显示，不改变 this.advancedFilterValues.FROM_USER
        } else {
            // fromUserContainer.style.display = 'block'; 
            fromUserContainer.classList.remove('xse-hidden');
            // 当重新显示时，从 this.advancedFilterValues 恢复其值到UI
            fromUserInput.value = this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER] || '';
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
