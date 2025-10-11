#!/usr/bin/env node

// Debug notification system
const WebSocket = require('ws');

console.log('🔍 Debugging Notification System...\n');

// Test with actual user ID from database
const riderId = 'df5a5f77-8539-45fe-91d0-0affc9895500'; // Tatjana MAZO

console.log(`Testing with Rider ID: ${riderId}`);
console.log(`WebSocket URL: ws://localhost:8001/ws/${riderId}\n`);

const ws = new WebSocket(`ws://localhost:8001/ws/${riderId}`);

ws.on('open', function open() {
    console.log('✅ WebSocket connection established');
    
    // Send a simple test message first
    console.log('📤 Sending connection test message...');
    ws.send(JSON.stringify({
        type: 'connection_established',
        user_id: riderId,
        user_type: 'rider'
    }));
    
    // Wait a moment, then send ride acceptance notification
    setTimeout(() => {
        console.log('📤 Sending ride acceptance notification...');
        ws.send(JSON.stringify({
            type: 'ride_accepted',
            match_id: 'debug-test-123',
            driver_name: 'Test Driver',
            driver_rating: 5.0,
            estimated_arrival: '5 minutes',
            pickup_address: '123 Test St'
        }));
    }, 1000);
    
    // Send another test after a delay
    setTimeout(() => {
        console.log('📤 Sending proximity alert...');
        ws.send(JSON.stringify({
            type: 'proximity_alert',
            user_type: 'driver',
            distance_km: 0.5
        }));
    }, 2000);
});

ws.on('message', function message(data) {
    console.log('📨 Received message:');
    console.log(`   Raw data: ${data}`);
    
    try {
        const parsed = JSON.parse(data);
        console.log(`   Parsed: ${JSON.stringify(parsed, null, 2)}`);
    } catch (error) {
        console.log(`   Parse error: ${error.message}`);
    }
    console.log('');
});

ws.on('error', function error(err) {
    console.error(`❌ WebSocket error: ${err.message}`);
});

ws.on('close', function close(code, reason) {
    console.log(`🔌 Connection closed: ${code} - ${reason}`);
});

// Close after 5 seconds
setTimeout(() => {
    console.log('🔚 Closing connection...');
    ws.close();
    process.exit(0);
}, 5000);
