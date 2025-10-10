#!/usr/bin/env python3
"""
Comprehensive test to debug the notification flow between rider and admin
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
        return data["access_token"], data["user"]
    else:
        print(f"❌ Login failed: {response.text}")
        return None, None

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

def send_admin_message(admin_token, message, target_user_id, target_user_name):
    """Send admin message to user"""
    response = requests.post(f"{BASE_URL}/api/admin/notifications",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "message": message,
            "user_id": target_user_id,
            "target_user_id": target_user_id,
            "target_user_name": target_user_name
        }
    )
    
    if response.status_code == 200:
        print(f"✅ Admin message sent: {message}")
        return True
    else:
        print(f"❌ Failed to send admin message: {response.text}")
        return False

def send_reply(user_token, original_notification_id, reply_message, original_sender_id, original_sender_name):
    """Send reply from user to admin"""
    response = requests.post(f"{BASE_URL}/api/notifications/reply",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "message": reply_message,
            "original_notification_id": original_notification_id,
            "original_sender_id": original_sender_id,
            "original_sender_name": original_sender_name,
            "original_type": "admin_message"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Reply sent: {reply_message}")
        return data.get("conversation_thread")
    else:
        print(f"❌ Failed to send reply: {response.text}")
        return None

def get_conversations(admin_token):
    """Get all conversations for admin"""
    response = requests.get(f"{BASE_URL}/api/admin/conversations",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get conversations: {response.text}")
        return []

def analyze_notifications(notifications, user_name):
    """Analyze and display notifications"""
    print(f"\n📋 {user_name} Notifications Analysis:")
    print(f"   Total notifications: {len(notifications)}")
    
    # Group by type
    by_type = {}
    for notif in notifications:
        notif_type = notif.get("type", "unknown")
        if notif_type not in by_type:
            by_type[notif_type] = []
        by_type[notif_type].append(notif)
    
    for notif_type, notifs in by_type.items():
        print(f"   {notif_type}: {len(notifs)}")
        for notif in notifs[-3:]:  # Show last 3 of each type
            message = notif.get("message", "")[:50] + "..." if len(notif.get("message", "")) > 50 else notif.get("message", "")
            timestamp = notif.get("created_at", "")[:19] if notif.get("created_at") else "unknown"
            print(f"     - {message} ({timestamp})")

def main():
    print("🔍 COMPREHENSIVE NOTIFICATION FLOW DEBUG")
    print("=" * 60)
    
    # Step 1: Login as admin and rider
    print("\n1️⃣ Logging in as admin and rider...")
    admin_token, admin_user = login_user("testadmin@test.com", "testpass123")
    rider_token, rider_user = login_user("testrider@test.com", "testpass123")
    
    if not admin_token or not rider_token:
        print("❌ Login failed")
        return
    
    print(f"✅ Admin logged in: {admin_user['name']} (ID: {admin_user['id']})")
    print(f"✅ Rider logged in: {rider_user['name']} (ID: {rider_user['id']})")
    
    # Step 2: Get initial state
    print("\n2️⃣ Getting initial notification state...")
    initial_rider_notifications = get_user_notifications(rider_token)
    initial_admin_notifications = get_user_notifications(admin_token)
    
    analyze_notifications(initial_rider_notifications, "Rider (Initial)")
    analyze_notifications(initial_admin_notifications, "Admin (Initial)")
    
    # Step 3: Admin sends message to rider
    print("\n3️⃣ Admin sending message to rider...")
    test_message = f"Test message at {time.strftime('%H:%M:%S')} - Please reply with 'TEST REPLY'"
    if not send_admin_message(admin_token, test_message, rider_user['id'], rider_user['name']):
        return
    
    time.sleep(2)  # Wait for message to be processed
    
    # Step 4: Check notifications after admin message
    print("\n4️⃣ Checking notifications after admin message...")
    after_admin_message_rider = get_user_notifications(rider_token)
    after_admin_message_admin = get_user_notifications(admin_token)
    
    analyze_notifications(after_admin_message_rider, "Rider (After Admin Message)")
    analyze_notifications(after_admin_message_admin, "Admin (After Admin Message)")
    
    # Step 5: Find the admin message in rider's notifications
    print("\n5️⃣ Finding admin message in rider's notifications...")
    admin_message_notification = None
    for notif in after_admin_message_rider:
        if (notif.get("type") == "admin_message" and 
            test_message in notif.get("message", "")):
            admin_message_notification = notif
            break
    
    if not admin_message_notification:
        print("❌ Admin message not found in rider's notifications")
        return
    
    print(f"✅ Found admin message: {admin_message_notification['message']}")
    print(f"   Notification ID: {admin_message_notification['id']}")
    print(f"   Sender ID: {admin_message_notification.get('sender_id', 'N/A')}")
    print(f"   Sender Name: {admin_message_notification.get('sender_name', 'N/A')}")
    
    # Step 6: Rider sends reply
    print("\n6️⃣ Rider sending reply...")
    reply_message = f"TEST REPLY at {time.strftime('%H:%M:%S')}"
    conversation_thread = send_reply(
        rider_token, 
        admin_message_notification['id'], 
        reply_message,
        admin_user['id'],
        admin_user['name']
    )
    
    if not conversation_thread:
        return
    
    time.sleep(2)  # Wait for reply to be processed
    
    # Step 7: Check final notifications
    print("\n7️⃣ Checking final notifications...")
    final_rider_notifications = get_user_notifications(rider_token)
    final_admin_notifications = get_user_notifications(admin_token)
    
    analyze_notifications(final_rider_notifications, "Rider (Final)")
    analyze_notifications(final_admin_notifications, "Admin (Final)")
    
    # Step 8: Check conversations
    print("\n8️⃣ Checking admin conversations...")
    conversations = get_conversations(admin_token)
    print(f"📊 Total conversations: {len(conversations)}")
    
    if conversations:
        print(f"📋 Conversations structure: {type(conversations)}")
        if isinstance(conversations, list) and len(conversations) > 0:
            latest_conversation = conversations[0]  # Most recent
            print(f"📋 Latest conversation:")
            print(f"   Thread ID: {latest_conversation.get('thread_id', 'N/A')}")
            print(f"   Participants: {latest_conversation.get('participant_count', 'N/A')}")
            print(f"   Messages: {latest_conversation.get('message_count', 'N/A')}")
            print(f"   Last message: {latest_conversation.get('last_message_time', 'N/A')}")
            
            # Get conversation details
            thread_id = latest_conversation.get('thread_id')
            if thread_id:
                response = requests.get(f"{BASE_URL}/api/notifications/conversation/{thread_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
        else:
            print(f"📋 Conversations data: {conversations}")
            return
        
        if response.status_code == 200:
            conversation_details = response.json()
            print(f"📝 Conversation messages:")
            for msg in conversation_details.get('messages', []):
                sender = msg.get('sender_name', 'Unknown')
                message = msg.get('message', '')[:50] + "..." if len(msg.get('message', '')) > 50 else msg.get('message', '')
                timestamp = msg.get('timestamp', '')[:19] if msg.get('timestamp') else 'unknown'
                print(f"   {sender}: {message} ({timestamp})")
    
    # Step 9: Analyze the results
    print("\n9️⃣ Analyzing results...")
    
    rider_increase = len(final_rider_notifications) - len(initial_rider_notifications)
    admin_increase = len(final_admin_notifications) - len(initial_admin_notifications)
    
    print(f"📈 Rider notification increase: {rider_increase}")
    print(f"📈 Admin notification increase: {admin_increase}")
    
    # Check for specific notification types
    rider_reply_notifications = [n for n in final_rider_notifications if n.get("type") == "reply"]
    admin_reply_received_notifications = [n for n in final_admin_notifications if n.get("type") == "reply_received"]
    
    print(f"🔍 Rider reply notifications: {len(rider_reply_notifications)}")
    print(f"🔍 Admin reply_received notifications: {len(admin_reply_received_notifications)}")
    
    # Check for the specific test message
    rider_has_test_message = any(test_message in n.get("message", "") for n in final_rider_notifications)
    admin_has_test_reply = any(reply_message in n.get("message", "") for n in final_admin_notifications)
    
    print(f"🔍 Rider has test message: {rider_has_test_message}")
    print(f"🔍 Admin has test reply: {admin_has_test_reply}")
    
    print("\n🎉 DEBUG TEST COMPLETED!")

if __name__ == "__main__":
    main()
