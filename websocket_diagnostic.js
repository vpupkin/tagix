#!/usr/bin/env node

const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE WEBSOCKET DIAGNOSTIC TOOL\n');
console.log('=' .repeat(60));

// Configuration points to check
const configPoints = [
  {
    name: 'Frontend Environment (.env.local)',
    path: './frontend/.env.local',
    check: () => {
      try {
        const envContent = fs.readFileSync('./frontend/.env.local', 'utf8');
        const backendUrl = envContent.match(/REACT_APP_BACKEND_URL=(.+)/);
        return {
          exists: true,
          content: envContent,
          backendUrl: backendUrl ? backendUrl[1] : 'NOT_FOUND'
        };
      } catch (error) {
        return { exists: false, error: error.message };
      }
    }
  },
  {
    name: 'Backend Environment (.env.local)',
    path: './backend/.env.local',
    check: () => {
      try {
        const envContent = fs.readFileSync('./backend/.env.local', 'utf8');
        const corsOrigins = envContent.match(/CORS_ORIGINS=(.+)/);
        return {
          exists: true,
          content: envContent,
          corsOrigins: corsOrigins ? corsOrigins[1] : 'NOT_FOUND'
        };
      } catch (error) {
        return { exists: false, error: error.message };
      }
    }
  }
];

// Test functions
async function testHTTPSConnection(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'GET' }, (res) => {
      resolve({
        success: true,
        status: res.statusCode,
        headers: res.headers
      });
    });
    
    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

async function testWebSocketConnection(url) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        resolve({
          success: false,
          error: 'Connection timeout'
        });
      }
    }, 10000);
    
    ws.on('open', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        ws.close();
        resolve({
          success: true,
          message: 'WebSocket connection established'
        });
      }
    });
    
    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          success: false,
          error: err.message
        });
      }
    });
    
    ws.on('close', (code, reason) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          success: false,
          error: `Connection closed: ${code} - ${reason}`
        });
      }
    });
  });
}

// Main diagnostic function
async function runDiagnostic() {
  console.log('📋 CHECKING CONFIGURATION FILES:\n');
  
  // Check configuration files
  for (const config of configPoints) {
    console.log(`🔍 ${config.name}:`);
    const result = config.check();
    
    if (result.exists) {
      console.log(`   ✅ File exists`);
      if (result.backendUrl) {
        console.log(`   📍 Backend URL: ${result.backendUrl}`);
      }
      if (result.corsOrigins) {
        console.log(`   🌐 CORS Origins: ${result.corsOrigins}`);
      }
    } else {
      console.log(`   ❌ File missing: ${result.error}`);
    }
    console.log('');
  }
  
  console.log('🌐 TESTING NETWORK CONNECTIONS:\n');
  
  // Test HTTPS API endpoint
  console.log('🔍 Testing HTTPS API endpoint...');
  const apiResult = await testHTTPSConnection('https://kar.bar/be/api/auth/me');
  if (apiResult.success) {
    console.log(`   ✅ API accessible: ${apiResult.status}`);
  } else {
    console.log(`   ❌ API failed: ${apiResult.error}`);
  }
  
  // Test WebSocket endpoint
  console.log('\n🔍 Testing WebSocket endpoint...');
  const wsResult = await testWebSocketConnection('wss://kar.bar/be/ws/test-user-id');
  if (wsResult.success) {
    console.log(`   ✅ WebSocket accessible: ${wsResult.message}`);
  } else {
    console.log(`   ❌ WebSocket failed: ${wsResult.error}`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY:\n');
  
  // Generate recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  
  if (!apiResult.success) {
    console.log('❌ API Connection Issues:');
    console.log('   1. Check if backend server is running');
    console.log('   2. Verify Apache2/Nginx proxy configuration');
    console.log('   3. Check SSL certificates');
    console.log('   4. Verify firewall rules\n');
  }
  
  if (!wsResult.success) {
    console.log('❌ WebSocket Connection Issues:');
    console.log('   1. Check Apache2 WebSocket proxy configuration');
    console.log('   2. Verify backend WebSocket endpoint is enabled');
    console.log('   3. Check if WebSocket module is loaded in Apache2');
    console.log('   4. Verify SSL certificates support WebSocket upgrades\n');
  }
  
  console.log('🔧 QUICK FIXES TO TRY:\n');
  console.log('   1. Restart Apache2: sudo systemctl restart apache2');
  console.log('   2. Check Apache2 modules: sudo a2enmod proxy_wstunnel');
  console.log('   3. Verify backend is running: ps aux | grep uvicorn');
  console.log('   4. Check Apache2 error logs: sudo tail -f /var/log/apache2/error.log');
  console.log('   5. Test direct backend: curl -I http://localhost:8001/ws/test');
}

// Run the diagnostic
runDiagnostic().catch(console.error);
