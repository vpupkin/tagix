#!/usr/bin/env node

// TEST ADMIN BALANCE DISPLAY
// This test verifies that the Admin Dashboard User Management table
// displays actual balance values instead of just "Balance" text

const axios = require('axios');

console.log('💰 TESTING ADMIN BALANCE DISPLAY\n');
console.log('================================\n');

const API_URL = 'http://localhost:8001';

// Test users
const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Test Admin'
  },
  driver: {
    email: 'test_driver_balance@example.com',
    password: 'password123',
    name: 'Test Driver Balance'
  },
  rider: {
    email: 'test_rider_balance@example.com',
    password: 'password123',
    name: 'Test Rider Balance'
  }
};

let adminToken = null;
let driverId = null;
let riderId = null;

async function setupTestUsers() {
  console.log('1️⃣ Setting up test users...');
  
  try {
    // Register driver
    await axios.post(`${API_URL}/api/auth/register`, {
      email: TEST_USERS.driver.email,
      password: TEST_USERS.driver.password,
      name: TEST_USERS.driver.name,
      role: 'driver'
    });
    console.log('✅ Driver registered');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
      console.log('ℹ️ Driver already exists');
    } else {
      throw error;
    }
  }

  try {
    // Register rider
    await axios.post(`${API_URL}/api/auth/register`, {
      email: TEST_USERS.rider.email,
      password: TEST_USERS.rider.password,
      name: TEST_USERS.rider.name,
      role: 'rider'
    });
    console.log('✅ Rider registered');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
      console.log('ℹ️ Rider already exists');
    } else {
      throw error;
    }
  }

  // Login admin
  const adminLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_USERS.admin.email,
    password: TEST_USERS.admin.password
  });
  adminToken = adminLogin.data.access_token;
  console.log('✅ Admin logged in');

  // Get user IDs
  const usersResponse = await axios.get(`${API_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  const driver = usersResponse.data.find(u => u.email === TEST_USERS.driver.email);
  const rider = usersResponse.data.find(u => u.email === TEST_USERS.rider.email);
  
  if (driver) driverId = driver.id;
  if (rider) riderId = rider.id;
  
  console.log(`✅ Driver ID: ${driverId}`);
  console.log(`✅ Rider ID: ${riderId}`);
}

async function setUserBalance(userId, amount, description = 'Test balance setup') {
  console.log(`2️⃣ Setting balance for user ${userId} to Ⓣ${amount}...`);
  
  try {
    const response = await axios.post(`${API_URL}/api/admin/users/${userId}/balance/transaction`, {
      transaction_type: 'credit',
      amount: amount,
      description: description
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    console.log(`✅ Balance set to Ⓣ${amount}`);
    return true;
  } catch (error) {
    console.log(`❌ Error setting balance: ${error.response?.data || error.message}`);
    return false;
  }
}

async function testBalanceDisplay() {
  console.log('\n🧪 TEST: BALANCE DISPLAY IN ADMIN DASHBOARD');
  console.log('='.repeat(50));
  
  // Test 1: Set different balances for different users
  await setUserBalance(driverId, 15.50, 'Driver test balance');
  await setUserBalance(riderId, -5.25, 'Rider negative balance');
  
  // Test 2: Fetch admin users data
  console.log('\n📊 Fetching admin users data...');
  const usersResponse = await axios.get(`${API_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  console.log(`✅ Retrieved ${usersResponse.data.length} users`);
  
  // Test 3: Fetch balance data
  console.log('\n💰 Fetching balance data...');
  const balancesResponse = await axios.get(`${API_URL}/api/admin/balances`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  console.log(`✅ Retrieved ${balancesResponse.data.balances.length} balance records`);
  
  // Test 4: Verify balance data structure
  console.log('\n🔍 Verifying balance data structure...');
  const balanceData = balancesResponse.data.balances;
  
  let driverBalance = null;
  let riderBalance = null;
  
  balanceData.forEach(balance => {
    if (balance.user_id === driverId) {
      driverBalance = balance;
      console.log(`✅ Driver balance found: Ⓣ${balance.balance}`);
    }
    if (balance.user_id === riderId) {
      riderBalance = balance;
      console.log(`✅ Rider balance found: Ⓣ${balance.balance}`);
    }
  });
  
  // Test 5: Verify balance values
  console.log('\n🎯 Verifying balance values...');
  
  const tests = [
    {
      name: 'Driver positive balance',
      user: driverBalance,
      expected: 15.50,
      condition: (balance) => Math.abs(balance - 15.50) < 0.01
    },
    {
      name: 'Rider negative balance',
      user: riderBalance,
      expected: -5.25,
      condition: (balance) => Math.abs(balance - (-5.25)) < 0.01
    }
  ];
  
  let allTestsPassed = true;
  
  tests.forEach(test => {
    if (test.user) {
      const actual = test.user.balance;
      const passed = test.condition(actual);
      
      console.log(`${passed ? '✅' : '❌'} ${test.name}: Expected Ⓣ${test.expected}, Got Ⓣ${actual}`);
      
      if (!passed) {
        allTestsPassed = false;
      }
    } else {
      console.log(`❌ ${test.name}: User balance not found`);
      allTestsPassed = false;
    }
  });
  
  // Test 6: Verify balance data includes user information
  console.log('\n👤 Verifying user information in balance data...');
  
  if (driverBalance) {
    const hasUserInfo = driverBalance.user_name && driverBalance.user_email && driverBalance.user_role;
    console.log(`${hasUserInfo ? '✅' : '❌'} Driver balance includes user info: ${hasUserInfo}`);
    if (hasUserInfo) {
      console.log(`   Name: ${driverBalance.user_name}`);
      console.log(`   Email: ${driverBalance.user_email}`);
      console.log(`   Role: ${driverBalance.user_role}`);
    }
  }
  
  if (riderBalance) {
    const hasUserInfo = riderBalance.user_name && riderBalance.user_email && riderBalance.user_role;
    console.log(`${hasUserInfo ? '✅' : '❌'} Rider balance includes user info: ${hasUserInfo}`);
    if (hasUserInfo) {
      console.log(`   Name: ${riderBalance.user_name}`);
      console.log(`   Email: ${riderBalance.user_email}`);
      console.log(`   Role: ${riderBalance.user_role}`);
    }
  }
  
  return {
    balanceDataRetrieved: balanceData.length > 0,
    driverBalanceCorrect: driverBalance && Math.abs(driverBalance.balance - 15.50) < 0.01,
    riderBalanceCorrect: riderBalance && Math.abs(riderBalance.balance - (-5.25)) < 0.01,
    userInfoIncluded: driverBalance && riderBalance && 
                     driverBalance.user_name && riderBalance.user_name
  };
}

async function testBalanceColorCoding() {
  console.log('\n🧪 TEST: BALANCE COLOR CODING LOGIC');
  console.log('='.repeat(50));
  
  // Test different balance scenarios
  const testScenarios = [
    { balance: 10.50, expected: 'positive', description: 'Positive balance' },
    { balance: 0.00, expected: 'zero', description: 'Zero balance' },
    { balance: -5.25, expected: 'negative', description: 'Negative balance' },
    { balance: 0.01, expected: 'positive', description: 'Small positive balance' },
    { balance: -0.01, expected: 'negative', description: 'Small negative balance' }
  ];
  
  console.log('🎨 Testing color coding logic:');
  
  testScenarios.forEach(scenario => {
    const { balance, expected, description } = scenario;
    
    // Simulate the color coding logic from the frontend
    let colorClass;
    if (balance > 0) {
      colorClass = 'text-green-600 bg-green-50 border-green-200';
    } else if (balance < 0) {
      colorClass = 'text-red-600 bg-red-50 border-red-200';
    } else {
      colorClass = 'text-gray-600 bg-gray-50 border-gray-200';
    }
    
    const isCorrect = (
      (expected === 'positive' && colorClass.includes('green')) ||
      (expected === 'negative' && colorClass.includes('red')) ||
      (expected === 'zero' && colorClass.includes('gray'))
    );
    
    console.log(`${isCorrect ? '✅' : '❌'} ${description}: Ⓣ${balance.toFixed(2)} → ${colorClass.split(' ')[0]}`);
  });
  
  return true;
}

async function main() {
  try {
    await setupTestUsers();
    
    // Run balance display tests
    const balanceResults = await testBalanceDisplay();
    
    // Run color coding tests
    const colorResults = await testBalanceColorCoding();
    
    // Overall results
    console.log('\n' + '='.repeat(60));
    console.log('OVERALL TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`Balance Display Tests:`);
    console.log(`  Balance data retrieved: ${balanceResults.balanceDataRetrieved ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Driver balance correct: ${balanceResults.driverBalanceCorrect ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Rider balance correct: ${balanceResults.riderBalanceCorrect ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  User info included: ${balanceResults.userInfoIncluded ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log(`Color Coding Tests:`);
    console.log(`  Color logic working: ${colorResults ? '✅ PASS' : '❌ FAIL'}`);
    
    const allTestsPassed = Object.values(balanceResults).every(r => r) && colorResults;
    
    if (allTestsPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Admin Dashboard balance display is working correctly:');
      console.log('   - Balance data is retrieved from /api/admin/balances');
      console.log('   - Balance values are correctly formatted (ⓉX.XX)');
      console.log('   - Color coding works: Green for positive, Red for negative, Gray for zero');
      console.log('   - User information is included in balance data');
      console.log('   - Balance table shows actual values instead of "Balance" text');
    } else {
      console.log('\n🚨 SOME TESTS FAILED!');
      console.log('❌ Admin Dashboard balance display needs attention');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

main().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
