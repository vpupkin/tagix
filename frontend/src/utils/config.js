/**
 * Unified configuration utility that auto-detects environment
 * and provides consistent URLs for both development and production
 */

// Auto-detect environment based on current origin
const getEnvironmentConfig = () => {
  const currentHostname = window.location.hostname;
  const currentPort = window.location.port;
  const currentOrigin = window.location.origin;
  
  console.log('🔍 Environment detection:', {
    hostname: currentHostname,
    port: currentPort,
    origin: currentOrigin
  });
  
  if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
    // Local development environment
    return {
      environment: 'development',
      apiUrl: 'http://localhost:8001',
      websocketUrl: `ws://${currentHostname}:${currentPort}`, // Via React dev server proxy
      isDevelopment: true,
      isProduction: false
    };
  } else if (currentHostname === 'kar.bar') {
    // Production environment
    return {
      environment: 'production',
      apiUrl: 'https://kar.bar/be',
      websocketUrl: 'wss://kar.bar/be', // Direct connection
      isDevelopment: false,
      isProduction: true
    };
  } else {
    // Fallback for other environments
    return {
      environment: 'unknown',
      apiUrl: process.env.REACT_APP_BACKEND_URL || currentOrigin,
      websocketUrl: currentOrigin.replace(/^http/, 'ws'),
      isDevelopment: false,
      isProduction: false
    };
  }
};

// Export the configuration
export const config = getEnvironmentConfig();

// Log the configuration
console.log('🔧 Application configuration:', config);

// Export individual values for convenience
export const {
  environment,
  apiUrl,
  websocketUrl,
  isDevelopment,
  isProduction
} = config;

// Export utility functions
export const getApiUrl = () => apiUrl;
export const getWebSocketUrl = () => websocketUrl;
export const isDev = () => isDevelopment;
export const isProd = () => isProduction;
