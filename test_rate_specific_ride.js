/**
 * Test Rating Specific Ride #355bd8d7
 * 
 * This test will rate the specific ride that the user mentioned
 * and verify it appears correctly in the Admin UI.
 */

const axios = require('axios');

const API_URL = 'http://localhost:8001';

// Test data
const testRider = {
  email: 'testrider@test.com',
  password: 'testpass123'
};

const testAdmin = {
  email: 'admin@test.com',
  password: 'admin123'
};

const specificRideId = '355bd8d7'; // The ride ID from the user's example

async function testRateSpecificRide() {
  console.log('🧪 Testing Rating for Specific Ride #355bd8d7...\n');

  try {
    // Step 1: Login as rider
    console.log('1️⃣ Logging in as rider...');
    
    const riderLoginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testRider.email,
      password: testRider.password
    });
    const riderToken = riderLoginResponse.data.access_token;
    console.log('✅ Rider logged in');

    // Step 2: Get ride details to verify it exists
    console.log('\n2️⃣ Getting ride details...');
    
    try {
      const rideResponse = await axios.get(`${API_URL}/api/rides/${specificRideId}`, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      
      const ride = rideResponse.data;
      console.log('✅ Ride found:');
      console.log(`   📍 From: ${ride.pickup_location?.address || 'N/A'}`);
      console.log(`   📍 To: ${ride.dropoff_location?.address || 'N/A'}`);
      console.log(`   💰 Fare: Ⓣ${ride.estimated_fare || 0}`);
      console.log(`   📊 Status: ${ride.status}`);
      console.log(`   ⭐ Current Rating: ${ride.rating || 'Not rated'}`);
      
      if (ride.status !== 'completed') {
        console.log('❌ Ride is not completed yet. Cannot rate.');
        return;
      }
      
    } catch (error) {
      console.log('❌ Ride not found or access denied');
      console.log('   This might be because:');
      console.log('   - The ride ID is incorrect');
      console.log('   - The ride belongs to a different rider');
      console.log('   - The ride doesn\'t exist');
      return;
    }

    // Step 3: Rate the ride with different emotions
    console.log('\n3️⃣ Rating the ride with different emotions...');
    
    const emotions = [
      { id: 4, emoji: '😊', label: 'Happy' },
      { id: 5, emoji: '🤩', label: 'Excited' },
      { id: 3, emoji: '😐', label: 'Neutral' }
    ];

    for (const emotion of emotions) {
      console.log(`\n   Rating with ${emotion.emoji} ${emotion.label}...`);
      
      const driverName = 'Test Driver'; // You might need to get this from ride data
      const pickupAddress = 'Stuttgart Central Station';
      const dropoffAddress = 'Stuttgart Airport';
      
      const autoComment = `Rider was ${emotion.label.toLowerCase()} with ${driverName} on the ride from ${pickupAddress} to ${dropoffAddress}`;
      
      const ratingData = {
        rating: emotion.id,
        comment: autoComment
      };

      try {
        const ratingResponse = await axios.post(`${API_URL}/api/rides/${specificRideId}/rate`, ratingData, {
          headers: { Authorization: `Bearer ${riderToken}` }
        });
        
        console.log(`   ✅ Rated with ${emotion.emoji} ${emotion.label} (${emotion.id}/5)`);
        console.log(`   💬 Comment: "${autoComment}"`);
        
        // Wait a moment before next rating
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ Failed to rate: ${error.response?.data?.detail || error.message}`);
      }
    }

    // Step 4: Login as admin and check Admin UI
    console.log('\n4️⃣ Checking Admin UI...');
    
    const adminLoginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password
    });
    const adminToken = adminLoginResponse.data.access_token;
    console.log('✅ Admin logged in');

    // Get all rides from admin API
    const adminRidesResponse = await axios.get(`${API_URL}/api/admin/rides`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const allRides = adminRidesResponse.data;
    console.log(`✅ Retrieved ${allRides.length} rides from admin API`);

    // Find our specific ride
    const targetRide = allRides.find(ride => ride.id.includes(specificRideId));
    
    if (targetRide) {
      console.log('\n🎯 Found ride in Admin UI:');
      console.log(`   🆔 Ride ID: #${targetRide.id.slice(-8)}`);
      console.log(`   👤 Rider: ${targetRide.rider_id?.slice(-8) || 'N/A'}`);
      console.log(`   🚗 Driver: ${targetRide.driver_id?.slice(-8) || 'N/A'}`);
      console.log(`   📍 Route: ${targetRide.pickup_location?.address} → ${targetRide.dropoff_location?.address}`);
      console.log(`   💰 Fare: Ⓣ${targetRide.estimated_fare || 0}`);
      console.log(`   ⭐ Rating: ${targetRide.rating ? `${getRatingEmoji(targetRide.rating)} ${targetRide.rating}/5` : 'No rating'}`);
      console.log(`   📊 Status: ${targetRide.status}`);
      console.log(`   📅 Date: ${targetRide.completed_at || targetRide.created_at}`);
      
      if (targetRide.rating) {
        console.log(`   💬 Comment: "${targetRide.comment}"`);
        console.log('\n✅ SUCCESS! Rating is now visible in Admin UI!');
      } else {
        console.log('\n⚠️  Rating not found in Admin UI data');
      }
    } else {
      console.log('\n❌ Ride not found in Admin UI data');
    }

    console.log('\n🎉 Test Completed!');
    console.log('\n📋 What to check in Admin UI:');
    console.log('1. Go to Admin Dashboard → Ride Monitoring');
    console.log('2. Look for ride #355bd8d7');
    console.log('3. Check the Rating column');
    console.log('4. Should show smile emoji + rider ID if rated');
    console.log('5. Should show "No rating" if not rated');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Helper function to get rating emoji
function getRatingEmoji(rating) {
  switch (rating) {
    case 1: return '😠'; // Angry
    case 2: return '😢'; // Sad
    case 3: return '😐'; // Neutral
    case 4: return '😊'; // Happy
    case 5: return '🤩'; // Excited
    default: return '❓'; // Unknown
  }
}

// Run the test
testRateSpecificRide();
