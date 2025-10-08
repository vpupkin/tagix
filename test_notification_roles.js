#!/usr/bin/env node

// Test to verify notifications go to the correct user (rider, not driver)
const WebSocket = require('ws');

console.log('🔔 Testing Notification Role Assignment...\n');

// Test configuration
const baseUrl = 'http://localhost:8001';
let riderToken = null;
let driverToken = null;
let riderId = null;
let driverId = null;
let riderWs = null;
let driverWs = null;
let riderNotifications = [];
let driverNotifications = [];

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
            riderId = data.user.id;
            console.log('✅ Rider login successful');
            console.log(`   Rider ID: ${riderId}`);
            console.log(`   Rider Role: ${data.user.role}`);
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
            driverId = data.user.id;
            console.log('✅ Driver login successful');
            console.log(`   Driver ID: ${driverId}`);
            console.log(`   Driver Role: ${data.user.role}`);
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

// Step 3: Connect both WebSockets
function connectWebSockets() {
    console.log('3️⃣ Connecting WebSockets...');
    
    // Connect rider WebSocket
    console.log(`   Connecting Rider WebSocket: ${riderId}`);
    riderWs = new WebSocket(`ws://localhost:8001/ws/${riderId}`);
    
    riderWs.on('open', function open() {
        console.log('✅ Rider WebSocket connected');
    });
    
    riderWs.on('message', function message(data) {
        try {
            const notification = JSON.parse(data);
            riderNotifications.push(notification);
            console.log(`📨 RIDER received: ${notification.type}`);
            if (notification.type === 'ride_accepted') {
                console.log(`   ✅ CORRECT: Rider got ride_accepted notification`);
            }
        } catch (error) {
            console.log(`❌ Error parsing rider message: ${error.message}`);
        }
    });
    
    // Connect driver WebSocket
    console.log(`   Connecting Driver WebSocket: ${driverId}`);
    driverWs = new WebSocket(`ws://localhost:8001/ws/${driverId}`);
    
    driverWs.on('open', function open() {
        console.log('✅ Driver WebSocket connected');
    });
    
    driverWs.on('message', function message(data) {
        try {
            const notification = JSON.parse(data);
            driverNotifications.push(notification);
            console.log(`📨 DRIVER received: ${notification.type}`);
            if (notification.type === 'ride_accepted') {
                console.log(`   ❌ WRONG: Driver should NOT get ride_accepted notification`);
            }
        } catch (error) {
            console.log(`❌ Error parsing driver message: ${error.message}`);
        }
    });
    
    return Promise.all([
        new Promise(resolve => riderWs.on('open', resolve)),
        new Promise(resolve => driverWs.on('open', resolve))
    ]);
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
            console.log('📤 Notification should be sent to RIDER only...');
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
    console.log('🎯 Starting notification role assignment test...\n');
    
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
    
    // Step 3: Connect WebSockets
    await connectWebSockets();
    
    // Wait a moment for WebSockets to be ready
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
    
    // Wait for notifications
    console.log('\n⏳ Waiting for notifications...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Results
    console.log('\n📊 Test Results:');
    console.log(`📨 Rider notifications received: ${riderNotifications.length}`);
    console.log(`📨 Driver notifications received: ${driverNotifications.length}`);
    
    // Check if notifications went to the right user
    const riderGotRideAccepted = riderNotifications.some(n => n.type === 'ride_accepted');
    const driverGotRideAccepted = driverNotifications.some(n => n.type === 'ride_accepted');
    
    console.log('\n🎯 Role Assignment Check:');
    console.log(`✅ Rider got ride_accepted: ${riderGotRideAccepted ? 'YES' : 'NO'}`);
    console.log(`❌ Driver got ride_accepted: ${driverGotRideAccepted ? 'YES (WRONG!)' : 'NO (CORRECT)'}`);
    
    if (riderGotRideAccepted && !driverGotRideAccepted) {
        console.log('\n🎉 SUCCESS: Notifications are going to the correct user (RIDER)!');
    } else if (!riderGotRideAccepted && driverGotRideAccepted) {
        console.log('\n❌ FAILURE: Notifications are going to the wrong user (DRIVER)!');
    } else if (!riderGotRideAccepted && !driverGotRideAccepted) {
        console.log('\n⚠️  ISSUE: No ride_accepted notifications received by anyone');
    } else {
        console.log('\n⚠️  ISSUE: Both rider and driver received ride_accepted notifications');
    }
    
    // Cleanup
    if (riderWs) riderWs.close();
    if (driverWs) driverWs.close();
    console.log('\n🔚 Test completed');
}

// Handle errors
main().catch(console.error);
