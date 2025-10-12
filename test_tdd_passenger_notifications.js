/**
 * TDD Test Suite: Passenger Notifications with Audible Alerts
 * 
 * This test suite follows Test-Driven Development approach:
 * 1. Write failing tests first
 * 2. Run tests to confirm they fail
 * 3. Implement functionality to make tests pass
 * 4. Refactor and optimize
 * 
 * Requirements from QA Enforcement Charter:
 * - Driver → Passenger: On "Accept", "En-route", "Arrived", "Trip started", "Completed", "Canceled"
 * - Passenger UI refreshes immediately and plays mandatory audible alert
 * - SLO: Accept/Arrived → passenger: P95 ≤ 1.0s, P50 ≤ 500ms
 * - Delivery success ≥ 99.9% for foreground and background
 */

const axios = require('axios');
const WebSocket = require('ws');

// Test configuration
const API_URL = 'http://localhost:8001';
const WS_URL = 'ws://localhost:8001/ws';

// Test data
const testRider = {
  email: 'tdd_passenger@test.com',
  password: 'testpass123',
  name: 'TDD Passenger',
  phone: '+1234567890',
  role: 'rider'
};

const testDriver = {
  email: 'tdd_passenger_driver@test.com',
  password: 'testpass123',
  name: 'TDD Passenger Driver',
  phone: '+1234567891',
  role: 'driver'
};

let riderToken = null;
let driverToken = null;
let riderId = null;
let driverId = null;
let currentRideId = null;

// Test metrics
const testMetrics = {
  passengerNotifications: [],
  latencies: [],
  errors: []
};

/**
 * Test 1: Passenger receives immediate notification on ride acceptance
 * Expected to FAIL initially - no audible alert system exists
 */
async function testPassengerRideAcceptanceNotification() {
  console.log('\n🧪 Test 1: Passenger receives immediate notification on ride acceptance');
  
  const startTime = Date.now();
  let notificationReceived = false;
  let audibleAlertTriggered = false;
  let uiRefreshTriggered = false;
  
  // Setup WebSocket connection for passenger
  const passengerWs = new WebSocket(`${WS_URL}/${riderId}`);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      passengerWs.close();
      reject(new Error('Test timeout - passenger notification not received within 5 seconds'));
    }, 5000);
    
    passengerWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        const latency = Date.now() - startTime;
        
        if (message.type === 'ride_accepted') {
          notificationReceived = true;
          testMetrics.passengerNotifications.push({
            test: 'ride_acceptance',
            latency: latency,
            timestamp: new Date().toISOString(),
            message: message
          });
          
          // Check for audible alert (this will FAIL initially)
          if (message.audible_alert === true) {
            audibleAlertTriggered = true;
          }
          
          // Check for UI refresh (this will FAIL initially)
          if (message.ui_refresh === true) {
            uiRefreshTriggered = true;
          }
          
          clearTimeout(timeout);
          passengerWs.close();
          
          // Assertions
          if (!notificationReceived) {
            reject(new Error('FAIL: Passenger did not receive notification'));
          }
          
          if (!audibleAlertTriggered) {
            reject(new Error('FAIL: Audible alert not triggered (expected to fail initially)'));
          }
          
          if (!uiRefreshTriggered) {
            reject(new Error('FAIL: UI refresh not triggered (expected to fail initially)'));
          }
          
          if (latency > 1000) { // P95 SLO for passenger notifications
            reject(new Error(`FAIL: Latency ${latency}ms exceeds P95 SLO of 1000ms`));
          }
          
          console.log(`✅ Passenger notification received in ${latency}ms`);
          console.log(`❌ Audible alert triggered: ${audibleAlertTriggered} (expected to fail)`);
          console.log(`❌ UI refresh triggered: ${uiRefreshTriggered} (expected to fail)`);
          resolve();
        }
      } catch (error) {
        reject(new Error(`WebSocket message parsing error: ${error.message}`));
      }
    });
    
    passengerWs.on('open', async () => {
      // Create ride request first
      try {
        const rideRequest = {
          pickup_location: {
            address: '123 Passenger Test St, Test City',
            lat: 40.7128,
            lng: -74.0060
          },
          dropoff_location: {
            address: '456 Passenger Test Ave, Test City',
            lat: 40.7589,
            lng: -73.9851
          },
          vehicle_type: 'economy',
          passenger_count: 1,
          special_requirements: 'TDD passenger test ride'
        };
        
        const response = await axios.post(`${API_URL}/api/rides/request`, rideRequest, {
          headers: { Authorization: `Bearer ${riderToken}` }
        });
        
        currentRideId = response.data.request_id;
        
        // Driver accepts the ride
        await axios.post(`${API_URL}/api/rides/${currentRideId}/accept`, {}, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
      } catch (error) {
        reject(new Error(`Ride acceptance failed: ${error.message}`));
      }
    });
  });
}

