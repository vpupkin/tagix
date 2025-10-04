const path = require('path');

module.exports = {
  devServer: {
    host: 'localhost',
    port: 3000,
    allowedHosts: 'all',
    liveReload: false,
    hot: false,
    webSocketServer: false,
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Remove hot reload plugins
      webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
        return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
      });
      
      return webpackConfig;
    },
  },
};