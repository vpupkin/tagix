#!/usr/bin/env node

// TEST DRIVER BALANCE DEDUCTION FOR PLATFORM FEES
// This test verifies that driver balance is decreased by platform fee when ride is completed

const axios = require('axios');
const WebSocket = require('ws');

console.log('💰 TESTING DRIVER BALANCE DEDUCTION FOR PLATFORM FEES\n');
console.log('====================================================\n');

const API_URL = 'http://localhost:8001';
const WS_URL = 'ws://localhost:8001/ws';

// Test users
const TEST_USERS = {
  rider: {
    email: 'test_rider_balance@example.com',
    password: 'password123',
    name: 'Test Rider Balance'
  },
  driver: {
    email: 'test_driver_balance@example.com',
    password: 'password123',
    name: 'Test Driver Balance'
  }
};

let riderToken = null;
let driverToken = null;
let riderId = null;
let driverId = null;
let driverWs = null;
let driverNotifications = [];

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

  // Login rider
  const riderLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_USERS.rider.email,
    password: TEST_USERS.rider.password
  });
  riderToken = riderLogin.data.access_token;
  riderId = riderLogin.data.user.id;
  console.log('✅ Rider logged in');

  // Login driver
  const driverLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_USERS.driver.email,
    password: TEST_USERS.driver.password
  });
  driverToken = driverLogin.data.access_token;
  driverId = driverLogin.data.user.id;
  console.log('✅ Driver logged in');
}

async function setupDriverWebSocket() {
  console.log('2️⃣ Setting up driver WebSocket...');
  
  return new Promise((resolve, reject) => {
    driverWs = new WebSocket(`${WS_URL}/${driverId}`);
    
    driverWs.on('open', () => {
      console.log('✅ Driver WebSocket connected');
      resolve();
    });
    
    driverWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        driverNotifications.push(message);
        console.log(`📨 Driver received: ${message.type}`);
        
        if (message.type === 'balance_transaction') {
          console.log('💰 Balance transaction notification received!');
          console.log(`   Type: ${message.transaction_type}`);
          console.log(`   Amount: Ⓣ${message.amount}`);
          console.log(`   Change: Ⓣ${message.amount_change}`);
          console.log(`   New Balance: Ⓣ${message.new_balance}`);
        }
      } catch (error) {
        console.log(`❌ Error parsing message: ${error.message}`);
      }
    });
    
    driverWs.on('error', (error) => {
      console.error(`❌ WebSocket error: ${error.message}`);
      reject(error);
    });
  });
}

