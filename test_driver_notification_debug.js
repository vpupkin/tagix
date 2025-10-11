const axios = require('axios');
const WebSocket = require('ws');

const API_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

// Test configuration
const TEST_CONFIG = {
  rider: {
    email: 'test_rider_debug@example.com',
    password: 'password123',
    name: 'Test Rider Debug'
  },
  driver: {
    email: 'test_driver_debug@example.com',
    password: 'password123',
    name: 'Test Driver Debug'
  }
};

let riderToken = null;
let driverToken = null;
let driverSocket = null;
let notificationsReceived = [];
let testResults = {};

async function logStep(step, message, data = null) {
  console.log(`\n🔍 STEP ${step}: ${message}`);
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
  testResults[`step_${step}`] = { message, data, timestamp: new Date().toISOString() };
}

async function setupTestUsers() {
  await logStep(1, 'Setting up test users');
  
  try {
    // Register rider
    await axios.post(`${API_URL}/api/auth/register`, {
      email: TEST_CONFIG.rider.email,
      password: TEST_CONFIG.rider.password,
      name: TEST_CONFIG.rider.name,
      role: 'rider'
    });
    await logStep(1.1, 'Rider registered successfully');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
      await logStep(1.1, 'Rider already exists (skipping registration)');
    } else {
      throw error;
    }
  }

  try {
    // Register driver
    await axios.post(`${API_URL}/api/auth/register`, {
      email: TEST_CONFIG.driver.email,
      password: TEST_CONFIG.driver.password,
      name: TEST_CONFIG.driver.name,
      role: 'driver'
    });
    await logStep(1.2, 'Driver registered successfully');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
      await logStep(1.2, 'Driver already exists (skipping registration)');
    } else {
      throw error;
    }
  }

  // Login rider
  const riderLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_CONFIG.rider.email,
    password: TEST_CONFIG.rider.password
  });
  riderToken = riderLogin.data.access_token;
  await logStep(1.3, 'Rider logged in', { token: riderToken.substring(0, 20) + '...' });

  // Login driver
  const driverLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_CONFIG.driver.email,
    password: TEST_CONFIG.driver.password
  });
  driverToken = driverLogin.data.access_token;
  await logStep(1.4, 'Driver logged in', { token: driverToken.substring(0, 20) + '...' });
}

async function setupDriverWebSocket() {
  await logStep(2, 'Setting up driver WebSocket connection');
  
  return new Promise((resolve, reject) => {
    const wsUrl = `${WS_URL}/${TEST_CONFIG.driver.email}`;
    await logStep(2.1, 'Connecting to WebSocket', { url: wsUrl });
    
    driverSocket = new WebSocket(wsUrl);
    
    driverSocket.on('open', () => {
      await logStep(2.2, 'Driver WebSocket connected successfully');
      resolve();
    });
    
    driverSocket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        await logStep(2.3, 'Driver received WebSocket message', message);
        notificationsReceived.push(message);
        
        if (message.type === 'ride_request') {
          await logStep(2.4, '🎯 RIDE REQUEST NOTIFICATION RECEIVED!', {
            id: message.id || message.request_id,
            pickup: message.pickup_address || message.pickup_location?.address,
            dropoff: message.dropoff_address || message.dropoff_location?.address,
            fare: message.estimated_fare
          });
        }
      } catch (error) {
        await logStep(2.5, 'Error parsing WebSocket message', { error: error.message, rawData: data.toString() });
      }
    });
    
    driverSocket.on('error', (error) => {
      await logStep(2.6, 'Driver WebSocket error', { error: error.message });
      reject(error);
    });
    
    driverSocket.on('close', (event) => {
      await logStep(2.7, 'Driver WebSocket disconnected', { code: event.code, reason: event.reason });
    });
  });
}

