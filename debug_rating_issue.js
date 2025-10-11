/**
 * Debug Rating Issue
 * 
 * This script will help debug why the rating isn't showing up in Admin UI
 * for ride #355bd8d7.
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

const specificRideId = '355bd8d7';

async function debugRatingIssue() {
  console.log('🔍 Debugging Rating Issue for Ride #355bd8d7...\n');

  try {
    // Step 1: Login as rider
    console.log('1️⃣ Logging in as rider...');
    
    const riderLoginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testRider.email,
      password: testRider.password
    });
    const riderToken = riderLoginResponse.data.access_token;
    console.log('✅ Rider logged in');

    // Step 2: Check ride details
    console.log('\n2️⃣ Checking ride details...');
    
    try {
      const rideResponse = await axios.get(`${API_URL}/api/rides/${specificRideId}`, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      
      const ride = rideResponse.data;
      console.log('✅ Ride details:');
      console.log(`   🆔 ID: ${ride.id}`);
      console.log(`   📍 From: ${ride.pickup_location?.address || 'N/A'}`);
      console.log(`   📍 To: ${ride.dropoff_location?.address || 'N/A'}`);
      console.log(`   💰 Fare: Ⓣ${ride.estimated_fare || 0}`);
      console.log(`   📊 Status: ${ride.status}`);
      console.log(`   ⭐ Current Rating: ${ride.rating || 'Not rated'}`);
      console.log(`   💬 Current Comment: ${ride.comment || 'No comment'}`);
      console.log(`   👤 Rider ID: ${ride.rider_id || 'N/A'}`);
      console.log(`   🚗 Driver ID: ${ride.driver_id || 'N/A'}`);
      
      if (ride.status !== 'completed') {
        console.log('❌ Ride is not completed. Cannot rate.');
        return;
      }
      
    } catch (error) {
      console.log('❌ Error getting ride details:', error.response?.data || error.message);
      return;
    }

    // Step 3: Try to rate the ride
    console.log('\n3️⃣ Attempting to rate the ride...');
    
    const ratingData = {
      rating: 4, // Happy
      comment: 'Rider was happy with Test Driver on the ride from Stuttgart Central Station to Stuttgart Airport'
    };

    try {
      const ratingResponse = await axios.post(`${API_URL}/api/rides/${specificRideId}/rate`, ratingData, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      
      console.log('✅ Rating submitted successfully');
      console.log('📊 Response:', ratingResponse.data);
      
    } catch (error) {
      console.log('❌ Error submitting rating:', error.response?.data || error.message);
      console.log('📊 Status:', error.response?.status);
      console.log('📊 Headers:', error.response?.headers);
      return;
    }

    // Step 4: Verify rating was saved
    console.log('\n4️⃣ Verifying rating was saved...');
    
    try {
      const updatedRideResponse = await axios.get(`${API_URL}/api/rides/${specificRideId}`, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      
      const updatedRide = updatedRideResponse.data;
      console.log('✅ Updated ride details:');
      console.log(`   ⭐ Rating: ${updatedRide.rating || 'Not rated'}`);
      console.log(`   💬 Comment: ${updatedRide.comment || 'No comment'}`);
      
      if (updatedRide.rating) {
        console.log('✅ Rating was saved successfully!');
      } else {
        console.log('❌ Rating was not saved!');
      }
      
    } catch (error) {
      console.log('❌ Error verifying rating:', error.response?.data || error.message);
    }

    // Step 5: Check admin API
    console.log('\n5️⃣ Checking admin API...');
    
    const adminLoginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password
    });
    const adminToken = adminLoginResponse.data.access_token;
    console.log('✅ Admin logged in');

    try {
      const adminRidesResponse = await axios.get(`${API_URL}/api/admin/rides`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      const allRides = adminRidesResponse.data;
      console.log(`✅ Retrieved ${allRides.length} rides from admin API`);

      // Find our specific ride
      const targetRide = allRides.find(ride => ride.id.includes(specificRideId));
      
      if (targetRide) {
        console.log('\n🎯 Found ride in Admin API:');
        console.log(`   🆔 ID: ${targetRide.id}`);
        console.log(`   ⭐ Rating: ${targetRide.rating || 'Not rated'}`);
        console.log(`   💬 Comment: ${targetRide.comment || 'No comment'}`);
        console.log(`   📊 Status: ${targetRide.status}`);
        
        if (targetRide.rating) {
          console.log('✅ Rating is visible in Admin API!');
        } else {
          console.log('❌ Rating is NOT visible in Admin API!');
        }
      } else {
        console.log('❌ Ride not found in Admin API');
      }
      
    } catch (error) {
      console.log('❌ Error getting admin rides:', error.response?.data || error.message);
    }

    // Step 6: Check ride history API
    console.log('\n6️⃣ Checking ride history API...');
    
    try {
      const rideHistoryResponse = await axios.get(`${API_URL}/api/rides/my-rides`, {
        headers: { Authorization: `Bearer ${riderToken}` }
      });
      
      const myRides = rideHistoryResponse.data;
      console.log(`✅ Retrieved ${myRides.length} rides from ride history API`);

      // Find our specific ride
      const targetRide = myRides.find(ride => ride.id.includes(specificRideId));
      
      if (targetRide) {
        console.log('\n🎯 Found ride in Ride History API:');
        console.log(`   🆔 ID: ${targetRide.id}`);
        console.log(`   ⭐ Rating: ${targetRide.rating || 'Not rated'}`);
        console.log(`   💬 Comment: ${targetRide.comment || 'No comment'}`);
        console.log(`   📊 Status: ${targetRide.status}`);
        
        if (targetRide.rating) {
          console.log('✅ Rating is visible in Ride History API!');
        } else {
          console.log('❌ Rating is NOT visible in Ride History API!');
        }
      } else {
        console.log('❌ Ride not found in Ride History API');
      }
      
    } catch (error) {
      console.log('❌ Error getting ride history:', error.response?.data || error.message);
    }

    // Step 7: Summary and recommendations
    console.log('\n📋 Debug Summary:');
    console.log('1. Check if rating was submitted successfully');
    console.log('2. Check if rating was saved in the database');
    console.log('3. Check if rating is visible in Admin API');
    console.log('4. Check if rating is visible in Ride History API');
    console.log('5. Check if there are any API errors');
    
    console.log('\n💡 Possible Issues:');
    console.log('- Rating API endpoint might not be working');
    console.log('- Database update might be failing');
    console.log('- Admin API might not be returning rating data');
    console.log('- Frontend might not be refreshing data');
    console.log('- Authentication issues');
    console.log('- Ride ID mismatch');

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

// Run the debug script
debugRatingIssue();
