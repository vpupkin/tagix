// Load configuration from environment or config file
const path = require('path');

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
};

module.exports = {
  devServer: {
    // Ensure proper host configuration
    host: 'localhost',
    port: 3000,
    // Disable host check for development
    allowedHosts: 'all',
    // Override public path to avoid port conflicts
    public: 'localhost',
    // Disable live reload to prevent WebSocket issues
    liveReload: false,
    hot: false,
    // Force WebSocket to use localhost only - no port in URL
    client: {
      webSocketURL: {
        hostname: 'localhost',
        pathname: '/ws',
        port: 3000,
        protocol: 'ws',
      },
    },
    // Completely disable WebSocket for hot reload to avoid port conflicts
    webSocketServer: false,
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      
      // Always disable hot reload to prevent WebSocket conflicts
      // Remove hot reload related plugins
      webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
        return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
      });
      
      // Disable watch mode
      webpackConfig.watch = false;
      webpackConfig.watchOptions = {
        ignored: /.*/, // Ignore all files
      };
      
      return webpackConfig;
    },
  },
};