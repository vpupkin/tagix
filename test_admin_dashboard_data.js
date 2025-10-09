#!/usr/bin/env node

/**
 * Test script to verify admin dashboard data fetching
 * This will help debug why Total Rides shows 0 in the frontend
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8001';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'adminpass123';

async function testAdminDashboardData() {
    console.log('🔍 Testing Admin Dashboard Data Fetching...');
    console.log('=' * 60);
    
    try {
        // Step 1: Login as admin
        console.log('📝 Step 1: Logging in as admin...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        
        const token = loginResponse.data.access_token;
        console.log('✅ Login successful');
        console.log('🔑 Token:', token.substring(0, 20) + '...');
        
        // Step 2: Test admin stats endpoint
        console.log('\n📊 Step 2: Fetching admin stats...');
        const statsResponse = await axios.get(`${BASE_URL}/api/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Stats fetched successfully');
        console.log('📈 Stats data:', JSON.stringify(statsResponse.data, null, 2));
        
        // Step 3: Test admin rides endpoint
        console.log('\n🚗 Step 3: Fetching admin rides...');
        const ridesResponse = await axios.get(`${BASE_URL}/api/admin/rides`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Rides fetched successfully');
        console.log('🚗 Rides data:', JSON.stringify(ridesResponse.data, null, 2));
        
        // Step 4: Test admin users endpoint
        console.log('\n👥 Step 4: Fetching admin users...');
        const usersResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Users fetched successfully');
        console.log('👥 Users count:', usersResponse.data.length);
        console.log('👥 Users data:', JSON.stringify(usersResponse.data, null, 2));
        
        // Step 5: Analyze the data
        console.log('\n🔍 Step 5: Data Analysis...');
        const stats = statsResponse.data;
        const rides = ridesResponse.data;
        
        console.log('📊 Analysis Results:');
        console.log(`   Total Users: ${stats.total_users}`);
        console.log(`   Total Rides: ${stats.total_rides}`);
        console.log(`   Completed Rides: ${stats.completed_rides}`);
        console.log(`   Pending Requests: ${rides.total_pending || 0}`);
        console.log(`   Completed Matches: ${rides.total_rides || 0}`);
        
        // Step 6: Check for discrepancies
        console.log('\n⚠️ Step 6: Checking for discrepancies...');
        
        if (stats.total_rides === 0) {
            console.log('❌ ISSUE FOUND: stats.total_rides is 0');
            console.log('   This explains why the frontend shows 0 rides');
        } else {
            console.log('✅ stats.total_rides is not 0, frontend should display correctly');
        }
        
        if (rides.total_rides === 0) {
            console.log('❌ ISSUE FOUND: rides.total_rides is 0');
        } else {
            console.log('✅ rides.total_rides is not 0');
        }
        
        // Step 7: Check database collections directly
        console.log('\n🗄️ Step 7: Checking database collections...');
        
        // Check ride_requests collection
        const rideRequestsResponse = await axios.get(`${BASE_URL}/api/admin/rides`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const pendingCount = rideRequestsResponse.data.pending_requests?.length || 0;
        const completedCount = rideRequestsResponse.data.completed_matches?.length || 0;
        
        console.log(`   Pending Requests: ${pendingCount}`);
        console.log(`   Completed Matches: ${completedCount}`);
        console.log(`   Total Rides (calculated): ${pendingCount + completedCount}`);
        
        // Step 8: Recommendations
        console.log('\n💡 Step 8: Recommendations...');
        
        if (stats.total_rides === 0 && (pendingCount > 0 || completedCount > 0)) {
            console.log('🔧 ISSUE: Backend stats calculation is incorrect');
            console.log('   The /api/admin/stats endpoint is not counting rides properly');
            console.log('   Fix: Update the stats calculation to include both ride_requests and ride_matches');
        } else if (stats.total_rides > 0) {
            console.log('✅ Backend stats are correct');
            console.log('   The issue might be in the frontend data fetching or display');
        } else {
            console.log('ℹ️ No rides found in the system');
            console.log('   This is expected if no rides have been created yet');
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Run the test
testAdminDashboardData().then(() => {
    console.log('\n🎉 Test completed!');
}).catch(error => {
    console.error('💥 Test failed:', error);
});