/**
 * Test 2: Passenger receives notification on driver arrival
 * Expected to FAIL initially - no audible alert system exists
 */
async function testPassengerDriverArrivalNotification() {
  console.log('\n🧪 Test 2: Passenger receives notification on driver arrival');
  
  const startTime = Date.now();
  let notificationReceived = false;
  let audibleAlertTriggered = false;
  let uiRefreshTriggered = false;
  
  // Setup WebSocket connection for passenger
  const passengerWs = new WebSocket(`${WS_URL}/${riderId}`);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      passengerWs.close();
      reject(new Error('Test timeout - driver arrival notification not received within 5 seconds'));
    }, 5000);
    
    passengerWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        const latency = Date.now() - startTime;
        
        if (message.type === 'driver_arrived') {
          notificationReceived = true;
          testMetrics.passengerNotifications.push({
            test: 'driver_arrival',
            latency: latency,
            timestamp: new Date().toISOString(),
            message: message
          });
          
          // Check for audible alert (this will FAIL initially)
          if (message.audible_alert === true) {
            audibleAlertTriggered = true;
          }
          
          // Check for UI refresh (this will FAIL initially)
          if (message.ui_refresh === true) {
            uiRefreshTriggered = true;
          }
          
          clearTimeout(timeout);
          passengerWs.close();
          
          // Assertions
          if (!notificationReceived) {
            reject(new Error('FAIL: Passenger did not receive driver arrival notification'));
          }
          
          if (!audibleAlertTriggered) {
            reject(new Error('FAIL: Audible alert not triggered (expected to fail initially)'));
          }
          
          if (!uiRefreshTriggered) {
            reject(new Error('FAIL: UI refresh not triggered (expected to fail initially)'));
          }
          
          if (latency > 1000) { // P95 SLO for passenger notifications
            reject(new Error(`FAIL: Latency ${latency}ms exceeds P95 SLO of 1000ms`));
          }
          
          console.log(`✅ Driver arrival notification received in ${latency}ms`);
          console.log(`❌ Audible alert triggered: ${audibleAlertTriggered} (expected to fail)`);
          console.log(`❌ UI refresh triggered: ${uiRefreshTriggered} (expected to fail)`);
          resolve();
        }
      } catch (error) {
        reject(new Error(`WebSocket message parsing error: ${error.message}`));
      }
    });
    
    passengerWs.on('open', async () => {
      // Create and accept ride first
      try {
        const rideRequest = {
          pickup_location: {
            address: '789 Passenger Test Blvd, Test City',
            lat: 40.7505,
            lng: -73.9934
          },
          dropoff_location: {
            address: '321 Passenger Test Rd, Test City',
            lat: 40.7614,
            lng: -73.9776
          },
          vehicle_type: 'comfort',
          passenger_count: 2,
          special_requirements: 'TDD driver arrival test'
        };
        
        const response = await axios.post(`${API_URL}/api/rides/request`, rideRequest, {
          headers: { Authorization: `Bearer ${riderToken}` }
        });
        
        const rideId = response.data.request_id;
        
        // Driver accepts the ride
        await axios.post(`${API_URL}/api/rides/${rideId}/accept`, {}, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
        // Wait a moment for acceptance to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Driver marks as arrived
        await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
          action: 'arrive'
        }, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
      } catch (error) {
        reject(new Error(`Driver arrival test failed: ${error.message}`));
      }
    });
  });
}

/**
 * Test 3: Passenger receives notification on ride start
 * Expected to FAIL initially - no audible alert system exists
 */
