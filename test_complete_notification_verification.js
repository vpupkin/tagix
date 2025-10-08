#!/usr/bin/env node

// COMPLETE NOTIFICATION SYSTEM VERIFICATION
// This test verifies ALL aspects of the notification system

const WebSocket = require('ws');

console.log('🔔 COMPLETE NOTIFICATION SYSTEM VERIFICATION\n');
console.log('==========================================\n');

// Test configuration
const baseUrl = 'http://localhost:8001';
let riderToken = null;
let driverToken = null;
let adminToken = null;
let riderId = null;
let driverId = null;
let adminId = null;
let riderWs = null;
let driverWs = null;
let adminWs = null;
let riderNotifications = [];
let driverNotifications = [];
let adminNotifications = [];

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

// Step 3: Login as admin
async function loginAdmin() {
    console.log('3️⃣ Logging in as admin...');
    
    try {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@test.com',
                password: 'adminpass123'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            adminToken = data.access_token;
            adminId = data.user.id;
            console.log('✅ Admin login successful');
            console.log(`   Admin ID: ${adminId}`);
            console.log(`   Admin Role: ${data.user.role}`);
            return true;
        } else {
            console.log(`❌ Admin login failed: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Admin login error: ${error.message}`);
        return false;
    }
}

// Step 4: Connect all WebSockets
function connectWebSockets() {
    console.log('4️⃣ Connecting all WebSockets...');
    
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
        } catch (error) {
            console.log(`❌ Error parsing driver message: ${error.message}`);
        }
    });
    
    // Connect admin WebSocket
    if (adminId) {
        console.log(`   Connecting Admin WebSocket: ${adminId}`);
        adminWs = new WebSocket(`ws://localhost:8001/ws/${adminId}`);
        
        adminWs.on('open', function open() {
            console.log('✅ Admin WebSocket connected');
        });
        
        adminWs.on('message', function message(data) {
            try {
                const notification = JSON.parse(data);
                adminNotifications.push(notification);
                console.log(`📨 ADMIN received: ${notification.type}`);
            } catch (error) {
                console.log(`❌ Error parsing admin message: ${error.message}`);
            }
        });
    }
    
    const promises = [
        new Promise(resolve => riderWs.on('open', resolve)),
        new Promise(resolve => driverWs.on('open', resolve))
    ];
    
    if (adminWs) {
        promises.push(new Promise(resolve => adminWs.on('open', resolve)));
    }
    
    return Promise.all(promises);
}

// Step 5: Create ride request
async function createRideRequest() {
    console.log('5️⃣ Creating ride request...');
    
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

// Step 6: Accept ride as driver
async function acceptRide(requestId) {
    console.log('6️⃣ Accepting ride as driver...');
    
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

// Step 7: Driver arrives
async function driverArrives(matchId) {
    console.log('7️⃣ Driver arriving...');
    
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

// Step 8: Start ride
async function startRide(matchId) {
    console.log('8️⃣ Starting ride...');
    
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

// Step 9: Test admin notification capability
async function testAdminNotifications() {
    console.log('9️⃣ Testing admin notification capability...');
    
    // Check if admin can send notifications to users
    console.log('   Checking admin notification endpoints...');
    
    // Try to find admin notification endpoints
    const adminEndpoints = [
        '/api/admin/notifications/send',
        '/api/admin/notifications/broadcast',
        '/api/admin/send-notification',
        '/api/admin/notify-user'
    ];
    
    let adminCanSendNotifications = false;
    
    for (const endpoint of adminEndpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    user_id: riderId,
                    message: 'Test admin notification',
                    type: 'admin_message'
                })
            });
            
            if (response.status !== 404) {
                console.log(`   Found admin endpoint: ${endpoint} (${response.status})`);
                adminCanSendNotifications = true;
            }
        } catch (error) {
            // Endpoint doesn't exist, continue checking
        }
    }
    
    if (!adminCanSendNotifications) {
        console.log('   ❌ No admin notification endpoints found');
        console.log('   📝 RECOMMENDATION: Admin notification system needs to be implemented');
    } else {
        console.log('   ✅ Admin can send notifications');
    }
    
    return adminCanSendNotifications;
}

