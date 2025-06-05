// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true, // 关键：为浏览器扩展环境添加全局变量，如 chrome
  },
  extends: [
    'airbnb-base', // 使用 Airbnb 的基础规则
  ],
  parserOptions: {
    ecmaVersion: 12, // 或者 'latest'
    sourceType: 'module', // 允许使用 import/export
  },
  plugins: ['import'],
  rules: {
    // 这里可以根据您的项目需求覆盖或添加规则
    'max-len': [
      'warn',
      {
        code: 120,
        ignorePattern: '^\\s*<svg.*</svg>\\s*$',
        ignoreComments: true,
        ignoreUrls: true,
        ignoreTemplateLiterals: true, // 通常会忽略所有模板字面量
        ignoreRegExpLiterals: true, // 通常会忽略所有正则表达式字面量
      },
    ],
    'no-console': 'warn', // 开发中允许 console.warn/error，生产中最好移除
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // 未使用的变量警告，忽略下划线开头的参数
    'import/prefer-default-export': 'off', // 关闭默认导出的偏好
    'class-methods-use-this': 'off', // 允许类方法不使用 this
    'no-underscore-dangle': 'off', // 允许使用下划线开头的标识符 (常用于私有约定)
    'no-param-reassign': ['warn', { props: false }], // 允许修改对象参数的属性，但不能直接重新赋值参数
    'consistent-return': 'off', // 允许函数在某些代码路径下不返回值
    'no-restricted-syntax': [
      // 允许 for...of 循环
      'error',
      {
        selector: 'ForInStatement',
        message:
          'for..in loops iterate over the entire prototype chain, ' +
          'which is virtually never what you want. Use Object.{keys,values,entries},' +
          'and iterate over the resulting array.',
      },
      // 移除或注释掉 'ForOfStatement' 的限制
      // {
      //   selector: 'ForOfStatement',
      //   message: 'iterators/generators require regenerator-runtime,
      //   which is too heavyweight for this guide to allow them.
      //   Separately, loops should be avoided in favor of array iterations.',
      // },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    // 浏览器扩展通常会在全局定义 chrome 或 browser 对象
    'no-undef': ['error', { typeof: true }], // 防止未定义的变量，但 typeof chrome 应该没问题
    // 如果在 content_script.js 中直接使用了 chrome API，并且上面 webextensions: true 不够，
    // 可以在 globals 中明确声明
    // "globals": {
    //   "chrome": "readonly"
    // }
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.husky/',
    // 添加否定模式来包含这些 dotfiles
    '!.prettierrc.js', // 确保根目录下的 .prettierrc.js 被检查
    '!.stylelintrc.js', // 确保根目录下的 .stylelintrc.js 被检查
    // 如果您还有其他 JS 类型的 dotfiles 需要检查，也用类似方式添加
    // 例如，如果您想 lint ESLint 配置文件本身 (如果是 .eslintrc.js):
    // "!.*.js", // 这是一个更通用的模式，会包含所有根目录下的 .js dotfiles
  ],
};
