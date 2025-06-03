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

        // === Advance-filters-selectors ===
        // 20250602 新增：高级筛选相关选择器
        TOGGLE_ADVANCED_FILTERS_BTN_ID: 'xse-toggle-advanced-filters-btn',
        ADVANCED_FILTERS_AREA_ID: 'xse-advanced-filters-area',
        
        FROM_USER_CONTAINER_ID: 'xse-from-user-container',
        FROM_USER_INPUT_ID: 'xse-from-user',
        
        SINCE_DATE_INPUT_ID: 'xse-since-date',
        UNTIL_DATE_INPUT_ID: 'xse-until-date',
        DATE_ERROR_MESSAGE_ID: 'xse-date-error-message',

        FILTER_VERIFIED_CHECKBOX_ID: 'xse-filter-verified',
        FILTER_IMAGES_CHECKBOX_ID: 'xse-filter-images',
        FILTER_VIDEOS_CHECKBOX_ID: 'xse-filter-videos',
        FILTER_LINKS_CHECKBOX_ID: 'xse-filter-links',

        LANG_CODE_SELECT_ID: 'xse-lang-code',
        EXCLUDE_REPLIES_CHECKBOX_ID: 'xse-exclude-replies',

        CLEAR_FILTERS_BTN_ID: 'xse-clear-filters-btn',
    }
};

