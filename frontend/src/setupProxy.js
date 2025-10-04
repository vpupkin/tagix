const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  console.log('🔧 setupProxy.js: Backend URL configured as:', backendUrl);
  
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

  // Proxy WebSocket connections to backend
  app.use(
    '/ws',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      ws: true, // Enable WebSocket proxying
      logLevel: 'debug',
      onProxyReqWs: (proxyReq, req, socket, options, head) => {
        console.log('🔌 Proxying WebSocket request:', req.url, '->', backendUrl);
      }
    })
  );
};
