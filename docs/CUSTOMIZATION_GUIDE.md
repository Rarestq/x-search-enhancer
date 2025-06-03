# 🎨 自定义主题 (通过CSS变量)

X 搜索增强插件的视觉主题（如颜色、圆角、字体、间距等）主要通过 CSS 自定义属性（也称为 CSS 变量）在核心样式文件 `content_styles.css` 中进行定义。这使得有一定 CSS 基础的用户可以相对容易地调整插件的外观，以符合个人偏好。

## 如何找到和修改 CSS 变量

1.  **定位 `content_styles.css` 文件**:
    * 如果您是通过加载已解压的扩展程序方式安装的插件，您可以在插件的源码文件夹中找到 `content_styles.css` 文件。

2.  **找到 `:root` 选择器**:
    * 打开 `content_styles.css` 文件。在文件的顶部（或接近顶部的位置），您会找到一个 `:root` CSS 伪类选择器。CSS 变量通常在这里全局定义。

    * 同时，在 `@media (prefers-color-scheme: dark)` 媒体查询块内部的 `:root` 中，定义了深色模式下的变量覆盖值。

    ```css
    /* content_styles.css - Apple Design 风格样式 */

    /* 基础字体和变量 */
    :root {
        --primary-blue: #007AFF;
        --secondary-purple: #5856D6;
        --text-primary: #1D1D1F;
        --text-secondary: #8E8E93;
        --background-primary: rgba(255, 255, 255, 0.95); /* 面板主背景 */
        --background-secondary: rgba(118, 118, 128, 0.08); /* 输入框等次级背景 */
        --background-tertiary: rgba(118, 118, 128, 0.06); /* 用户列表等三级背景 */
        --border-color: rgba(118, 118, 128, 0.08);
        --shadow-light: 0 8px 20px rgba(0, 0, 0, 0.04);
        --shadow-medium: 0 16px 40px rgba(0, 0, 0, 0.08);
        --shadow-heavy: 0 24px 60px rgba(0, 0, 0, 0.12);
        --radius-small: 8px;
        --radius-medium: 12px;
        --radius-large: 16px;
        --radius-xl: 20px;
        --transition-fast: 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        --transition-medium: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        --transition-slow: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      
    /* 深色模式支持 */
    @media (prefers-color-scheme: dark) {
      :root {
        --text-primary: #F2F2F7;
        --text-secondary: #8E8E93;
        --background-primary: rgba(28, 28, 30, 0.95);
        --background-secondary: rgba(118, 118, 128, 0.24);
        --background-tertiary: rgba(118, 118, 128, 0.18);
        --border-color: rgba(118, 118, 128, 0.24);
        --shadow-light: 0 8px 20px rgba(0, 0, 0, 0.3);
        --shadow-medium: 0 16px 40px rgba(0, 0, 0, 0.4);
        --shadow-heavy: 0 24px 60px rgba(0, 0, 0, 0.5);
      }
    }
    ```

3.  **修改变量值**:
    * 您可以直接修改这些变量的值。例如，如果您想改变插件的主色调蓝色：
        ```css
        :root {
            --primary-blue: #FF5733; /* 将蓝色改为橙色 */
            /* ... 其他变量保持不变 ... */
        }
        ```

    * 同样，您也可以修改深色模式下的颜色值。

4.  **保存并重新加载插件**:
    * 修改完 `content_styles.css` 文件后，保存更改。

    * 回到浏览器的扩展管理页面 (`chrome://extensions/` 或 `edge://extensions/`)。

    * 找到 X 搜索增强插件，点击其卡片上的“重新加载”按钮（通常是一个圆形箭头图标）。

    * 如果您是在 Firefox 中通过 `about:debugging` 临时加载的，您可能需要移除再重新加载该附加组件，或者它可能会自动检测到更改。

5.  **查看效果**:
    * 刷新 X.com 页面，打开插件面板，查看您的自定义样式是否已生效。

## 可供自定义的主要 CSS 变量示例

以下是一些您可能会感兴趣并进行修改的关键 CSS 变量（具体变量名和用途请以 `content_styles.css` 文件为准）：

### 颜色 (Colors)

* `--primary-blue`: 主要的强调色，用于按钮、链接、焦点状态等。

* `--secondary-purple`: 次要强调色，可能用于渐变或特定元素。

* `--text-primary`: 主要文本颜色。

* `--text-secondary`: 次要文本颜色，用于辅助信息或占位符。

* `--background-primary`: 插件面板的主要背景色，支持毛玻璃效果的透明度。

* `--background-secondary`: 输入框、列表项悬停等元素的背景色。

* `--background-tertiary`: 用户列表容器、高级筛选区域等元素的背景色。

* `--border-color`: 边框颜色。

### 圆角 (Border Radius)

* `--radius-small`: 小尺寸圆角，用于按钮、徽章、复选框等。

* `--radius-medium`: 中等尺寸圆角，用于输入框、面板内的容器等。

* `--radius-large`: 大尺寸圆角，用于用户列表容器等。

* `--radius-xl`: 超大尺寸圆角，通常用于插件面板本身。

### 阴影 (Shadows)

* `--shadow-light`, `--shadow-medium`, `--shadow-heavy`: 不同强度的阴影效果，用于提升元素的层级感和立体感。

### 过渡与动画 (Transitions & Animations)

* `--transition-fast`, `--transition-medium`, `--transition-slow`: 定义不同速度的 CSS 过渡效果（基于 `cubic-bezier`），影响交互的平滑度和响应感。

### 字体 (Typography)

插件默认使用 `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif` 这一系列系统UI字体，以保证在不同平台上的原生观感和最佳可读性。

如果您想强制使用特定字体，可以尝试修改 `content_styles.css` 中 `#x-search-enhancer-panel` 的 `font-family` 属性，或者在 `:root` 中定义字体相关的变量（如果插件后续版本支持）。

```css
/* 示例：在面板中使用特定字体 (不一定在插件中直接提供此变量) */
/*
:root {
    --panel-font-family: "Your Preferred Font", sans-serif;
}

#x-search-enhancer-panel {
    font-family: var(--panel-font-family) !important;
}
*/