// === Advance-filters ===
// 20250602 新增：高级筛选持久化存储键名
const ADVANCED_FILTER_STORAGE_KEYS = {
    EXPANDED: 'xseAdvancedFiltersExpanded',
    FROM_USER: 'xseAdvancedFilterFromUser',
    SINCE_DATE: 'xseAdvancedFilterSinceDate',
    UNTIL_DATE: 'xseAdvancedFilterUntilDate',
    FILTER_VERIFIED: 'xseAdvancedFilterVerified',
    FILTER_IMAGES: 'xseAdvancedFilterImages',
    FILTER_VIDEOS: 'xseAdvancedFilterVideos',
    FILTER_LINKS: 'xseAdvancedFilterLinks',
    LANG_CODE: 'xseAdvancedFilterLangCode',
    EXCLUDE_REPLIES: 'xseAdvancedFilterExcludeReplies',
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
      // 20250602 新增：用于存储高级筛选当前值的对象
      this.advancedFilterValues = this._getDefaultAdvancedFilterValues();
      // this.init(); // init 将在 initializeExtension 中被调用
    }

    // === Advance-filters ===
    // 20250602 新增：获取高级筛选默认值
    _getDefaultAdvancedFilterValues() {
        return {
            [ADVANCED_FILTER_STORAGE_KEYS.FROM_USER]: '',
            [ADVANCED_FILTER_STORAGE_KEYS.SINCE_DATE]: '',
            [ADVANCED_FILTER_STORAGE_KEYS.UNTIL_DATE]: '',
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

    // --- 高级筛选区域渲染方法 ---
    _renderAdvancedFiltersArea() {
        const area = document.createElement('div');
        area.id = DOM_SELECTORS.PANEL.ADVANCED_FILTERS_AREA_ID;
        // area.style.display = 'none'; // 初始隐藏由 CSS 控制或 JS 添加 .xse-hidden
        area.classList.add('xse-advanced-filters-area'); // 应用主区域样式
        area.setAttribute('role', 'region');
        area.setAttribute('aria-labelledby', DOM_SELECTORS.PANEL.TOGGLE_ADVANCED_FILTERS_BTN_ID);

        // 1. 用户筛选组
        area.appendChild(this._createLabeledInput(
            DOM_SELECTORS.PANEL.FROM_USER_CONTAINER_ID, // 容器ID用于JS控制显隐
            DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID,
            '指定用户 (From user):',
            'text',
            'username'
        ));

        // 2. 日期筛选组
        const dateFilterGroup = document.createElement('div');
        dateFilterGroup.classList.add('xse-filter-group');
        dateFilterGroup.appendChild(this._createLabeledInput(
            '', 
            DOM_SELECTORS.PANEL.SINCE_DATE_INPUT_ID,
            '开始日期 (Since):',
            'date',
            '',
            { containerClasses: ['xse-date-since-container'] } // 可以添加更具体的类
        ));
        dateFilterGroup.appendChild(this._createLabeledInput(
            '', 
            DOM_SELECTORS.PANEL.UNTIL_DATE_INPUT_ID,
            '结束日期 (Until):',
            'date',
            '',
            { containerClasses: ['xse-date-until-container'] }
        ));
        const dateErrorMessage = document.createElement('small');
        dateErrorMessage.id = DOM_SELECTORS.PANEL.DATE_ERROR_MESSAGE_ID;
        dateErrorMessage.classList.add('xse-date-error'); // 应用错误提示样式
        // dateErrorMessage.style.display = 'none'; // 由JS控制
        dateErrorMessage.classList.add('xse-hidden');
        dateFilterGroup.appendChild(dateErrorMessage);
        area.appendChild(dateFilterGroup);

        // 3. 内容类型筛选组
        const contentTypeGroup = document.createElement('div');
        contentTypeGroup.classList.add('xse-filter-group');
        contentTypeGroup.appendChild(this._createLabeledCheckbox(DOM_SELECTORS.PANEL.FILTER_VERIFIED_CHECKBOX_ID, '认证用户 (Verified users)'));
        contentTypeGroup.appendChild(this._createLabeledCheckbox(DOM_SELECTORS.PANEL.FILTER_IMAGES_CHECKBOX_ID, '包含图片 (Includes images)'));
        contentTypeGroup.appendChild(this._createLabeledCheckbox(DOM_SELECTORS.PANEL.FILTER_VIDEOS_CHECKBOX_ID, '包含视频 (Includes videos)'));
        contentTypeGroup.appendChild(this._createLabeledCheckbox(DOM_SELECTORS.PANEL.FILTER_LINKS_CHECKBOX_ID, '包含链接 (Includes links)'));
        area.appendChild(contentTypeGroup);
        
        // 4. 推文属性筛选组
        const langOptions = [
            { text: '任意语言', value: '' }, { text: '中文', value: 'zh' },
            { text: '英语', value: 'en' }, { text: '日语', value: 'ja' },
            { text: '韩语', value: 'ko' },
        ];
        area.appendChild(this._createLabeledSelect(
            DOM_SELECTORS.PANEL.LANG_CODE_SELECT_ID,
            '语言 (Language):',
            langOptions
        ));
        area.appendChild(this._createLabeledCheckbox(
            DOM_SELECTORS.PANEL.EXCLUDE_REPLIES_CHECKBOX_ID, 
            '排除回复 (Exclude replies)',
            { marginTop: '10px' }
        ));
        
        // 5. 操作按钮组
        const actionButtonsGroup = document.createElement('div');
        actionButtonsGroup.classList.add('xse-filter-group'); // 也作为一组
        actionButtonsGroup.style.marginTop = '20px'; // 保持这个微调
        actionButtonsGroup.appendChild(this._createButton(
            DOM_SELECTORS.PANEL.CLEAR_FILTERS_BTN_ID,
            '清除筛选',
            { additionalClasses: ['xse-button'] } // 使用通用按钮类
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
                    ...Object.values(ADVANCED_FILTER_STORAGE_KEYS).filter(k => k !== ADVANCED_FILTER_STORAGE_KEYS.EXPANDED) // 获取所有筛选条件的值
                ];
                chrome.storage.local.get(keysToGet, (result) => {
                    if (chrome.runtime.lastError) {
                        console.warn('XSE: Error loading advanced filter states:', chrome.runtime.lastError.message);
                        this.advancedFilterValues = this._getDefaultAdvancedFilterValues(); // 出错时使用默认值
                        this.isAdvancedFiltersExpanded = false; // 默认不展开
                    } else {
                        this.isAdvancedFiltersExpanded = !!result[ADVANCED_FILTER_STORAGE_KEYS.EXPANDED];
                        // 加载各个筛选条件的值，如果存储中没有，则使用默认值
                        for (const key in this.advancedFilterValues) {
                            if (result.hasOwnProperty(key)) {
                                this.advancedFilterValues[key] = result[key];
                            } else {
                                // 如果某个键在存储中不存在，则使用默认对象中的值
                                this.advancedFilterValues[key] = this._getDefaultAdvancedFilterValues()[key];
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

    async _saveAdvancedFilterStates() {
        if (!this.panel) return; // 仅当面板存在时（即UI元素已创建）才尝试读取和保存

        // 从UI元素更新 this.advancedFilterValues
        // 注意: from_user 的值在隐藏时不应该从UI读取，而应保留其在 this.advancedFilterValues 中的值
        const fromUserInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID}`);
        const fromUserContainer = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_CONTAINER_ID}`);
        if (fromUserContainer && fromUserContainer.style.display !== 'none' && fromUserInput) { // 仅当可见时更新
            this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER] = fromUserInput.value;
        }
        // 对于其他控件，可以直接从UI读取，因为它们总是可见（在高级筛选区域展开时）
        const sinceDateInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.SINCE_DATE_INPUT_ID}`);
        if (sinceDateInput) this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.SINCE_DATE] = sinceDateInput.value;
        
        const untilDateInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.UNTIL_DATE_INPUT_ID}`);
        if (untilDateInput) this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.UNTIL_DATE] = untilDateInput.value;

        const verifiedCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FILTER_VERIFIED_CHECKBOX_ID}`);
        if (verifiedCheckbox) this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_VERIFIED] = verifiedCheckbox.checked;
        
        const imagesCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FILTER_IMAGES_CHECKBOX_ID}`);
        if (imagesCheckbox) this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_IMAGES] = imagesCheckbox.checked;

        const videosCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FILTER_VIDEOS_CHECKBOX_ID}`);
        if (videosCheckbox) this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_VIDEOS] = videosCheckbox.checked;

        const linksCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FILTER_LINKS_CHECKBOX_ID}`);
        if (linksCheckbox) this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FILTER_LINKS] = linksCheckbox.checked;
        
        const langSelect = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.LANG_CODE_SELECT_ID}`);
        if (langSelect) this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.LANG_CODE] = langSelect.value;

        const excludeRepliesCheckbox = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.EXCLUDE_REPLIES_CHECKBOX_ID}`);
        if (excludeRepliesCheckbox) this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.EXCLUDE_REPLIES] = excludeRepliesCheckbox.checked;

        return new Promise((resolve) => {
            if (chrome.runtime && chrome.runtime.id) {
                const statesToSave = {
                    [ADVANCED_FILTER_STORAGE_KEYS.EXPANDED]: this.isAdvancedFiltersExpanded,
                    ...this.advancedFilterValues
                };
                // console.log("XSE: Saving advanced filter states:", statesToSave);
                chrome.storage.local.set(statesToSave, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('XSE: Error saving advanced filter states:', chrome.runtime.lastError.message);
                    }
                    resolve();
                });
            } else {
                console.warn('XSE: Context invalidated before saving advanced filter states.');
                resolve();
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
        // 加载完值后，也进行一次日期校验
        this._validateDates();
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

      const panelContent = document.createElement('div');
      // 样式直接在 content_styles.css 中通过 #x-search-enhancer-panel > div 控制
      panelContent.style.padding = '32px'; // 保留这些基础布局，CSS中可覆盖
      panelContent.style.overflowY = 'auto';
      panelContent.style.maxHeight = 'calc(100vh - 80px)';

      // 1. 标题和关闭按钮
      const headerDiv = document.createElement('div');
      // 样式直接在 content_styles.css 中通过 #x-search-enhancer-panel h2 和 #close-panel 控制
      Object.assign(headerDiv.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' });
      const title = document.createElement('h2');
      title.textContent = 'X 搜索增强';
      headerDiv.appendChild(title);
      headerDiv.appendChild(this._createButton(DOM_SELECTORS.PANEL.CLOSE_BUTTON.substring(1), '×'));
      panelContent.appendChild(headerDiv);

      // 2. 搜索关键词输入区域
      const searchInputMainContainer = document.createElement('div');
      searchInputMainContainer.style.marginBottom = '28px';
      const searchInputContainer = document.createElement('div');
      searchInputContainer.className = 'search-input-container';
      const searchIcon = document.createElement('div');
      searchIcon.className = 'search-icon';
      searchIcon.innerHTML = '🔍';
      searchInputContainer.appendChild(searchIcon);
      const searchKeywordsInput = document.createElement('input');
      searchKeywordsInput.type = 'text';
      searchKeywordsInput.id = DOM_SELECTORS.PANEL.SEARCH_INPUT.substring(1);
      searchKeywordsInput.placeholder = '请输入你想搜索的内容...';
      searchInputContainer.appendChild(searchKeywordsInput);
      searchInputMainContainer.appendChild(searchInputContainer);
      panelContent.appendChild(searchInputMainContainer);

      // 3. 高级筛选切换按钮
      const toggleAdvancedFiltersBtn = this._createButton(
          DOM_SELECTORS.PANEL.TOGGLE_ADVANCED_FILTERS_BTN_ID,
          '高级筛选 ▼'
      );
      toggleAdvancedFiltersBtn.setAttribute('aria-expanded', 'false');
      toggleAdvancedFiltersBtn.setAttribute('aria-controls', DOM_SELECTORS.PANEL.ADVANCED_FILTERS_AREA_ID);
      panelContent.appendChild(toggleAdvancedFiltersBtn);

      // 4. 高级筛选区域 (通过新方法渲染)
      const advancedFiltersArea = this._renderAdvancedFiltersArea();
      panelContent.appendChild(advancedFiltersArea);

      // 5. 特别关注区域
      const specialUsersMainContainer = document.createElement('div');
      specialUsersMainContainer.style.marginBottom = '28px';
      const specialUsersHeader = document.createElement('h3');
      specialUsersHeader.innerHTML = `特别关注 <div class="${DOM_SELECTORS.PANEL.USER_COUNT_BADGE.substring(1)}">${this.specialUsers.length}</div>`;
      specialUsersMainContainer.appendChild(specialUsersHeader);
      const specialUsersListContainer = document.createElement('div');
      specialUsersListContainer.id = DOM_SELECTORS.PANEL.SPECIAL_USERS_LIST_CONTAINER.substring(1);
      specialUsersMainContainer.appendChild(specialUsersListContainer);
      panelContent.appendChild(specialUsersMainContainer);

      // 6. 执行搜索按钮
      panelContent.appendChild(this._createButton(
          DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON.substring(1), 
          '开始搜索'
      ));

      panelContainer.appendChild(panelContent);
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
                // const newState = filtersArea.style.display === 'none';
                // filtersArea.style.display = newState ? 'block' : 'none'; 
                const newState = !filtersArea.classList.contains('xse-expanded');
                if (newState) {
                    filtersArea.classList.add('xse-expanded');
                    filtersArea.classList.remove('xse-hidden'); // 确保移除，尽管CSS可能已处理
                } else {
                    filtersArea.classList.remove('xse-expanded');
                }
                toggleAdvancedBtn.textContent = newState ? '高级筛选 ▲' : '高级筛选 ▼';
                toggleAdvancedBtn.setAttribute('aria-expanded', String(newState));
                this.isAdvancedFiltersExpanded = newState;
                this._saveAdvancedFilterStates(); 
            }
        });
      }

      // “清除筛选”按钮事件
      const clearFiltersBtn = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.CLEAR_FILTERS_BTN_ID}`);
      if (clearFiltersBtn) {
          clearFiltersBtn.addEventListener('click', () => {
              // 重置 this.advancedFilterValues 为默认值
              this.advancedFilterValues = this._getDefaultAdvancedFilterValues();
              // 将这些默认值应用回 UI 控件
              this._applyAdvancedFilterStatesToUI(); // 这会更新UI并调用 updateAdvancedFiltersUI
              // 保存重置后的状态
              this._saveAdvancedFilterStates();
          });
      }

      // 日期校验事件绑定
      const sinceDateInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.SINCE_DATE_INPUT_ID}`);
      const untilDateInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.UNTIL_DATE_INPUT_ID}`);
      if (sinceDateInput) {
          sinceDateInput.addEventListener('change', () => {
              this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.SINCE_DATE] = sinceDateInput.value;
              this._validateDates();
              this._saveAdvancedFilterStates();
          });
      }
      if (untilDateInput) {
          untilDateInput.addEventListener('change', () => {
              this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.UNTIL_DATE] = untilDateInput.value;
              this._validateDates();
              this._saveAdvancedFilterStates();
          });
      }

      // 其他筛选条件值改变时保存状态
      const filterInputsToWatch = [
          // from_user 在 updateAdvancedFiltersUI 中处理显隐，其值在 _saveAdvancedFilterStates 中根据可见性读取
          // DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID, // input event
          DOM_SELECTORS.PANEL.FILTER_VERIFIED_CHECKBOX_ID, // change event
          DOM_SELECTORS.PANEL.FILTER_IMAGES_CHECKBOX_ID,   // change event
          DOM_SELECTORS.PANEL.FILTER_VIDEOS_CHECKBOX_ID,  // change event
          DOM_SELECTORS.PANEL.FILTER_LINKS_CHECKBOX_ID,    // change event
          DOM_SELECTORS.PANEL.LANG_CODE_SELECT_ID,         // change event
          DOM_SELECTORS.PANEL.EXCLUDE_REPLIES_CHECKBOX_ID // change event
      ];

      filterInputsToWatch.forEach(inputId => {
          const inputElement = this.panel.querySelector(`#${inputId}`);
          if (inputElement) {
              const eventType = inputElement.type === 'checkbox' || inputElement.tagName === 'SELECT' ? 'change' : 'input';
              inputElement.addEventListener(eventType, () => {
                  // _saveAdvancedFilterStates 会从UI读取当前值并保存
                  this._saveAdvancedFilterStates();
              });
          }
      });
      // from:username 的 input 事件单独处理，因为它可能被隐藏
      const fromUserInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_INPUT_ID}`);
      if(fromUserInput) {
          fromUserInput.addEventListener('input', () => {
              // 只有当它可见时，它的值变化才触发保存
              const fromUserContainer = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.FROM_USER_CONTAINER_ID}`);
              if(fromUserContainer && fromUserContainer.style.display !== 'none') {
                this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.FROM_USER] = fromUserInput.value;
                this._saveAdvancedFilterStates();
              }
          });
      }
    }

    // --- 新增：日期校验方法 ---
    _validateDates() {
        if (!this.panel) return;
        const sinceDateInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.SINCE_DATE_INPUT_ID}`);
        const untilDateInput = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.UNTIL_DATE_INPUT_ID}`);
        const errorMessageElement = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.DATE_ERROR_MESSAGE_ID}`);

        if (!sinceDateInput || !untilDateInput || !errorMessageElement) return false;

        const sinceDate = sinceDateInput.value;
        const untilDate = untilDateInput.value;

        // errorMessageElement.style.display = 'none'; // 默认隐藏错误信息
        errorMessageElement.classList.add('xse-hidden');
        let isValid = true;

        if (sinceDate && untilDate) {
            const dSince = new Date(sinceDate);
            const dUntil = new Date(untilDate);
            if (dSince > dUntil) {
                errorMessageElement.textContent = '开始日期不能晚于结束日期。';
                // errorMessageElement.style.display = 'block';
                errorMessageElement.classList.remove('xse-hidden');
                isValid = false;
            }
        }
        return isValid;
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
          // 递归调用以刷新列表和计数器
          this.updatePanelUserList();

          // TODO: updateAdvancedFiltersUI 会在 updatePanelUserList 结束时被调用

          if (this.currentUsername === username) {
            const profileButton = document.querySelector('.x-search-enhancer-follow-btn');
            if (profileButton) {
              profileButton.innerHTML = '☆';
              profileButton.title = '添加到特别关注';
            }
          }
        });
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

      // 3. 添加其他高级筛选条件
      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.SINCE_DATE]) {
        queryParts.push(`since:${this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.SINCE_DATE]}`);
      }
      if (this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.UNTIL_DATE]) {
        queryParts.push(`until:${this.advancedFilterValues[ADVANCED_FILTER_STORAGE_KEYS.UNTIL_DATE]}`);
      }
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

      // 日期校验
      if (!this._validateDates()) {
        console.log("XSE: Invalid date range. Search aborted.");
        const searchBtn = this.panel.querySelector(`#${DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON.substring(1)}`);
         if (searchBtn && !searchBtn.dataset.isPrompting) {
            searchBtn.dataset.isPrompting = 'true';
            searchBtn.textContent = '日期范围无效';
            searchBtn.disabled = true;
            setTimeout(() => {
               if(this.panel && searchBtn.dataset.isPrompting === 'true') {
                  searchBtn.textContent = '开始搜索';
                  searchBtn.disabled = false;
                  delete searchBtn.dataset.isPrompting;
               }
            }, 2000);
        }
        return;
      }

      const encodedQuery = encodeURIComponent(finalSearchQuery);
      const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query`;

      //   const searchBtn = this.panel.querySelector(DOM_SELECTORS.PANEL.EXECUTE_SEARCH_BUTTON);
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
