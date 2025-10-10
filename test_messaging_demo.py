#!/usr/bin/env python3
"""
Demo script for the two-way messaging system
Tests the complete flow: admin sends message -> user receives -> user replies -> admin sees conversation
"""

import requests
import json
import time
import sys

# Configuration
BASE_URL = "http://localhost:8001"
ADMIN_EMAIL = "testadmin@test.com"
ADMIN_PASSWORD = "testpass123"
DRIVER_EMAIL = "testdriver@test.com"
DRIVER_PASSWORD = "testpass123"

def login(email, password):
    """Login and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    
    if response.status_code == 200:
        data = response.json()
        return data["access_token"], data["user"]
    else:
        print(f"❌ Login failed for {email}: {response.text}")
        return None, None

def send_direct_notification(admin_token, user_id, message):
    """Send direct notification from admin to user"""
    response = requests.post(f"{BASE_URL}/api/admin/notifications",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "user_id": user_id,
            "message": message,
            "notification_type": "admin_message"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Admin notification sent: {message}")
        return True
    else:
        print(f"❌ Failed to send notification: {response.text}")
        return False

def send_reply(driver_token, original_notification_id, reply_message, original_sender_id=None, original_sender_name=None, original_type=None):
    """Send reply from driver to admin"""
    response = requests.post(f"{BASE_URL}/api/notifications/reply",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={
            "message": reply_message,
            "original_notification_id": original_notification_id,
            "original_sender_id": original_sender_id,
            "original_sender_name": original_sender_name,
            "original_type": original_type
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Driver reply sent: {reply_message}")
        return data.get("conversation_thread")
    else:
        print(f"❌ Failed to send reply: {response.text}")
        return None

def get_conversations(admin_token):
    """Get all conversations (admin only)"""
    response = requests.get(f"{BASE_URL}/api/admin/conversations",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        return data.get("conversations", [])
    else:
        print(f"❌ Failed to get conversations: {response.text}")
        return []

def get_user_notifications(user_token):
    """Get user's notifications"""
    response = requests.get(f"{BASE_URL}/api/notifications",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get notifications: {response.text}")
        return []

def main():
    print("🚀 TWO-WAY MESSAGING SYSTEM DEMO")
    print("=" * 50)
    
    # Step 1: Login as admin
    print("\n1️⃣ Logging in as admin...")
    admin_token, admin_user = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        sys.exit(1)
    print(f"✅ Admin logged in: {admin_user['name']}")
    
    # Step 2: Login as driver
    print("\n2️⃣ Logging in as driver...")
    driver_token, driver_user = login(DRIVER_EMAIL, DRIVER_PASSWORD)
    if not driver_token:
        sys.exit(1)
    print(f"✅ Driver logged in: {driver_user['name']}")
    
    # Step 3: Admin sends direct notification to driver
    print("\n3️⃣ Admin sending direct notification to driver...")
    admin_message = "Hello! This is a test message from admin. Please reply to test the messaging system."
    if send_direct_notification(admin_token, driver_user['id'], admin_message):
        print("✅ Notification sent successfully!")
    else:
        print("❌ Failed to send notification")
        sys.exit(1)
    
    # Step 5: Wait a moment for the notification to be processed
    print("\n5️⃣ Waiting for notification to be processed...")
    time.sleep(2)
    
    # Step 6: Driver gets notifications
    print("\n6️⃣ Driver checking notifications...")
    notifications = get_user_notifications(driver_token)
    print(f"✅ Driver has {len(notifications)} notifications")
    
    if notifications:
        # Find the admin notification
        admin_notification = None
        for notif in notifications:
            if "admin" in notif.get("message", "").lower() or notif.get("type") == "admin_message":
                admin_notification = notif
                break
        
        if admin_notification:
            print(f"✅ Found admin notification: {admin_notification['message']}")
            
            # Step 7: Driver replies to admin message
            print("\n7️⃣ Driver replying to admin message...")
            reply_message = "Hi admin! This is my reply. The messaging system is working great!"
            conversation_thread = send_reply(
                driver_token, 
                admin_notification['id'], 
                reply_message,
                original_sender_id=admin_notification.get('sender_id', 'admin'),
                original_sender_name=admin_notification.get('sender_name', 'Admin'),
                original_type=admin_notification.get('type', 'admin_message')
            )
            
            if conversation_thread:
                print(f"✅ Reply sent! Conversation thread: {conversation_thread}")
                
                # Step 8: Wait for reply to be processed
                print("\n8️⃣ Waiting for reply to be processed...")
                time.sleep(2)
                
                # Step 9: Check conversations from admin perspective
                print("\n9️⃣ Checking conversations from admin perspective...")
                conversations = get_conversations(admin_token)
                print(f"✅ Found {len(conversations)} conversation(s)")
                
                if conversations:
                    print("\n📋 Conversation Details:")
                    for i, conv in enumerate(conversations, 1):
                        print(f"   Thread {i}: {conv['thread_id']}")
                        print(f"   Participants: {len(conv['participants'])}")
                        print(f"   Messages: {conv['message_count']}")
                        print(f"   Last message: {conv['last_message_at']}")
                else:
                    print("⚠️  No conversations found - this might be expected if the notification wasn't stored with conversation_thread")
            else:
                print("❌ Failed to send reply")
        else:
            print("⚠️  No admin notification found in driver's notifications")
    else:
        print("⚠️  Driver has no notifications")
    
    print("\n🎉 MESSAGING SYSTEM DEMO COMPLETED!")
    print("\n📋 What to check in the UI:")
    print("   1. Login as driver at http://localhost:3000")
    print("   2. Check the Notifications panel - you should see the admin message")
    print("   3. Click 'Reply' button on the notification")
    print("   4. Type a reply and send it")
    print("   5. Login as admin at http://localhost:3000")
    print("   6. Go to Admin Dashboard → Conversations tab")
    print("   7. You should see the conversation thread")
    print("   8. Go to Audit Trail → Filter by 'Notification'")
    print("   9. You should see [THREAD:xxxx] and [REPLY] entries")

if __name__ == "__main__":
    main()
