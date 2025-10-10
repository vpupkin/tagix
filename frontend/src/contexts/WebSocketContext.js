import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import io from 'socket.io-client';
import { getWebSocketUrl, getApiUrl } from '../utils/config';
import axios from 'axios';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    // Load notifications from localStorage on initialization
    try {
      const saved = localStorage.getItem('tagix_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old notifications to include sender fields if missing
        return parsed.map(notification => ({
          ...notification,
          sender_id: notification.sender_id || (notification.type === 'admin_message' ? 'admin' : null),
          sender_name: notification.sender_name || (notification.type === 'admin_message' ? 'Admin' : null)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
      return [];
    }
  });
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [rideRequests, setRideRequests] = useState([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3; // Reduced from 5 to 3
  const reconnectTimeoutRef = useRef(null);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connectWebSocket();
      // Fetch existing notifications from the server
      fetchNotifications();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socket) {
      if (typeof socket.close === 'function') {
        socket.close();
      } else if (typeof socket.disconnect === 'function') {
        socket.disconnect();
      }
    }

    try {
      // Use unified configuration
      const wsUrl = getWebSocketUrl();
      const backendUrl = getApiUrl();
      
      console.log('🔧 Using unified configuration:');
      console.log('🔧 WebSocket URL:', wsUrl);
      console.log('🔧 Backend URL:', backendUrl);
      
      console.log(`!!!!30000000000 !!! Attempting WebSocket connection to: ${wsUrl}/ws/${user.id}`);
      const newSocket = new WebSocket(`${wsUrl}/ws/${user.id}`);
      //const newSocket = new WebSocket(`wss://kar.bar/ws/${user.id}`);
      
      newSocket.onopen = () => {
        console.log('WebSocket connected successfully');
        setConnected(true);
        reconnectAttempts.current = 0;
        
        // Send initial connection message
        newSocket.send(JSON.stringify({
          type: 'connection_established',
          user_id: user.id,
          user_type: user.role
        }));
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        
        // Only attempt to reconnect if not manually closed and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts && isAuthenticated) {
          const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 2000, 10000); // Max 10 seconds
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts}) in ${delay/1000}s`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log('Max reconnection attempts reached. WebSocket connection failed.');
          toast.error('Unable to establish real-time connection. Some features may not work properly.');
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Only show error toast on first few attempts to avoid spam
        if (reconnectAttempts.current < 2) {
          toast.error('Connection error. Retrying...');
        }
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      toast.error('Failed to establish WebSocket connection');
    }
  };

  const disconnectWebSocket = () => {
    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socket) {
      if (typeof socket.close === 'function') {
        socket.close(1000, 'User logout'); // Normal closure for WebSocket
      } else if (typeof socket.disconnect === 'function') {
        socket.disconnect(); // For socket.io
      }
      setSocket(null);
    }
    setConnected(false);
    setNotifications([]);
    setNearbyDrivers([]);
    setRideRequests([]);
    reconnectAttempts.current = 0; // Reset reconnection attempts
  };


  const handleWebSocketMessage = (data) => {
    console.log('WebSocket message received:', data);

    switch (data.type) {
      case 'ride_request':
        if (user.role === 'driver') {
          setRideRequests(prev => [data, ...prev]);
          toast.info(`New ride request: ${data.pickup_address}`, {
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => {
                // Handle view action
              }
            }
          });
        }
        break;

      case 'ride_accepted':
        if (user.role === 'rider') {
          toast.success(`Driver ${data.driver_name} accepted your ride!`, {
            description: `ETA: ${data.estimated_arrival}`,
            duration: 8000
          });
          addNotification({
            id: Date.now(),
            type: 'ride_accepted',
            title: 'Ride Accepted!',
            message: `${data.driver_name} is on the way`,
            timestamp: new Date(),
            data: data
          });
        }
        break;

      case 'ride_no_longer_available':
        if (user.role === 'driver') {
          toast.info('Ride no longer available', {
            description: 'This ride request has been accepted by another driver',
            duration: 5000
          });
        }
        break;

      case 'ride_cancelled':
        toast.error('Ride has been cancelled', {
          description: data.reason || 'No reason provided'
        });
        addNotification({
          id: Date.now(),
          type: 'ride_cancelled',
          title: 'Ride Cancelled',
          message: data.reason || 'Your ride has been cancelled',
          timestamp: new Date()
        });
        break;

      case 'driver_arrived':
        if (user.role === 'rider') {
          toast.success('Your driver has arrived!', {
            description: 'Please head to the pickup location'
          });
          addNotification({
            id: Date.now(),
            type: 'driver_arrived',
            title: 'Driver Arrived!',
            message: 'Your driver has arrived at the pickup location',
            timestamp: new Date(),
            data: data
          });
        }
        break;

      case 'ride_started':
        if (user.role === 'rider') {
          toast.info('Ride has started', {
            description: 'Enjoy your journey!'
          });
          addNotification({
            id: Date.now(),
            type: 'ride_started',
            title: 'Ride Started!',
            message: 'Your ride has started! Enjoy your journey.',
            timestamp: new Date(),
            data: data
          });
        }
        break;

      case 'ride_completed':
        if (user.role === 'rider') {
          toast.success('Ride completed successfully!', {
            description: 'Please rate your experience'
          });
          addNotification({
            id: Date.now(),
            type: 'ride_completed',
            title: 'Ride Completed!',
            message: 'Your ride has been completed successfully',
            timestamp: new Date(),
            data: data
          });
        }
        break;

      case 'location_update':
        // Handle real-time location updates
        if (data.user_type === 'driver' && user.role === 'rider') {
          // Update driver location on map
        }
        break;

      case 'nearby_drivers_update':
        if (user.role === 'rider') {
          setNearbyDrivers(data.nearby_drivers || []);
        }
        break;

      case 'proximity_alert':
        toast.info(`${data.user_type} nearby`, {
          description: `${data.distance_km.toFixed(1)}km away`
        });
        break;

      case 'payment_required':
        toast.warning('Payment required', {
          description: 'Please complete payment to finish your ride',
          duration: 10000
        });
        break;

      case 'ride_message':
        // Handle direct messages between driver and rider
        const isFromDriver = data.sender_role === 'driver';
        const senderLabel = isFromDriver ? 'Driver' : 'Rider';
        
        toast.info(`Message from ${senderLabel}`, {
          description: data.message,
          duration: 8000
        });
        
        addNotification({
          id: Date.now(),
          type: 'ride_message',
          title: `Message from ${data.sender_name}`,
          message: data.message,
          timestamp: new Date(data.sent_at),
          data: data
        });
        break;

      case 'admin_message':
        // Handle admin messages to users
        toast.warning(`Message from Admin`, {
          description: data.message,
          duration: 10000
        });
        
        addNotification({
          id: Date.now(),
          type: 'admin_message',
          title: `Admin Message`,
          message: data.message,
          timestamp: new Date(data.timestamp),
          sender_id: data.sender_id || 'admin',
          sender_name: data.sender_name || 'Admin',
          data: data
        });
        break;

      case 'reply_received':
        // Handle reply notifications for admins
        if (user.role === 'admin') {
          toast.info(`Reply from ${data.sender_name}`, {
            description: data.message,
            duration: 10000
          });
          
          addNotification({
            id: Date.now(),
            type: 'reply_received',
            title: `Reply from ${data.sender_name}`,
            message: data.message,
            timestamp: new Date(data.timestamp),
            sender_id: data.sender_id,
            sender_name: data.sender_name,
            data: data
          });
        }
        break;

      case 'admin_ride_message':
        // Handle admin messages related to specific rides
        toast.warning(`Admin Message - Ride ${data.ride_id}`, {
          description: data.message,
          duration: 10000
        });
        
        addNotification({
          id: Date.now(),
          type: 'admin_ride_message',
          title: `Admin Message - Ride`,
          message: data.message,
          timestamp: new Date(data.timestamp),
          sender_id: data.sender_id || 'admin',
          sender_name: data.sender_name || 'Admin',
          data: data
        });
        break;

      case 'balance_transaction':
        // Handle balance transaction notifications
        const isCredit = data.transaction_type === 'credit' || data.transaction_type === 'refund';
        const isDebit = data.transaction_type === 'debit';
        
        const transactionIcon = isCredit ? '💰' : '💸';
        const transactionColor = isCredit ? 'success' : 'warning';
        
        toast[transactionColor](`${transactionIcon} Balance ${data.transaction_type}`, {
          description: data.message,
          duration: 12000
        });
        
        addNotification({
          id: Date.now(),
          type: 'balance_transaction',
          title: `Balance ${data.transaction_type.charAt(0).toUpperCase() + data.transaction_type.slice(1)}`,
          message: data.message,
          timestamp: new Date(data.timestamp),
          sender_id: data.sender_id || 'admin',
          sender_name: data.sender_name || 'Admin',
          data: data
        });

        // Trigger balance refresh event for dashboard components
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: {
            newBalance: data.new_balance,
            transactionType: data.transaction_type,
            amount: data.amount
          }
        }));
        break;

      case 'reply_received':
        // Handle reply notifications for admins
        if (user.role === 'admin') {
          toast.info(`Reply from ${data.sender_name}`, {
            description: data.message,
            duration: 10000
          });
          
          addNotification({
            id: Date.now(),
            type: 'reply_received',
            title: `Reply from ${data.sender_name}`,
            message: data.message,
            timestamp: new Date(data.timestamp),
            sender_id: data.sender_id,
            sender_name: data.sender_name,
            data: data
          });
        }
        break;

      case 'connection_established':
        console.log('WebSocket connection established');
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev.slice(0, 9)]; // Keep last 10 notifications
      // Persist to localStorage
      try {
        localStorage.setItem('tagix_notifications', JSON.stringify(newNotifications));
      } catch (error) {
        console.error('Error saving notifications to localStorage:', error);
      }
      return newNotifications;
    });
  };

  const removeNotification = (id) => {
    setNotifications(prev => {
      const newNotifications = prev.filter(n => n.id !== id);
      // Persist to localStorage
      try {
        localStorage.setItem('tagix_notifications', JSON.stringify(newNotifications));
      } catch (error) {
        console.error('Error saving notifications to localStorage:', error);
      }
      return newNotifications;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    // Clear from localStorage
    try {
      localStorage.removeItem('tagix_notifications');
    } catch (error) {
      console.error('Error clearing notifications from localStorage:', error);
    }
  };

  const sendMessage = (message) => {
    if (socket && connected) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
    }
  };

  const updateLocation = (location) => {
    sendMessage({
      type: 'location_update',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: new Date().toISOString()
      },
      user_type: user.role
    });
  };

  const subscribeToProximityUpdates = (radius = 5.0) => {
    sendMessage({
      type: 'proximity_subscription',
      radius_km: radius,
      user_types: user.role === 'rider' ? ['driver'] : ['rider'],
      update_interval: 10
    });
  };

  const unsubscribeFromProximityUpdates = () => {
    sendMessage({
      type: 'proximity_unsubscribe'
    });
  };

  const fetchNotifications = async () => {
    if (!user || !isAuthenticated) return;
    
    try {
      const token = localStorage.getItem('mobility_token');
      if (!token) return;
      
      const response = await axios.get(`${getApiUrl()}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // The API returns an array directly, not an object with notifications property
      const fetchedNotifications = Array.isArray(response.data) ? response.data : response.data.notifications || [];
      
      // Merge with existing notifications, avoiding duplicates
      setNotifications(prevNotifications => {
        const existingIds = new Set(prevNotifications.map(n => n.id));
        const newNotifications = fetchedNotifications.filter(n => !existingIds.has(n.id));
        
        // Combine and sort by timestamp
        const allNotifications = [...prevNotifications, ...newNotifications]
          .sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
        
        // Save to localStorage
        try {
          localStorage.setItem('tagix_notifications', JSON.stringify(allNotifications));
        } catch (error) {
          console.error('Error saving notifications to localStorage:', error);
        }
        
        return allNotifications;
      });
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const value = {
    socket,
    connected,
    notifications,
    nearbyDrivers,
    rideRequests,
    sendMessage,
    updateLocation,
    subscribeToProximityUpdates,
    unsubscribeFromProximityUpdates,
    addNotification,
    removeNotification,
    clearNotifications,
    fetchNotifications,
    reconnect: connectWebSocket
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};