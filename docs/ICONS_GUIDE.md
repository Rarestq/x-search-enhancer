# 🖼️ 图标制作指南

本指南说明了 X 搜索增强插件所需的图标文件规格、设计建议以及一些推荐资源，以帮助您创建或获取合适的图标。插件图标是用户在浏览器工具栏、扩展管理页面以及应用商店中识别插件的重要视觉元素。

## 图标尺寸要求

为了在不同场景下都能清晰显示，插件需要以下标准尺寸的 PNG 格式图标文件。请将这些文件统一放置在项目根目录下的 `icons/` 文件夹中：

- **`icon16.png`**: 16x16 像素

  - 用途: 主要用于浏览器工具栏（地址栏旁边）的图标显示。这是最常被用户看到的尺寸之一，需要高度清晰。

- **`icon32.png`**: 32x32 像素

  - 用途: 可能用于高 DPI 屏幕的工具栏显示，或在某些操作系统的任务栏、扩展管理列表等处。

- **`icon48.png`**: 48x48 像素

  - 用途: 主要用于浏览器的扩展管理页面（例如 `chrome://extensions/`）中插件列表的图标显示。

- **`icon128.png`**: 128x128 像素
  - 用途: 主要用于 Chrome 网上应用店 (Chrome Web Store) 或其他应用商店中插件详情页的展示图标。这是插件的“门面”，需要设计精良。

确保每个尺寸的图标都是精确的正方形，并且内容针对该尺寸进行了优化，以避免模糊或失真。

## 设计建议

一个好的插件图标应该简洁、易于识别，并能传达插件的核心功能或品牌形象。以下是一些设计建议：

- **主题相关性**:

  - **主色调**: 可以考虑使用 X (Twitter) 的品牌蓝色 (`#1D9BF0`) 作为主要或辅助颜色，以增强与目标平台的关联性。插件本身也采用了蓝色系作为强调色。

  - **核心元素**:

    - **搜索**: 包含放大镜 (🔍) 元素，直观表达插件的搜索功能。

    - **增强/星标**: 包含星星 (⭐) 或加号 (+) 等元素，暗示“增强”或“特别关注”的特性。

    - **X/Twitter 关联**: 可以巧妙地融入抽象的 "X" 字母或小鸟等与平台相关的图形元素，但需注意避免直接侵犯商标。

- **简洁清晰**:

  - 图标设计应尽量简洁，避免过多的细节，尤其是在小尺寸（如 16x16）下，过于复杂的图案会难以辨认。

  - 确保图标轮廓清晰，与背景有足够的对比度。

- **可识别性**:

  - 即使在最小的尺寸下，用户也应该能够大致识别出图标的形状或主要元素。

- **一致性**:

  - 不同尺寸的图标应保持视觉风格的一致性，但可以根据尺寸对细节进行适当调整（例如，128px 的图标可以比 16px 的图标包含更多细节）。

- **避免文字**:

  - 除非是品牌 Logo 的一部分，否则尽量避免在图标中使用文字，因为在小尺寸下文字会无法阅读。

- **现代感**:
  - 采用扁平化设计、Material Design 或 Fluent Design 等现代设计风格，使其与主流操作系统和浏览器界面协调。

## 临时解决方案 (如果暂时没有设计好的图标)

如果您在开发初期暂时没有时间设计或获取完美的图标，可以采取以下临时措施，以确保插件可以正常加载和测试：

1.  **创建 `icons/` 文件夹**: 在项目根目录下创建名为 `icons` 的文件夹。

2.  **使用占位图标**:

    - 使用任意简单的 PNG 图片文件（例如一个纯色方块或一个简单的符号），将其复制并重命名为上述要求的四个文件名 (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`)，并确保它们分别具有对应的像素尺寸。

    - 您可以使用在线图片缩放工具或任何图像编辑软件来调整图片尺寸。

3.  **下载免费通用图标**: 从下方推荐的图标资源网站搜索一些通用的放大镜或星星图标，调整尺寸后使用。

> **注意**: 没有图标文件或图标文件不符合 `manifest.json` 中的声明，可能会导致插件加载失败或在扩展管理页面显示错误。即使是临时的，也请确保文件存在且路径正确。

## 推荐图标资源

以下是一些可以找到免费或付费高质量图标的网站：

- **Iconify Design**: [https://iconify.design/](https://iconify.design/) - 集合了大量开源图标库，提供多种格式下载。

- **Feather Icons**: [https://feathericons.com/](https://feathericons.com/) - 一套简洁漂亮的开源图标。

- **Heroicons**: [https://heroicons.com/](https://heroicons.com/) - Tailwind CSS 团队出品的 SVG 图标集。

- **Tabler Icons**: [https://tabler-icons.io/](https://tabler-icons.io/) - 超过 4000 个免费的 MIT 许可图标。

- **Font Awesome**: [https://fontawesome.com/](https://fontawesome.com/) - 非常流行的图标库，有免费和付费版本。

- **Flaticon**: [https://www.flaticon.com/](https://www.flaticon.com/) - 大量矢量图标资源。

- **Noun Project**: [https://thenounproject.com/](https://thenounproject.com/) - 专注于符号和图标的社区。

在这些网站搜索时，可以尝试使用以下关键词：`search`, `magnifying glass`, `star`, `favorite`, `addon`, `extension`, `social media`, `twitter`, `X`。

## 图标制作工具

如果您打算自己设计图标，可以使用以下工具：

- **矢量图形编辑软件 (推荐)**:

  - **Figma**: [https://www.figma.com/](https://www.figma.com/) (免费，在线协作) - 非常适合 UI 设计和图标制作。

  - **Inkscape**: [https://inkscape.org/](https://inkscape.org/) (免费，开源，桌面应用)

  - **Adobe Illustrator**: (付费，专业级桌面应用)

- **像素图形编辑软件**:

  - **GIMP**: [https://www.gimp.org/](https://www.gimp.org/) (免费，开源，桌面应用)

  - **Photoshop**: (付费，专业级桌面应用)

  - **Paint.NET**: [https://www.getpaint.net/](https://www.getpaint.net/) (免费，Windows)

- **在线图标生成器/编辑器**:
  - **Canva**: [https://www.canva.com/](https://www.canva.com/) (提供免费模板和工具)
  - **RealFaviconGenerator.net**: [https://realfavicongenerator.net/](https://realfavicongenerator.net/) (虽然主要用于 Favicon，但也可以帮助生成多种尺寸的图片，并提供预览)

## 文件夹结构示例

确保您的图标文件按照 `manifest.json` 中的路径正确放置：

```
x-search-enhancer/
├── manifest.json
├── ... (其他插件文件) ...
├── icons/
│   ├── icon16.png    # 16x16 像素
│   ├── icon32.png    # 32x32 像素
│   ├── icon48.png    # 48x48 像素
│   └── icon128.png   # 128x128 像素
└── README.md
```

虽然没有图标文件不会完全阻止插件的核心功能运行（只要 `manifest.json` 中不强制要求），但它会严重影响用户界面的美观度和专业性，甚至可能导致在应用商店上架时遇到问题。因此，强烈建议为插件配备一套完整且设计良好的图标。
