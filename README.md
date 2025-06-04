# X 搜索增强浏览器插件 (X Search Enhancer)

[![版本](https://img.shields.io/badge/version-1.3.0-blue)](docs/CHANGELOG.md)
[![许可证](https://img.shields.io/badge/license-GPL--3.0-green)](LICENSE.md)
[![贡献指南](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING_GUIDE.md)

一个专为 X (Twitter) 设计的浏览器插件，旨在增强其搜索功能，并提供更便捷的特别关注用户管理和高级搜索筛选体验。

## ✨ 核心功能亮点

* **智能搜索面板**: 结合关键词、特别关注用户及多种高级筛选条件进行精确搜索。

* **特别关注用户管理**: 在用户主页一键添加/移除特别关注，并在面板中集中管理。

* **高级搜索筛选**: 支持按用户、今日内容、认证用户、媒体内容（图片、视频）、包含链接、排除回复、语言等多维度筛选推文，高级筛选条件的设置（包括面板的展开/收起状态）均会**自动保存并在下次打开时恢复**。

* **视觉识别**: 在搜索结果中高亮显示特别关注用户的推文（特别关注用户名旁会有 ⭐️ 作为标识）。

* **Apple Design 风格**: 简洁优雅的界面，支持深色模式和响应式布局。

## 🚀 快速上手

1.  **安装插件**:
    * **Chrome/Edge**: 下载源码 -> 打开扩展管理页面 (`chrome://extensions/` 或 `edge://extensions/`) -> 开启开发者模式 -> 加载已解压的扩展程序 -> 选择插件文件夹。

    * **Firefox**: 下载源码 -> 打开 `about:debugging` -> 临时载入附加组件 -> 选择 `manifest.json`。

    * 详细步骤请查阅 [安装指南](docs/INSTALLATION_GUIDE.md)。

2.  **基本使用**:
    * 在 X.com 页面点击浏览器工具栏的插件图标，打开搜索面板。

    * 访问用户主页，点击用户名旁的 ☆ 星标即可添加至特别关注。

    * 在面板中输入关键词，配置筛选条件，点击“开始搜索”。

    * 详细操作请参阅 [用户手册](docs/USAGE_GUIDE.md)。

## 📚 详细文档

为了更全面地了解 X 搜索增强插件，请查阅以下文档：

* **[✨ 功能特性详解](docs/FEATURES_DETAILED.md)** - 深入探索插件的每一项强大功能。

* **[🚀 安装指南](docs/INSTALLATION_GUIDE.md)** - 轻松在您的浏览器上完成安装。

* **[📖 用户手册](docs/USAGE_GUIDE.md)** - 学习如何高效使用插件的全部特性。

* **[🎨 自定义主题](docs/CUSTOMIZATION_GUIDE.md)** - 个性化您的插件外观。

* **[🏗️ 技术架构](docs/TECHNICAL_ARCHITECTURE.md)** - 了解插件背后的技术实现。

* **[🛡️ 权限说明与隐私](docs/PERMISSIONS_EXPLAINED.md)** - 我们如何处理您的数据和权限。

* **[❗ 故障排除与FAQ](docs/TROUBLESHOOTING.md)** - 快速找到常见问题的解决方案。

* **[🖼️ 图标制作指南](docs/ICONS_GUIDE.md)** - 了解插件图标的要求和建议。

* **[🔄 更新日志](docs/CHANGELOG.md)** - 查看所有版本迭代和更新内容。

* **[🤝 贡献指南](docs/CONTRIBUTING_GUIDE.md)** - 加入我们，一起让插件变得更好！

* **[📄 开源协议](LICENSE.md)** - 了解本项目的授权条款

## 🛠️ 主要技术栈

* JavaScript (ES6+)

* HTML5 & CSS3

* WebExtensions API (Manifest V3)

## 💬 反馈与支持

如果您在使用过程中遇到问题或有改进建议，欢迎：

* 提交 [Issue](../../issues)

* 发起 [Pull Request](../../pulls)

---

**感谢使用 X 搜索增强插件！** 🎉

如果这个插件对您有帮助，请考虑给项目点个 ⭐ Star！