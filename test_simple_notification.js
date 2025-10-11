const axios = require('axios');

const API_URL = 'http://localhost:8000';

async function testSimpleNotification() {
  console.log('🧪 Testing simple notification flow...\n');
  
  try {
    // Step 1: Register and login a driver
    console.log('1. Setting up driver...');
    const driverEmail = 'test_driver_simple@example.com';
    
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        email: driverEmail,
        password: 'password123',
        name: 'Test Driver Simple',
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
    
    const driverLogin = await axios.post(`${API_URL}/api/auth/login`, {
      email: driverEmail,
      password: 'password123'
    });
    const driverToken = driverLogin.data.access_token;
    console.log('✅ Driver logged in');
    
    // Step 2: Set driver location and online status
    console.log('\n2. Setting driver location and online status...');
    
    // Update location
    await axios.post(`${API_URL}/api/location/update`, {
      latitude: 48.6408,
      longitude: 9.8337,
      address: 'Test Location, Stuttgart'
    }, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    console.log('✅ Location updated');
    
    // Set online
    await axios.post(`${API_URL}/api/driver/online`, {}, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    console.log('✅ Driver set online');
    
    // Step 3: Verify driver status
    console.log('\n3. Verifying driver status...');
    const driverProfile = await axios.get(`${API_URL}/api/driver/profile`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    console.log('📊 Driver profile:', {
      is_online: driverProfile.data.is_online,
      has_location: !!driverProfile.data.current_location,
      location: driverProfile.data.current_location
    });
    
    // Step 4: Check available rides
    console.log('\n4. Checking available rides...');
    const availableRides = await axios.get(`${API_URL}/api/rides/available`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    console.log('📊 Available rides:', {
      count: Array.isArray(availableRides.data) ? availableRides.data.length : 'Not an array',
      data: availableRides.data
    });
    
    // Step 5: Register and login a rider
    console.log('\n5. Setting up rider...');
    const riderEmail = 'test_rider_simple@example.com';
    
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        email: riderEmail,
        password: 'password123',
        name: 'Test Rider Simple',
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
    
    const riderLogin = await axios.post(`${API_URL}/api/auth/login`, {
      email: riderEmail,
      password: 'password123'
    });
    const riderToken = riderLogin.data.access_token;
    console.log('✅ Rider logged in');
    
    // Step 6: Book a ride
    console.log('\n6. Booking a ride...');
    const rideData = {
      pickup_location: {
        latitude: 48.6408,
        longitude: 9.8337,
        address: 'Test Pickup, Stuttgart'
      },
      dropoff_location: {
        latitude: 48.7500,
        longitude: 9.9000,
        address: 'Test Dropoff, Stuttgart'
      },
      vehicle_type: 'standard',
      passenger_count: 1,
      special_requirements: 'Simple test ride'
    };
    
    const rideResponse = await axios.post(`${API_URL}/api/rides/request`, rideData, {
      headers: { 'Authorization': `Bearer ${riderToken}` }
    });
    console.log('✅ Ride booked:', {
      request_id: rideResponse.data.request_id,
      estimated_fare: rideResponse.data.estimated_fare,
      matches_found: rideResponse.data.matches_found
    });
    
    // Step 7: Check available rides again
    console.log('\n7. Checking available rides after booking...');
    const updatedRides = await axios.get(`${API_URL}/api/rides/available`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    console.log('📊 Updated available rides:', {
      count: Array.isArray(updatedRides.data) ? updatedRides.data.length : 'Not an array',
      data: updatedRides.data
    });
    
    // Step 8: Analysis
    console.log('\n8. Analysis:');
    const initialCount = Array.isArray(availableRides.data) ? availableRides.data.length : 0;
    const updatedCount = Array.isArray(updatedRides.data) ? updatedRides.data.length : 0;
    const hasNewRide = updatedCount > initialCount;
    
    console.log(`📊 Initial rides: ${initialCount}`);
    console.log(`📊 Updated rides: ${updatedCount}`);
    console.log(`📊 New ride appeared: ${hasNewRide ? '✅ YES' : '❌ NO'}`);
    console.log(`📊 Matches found: ${rideResponse.data.matches_found}`);
    
    if (hasNewRide && rideResponse.data.matches_found > 0) {
      console.log('\n🎉 SUCCESS: Driver notification system is working!');
    } else if (rideResponse.data.matches_found === 0) {
      console.log('\n⚠️ WARNING: No matches found - driver might not be in range');
    } else {
      console.log('\n❌ ISSUE: Ride was booked but not appearing in available rides');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSimpleNotification().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
