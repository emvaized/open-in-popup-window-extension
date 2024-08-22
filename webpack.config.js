const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ConcatPlugin = require('@mcler/webpack-concat-plugin');
const JsonMinimizerPlugin = require("json-minimizer-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  /// background script
  entry: {
    content: "./content.js"
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "[name].js"
  },
  plugins: [
    /// content scripts
    new ConcatPlugin({
      name: 'background',
      outputPath: './',
      fileName: '[name].js',
      filesToConcat: [
        "./configs.js",
        "./background.js",
      ]
    }),
    /// static files
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "_locales", to: "_locales" },
        { from: "icon.png", to: "icon.png" },
        { from: "options", to: "options" },
        { from: "viewer", to: "viewer" },
        /// additional dependencies for the options page
        { from: "configs.js", to: "configs.js" },

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