async function testPassengerRideStartNotification() {
  console.log('\n🧪 Test 3: Passenger receives notification on ride start');
  
  const startTime = Date.now();
  let notificationReceived = false;
  let audibleAlertTriggered = false;
  let uiRefreshTriggered = false;
  
  // Setup WebSocket connection for passenger
  const passengerWs = new WebSocket(`${WS_URL}/${riderId}`);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      passengerWs.close();
      reject(new Error('Test timeout - ride start notification not received within 5 seconds'));
    }, 5000);
    
    passengerWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        const latency = Date.now() - startTime;
        
        if (message.type === 'ride_started') {
          notificationReceived = true;
          testMetrics.passengerNotifications.push({
            test: 'ride_start',
            latency: latency,
            timestamp: new Date().toISOString(),
            message: message
          });
          
          // Check for audible alert (this will FAIL initially)
          if (message.audible_alert === true) {
            audibleAlertTriggered = true;
          }
          
          // Check for UI refresh (this will FAIL initially)
          if (message.ui_refresh === true) {
            uiRefreshTriggered = true;
          }
          
          clearTimeout(timeout);
          passengerWs.close();
          
          // Assertions
          if (!notificationReceived) {
            reject(new Error('FAIL: Passenger did not receive ride start notification'));
          }
          
          if (!audibleAlertTriggered) {
            reject(new Error('FAIL: Audible alert not triggered (expected to fail initially)'));
          }
          
          if (!uiRefreshTriggered) {
            reject(new Error('FAIL: UI refresh not triggered (expected to fail initially)'));
          }
          
          if (latency > 1000) { // P95 SLO for passenger notifications
            reject(new Error(`FAIL: Latency ${latency}ms exceeds P95 SLO of 1000ms`));
          }
          
          console.log(`✅ Ride start notification received in ${latency}ms`);
          console.log(`❌ Audible alert triggered: ${audibleAlertTriggered} (expected to fail)`);
          console.log(`❌ UI refresh triggered: ${uiRefreshTriggered} (expected to fail)`);
          resolve();
        }
      } catch (error) {
        reject(new Error(`WebSocket message parsing error: ${error.message}`));
      }
    });
    
    passengerWs.on('open', async () => {
      // Create, accept, and start ride
      try {
        const rideRequest = {
          pickup_location: {
            address: '999 Passenger Test Plaza, Test City',
            lat: 40.7282,
            lng: -73.7949
          },
          dropoff_location: {
            address: '111 Passenger Test Square, Test City',
            lat: 40.7505,
            lng: -73.9934
          },
          vehicle_type: 'economy',
          passenger_count: 1,
          special_requirements: 'TDD ride start test'
        };
        
        const response = await axios.post(`${API_URL}/api/rides/request`, rideRequest, {
          headers: { Authorization: `Bearer ${riderToken}` }
        });
        
        const rideId = response.data.request_id;
        
        // Driver accepts the ride
        await axios.post(`${API_URL}/api/rides/${rideId}/accept`, {}, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
        // Wait a moment for acceptance to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Driver marks as arrived
        await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
          action: 'arrive'
        }, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
        // Wait a moment for arrival to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Driver starts the ride
        await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
          action: 'start'
        }, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
      } catch (error) {
        reject(new Error(`Ride start test failed: ${error.message}`));
      }
    });
  });
}

/**
 * Test 4: Passenger receives notification on ride completion
 * Expected to FAIL initially - no audible alert system exists
 */
