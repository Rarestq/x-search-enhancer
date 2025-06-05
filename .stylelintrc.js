// .stylelintrc.js
module.exports = {
  extends: [
    'stylelint-config-standard', // 使用 Stylelint 的标准规则集
  ],
  rules: {
    // 这里可以根据您的项目需求覆盖或添加规则
    // 例如：
    'at-rule-no-unknown': [
      // 允许 CSS 变量等
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen', 'layer'],
      },
    ],
    // 'declaration-block-trailing-semicolon': 'always', // 声明块末尾始终需要分号
    'no-descending-specificity': null, // 允许特异性较低的选择器在特异性较高的选择器之后
    'font-family-no-missing-generic-family-keyword': null, // 允许字体族名不总是包含通用族关键字
    'selector-id-pattern': null, // 对 ID 选择器的命名模式不做限制 (插件中可能会用到特定 ID)
    'selector-class-pattern': [
      // BEM 风格的类名，或者简单的前缀风格
      // 允许 xse- 开头的小写字母、数字、中划线组成的类名
      // 也允许纯小写字母、数字、中划线 (用于通用类)
      '^(xse-)?([a-z][a-z0-9]*)(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)' +
        '?(--[a-z0-9]+(-[a-z0-9]+)*)?$|^([a-z][a-z0-9]*)(-[a-z0-9]+)*$',
      {
        message:
          'Expected class selector to be BEM-like (e.g., xse-block__element--modifier) or kebab-case (e.g., my-class)',
      },
    ],
    'property-no-vendor-prefix': null, // 允许使用浏览器厂商前缀 (插件可能需要兼容旧浏览器)
    'value-no-vendor-prefix': null, // 允许值使用浏览器厂商前缀
    // 插件样式中 !important 可能难以避免
    'declaration-no-important': null,
  },
};
