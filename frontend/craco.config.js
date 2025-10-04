const path = require('path');

module.exports = {
  devServer: {
    // Disable WebSocket for hot reload to prevent port 3000 conflicts
    webSocketServer: false,
    liveReload: false,
    hot: false,
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Remove hot reload plugins to prevent WebSocket conflicts
      webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
        return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
      });
      
      return webpackConfig;
    },
  },
};