// src/constants.js

/**
 * @constant {object} DOM_SELECTORS
 * @description 存储扩展中使用的所有DOM选择器，便于维护和更新。
 * 选择器按其用途或相关页面区域进行组织。
 */
export const DOM_SELECTORS = {
  // X.com/Twitter 页面元素
  TWEET_ARTICLE: 'article[data-testid="tweet"]',
  TWEET_USER_NAME_LINK: '[data-testid="User-Name"] a[role="link"]',
  TWEET_USER_NAME_CONTAINER: '[data-testid="User-Name"]',

  PROFILE_PAGE: {
    USER_NAME_LINE_CONTAINER: ['div[data-testid="UserName"]'],
    USER_DISPLAY_NAME_IN_CONTAINER: 'span > span > span',
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

    TOGGLE_ADVANCED_FILTERS_BTN_ID: 'xse-toggle-advanced-filters-btn',
    ADVANCED_FILTERS_AREA_ID: 'xse-advanced-filters-area',

    FROM_USER_CONTAINER_ID: 'xse-from-user-container',
    FROM_USER_INPUT_ID: 'xse-from-user',

    FILTER_TODAY_BTN_ID: 'xse-filter-today-btn',
    FILTER_VERIFIED_BTN_ID: 'xse-filter-verified-btn',
    FILTER_IMAGES_BTN_ID: 'xse-filter-images-btn',
    FILTER_VIDEOS_BTN_ID: 'xse-filter-videos-btn',
    FILTER_LINKS_BTN_ID: 'xse-filter-links-btn',
    EXCLUDE_REPLIES_BTN_ID: 'xse-filter-exclude-replies-btn',

    LANG_CODE_SELECT_ID: 'xse-lang-code',
    CLEAR_FILTERS_BTN_ID: 'xse-clear-filters-btn',
  },
};

/**
 * @constant {object} ADVANCED_FILTER_STORAGE_KEYS
 * @description 高级筛选持久化存储键名
 */
export const ADVANCED_FILTER_STORAGE_KEYS = {
  EXPANDED: 'xseAdvancedFiltersExpanded',
  FROM_USER: 'xseAdvancedFilterFromUser',
  FILTER_TODAY: 'xseAdvancedFilterToday',
  FILTER_VERIFIED: 'xseAdvancedFilterVerified',
  FILTER_IMAGES: 'xseAdvancedFilterImages',
  FILTER_VIDEOS: 'xseAdvancedFilterVideos',
  FILTER_LINKS: 'xseAdvancedFilterLinks',
  LANG_CODE: 'xseAdvancedFilterLangCode',
  EXCLUDE_REPLIES: 'xseAdvancedFilterExcludeReplies',
  SPECIAL_USERS_EXPANDED: 'xseSpecialUsersExpanded', // 注意：这个键名之前可能在 content_script.js 中有，确保一致
};

/**
 * @constant {object} ICONS
 * @description SVG 图标字符串
 */
export const ICONS = {
  TODAY:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zM5 8V6h14v2H5z"/></svg>',
  VERIFIED:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>',
  IMAGES:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
  VIDEOS:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>',
  LINKS:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
  EXCLUDE_REPLIES:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>',
};
