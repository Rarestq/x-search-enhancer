# 图标文件说明

插件需要以下图标文件，请将它们放在 `icons/` 文件夹中：

## 图标尺寸要求

- `icon16.png` - 16x16 像素 (工具栏显示)
- `icon32.png` - 32x32 像素 (扩展管理页面)
- `icon48.png` - 48x48 像素 (扩展管理页面详情)
- `icon128.png` - 128x128 像素 (Chrome 网上应用店)

## 设计建议

推荐图标设计元素：
- 主色调：X (Twitter) 蓝色 `#1d9bf0`
- 包含搜索相关元素（放大镜）
- 包含星星或关注相关元素
- 简洁清晰，在小尺寸下仍能识别

## 临时解决方案

如果您暂时没有图标文件，可以：

1. 创建 `icons/` 文件夹
2. 使用任意 PNG 图片文件重命名为对应尺寸
3. 或者下载免费图标资源

## 推荐图标资源

- **Iconify**: https://iconify.design/
- **Feather Icons**: https://feathericons.com/
- **Heroicons**: https://heroicons.com/
- **Tabler Icons**: https://tabler-icons.io/

搜索关键词：`search`, `star`, `twitter`, `social media`

## 图标制作工具

- **在线工具**: Canva, Figma
- **桌面软件**: GIMP (免费), Photoshop
- **图标生成器**: RealFaviconGenerator.net (支持多尺寸生成)

## 文件夹结构示例

```
x-search-enhancer/
├── manifest.json
├── service_worker.js
├── content_script.js
├── content_styles.css
├── icons/
│   ├── icon16.png    ← 16x16 像素
│   ├── icon32.png    ← 32x32 像素
│   ├── icon48.png    ← 48x48 像素
│   └── icon128.png   ← 128x128 像素
└── README.md
```

没有图标文件不会影响插件的核心功能，但会影响用户界面的美观度。