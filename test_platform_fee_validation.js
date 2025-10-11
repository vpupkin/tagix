#!/usr/bin/env node

// TEST PLATFORM FEE VALIDATION
// This test verifies that the backend properly validates:
// 1. Driver balance must be sufficient to cover platform fee for specific ride
// 2. Platform fee is calculated as 20% of ride fare
// 3. Different rides have different platform fee requirements

const axios = require('axios');
const WebSocket = require('ws');

console.log('💰 TESTING PLATFORM FEE VALIDATION\n');
console.log('==================================\n');

const API_URL = 'http://localhost:8001';
const WS_URL = 'ws://localhost:8001/ws';

// Test users
const TEST_USERS = {
  rider: {
    email: 'test_rider_platform@example.com',
    password: 'password123',
    name: 'Test Rider Platform'
  },
  driver: {
    email: 'test_driver_platform@example.com',
    password: 'password123',
    name: 'Test Driver Platform'
  },
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Test Admin'
  }
};

let riderToken = null;
let driverToken = null;
let adminToken = null;
let riderId = null;
let driverId = null;
let adminId = null;

async function setupTestUsers() {
  console.log('1️⃣ Setting up test users...');
  
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

  // Login users
  const riderLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_USERS.rider.email,
    password: TEST_USERS.rider.password
  });
  riderToken = riderLogin.data.access_token;
  riderId = riderLogin.data.user.id;
  console.log('✅ Rider logged in');

  const driverLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_USERS.driver.email,
    password: TEST_USERS.driver.password
  });
  driverToken = driverLogin.data.access_token;
  driverId = driverLogin.data.user.id;
  console.log('✅ Driver logged in');

  const adminLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_USERS.admin.email,
    password: TEST_USERS.admin.password
  });
  adminToken = adminLogin.data.access_token;
  adminId = adminLogin.data.user.id;
  console.log('✅ Admin logged in');
}

