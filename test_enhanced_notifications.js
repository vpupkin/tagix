#!/usr/bin/env node

// Test enhanced notification system for Driver-Rider communication
const WebSocket = require('ws');

console.log('🔔 Testing Enhanced Notification System...\n');

// Test configuration
const testUserId = '78f12260-1486-4463-95fc-5bb6d26fdb3a';
const wsUrl = `ws://localhost:3000/ws/${testUserId}`;

console.log(`Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

// Track received notifications
const receivedNotifications = [];

ws.on('open', function open() {
  console.log('✅ WebSocket connection established!');
  
  // Test different notification types
  const testNotifications = [
    {
      type: 'ride_request',
      pickup_address: '123 Main St',
      dropoff_address: '456 Oak Ave',
      estimated_fare: 15.50
    },
    {
      type: 'ride_accepted',
      driver_name: 'John Driver',
      driver_rating: 4.8,
      estimated_arrival: '5 minutes'
    },
    {
      type: 'driver_arrived',
      driver_name: 'John Driver',
      driver_phone: '+1234567890',
      vehicle_info: 'Blue Toyota Camry',
      message: 'Your driver has arrived at the pickup location'
    },
    {
      type: 'ride_started',
      driver_name: 'John Driver',
      message: 'Your ride has started! Enjoy your journey.'
    },
    {
      type: 'ride_message',
      sender_name: 'John Driver',
      sender_role: 'driver',
      message: 'I\'m on my way to your location',
      sent_at: new Date().toISOString()
    },
    {
      type: 'ride_completed',
      message: 'Ride completed successfully! Please rate your experience.'
    },
    {
      type: 'proximity_alert',
      user_type: 'driver',
      distance_km: 0.5
    }
  ];
  
  // Send test notifications
  testNotifications.forEach((notification, index) => {
    setTimeout(() => {
      console.log(`📤 Sending test notification ${index + 1}: ${notification.type}`);
      ws.send(JSON.stringify(notification));
    }, index * 1000);
  });
  
  // Close connection after all tests
  setTimeout(() => {
    console.log('\n🔌 Closing connection...');
    ws.close(1000, 'Test completed');
  }, testNotifications.length * 1000 + 2000);
});

ws.on('message', function message(data) {
  try {
    const notification = JSON.parse(data);
    receivedNotifications.push(notification);
    
    console.log(`📨 Received notification: ${notification.type}`);
    
    // Display notification details based on type
    switch (notification.type) {
      case 'ride_request':
        console.log(`   📍 From: ${notification.pickup_address}`);
        console.log(`   🎯 To: ${notification.dropoff_address}`);
        console.log(`   💰 Fare: $${notification.estimated_fare}`);
        break;
        
      case 'ride_accepted':
        console.log(`   👨‍💼 Driver: ${notification.driver_name}`);
        console.log(`   ⭐ Rating: ${notification.driver_rating}`);
        console.log(`   ⏰ ETA: ${notification.estimated_arrival}`);
        break;
        
      case 'driver_arrived':
        console.log(`   🚗 Vehicle: ${notification.vehicle_info}`);
        console.log(`   📞 Phone: ${notification.driver_phone}`);
        console.log(`   💬 Message: ${notification.message}`);
        break;
        
      case 'ride_started':
        console.log(`   🚀 Message: ${notification.message}`);
        break;
        
      case 'ride_message':
        console.log(`   👤 From: ${notification.sender_name} (${notification.sender_role})`);
        console.log(`   💬 Message: ${notification.message}`);
        break;
        
      case 'ride_completed':
        console.log(`   ✅ Message: ${notification.message}`);
        break;
        
      case 'proximity_alert':
        console.log(`   📍 ${notification.user_type} nearby`);
        console.log(`   📏 Distance: ${notification.distance_km}km`);
        break;
        
      default:
        console.log(`   📋 Data: ${JSON.stringify(notification, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Error parsing message: ${error.message}`);
  }
});

ws.on('error', function error(err) {
  console.error(`❌ WebSocket error: ${err.message}`);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Notifications sent: 7`);
  console.log(`📨 Notifications received: ${receivedNotifications.length}`);
  
  const notificationTypes = [...new Set(receivedNotifications.map(n => n.type))];
  console.log(`🔔 Notification types received: ${notificationTypes.join(', ')}`);
  
  if (receivedNotifications.length === 7) {
    console.log('\n🎉 All notification tests passed!');
  } else {
    console.log('\n⚠️  Some notifications may not have been received');
  }
  
  console.log('\n✨ Enhanced notification system test completed!');
});
