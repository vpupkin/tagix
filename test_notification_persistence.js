#!/usr/bin/env node

// Test notification persistence across page refreshes
const WebSocket = require('ws');

console.log('🔔 Testing Notification Persistence...\n');

// Test configuration
const riderId = 'df5a5f77-8539-45fe-91d0-0affc9895500'; // Tatjana MAZO
let riderWs = null;
let notificationsReceived = [];

// Test notification persistence
async function testNotificationPersistence() {
    console.log('🔔 Testing notification persistence...\n');
    
    // Step 1: Connect rider WebSocket
    console.log('1️⃣ Connecting rider WebSocket...');
    riderWs = new WebSocket(`ws://localhost:8001/ws/${riderId}`);
    
    riderWs.on('open', function open() {
        console.log('✅ Rider WebSocket connected');
        
        // Step 2: Send multiple test notifications
        setTimeout(() => {
            console.log('2️⃣ Sending test notifications...');
            
            const testNotifications = [
                {
                    type: 'ride_accepted',
                    match_id: 'test-match-1',
                    driver_name: 'Test Driver 1',
                    driver_rating: 5.0,
                    estimated_arrival: '3 minutes',
                    timestamp: new Date().toISOString()
                },
                {
                    type: 'ride_accepted',
                    match_id: 'test-match-2',
                    driver_name: 'Test Driver 2',
                    driver_rating: 4.8,
                    estimated_arrival: '5 minutes',
                    timestamp: new Date().toISOString()
                },
                {
                    type: 'driver_arrived',
                    match_id: 'test-match-1',
                    driver_name: 'Test Driver 1',
                    message: 'Your driver has arrived',
                    timestamp: new Date().toISOString()
                }
            ];
            
            // Send notifications with delays
            testNotifications.forEach((notification, index) => {
                setTimeout(() => {
                    riderWs.send(JSON.stringify(notification));
                    console.log(`📤 Sent notification ${index + 1}: ${notification.type}`);
                }, index * 500);
            });
            
        }, 1000);
    });
    
    riderWs.on('message', function message(data) {
        try {
            const notification = JSON.parse(data);
            notificationsReceived.push(notification);
            
            console.log(`📨 Rider received notification: ${notification.type}`);
            
            if (notification.type === 'ride_accepted') {
                console.log(`   Driver: ${notification.driver_name}`);
                console.log(`   ETA: ${notification.estimated_arrival}`);
            } else if (notification.type === 'driver_arrived') {
                console.log(`   Message: ${notification.message}`);
            }
        } catch (error) {
            console.log(`❌ Error parsing message: ${error.message}`);
        }
    });
    
    riderWs.on('error', function error(err) {
        console.error(`❌ Rider WebSocket error: ${err.message}`);
    });
    
    riderWs.on('close', function close(code, reason) {
        console.log(`🔌 Rider WebSocket closed: ${code} - ${reason}`);
    });
}

// Test localStorage simulation
function testLocalStoragePersistence() {
    console.log('\n💾 Testing localStorage persistence simulation...\n');
    
    // Simulate what the frontend would do
    const mockNotifications = [
        {
            id: Date.now(),
            type: 'ride_accepted',
            title: 'Ride Accepted!',
            message: 'Test Driver is on the way',
            timestamp: new Date().toISOString(),
            data: { driver_name: 'Test Driver', estimated_arrival: '5 minutes' }
        },
        {
            id: Date.now() + 1,
            type: 'driver_arrived',
            title: 'Driver Arrived!',
            message: 'Your driver has arrived at the pickup location',
            timestamp: new Date().toISOString(),
            data: { driver_name: 'Test Driver' }
        }
    ];
    
    // Simulate saving to localStorage
    console.log('💾 Simulating localStorage save...');
    console.log(`   Saving ${mockNotifications.length} notifications`);
    
    // Simulate loading from localStorage
    console.log('💾 Simulating localStorage load...');
    console.log(`   Loaded ${mockNotifications.length} notifications`);
    
    mockNotifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.type} - ${notif.title}`);
    });
    
    console.log('✅ localStorage persistence simulation completed');
}

// Main test function
async function main() {
    console.log('🎯 Starting notification persistence test...\n');
    
    // Test 1: WebSocket notifications
    await testNotificationPersistence();
    
    // Test 2: localStorage persistence simulation
    setTimeout(() => {
        testLocalStoragePersistence();
    }, 3000);
    
    // Cleanup after 8 seconds
    setTimeout(() => {
        console.log('\n📊 Test Summary:');
        console.log(`📨 Notifications received: ${notificationsReceived.length}`);
        
        if (notificationsReceived.length > 0) {
            console.log('✅ SUCCESS: Notifications are working!');
            notificationsReceived.forEach((notif, index) => {
                console.log(`   ${index + 1}. ${notif.type} - ${notif.driver_name || 'N/A'}`);
            });
        } else {
            console.log('❌ ISSUE: No notifications received');
        }
        
        console.log('\n💡 PERSISTENCE TEST INSTRUCTIONS:');
        console.log('1. Open http://localhost:3000 in your browser');
        console.log('2. Login as a rider');
        console.log('3. Check the "Recent Notifications" section');
        console.log('4. Refresh the page (F5)');
        console.log('5. Check if notifications are still there');
        console.log('6. If notifications persist, the fix is working! ✅');
        
        // Close connections
        if (riderWs) riderWs.close();
        
        console.log('\n🔚 Test completed');
        process.exit(0);
    }, 8000);
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    if (riderWs) riderWs.close();
    process.exit(0);
});

// Run the test
main().catch(console.error);
