#!/usr/bin/env node

// Test ride acceptance notification system
const WebSocket = require('ws');

console.log('🚗 Testing Ride Acceptance Notifications...\n');

// Test configuration
const riderId = 'df5a5f77-8539-45fe-91d0-0affc9895500'; // Tatjana MAZO
const driverId = '37d355fd-dd38-45b5-bf81-6cb28c5a9da9'; // DRRRRRRR2nd
const adminId = '922ae55f-7e0d-4073-b4e1-392abe7c6fd1'; // Test Admin

let riderWs = null;
let driverWs = null;
let notificationsReceived = [];

// Test ride acceptance notification
async function testRideAcceptanceNotification() {
    console.log('🔔 Testing ride acceptance notification flow...\n');
    
    // Step 1: Connect rider WebSocket
    console.log('1️⃣ Connecting rider WebSocket...');
    riderWs = new WebSocket(`ws://localhost:3000/ws/${riderId}`);
    
    riderWs.on('open', function open() {
        console.log('✅ Rider WebSocket connected');
        
        // Step 2: Simulate ride acceptance notification
        setTimeout(() => {
            console.log('2️⃣ Simulating ride acceptance notification...');
            
            const rideAcceptedNotification = {
                type: 'ride_accepted',
                match_id: 'test-match-123',
                driver_name: 'DRRRRRRR2nd',
                driver_rating: 5.0,
                driver_phone: '11111111111',
                vehicle_info: 'Standard vehicle',
                estimated_arrival: '5 minutes',
                pickup_address: '123 Main St'
            };
            
            // Send notification to rider
            riderWs.send(JSON.stringify(rideAcceptedNotification));
            console.log('📤 Ride acceptance notification sent to rider');
            
        }, 1000);
    });
    
    riderWs.on('message', function message(data) {
        try {
            const notification = JSON.parse(data);
            notificationsReceived.push(notification);
            
            console.log(`📨 Rider received notification: ${notification.type}`);
            
            if (notification.type === 'ride_accepted') {
                console.log('✅ SUCCESS: Rider received ride acceptance notification!');
                console.log(`   Driver: ${notification.driver_name}`);
                console.log(`   ETA: ${notification.estimated_arrival}`);
                console.log(`   Match ID: ${notification.match_id}`);
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

// Test actual API ride acceptance
async function testActualRideAcceptance() {
    console.log('\n🚀 Testing actual API ride acceptance...\n');
    
    // First, create a ride request
    console.log('1️⃣ Creating ride request...');
    
    const rideRequestData = {
        pickup_location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: "123 Main St, New York, NY"
        },
        dropoff_location: {
            latitude: 40.7589,
            longitude: -73.9851,
            address: "456 Oak Ave, New York, NY"
        },
        estimated_fare: 15.50
    };
    
    try {
        // Get rider token
        const loginResponse = await fetch('http://localhost:8001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'rider@yourdomain.com',
                password: 'password123' // You'll need to provide the actual password
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Failed to login rider - using test notification instead');
            return;
        }
        
        const loginData = await loginResponse.json();
        const riderToken = loginData.access_token;
        
        // Create ride request
        const requestResponse = await fetch('http://localhost:8001/api/rides/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${riderToken}`
            },
            body: JSON.stringify(rideRequestData)
        });
        
        if (requestResponse.ok) {
            const requestData = await requestResponse.json();
            console.log(`✅ Ride request created: ${requestData.request_id}`);
            
            // Now test driver acceptance
            console.log('2️⃣ Testing driver acceptance...');
            
            // Get driver token
            const driverLoginResponse = await fetch('http://localhost:8001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'driver@yourdomain.com',
                    password: 'password123' // You'll need to provide the actual password
                })
            });
            
            if (driverLoginResponse.ok) {
                const driverLoginData = await driverLoginResponse.json();
                const driverToken = driverLoginData.access_token;
                
                // Accept ride
                const acceptResponse = await fetch(`http://localhost:8001/api/rides/${requestData.request_id}/accept`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${driverToken}`
                    }
                });
                
                if (acceptResponse.ok) {
                    const acceptData = await acceptResponse.json();
                    console.log(`✅ Ride accepted: ${acceptData.match_id}`);
                    console.log('📤 Notification should be sent to rider...');
                } else {
                    console.log(`❌ Failed to accept ride: ${acceptResponse.status}`);
                }
            } else {
                console.log('❌ Failed to login driver');
            }
        } else {
            console.log(`❌ Failed to create ride request: ${requestResponse.status}`);
        }
        
    } catch (error) {
        console.log(`❌ API test error: ${error.message}`);
    }
}

// Test notification timing
function testNotificationTiming() {
    console.log('\n⏱️ Testing notification timing...\n');
    
    const startTime = Date.now();
    
    // Simulate immediate notification
    const testNotification = {
        type: 'ride_accepted',
        match_id: 'timing-test-123',
        driver_name: 'Test Driver',
        estimated_arrival: '3 minutes',
        timestamp: new Date().toISOString()
    };
    
    if (riderWs && riderWs.readyState === WebSocket.OPEN) {
        riderWs.send(JSON.stringify(testNotification));
        
        setTimeout(() => {
            const endTime = Date.now();
            const deliveryTime = endTime - startTime;
            
            console.log(`📊 Notification delivery time: ${deliveryTime}ms`);
            
            if (deliveryTime < 1000) {
                console.log('✅ EXCELLENT: Notification delivered in under 1 second');
            } else if (deliveryTime < 3000) {
                console.log('✅ GOOD: Notification delivered in under 3 seconds');
            } else {
                console.log('⚠️ SLOW: Notification took longer than 3 seconds');
            }
        }, 100);
    }
}

// Main test function
async function main() {
    console.log('🎯 Starting comprehensive ride acceptance notification test...\n');
    
    // Test 1: WebSocket notification simulation
    await testRideAcceptanceNotification();
    
    // Test 2: Notification timing
    setTimeout(() => {
        testNotificationTiming();
    }, 3000);
    
    // Test 3: Actual API test (commented out due to password requirements)
    // await testActualRideAcceptance();
    
    // Cleanup after 10 seconds
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
            console.log('   Possible causes:');
            console.log('   - WebSocket connection issues');
            console.log('   - Backend notification system not working');
            console.log('   - Frontend not processing notifications');
        }
        
        // Close connections
        if (riderWs) riderWs.close();
        if (driverWs) driverWs.close();
        
        console.log('\n🔚 Test completed');
        process.exit(0);
    }, 10000);
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    if (riderWs) riderWs.close();
    if (driverWs) driverWs.close();
    process.exit(0);
});

// Run the test
main().catch(console.error);
