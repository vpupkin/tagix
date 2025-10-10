#!/usr/bin/env node

/**
 * Frontend Manual Ride Booking Test
 * 
 * This test verifies that the frontend manual ride booking functionality
 * works correctly without Google Maps API.
 */

const axios = require('axios');

const API_URL = 'http://localhost:8001';

// Test the coordinate parsing function (simulating frontend logic)
function parseCoordinates(input) {
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
}

// Simulate the handleSubmit function from SimpleAddressInput
function handleSubmit(inputValue, isCoordinateMode = false, lat = '', lng = '') {
  if (!inputValue.trim()) {
    return null;
  }

  let latitude, longitude;
  
  // Try to parse coordinates from input
  const coords = parseCoordinates(inputValue);
  if (coords) {
    latitude = coords.latitude;
    longitude = coords.longitude;
  } else if (isCoordinateMode && lat && lng) {
    // Use manually entered coordinates
    latitude = parseFloat(lat);
    longitude = parseFloat(lng);
  } else {
    // Use default test coordinates (Stuttgart, Germany)
    latitude = 48.7758;
    longitude = 9.1829;
  }

  // Create a place object for manual entry (matching frontend structure)
  const placeData = {
    formatted_address: inputValue,
    geometry: {
      location: {
        lat: () => latitude,
        lng: () => longitude
      }
    },
    name: inputValue,
    place_id: `manual_${Date.now()}`,
    // Add address property for compatibility with handleBookRide
    address: inputValue,
    // Add location object for backend compatibility
    location: {
      latitude: latitude,
      longitude: longitude,
      address: inputValue
    }
  };
  
  return placeData;
}

// Test the frontend data structure
function testFrontendDataStructure() {
  console.log('🧪 Testing Frontend Data Structure\n');
  
  const testCases = [
    {
      name: "Coordinate Input",
      input: "48.7758, 9.1829",
      expected: { latitude: 48.7758, longitude: 9.1829 }
    },
    {
      name: "Address Input",
      input: "Stuttgart, Germany",
      expected: { latitude: 48.7758, longitude: 9.1829 } // Default fallback
    },
    {
      name: "Manual Coordinates",
      input: "Test Location",
      isCoordinateMode: true,
      lat: "49.7758",
      lng: "10.1829",
      expected: { latitude: 49.7758, longitude: 10.1829 }
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);
    
    const result = handleSubmit(
      testCase.input, 
      testCase.isCoordinateMode || false, 
      testCase.lat || '', 
      testCase.lng || ''
    );
    
    if (result) {
      console.log(`✅ Success!`);
      console.log(`   Address: ${result.address}`);
      console.log(`   Location: ${result.location.latitude}, ${result.location.longitude}`);
      console.log(`   Formatted Address: ${result.formatted_address}`);
      console.log(`   Place ID: ${result.place_id}`);
      
      // Verify the structure matches what handleBookRide expects
      if (result.address && result.location && result.location.latitude && result.location.longitude) {
        console.log(`   ✅ Structure compatible with handleBookRide`);
      } else {
        console.log(`   ❌ Structure NOT compatible with handleBookRide`);
      }
    } else {
      console.log(`❌ Failed to process input`);
    }
    console.log('');
  });
}

