import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MessageCircle, Send } from 'lucide-react';

const RideMessaging = ({ matchId, isVisible = true }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { user } = useAuth();
  const { sendMessage } = useWebSocket();

  // Quick message templates
  const quickMessages = [
    "I'm on my way",
    "I've arrived",
    "Please wait 2 minutes",
    "I'm running late",
    "Thank you!"
  ];

  const sendRideMessage = async () => {
    if (!message.trim() || !matchId) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/rides/${matchId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mobility_token')}`
        },
        body: JSON.stringify({
          message: message.trim(),
          type: 'text'
        })
      });

      if (response.ok) {
        // Add message to local state
        const newMessage = {
          id: Date.now(),
          sender_id: user.id,
          sender_name: user.name,
          sender_role: user.role,
          message: message.trim(),
          sent_at: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newMessage]);
        setMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendQuickMessage = (quickMessage) => {
    setMessage(quickMessage);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendRideMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Ride Messages
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages Display */}
        <div className="h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center text-sm">
              No messages yet. Start a conversation!
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.sender_id === user.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border text-gray-800'
                    }`}
                  >
                    <div className="font-medium text-xs mb-1">
                      {msg.sender_name} ({msg.sender_role})
                    </div>
                    <div>{msg.message}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(msg.sent_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Messages */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Quick Messages:</label>
          <div className="flex flex-wrap gap-2">
            {quickMessages.map((quickMsg, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => sendQuickMessage(quickMsg)}
                className="text-xs"
              >
                {quickMsg}
              </Button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button
            onClick={sendRideMessage}
            disabled={!message.trim()}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RideMessaging;
