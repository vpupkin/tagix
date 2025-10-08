#!/usr/bin/env node

// Test all notification types to verify they work correctly
const WebSocket = require('ws');

console.log('🔔 Testing All Notification Types...\n');

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

// Step 3: Connect WebSockets
function connectWebSockets() {
    console.log('3️⃣ Connecting WebSockets...');
    
    // Connect rider WebSocket
    riderWs = new WebSocket(`ws://localhost:8001/ws/${riderId}`);
    
    riderWs.on('open', function open() {
        console.log('✅ Rider WebSocket connected');
    });
    
    riderWs.on('message', function message(data) {
        try {
            const notification = JSON.parse(data);
            riderNotifications.push(notification);
            console.log(`📨 RIDER received: ${notification.type}`);
        } catch (error) {
            console.log(`❌ Error parsing rider message: ${error.message}`);
        }
    });
    
    // Connect driver WebSocket
    driverWs = new WebSocket(`ws://localhost:8001/ws/${driverId}`);
    
    driverWs.on('open', function open() {
        console.log('✅ Driver WebSocket connected');
    });
    
    driverWs.on('message', function message(data) {
        try {
            const notification = JSON.parse(data);
            driverNotifications.push(notification);
            console.log(`📨 DRIVER received: ${notification.type}`);
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

// Step 6: Driver arrives
async function driverArrives(matchId) {
    console.log('6️⃣ Driver arriving...');
    
    try {
        const response = await fetch(`${baseUrl}/api/rides/${matchId}/arrived`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Driver arrived: ${data.message}`);
            return true;
        } else {
            console.log(`❌ Failed to mark arrival: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Driver arrival error: ${error.message}`);
        return false;
    }
}

// Step 7: Start ride
async function startRide(matchId) {
    console.log('7️⃣ Starting ride...');
    
    try {
        const response = await fetch(`${baseUrl}/api/rides/${matchId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Ride started: ${data.message}`);
            return true;
        } else {
            console.log(`❌ Failed to start ride: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Start ride error: ${error.message}`);
        return false;
    }
}

// Main test function
async function main() {
    console.log('🎯 Starting comprehensive notification test...\n');
    
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
    
    // Wait for ride_accepted notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Driver arrives
    await driverArrives(matchId);
    
    // Wait for driver_arrived notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 7: Start ride
    await startRide(matchId);
    
    // Wait for ride_started notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Results
    console.log('\n📊 Test Results:');
    console.log(`📨 Rider notifications received: ${riderNotifications.length}`);
    console.log(`📨 Driver notifications received: ${driverNotifications.length}`);
    
    // Check specific notification types
    const riderNotificationTypes = riderNotifications.map(n => n.type);
    const driverNotificationTypes = driverNotifications.map(n => n.type);
    
    console.log('\n🎯 Notification Type Analysis:');
    console.log(`Rider received: ${riderNotificationTypes.join(', ')}`);
    console.log(`Driver received: ${driverNotificationTypes.join(', ')}`);
    
    // Expected notifications for rider
    const expectedRiderNotifications = ['ride_accepted', 'driver_arrived', 'ride_started'];
    const missingRiderNotifications = expectedRiderNotifications.filter(type => !riderNotificationTypes.includes(type));
    const unexpectedDriverNotifications = driverNotificationTypes.filter(type => expectedRiderNotifications.includes(type));
    
    console.log('\n✅ Expected Rider Notifications:');
    expectedRiderNotifications.forEach(type => {
        const received = riderNotificationTypes.includes(type);
        console.log(`   ${type}: ${received ? '✅ RECEIVED' : '❌ MISSING'}`);
    });
    
    if (missingRiderNotifications.length === 0) {
        console.log('\n🎉 SUCCESS: All expected notifications received by rider!');
    } else {
        console.log(`\n❌ MISSING: Rider did not receive: ${missingRiderNotifications.join(', ')}`);
    }
    
    if (unexpectedDriverNotifications.length === 0) {
        console.log('✅ SUCCESS: Driver did not receive rider notifications!');
    } else {
        console.log(`❌ WRONG: Driver received rider notifications: ${unexpectedDriverNotifications.join(', ')}`);
    }
    
    // Cleanup
    if (riderWs) riderWs.close();
    if (driverWs) driverWs.close();
    console.log('\n🔚 Test completed');
}

// Handle errors
main().catch(console.error);