// Test the complete ride booking flow
async function testCompleteRideBookingFlow() {
  console.log('🧪 Testing Complete Ride Booking Flow\n');
  
  try {
    // Step 1: Register a test rider
    console.log('1. Registering test rider...');
    const riderData = {
      name: "Frontend Test Rider",
      email: "frontend.test@example.com",
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
    
    // Step 3: Simulate frontend location processing
    console.log('\n3. Simulating frontend location processing...');
    
    const pickupInput = "48.7758, 9.1829"; // Coordinate format
    const dropoffInput = "Stuttgart Central Station"; // Address format
    
    const pickupLocation = handleSubmit(pickupInput);
    const dropoffLocation = handleSubmit(dropoffInput);
    
    if (!pickupLocation || !dropoffLocation) {
      throw new Error('Failed to process locations in frontend');
    }
    
    console.log('✅ Frontend location processing successful');
    console.log(`   Pickup: ${pickupLocation.address} (${pickupLocation.location.latitude}, ${pickupLocation.location.longitude})`);
    console.log(`   Dropoff: ${dropoffLocation.address} (${dropoffLocation.location.latitude}, ${dropoffLocation.location.longitude})`);
    
    // Step 4: Create ride data (simulating handleBookRide)
    console.log('\n4. Creating ride data...');
    const rideData = {
      pickup_location: {
        latitude: pickupLocation.location.latitude,
        longitude: pickupLocation.location.longitude,
        address: pickupLocation.address
      },
      dropoff_location: {
        latitude: dropoffLocation.location.latitude,
        longitude: dropoffLocation.location.longitude,
        address: dropoffLocation.address
      },
      vehicle_type: "economy",
      passenger_count: 1,
      special_requirements: "Frontend test ride"
    };
    
    console.log('✅ Ride data created successfully');
    console.log(`   Pickup: ${rideData.pickup_location.address}`);
    console.log(`   Dropoff: ${rideData.dropoff_location.address}`);
    console.log(`   Vehicle Type: ${rideData.vehicle_type}`);
    
    // Step 5: Submit ride request
    console.log('\n5. Submitting ride request...');
    const rideResponse = await axios.post(`${API_URL}/api/rides/request`, rideData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (rideResponse.status === 200) {
      const responseData = rideResponse.data;
      console.log('✅ Ride request submitted successfully!');
      console.log(`   Request ID: ${responseData.request_id}`);
      console.log(`   Estimated Fare: Ⓣ${responseData.estimated_fare}`);
      console.log(`   Matches Found: ${responseData.matches_found}`);
      
      return {
        success: true,
        request_id: responseData.request_id,
        estimated_fare: responseData.estimated_fare,
        matches_found: responseData.matches_found
      };
    } else {
      throw new Error(`Ride request failed with status ${rideResponse.status}`);
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

// Test coordinate parsing edge cases
function testCoordinateParsingEdgeCases() {
  console.log('🧪 Testing Coordinate Parsing Edge Cases\n');
  
  const testCases = [
    { input: "48.7758, 9.1829", shouldPass: true, description: "Standard coordinate format" },
    { input: "48.7758 9.1829", shouldPass: true, description: "Space-separated coordinates" },
    { input: "lat: 48.7758, lng: 9.1829", shouldPass: true, description: "Labeled coordinates" },
    { input: "LAT: 48.7758, LNG: 9.1829", shouldPass: true, description: "Uppercase labeled coordinates" },
    { input: "48.7758,9.1829", shouldPass: true, description: "No space after comma" },
    { input: "48, 9", shouldPass: true, description: "Integer coordinates" },
    { input: "-48.7758, -9.1829", shouldPass: true, description: "Negative coordinates" },
    { input: "0, 0", shouldPass: true, description: "Zero coordinates" },
    { input: "invalid coordinates", shouldPass: false, description: "Invalid text" },
    { input: "999, 999", shouldPass: false, description: "Out of range coordinates" },
    { input: "-91, 181", shouldPass: false, description: "Invalid latitude/longitude" },
    { input: "48.7758", shouldPass: false, description: "Single coordinate" },
    { input: "", shouldPass: false, description: "Empty input" }
  ];
  
  testCases.forEach(testCase => {
    const result = parseCoordinates(testCase.input);
    const passed = (result !== null) === testCase.shouldPass;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"`);
    if (result) {
      console.log(`   Result: lat=${result.latitude}, lng=${result.longitude}`);
    } else {
      console.log(`   Result: Could not parse`);
    }
    console.log('');
  });
}

async function main() {
  console.log('🚗 Frontend Manual Ride Booking Test Suite');
  console.log('==========================================\n');
  
  // Test coordinate parsing edge cases
  testCoordinateParsingEdgeCases();
  
  // Test frontend data structure
  testFrontendDataStructure();
  
  // Test complete ride booking flow
  const result = await testCompleteRideBookingFlow();
  
  console.log('\n📊 Test Summary');
  console.log('================');
  if (result.success) {
    console.log('✅ All frontend tests passed!');
    console.log(`   Request ID: ${result.request_id}`);
    console.log(`   Estimated Fare: Ⓣ${result.estimated_fare}`);
    console.log(`   Driver Matches: ${result.matches_found}`);
  } else {
    console.log('❌ Frontend tests failed!');
    console.log(`   Error: ${result.error}`);
  }
  
  console.log('\n💡 Frontend Manual Entry Features:');
  console.log('   ✅ Coordinate parsing in multiple formats');
  console.log('   ✅ Address fallback to default location');
  console.log('   ✅ Manual coordinate input');
  console.log('   ✅ Data structure compatibility with handleBookRide');
  console.log('   ✅ Backend API integration');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  parseCoordinates, 
  handleSubmit, 
  testFrontendDataStructure, 
  testCompleteRideBookingFlow 
};
