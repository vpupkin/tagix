#!/usr/bin/env node

// COMPREHENSIVE DRIVER RIDE REQUEST NOTIFICATION TEST
// This test verifies the exact scenario: "Booking new Ride dont produce the Driver Notification anymore"

const WebSocket = require('ws');
const axios = require('axios');

console.log('🚗 COMPREHENSIVE DRIVER RIDE REQUEST NOTIFICATION TEST\n');
console.log('====================================================\n');

// Test configuration
const API_URL = 'http://localhost:8001';
const WS_URL = 'ws://localhost:8001/ws';

// Test users
const TEST_USERS = {
  rider: {
    email: 'test_rider_notifications@example.com',
    password: 'password123',
    name: 'Test Rider Notifications'
  },
  driver: {
    email: 'test_driver_notifications@example.com',
    password: 'password123',
    name: 'Test Driver Notifications'
  }
};

let riderToken = null;
let driverToken = null;
let riderId = null;
let driverId = null;
let riderWs = null;
let driverWs = null;
let riderNotifications = [];
let driverNotifications = [];
let testResults = {};

// Utility function to log test steps
function logStep(step, message, data = null) {
  console.log(`\n🔍 STEP ${step}: ${message}`);
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
  testResults[`step_${step}`] = { message, data, timestamp: new Date().toISOString() };
}

// Step 1: Setup test users
async function setupTestUsers() {
  logStep(1, 'Setting up test users');
  
  try {
    // Register rider
    await axios.post(`${API_URL}/api/auth/register`, {
      email: TEST_USERS.rider.email,
      password: TEST_USERS.rider.password,
      name: TEST_USERS.rider.name,
      role: 'rider'
    });
    logStep(1.1, 'Rider registered successfully');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
      logStep(1.1, 'Rider already exists (skipping registration)');
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
    logStep(1.2, 'Driver registered successfully');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
      logStep(1.2, 'Driver already exists (skipping registration)');
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
  logStep(1.3, 'Rider logged in', { 
    token: riderToken.substring(0, 20) + '...',
    riderId: riderId
  });

  // Login driver
  const driverLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_USERS.driver.email,
    password: TEST_USERS.driver.password
  });
  driverToken = driverLogin.data.access_token;
  driverId = driverLogin.data.user.id;
  logStep(1.4, 'Driver logged in', { 
    token: driverToken.substring(0, 20) + '...',
    driverId: driverId
  });
}

// Step 2: Setup WebSocket connections
async function setupWebSockets() {
  logStep(2, 'Setting up WebSocket connections');
  
  return new Promise((resolve, reject) => {
    // Connect rider WebSocket
    logStep(2.1, 'Connecting rider WebSocket', { url: `${WS_URL}/${riderId}` });
    riderWs = new WebSocket(`${WS_URL}/${riderId}`);
    
    riderWs.on('open', () => {
      logStep(2.2, 'Rider WebSocket connected successfully');
    });
    
    riderWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        riderNotifications.push(message);
        logStep(2.3, 'Rider received WebSocket message', message);
      } catch (error) {
        logStep(2.4, 'Error parsing rider message', { error: error.message, rawData: data.toString() });
      }
    });
    
    riderWs.on('error', (error) => {
      logStep(2.5, 'Rider WebSocket error', { error: error.message });
    });
    
    // Connect driver WebSocket
    logStep(2.6, 'Connecting driver WebSocket', { url: `${WS_URL}/${driverId}` });
    driverWs = new WebSocket(`${WS_URL}/${driverId}`);
    
    driverWs.on('open', () => {
      logStep(2.7, 'Driver WebSocket connected successfully');
      resolve(); // Both WebSockets are connected
    });
    
    driverWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        driverNotifications.push(message);
        logStep(2.8, 'Driver received WebSocket message', message);
        
        if (message.type === 'ride_request') {
          logStep(2.9, '🎯 DRIVER RECEIVED RIDE REQUEST NOTIFICATION!', {
            request_id: message.request_id,
            pickup: message.pickup_address,
            dropoff: message.dropoff_address,
            fare: message.estimated_fare
          });
        }
      } catch (error) {
        logStep(2.10, 'Error parsing driver message', { error: error.message, rawData: data.toString() });
      }
    });
    
    driverWs.on('error', (error) => {
      logStep(2.11, 'Driver WebSocket error', { error: error.message });
      reject(error);
    });
  });
}