// Main test function
async function main() {
    console.log('🎯 Starting COMPLETE notification system verification...\n');
    
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
    
    // Step 3: Login as admin (optional)
    await loginAdmin(); // Don't fail if admin login fails
    
    // Step 4: Connect WebSockets
    await connectWebSockets();
    
    // Wait a moment for WebSockets to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Create ride request
    const requestId = await createRideRequest();
    if (!requestId) {
        console.log('❌ Cannot proceed without ride request');
        return;
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: Accept ride
    const matchId = await acceptRide(requestId);
    if (!matchId) {
        console.log('❌ Cannot proceed without ride acceptance');
        return;
    }
    
    // Wait for ride_accepted notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 7: Driver arrives
    await driverArrives(matchId);
    
    // Wait for driver_arrived notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 8: Start ride
    await startRide(matchId);
    
    // Wait for ride_started notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 9: Test admin notifications
    const adminCanSend = await testAdminNotifications();
    
    // COMPREHENSIVE RESULTS
    console.log('\n📊 COMPREHENSIVE TEST RESULTS:');
    console.log('================================');
    
    console.log(`📨 Rider notifications received: ${riderNotifications.length}`);
    console.log(`📨 Driver notifications received: ${driverNotifications.length}`);
    console.log(`📨 Admin notifications received: ${adminNotifications.length}`);
    
    // Check specific notification types
    const riderNotificationTypes = riderNotifications.map(n => n.type);
    const driverNotificationTypes = driverNotifications.map(n => n.type);
    const adminNotificationTypes = adminNotifications.map(n => n.type);
    
    console.log('\n🎯 Notification Type Analysis:');
    console.log(`Rider received: ${riderNotificationTypes.join(', ')}`);
    console.log(`Driver received: ${driverNotificationTypes.join(', ')}`);
    console.log(`Admin received: ${adminNotificationTypes.join(', ')}`);
    
    // Expected notifications for rider
    const expectedRiderNotifications = ['ride_accepted', 'driver_arrived', 'ride_started'];
    const missingRiderNotifications = expectedRiderNotifications.filter(type => !riderNotificationTypes.includes(type));
    const unexpectedDriverNotifications = driverNotificationTypes.filter(type => expectedRiderNotifications.includes(type));
    
    console.log('\n✅ RIDER NOTIFICATION VERIFICATION:');
    expectedRiderNotifications.forEach(type => {
        const received = riderNotificationTypes.includes(type);
        console.log(`   ${type}: ${received ? '✅ RECEIVED' : '❌ MISSING'}`);
    });
    
    console.log('\n🚫 DRIVER NOTIFICATION VERIFICATION:');
    console.log(`   Driver should NOT receive rider notifications: ${unexpectedDriverNotifications.length === 0 ? '✅ CORRECT' : '❌ WRONG'}`);
    
    console.log('\n👑 ADMIN NOTIFICATION VERIFICATION:');
    console.log(`   Admin can send notifications: ${adminCanSend ? '✅ YES' : '❌ NO - NEEDS IMPLEMENTATION'}`);
    
    // Final assessment
    console.log('\n🎉 FINAL ASSESSMENT:');
    if (missingRiderNotifications.length === 0 && unexpectedDriverNotifications.length === 0) {
        console.log('✅ SUCCESS: Core notification system working perfectly!');
        console.log('   - Riders receive all expected notifications');
        console.log('   - Drivers do not receive rider notifications');
        console.log('   - Role filtering works correctly');
    } else {
        console.log('❌ ISSUES FOUND:');
        if (missingRiderNotifications.length > 0) {
            console.log(`   - Missing rider notifications: ${missingRiderNotifications.join(', ')}`);
        }
        if (unexpectedDriverNotifications.length > 0) {
            console.log(`   - Driver received unexpected notifications: ${unexpectedDriverNotifications.join(', ')}`);
        }
    }
    
    if (!adminCanSend) {
        console.log('\n📝 RECOMMENDATION:');
        console.log('   - Implement admin notification system');
        console.log('   - Add endpoints for admin to send notifications to users');
        console.log('   - Consider broadcast notifications for system announcements');
    }
    
    // Cleanup
    if (riderWs) riderWs.close();
    if (driverWs) driverWs.close();
    if (adminWs) adminWs.close();
    console.log('\n🔚 Complete verification test finished');
}

// Handle errors
main().catch(console.error);
