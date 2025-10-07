const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Auto-detect backend URL based on environment
  let backendUrl;
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.NODE_ENV === undefined;
  
  if (isDevelopment) {
    // Check if we're running in Docker (containerized environment)
    const isDocker = process.env.REACT_APP_API_URL;
    if (isDocker) {
      backendUrl = process.env.REACT_APP_API_URL;
      console.log('🔧 setupProxy.js: Docker mode - Backend URL:', backendUrl);
    } else {
      backendUrl = 'http://localhost:8001';
      console.log('🔧 setupProxy.js: Local development mode - Backend URL:', backendUrl);
    }
  } else {
    backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://kar.bar/be';
    console.log('🔧 setupProxy.js: Production mode - Backend URL:', backendUrl);
  }
  
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
