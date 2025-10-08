#!/usr/bin/env node

// USER BALANCE DISPLAY TEST
// This test verifies that users can see their balance in their dashboards

console.log('💰 USER BALANCE DISPLAY TEST\n');
console.log('============================\n');

// Test configuration
const baseUrl = 'http://localhost:8001';

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
            console.log('✅ Rider login successful');
            console.log(`   Rider ID: ${data.user.id}`);
            return data.access_token;
        } else {
            console.log(`❌ Rider login failed: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Rider login error: ${error.message}`);
        return null;
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
            console.log('✅ Driver login successful');
            console.log(`   Driver ID: ${data.user.id}`);
            return data.access_token;
        } else {
            console.log(`❌ Driver login failed: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Driver login error: ${error.message}`);
        return null;
    }
}

// Step 3: Test rider balance endpoint
async function testRiderBalance(riderToken) {
    console.log('3️⃣ Testing rider balance endpoint...');
    
    try {
        const response = await fetch(`${baseUrl}/api/user/balance`, {
            headers: {
                'Authorization': `Bearer ${riderToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Rider balance endpoint working');
            console.log(`   Current balance: $${data.current_balance.toFixed(2)}`);
            console.log(`   Recent transactions: ${data.recent_transactions.length}`);
            return data;
        } else {
            console.log(`❌ Rider balance endpoint failed: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Rider balance endpoint error: ${error.message}`);
        return null;
    }
}

// Step 4: Test driver balance endpoint
async function testDriverBalance(driverToken) {
    console.log('4️⃣ Testing driver balance endpoint...');
    
    try {
        const response = await fetch(`${baseUrl}/api/user/balance`, {
            headers: {
                'Authorization': `Bearer ${driverToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Driver balance endpoint working');
            console.log(`   Current balance: $${data.current_balance.toFixed(2)}`);
            console.log(`   Recent transactions: ${data.recent_transactions.length}`);
            return data;
        } else {
            console.log(`❌ Driver balance endpoint failed: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Driver balance endpoint error: ${error.message}`);
        return null;
    }
}

// Step 5: Test balance endpoint with invalid token
async function testInvalidToken() {
    console.log('5️⃣ Testing balance endpoint with invalid token...');
    
    try {
        const response = await fetch(`${baseUrl}/api/user/balance`, {
            headers: {
                'Authorization': 'Bearer invalid_token'
            }
        });
        
        if (response.status === 401) {
            console.log('✅ Invalid token properly rejected (401)');
            return true;
        } else {
            console.log(`❌ Expected 401, got: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Invalid token test error: ${error.message}`);
        return false;
    }
}

// Step 6: Test balance endpoint without token
async function testNoToken() {
    console.log('6️⃣ Testing balance endpoint without token...');
    
    try {
        const response = await fetch(`${baseUrl}/api/user/balance`);
        
        if (response.status === 401) {
            console.log('✅ No token properly rejected (401)');
            return true;
        } else {
            console.log(`❌ Expected 401, got: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ No token test error: ${error.message}`);
        return false;
    }
}

// Main test function
async function main() {
    console.log('🎯 Starting user balance display test...\n');
    
    // Step 1: Login as rider
    const riderToken = await loginRider();
    if (!riderToken) {
        console.log('❌ Cannot proceed without rider login');
        return;
    }
    
    // Step 2: Login as driver
    const driverToken = await loginDriver();
    if (!driverToken) {
        console.log('❌ Cannot proceed without driver login');
        return;
    }
    
    // Step 3: Test rider balance
    const riderBalance = await testRiderBalance(riderToken);
    
    // Step 4: Test driver balance
    const driverBalance = await testDriverBalance(driverToken);
    
    // Step 5: Test invalid token
    const invalidTokenTest = await testInvalidToken();
    
    // Step 6: Test no token
    const noTokenTest = await testNoToken();
    
    // COMPREHENSIVE RESULTS
    console.log('\n📊 USER BALANCE DISPLAY TEST RESULTS:');
    console.log('=====================================');
    
    console.log('\n🎯 Endpoint Verification:');
    console.log(`   Rider balance endpoint: ${riderBalance ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Driver balance endpoint: ${driverBalance ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Invalid token protection: ${invalidTokenTest ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   No token protection: ${noTokenTest ? '✅ WORKING' : '❌ FAILED'}`);
    
    if (riderBalance) {
        console.log('\n💰 Rider Balance Details:');
        console.log(`   Current balance: $${riderBalance.current_balance.toFixed(2)}`);
        console.log(`   User ID: ${riderBalance.user_id}`);
        console.log(`   Recent transactions: ${riderBalance.recent_transactions.length}`);
        
        if (riderBalance.recent_transactions.length > 0) {
            console.log('   Recent transaction types:');
            riderBalance.recent_transactions.slice(0, 3).forEach((tx, index) => {
                console.log(`     ${index + 1}. ${tx.transaction_type} - $${tx.amount.toFixed(2)}`);
            });
        }
    }
    
    if (driverBalance) {
        console.log('\n💰 Driver Balance Details:');
        console.log(`   Current balance: $${driverBalance.current_balance.toFixed(2)}`);
        console.log(`   User ID: ${driverBalance.user_id}`);
        console.log(`   Recent transactions: ${driverBalance.recent_transactions.length}`);
        
        if (driverBalance.recent_transactions.length > 0) {
            console.log('   Recent transaction types:');
            driverBalance.recent_transactions.slice(0, 3).forEach((tx, index) => {
                console.log(`     ${index + 1}. ${tx.transaction_type} - $${tx.amount.toFixed(2)}`);
            });
        }
    }
    
    // Final assessment
    console.log('\n🎉 FINAL ASSESSMENT:');
    const allTestsPassed = riderBalance && driverBalance && invalidTokenTest && noTokenTest;
    
    if (allTestsPassed) {
        console.log('✅ SUCCESS: User balance display system working perfectly!');
        console.log('   - Both riders and drivers can access their balance');
        console.log('   - Balance endpoint returns correct data structure');
        console.log('   - Authentication protection works correctly');
        console.log('   - Recent transactions are included');
        console.log('   - Ready for frontend integration');
    } else {
        console.log('❌ ISSUES FOUND:');
        if (!riderBalance) {
            console.log('   - Rider balance endpoint not working');
        }
        if (!driverBalance) {
            console.log('   - Driver balance endpoint not working');
        }
        if (!invalidTokenTest) {
            console.log('   - Invalid token protection not working');
        }
        if (!noTokenTest) {
            console.log('   - No token protection not working');
        }
    }
    
    console.log('\n🔚 User balance display test finished');
}

// Handle errors
main().catch(console.error);
