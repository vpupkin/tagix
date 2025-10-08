#!/usr/bin/env node

// Test actual ride acceptance flow with real API calls
const WebSocket = require('ws');

console.log('🚗 Testing Actual Ride Acceptance Flow...\n');

// Test configuration
const baseUrl = 'http://localhost:8001';
let riderToken = null;
let driverToken = null;
let riderWs = null;
let notificationsReceived = [];

// Step 1: Login as rider
async function loginRider() {
    console.log('1️⃣ Logging in as rider...');
    
    try {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testrider@test.com',
                password: 'testpass123'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            riderToken = data.access_token;
            console.log('✅ Rider login successful');
            return true;
        } else {
            console.log(`❌ Rider login failed: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Rider login error: ${error.message}`);
        return false;
    }
}

// Step 2: Login as driver
async function loginDriver() {
    console.log('2️⃣ Logging in as driver...');
    
    try {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testdriver@test.com',
                password: 'testpass123'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            driverToken = data.access_token;
            console.log('✅ Driver login successful');
            return true;
        } else {
            console.log(`❌ Driver login failed: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Driver login error: ${error.message}`);
        return false;
    }
}

// Step 3: Connect rider WebSocket
function connectRiderWebSocket() {
    console.log('3️⃣ Connecting rider WebSocket...');
    
    const riderId = 'f736ed08-6ce4-4789-bfb4-4c57e4a74d85'; // Test Rider
    riderWs = new WebSocket(`ws://localhost:8001/ws/${riderId}`);
    
    riderWs.on('open', function open() {
        console.log('✅ Rider WebSocket connected');
    });
    
    riderWs.on('message', function message(data) {
        try {
            const notification = JSON.parse(data);
            notificationsReceived.push(notification);
            
            console.log(`📨 Rider received: ${notification.type}`);
            
            if (notification.type === 'ride_accepted') {
                console.log('🎉 SUCCESS: Rider received ride acceptance notification!');
                console.log(`   Driver: ${notification.driver_name}`);
                console.log(`   ETA: ${notification.estimated_arrival}`);
            }
        } catch (error) {
            console.log(`❌ Error parsing message: ${error.message}`);
        }
    });
    
    riderWs.on('error', function error(err) {
        console.error(`❌ Rider WebSocket error: ${err.message}`);
    });
    
    return new Promise((resolve) => {
        riderWs.on('open', resolve);
    });
}

// Step 4: Create ride request
async function createRideRequest() {
    console.log('4️⃣ Creating ride request...');
    
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
        const response = await fetch(`${baseUrl}/api/rides/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${riderToken}`
            },
            body: JSON.stringify(rideRequestData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Ride request created: ${data.request_id}`);
            return data.request_id;
        } else {
            console.log(`❌ Failed to create ride request: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Ride request error: ${error.message}`);
        return null;
    }
}

// Step 5: Accept ride as driver
async function acceptRide(requestId) {
    console.log('5️⃣ Accepting ride as driver...');
    
    try {
        const response = await fetch(`${baseUrl}/api/rides/${requestId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Ride accepted: ${data.match_id}`);
            console.log('📤 Notification should be sent to rider...');
            return data.match_id;
        } else {
            console.log(`❌ Failed to accept ride: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Accept ride error: ${error.message}`);
        return null;
    }
}

// Main test function
async function main() {
    console.log('🎯 Starting actual ride acceptance flow test...\n');
    
    // Step 1: Login as rider
    if (!(await loginRider())) {
        console.log('❌ Cannot proceed without rider login');
        return;
    }
    
    // Step 2: Login as driver
    if (!(await loginDriver())) {
        console.log('❌ Cannot proceed without driver login');
        return;
    }
    
    // Step 3: Connect rider WebSocket
    await connectRiderWebSocket();
    
    // Wait a moment for WebSocket to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Create ride request
    const requestId = await createRideRequest();
    if (!requestId) {
        console.log('❌ Cannot proceed without ride request');
        return;
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Accept ride
    const matchId = await acceptRide(requestId);
    if (!matchId) {
        console.log('❌ Cannot proceed without ride acceptance');
        return;
    }
    
    // Wait for notification
    console.log('\n⏳ Waiting for notification...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Results
    console.log('\n📊 Test Results:');
    console.log(`📨 Notifications received: ${notificationsReceived.length}`);
    
    if (notificationsReceived.length > 0) {
        console.log('✅ SUCCESS: Notifications are working!');
        notificationsReceived.forEach((notif, index) => {
            console.log(`   ${index + 1}. ${notif.type} - ${notif.driver_name || 'N/A'}`);
        });
    } else {
        console.log('❌ ISSUE: No notifications received');
        console.log('   This indicates a problem with the notification system');
    }
    
    // Cleanup
    if (riderWs) riderWs.close();
    console.log('\n🔚 Test completed');
}

// Handle errors
main().catch(console.error);
