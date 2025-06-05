# 🤝 贡献指南

非常感谢您对 X 搜索增强插件感兴趣并考虑为其做出贡献！我们欢迎任何形式的帮助，无论是报告 Bug、提出功能建议、改进文档，还是直接提交代码。

## 🛠️ 开发环境设置

在开始之前，请确保您已安装并配置好以下工具：

- **Node.js**: 最新稳定版 (LTS) 的 Node.js。您可以从 [nodejs.org](https://nodejs.org/) 下载。npm 通常会随 Node.js 一同安装。

- **Git**: 用于版本控制。您可以从 [git-scm.com](https://git-scm.com/) 下载。

- **现代浏览器**: 最新稳定版的 Google Chrome, Microsoft Edge, 或 Mozilla Firefox (用于测试)。

- **代码编辑器**: 例如 VS Code (推荐), Sublime Text, Atom 等。

### 初始步骤

1.  **Fork 项目** (如果您计划通过 Pull Request 贡献代码):

    - 访问项目在代码托管平台（如 GitHub）上的主仓库。

    - 点击 "Fork" 按钮，将项目复制到您自己的账户下。

2.  **Clone 您的 Fork (或主仓库)**:

    ```bash
    git clone [您Fork的仓库地址 或 主仓库地址] x-search-enhancer
    cd x-search-enhancer
    ```

3.  **安装依赖**:
    在项目根目录下运行以下命令来安装所有开发所需的依赖包：
    ```bash
    npm install
    ```

### 开发脚本

项目 `package.json` 文件中定义了一些有用的 npm 脚本：

- **构建插件 (生产模式)**: 将源代码打包到 `dist/` 目录，用于最终发布。

  ```bash
  npm run build
  ```

- **构建插件 (开发模式)**: 启动 Webpack 的 watch 模式，当源代码文件发生变化时会自动重新构建。

  ```bash
  npm run dev
  ```

- **代码格式化**: 使用 Prettier 自动格式化项目中的 JS, CSS, MD, JSON 文件。

  ```bash
  npm run format
  ```

- **代码检查与自动修复**: 使用 ESLint (针对 JavaScript) 和 Stylelint (针对 CSS) 检查代码规范并尝试自动修复问题。
  ```bash
  npm run lint
  # 或者分别运行:
  # npm run lint:js
  # npm run lint:css
  ```

在进行代码更改后，建议运行格式化和代码检查脚本，以确保代码风格一致并符合项目规范。如果配置了 Git Hooks (Husky + lint-staged)，这些检查会在提交前自动执行。

### 加载开发中的插件

1.  运行 `npm run dev` (或 `npm run build` 如果您不需要自动重新构建)。

2.  在您的浏览器中加载已解压的扩展程序时，**选择项目根目录下的 `dist/` 文件夹**。

3.  详细加载步骤请参考 [安装指南](INSTALLATION_GUIDE.md)。

## 💡 如何贡献

### 1. 报告 Bug (Reporting Bugs)

如果您在使用插件时发现了 Bug：

1.  **检查现有 Issue**: 在提交新的 Bug 报告之前，请先搜索项目仓库的 [Issues](../../../issues)，确认该 Bug 是否已被报告。

2.  **提供详细信息**: 如果 Bug 尚未被报告，请创建一个新的 Issue。在报告中，请尽可能提供以下信息：

    - 清晰且描述性的标题。

    - 重现 Bug 的详细步骤。

    - 期望的结果和实际发生的结果。

    - 您的浏览器名称和版本。

    - X 搜索增强插件的版本 (通常在 `manifest.json` 或扩展管理页面查看)。

    - 相关的截图或录屏（如果适用）。

    - 浏览器开发者工具控制台中显示的任何错误信息。

### 2. 提出功能建议 (Suggesting Enhancements)

如果您对插件有新的功能想法或改进建议：

1.  **检查现有 Issue/讨论**: 同样，先搜索项目的 [Issues](../../../issues) 或相关讨论区，看看是否已有人提出过类似的想法。

2.  **清晰描述**: 创建一个新的 Issue 来描述您的建议。请说明：

    - 您希望实现的功能是什么。

    - 为什么这个功能对用户有价值。

    - （可选）您对如何实现这个功能有什么初步想法。

### 3. 改进文档 (Improving Documentation)

好的文档对用户和开发者都至关重要。如果您发现文档中有错误、不清晰的地方，或者认为某些部分需要补充：

- 您可以直接修改相关的 `.md` 文件并发起 [Pull Request](../../../pulls)。

- 或者，创建一个 Issue 来指出文档中需要改进的地方。

### 4. 提交代码 (Contributing Code)

如果您希望直接贡献代码来修复 Bug 或实现新功能，请遵循以下步骤：

1.  **确保您的开发环境已按上述设置完毕** (Node.js, npm install 等)。

2.  **Clone 您的 Fork** (如果您还没有这样做)。

3.  **创建新分支 (Create a New Branch)**:

    - 为您的修改创建一个新的特性分支或修复分支。分支名称应具有描述性，例如：
      ```bash
      git checkout -b feature/add-sorting-to-user-list
      # 或者
      git checkout -b fix/panel-display-issue-on-narrow-screens
      ```
    - 请勿直接在 `main` 分支上进行修改。

4.  **进行代码更改 (Make Your Changes)**:

    - 在您的新分支上进行代码编写、修改。

    - 确保您的代码遵循项目中配置的 ESLint 和 Stylelint 规则 (运行 `npm run lint` 检查)。

    - 使用 `npm run format` 格式化您的代码。

    - 为新增或修改的重要逻辑添加必要的注释。

    - 建议将源代码放在 `src/` 目录下（如果尚未这样做）。

5.  **测试您的更改 (Test Your Changes)**:

    - 运行 `npm run dev` (或 `npm run build`) 来构建您的更改。

    - 在您常用的浏览器中加载 `dist/` 目录作为已解压的扩展程序，并彻底测试您的更改，确保它们按预期工作且没有引入新的问题。

    - 测试不同的使用场景和边界条件。

6.  **提交更改 (Commit Your Changes)**:

    - 使用清晰且具有描述性的提交信息来提交您的更改。建议遵循 [Conventional Commits 规范](https://www.conventionalcommits.org/)。
      ```bash
      git add .
      git commit -m "feat: Add sorting functionality to special users list"
      # 如果配置了 Husky 和 lint-staged，代码检查和格式化会自动在此时运行
      ```

7.  **将更改推送到您的 Fork (Push to Your Fork)**:

    ```bash
    git push origin feature/add-sorting-to-user-list
    ```

8.  **创建 Pull Request (PR)**:

    - 回到您在 GitHub 上的 Fork 仓库页面。

    - 您应该会看到一个提示，建议您根据最近推送的分支创建一个 [Pull Request](../../../pulls)。点击该提示，或者手动导航到 "Pull requests" 标签页并点击 "New pull request"。

    - 确保基准分支 (Base branch) 是原始项目的主分支 (通常是 `main`)，对比分支 (Compare branch) 是您刚刚推送的特性/修复分支。

    - 填写 Pull Request 的标题和描述。在描述中，请清楚地说明您所做的更改、解决的问题或实现的功能，以及任何相关的 Issue 编号 (例如 "Closes #123")。

    - 提交 Pull Request。

9.  **代码审查与合并 (Code Review and Merge)**:

    - 项目维护者会审查您的 Pull Request。他们可能会提出问题、要求修改或直接批准。

    - 请及时回应审查意见并进行必要的调整。

    - 一旦您的 PR 被批准，维护者会将其合并到主项目中。

## 📝 代码规范 (Coding Style)

- **JavaScript**:

  - 请遵循项目中通过 `.eslintrc.js` 配置的 ESLint 规则。

  - 使用 Prettier (`.prettierrc.js`) 进行代码格式化。

  - 编写清晰、可读性强的代码，并为复杂逻辑添加注释。

  - 优先使用 `const` 和 `let`，避免使用 `var`。

  - 多用异步编程 (`async/await`, `Promises`) 处理耗时操作。

- **CSS**:

  - 遵循项目中通过 `.stylelintrc.js` 配置的 Stylelint 规则。

  - 使用 Prettier (`.prettierrc.js`) 进行代码格式化。

  - 优先使用 CSS 自定义属性（变量）。

  - 推荐采用 BEM 命名约定或项目已有的模块化 CSS 思想。

- **HTML (动态生成)**:
  - 确保动态生成的 HTML 结构清晰、语义化，并考虑无障碍性 (ARIA属性等)。
- **注释**:
  - 为函数、复杂逻辑块和不明显的代码段添加 JSDoc 风格或其他清晰的注释。

## 【TBD】行为准则 (Code of Conduct)

请注意，本项目可能遵循特定的行为准则 (Code of Conduct)。请确保您的所有贡献和互动都保持尊重和建设性。 (如果项目有 `CODE_OF_CONDUCT.md` 文件，请在此处链接)。

---

再次感谢您的贡献！我们期待与您一起让 X 搜索增强插件变得更好。
