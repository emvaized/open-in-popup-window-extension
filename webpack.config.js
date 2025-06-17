const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ConcatPlugin = require('@mcler/webpack-concat-plugin');
const JsonMinimizerPlugin = require("json-minimizer-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  /// background script
  entry: {
    index: "./src/content.js"
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "[name].js"
  },
  plugins: [
    /// content scripts
    new ConcatPlugin({
      name: 'content',
      outputPath: './',
      fileName: '[name].js',
      filesToConcat: [
        "./src/configs.js",
        "./src/content.js",
      ]
    }),
    new ConcatPlugin({
      name: 'background',
      outputPath: './',
      fileName: '[name].js',
      filesToConcat: [
        "./src/configs.js",
        "./src/background.js",
      ]
    }),
    /// static files
    new CopyPlugin({
      patterns: [
        { from: "src/manifest.json", to: "manifest.json" },
        { from: "src/assets/_locales", to: "_locales" },
        // { from: "src/assets/icon.png", to: "icon.png" },
        // { from: "src/assets/icon_white.png", to: "icon_white.png" },
        { from: "src/assets/icon_new.png", to: "icon_new.png" },
        { from: "src/options", to: "options" },
        { from: "src/viewer", to: "viewer" },
        /// additional dependencies for the options page
        { from: "src/configs.js", to: "configs.js" },

      ],
    }),
  ],
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(), 
      new CssMinimizerPlugin(),
      new JsonMinimizerPlugin(),
    ],
  },
};