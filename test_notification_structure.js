#!/usr/bin/env node

// Test script to check notification structure
const axios = require('axios');

const BASE_URL = "http://localhost:8001";
const ADMIN_EMAIL = "testadmin@test.com";
const ADMIN_PASSWORD = "testpass123";
const DRIVER_EMAIL = "testdriver@test.com";
const DRIVER_PASSWORD = "testpass123";

async function login(email, password) {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: email,
        password: password
    });
    return response.data.access_token;
}

async function sendNotification(adminToken, driverId) {
    const response = await axios.post(`${BASE_URL}/api/admin/notifications`, {
        user_id: driverId,
        message: "Test message to check notification structure",
        notification_type: "admin_message"
    }, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    return response.data;
}

async function getNotifications(driverToken) {
    const response = await axios.get(`${BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${driverToken}` }
    });
    return response.data;
}

async function main() {
    try {
        console.log("🔍 Testing notification structure...");
        
        // Login as admin
        const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log("✅ Admin logged in");
        
        // Login as driver
        const driverToken = await login(DRIVER_EMAIL, DRIVER_PASSWORD);
        console.log("✅ Driver logged in");
        
        // Get driver info to get user ID
        const driverResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${driverToken}` }
        });
        const driverId = driverResponse.data.id;
        console.log(`✅ Driver ID: ${driverId}`);
        
        // Send notification
        await sendNotification(adminToken, driverId);
        console.log("✅ Notification sent");
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get notifications
        const notifications = await getNotifications(driverToken);
        console.log(`✅ Found ${notifications.length} notifications`);
        
        // Check notification structure
        if (notifications.length > 0) {
            const latestNotification = notifications[0];
            console.log("\n📋 Latest notification structure:");
            console.log(JSON.stringify(latestNotification, null, 2));
            
            // Check if it has the fields needed for reply
            const hasSenderId = 'sender_id' in latestNotification;
            const hasSenderName = 'sender_name' in latestNotification;
            const hasType = 'type' in latestNotification;
            
            console.log(`\n🔍 Reply capability check:`);
            console.log(`- Has sender_id: ${hasSenderId}`);
            console.log(`- Has sender_name: ${hasSenderName}`);
            console.log(`- Has type: ${hasType}`);
            console.log(`- Type value: ${latestNotification.type}`);
            
            if (hasSenderId && hasSenderName && hasType) {
                console.log("✅ Notification has all required fields for reply functionality");
            } else {
                console.log("❌ Notification is missing required fields for reply functionality");
            }
        }
        
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
    }
}

main();
