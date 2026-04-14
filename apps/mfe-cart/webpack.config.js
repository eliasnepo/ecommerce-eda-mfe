const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { ModuleFederationPlugin } = webpack.container
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '.env') })

const orderApiMode = process.env.ORDER_API_MODE || 'mock'
const orderApiUrl = process.env.ORDER_API_URL || 'http://localhost:8080/api/orders'
const orderUserId = process.env.ORDER_USER_ID || '1'

module.exports = {
  entry: './src/main.tsx',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'cartMfe',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.0.0' },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new webpack.DefinePlugin({
      __ORDER_API_MODE__: JSON.stringify(orderApiMode),
      __ORDER_API_URL__: JSON.stringify(orderApiUrl),
      __ORDER_USER_ID__: JSON.stringify(orderUserId),
    }),
  ],
  devServer: {
    port: 3002,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
}
