#!/usr/bin/env node

// Test script to verify kar.bar connection configuration
const https = require('https');

console.log('🔍 Testing kar.bar connection configuration...\n');

// Test API endpoint
function testAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'kar.bar',
      port: 443,
      path: '/be/api/auth/me',
      method: 'GET',
      headers: {
        'User-Agent': 'kar.bar-test-script'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`✅ API Endpoint (${options.path}): ${res.statusCode} ${res.statusMessage}`);
      resolve(res.statusCode);
    });

    req.on('error', (err) => {
      console.log(`❌ API Endpoint (${options.path}): ${err.message}`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ API Endpoint (${options.path}): Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test WebSocket endpoint
function testWebSocket() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'kar.bar',
      port: 443,
      path: '/be/ws/test',
      method: 'GET',
      headers: {
        'User-Agent': 'kar.bar-test-script',
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`✅ WebSocket Endpoint (${options.path}): ${res.statusCode} ${res.statusMessage}`);
      resolve(res.statusCode);
    });

    req.on('error', (err) => {
      console.log(`❌ WebSocket Endpoint (${options.path}): ${err.message}`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ WebSocket Endpoint (${options.path}): Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test direct port access
function testDirectPort() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'kar.bar',
      port: 8001,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'User-Agent': 'kar.bar-test-script'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`✅ Direct Port (${options.port}${options.path}): ${res.statusCode} ${res.statusMessage}`);
      resolve(res.statusCode);
    });

    req.on('error', (err) => {
      console.log(`❌ Direct Port (${options.port}${options.path}): ${err.message}`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ Direct Port (${options.port}${options.path}): Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing different connection methods:\n');
  
  try {
    await testAPI();
  } catch (err) {
    // Expected for some tests
  }
  
  try {
    await testWebSocket();
  } catch (err) {
    // Expected for some tests
  }
  
  try {
    await testDirectPort();
  } catch (err) {
    // Expected for some tests
  }
  
  console.log('\n📋 Summary:');
  console.log('- API calls should work through https://kar.bar/be');
  console.log('- WebSocket connections may need proxy configuration');
  console.log('- Direct port access is likely blocked by firewall/proxy');
  console.log('\n🔧 Next steps:');
  console.log('1. Restart your frontend and backend services');
  console.log('2. Check browser console for updated connection attempts');
  console.log('3. Configure reverse proxy for WebSocket support if needed');
}

runTests().catch(console.error);
