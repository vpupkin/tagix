# Two-Way Messaging System

## Overview
The platform now supports full two-way messaging between admins, drivers, and riders. Users can reply to admin messages, creating conversation threads that are tracked, persisted, and visible in the audit trail.

## Features

### 1. **Reply to Notifications**
- Drivers and riders can reply to any notification they receive from admins
- Replies are sent back to the original sender (admin)
- Each reply creates or continues a conversation thread

### 2. **Conversation Threads**
- All messages are grouped into conversation threads
- Each thread has a unique ID that tracks the entire conversation
- Threads maintain chronological message order
- Messages show sender name, timestamp, and reply status

### 3. **Admin Conversation View**
- New "Conversations" tab in Admin Dashboard
- View all active conversation threads
- See participant count and message count for each thread
- Preview last 3 messages in each conversation
- Click "View Messages" to see full conversation history

### 4. **Audit Trail Integration**
- All messages logged in the audit trail
- Messages tagged with `[THREAD:xxxxxxxx]` for original messages
- Replies tagged with `[REPLY]` prefix
- Full conversation context available in audit metadata
- Filter by "Notification" entity type to see all messages

### 5. **Real-Time Delivery**
- Messages sent via WebSocket for instant delivery
- Offline message persistence (stored until user comes online)
- Delivery status tracking

## API Endpoints

### **POST /api/notifications/reply**
Send a reply to an existing notification.

**Request:**
```json
{
  "message": "Reply text",
  "original_notification_id": "uuid-of-original-notification"
}
```

**Response:**
```json
{
  "message": "Reply sent successfully",
  "reply_id": "new-reply-uuid",
  "conversation_thread": "thread-uuid"
}
```

### **GET /api/notifications/conversation/{thread_id}**
Get all messages in a conversation thread.

**Response:**
```json
[
  {
    "id": "msg-uuid",
    "user_id": "recipient-uuid",
    "sender_id": "sender-uuid",
    "sender_name": "John Doe",
    "message": "Original message",
    "is_reply": false,
    "conversation_thread": "thread-uuid",
    "created_at": "2025-10-10T15:00:00Z",
    "delivered": true
  },
  {
    "id": "reply-uuid",
    "user_id": "recipient-uuid",
    "sender_id": "sender-uuid",
    "sender_name": "Jane Smith",
    "message": "Reply message",
    "is_reply": true,
    "conversation_thread": "thread-uuid",
    "created_at": "2025-10-10T15:05:00Z",
    "delivered": true
  }
]
```

### **GET /api/admin/conversations**
Get all conversation threads (Admin only).

**Query Parameters:**
- `limit` (default: 50) - Number of conversations to return
- `offset` (default: 0) - Pagination offset

**Response:**
```json
{
  "conversations": [
    {
      "thread_id": "thread-uuid",
      "participants": ["user1-uuid", "user2-uuid"],
      "messages": [...],
      "last_message_at": "2025-10-10T15:05:00Z",
      "message_count": 5
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

## Frontend Usage

### **Driver/Rider UI**
When a notification appears:
1. Click on the notification
2. A reply dialog appears
3. Type your message
4. Click "Send Reply"
5. Reply is sent to the admin

### **Admin UI**
#### Viewing Conversations:
1. Go to Admin Dashboard
2. Click "Conversations" tab
3. See all conversation threads
4. Click "View Messages" to see full thread

#### Sending Messages:
1. Go to "Ride Monitoring" tab
2. Find a ride
3. Click "Send Notification" button
4. Choose recipient (rider, driver, or both)
5. Type message and send

## Database Schema

### Notification Document
```javascript
{
  "id": "notification-uuid",
  "user_id": "recipient-uuid",
  "sender_id": "sender-uuid",
  "sender_name": "Sender Name",
  "type": "notification_type",
  "message": "Message content",
  "conversation_thread": "thread-uuid",
  "is_reply": false,
  "original_notification_id": "parent-uuid", // for replies
  "delivered": true,
  "delivery_attempts": 1,
  "created_at": "2025-10-10T15:00:00Z",
  "delivered_at": "2025-10-10T15:00:01Z"
}
```

## Audit Trail Format

### Original Message
```
Action: admin_system_config_changed
Entity: notification
Description: [THREAD:825622c8] Hello! Please update your location.
Metadata: {
  "notification_type": "admin_message",
  "conversation_thread": "825622c8-...",
  "delivered": true,
  "message": "Hello! Please update your location.",
  "sender_name": "Test Admin"
}
```

### Reply Message
```
Action: admin_system_config_changed
Entity: notification
Description: [REPLY] Thank you, location updated!
Metadata: {
  "notification_type": "reply",
  "conversation_thread": "825622c8-...",
  "is_reply": true,
  "original_notification_id": "original-uuid",
  "delivered": true,
  "message": "Thank you, location updated!",
  "sender_name": "Test Driver"
}
```

## Testing

### Manual Testing:
1. Login as admin
2. Send notification to a driver/rider
3. Login as that driver/rider
4. View the notification
5. Click reply and send a message
6. Login back as admin
7. Go to Conversations tab
8. View the conversation thread
9. Check Audit Trail for [THREAD] and [REPLY] tags

### Automated Testing:
```bash
python3 test_messaging_system.py
```

## Benefits

### For Users (Drivers/Riders):
- ✅ Can ask questions about rides
- ✅ Can report issues directly to admin
- ✅ Get clarification on admin instructions
- ✅ Feel more connected and supported

### For Admins:
- ✅ Direct communication channel with users
- ✅ Track all conversations in one place
- ✅ See message history and context
- ✅ Better customer support capabilities
- ✅ Full audit trail for compliance

### For Platform:
- ✅ Improved user engagement
- ✅ Better issue resolution
- ✅ Enhanced transparency
- ✅ Complete communication audit trail
- ✅ Reduced support overhead

## Implementation Status

✅ Backend API endpoints implemented
✅ Conversation threading system
✅ Real-time WebSocket delivery
✅ Offline message persistence
✅ Admin conversation viewer
✅ Audit trail integration
✅ Conversation thread tags
✅ Full message history

## Next Steps

The messaging system is now fully functional! Users can:
1. Receive notifications from admins
2. Reply to those notifications
3. Engage in threaded conversations
4. View full conversation history (admins)
5. Track everything in the audit trail

All messages are persisted, tracked, and auditable for compliance and quality assurance.