async function setDriverOnline() {
  await logStep(3, 'Setting driver online');
  
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
    await logStep(3.1, 'Driver location updated', locationResponse.data);
    
    // Then set driver online
    const onlineResponse = await axios.post(`${API_URL}/api/driver/online`, {}, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    await logStep(3.2, 'Driver set online', onlineResponse.data);
    
    // Verify driver status
    const driverProfile = await axios.get(`${API_URL}/api/driver/profile`, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    await logStep(3.3, 'Driver profile verification', {
      is_online: driverProfile.data.is_online,
      has_location: !!driverProfile.data.current_location
    });
    
  } catch (error) {
    await logStep(3.4, 'Error setting driver online', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    throw error;
  }
}

async function checkAvailableRides() {
  await logStep(4, 'Checking available rides for driver');
  
  try {
    const response = await axios.get(`${API_URL}/api/rides/available`, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    await logStep(4.1, 'Available rides retrieved', {
      count: Array.isArray(response.data) ? response.data.length : 'Not an array',
      data: response.data
    });
    return response.data;
  } catch (error) {
    await logStep(4.2, 'Error fetching available rides', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    return null;
  }
}

async function bookRide() {
  await logStep(5, 'Booking a new ride');
  
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
    special_requirements: 'Test ride for notification debugging'
  };

  try {
    const response = await axios.post(`${API_URL}/api/rides/request`, rideData, {
      headers: {
        'Authorization': `Bearer ${riderToken}`,
        'Content-Type': 'application/json'
      }
    });

    await logStep(5.1, 'Ride booked successfully', {
      request_id: response.data.request_id,
      estimated_fare: response.data.estimated_fare,
      matches_found: response.data.matches_found
    });
    return response.data;
  } catch (error) {
    await logStep(5.2, 'Error booking ride', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    throw error;
  }
}

async function testNotificationFlow() {
  console.log('🧪 Starting comprehensive driver notification debugging...\n');
  
  try {
    // Step 1: Setup
    await setupTestUsers();
    
    // Step 2: Setup WebSocket
    await setupDriverWebSocket();
    
    // Step 3: Set driver online
    await setDriverOnline();
    
    // Step 4: Check initial available rides
    const initialRides = await checkAvailableRides();
    
    // Step 5: Book a ride
    const rideResult = await bookRide();
    
    // Step 6: Wait for notifications
    await logStep(6, 'Waiting 10 seconds for notifications...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 7: Check available rides again
    const updatedRides = await checkAvailableRides();
    
    // Step 8: Analyze results
    await logStep(8, 'Analyzing test results');
    
    const hasRideRequestNotification = notificationsReceived.some(n => n.type === 'ride_request');
    const hasNewRide = Array.isArray(updatedRides) && updatedRides.length > (Array.isArray(initialRides) ? initialRides.length : 0);
    
    await logStep(8.1, 'Final analysis', {
      total_notifications: notificationsReceived.length,
      ride_request_notifications: notificationsReceived.filter(n => n.type === 'ride_request').length,
      initial_rides_count: Array.isArray(initialRides) ? initialRides.length : 'Error',
      updated_rides_count: Array.isArray(updatedRides) ? updatedRides.length : 'Error',
      has_ride_request_notification: hasRideRequestNotification,
      has_new_ride: hasNewRide,
      all_notifications: notificationsReceived
    });
    
    // Step 9: Test conclusion
    console.log('\n🎯 FINAL CONCLUSION:');
    console.log('==================');
    
    if (hasRideRequestNotification) {
      console.log('✅ SUCCESS: Driver received ride request notification via WebSocket');
    } else {
      console.log('❌ FAILURE: Driver did NOT receive ride request notification');
    }
    
    if (hasNewRide) {
      console.log('✅ SUCCESS: New ride appears in available rides');
    } else {
      console.log('❌ FAILURE: New ride does NOT appear in available rides');
    }
    
    if (hasRideRequestNotification && hasNewRide) {
      console.log('\n🎉 OVERALL: Driver notification system is working correctly!');
    } else {
      console.log('\n🚨 OVERALL: Driver notification system has issues!');
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('driver_notification_debug_results.json', JSON.stringify({
      testResults,
      notificationsReceived,
      finalAnalysis: {
        hasRideRequestNotification,
        hasNewRide,
        success: hasRideRequestNotification && hasNewRide
      }
    }, null, 2));
    
    console.log('\n📄 Detailed results saved to: driver_notification_debug_results.json');
    
  } catch (error) {
    await logStep(999, 'Test failed with error', { 
      error: error.response?.data || error.message,
      stack: error.stack 
    });
    console.error('❌ Test failed with error:', error.response?.data || error.message);
  } finally {
    // Cleanup
    if (driverSocket) {
      driverSocket.close();
    }
  }
}

// Run the test
testNotificationFlow().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
