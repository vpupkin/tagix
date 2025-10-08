#!/usr/bin/env node

// ADMIN NOTIFICATION SYSTEM TEST
// This test verifies admin can send notifications to drivers and riders

const WebSocket = require('ws');

console.log('👑 ADMIN NOTIFICATION SYSTEM TEST\n');
console.log('==================================\n');

// Test configuration
const baseUrl = 'http://localhost:8001';
let adminToken = null;
let riderToken = null;
let driverToken = null;
let adminId = null;
let riderId = null;
let driverId = null;
let adminWs = null;
let riderWs = null;
let driverWs = null;
let adminNotifications = [];
let riderNotifications = [];
let driverNotifications = [];

// Step 1: Login as admin
async function loginAdmin() {
    console.log('1️⃣ Logging in as admin...');
    
    try {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testadmin@test.com',
                password: 'testpass123'
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

// Step 2: Login as rider
async function loginRider() {
    console.log('2️⃣ Logging in as rider...');
    
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

// Step 3: Login as driver
async function loginDriver() {
    console.log('3️⃣ Logging in as driver...');
    
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

// Step 4: Connect WebSockets
function connectWebSockets() {
    console.log('4️⃣ Connecting all WebSockets...');
    
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
    
    const promises = [
        new Promise(resolve => riderWs.on('open', resolve)),
        new Promise(resolve => driverWs.on('open', resolve))
    ];
    
    if (adminWs) {
        promises.push(new Promise(resolve => adminWs.on('open', resolve)));
    }
    
    return Promise.all(promises);
}

// Step 5: Create a ride for testing
async function createTestRide() {
    console.log('5️⃣ Creating test ride...');
    
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
            console.log(`✅ Test ride created: ${data.request_id}`);
            return data.request_id;
        } else {
            console.log(`❌ Failed to create test ride: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Test ride creation error: ${error.message}`);
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

// Step 7: Test admin sending notification to rider
async function testAdminNotifyRider(rideId) {
    console.log('7️⃣ Testing admin notification to rider...');
    
    try {
        const response = await fetch(`${baseUrl}/api/admin/rides/${rideId}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                message: "This is a test message from admin to rider",
                target: "rider"
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Admin notification to rider sent: ${data.message}`);
            return true;
        } else {
            console.log(`❌ Failed to send admin notification to rider: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Admin notification to rider error: ${error.message}`);
        return false;
    }
}

// Step 8: Test admin sending notification to driver
async function testAdminNotifyDriver(rideId) {
    console.log('8️⃣ Testing admin notification to driver...');
    
    try {
        const response = await fetch(`${baseUrl}/api/admin/rides/${rideId}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                message: "This is a test message from admin to driver",
                target: "driver"
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Admin notification to driver sent: ${data.message}`);
            return true;
        } else {
            console.log(`❌ Failed to send admin notification to driver: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Admin notification to driver error: ${error.message}`);
        return false;
    }
}

// Step 9: Test admin sending notification to both
async function testAdminNotifyBoth(rideId) {
    console.log('9️⃣ Testing admin notification to both...');
    
    try {
        const response = await fetch(`${baseUrl}/api/admin/rides/${rideId}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                message: "This is a test message from admin to both rider and driver",
                target: "both"
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Admin notification to both sent: ${data.message}`);
            return true;
        } else {
            console.log(`❌ Failed to send admin notification to both: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Admin notification to both error: ${error.message}`);
        return false;
    }
}

// Main test function
async function main() {
    console.log('🎯 Starting admin notification system test...\n');
    
    // Step 1: Login as admin
    if (!(await loginAdmin())) {
        console.log('❌ Cannot proceed without admin login');
        return;
    }
    
    // Step 2: Login as rider
    if (!(await loginRider())) {
        console.log('❌ Cannot proceed without rider login');
        return;
    }
    
    // Step 3: Login as driver
    if (!(await loginDriver())) {
        console.log('❌ Cannot proceed without driver login');
        return;
    }
    
    // Step 4: Connect WebSockets
    await connectWebSockets();
    
    // Wait a moment for WebSockets to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Create test ride
    const requestId = await createTestRide();
    if (!requestId) {
        console.log('❌ Cannot proceed without test ride');
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
    
    // Step 7: Test admin notification to rider
    await testAdminNotifyRider(matchId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 8: Test admin notification to driver
    await testAdminNotifyDriver(matchId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 9: Test admin notification to both
    await testAdminNotifyBoth(matchId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // COMPREHENSIVE RESULTS
    console.log('\n📊 ADMIN NOTIFICATION TEST RESULTS:');
    console.log('====================================');
    
    console.log(`📨 Admin notifications received: ${adminNotifications.length}`);
    console.log(`📨 Rider notifications received: ${riderNotifications.length}`);
    console.log(`📨 Driver notifications received: ${driverNotifications.length}`);
    
    // Check specific notification types
    const adminNotificationTypes = adminNotifications.map(n => n.type);
    const riderNotificationTypes = riderNotifications.map(n => n.type);
    const driverNotificationTypes = driverNotifications.map(n => n.type);
    
    console.log('\n🎯 Notification Type Analysis:');
    console.log(`Admin received: ${adminNotificationTypes.join(', ')}`);
    console.log(`Rider received: ${riderNotificationTypes.join(', ')}`);
    console.log(`Driver received: ${driverNotificationTypes.join(', ')}`);
    
    // Check for admin notifications
    const riderAdminNotifications = riderNotificationTypes.filter(type => type.includes('admin'));
    const driverAdminNotifications = driverNotificationTypes.filter(type => type.includes('admin'));
    
    console.log('\n👑 ADMIN NOTIFICATION VERIFICATION:');
    console.log(`   Rider received admin notifications: ${riderAdminNotifications.length > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Driver received admin notifications: ${driverAdminNotifications.length > 0 ? '✅ YES' : '❌ NO'}`);
    
    if (riderAdminNotifications.length > 0) {
        console.log(`   Rider admin notification types: ${riderAdminNotifications.join(', ')}`);
    }
    
    if (driverAdminNotifications.length > 0) {
        console.log(`   Driver admin notification types: ${driverAdminNotifications.join(', ')}`);
    }
    
    // Final assessment
    console.log('\n🎉 FINAL ASSESSMENT:');
    if (riderAdminNotifications.length > 0 && driverAdminNotifications.length > 0) {
        console.log('✅ SUCCESS: Admin notification system working perfectly!');
        console.log('   - Admin can send notifications to riders');
        console.log('   - Admin can send notifications to drivers');
        console.log('   - Admin can send notifications to both');
        console.log('   - Notifications are received via WebSocket');
    } else {
        console.log('❌ ISSUES FOUND:');
        if (riderAdminNotifications.length === 0) {
            console.log('   - Rider did not receive admin notifications');
        }
        if (driverAdminNotifications.length === 0) {
            console.log('   - Driver did not receive admin notifications');
        }
    }
    
    // Cleanup
    if (adminWs) adminWs.close();
    if (riderWs) riderWs.close();
    if (driverWs) driverWs.close();
    console.log('\n🔚 Admin notification test finished');
}

// Handle errors
main().catch(console.error);