async function testPassengerRideCompletionNotification() {
  console.log('\n🧪 Test 4: Passenger receives notification on ride completion');
  
  const startTime = Date.now();
  let notificationReceived = false;
  let audibleAlertTriggered = false;
  let uiRefreshTriggered = false;
  
  // Setup WebSocket connection for passenger
  const passengerWs = new WebSocket(`${WS_URL}/${riderId}`);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      passengerWs.close();
      reject(new Error('Test timeout - ride completion notification not received within 5 seconds'));
    }, 5000);
    
    passengerWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        const latency = Date.now() - startTime;
        
        if (message.type === 'ride_completed') {
          notificationReceived = true;
          testMetrics.passengerNotifications.push({
            test: 'ride_completion',
            latency: latency,
            timestamp: new Date().toISOString(),
            message: message
          });
          
          // Check for audible alert (this will FAIL initially)
          if (message.audible_alert === true) {
            audibleAlertTriggered = true;
          }
          
          // Check for UI refresh (this will FAIL initially)
          if (message.ui_refresh === true) {
            uiRefreshTriggered = true;
          }
          
          clearTimeout(timeout);
          passengerWs.close();
          
          // Assertions
          if (!notificationReceived) {
            reject(new Error('FAIL: Passenger did not receive ride completion notification'));
          }
          
          if (!audibleAlertTriggered) {
            reject(new Error('FAIL: Audible alert not triggered (expected to fail initially)'));
          }
          
          if (!uiRefreshTriggered) {
            reject(new Error('FAIL: UI refresh not triggered (expected to fail initially)'));
          }
          
          if (latency > 1000) { // P95 SLO for passenger notifications
            reject(new Error(`FAIL: Latency ${latency}ms exceeds P95 SLO of 1000ms`));
          }
          
          console.log(`✅ Ride completion notification received in ${latency}ms`);
          console.log(`❌ Audible alert triggered: ${audibleAlertTriggered} (expected to fail)`);
          console.log(`❌ UI refresh triggered: ${uiRefreshTriggered} (expected to fail)`);
          resolve();
        }
      } catch (error) {
        reject(new Error(`WebSocket message parsing error: ${error.message}`));
      }
    });
    
    passengerWs.on('open', async () => {
      // Create, accept, start, and complete ride
      try {
        const rideRequest = {
          pickup_location: {
            address: '555 Passenger Test Circle, Test City',
            lat: 40.6892,
            lng: -74.0445
          },
          dropoff_location: {
            address: '777 Passenger Test Drive, Test City',
            lat: 40.7589,
            lng: -73.9851
          },
          vehicle_type: 'comfort',
          passenger_count: 2,
          special_requirements: 'TDD ride completion test'
        };
        
        const response = await axios.post(`${API_URL}/api/rides/request`, rideRequest, {
          headers: { Authorization: `Bearer ${riderToken}` }
        });
        
        const rideId = response.data.request_id;
        
        // Driver accepts the ride
        await axios.post(`${API_URL}/api/rides/${rideId}/accept`, {}, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
        // Wait a moment for acceptance to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Driver marks as arrived
        await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
          action: 'arrive'
        }, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
        // Wait a moment for arrival to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Driver starts the ride
        await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
          action: 'start'
        }, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
        // Wait a moment for start to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Driver completes the ride
        await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
          action: 'complete'
        }, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
      } catch (error) {
        reject(new Error(`Ride completion test failed: ${error.message}`));
      }
    });
  });
}

/**
 * Test 5: Passenger receives notification on ride cancellation
 * Expected to FAIL initially - no audible alert system exists
 */
