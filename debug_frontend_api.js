// Debug script to test frontend API calls
// Run this in the browser console on localhost:3000

console.log('🔍 Frontend API Debug Script');
console.log('============================');

// Check if API_URL is defined
const API_URL = process.env.REACT_APP_BACKEND_URL;
console.log('API_URL:', API_URL);

if (!API_URL) {
  console.error('❌ API_URL is undefined! Check .env file');
} else {
  console.log('✅ API_URL is defined:', API_URL);
}

// Test basic API call
async function testAPI() {
  try {
    console.log('🧪 Testing API connectivity...');
    
    // Test health endpoint
    const healthResponse = await fetch(`${API_URL}/api/health`);
    console.log('Health endpoint status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health response:', healthData);
    } else {
      console.error('Health endpoint failed:', healthResponse.statusText);
    }
    
    // Test with a real user (you'll need to login first)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      console.log('🔑 Found auth token, testing authenticated endpoints...');
      
      // Test admin rides
      const adminRidesResponse = await fetch(`${API_URL}/api/admin/rides`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Admin rides status:', adminRidesResponse.status);
      if (adminRidesResponse.ok) {
        const adminRidesData = await adminRidesResponse.json();
        console.log('Admin rides data:', adminRidesData);
        console.log('Pending requests:', adminRidesData.pending_requests?.length || 0);
        console.log('Completed matches:', adminRidesData.completed_matches?.length || 0);
      } else {
        console.error('Admin rides failed:', adminRidesResponse.statusText);
      }
      
      // Test driver available rides
      const driverRidesResponse = await fetch(`${API_URL}/api/rides/available`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Driver rides status:', driverRidesResponse.status);
      if (driverRidesResponse.ok) {
        const driverRidesData = await driverRidesResponse.json();
        console.log('Driver rides data:', driverRidesData);
        console.log('Available rides:', driverRidesData.available_rides?.length || 0);
      } else {
        console.error('Driver rides failed:', driverRidesResponse.statusText);
      }
      
    } else {
      console.log('⚠️ No auth token found. Please login first.');
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Run the test
testAPI();

// Also check for any existing errors in the console
console.log('🔍 Checking for existing console errors...');
console.log('If you see any red errors above, those might be causing the issue.');

// Check if axios is available
if (typeof axios !== 'undefined') {
  console.log('✅ Axios is available');
} else {
  console.log('❌ Axios is not available');
}

// Check if React components are mounted
if (document.querySelector('[data-testid="admin-dashboard"]') || 
    document.querySelector('.admin-dashboard') ||
    document.querySelector('h1')?.textContent?.includes('Admin')) {
  console.log('✅ Admin dashboard appears to be mounted');
} else {
  console.log('⚠️ Admin dashboard might not be mounted');
}
