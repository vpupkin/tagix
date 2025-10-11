const axios = require('axios');
const WebSocket = require('ws');

const API_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

// Test configuration
const TEST_CONFIG = {
  rider: {
    email: 'test_rider_notification@example.com',
    password: 'password123',
    name: 'Test Rider'
  },
  driver: {
    email: 'test_driver_notification@example.com',
    password: 'password123',
    name: 'Test Driver'
  }
};

let riderToken = null;
let driverToken = null;
let driverSocket = null;
let notificationsReceived = [];

async function setupTestUsers() {
  console.log('🔧 Setting up test users...');
  
  try {
    // Register rider
    await axios.post(`${API_URL}/api/auth/register`, {
      email: TEST_CONFIG.rider.email,
      password: TEST_CONFIG.rider.password,
      name: TEST_CONFIG.rider.name,
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
      email: TEST_CONFIG.driver.email,
      password: TEST_CONFIG.driver.password,
      name: TEST_CONFIG.driver.name,
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
    email: TEST_CONFIG.rider.email,
    password: TEST_CONFIG.rider.password
  });
  riderToken = riderLogin.data.access_token;
  console.log('✅ Rider logged in');

  // Login driver
  const driverLogin = await axios.post(`${API_URL}/api/auth/login`, {
    email: TEST_CONFIG.driver.email,
    password: TEST_CONFIG.driver.password
  });
  driverToken = driverLogin.data.access_token;
  console.log('✅ Driver logged in');
}

async function setupDriverWebSocket() {
  console.log('🔌 Setting up driver WebSocket connection...');
  
  return new Promise((resolve, reject) => {
    driverSocket = new WebSocket(`${WS_URL}?token=${driverToken}`);
    
    driverSocket.on('open', () => {
      console.log('✅ Driver WebSocket connected');
      resolve();
    });
    
    driverSocket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Driver received WebSocket message:', message);
        notificationsReceived.push(message);
        
        if (message.type === 'ride_request') {
          console.log('🎯 RIDE REQUEST NOTIFICATION RECEIVED!');
          console.log('📋 Ride details:', {
            id: message.id,
            pickup: message.pickup_address || message.pickup_location?.address,
            dropoff: message.dropoff_address || message.dropoff_location?.address,
            fare: message.estimated_fare
          });
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    });
    
    driverSocket.on('error', (error) => {
      console.error('❌ Driver WebSocket error:', error);
      reject(error);
    });
    
    driverSocket.on('close', () => {
      console.log('🔌 Driver WebSocket disconnected');
    });
  });
}

async function setDriverOnline() {
  console.log('🚗 Setting driver online...');
  
  const response = await axios.post(`${API_URL}/api/driver/status`, {
    is_online: true,
    latitude: 48.6408,
    longitude: 9.8337,
    radius_km: 25
  }, {
    headers: {
      'Authorization': `Bearer ${driverToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ Driver set online:', response.data);
}

async function bookRide() {
  console.log('📱 Booking a new ride...');
  
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
    special_requirements: 'Test ride for notification'
  };

  const response = await axios.post(`${API_URL}/api/rides/request`, rideData, {
    headers: {
      'Authorization': `Bearer ${riderToken}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('✅ Ride booked successfully:', response.data);
  return response.data;
}

async function checkAvailableRides() {
  console.log('🔍 Checking available rides for driver...');
  
  try {
    const response = await axios.get(`${API_URL}/api/rides/available`, {
      headers: {
        'Authorization': `Bearer ${driverToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📋 Available rides:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching available rides:', error.response?.data);
    return null;
  }
}

async function testNotificationFlow() {
  console.log('🧪 Starting comprehensive driver notification test...\n');
  
  try {
    // Step 1: Setup
    await setupTestUsers();
    console.log('');
    
    // Step 2: Setup WebSocket
    await setupDriverWebSocket();
    console.log('');
    
    // Step 3: Set driver online
    await setDriverOnline();
    console.log('');
    
    // Step 4: Check initial available rides
    const initialRides = await checkAvailableRides();
    console.log('');
    
    // Step 5: Book a ride
    const rideResult = await bookRide();
    console.log('');
    
    // Step 6: Wait for notifications
    console.log('⏳ Waiting 5 seconds for notifications...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');
    
    // Step 7: Check available rides again
    const updatedRides = await checkAvailableRides();
    console.log('');
    
    // Step 8: Analyze results
    console.log('📊 TEST RESULTS:');
    console.log('================');
    console.log(`📨 Total notifications received: ${notificationsReceived.length}`);
    console.log(`🚗 Ride request notifications: ${notificationsReceived.filter(n => n.type === 'ride_request').length}`);
    console.log(`📋 Initial available rides: ${Array.isArray(initialRides) ? initialRides.length : 'Error'}`);
    console.log(`📋 Updated available rides: ${Array.isArray(updatedRides) ? updatedRides.length : 'Error'}`);
    
    if (notificationsReceived.length > 0) {
      console.log('\n📨 All notifications received:');
      notificationsReceived.forEach((notification, index) => {
        console.log(`  ${index + 1}. Type: ${notification.type}`);
        console.log(`     Data:`, JSON.stringify(notification, null, 2));
      });
    }
    
    // Step 9: Test conclusion
    const hasRideRequestNotification = notificationsReceived.some(n => n.type === 'ride_request');
    const hasNewRide = Array.isArray(updatedRides) && updatedRides.length > (Array.isArray(initialRides) ? initialRides.length : 0);
    
    console.log('\n🎯 CONCLUSION:');
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
    
  } catch (error) {
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