async function setDriverOnline() {
  console.log('3️⃣ Setting driver online...');
  
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
  console.log('4️⃣ Getting driver balance...');
  
  try {
    const response = await axios.get(`${API_URL}/api/user/balance`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    
    const balance = response.data.current_balance || 0;
    console.log(`💰 Current driver balance: Ⓣ${balance}`);
    return balance;
  } catch (error) {
    console.log(`❌ Error getting balance: ${error.response?.data || error.message}`);
    return 0;
  }
}

async function bookRide() {
  console.log('5️⃣ Booking a ride...');
  
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
  console.log(`   Estimated fare: Ⓣ${response.data.estimated_fare}`);
  console.log(`   Matches found: ${response.data.matches_found}`);
  
  return response.data;
}

async function acceptRide(requestId) {
  console.log('6️⃣ Accepting ride...');
  
  const response = await axios.post(`${API_URL}/api/rides/${requestId}/accept`, {
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  
  console.log(`✅ Ride accepted: ${response.data.match_id}`);
  return response.data;
}

async function startRide(matchId) {
  console.log('7️⃣ Starting ride...');
  
  const response = await axios.post(`${API_URL}/api/rides/${matchId}/start`, {
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  
  console.log(`✅ Ride started: ${response.data.message}`);
  return response.data;
}

async function completeRide(matchId) {
  console.log('8️⃣ Completing ride...');
  
  const response = await axios.post(`${API_URL}/api/rides/${matchId}/update`, {
    action: 'complete',
    notes: 'Test ride completion for balance deduction'
  }, {
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  
  console.log(`✅ Ride completed: ${response.data.message}`);
  console.log(`   Payment ID: ${response.data.payment_id}`);
  console.log(`   Payment Status: ${response.data.payment_status}`);
  console.log(`   Amount: Ⓣ${response.data.amount}`);
  console.log(`   Driver Earnings: Ⓣ${response.data.driver_earnings}`);
  
  return response.data;
}

async function checkDriverBalanceAfter() {
  console.log('9️⃣ Checking driver balance after ride completion...');
  
  // Wait for balance transaction to be processed
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const balance = await getDriverBalance();
  return balance;
}

async function checkAuditTrail() {
  console.log('🔍 Checking audit trail for balance transaction...');
  
  try {
    // This would require admin access, but we can check if the balance transaction was created
    // by looking at the driver's recent transactions
    const response = await axios.get(`${API_URL}/api/user/balance`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    
    const transactions = response.data.recent_transactions || [];
    const platformFeeTransaction = transactions.find(t => 
      t.transaction_type === 'debit' && 
      t.description && 
      t.description.includes('Platform fee')
    );
    
    if (platformFeeTransaction) {
      console.log('✅ Platform fee transaction found in audit trail!');
      console.log(`   Transaction ID: ${platformFeeTransaction.id}`);
      console.log(`   Amount: Ⓣ${platformFeeTransaction.amount}`);
      console.log(`   Description: ${platformFeeTransaction.description}`);
      console.log(`   Previous Balance: Ⓣ${platformFeeTransaction.previous_balance}`);
      console.log(`   New Balance: Ⓣ${platformFeeTransaction.new_balance}`);
      return true;
    } else {
      console.log('❌ Platform fee transaction NOT found in audit trail');
      return false;
    }
  } catch (error) {
    console.log(`❌ Error checking audit trail: ${error.response?.data || error.message}`);
    return false;
  }
}

async function main() {
  try {
    await setupTestUsers();
    await setupDriverWebSocket();
    await setDriverOnline();
    
    // Get initial balance
    const initialBalance = await getDriverBalance();
    
    // Book and complete a ride
    const rideResult = await bookRide();
    const acceptResult = await acceptRide(rideResult.request_id);
    await startRide(acceptResult.match_id);
    const completeResult = await completeRide(acceptResult.match_id);
    
    // Check balance after completion
    const finalBalance = await checkDriverBalanceAfter();
    
    // Check audit trail
    const auditTrailFound = await checkAuditTrail();
    
    // Calculate expected balance
    const platformFee = completeResult.amount * 0.20; // 20% platform fee
    const expectedBalance = initialBalance - platformFee;
    
    // Results
    console.log('\n📊 RESULTS:');
    console.log('===========');
    console.log(`💰 Initial balance: Ⓣ${initialBalance}`);
    console.log(`💰 Final balance: Ⓣ${finalBalance}`);
    console.log(`💰 Expected balance: Ⓣ${expectedBalance}`);
    console.log(`💰 Platform fee: Ⓣ${platformFee}`);
    console.log(`💰 Balance change: Ⓣ${finalBalance - initialBalance}`);
    
    console.log('\n🎯 ASSESSMENT:');
    const balanceCorrect = Math.abs(finalBalance - expectedBalance) < 0.01; // Allow for small floating point differences
    
    if (balanceCorrect) {
      console.log('✅ SUCCESS: Driver balance correctly decreased by platform fee');
    } else {
      console.log('❌ FAILURE: Driver balance NOT correctly decreased by platform fee');
    }
    
    if (auditTrailFound) {
      console.log('✅ SUCCESS: Platform fee transaction found in audit trail');
    } else {
      console.log('❌ FAILURE: Platform fee transaction NOT found in audit trail');
    }
    
    const hasBalanceNotification = driverNotifications.some(n => n.type === 'balance_transaction');
    if (hasBalanceNotification) {
      console.log('✅ SUCCESS: Driver received balance transaction notification');
    } else {
      console.log('❌ FAILURE: Driver did NOT receive balance transaction notification');
    }
    
    if (balanceCorrect && auditTrailFound && hasBalanceNotification) {
      console.log('\n🎉 OVERALL: Driver balance deduction system is working perfectly!');
      console.log('   - Balance correctly decreased by platform fee');
      console.log('   - Transaction persisted in audit trail');
      console.log('   - Driver notified of balance change');
    } else {
      console.log('\n🚨 OVERALL: Driver balance deduction system has issues!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  } finally {
    if (driverWs) driverWs.close();
  }
}

main().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
