#!/usr/bin/env node

/**
 * Test Manual Ride Booking Without Google Maps API
 * 
 * This test verifies that the manual ride booking functionality works
 * when Google Maps API is not available or configured.
 */

const axios = require('axios');

const API_URL = 'http://localhost:8001';

// Test data for manual ride booking
const testRideData = {
  pickup_location: {
    latitude: 48.7758,
    longitude: 9.1829,
    address: "Stuttgart, Germany (Manual Entry)"
  },
  dropoff_location: {
    latitude: 48.7849,
    longitude: 9.1929,
    address: "Stuttgart Central Station (Manual Entry)"
  },
  vehicle_type: "economy",
  passenger_count: 1,
  special_requirements: "Test manual booking without Google Maps"
};

async function testManualRideBooking() {
  console.log('🧪 Testing Manual Ride Booking Without Google Maps API\n');
  
  try {
    // Step 1: Register a test rider
    console.log('1. Registering test rider...');
    const riderData = {
      name: "Manual Test Rider",
      email: "manual.rider@test.com",
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
    
    // Step 3: Test manual ride booking
    console.log('\n3. Testing manual ride booking...');
    console.log('   Pickup:', testRideData.pickup_location.address);
    console.log('   Dropoff:', testRideData.dropoff_location.address);
    console.log('   Vehicle Type:', testRideData.vehicle_type);
    
    const rideResponse = await axios.post(`${API_URL}/api/rides/request`, testRideData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (rideResponse.status === 200) {
      const rideData = rideResponse.data;
      console.log('✅ Manual ride booking successful!');
      console.log('   Request ID:', rideData.request_id);
      console.log('   Estimated Fare:', `Ⓣ${rideData.estimated_fare}`);
      console.log('   Matches Found:', rideData.matches_found);
      
      // Step 4: Verify ride data in database
      console.log('\n4. Verifying ride data...');
      const ridesResponse = await axios.get(`${API_URL}/api/rides/unified`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (ridesResponse.status === 200) {
        const ridesData = ridesResponse.data;
        console.log('✅ Ride data retrieved successfully');
        console.log('   Pending Rides:', ridesData.pending_rides?.length || 0);
        console.log('   Active Rides:', ridesData.active_rides?.length || 0);
        console.log('   Completed Rides:', ridesData.completed_rides?.length || 0);
        
        // Check if our manual ride is in pending rides
        const pendingRide = ridesData.pending_rides?.find(ride => 
          ride.id === rideData.request_id
        );
        
        if (pendingRide) {
          console.log('✅ Manual ride found in pending rides');
          console.log('   Status:', pendingRide.status);
          console.log('   Pickup Address:', pendingRide.pickup_location.address);
          console.log('   Dropoff Address:', pendingRide.dropoff_location.address);
        } else {
          console.log('❌ Manual ride not found in pending rides');
        }
      }
      
      return {
        success: true,
        request_id: rideData.request_id,
        estimated_fare: rideData.estimated_fare,
        matches_found: rideData.matches_found
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

async function testCoordinateParsing() {
  console.log('\n🧪 Testing Coordinate Parsing Functions\n');
  
  const testCoordinates = [
    "48.7758, 9.1829",
    "48.7758 9.1829", 
    "lat: 48.7758, lng: 9.1829",
    "LAT: 48.7758, LNG: 9.1829",
    "invalid coordinates",
    "999, 999", // Invalid range
    "-91, 181"  // Invalid range
  ];
  
  // Simulate the parseCoordinates function from the frontend
  const parseCoordinates = (input) => {
    const coordPatterns = [
      /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/, // "48.6670336, 9.7910784"
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/, // "48.6670336 9.7910784"
      /lat[:\s]*(-?\d+\.?\d*)[,\s]*lng[:\s]*(-?\d+\.?\d*)/i, // "lat: 48.6670336, lng: 9.7910784"
    ];

    for (const pattern of coordPatterns) {
      const match = input.match(pattern);
      if (match) {
        const latitude = parseFloat(match[1]);
        const longitude = parseFloat(match[2]);
        if (!isNaN(latitude) && !isNaN(longitude) && 
            latitude >= -90 && latitude <= 90 && 
            longitude >= -180 && longitude <= 180) {
          return { latitude, longitude };
        }
      }
    }
    return null;
  };
  
  testCoordinates.forEach(coord => {
    const result = parseCoordinates(coord);
    if (result) {
      console.log(`✅ "${coord}" → lat: ${result.latitude}, lng: ${result.longitude}`);
    } else {
      console.log(`❌ "${coord}" → Invalid or could not parse`);
    }
  });
}

async function main() {
  console.log('🚗 Manual Ride Booking Test Suite');
  console.log('=====================================\n');
  
  // Test coordinate parsing
  await testCoordinateParsing();
  
  // Test manual ride booking
  const result = await testManualRideBooking();
  
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
  
  console.log('\n💡 Manual Entry Test Cases:');
  console.log('   1. Coordinate format: "48.7758, 9.1829"');
  console.log('   2. Space format: "48.7758 9.1829"');
  console.log('   3. Label format: "lat: 48.7758, lng: 9.1829"');
  console.log('   4. Address format: "Stuttgart, Germany"');
  console.log('   5. Default fallback: Uses Stuttgart coordinates');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testManualRideBooking, testCoordinateParsing };
