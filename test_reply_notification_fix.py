#!/usr/bin/env python3
"""
Test script to verify that users don't receive their own reply notifications
"""

import requests
import json
import time

BASE_URL = "http://localhost:8001"

def login_user(email, password):
    """Login and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", 
        json={"email": email, "password": password})
    
    if response.status_code == 200:
        data = response.json()
        return data["access_token"]
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def get_user_notifications(token):
    """Get user's notifications"""
    response = requests.get(f"{BASE_URL}/api/notifications",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get notifications: {response.text}")
        return []

def send_admin_message(admin_token, message):
    """Send admin message to driver"""
    response = requests.post(f"{BASE_URL}/api/admin/notifications",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "message": message,
            "user_id": "5fb0c378-e42c-47f6-b428-950af666f0bc",  # Test Driver ID
            "target_user_id": "5fb0c378-e42c-47f6-b428-950af666f0bc",  # Test Driver ID
            "target_user_name": "Test Driver"
        }
    )
    
    if response.status_code == 200:
        print(f"✅ Admin message sent: {message}")
        return True
    else:
        print(f"❌ Failed to send admin message: {response.text}")
        return False

def send_reply(driver_token, original_notification_id, reply_message):
    """Send reply from driver to admin"""
    response = requests.post(f"{BASE_URL}/api/notifications/reply",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={
            "message": reply_message,
            "original_notification_id": original_notification_id,
            "original_sender_id": "5c7c188b-012e-4d22-9db2-ae5a089f0cb8",  # Admin ID
            "original_sender_name": "Test Admin",
            "original_type": "admin_message"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Driver reply sent: {reply_message}")
        return data.get("conversation_thread")
    else:
        print(f"❌ Failed to send reply: {response.text}")
        return None

def main():
    print("🧪 TESTING REPLY NOTIFICATION FIX")
    print("=" * 50)
    
    # Step 1: Login as admin and driver
    print("\n1️⃣ Logging in as admin and driver...")
    admin_token = login_user("testadmin@test.com", "testpass123")
    driver_token = login_user("testdriver@test.com", "testpass123")
    
    if not admin_token or not driver_token:
        print("❌ Login failed")
        return
    
    print("✅ Both users logged in successfully")
    
    # Step 2: Get initial notification counts
    print("\n2️⃣ Getting initial notification counts...")
    initial_driver_notifications = get_user_notifications(driver_token)
    initial_admin_notifications = get_user_notifications(admin_token)
    
    print(f"📊 Initial driver notifications: {len(initial_driver_notifications)}")
    print(f"📊 Initial admin notifications: {len(initial_admin_notifications)}")
    
    # Step 3: Send admin message
    print("\n3️⃣ Admin sending message to driver...")
    if not send_admin_message(admin_token, "Test message for reply notification fix"):
        return
    
    time.sleep(2)  # Wait for message to be processed
    
    # Step 4: Driver gets the admin message
    print("\n4️⃣ Driver checking for admin message...")
    driver_notifications = get_user_notifications(driver_token)
    
    # Find the admin message
    admin_message = None
    for notif in driver_notifications:
        if notif.get("type") == "admin_message" and "Test message for reply notification fix" in notif.get("message", ""):
            admin_message = notif
            break
    
    if not admin_message:
        print("❌ Admin message not found in driver notifications")
        return
    
    print(f"✅ Found admin message: {admin_message['message']}")
    
    # Step 5: Driver sends reply
    print("\n5️⃣ Driver sending reply...")
    conversation_thread = send_reply(driver_token, admin_message['id'], "This is a test reply to verify the fix")
    
    if not conversation_thread:
        return
    
    time.sleep(2)  # Wait for reply to be processed
    
    # Step 6: Check final notification counts
    print("\n6️⃣ Checking final notification counts...")
    final_driver_notifications = get_user_notifications(driver_token)
    final_admin_notifications = get_user_notifications(admin_token)
    
    print(f"📊 Final driver notifications: {len(final_driver_notifications)}")
    print(f"📊 Final admin notifications: {len(final_admin_notifications)}")
    
    # Step 7: Analyze the results
    print("\n7️⃣ Analyzing results...")
    
    driver_notification_increase = len(final_driver_notifications) - len(initial_driver_notifications)
    admin_notification_increase = len(final_admin_notifications) - len(initial_admin_notifications)
    
    print(f"📈 Driver notification increase: {driver_notification_increase}")
    print(f"📈 Admin notification increase: {admin_notification_increase}")
    
    # Check if driver received any reply notifications
    driver_reply_notifications = [n for n in final_driver_notifications if n.get("type") == "reply"]
    admin_reply_received_notifications = [n for n in final_admin_notifications if n.get("type") == "reply_received"]
    
    print(f"🔍 Driver reply notifications: {len(driver_reply_notifications)}")
    print(f"🔍 Admin reply_received notifications: {len(admin_reply_received_notifications)}")
    
    # Step 8: Verify the fix
    print("\n8️⃣ Verifying the fix...")
    
    if driver_notification_increase == 1:  # Only the admin message
        print("✅ SUCCESS: Driver only received the admin message, not their own reply")
    else:
        print(f"❌ FAIL: Driver received {driver_notification_increase} notifications (expected 1)")
    
    if admin_notification_increase == 1:  # Only the reply_received notification
        print("✅ SUCCESS: Admin received the reply_received notification")
    else:
        print(f"❌ FAIL: Admin received {admin_notification_increase} notifications (expected 1)")
    
    if len(driver_reply_notifications) == 0:
        print("✅ SUCCESS: Driver has no reply notifications (they shouldn't see their own replies)")
    else:
        print(f"❌ FAIL: Driver has {len(driver_reply_notifications)} reply notifications (expected 0)")
    
    if len(admin_reply_received_notifications) > 0:
        print("✅ SUCCESS: Admin has reply_received notifications")
    else:
        print("❌ FAIL: Admin has no reply_received notifications")
    
    print("\n🎉 TEST COMPLETED!")

if __name__ == "__main__":
    main()