async function testPassengerRideCancellationNotification() {
  console.log('\n🧪 Test 5: Passenger receives notification on ride cancellation');
  
  const startTime = Date.now();
  let notificationReceived = false;
  let audibleAlertTriggered = false;
  let uiRefreshTriggered = false;
  
  // Setup WebSocket connection for passenger
  const passengerWs = new WebSocket(`${WS_URL}/${riderId}`);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      passengerWs.close();
      reject(new Error('Test timeout - ride cancellation notification not received within 5 seconds'));
    }, 5000);
    
    passengerWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        const latency = Date.now() - startTime;
        
        if (message.type === 'ride_cancelled') {
          notificationReceived = true;
          testMetrics.passengerNotifications.push({
            test: 'ride_cancellation',
            latency: latency,
            timestamp: new Date().toISOString(),
            message: message
          });
          
          // Check for audible alert (this will FAIL initially)
          if (message.audible_alert === true) {
            audibleAlertTriggered = true;
          }
          
          // Check for UI refresh (this will FAIL initially)
          if (message.ui_refresh === true) {
            uiRefreshTriggered = true;
          }
          
          clearTimeout(timeout);
          passengerWs.close();
          
          // Assertions
          if (!notificationReceived) {
            reject(new Error('FAIL: Passenger did not receive ride cancellation notification'));
          }
          
          if (!audibleAlertTriggered) {
            reject(new Error('FAIL: Audible alert not triggered (expected to fail initially)'));
          }
          
          if (!uiRefreshTriggered) {
            reject(new Error('FAIL: UI refresh not triggered (expected to fail initially)'));
          }
          
          if (latency > 1000) { // P95 SLO for passenger notifications
            reject(new Error(`FAIL: Latency ${latency}ms exceeds P95 SLO of 1000ms`));
          }
          
          console.log(`✅ Ride cancellation notification received in ${latency}ms`);
          console.log(`❌ Audible alert triggered: ${audibleAlertTriggered} (expected to fail)`);
          console.log(`❌ UI refresh triggered: ${uiRefreshTriggered} (expected to fail)`);
          resolve();
        }
      } catch (error) {
        reject(new Error(`WebSocket message parsing error: ${error.message}`));
      }
    });
    
    passengerWs.on('open', async () => {
      // Create and accept ride first
      try {
        const rideRequest = {
          pickup_location: {
            address: '888 Passenger Test Lane, Test City',
            lat: 40.6892,
            lng: -74.0445
          },
          dropoff_location: {
            address: '222 Passenger Test Way, Test City',
            lat: 40.7589,
            lng: -73.9851
          },
          vehicle_type: 'economy',
          passenger_count: 1,
          special_requirements: 'TDD ride cancellation test'
        };
        
        const response = await axios.post(`${API_URL}/api/rides/request`, rideRequest, {
          headers: { Authorization: `Bearer ${riderToken}` }
        });
        
        const rideId = response.data.request_id;
        
        // Driver accepts the ride
        await axios.post(`${API_URL}/api/rides/${rideId}/accept`, {}, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
        // Wait a moment for acceptance to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Driver cancels the ride
        await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
          action: 'cancel'
        }, {
          headers: { Authorization: `Bearer ${driverToken}` }
        });
        
      } catch (error) {
        reject(new Error(`Ride cancellation test failed: ${error.message}`));
      }
    });
  });
}

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  console.log('🔧 Setting up passenger test environment...');
  
  try {
    // Register test rider
    try {
      const riderResponse = await axios.post(`${API_URL}/api/auth/register`, testRider);
      riderToken = riderResponse.data.access_token;
      riderId = riderResponse.data.user.id;
      console.log('✅ Test passenger registered');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
        // Login existing rider
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
          email: testRider.email,
          password: testRider.password
        });
        riderToken = loginResponse.data.access_token;
        riderId = loginResponse.data.user.id;
        console.log('✅ Test passenger logged in');
      } else {
        throw error;
      }
    }
    
    // Register test driver
    try {
      const driverResponse = await axios.post(`${API_URL}/api/auth/register`, testDriver);
      driverToken = driverResponse.data.access_token;
      driverId = driverResponse.data.user.id;
      console.log('✅ Test driver registered');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
        // Login existing driver
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
          email: testDriver.email,
          password: testDriver.password
        });
        driverToken = loginResponse.data.access_token;
        driverId = loginResponse.data.user.id;
        console.log('✅ Test driver logged in');
      } else {
        throw error;
      }
    }
    
    // Set driver online and location
    await axios.post(`${API_URL}/api/driver/online`, {}, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    
    await axios.post(`${API_URL}/api/location/update`, {
      lat: 40.7128,
      lng: -74.0060
    }, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    
    console.log('✅ Passenger test environment setup complete');
    
  } catch (error) {
    throw new Error(`Passenger test environment setup failed: ${error.message}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting TDD Test Suite: Passenger Notifications');
  console.log('📋 Expected: Most tests will FAIL initially (this is correct for TDD)');
  
  const testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  try {
    await setupTestEnvironment();
    
    // Run tests
    const tests = [
      { name: 'Passenger Ride Acceptance Notification', fn: testPassengerRideAcceptanceNotification },
      { name: 'Passenger Driver Arrival Notification', fn: testPassengerDriverArrivalNotification },
      { name: 'Passenger Ride Start Notification', fn: testPassengerRideStartNotification },
      { name: 'Passenger Ride Completion Notification', fn: testPassengerRideCompletionNotification },
      { name: 'Passenger Ride Cancellation Notification', fn: testPassengerRideCancellationNotification }
    ];
    
    for (const test of tests) {
      try {
        console.log(`\n🧪 Running: ${test.name}`);
        await test.fn();
        testResults.passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } catch (error) {
        testResults.failed++;
        testResults.errors.push({ test: test.name, error: error.message });
        console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test suite setup failed:', error.message);
    testResults.errors.push({ test: 'Setup', error: error.message });
  }
  
  // Print results
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.passed + testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }
  
  console.log('\n🎯 TDD Status: Tests are expected to FAIL initially');
  console.log('📝 Next: Implement functionality to make tests pass');
  
  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testPassengerRideAcceptanceNotification,
  testPassengerDriverArrivalNotification,
  testPassengerRideStartNotification,
  testPassengerRideCompletionNotification,
  testPassengerRideCancellationNotification
};
