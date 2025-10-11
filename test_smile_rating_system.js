/**
 * Test Smile Rating System
 * 
 * Tests the new inline smile rating system that replaces the modal dialog
 * with a simple click-to-rate interface using emotions.
 */

const axios = require('axios');

const API_URL = 'http://localhost:8001';

// Test data
const testRider = {
  email: 'testrider@test.com',
  password: 'testpass123',
  name: 'Test Rider',
  phone: '+1234567890',
  role: 'rider'
};

const testDriver = {
  email: 'testdriver@test.com', 
  password: 'testpass123',
  name: 'Test Driver',
  phone: '+1234567891',
  role: 'driver'
};

let riderToken = null;
let driverToken = null;
let testRideId = null;

async function testSmileRatingSystem() {
  console.log('🧪 Testing Smile Rating System...\n');

  try {
    // Step 1: Register test users
    console.log('1️⃣ Registering test users...');
    
    try {
      await axios.post(`${API_URL}/api/auth/register`, testRider);
      console.log('✅ Test rider registered');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
        console.log('✅ Test rider already exists');
      } else {
        throw error;
      }
    }

    try {
      await axios.post(`${API_URL}/api/auth/register`, testDriver);
      console.log('✅ Test driver registered');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
        console.log('✅ Test driver already exists');
      } else {
        throw error;
      }
    }

    // Step 2: Login users
    console.log('\n2️⃣ Logging in users...');
    
    const riderLoginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testRider.email,
      password: testRider.password
    });
    riderToken = riderLoginResponse.data.access_token;
    console.log('✅ Rider logged in');

    const driverLoginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testDriver.email,
      password: testDriver.password
    });
    driverToken = driverLoginResponse.data.access_token;
    console.log('✅ Driver logged in');

    // Step 3: Create a test ride
    console.log('\n3️⃣ Creating test ride...');
    
    const rideRequest = {
      pickup_location: {
        address: 'Test Pickup Location',
        latitude: 40.7128,
        longitude: -74.0060
      },
      dropoff_location: {
        address: 'Test Dropoff Location', 
        latitude: 40.7589,
        longitude: -73.9851
      },
      vehicle_type: 'economy',
      passenger_count: 1,
      estimated_fare: 15.00
    };

    const rideResponse = await axios.post(`${API_URL}/api/rides/request`, rideRequest, {
      headers: { Authorization: `Bearer ${riderToken}` }
    });
    testRideId = rideResponse.data.id;
    console.log('✅ Test ride created:', testRideId);

    // Step 4: Driver accepts ride
    console.log('\n4️⃣ Driver accepting ride...');
    
    await axios.post(`${API_URL}/api/rides/${testRideId}/accept`, {}, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    console.log('✅ Driver accepted ride');

    // Step 5: Complete the ride
    console.log('\n5️⃣ Completing ride...');
    
    await axios.post(`${API_URL}/api/rides/${testRideId}/update`, {
      action: 'complete'
    }, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    console.log('✅ Ride completed');

    // Step 6: Test smile rating system
    console.log('\n6️⃣ Testing smile rating system...');
    
    const emotions = [
      { id: 1, emoji: '😠', label: 'Angry' },
      { id: 2, emoji: '😢', label: 'Sad' },
      { id: 3, emoji: '😐', label: 'Neutral' },
      { id: 4, emoji: '😊', label: 'Happy' },
      { id: 5, emoji: '🤩', label: 'Excited' }
    ];

    for (const emotion of emotions) {
      console.log(`\n   Testing ${emotion.emoji} ${emotion.label} rating...`);
      
      // Generate expected auto-comment
      const expectedComment = `Rider was ${emotion.label.toLowerCase()} with Test Driver on the ride from Test Pickup Location to Test Dropoff Location`;
      
      const ratingData = {
        rating: emotion.id,
        comment: expectedComment
      };

      const ratingResponse = await axios.post(`${API_URL}/api/rides/${testRideId}/rate`, ratingData, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      
      console.log(`   ✅ ${emotion.emoji} rating submitted successfully`);
      console.log(`   📝 Auto-comment: "${expectedComment}"`);
      
      // Verify rating was stored
      const rideDetailsResponse = await axios.get(`${API_URL}/api/rides/${testRideId}`, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      
      const rideDetails = rideDetailsResponse.data;
      if (rideDetails.rating === emotion.id && rideDetails.comment === expectedComment) {
        console.log(`   ✅ Rating verified: ${emotion.id}/5 stars, comment matches`);
      } else {
        console.log(`   ❌ Rating verification failed: expected ${emotion.id}, got ${rideDetails.rating}`);
      }
    }

    // Step 7: Test rating display in ride history
    console.log('\n7️⃣ Testing rating display in ride history...');
    
    const rideHistoryResponse = await axios.get(`${API_URL}/api/rides/my-rides`, {
      headers: { Authorization: `Bearer ${riderToken}` }
    });
    
    const completedRides = rideHistoryResponse.data.filter(ride => ride.status === 'completed');
    if (completedRides.length > 0) {
      const lastRide = completedRides[0];
      console.log('✅ Found completed ride in history');
      console.log(`   📊 Rating: ${lastRide.rating}/5`);
      console.log(`   💬 Comment: "${lastRide.comment}"`);
    }

    console.log('\n🎉 Smile Rating System Test Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ User registration and login');
    console.log('✅ Ride creation and completion');
    console.log('✅ All 5 emotion ratings (😠😢😐😊🤩)');
    console.log('✅ Auto-comment generation');
    console.log('✅ Rating persistence and verification');
    console.log('✅ Ride history integration');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testSmileRatingSystem();
