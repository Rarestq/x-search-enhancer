# 🏗️ 技术架构 (v1.3.0 优化后，引入构建流程)

本部分详细介绍了 X 搜索增强插件的内部技术实现、文件结构、构建流程以及关键技术点的优化。

## 📁 文件结构 (引入构建流程后)

典型的插件文件结构如下 (源代码位于 `src/`，构建输出位于 `dist/`)：

```
x-search-enhancer/
├── dist/                   # 构建输出目录 (用于浏览器加载)
│   ├── manifest.json
│   ├── content_script.js
│   ├── service_worker.js
│   ├── content_styles.css
│   └── icons/
│       └── ...
├── src/                    # 源代码目录
│   ├── content_script.js   # 内容脚本主入口 (可能进一步拆分为模块)
│   ├── service_worker.js   # Service Worker 脚本
│   ├── modules/            # (推荐) 存放拆分后的 JS 模块
│   │   └── ...
│   └── utils/              # (推荐) 存放通用工具函数
│       └── ...
├── content_styles.css      # 插件 UI 及注入元素的样式 (源码)
├── manifest.json           # 插件配置文件 (源码)
├── icons/                  # 插件图标 (不同尺寸)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── docs/                   # 项目详细文档目录
│   └── ... (FEATURES_DETAILED.md, USAGE_GUIDE.md, etc.)
├── package.json            # npm 包管理文件
├── webpack.config.js       # Webpack 配置文件
├── .eslintrc.js            # ESLint 配置文件
├── .stylelintrc.js         # Stylelint 配置文件
├── .prettierrc.js          # Prettier 配置文件
├── README.md               # 项目主入口文档
└── LICENSE.md              # 开源协议文件

```

## 🔧 核心技术与构建流程

插件遵循最新的浏览器扩展标准 (Manifest V3)，并引入了构建流程和代码质量工具以提升开发效率、代码健壮性和最终性能。

### 1. Manifest V3

- **安全性与性能**: 采用 Manifest V3 标准，利用其在权限管理、后台处理（Service Worker 替代 Background Page）等方面的改进。

- **API 使用**: 严格按照 Manifest V3 的 API 要求进行开发。

### 2. 构建与打包 (Webpack)

- **模块化**: 推荐将 `src/content_script.js` 中的逻辑拆分为多个 ES6 模块，并通过 Webpack 进行打包。

- **代码优化**: Webpack 在生产模式下会使用 TerserPlugin 等工具对 JavaScript 代码进行压缩、混淆和死代码消除 (Tree Shaking)。

- **输出管理**: 构建产物（最终用于浏览器加载的插件文件）会输出到 `dist/` 目录。`manifest.json`, CSS 文件和图标等静态资源也会被复制到此目录。

- **开发效率**: 开发模式下 (`npm run dev`)，Webpack 可以启用 watch 模式，在文件更改时自动重新构建，提高开发效率。

### 3. 代码质量与规范

- **ESLint**: 用于 JavaScript 代码的静态分析，确保代码风格一致性并发现潜在错误。

- **Stylelint**: 用于 CSS 代码的静态分析，规范样式写法。

- **Prettier**: 用于自动化代码格式化，统一代码风格。

- **Git Hooks (Husky + lint-staged)**: (推荐) 在代码提交前自动运行 linters 和 formatters，确保提交到版本库的代码符合规范。

### 4. Service Worker (`src/service_worker.js`)

- **事件驱动**: 作为插件的后台服务工作者，不常驻内存，仅在需要时被激活。

- **核心职责**:

  - 监听 `chrome.action.onClicked` 事件。

  - 与内容脚本 (`content_script.js`) 进行双向通信。

  - 在必要时动态注入内容脚本。

  - 处理插件安装 (`chrome.runtime.onInstalled`) 事件。

- **通信优化**: 保持原有的 Promise 和异步逻辑，以及对标签页有效性的检查。

### 5. Content Script (`src/content_script.js` 及拆分模块)

这是插件的核心逻辑所在，直接在 X.com 页面上运行。

- **健壮的DOM交互层**:

  - `DOM_SELECTORS`: 集中管理 CSS 选择器 (建议从 `src/constants.js` 导入)。

  - `findElementAdvanced`: 高级的异步元素查找函数 (建议从 `src/utils/domUtils.js` 导入)。

- **动态内容加载处理**: 保持对页面关键区域加载完成的依赖，以及对 URL 变化和推文流的监听。

- **状态管理与持久化**:

  - 通过专门的模块 (例如 `SettingsManager.js`) 或在各个功能模块内部，统一管理插件状态（如面板打开/关闭、高级筛选条件、特别关注用户列表等）。

  - 状态会同步到 `chrome.storage.local` 进行持久化。

- **模块化设计**:

  - 原 `XSearchEnhancer` 类中的逻辑将逐步拆分到 `src/modules/` 下的多个独立模块中（如 `PanelUIManager.js`, `SpecialUsersManager.js`, `AdvancedFiltersManager.js`, `SearchOrchestrator.js` 等）。

  - 每个模块负责特定的功能领域，提高代码的可读性、可维护性和可测试性。

- **核心功能**:

  - 管理特别关注用户列表。

  - 构建搜索查询字符串。

  - 在搜索结果中添加徽章。

  - 面板 UI 的创建和交互。

### 6. Chrome Storage API (`chrome.storage.local`)

- **数据持久化**: 用于存储特别关注用户列表、插件设置等。

- **异步操作与错误处理**: 继续使用 `async/await` 并加入错误处理。

### 7. CSS 策略 (`content_styles.css`)

- **模块化与命名规范**: 推荐采用 BEM 命名规范，并为所有插件相关的类名添加统一前缀 (如 `xse-`)，以减少与宿主页面样式的冲突，并提高可维护性。

- **减少 `!important`**: 通过提高选择器的特异性（例如使用 BEM）来减少不必要的 `!important` 声明。

- **CSS 自定义属性 (Variables)**: 继续大量使用 CSS 变量。

- **CSS 压缩**: 构建过程中会对 CSS 文件进行压缩。

## 🎨 样式系统 (`content_styles.css`)

- 保持 Apple Design 风格、毛玻璃效果、流畅动画、深色/浅色模式自动适应、响应式布局和系统字体优先的原则。

- 滚动条美化等细节将继续保持。

此技术架构旨在通过引入现代化的开发工具和流程，以及持续的模块化重构，构建一个功能更强大、性能更稳定、更易于维护且用户体验更佳的浏览器扩展。
