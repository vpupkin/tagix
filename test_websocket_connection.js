#!/usr/bin/env node

// Test WebSocket connection to kar.bar
const WebSocket = require('ws');

console.log('🔍 Testing WebSocket connection to kar.bar...\n');

const testUserId = '78f12260-1486-4463-95fc-5bb6d26fdb3a';
const wsUrl = `wss://kar.bar/be/ws/${testUserId}`;

console.log(`Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ WebSocket connection established successfully!');
  
  // Send a test message
  const testMessage = {
    type: 'connection_established',
    user_id: testUserId,
    user_type: 'rider'
  };
  
  ws.send(JSON.stringify(testMessage));
  console.log('📤 Sent test message:', testMessage);
  
  // Close connection after 5 seconds
  setTimeout(() => {
    console.log('🔌 Closing connection...');
    ws.close(1000, 'Test completed');
  }, 5000);
});

ws.on('message', function message(data) {
  console.log('📥 Received message:', data.toString());
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  process.exit(0);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Connection timeout');
  ws.close();
  process.exit(1);
}, 10000);