async function setDriverOnline() {
  console.log('2️⃣ Setting driver online...');
  
  // Set location
  await axios.post(`${API_URL}/api/location/update`, {
    latitude: 48.6408,
    longitude: 9.8337,
    address: 'Test Location, Stuttgart'
  }, {
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  
  // Set online
  await axios.post(`${API_URL}/api/driver/online`, {}, {
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  
  console.log('✅ Driver is online');
}

async function getDriverBalance() {
  try {
    const response = await axios.get(`${API_URL}/api/user/balance`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    return response.data.current_balance || 0;
  } catch (error) {
    console.log(`❌ Error getting balance: ${error.response?.data || error.message}`);
    return 0;
  }
}

async function setDriverBalance(amount) {
  console.log(`3️⃣ Setting driver balance to Ⓣ${amount}...`);
  
  try {
    const response = await axios.post(`${API_URL}/api/admin/users/${driverId}/balance/transaction`, {
      transaction_type: 'credit',
      amount: amount,
      description: `Test balance setup - ${amount}`
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    console.log(`✅ Driver balance set to Ⓣ${amount}`);
    return true;
  } catch (error) {
    console.log(`❌ Error setting balance: ${error.response?.data || error.message}`);
    return false;
  }
}

async function bookRide(vehicleType = 'standard', distance = 'short') {
  console.log(`4️⃣ Booking a ${distance} ${vehicleType} ride...`);
  
  // Different ride configurations for testing different fares
  const rideConfigs = {
    short: {
      pickup: { latitude: 48.6408, longitude: 9.8337, address: 'Short Pickup' },
      dropoff: { latitude: 48.6410, longitude: 9.8340, address: 'Short Dropoff' }
    },
    medium: {
      pickup: { latitude: 48.6408, longitude: 9.8337, address: 'Medium Pickup' },
      dropoff: { latitude: 48.6500, longitude: 9.8500, address: 'Medium Dropoff' }
    },
    long: {
      pickup: { latitude: 48.6408, longitude: 9.8337, address: 'Long Pickup' },
      dropoff: { latitude: 48.7500, longitude: 9.9000, address: 'Long Dropoff' }
    }
  };
  
  const config = rideConfigs[distance];
  
  const rideData = {
    pickup_location: config.pickup,
    dropoff_location: config.dropoff,
    vehicle_type: vehicleType,
    passenger_count: 1
  };
  
  const response = await axios.post(`${API_URL}/api/rides/request`, rideData, {
    headers: { 'Authorization': `Bearer ${riderToken}` }
  });
  
  const rideFare = response.data.estimated_fare;
  const platformFee = rideFare * 0.20;
  
  console.log(`✅ Ride booked: ${response.data.request_id}`);
  console.log(`   Fare: Ⓣ${rideFare.toFixed(2)}`);
  console.log(`   Platform fee (20%): Ⓣ${platformFee.toFixed(2)}`);
  
  return {
    ...response.data,
    platformFee: platformFee
  };
}

async function acceptRide(requestId) {
  console.log(`5️⃣ Attempting to accept ride: ${requestId}...`);
  
  try {
    const response = await axios.post(`${API_URL}/api/rides/${requestId}/accept`, {}, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    
    console.log(`✅ Ride accepted: ${response.data.match_id}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ Failed to accept ride: ${error.response?.data?.detail || error.message}`);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
}

async function testPlatformFeeValidation() {
  console.log('\n🧪 TEST: PLATFORM FEE VALIDATION');
  console.log('='.repeat(50));
  
  // Test 1: Book a short ride (low fare, low platform fee)
  const shortRide = await bookRide('standard', 'short');
  console.log(`\n📊 Short Ride Analysis:`);
  console.log(`   Fare: Ⓣ${shortRide.estimated_fare.toFixed(2)}`);
  console.log(`   Platform Fee: Ⓣ${shortRide.platformFee.toFixed(2)}`);
  
  // Set balance to exactly the platform fee amount
  await setDriverBalance(shortRide.platformFee);
  const balance = await getDriverBalance();
  console.log(`   Driver Balance: Ⓣ${balance.toFixed(2)}`);
  
  // Try to accept - should succeed (balance = platform fee)
  const result1 = await acceptRide(shortRide.request_id);
  
  if (result1.success) {
    console.log('✅ SUCCESS: Driver with exact platform fee balance can accept ride');
  } else {
    console.log('❌ FAILURE: Driver with exact platform fee balance should be able to accept ride');
    console.log(`   Error: ${result1.error}`);
  }
  
  // Test 2: Book a long ride (high fare, high platform fee)
  const longRide = await bookRide('premium', 'long');
  console.log(`\n📊 Long Ride Analysis:`);
  console.log(`   Fare: Ⓣ${longRide.estimated_fare.toFixed(2)}`);
  console.log(`   Platform Fee: Ⓣ${longRide.platformFee.toFixed(2)}`);
  
  // Try to accept with current balance (should fail - insufficient for long ride)
  const result2 = await acceptRide(longRide.request_id);
  
  if (!result2.success) {
    console.log('✅ SUCCESS: Driver with insufficient balance correctly rejected for high platform fee ride');
    console.log(`   Error message: ${result2.error}`);
    
    // Check if error message contains platform fee information
    if (result2.error.includes('Required platform fee') && result2.error.includes('Shortfall')) {
      console.log('✅ SUCCESS: Error message includes platform fee and shortfall information');
    } else {
      console.log('❌ FAILURE: Error message should include platform fee and shortfall information');
    }
  } else {
    console.log('❌ FAILURE: Driver with insufficient balance should be rejected for high platform fee ride');
  }
  
  // Test 3: Increase balance to cover long ride platform fee
  await setDriverBalance(longRide.platformFee + 1); // Slightly more than required
  const newBalance = await getDriverBalance();
  console.log(`\n💰 Updated Balance: Ⓣ${newBalance.toFixed(2)}`);
  
  // Try to accept long ride - should succeed now
  const result3 = await acceptRide(longRide.request_id);
  
  if (result3.success) {
    console.log('✅ SUCCESS: Driver with sufficient balance can accept high platform fee ride');
  } else {
    console.log('❌ FAILURE: Driver with sufficient balance should be able to accept high platform fee ride');
    console.log(`   Error: ${result3.error}`);
  }
  
  return {
    test1: result1.success,
    test2: !result2.success && result2.error.includes('Required platform fee'),
    test3: result3.success
  };
}

async function testEdgeCases() {
  console.log('\n🧪 TEST: EDGE CASES');
  console.log('='.repeat(50));
  
  // Test with zero balance
  await setDriverBalance(0);
  const zeroBalance = await getDriverBalance();
  console.log(`💰 Zero Balance: Ⓣ${zeroBalance.toFixed(2)}`);
  
  const shortRide = await bookRide('standard', 'short');
  const result1 = await acceptRide(shortRide.request_id);
  
  if (!result1.success) {
    console.log('✅ SUCCESS: Zero balance correctly rejected');
    console.log(`   Error: ${result1.error}`);
  } else {
    console.log('❌ FAILURE: Zero balance should be rejected');
  }
  
  // Test with very small balance (less than any platform fee)
  await setDriverBalance(0.01);
  const smallBalance = await getDriverBalance();
  console.log(`💰 Small Balance: Ⓣ${smallBalance.toFixed(2)}`);
  
  const result2 = await acceptRide(shortRide.request_id);
  
  if (!result2.success) {
    console.log('✅ SUCCESS: Very small balance correctly rejected');
    console.log(`   Error: ${result2.error}`);
  } else {
    console.log('❌ FAILURE: Very small balance should be rejected');
  }
  
  return {
    zeroBalance: !result1.success,
    smallBalance: !result2.success
  };
}

async function main() {
  try {
    await setupTestUsers();
    await setDriverOnline();
    
    // Run platform fee validation tests
    const platformFeeResults = await testPlatformFeeValidation();
    
    // Run edge case tests
    const edgeCaseResults = await testEdgeCases();
    
    // Overall results
    console.log('\n' + '='.repeat(60));
    console.log('OVERALL TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`Platform Fee Validation:`);
    console.log(`  Exact balance acceptance: ${platformFeeResults.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Insufficient balance rejection: ${platformFeeResults.test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Sufficient balance acceptance: ${platformFeeResults.test3 ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log(`Edge Cases:`);
    console.log(`  Zero balance rejection: ${edgeCaseResults.zeroBalance ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Small balance rejection: ${edgeCaseResults.smallBalance ? '✅ PASS' : '❌ FAIL'}`);
    
    const allTestsPassed = Object.values(platformFeeResults).every(r => r) && 
                          Object.values(edgeCaseResults).every(r => r);
    
    if (allTestsPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Platform fee validation is working correctly:');
      console.log('   - Validates balance against specific ride platform fee');
      console.log('   - Platform fee calculated as 20% of ride fare');
      console.log('   - Different rides have different platform fee requirements');
      console.log('   - Provides detailed error messages with shortfall information');
      console.log('   - Handles edge cases (zero balance, very small balance)');
    } else {
      console.log('\n🚨 SOME TESTS FAILED!');
      console.log('❌ Platform fee validation needs attention');
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
