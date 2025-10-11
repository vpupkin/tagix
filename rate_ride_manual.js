/**
 * Manual Ride Rating Script
 * 
 * Use this script to rate a specific ride manually.
 * Just update the rideId and run the script.
 */

const axios = require('axios');

const API_URL = 'http://localhost:8001';

// Configuration - UPDATE THESE VALUES
const RIDE_ID = '355bd8d7'; // The ride ID you want to rate
const RATING = 4; // 1=Angry, 2=Sad, 3=Neutral, 4=Happy, 5=Excited
const RIDER_EMAIL = 'testrider@test.com'; // Your rider email
const RIDER_PASSWORD = 'testpass123'; // Your rider password

async function rateRide() {
  console.log(`🎯 Rating ride #${RIDE_ID} with rating ${RATING}...\n`);

  try {
    // Step 1: Login as rider
    console.log('1️⃣ Logging in...');
    
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: RIDER_EMAIL,
      password: RIDER_PASSWORD
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Logged in successfully');

    // Step 2: Get ride details
    console.log('\n2️⃣ Getting ride details...');
    
    const rideResponse = await axios.get(`${API_URL}/api/rides/${RIDE_ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const ride = rideResponse.data;
    console.log('✅ Ride details:');
    console.log(`   📍 From: ${ride.pickup_location?.address || 'N/A'}`);
    console.log(`   📍 To: ${ride.dropoff_location?.address || 'N/A'}`);
    console.log(`   💰 Fare: Ⓣ${ride.estimated_fare || 0}`);
    console.log(`   📊 Status: ${ride.status}`);
    console.log(`   ⭐ Current Rating: ${ride.rating || 'Not rated'}`);

    // Step 3: Rate the ride
    console.log('\n3️⃣ Rating the ride...');
    
    const emotions = {
      1: { emoji: '😠', label: 'Angry' },
      2: { emoji: '😢', label: 'Sad' },
      3: { emoji: '😐', label: 'Neutral' },
      4: { emoji: '😊', label: 'Happy' },
      5: { emoji: '🤩', label: 'Excited' }
    };
    
    const emotion = emotions[RATING];
    if (!emotion) {
      console.log('❌ Invalid rating. Use 1-5.');
      return;
    }
    
    const driverName = ride.driver_name || 'Driver';
    const pickupAddress = ride.pickup_location?.address || 'pickup location';
    const dropoffAddress = ride.dropoff_location?.address || 'destination';
    
    const autoComment = `Rider was ${emotion.label.toLowerCase()} with ${driverName} on the ride from ${pickupAddress} to ${dropoffAddress}`;
    
    const ratingData = {
      rating: RATING,
      comment: autoComment
    };

    const ratingResponse = await axios.post(`${API_URL}/api/rides/${RIDE_ID}/rate`, ratingData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Successfully rated with ${emotion.emoji} ${emotion.label} (${RATING}/5)`);
    console.log(`💬 Comment: "${autoComment}"`);

    // Step 4: Verify the rating
    console.log('\n4️⃣ Verifying the rating...');
    
    const updatedRideResponse = await axios.get(`${API_URL}/api/rides/${RIDE_ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const updatedRide = updatedRideResponse.data;
    console.log(`✅ Updated ride rating: ${updatedRide.rating}/5`);
    console.log(`💬 Updated comment: "${updatedRide.comment}"`);

    console.log('\n🎉 Rating completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to Admin Dashboard → Ride Monitoring');
    console.log(`2. Look for ride #${RIDE_ID}`);
    console.log(`3. Check the Rating column - should show ${emotion.emoji} with rider ID`);
    console.log('4. The rating should now be visible in the Admin UI!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if the ride ID is correct');
      console.log('2. Make sure you\'re logged in as the rider who took this ride');
      console.log('3. Verify the ride is completed');
    }
  }
}

// Run the script
rateRide();
