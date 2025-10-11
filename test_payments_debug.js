const axios = require('axios');

const API_URL = 'http://localhost:8000';

async function testPaymentsAPI() {
  try {
    // First, let's login as a driver to get a token
    console.log('🔍 Testing Payments API...');
    
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'driver@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful');
    
    // Test the payments endpoint
    const paymentsResponse = await axios.get(`${API_URL}/api/payments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Payments API Response:');
    console.log('Status:', paymentsResponse.status);
    console.log('Data length:', paymentsResponse.data.length);
    console.log('Sample payment data:');
    
    if (paymentsResponse.data.length > 0) {
      const samplePayment = paymentsResponse.data[0];
      console.log('Sample payment structure:');
      console.log(JSON.stringify(samplePayment, null, 2));
      
      // Check each field that the frontend expects
      console.log('\n🔍 Field Analysis:');
      console.log('id:', samplePayment.id, typeof samplePayment.id);
      console.log('ride_id:', samplePayment.ride_id, typeof samplePayment.ride_id);
      console.log('amount:', samplePayment.amount, typeof samplePayment.amount);
      console.log('driver_earnings:', samplePayment.driver_earnings, typeof samplePayment.driver_earnings);
      console.log('status:', samplePayment.status, typeof samplePayment.status);
      console.log('created_at:', samplePayment.created_at, typeof samplePayment.created_at);
      
      // Test date formatting
      try {
        const formattedDate = new Date(samplePayment.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log('Formatted date:', formattedDate);
      } catch (dateError) {
        console.log('❌ Date formatting error:', dateError.message);
      }
      
      // Test currency formatting
      try {
        const formattedAmount = `Ⓣ${samplePayment.amount.toFixed(2)}`;
        const formattedEarnings = `Ⓣ${samplePayment.driver_earnings.toFixed(2)}`;
        console.log('Formatted amount:', formattedAmount);
        console.log('Formatted earnings:', formattedEarnings);
      } catch (currencyError) {
        console.log('❌ Currency formatting error:', currencyError.message);
      }
      
    } else {
      console.log('No payments found');
    }
    
  } catch (error) {
    console.error('❌ Error testing payments API:', error.response?.data || error.message);
  }
}

testPaymentsAPI();
