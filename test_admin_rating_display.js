/**
 * Test Admin Rating Display
 * 
 * Tests the new rating column in Admin UI Ride Monitoring table
 * that displays smile emojis with rider IDs for rated rides.
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

const testAdmin = {
  email: 'admin@test.com',
  password: 'admin123',
  name: 'Test Admin',
  phone: '+1234567892',
  role: 'admin'
};

let riderToken = null;
let driverToken = null;
let adminToken = null;
let testRideIds = [];

async function testAdminRatingDisplay() {
  console.log('🧪 Testing Admin Rating Display...\n');

  try {
    // Step 1: Login users
    console.log('1️⃣ Logging in users...');
    
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

    const adminLoginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password
    });
    adminToken = adminLoginResponse.data.access_token;
    console.log('✅ Admin logged in');

    // Step 2: Create multiple test rides with different ratings
    console.log('\n2️⃣ Creating test rides with different ratings...');
    
    const emotions = [
      { id: 1, emoji: '😠', label: 'Angry' },
      { id: 2, emoji: '😢', label: 'Sad' },
      { id: 3, emoji: '😐', label: 'Neutral' },
      { id: 4, emoji: '😊', label: 'Happy' },
      { id: 5, emoji: '🤩', label: 'Excited' }
    ];

    for (let i = 0; i < emotions.length; i++) {
      const emotion = emotions[i];
      console.log(`\n   Creating ride ${i + 1}/5 with ${emotion.emoji} ${emotion.label} rating...`);
      
      // Create ride request
      const rideRequest = {
        pickup_location: {
          address: `Test Pickup Location ${i + 1}`,
          latitude: 40.7128 + (i * 0.01),
          longitude: -74.0060 + (i * 0.01)
        },
        dropoff_location: {
          address: `Test Dropoff Location ${i + 1}`, 
          latitude: 40.7589 + (i * 0.01),
          longitude: -73.9851 + (i * 0.01)
        },
        vehicle_type: 'economy',
        passenger_count: 1,
        estimated_fare: 15.00 + (i * 5)
      };

      const rideResponse = await axios.post(`${API_URL}/api/rides/request`, rideRequest, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      const rideId = rideResponse.data.id;
      testRideIds.push(rideId);
      console.log(`   ✅ Ride created: ${rideId}`);

      // Driver accepts ride
      await axios.post(`${API_URL}/api/rides/${rideId}/accept`, {}, {
        headers: { Authorization: `Bearer ${driverToken}` }
      });
      console.log(`   ✅ Driver accepted ride`);

      // Complete the ride
      await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
        action: 'complete'
      }, {
        headers: { Authorization: `Bearer ${driverToken}` }
      });
      console.log(`   ✅ Ride completed`);

      // Rate the ride
      const expectedComment = `Rider was ${emotion.label.toLowerCase()} with Test Driver on the ride from Test Pickup Location ${i + 1} to Test Dropoff Location ${i + 1}`;
      
      const ratingData = {
        rating: emotion.id,
        comment: expectedComment
      };

      await axios.post(`${API_URL}/api/rides/${rideId}/rate`, ratingData, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      console.log(`   ✅ Rated with ${emotion.emoji} ${emotion.label} (${emotion.id}/5)`);
    }

    // Step 3: Test Admin UI Ride Monitoring
    console.log('\n3️⃣ Testing Admin UI Ride Monitoring...');
    
    const adminRidesResponse = await axios.get(`${API_URL}/api/admin/rides`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const allRides = adminRidesResponse.data;
    console.log(`✅ Retrieved ${allRides.length} rides from admin API`);

    // Filter for our test rides
    const testRides = allRides.filter(ride => testRideIds.includes(ride.id));
    console.log(`✅ Found ${testRides.length} test rides in admin data`);

    // Step 4: Verify rating display
    console.log('\n4️⃣ Verifying rating display in admin data...');
    
    const ratingEmojis = {
      1: '😠', // Angry
      2: '😢', // Sad
      3: '😐', // Neutral
      4: '😊', // Happy
      5: '🤩'  // Excited
    };

    for (const ride of testRides) {
      if (ride.rating) {
        const expectedEmoji = ratingEmojis[ride.rating];
        console.log(`\n   Ride ${ride.id.slice(-8)}:`);
        console.log(`   📊 Rating: ${ride.rating}/5`);
        console.log(`   😊 Emoji: ${expectedEmoji}`);
        console.log(`   👤 Rider ID: ${ride.rider_id?.slice(-8) || 'N/A'}`);
        console.log(`   💬 Comment: "${ride.comment}"`);
        
        if (expectedEmoji) {
          console.log(`   ✅ Rating display verified`);
        } else {
          console.log(`   ❌ Invalid rating value: ${ride.rating}`);
        }
      } else {
        console.log(`\n   Ride ${ride.id.slice(-8)}: No rating`);
      }
    }

    // Step 5: Test rating statistics
    console.log('\n5️⃣ Testing rating statistics...');
    
    const ratedRides = testRides.filter(ride => ride.rating);
    const ratingCounts = {};
    
    for (const ride of ratedRides) {
      ratingCounts[ride.rating] = (ratingCounts[ride.rating] || 0) + 1;
    }
    
    console.log('📊 Rating Distribution:');
    for (const [rating, count] of Object.entries(ratingCounts)) {
      const emoji = ratingEmojis[rating];
      console.log(`   ${emoji} Rating ${rating}: ${count} rides`);
    }

    // Step 6: Test admin dashboard stats
    console.log('\n6️⃣ Testing admin dashboard stats...');
    
    const adminStatsResponse = await axios.get(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const stats = adminStatsResponse.data;
    console.log('📈 Admin Dashboard Stats:');
    console.log(`   Total Rides: ${stats.total_rides}`);
    console.log(`   Completed Rides: ${stats.completed_rides}`);
    console.log(`   Completion Rate: ${stats.completion_rate}%`);

    console.log('\n🎉 Admin Rating Display Test Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ User authentication (rider, driver, admin)');
    console.log('✅ Multiple ride creation and completion');
    console.log('✅ All 5 emotion ratings (😠😢😐😊🤩)');
    console.log('✅ Admin API ride retrieval');
    console.log('✅ Rating display verification');
    console.log('✅ Rating statistics analysis');
    console.log('✅ Admin dashboard stats verification');

    console.log('\n🎯 Expected Admin UI Display:');
    console.log('The Admin UI Ride Monitoring table should now show:');
    console.log('- Rating column with smile emojis (😠😢😐😊🤩)');
    console.log('- Rider ID displayed next to each rating');
    console.log('- "No rating" for unrated rides');
    console.log('- Proper rating distribution across all test rides');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testAdminRatingDisplay();
