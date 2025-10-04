import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import io from 'socket.io-client';

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
  const [notifications, setNotifications] = useState([]);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [rideRequests, setRideRequests] = useState([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3; // Reduced from 5 to 3
  const reconnectTimeoutRef = useRef(null);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    // WebSocket enabled - let's fix Apache2 configuration
    const WEBSOCKET_ENABLED = true; // Re-enabled to fix Apache2
    
    if (WEBSOCKET_ENABLED && isAuthenticated && user) {
      connectWebSocket();
    } else {
      if (isAuthenticated && user) {
        console.log('🔌 WebSocket temporarily disabled. Enable after fixing Apache2 configuration.');
      }
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
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      console.log('Backend URL from env:', backendUrl);
      const wsUrl = backendUrl.replace(/^http/, 'ws');
      console.log(`Attempting WebSocket connection to: ${wsUrl}/ws/${user.id}`);
      const newSocket = new WebSocket(`${wsUrl}/ws/${user.id}`);
      
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
        }
        break;

      case 'ride_started':
        toast.info('Ride has started', {
          description: 'Enjoy your journey!'
        });
        break;

      case 'ride_completed':
        toast.success('Ride completed successfully!', {
          description: 'Please rate your experience'
        });
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

      case 'connection_established':
        console.log('WebSocket connection established');
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10 notifications
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
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
    reconnect: connectWebSocket
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};