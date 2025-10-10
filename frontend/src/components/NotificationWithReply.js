import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Reply, Send, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NotificationWithReply = ({ notification, onReplySent }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setSendingReply(true);
    try {
      const token = localStorage.getItem('mobility_token');
      
      // Debug: Log the notification data
      console.log('Notification data:', notification);
      
      const replyData = {
        message: replyMessage.trim(),
        original_notification_id: String(notification.id), // Convert to string
        original_sender_id: notification.sender_id || 'admin', // Fallback to 'admin'
        original_sender_name: notification.sender_name || 'Admin', // Fallback to 'Admin'
        original_type: notification.type || 'admin_message' // Fallback to 'admin_message'
      };
      
      console.log('Sending reply data:', replyData);
      
      const response = await axios.post(
        `${API_URL}/api/notifications/reply`,
        replyData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('Reply sent successfully!');
      setReplyMessage('');
      setShowReplyForm(false);
      
      // Notify parent component that reply was sent
      if (onReplySent) {
        onReplySent(response.data);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      const errorMessage = error.response?.data?.detail;
      if (typeof errorMessage === 'string') {
        toast.error(errorMessage);
      } else if (errorMessage && Array.isArray(errorMessage)) {
        toast.error(errorMessage.map(err => err.msg || err.message || String(err)).join(', '));
      } else {
        toast.error('Failed to send reply');
      }
    } finally {
      setSendingReply(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getNotificationType = (notification) => {
    if (notification.type === 'reply') return 'Reply';
    if (notification.type === 'admin_message') return 'Admin Message';
    if (notification.type === 'ride_request') return 'Ride Request';
    if (notification.type === 'ride_accepted') return 'Ride Accepted';
    if (notification.type === 'ride_started') return 'Ride Started';
    if (notification.type === 'ride_completed') return 'Ride Completed';
    if (notification.type === 'balance_transaction') return 'Balance Update';
    return 'Notification';
  };

  const getNotificationColor = (notification) => {
    if (notification.type === 'reply') return 'bg-blue-100 text-blue-800';
    if (notification.type === 'admin_message') return 'bg-purple-100 text-purple-800';
    if (notification.type === 'ride_request') return 'bg-yellow-100 text-yellow-800';
    if (notification.type === 'ride_accepted') return 'bg-green-100 text-green-800';
    if (notification.type === 'ride_started') return 'bg-blue-100 text-blue-800';
    if (notification.type === 'ride_completed') return 'bg-green-100 text-green-800';
    if (notification.type === 'balance_transaction') return 'bg-emerald-100 text-emerald-800';
    return 'bg-gray-100 text-gray-800';
  };

  const canReply = (notification) => {
    // Can reply to admin messages and some other types
    return notification.type === 'admin_message' || 
           notification.type === 'balance_transaction' ||
           notification.sender_id; // Has a sender (not system-generated)
  };

  return (
    <Card className="mb-3 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium">
              {getNotificationType(notification)}
            </CardTitle>
            <Badge className={getNotificationColor(notification)}>
              {getNotificationType(notification)}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {formatTime(notification.timestamp || notification.created_at)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Message content */}
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
            {notification.message || notification.data?.message || 'No message content'}
          </div>

          {/* Sender info */}
          {notification.sender_name && (
            <div className="text-xs text-gray-500">
              From: <span className="font-medium">{notification.sender_name}</span>
            </div>
          )}

          {/* Reply button */}
          {canReply(notification) && (
            <div className="flex justify-end">
              {!showReplyForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReplyForm(true)}
                  className="flex items-center space-x-1"
                >
                  <Reply className="h-3 w-3" />
                  <span>Reply</span>
                </Button>
              ) : (
                <div className="w-full space-y-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyMessage('');
                      }}
                      disabled={sendingReply}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={sendingReply || !replyMessage.trim()}
                      className="flex items-center space-x-1"
                    >
                      <Send className="h-3 w-3" />
                      <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationWithReply;
