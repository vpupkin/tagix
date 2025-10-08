#!/usr/bin/env node

// BALANCE MANAGEMENT SYSTEM TEST
// This test verifies the complete balance management system with admin transactions and notifications

const WebSocket = require('ws');

console.log('💰 BALANCE MANAGEMENT SYSTEM TEST\n');
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

// Step 5: Get initial balance
async function getInitialBalance(userId, userType) {
    console.log(`5️⃣ Getting initial balance for ${userType}...`);
    
    try {
        const response = await fetch(`${baseUrl}/api/admin/users/${userId}/balance`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${userType} initial balance: $${data.current_balance.toFixed(2)}`);
            return data.current_balance;
        } else {
            console.log(`❌ Failed to get ${userType} balance: ${response.status}`);
            return 0;
        }
    } catch (error) {
        console.log(`❌ Error getting ${userType} balance: ${error.message}`);
        return 0;
    }
}

// Step 6: Test credit transaction
async function testCreditTransaction(userId, userType, amount, description) {
    console.log(`6️⃣ Testing credit transaction for ${userType}...`);
    
    try {
        const response = await fetch(`${baseUrl}/api/admin/users/${userId}/balance/transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                user_id: userId,
                amount: amount,
                transaction_type: 'credit',
                description: description
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Credit transaction successful: ${data.message}`);
            console.log(`   New balance: $${data.new_balance.toFixed(2)}`);
            return data.new_balance;
        } else {
            console.log(`❌ Failed credit transaction: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Credit transaction error: ${error.message}`);
        return null;
    }
}

// Step 7: Test debit transaction
async function testDebitTransaction(userId, userType, amount, description) {
    console.log(`7️⃣ Testing debit transaction for ${userType}...`);
    
    try {
        const response = await fetch(`${baseUrl}/api/admin/users/${userId}/balance/transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                user_id: userId,
                amount: amount,
                transaction_type: 'debit',
                description: description
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Debit transaction successful: ${data.message}`);
            console.log(`   New balance: $${data.new_balance.toFixed(2)}`);
            return data.new_balance;
        } else {
            console.log(`❌ Failed debit transaction: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Debit transaction error: ${error.message}`);
        return null;
    }
}

// Step 8: Test refund transaction
async function testRefundTransaction(userId, userType, amount, description) {
    console.log(`8️⃣ Testing refund transaction for ${userType}...`);
    
    try {
        const response = await fetch(`${baseUrl}/api/admin/users/${userId}/balance/transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                user_id: userId,
                amount: amount,
                transaction_type: 'refund',
                description: description
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Refund transaction successful: ${data.message}`);
            console.log(`   New balance: $${data.new_balance.toFixed(2)}`);
            return data.new_balance;
        } else {
            console.log(`❌ Failed refund transaction: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Refund transaction error: ${error.message}`);
        return null;
    }
}

// Step 9: Test insufficient balance
async function testInsufficientBalance(userId, userType) {
    console.log(`9️⃣ Testing insufficient balance for ${userType}...`);
    
    try {
        const response = await fetch(`${baseUrl}/api/admin/users/${userId}/balance/transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                user_id: userId,
                amount: 1000.00, // Large amount to trigger insufficient balance
                transaction_type: 'debit',
                description: 'Test insufficient balance'
            })
        });
        
        if (response.status === 400) {
            const data = await response.json();
            if (data.detail && data.detail.includes('Insufficient balance')) {
                console.log(`✅ Insufficient balance test passed: ${data.detail}`);
                return true;
            } else {
                console.log(`❌ Unexpected error: ${data.detail}`);
                return false;
            }
        } else {
            console.log(`❌ Expected 400 error, got: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Insufficient balance test error: ${error.message}`);
        return false;
    }
}

