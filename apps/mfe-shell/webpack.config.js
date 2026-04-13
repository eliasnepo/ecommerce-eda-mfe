const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { ModuleFederationPlugin } = webpack.container
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '.env') })

const catalogRemoteUrl =
  process.env.CATALOG_REMOTE_URL || 'http://localhost:3001/remoteEntry.js'
const cartRemoteUrl =
  process.env.CART_REMOTE_URL || 'http://localhost:3002/remoteEntry.js'
const cartStorageKey = process.env.CART_STORAGE_KEY || 'ecom.cart.v1'

module.exports = {
  entry: './src/index.tsx',
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
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        catalogMfe: `catalogMfe@${catalogRemoteUrl}`,
        cartMfe: `cartMfe@${cartRemoteUrl}`,
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
      __CART_STORAGE_KEY__: JSON.stringify(cartStorageKey),
    }),
  ],
  devServer: {
    port: 3000,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
}
