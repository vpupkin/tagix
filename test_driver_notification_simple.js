#!/usr/bin/env node

// SIMPLE DRIVER NOTIFICATION TEST
// Tests the specific issue: "Booking new Ride dont produce the Driver Notification anymore"

const WebSocket = require('ws');
const axios = require('axios');

console.log('🚗 SIMPLE DRIVER NOTIFICATION TEST\n');
console.log('==================================\n');

const API_URL = 'http://localhost:8001';
const WS_URL = 'ws://localhost:8001/ws';

// Test users
const RIDER_EMAIL = 'test_rider_simple@example.com';
const DRIVER_EMAIL = 'test_driver_simple@example.com';
const PASSWORD = 'password123';

let riderToken, driverToken, riderId, driverId;
let driverWs = null;
let driverNotifications = [];

async function setupUsers() {
  console.log('1️⃣ Setting up test users...');
  
  // Register and login rider
  try {
    await axios.post(`${API_URL}/api/auth/register`, {
      email: RIDER_EMAIL,
      password: PASSWORD,
      name: 'Test Rider Simple',
      role: 'rider'
    });
  } catch (error) {
    if (!error.response?.data?.detail?.includes('already registered')) {
      throw error;
    }
  }
  
  const riderLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: RIDER_EMAIL,
    password: PASSWORD
  });
  riderToken = riderLogin.data.access_token;
  riderId = riderLogin.data.user.id;
  console.log('✅ Rider ready');
  
  // Register and login driver
  try {
    await axios.post(`${API_URL}/api/auth/register`, {
      email: DRIVER_EMAIL,
      password: PASSWORD,
      name: 'Test Driver Simple',
      role: 'driver'
    });
  } catch (error) {
    if (!error.response?.data?.detail?.includes('already registered')) {
      throw error;
    }
  }
  
  const driverLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: DRIVER_EMAIL,
    password: PASSWORD
  });
  driverToken = driverLogin.data.access_token;
  driverId = driverLogin.data.user.id;
  console.log('✅ Driver ready');
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
        
        if (message.type === 'ride_request') {
          console.log('🎯 SUCCESS: Driver received ride request notification!');
          console.log(`   Request ID: ${message.request_id}`);
          console.log(`   From: ${message.pickup_address}`);
          console.log(`   To: ${message.dropoff_address}`);
          console.log(`   Fare: ${message.estimated_fare}`);
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
  console.log(`   Matches found: ${response.data.matches_found}`);
  
  return response.data;
}

async function checkAvailableRides() {
  console.log('5️⃣ Checking available rides...');
  
  const response = await axios.get(`${API_URL}/api/rides/available`, {
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  
  const rides = Array.isArray(response.data) ? response.data : [];
  console.log(`📋 Available rides: ${rides.length}`);
  
  return rides;
}

async function main() {
  try {
    await setupUsers();
    await setupDriverWebSocket();
    await setDriverOnline();
    
    // Check initial rides
    const initialRides = await checkAvailableRides();
    
    // Book a ride
    const rideResult = await bookRide();
    
    // Wait for notifications
    console.log('6️⃣ Waiting 5 seconds for notifications...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check rides again
    const updatedRides = await checkAvailableRides();
    
    // Results
    console.log('\n📊 RESULTS:');
    console.log('===========');
    console.log(`📨 Driver notifications received: ${driverNotifications.length}`);
    console.log(`📋 Initial rides: ${initialRides.length}`);
    console.log(`📋 Updated rides: ${updatedRides.length}`);
    
    const hasRideRequestNotification = driverNotifications.some(n => n.type === 'ride_request');
    const hasNewRide = updatedRides.length > initialRides.length;
    
    console.log('\n🎯 ASSESSMENT:');
    if (hasRideRequestNotification) {
      console.log('✅ SUCCESS: Driver received ride request notification');
    } else {
      console.log('❌ FAILURE: Driver did NOT receive ride request notification');
    }
    
    if (hasNewRide) {
      console.log('✅ SUCCESS: New ride appears in available rides');
    } else {
      console.log('❌ FAILURE: New ride does NOT appear in available rides');
    }
    
    if (hasRideRequestNotification && hasNewRide) {
      console.log('\n🎉 OVERALL: Driver notification system is working!');
    } else {
      console.log('\n🚨 OVERALL: Driver notification system has issues!');
      console.log('   This confirms the reported issue: "Booking new Ride dont produce the Driver Notification anymore"');
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