// Step 3: Set driver online and location
async function setDriverOnline() {
  logStep(3, 'Setting driver online and location');
  
  try {
    // First, update driver location
    const locationResponse = await axios.post(`${API_URL}/api/location/update`, {
      latitude: 48.6408,
      longitude: 9.8337,
      address: 'Test Driver Location, Stuttgart'
    }, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    logStep(3.1, 'Driver location updated', locationResponse.data);
    
    // Then set driver online
    const onlineResponse = await axios.post(`${API_URL}/api/driver/online`, {}, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    logStep(3.2, 'Driver set online', onlineResponse.data);
    
    // Verify driver status
    const driverProfile = await axios.get(`${API_URL}/api/driver/profile`, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    logStep(3.3, 'Driver profile verification', {
      is_online: driverProfile.data.is_online,
      has_location: !!driverProfile.data.current_location,
      location: driverProfile.data.current_location
    });
    
    return true;
  } catch (error) {
    logStep(3.4, 'Error setting driver online', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    return false;
  }
}

// Step 4: Check initial available rides
async function checkInitialAvailableRides() {
  logStep(4, 'Checking initial available rides for driver');
  
  try {
    const response = await axios.get(`${API_URL}/api/rides/available`, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    logStep(4.1, 'Initial available rides retrieved', {
      count: Array.isArray(response.data) ? response.data.length : 'Not an array',
      data: response.data
    });
    return response.data;
  } catch (error) {
    logStep(4.2, 'Error fetching initial available rides', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    return null;
  }
}

// Step 5: Book a ride as rider
async function bookRide() {
  logStep(5, 'Booking a ride as rider');
  
  const rideData = {
    pickup_location: {
      latitude: 48.6408,
      longitude: 9.8337,
      address: 'Test Pickup Location, Stuttgart'
    },
    dropoff_location: {
      latitude: 48.7500,
      longitude: 9.9000,
      address: 'Test Dropoff Location, Stuttgart'
    },
    vehicle_type: 'standard',
    passenger_count: 1,
    special_requirements: 'Test ride for driver notification verification'
  };

  try {
    const response = await axios.post(`${API_URL}/api/rides/request`, rideData, {
      headers: {
        'Authorization': `Bearer ${riderToken}`,
        'Content-Type': 'application/json'
      }
    });

    logStep(5.1, 'Ride booked successfully', {
      request_id: response.data.request_id,
      estimated_fare: response.data.estimated_fare,
      matches_found: response.data.matches_found
    });
    return response.data;
  } catch (error) {
    logStep(5.2, 'Error booking ride', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    throw error;
  }
}

// Step 6: Check available rides after booking
async function checkAvailableRidesAfterBooking() {
  logStep(6, 'Checking available rides after booking');
  
  try {
    const response = await axios.get(`${API_URL}/api/rides/available`, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    logStep(6.1, 'Available rides after booking', {
      count: Array.isArray(response.data) ? response.data.length : 'Not an array',
      data: response.data
    });
    return response.data;
  } catch (error) {
    logStep(6.2, 'Error fetching available rides after booking', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    return null;
  }
}

// Step 7: Test driver accepting the ride
async function testDriverAcceptRide(requestId) {
  logStep(7, 'Testing driver accepting the ride');
  
  try {
    const response = await axios.post(`${API_URL}/api/rides/${requestId}/accept`, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });

    logStep(7.1, 'Ride accepted successfully', {
      match_id: response.data.match_id,
      message: response.data.message
    });
    return response.data;
  } catch (error) {
    logStep(7.2, 'Error accepting ride', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    return null;
  }
}

// Main test function
async function runComprehensiveTest() {
  console.log('🎯 Starting comprehensive driver ride request notification test...\n');
  
  try {
    // Step 1: Setup test users
    await setupTestUsers();
    
    // Step 2: Setup WebSocket connections
    await setupWebSockets();
    
    // Step 3: Set driver online
    const driverOnline = await setDriverOnline();
    if (!driverOnline) {
      throw new Error('Failed to set driver online');
    }
    
    // Step 4: Check initial available rides
    const initialRides = await checkInitialAvailableRides();
    
    // Step 5: Book a ride
    const rideResult = await bookRide();
    
    // Step 6: Wait for notifications
    logStep(6, 'Waiting 5 seconds for notifications...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 7: Check available rides after booking
    const updatedRides = await checkAvailableRidesAfterBooking();
    
    // Step 8: Test driver accepting the ride
    const acceptResult = await testDriverAcceptRide(rideResult.request_id);
    
    // Step 9: Wait for acceptance notification
    logStep(9, 'Waiting 3 seconds for acceptance notification...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 10: Analyze results
    logStep(10, 'Analyzing test results');
    
    const hasDriverRideRequestNotification = driverNotifications.some(n => n.type === 'ride_request');
    const hasRiderAcceptanceNotification = riderNotifications.some(n => n.type === 'ride_accepted');
    const hasNewRide = Array.isArray(updatedRides) && updatedRides.length > (Array.isArray(initialRides) ? initialRides.length : 0);
    const rideWasAccepted = acceptResult && acceptResult.match_id;
    
    logStep(10.1, 'Final analysis', {
      driver_notifications_count: driverNotifications.length,
      rider_notifications_count: riderNotifications.length,
      driver_ride_request_notification: hasDriverRideRequestNotification,
      rider_acceptance_notification: hasRiderAcceptanceNotification,
      new_ride_appeared: hasNewRide,
      ride_was_accepted: rideWasAccepted,
      initial_rides_count: Array.isArray(initialRides) ? initialRides.length : 'Error',
      updated_rides_count: Array.isArray(updatedRides) ? updatedRides.length : 'Error',
      all_driver_notifications: driverNotifications,
      all_rider_notifications: riderNotifications
    });
    
    // Final assessment
    console.log('\n🎯 FINAL ASSESSMENT:');
    console.log('==================');
    
    if (hasDriverRideRequestNotification) {
      console.log('✅ SUCCESS: Driver received ride request notification via WebSocket');
    } else {
      console.log('❌ FAILURE: Driver did NOT receive ride request notification');
    }
    
    if (hasNewRide) {
      console.log('✅ SUCCESS: New ride appears in available rides');
    } else {
      console.log('❌ FAILURE: New ride does NOT appear in available rides');
    }
    
    if (hasRiderAcceptanceNotification) {
      console.log('✅ SUCCESS: Rider received ride acceptance notification');
    } else {
      console.log('❌ FAILURE: Rider did NOT receive ride acceptance notification');
    }
    
    if (rideWasAccepted) {
      console.log('✅ SUCCESS: Driver successfully accepted the ride');
    } else {
      console.log('❌ FAILURE: Driver could NOT accept the ride');
    }
    
    // Overall assessment
    const allTestsPassed = hasDriverRideRequestNotification && hasNewRide && hasRiderAcceptanceNotification && rideWasAccepted;
    
    if (allTestsPassed) {
      console.log('\n🎉 OVERALL: Driver notification system is working perfectly!');
      console.log('   - Drivers receive ride request notifications');
      console.log('   - Rides appear in available rides panel');
      console.log('   - Riders receive acceptance notifications');
      console.log('   - Ride acceptance works correctly');
    } else {
      console.log('\n🚨 OVERALL: Driver notification system has issues!');
      if (!hasDriverRideRequestNotification) {
        console.log('   - CRITICAL: Driver ride request notifications not working');
      }
      if (!hasNewRide) {
        console.log('   - CRITICAL: Rides not appearing in available rides');
      }
      if (!hasRiderAcceptanceNotification) {
        console.log('   - ISSUE: Rider acceptance notifications not working');
      }
      if (!rideWasAccepted) {
        console.log('   - ISSUE: Ride acceptance functionality not working');
      }
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('driver_notification_test_results.json', JSON.stringify({
      testResults,
      driverNotifications,
      riderNotifications,
      finalAnalysis: {
        hasDriverRideRequestNotification,
        hasNewRide,
        hasRiderAcceptanceNotification,
        rideWasAccepted,
        allTestsPassed
      }
    }, null, 2));
    
    console.log('\n📄 Detailed results saved to: driver_notification_test_results.json');
    
  } catch (error) {
    logStep(999, 'Test failed with error', { 
      error: error.response?.data || error.message,
      stack: error.stack 
    });
    console.error('❌ Test failed with error:', error.response?.data || error.message);
  } finally {
    // Cleanup
    if (riderWs) riderWs.close();
    if (driverWs) driverWs.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  if (riderWs) riderWs.close();
  if (driverWs) driverWs.close();
  process.exit(0);
});

// Run the test
runComprehensiveTest().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
