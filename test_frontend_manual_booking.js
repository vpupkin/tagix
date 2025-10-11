#!/usr/bin/env node

/**
 * Frontend Manual Booking Test
 * 
 * This test verifies that the frontend manual booking functionality
 * works by testing the actual API endpoints that the frontend uses.
 */

const axios = require('axios');

const API_URL = 'http://localhost:8001';
const FRONTEND_URL = 'http://localhost:3000';

async function testFrontendManualBooking() {
  console.log('🧪 Testing Frontend Manual Booking API Integration\n');
  
  try {
    // Step 1: Register a test rider
    console.log('1. Registering test rider...');
    const riderData = {
      name: "Frontend Manual Test Rider",
      email: "frontend.manual@test.com",
      password: "testpass123",
      phone: "+1234567890",
      role: "rider"
    };
    
    const registerResponse = await axios.post(`${API_URL}/api/auth/register`, riderData);
    console.log('✅ Rider registered successfully');
    
    // Step 2: Login to get token
    console.log('\n2. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: riderData.email,
      password: riderData.password
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful');
    
    // Step 3: Test manual ride booking with exact frontend data structure
    console.log('\n3. Testing manual ride booking...');
    
    // Simulate the exact data structure that the frontend creates
    const rideData = {
      pickup_location: {
        latitude: 48.7758,
        longitude: 9.1829,
        address: "48.7758, 9.1829" // Coordinate input
      },
      dropoff_location: {
        latitude: 48.7849,
        longitude: 9.1929,
        address: "Stuttgart Central Station" // Address input
      },
      vehicle_type: "economy",
      passenger_count: 1,
      special_requirements: "Frontend manual test ride"
    };
    
    console.log('   Pickup:', rideData.pickup_location.address);
    console.log('   Dropoff:', rideData.dropoff_location.address);
    console.log('   Vehicle Type:', rideData.vehicle_type);
    
    const rideResponse = await axios.post(`${API_URL}/api/rides/request`, rideData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (rideResponse.status === 200) {
      const responseData = rideResponse.data;
      console.log('✅ Manual ride booking successful!');
      console.log(`   Request ID: ${responseData.request_id}`);
      console.log(`   Estimated Fare: Ⓣ${responseData.estimated_fare}`);
      console.log(`   Matches Found: ${responseData.matches_found}`);
      
      // Step 4: Verify the ride appears in the unified API
      console.log('\n4. Verifying ride in unified API...');
      const unifiedResponse = await axios.get(`${API_URL}/api/rides/unified`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (unifiedResponse.status === 200) {
        const unifiedData = unifiedResponse.data;
        console.log('✅ Unified API response received');
        console.log(`   Pending Rides: ${unifiedData.pending_rides?.length || 0}`);
        console.log(`   Active Rides: ${unifiedData.active_rides?.length || 0}`);
        console.log(`   Completed Rides: ${unifiedData.completed_rides?.length || 0}`);
        
        // Check if our manual ride is in the response
        const allRides = [
          ...(unifiedData.pending_rides || []),
          ...(unifiedData.active_rides || []),
          ...(unifiedData.completed_rides || [])
        ];
        
        const ourRide = allRides.find(ride => ride.id === responseData.request_id);
        if (ourRide) {
          console.log('✅ Manual ride found in unified API');
          console.log(`   Status: ${ourRide.status}`);
          console.log(`   Pickup: ${ourRide.pickup_location.address}`);
          console.log(`   Dropoff: ${ourRide.dropoff_location.address}`);
        } else {
          console.log('⚠️  Manual ride not found in unified API');
        }
      }
      
      return {
        success: true,
        request_id: responseData.request_id,
        estimated_fare: responseData.estimated_fare,
        matches_found: responseData.matches_found
      };
      
    } else {
      console.log('❌ Manual ride booking failed');
      console.log('   Status:', rideResponse.status);
      console.log('   Response:', rideResponse.data);
      return { success: false, error: 'Ride booking failed' };
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
    return { success: false, error: error.message };
  }
}

async function testFrontendAccessibility() {
  console.log('\n🌐 Testing Frontend Accessibility\n');
  
  try {
    // Test if frontend is accessible
    console.log('1. Testing frontend accessibility...');
    const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 });
    
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is accessible');
      console.log(`   Status: ${frontendResponse.status}`);
      console.log(`   Content-Type: ${frontendResponse.headers['content-type']}`);
      
      // Check if it's a React app
      if (frontendResponse.data.includes('react') || frontendResponse.data.includes('React')) {
        console.log('✅ React application detected');
      }
      
      return true;
    } else {
      console.log('❌ Frontend not accessible');
      console.log(`   Status: ${frontendResponse.status}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Frontend accessibility test failed:');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testBackendAPI() {
  console.log('\n🔧 Testing Backend API\n');
  
  try {
    // Test if backend is accessible
    console.log('1. Testing backend API accessibility...');
    const backendResponse = await axios.get(`${API_URL}/docs`, { timeout: 5000 });
    
    if (backendResponse.status === 200) {
      console.log('✅ Backend API is accessible');
      console.log(`   Status: ${backendResponse.status}`);
      console.log(`   API Documentation available at: ${API_URL}/docs`);
      
      return true;
    } else {
      console.log('❌ Backend API not accessible');
      console.log(`   Status: ${backendResponse.status}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Backend API test failed:');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚗 Frontend Manual Booking Test Suite');
  console.log('=====================================\n');
  
  // Test backend API
  const backendOk = await testBackendAPI();
  
  // Test frontend accessibility
  const frontendOk = await testFrontendAccessibility();
  
  if (!backendOk) {
    console.log('\n❌ Backend API is not accessible. Please start the backend server.');
    return;
  }
  
  if (!frontendOk) {
    console.log('\n⚠️  Frontend is not accessible. Please start the frontend server.');
    console.log('   You can still test the API functionality below.');
  }
  
  // Test manual ride booking
  const result = await testFrontendManualBooking();
  
  console.log('\n📊 Test Summary');
  console.log('================');
  if (result.success) {
    console.log('✅ All tests passed!');
    console.log(`   Request ID: ${result.request_id}`);
    console.log(`   Estimated Fare: Ⓣ${result.estimated_fare}`);
    console.log(`   Driver Matches: ${result.matches_found}`);
  } else {
    console.log('❌ Tests failed!');
    console.log(`   Error: ${result.error}`);
  }
  
  console.log('\n💡 Manual Testing Instructions:');
  console.log('   1. Open http://localhost:3000 in your browser');
  console.log('   2. Register/Login as a rider');
  console.log('   3. Navigate to ride booking page');
  console.log('   4. Test manual entry without Google Maps API');
  console.log('   5. Try these inputs:');
  console.log('      - "48.7758, 9.1829" (coordinates)');
  console.log('      - "Stuttgart, Germany" (address)');
  console.log('      - Manual coordinate input');
  console.log('   6. Verify "Use This Location" and "Use Coordinates" buttons work');
  console.log('   7. Complete a ride booking');
  
  console.log('\n🔗 Test Files Created:');
  console.log('   - test_manual_ui_simple.html (Interactive UI test)');
  console.log('   - test_manual_buttons.html (Button functionality test)');
  console.log('   - test_manual_ui_debug.html (Debug UI test)');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  testFrontendManualBooking, 
  testFrontendAccessibility, 
  testBackendAPI 
};
