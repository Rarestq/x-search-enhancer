# 🚀 安装指南

您可以按照以下步骤在主流的 Chromium 内核浏览器 (如 Google Chrome, Microsoft Edge) 和 Firefox 上安装 X 搜索增强插件。

## Chrome / Edge (推荐)

1.  **下载插件源码**:
    * **选项一 (ZIP 包)**: 如果项目提供了 `.zip` 格式的发行版或源码包，请下载并将其解压到您本地计算机上一个方便记忆的文件夹中（例如 `D:\Extensions\x-search-enhancer`）。

    * **选项二 (Git Clone)**: 如果您熟悉 Git，可以通过克隆项目的 Git 仓库来获取源码：
        ```bash
        git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git) x-search-enhancer
        ```
        (请将 `https://github.com/your-username/your-repo-name.git` 替换为实际的项目仓库地址。)
        然后进入 `x-search-enhancer` 目录。

2.  **打开浏览器扩展管理页面**:
    * **Google Chrome**: 在地址栏输入 `chrome://extensions/` 并按回车。

    * **Microsoft Edge**: 在地址栏输入 `edge://extensions/` 并按回车。

3.  **开启“开发者模式”**:
    * 在打开的扩展管理页面中，通常在页面的右上角会有一个“开发者模式”(Developer mode) 的开关。请确保此开关已打开。

4.  **加载已解压的扩展程序**:
    * 开启开发者模式后，页面上会出现一些新的按钮，例如“加载已解压的扩展程序”(Load unpacked) 或类似的文字。

    * 点击此按钮。

5.  **选择插件文件夹**:
    * 在弹出的文件选择对话框中，浏览并选择您在第 1 步中解压或克隆的插件源码文件夹 (确保选择的是包含 `manifest.json` 文件的那个根文件夹，例如 `x-search-enhancer`)。

    * 点击“选择文件夹”或“确定”。

6.  **安装完成**:
    * 如果一切顺利，X 搜索增强插件的图标应该会出现在浏览器的工具栏（通常在地址栏旁边）。插件卡片也会显示在扩展管理页面中。

    * 您可能需要点击浏览器工具栏上的拼图图标（扩展程序按钮）并将 X 搜索增强插件固定到工具栏，以便快速访问。

## Firefox

通过 Firefox 的 `about:debugging` 页面安装的扩展是临时的，这意味着每次关闭并重新打开 Firefox 后，您可能需要重新加载该扩展。对于开发和测试来说，这通常是可接受的。

1.  **下载插件源码**:
    * 与 Chrome/Edge 的步骤类似，下载并解压 `.zip` 包，或者通过 `git clone` 获取源码到本地文件夹。

2.  **打开 Firefox 调试页面**:
    * 在 Firefox 地址栏输入 `about:debugging` 并按回车。

3.  **选择“此 Firefox” (This Firefox)**:
    * 在打开的调试页面左侧导航栏中，确保选中了“此 Firefox”或类似选项。

4.  **临时载入附加组件**:
    * 在页面内容区域，找到并点击“临时载入附加组件…”(Load Temporary Add-on…) 按钮。

5.  **选择 `manifest.json` 文件**:
    * 在弹出的文件选择对话框中，浏览到您在第 1 步中准备好的插件源码文件夹，然后选择该文件夹内的 `manifest.json` 文件。

    * 点击“打开”。

6.  **安装完成**:
    * 插件图标应该会出现在 Firefox 工具栏中，并且插件会列在 `about:debugging` 页面的“临时扩展”部分。

> **关于 Firefox 永久安装的说明**:
> 要在 Firefox 中永久安装一个本地开发的扩展（使其在浏览器重启后依然存在），通常需要将插件打包成 `.xpi` 文件，并通过 Mozilla 的附加组件开发者中心进行签名（即使是自签名或非公开发布）。对于个人使用，临时加载通常更为便捷。

## 安装后的检查

* 确保插件图标出现在浏览器工具栏。

* 访问 `https://x.com/` 或 `https://twitter.com/`，尝试点击插件图标，看是否能正常打开搜索面板。

* 检查浏览器扩展管理页面，确保插件没有显示任何错误信息。

如果遇到问题，请参考 [故障排除指南](TROUBLESHOOTING.md)。