#!/usr/bin/env python3
"""
Test script for the two-way messaging system
Tests admin sending message, user replying, and conversation tracking
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

def send_admin_message(admin_token, driver_id, message):
    """Send message from admin to driver"""
    response = requests.post(f"{BASE_URL}/api/admin/notifications", 
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "user_id": driver_id,
            "message": message,
            "type": "admin_message"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Admin message sent: {message}")
        return data.get("notification_id")
    else:
        print(f"❌ Failed to send admin message: {response.text}")
        return None

def send_reply(driver_token, original_notification_id, reply_message):
    """Send reply from driver to admin"""
    response = requests.post(f"{BASE_URL}/api/notifications/reply",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={
            "message": reply_message,
            "original_notification_id": original_notification_id
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

def get_conversation_thread(admin_token, thread_id):
    """Get specific conversation thread"""
    response = requests.get(f"{BASE_URL}/api/notifications/conversation/{thread_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get conversation thread: {response.text}")
        return []

def main():
    print("🚀 TESTING TWO-WAY MESSAGING SYSTEM")
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
    
    # Step 3: Admin sends message to driver
    print("\n3️⃣ Admin sending message to driver...")
    admin_message = "Hello! This is a test message from admin. Please reply to test the messaging system."
    notification_id = send_admin_message(admin_token, driver_user['id'], admin_message)
    if not notification_id:
        sys.exit(1)
    
    # Step 4: Driver replies to admin message
    print("\n4️⃣ Driver replying to admin message...")
    reply_message = "Hi admin! This is my reply. The messaging system is working great!"
    conversation_thread = send_reply(driver_token, notification_id, reply_message)
    if not conversation_thread:
        sys.exit(1)
    
    # Step 5: Admin sends another message in the same thread
    print("\n5️⃣ Admin sending follow-up message...")
    followup_message = "Thanks for the reply! This creates a conversation thread."
    followup_notification_id = send_admin_message(admin_token, driver_user['id'], followup_message)
    
    # Step 6: Driver sends another reply
    print("\n6️⃣ Driver sending another reply...")
    second_reply = "Perfect! I can see the conversation thread is working correctly."
    send_reply(driver_token, followup_notification_id, second_reply)
    
    # Step 7: Check conversations from admin perspective
    print("\n7️⃣ Checking conversations from admin perspective...")
    conversations = get_conversations(admin_token)
    print(f"✅ Found {len(conversations)} conversation(s)")
    
    for i, conv in enumerate(conversations, 1):
        print(f"\n📋 Conversation {i}:")
        print(f"   Thread ID: {conv['thread_id']}")
        print(f"   Participants: {len(conv['participants'])}")
        print(f"   Messages: {conv['message_count']}")
        print(f"   Last message: {conv['last_message_at']}")
        
        # Get full conversation thread
        thread_messages = get_conversation_thread(admin_token, conv['thread_id'])
        print(f"   Full thread has {len(thread_messages)} messages:")
        
        for j, msg in enumerate(thread_messages, 1):
            sender = msg.get('sender_name', 'Unknown')
            message = msg.get('message', 'No message')
            is_reply = msg.get('is_reply', False)
            msg_type = "REPLY" if is_reply else "MESSAGE"
            print(f"     {j}. [{msg_type}] {sender}: {message}")
    
    print("\n🎉 MESSAGING SYSTEM TEST COMPLETED!")
    print("\n📋 What to check in the UI:")
    print("   1. Go to Admin Dashboard → Conversations tab")
    print("   2. You should see the conversation thread")
    print("   3. Click 'View Messages' to see the full conversation")
    print("   4. Go to Audit Trail → Filter by 'Notification'")
    print("   5. You should see [THREAD:xxxx] and [REPLY] entries")

if __name__ == "__main__":
    main()
