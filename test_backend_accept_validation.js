#!/usr/bin/env node

// TEST BACKEND ACCEPT VALIDATION
// This test verifies that the backend properly validates:
// 1. Driver balance must be positive to accept rides
// 2. Driver cannot accept rides while another ride is in progress

const axios = require('axios');
const WebSocket = require('ws');

console.log('🔒 TESTING BACKEND ACCEPT VALIDATION\n');
console.log('====================================\n');

const API_URL = 'http://localhost:8001';
const WS_URL = 'ws://localhost:8001/ws';

// Test users
const TEST_USERS = {
  rider: {
    email: 'test_rider_backend@example.com',
    password: 'password123',
    name: 'Test Rider Backend'
  },
  driver: {
    email: 'test_driver_backend@example.com',
    password: 'password123',
    name: 'Test Driver Backend'
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

async function bookRide() {
  console.log('4️⃣ Booking a ride...');
  
  const rideData = {
    pickup_location: {
      latitude: 48.6408,
      longitude: 9.8337,
      address: 'Test Pickup, Stuttgart'
    },
    dropoff_location: {
      latitude: 48.7500,
      longitude: 9.9000,
      address: 'Test Dropoff, Stuttgart'
    },
    vehicle_type: 'standard',
    passenger_count: 1
  };
  
  const response = await axios.post(`${API_URL}/api/rides/request`, rideData, {
    headers: { 'Authorization': `Bearer ${riderToken}` }
  });
  
  console.log(`✅ Ride booked: ${response.data.request_id}`);
  return response.data;
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

async function startRide(matchId) {
  console.log(`6️⃣ Starting ride: ${matchId}...`);
  
  try {
    const response = await axios.post(`${API_URL}/api/rides/${matchId}/start`, {}, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    
    console.log(`✅ Ride started: ${response.data.message}`);
    return response.data;
  } catch (error) {
    console.log(`❌ Error starting ride: ${error.response?.data || error.message}`);
    return null;
  }
}

async function testInsufficientBalance() {
  console.log('\n🧪 TEST 1: INSUFFICIENT BALANCE VALIDATION');
  console.log('='.repeat(50));
  
  // Set driver balance to 0
  await setDriverBalance(0);
  
  // Verify balance is 0
  const balance = await getDriverBalance();
  console.log(`💰 Current balance: Ⓣ${balance}`);
  
  if (balance !== 0) {
    console.log('❌ FAILURE: Could not set balance to 0');
    return false;
  }
  
  // Book a ride
  const ride = await bookRide();
  
  // Try to accept ride with insufficient balance
  const result = await acceptRide(ride.request_id);
  
  if (!result.success) {
    console.log('✅ SUCCESS: Backend correctly rejected ride acceptance with insufficient balance');
    console.log(`   Error message: ${result.error}`);
    
    // Check if error message contains balance information
    if (result.error.includes('Insufficient balance') && result.error.includes('Ⓣ0.00')) {
      console.log('✅ SUCCESS: Error message includes balance information');
      return true;
    } else {
      console.log('❌ FAILURE: Error message does not include balance information');
      return false;
    }
  } else {
    console.log('❌ FAILURE: Backend should have rejected ride acceptance with insufficient balance');
    return false;
  }
}

async function testActiveRideConflict() {
  console.log('\n🧪 TEST 2: ACTIVE RIDE CONFLICT VALIDATION');
  console.log('='.repeat(50));
  
  // Set driver balance to positive amount
  await setDriverBalance(100);
  
  // Verify balance is positive
  const balance = await getDriverBalance();
  console.log(`💰 Current balance: Ⓣ${balance}`);
  
  if (balance <= 0) {
    console.log('❌ FAILURE: Could not set positive balance');
    return false;
  }
  
  // Book first ride
  const ride1 = await bookRide();
  
  // Accept first ride
  const acceptResult1 = await acceptRide(ride1.request_id);
  
  if (!acceptResult1.success) {
    console.log('❌ FAILURE: Could not accept first ride');
    return false;
  }
  
  console.log('✅ First ride accepted successfully');
  
  // Start the first ride to make it active
  await startRide(acceptResult1.data.match_id);
  console.log('✅ First ride started (now active)');
  
  // Book second ride
  const ride2 = await bookRide();
  
  // Try to accept second ride while first is active
  const result = await acceptRide(ride2.request_id);
  
  if (!result.success) {
    console.log('✅ SUCCESS: Backend correctly rejected second ride acceptance');
    console.log(`   Error message: ${result.error}`);
    
    // Check if error message contains active ride information
    if (result.error.includes('another ride is in progress')) {
      console.log('✅ SUCCESS: Error message indicates active ride conflict');
      return true;
    } else {
      console.log('❌ FAILURE: Error message does not indicate active ride conflict');
      return false;
    }
  } else {
    console.log('❌ FAILURE: Backend should have rejected second ride acceptance');
    return false;
  }
}

async function testValidAcceptance() {
  console.log('\n🧪 TEST 3: VALID ACCEPTANCE (CONTROL TEST)');
  console.log('='.repeat(50));
  
  // Set driver balance to positive amount
  await setDriverBalance(50);
  
  // Verify balance is positive
  const balance = await getDriverBalance();
  console.log(`💰 Current balance: Ⓣ${balance}`);
  
  if (balance <= 0) {
    console.log('❌ FAILURE: Could not set positive balance');
    return false;
  }
  
  // Book a ride
  const ride = await bookRide();
  
  // Accept ride (should succeed)
  const result = await acceptRide(ride.request_id);
  
  if (result.success) {
    console.log('✅ SUCCESS: Backend correctly allowed ride acceptance with valid conditions');
    console.log(`   Match ID: ${result.data.match_id}`);
    return true;
  } else {
    console.log('❌ FAILURE: Backend should have allowed ride acceptance with valid conditions');
    console.log(`   Error: ${result.error}`);
    return false;
  }
}

async function main() {
  try {
    await setupTestUsers();
    await setDriverOnline();
    
    // Run tests
    const test1Result = await testInsufficientBalance();
    const test2Result = await testActiveRideConflict();
    const test3Result = await testValidAcceptance();
    
    // Overall results
    console.log('\n' + '='.repeat(60));
    console.log('OVERALL TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`Test 1 (Insufficient Balance): ${test1Result ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (Active Ride Conflict): ${test2Result ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (Valid Acceptance): ${test3Result ? '✅ PASS' : '❌ FAIL'}`);
    
    const allTestsPassed = test1Result && test2Result && test3Result;
    
    if (allTestsPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Backend validation is working correctly:');
      console.log('   - Rejects ride acceptance with insufficient balance');
      console.log('   - Rejects ride acceptance with active ride conflict');
      console.log('   - Allows ride acceptance with valid conditions');
      console.log('   - Provides clear error messages');
    } else {
      console.log('\n🚨 SOME TESTS FAILED!');
      console.log('❌ Backend validation needs attention');
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