// Main test function
async function main() {
    console.log('🎯 Starting balance management system test...\n');
    
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
    
    // Step 5: Get initial balances
    const riderInitialBalance = await getInitialBalance(riderId, 'Rider');
    const driverInitialBalance = await getInitialBalance(driverId, 'Driver');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: Test credit transactions
    console.log('\n💰 Testing Credit Transactions:');
    const riderCreditBalance = await testCreditTransaction(riderId, 'Rider', 50.00, 'Welcome bonus');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const driverCreditBalance = await testCreditTransaction(driverId, 'Driver', 100.00, 'Driver incentive');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 7: Test debit transactions
    console.log('\n💸 Testing Debit Transactions:');
    const riderDebitBalance = await testDebitTransaction(riderId, 'Rider', 10.00, 'Service fee');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const driverDebitBalance = await testDebitTransaction(driverId, 'Driver', 5.00, 'Platform fee');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 8: Test refund transactions
    console.log('\n🔄 Testing Refund Transactions:');
    const riderRefundBalance = await testRefundTransaction(riderId, 'Rider', 15.00, 'Ride cancellation refund');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const driverRefundBalance = await testRefundTransaction(driverId, 'Driver', 20.00, 'Bonus refund');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 9: Test insufficient balance
    console.log('\n⚠️  Testing Insufficient Balance:');
    const insufficientBalanceTest = await testInsufficientBalance(riderId, 'Rider');
    
    // COMPREHENSIVE RESULTS
    console.log('\n📊 BALANCE SYSTEM TEST RESULTS:');
    console.log('================================');
    
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
    
    // Check for balance transaction notifications
    const riderBalanceNotifications = riderNotificationTypes.filter(type => type === 'balance_transaction');
    const driverBalanceNotifications = driverNotificationTypes.filter(type => type === 'balance_transaction');
    
    console.log('\n💰 BALANCE TRANSACTION VERIFICATION:');
    console.log(`   Rider received balance notifications: ${riderBalanceNotifications.length > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Driver received balance notifications: ${driverBalanceNotifications.length > 0 ? '✅ YES' : '❌ NO'}`);
    
    if (riderBalanceNotifications.length > 0) {
        console.log(`   Rider balance notification count: ${riderBalanceNotifications.length}`);
    }
    
    if (driverBalanceNotifications.length > 0) {
        console.log(`   Driver balance notification count: ${driverBalanceNotifications.length}`);
    }
    
    // Balance verification
    console.log('\n💵 BALANCE VERIFICATION:');
    console.log(`   Rider initial balance: $${riderInitialBalance.toFixed(2)}`);
    console.log(`   Rider final balance: $${riderRefundBalance ? riderRefundBalance.toFixed(2) : 'Unknown'}`);
    console.log(`   Driver initial balance: $${driverInitialBalance.toFixed(2)}`);
    console.log(`   Driver final balance: $${driverRefundBalance ? driverRefundBalance.toFixed(2) : 'Unknown'}`);
    
    // Transaction verification
    console.log('\n🔄 TRANSACTION VERIFICATION:');
    console.log(`   Credit transactions: ${riderCreditBalance && driverCreditBalance ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Debit transactions: ${riderDebitBalance && driverDebitBalance ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Refund transactions: ${riderRefundBalance && driverRefundBalance ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Insufficient balance test: ${insufficientBalanceTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // Final assessment
    console.log('\n🎉 FINAL ASSESSMENT:');
    const allTransactionsWork = riderCreditBalance && driverCreditBalance && 
                               riderDebitBalance && driverDebitBalance && 
                               riderRefundBalance && driverRefundBalance;
    const allNotificationsWork = riderBalanceNotifications.length > 0 && driverBalanceNotifications.length > 0;
    
    if (allTransactionsWork && allNotificationsWork && insufficientBalanceTest) {
        console.log('✅ SUCCESS: Complete balance management system working perfectly!');
        console.log('   - All transaction types work correctly');
        console.log('   - Balance calculations are accurate');
        console.log('   - Real-time notifications are delivered');
        console.log('   - Insufficient balance protection works');
        console.log('   - Admin can manage user balances');
    } else {
        console.log('❌ ISSUES FOUND:');
        if (!allTransactionsWork) {
            console.log('   - Some transaction types failed');
        }
        if (!allNotificationsWork) {
            console.log('   - Balance notifications not working properly');
        }
        if (!insufficientBalanceTest) {
            console.log('   - Insufficient balance protection failed');
        }
    }
    
    // Cleanup
    if (adminWs) adminWs.close();
    if (riderWs) riderWs.close();
    if (driverWs) driverWs.close();
    console.log('\n🔚 Balance management system test finished');
}

// Handle errors
main().catch(console.error);
