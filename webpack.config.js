// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    // mode: isProduction ? 'production' : 'development', // 通过命令行参数传递
    entry: {
      content_script: './src/content_script.js', // 插件的内容脚本
      service_worker: './src/service_worker.js', // 插件的 Service Worker
    },
    output: {
      path: path.resolve(__dirname, 'dist'), // 打包后的文件输出目录
      filename: '[name].js', // 输出文件名，[name] 会被替换为 entry 中的 key
      clean: true, // 在生成文件之前清理 /dist 文件夹
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader', // 如果需要 Babel 转译 ES6+ 语法 (可选)
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
      ],
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction, // 生产环境移除 console.log
            },
            format: {
              comments: false, // 移除所有注释
            },
          },
          extractComments: false, // 不提取注释到单独文件
        }),
      ],
    },
    plugins: [
      // 添加插件配置
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' }, // 直接复制 manifest
          { from: 'content_styles.css', to: 'content_styles.css' }, // 复制 CSS
          { from: 'icons', to: 'icons' }, // 复制 icons 文件夹
          // 如果 manifest.json 中的路径需要根据构建环境修改，
          // 可以使用 transform 函数来修改其内容。
          // 例如:
          // {
          //   from: 'manifest.json',
          //   to: 'manifest.json',
          //   transform(content, absoluteFrom) {
          //     const manifest = JSON.parse(content.toString());
          //     // 假设源码 manifest 指向 src/js, 构建后指向 js/
          //     // manifest.content_scripts[0].js = ['js/content_script.js'];
          //     // manifest.background.service_worker = 'js/service_worker.js';
          //     return Buffer.from(JSON.stringify(manifest, null, 2));
          //   },
          // },
        ],
      }),
    ],
    devtool: isProduction ? false : 'cheap-module-source-map', // 开发环境生成 source map
    // 浏览器插件通常不需要复杂的 devServer
    performance: {
      hints: isProduction ? 'warning' : false, // 生产环境对过大文件给出警告
    },
    // 如果您的 content_script.js 或 service_worker.js 中使用了 import/export，
    // Webpack 会自动处理模块化。
    // 如果没有使用 Babel，确保您的目标浏览器支持您代码中使用的 JS 语法。
    // 对于现代浏览器扩展，通常可以直接编写 ES6+ 代码。
  };
};
