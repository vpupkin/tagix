const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Get backend URL from environment and remove port for unified structure
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  const backendUrlNoPort = backendUrl.replace(/:\d+/, '');
  console.log('🔧 setupProxy.js: Backend URL configured as:', backendUrl);
  console.log('🔧 setupProxy.js: Backend URL (no port) for WebSocket:', backendUrlNoPort);
  
  // Proxy API requests to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying API request:', req.method, req.url, '->', backendUrl);
      }
    })
  );

  // Proxy WebSocket connections to backend (using URL without port)
  app.use(
    '/ws',
    createProxyMiddleware({
      target: backendUrlNoPort,
      changeOrigin: true,
      secure: false,
      ws: true, // Enable WebSocket proxying
      logLevel: 'debug',
      onProxyReqWs: (proxyReq, req, socket, options, head) => {
        console.log('🔌 Proxying WebSocket request:', req.url, '->', backendUrlNoPort);
      }
    })
  );
};
