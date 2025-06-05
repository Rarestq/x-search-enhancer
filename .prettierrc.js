// .prettierrc.js
module.exports = {
  printWidth: 120, // 每行最大字符数
  tabWidth: 2, // tab 宽度
  useTabs: false, // 不使用 tab，使用空格
  semi: true, // 句末需要分号
  singleQuote: true, // 使用单引号
  quoteProps: 'as-needed', // 对象属性的引号按需添加
  jsxSingleQuote: false, // JSX 中不使用单引号
  trailingComma: 'es5', // ES5 中有效的尾随逗号 (对象、数组等)
  bracketSpacing: true, // 对象大括号内两边是否加空格 { foo: bar }
  bracketSameLine: false, // JSX > 标签是否和属性同行
  arrowParens: 'always', // 箭头函数参数始终需要括号 (x) => x
  endOfLine: 'lf', // 换行符使用 LF
};
