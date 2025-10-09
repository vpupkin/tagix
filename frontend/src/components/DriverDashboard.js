import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import axios from 'axios';
import { 
  Car, 
  DollarSign, 
  Clock, 
  Star, 
  MapPin, 
  Activity, 
  TrendingUp,
  Navigation,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  History,
  Settings,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { getRevisionInfo } from '../utils/gitRevision';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DriverDashboard = () => {
  const { user, updateUser } = useAuth();
  const { connected, rideRequests, notifications } = useWebSocket();
  const [isOnline, setIsOnline] = useState(user?.is_online || false);
  
  // Git revision for deployment verification
  const revisionInfo = getRevisionInfo();
  
  // Update isOnline when user data changes
  useEffect(() => {
    console.log('🔍 DriverDashboard: User data changed');
    console.log('🔍 user.is_online:', user?.is_online);
    setIsOnline(user?.is_online || false);
  }, [user?.is_online]);
  const [loading, setLoading] = useState(true);
  const [recentRides, setRecentRides] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [availableRides, setAvailableRides] = useState([]);
  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
    averageRating: 5.0,
    completionRate: 100,
    todayEarnings: 0,
    todayRides: 0
  });
  const [balance, setBalance] = useState({
    currentBalance: 0.0,
    recentTransactions: []
  });

  useEffect(() => {
    fetchDriverData();
    fetchUserBalance();
  }, []);

  // Listen for balance updates from WebSocket
  useEffect(() => {
    const handleBalanceUpdate = (event) => {
      console.log('🔄 Balance update received:', event.detail);
      // Refresh balance data
      fetchUserBalance();
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate);
    };
  }, []);

  useEffect(() => {
    console.log('🔍 DriverDashboard: useEffect for isOnline triggered');
    console.log('🔍 isOnline:', isOnline);
    console.log('🔍 user:', user);
    
    if (isOnline) {
      console.log('🔍 Driver is online, fetching available rides...');
      fetchAvailableRides();
      // Set up interval to refresh available rides every 30 seconds
      const interval = setInterval(() => {
        console.log('🔍 Interval: Refreshing available rides...');
        fetchAvailableRides();
      }, 30000);
      return () => {
        console.log('🔍 Clearing interval');
        clearInterval(interval);
      };
    } else {
      console.log('🔍 Driver is offline, clearing available rides');
      setAvailableRides([]);
    }
  }, [isOnline]);

  const fetchDriverData = async () => {
    try {
      console.log('🔍 DriverDashboard: fetchDriverData called');
      console.log('🔍 API_URL:', API_URL);
      console.log('🔍 User:', user);
      
      if (!API_URL) {
        console.error('❌ API_URL is undefined!');
        return;
      }
      
      if (!user) {
        console.error('❌ User not authenticated!');
        return;
      }
      
      const [ridesResponse, profileResponse] = await Promise.allSettled([
        axios.get(`${API_URL}/api/rides/my-rides`),
        axios.get(`${API_URL}/api/driver/profile`)
      ]);

      if (ridesResponse.status === 'fulfilled') {
        const rides = ridesResponse.value.data;
        console.log('🔍 Driver rides loaded:', rides.length);
        setRecentRides(rides.slice(0, 3));
        calculateStats(rides);
      } else {
        console.error('❌ Failed to fetch driver rides:', ridesResponse.reason);
      }

      if (profileResponse.status === 'fulfilled') {
        console.log('🔍 Driver profile loaded:', profileResponse.value.data);
        setDriverProfile(profileResponse.value.data);
      } else {
        console.log('⚠️ Driver profile not found (404) - driver needs to set up profile');
        // Don't show error for missing profile, it's expected for new drivers
        setDriverProfile(null);
      }
    } catch (error) {
      console.error('❌ Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      console.log('🔍 DriverDashboard: fetchUserBalance called');
      
      const response = await axios.get(`${API_URL}/api/user/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mobility_token')}`
        }
      });
      
      const data = response.data;
      console.log('🔍 Balance data:', data);
      
      setBalance({
        currentBalance: data.current_balance || 0.0,
        recentTransactions: data.recent_transactions || []
      });
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      // Don't show error toast for balance, it's not critical
    }
  };

  const fetchAvailableRides = async () => {
    console.log('🔍 DriverDashboard: fetchAvailableRides called');
    console.log('🔍 isOnline:', isOnline);
    console.log('🔍 API_URL:', API_URL);
    console.log('🔍 User:', user);
    
    if (!isOnline) {
      console.log('⚠️ Driver not online, skipping fetch');
      return;
    }
    
    if (!API_URL) {
      console.error('❌ API_URL is undefined!');
      return;
    }
    
    if (!user) {
      console.error('❌ User not authenticated!');
      return;
    }
    
    try {
      console.log('🔍 Making API call to /api/rides/available...');
      const response = await axios.get(`${API_URL}/api/rides/available`);
      console.log('🔍 Available rides response:', response.data);
      
      if (response.status === 200) {
        const rides = response.data.available_rides || [];
        console.log('🔍 Setting available rides:', rides.length);
        setAvailableRides(rides);
      }
    } catch (error) {
      console.error('❌ Error fetching available rides:', error);
      console.error('Error details:', error.response?.data);
      if (error.response?.status === 400) {
        // Driver not online or no location set
        console.log('⚠️ Driver not online or no location set');
        setAvailableRides([]);
      }
    }
  };

  const calculateStats = (rides) => {
    const completedRides = rides.filter(ride => ride.status === 'completed');
    const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.estimated_fare || 0), 0);
    
    // Calculate today's stats
    const today = new Date().toDateString();
    const todayRides = completedRides.filter(ride => 
      new Date(ride.completed_at).toDateString() === today
    );
    const todayEarnings = todayRides.reduce((sum, ride) => sum + (ride.estimated_fare || 0), 0);
    
    const completionRate = rides.length > 0 
      ? (completedRides.length / rides.length) * 100 
      : 100;

    setStats({
      totalRides: completedRides.length,
      totalEarnings: totalEarnings,
      averageRating: user.rating || 5.0,
      completionRate: Math.round(completionRate),
      todayEarnings: todayEarnings,
      todayRides: todayRides.length
    });
  };

  const toggleOnlineStatus = async () => {
    try {
      await axios.post(`${API_URL}/api/driver/online`);
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      updateUser({ is_online: newStatus });
      
      if (newStatus) {
        // Fetch available rides when going online
        setTimeout(() => fetchAvailableRides(), 1000);
      }
      
      toast.success(`You are now ${newStatus ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error toggling online status:', error);
      toast.error('Failed to update online status');
    }
  };

  const acceptRideRequest = async (requestId) => {
    try {
      await axios.post(`${API_URL}/api/rides/${requestId}/accept`);
      toast.success('Ride request accepted!');
      // Remove from pending requests (handled by WebSocket)
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast.error('Failed to accept ride request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="driver-dashboard" id="driver-dashboard-main">
      {/* GIT REVISION DISPLAY - DEPLOYMENT VERIFICATION */}
      <div className="fixed top-0 left-0 right-0 bg-green-600 text-white text-center py-2 z-50 font-mono text-sm font-bold" id="git-revision-display-driver">
        🚀 GIT REVISION: {revisionInfo.revision} | BUILD: {revisionInfo.buildTime} | DRIVER DASHBOARD
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12" id="driver-dashboard-container">
        {/* Header */}
        <div className="mb-8" id="driver-dashboard-header">
          <div className="flex items-center justify-between" id="driver-dashboard-header-content">
            <div id="driver-dashboard-welcome">
              <h1 className="text-3xl font-bold text-gray-900" id="driver-dashboard-title">
                Hello, {user.name}! 🚗
              </h1>
              <p className="text-gray-600 mt-1" id="driver-dashboard-subtitle">
                {isOnline ? 'Ready to earn today?' : 'Go online to start earning'}
              </p>
            </div>
            <div className="flex items-center space-x-4" id="driver-dashboard-header-actions">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`} id="driver-dashboard-connection-status">
                <div className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-400' : 'bg-red-400'
                }`} id="driver-dashboard-connection-indicator" />
                <span id="driver-dashboard-connection-text">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div className="flex items-center space-x-3" id="driver-dashboard-online-controls">
                <span className={`text-sm font-medium ${
                  isOnline ? 'text-emerald-700' : 'text-gray-600'
                }`} id="driver-dashboard-online-status-text">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <Switch
                  checked={isOnline}
                  onCheckedChange={toggleOnlineStatus}
                  data-testid="online-toggle"
                  id="driver-dashboard-online-toggle"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Available Rides and Notifications - Side by side at top level */}
        <div className="mb-8" id="driver-dashboard-top-panels">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="driver-dashboard-top-grid">
            {/* Available Rides */}
            <Card className="card-hover" id="driver-dashboard-available-rides-card">
              <CardHeader id="driver-dashboard-available-rides-header">
                <CardTitle className="flex items-center justify-between" id="driver-dashboard-available-rides-title">
                  <span>Available Rides</span>
                  <Badge variant={availableRides.length > 0 ? "default" : "secondary"} id="driver-dashboard-available-rides-count">
                    {availableRides.length}
                  </Badge>
                </CardTitle>
                <CardDescription id="driver-dashboard-available-rides-description">
                  {isOnline ? 'Available ride requests' : 'Go online to see requests'}
                </CardDescription>
              </CardHeader>
              <CardContent id="driver-dashboard-available-rides-content">
                {isOnline ? (
                  availableRides.length > 0 ? (
                    <div className="space-y-4" id="driver-dashboard-available-rides-list">
                      {availableRides.slice(0, 3).map((ride) => (
                        <div key={ride.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200" id={`driver-dashboard-available-ride-${ride.id}`}>
                          <div className="flex items-start justify-between mb-3" id={`driver-dashboard-available-ride-header-${ride.id}`}>
                            <div className="flex-1" id={`driver-dashboard-available-ride-info-${ride.id}`}>
                              <p className="font-medium text-gray-900 text-sm" id={`driver-dashboard-available-ride-pickup-${ride.id}`}>
                                {ride.pickup_location?.address || 'Pickup Location'}
                              </p>
                              <p className="text-xs text-gray-600 mt-1" id={`driver-dashboard-available-ride-dropoff-${ride.id}`}>
                                → {ride.dropoff_location?.address || 'Destination'}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs" id={`driver-dashboard-available-ride-fare-${ride.id}`}>
                              ${ride.estimated_fare?.toFixed(2) || '0.00'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between" id={`driver-dashboard-available-ride-footer-${ride.id}`}>
                            <p className="text-xs text-blue-600" id={`driver-dashboard-available-ride-distance-${ride.id}`}>
                              {ride.distance_to_pickup?.toFixed(1) || '0.0'} km away
                            </p>
                            <Button 
                              size="sm" 
                              className="btn-primary text-xs px-3 py-1"
                              onClick={() => acceptRideRequest(ride.id)}
                              data-testid={`accept-ride-${ride.id}`}
                              id={`driver-dashboard-accept-ride-button-${ride.id}`}
                            >
                              Accept
                            </Button>
                          </div>
                        </div>
                      ))}
                      {availableRides.length > 3 && (
                        <div className="text-center pt-2" id="driver-dashboard-available-rides-more">
                          <p className="text-xs text-gray-500" id="driver-dashboard-available-rides-more-text">
                            +{availableRides.length - 3} more rides available
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8" id="driver-dashboard-no-available-rides">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4" id="driver-dashboard-no-rides-icon">
                        <Car className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm" id="driver-dashboard-no-rides-message">No rides available right now</p>
                      <p className="text-gray-400 text-xs mt-1" id="driver-dashboard-no-rides-submessage">Check back in a few minutes</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8" id="driver-dashboard-offline-message">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4" id="driver-dashboard-offline-icon">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm" id="driver-dashboard-offline-text">Go online to see available rides</p>
                    <p className="text-gray-400 text-xs mt-1" id="driver-dashboard-offline-subtext">Toggle the switch above to start earning</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="card-hover" id="driver-dashboard-notifications-card">
              <CardHeader id="driver-dashboard-notifications-header">
                <CardTitle className="flex items-center justify-between" id="driver-dashboard-notifications-title">
                  <span>Notifications</span>
                  <Badge variant="secondary" id="driver-dashboard-notifications-count">{notifications.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent id="driver-dashboard-notifications-content">
                {notifications.length > 0 ? (
                  <div className="space-y-3" id="driver-dashboard-notifications-list">
                    {notifications.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="p-3 bg-gray-50 rounded-lg" id={`driver-dashboard-notification-${notification.id}`}>
                        <p className="font-medium text-sm text-gray-900" id={`driver-dashboard-notification-title-${notification.id}`}>{notification.title}</p>
                        <p className="text-xs text-gray-600 mt-1" id={`driver-dashboard-notification-message-${notification.id}`}>{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2" id={`driver-dashboard-notification-time-${notification.id}`}>
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                    {notifications.length > 3 && (
                      <div className="text-center pt-2" id="driver-dashboard-notifications-more">
                        <p className="text-xs text-gray-500" id="driver-dashboard-notifications-more-text">
                          +{notifications.length - 3} more notifications
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8" id="driver-dashboard-no-notifications">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4" id="driver-dashboard-no-notifications-icon">
                      <Activity className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm" id="driver-dashboard-no-notifications-message">No notifications yet</p>
                    <p className="text-gray-400 text-xs mt-1" id="driver-dashboard-no-notifications-submessage">You'll see updates here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="driver-dashboard-grid">
          {/* Left Column - Stats and Performance */}
          <div className="lg:col-span-2 space-y-6" id="driver-dashboard-left-column">
            {/* Today's Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="driver-dashboard-today-stats">
              <Card className="card-hover bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" id="driver-dashboard-today-earnings-card">
                <CardContent className="p-6" id="driver-dashboard-today-earnings-content">
                  <div className="flex items-center justify-between" id="driver-dashboard-today-earnings-layout">
                    <div id="driver-dashboard-today-earnings-info">
                      <p className="text-sm font-medium text-emerald-700" id="driver-dashboard-today-earnings-label">Today's Earnings</p>
                      <p className="text-3xl font-bold text-emerald-900" id="driver-dashboard-today-earnings-value">${stats.todayEarnings.toFixed(2)}</p>
                      <p className="text-sm text-emerald-600 mt-1" id="driver-dashboard-today-earnings-details">{stats.todayRides} rides completed</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center" id="driver-dashboard-today-earnings-icon">
                      <DollarSign className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200" id="driver-dashboard-status-card">
                <CardContent className="p-6" id="driver-dashboard-status-content">
                  <div className="flex items-center justify-between" id="driver-dashboard-status-layout">
                    <div id="driver-dashboard-status-info">
                      <p className="text-sm font-medium text-blue-700" id="driver-dashboard-status-label">Status</p>
                      <div className="flex items-center space-x-2 mt-1" id="driver-dashboard-status-display">
                        {isOnline ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-emerald-500" id="driver-dashboard-status-online-icon" />
                            <span className="text-xl font-bold text-emerald-700" id="driver-dashboard-status-online-text">Online</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-5 w-5 text-gray-500" id="driver-dashboard-status-offline-icon" />
                            <span className="text-xl font-bold text-gray-700" id="driver-dashboard-status-offline-text">Offline</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-blue-600 mt-1" id="driver-dashboard-status-description">
                        {isOnline ? 'Ready for rides' : 'Go online to start'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center" id="driver-dashboard-status-icon">
                      <Activity className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" id="driver-dashboard-balance-card">
                <CardContent className="p-6" id="driver-dashboard-balance-content">
                  <div className="flex items-center justify-between" id="driver-dashboard-balance-layout">
                    <div id="driver-dashboard-balance-info">
                      <p className="text-sm font-medium text-green-700" id="driver-dashboard-balance-label">Balance</p>
                      <p className="text-3xl font-bold text-green-900" id="driver-dashboard-balance-value">${balance.currentBalance.toFixed(2)}</p>
                      <p className="text-sm text-green-600 mt-1" id="driver-dashboard-balance-details">Available funds</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center" id="driver-dashboard-balance-icon">
                      <Wallet className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="driver-dashboard-overall-stats">
              <Card className="card-hover" id="driver-dashboard-total-rides-card">
                <CardContent className="p-6" id="driver-dashboard-total-rides-content">
                  <div className="flex items-center justify-between" id="driver-dashboard-total-rides-layout">
                    <div id="driver-dashboard-total-rides-info">
                      <p className="text-sm font-medium text-gray-600" id="driver-dashboard-total-rides-label">Total Rides</p>
                      <p className="text-2xl font-bold text-gray-900" id="driver-dashboard-total-rides-value">{stats.totalRides}</p>
                    </div>
                    <Car className="h-8 w-8 text-indigo-600" id="driver-dashboard-total-rides-icon" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover" id="driver-dashboard-total-earnings-card">
                <CardContent className="p-6" id="driver-dashboard-total-earnings-content">
                  <div className="flex items-center justify-between" id="driver-dashboard-total-earnings-layout">
                    <div id="driver-dashboard-total-earnings-info">
                      <p className="text-sm font-medium text-gray-600" id="driver-dashboard-total-earnings-label">Total Earnings</p>
                      <p className="text-2xl font-bold text-gray-900" id="driver-dashboard-total-earnings-value">${stats.totalEarnings.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600" id="driver-dashboard-total-earnings-icon" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover" id="driver-dashboard-rating-card">
                <CardContent className="p-6" id="driver-dashboard-rating-content">
                  <div className="flex items-center justify-between" id="driver-dashboard-rating-layout">
                    <div id="driver-dashboard-rating-info">
                      <p className="text-sm font-medium text-gray-600" id="driver-dashboard-rating-label">Rating</p>
                      <div className="flex items-center space-x-1" id="driver-dashboard-rating-display">
                        <p className="text-2xl font-bold text-gray-900" id="driver-dashboard-rating-value">{stats.averageRating}</p>
                        <Star className="h-5 w-5 text-yellow-400 fill-current" id="driver-dashboard-rating-star" />
                      </div>
                    </div>
                    <Star className="h-8 w-8 text-yellow-600" id="driver-dashboard-rating-icon" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover" id="driver-dashboard-completion-card">
                <CardContent className="p-6" id="driver-dashboard-completion-content">
                  <div className="flex items-center justify-between" id="driver-dashboard-completion-layout">
                    <div id="driver-dashboard-completion-info">
                      <p className="text-sm font-medium text-gray-600" id="driver-dashboard-completion-label">Completion</p>
                      <p className="text-2xl font-bold text-gray-900" id="driver-dashboard-completion-value">{stats.completionRate}%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" id="driver-dashboard-completion-icon" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Rides */}
            <Card className="card-hover" id="driver-dashboard-recent-rides-card">
              <CardHeader id="driver-dashboard-recent-rides-header">
                <div className="flex items-center justify-between" id="driver-dashboard-recent-rides-header-content">
                  <div id="driver-dashboard-recent-rides-title-section">
                    <CardTitle className="flex items-center space-x-2" id="driver-dashboard-recent-rides-title">
                      <History className="h-5 w-5 text-indigo-600" />
                      <span>Recent Rides</span>
                    </CardTitle>
                    <CardDescription id="driver-dashboard-recent-rides-description">
                      Your latest completed rides
                    </CardDescription>
                  </div>
                  <Link to="/rides" id="driver-dashboard-view-all-rides-link">
                    <Button variant="outline" size="sm" id="driver-dashboard-view-all-rides-button">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent id="driver-dashboard-recent-rides-content">
                {recentRides.length > 0 ? (
                  <div className="space-y-4" id="driver-dashboard-recent-rides-list">
                    {recentRides.map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" id={`driver-dashboard-ride-${ride.id}`}>
                        <div className="flex items-center space-x-4" id={`driver-dashboard-ride-info-${ride.id}`}>
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center" id={`driver-dashboard-ride-icon-${ride.id}`}>
                            <Navigation className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div id={`driver-dashboard-ride-details-${ride.id}`}>
                            <p className="font-medium text-gray-900" id={`driver-dashboard-ride-route-${ride.id}`}>
                              {ride.pickup_location?.address || 'Pickup'} → {ride.dropoff_location?.address || 'Destination'}
                            </p>
                            <p className="text-sm text-gray-600" id={`driver-dashboard-ride-date-${ride.id}`}>
                              {formatDate(ride.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right" id={`driver-dashboard-ride-status-${ride.id}`}>
                          <Badge className={getStatusColor(ride.status)} id={`driver-dashboard-ride-badge-${ride.id}`}>
                            {ride.status.replace('_', ' ')}
                          </Badge>
                          <p className="text-sm font-medium text-emerald-600 mt-1" id={`driver-dashboard-ride-earnings-${ride.id}`}>
                            +${ride.estimated_fare?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" id="driver-dashboard-no-rides">
                    <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" id="driver-dashboard-no-rides-icon" />
                    <p className="text-gray-500 mb-4" id="driver-dashboard-no-rides-message">No recent rides found</p>
                    <p className="text-sm text-gray-400" id="driver-dashboard-no-rides-hint">Go online to start receiving ride requests</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Vehicle Information and Tips */}
          <div className="space-y-6" id="driver-dashboard-right-column">
            {/* Vehicle Information */}
            {driverProfile && (
              <Card className="card-hover" id="driver-dashboard-vehicle-info-card">
                <CardHeader id="driver-dashboard-vehicle-info-header">
                  <CardTitle className="flex items-center space-x-2" id="driver-dashboard-vehicle-info-title">
                    <Car className="h-5 w-5 text-indigo-600" />
                    <span>Vehicle Info</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3" id="driver-dashboard-vehicle-info-content">
                  <div className="flex justify-between" id="driver-dashboard-vehicle-model">
                    <span className="text-sm text-gray-600" id="driver-dashboard-vehicle-model-label">Vehicle:</span>
                    <span className="text-sm font-medium" id="driver-dashboard-vehicle-model-value">
                      {driverProfile.vehicle_year} {driverProfile.vehicle_make} {driverProfile.vehicle_model}
                    </span>
                  </div>
                  <div className="flex justify-between" id="driver-dashboard-license-plate">
                    <span className="text-sm text-gray-600" id="driver-dashboard-license-plate-label">License Plate:</span>
                    <span className="text-sm font-medium" id="driver-dashboard-license-plate-value">{driverProfile.license_plate}</span>
                  </div>
                  <div className="flex justify-between" id="driver-dashboard-vehicle-type">
                    <span className="text-sm text-gray-600" id="driver-dashboard-vehicle-type-label">Type:</span>
                    <Badge variant="secondary" id="driver-dashboard-vehicle-type-value">{driverProfile.vehicle_type}</Badge>
                  </div>
                  <div className="flex justify-between" id="driver-dashboard-approval-status">
                    <span className="text-sm text-gray-600" id="driver-dashboard-approval-status-label">Status:</span>
                    <Badge className={driverProfile.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} id="driver-dashboard-approval-status-value">
                      {driverProfile.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Driver Tips */}
            <Card className="card-hover bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200" id="driver-dashboard-tips-card">
              <CardHeader id="driver-dashboard-tips-header">
                <CardTitle className="text-amber-900" id="driver-dashboard-tips-title">💡 Driver Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3" id="driver-dashboard-tips-content">
                <div className="space-y-2" id="driver-dashboard-tip-1">
                  <p className="text-sm text-amber-800 font-medium" id="driver-dashboard-tip-1-title">🕒 Peak hours: 7-9 AM, 5-7 PM</p>
                  <p className="text-xs text-amber-700" id="driver-dashboard-tip-1-description">Higher demand = more ride requests</p>
                </div>
                <div className="space-y-2" id="driver-dashboard-tip-2">
                  <p className="text-sm text-amber-800 font-medium" id="driver-dashboard-tip-2-title">⭐ Maintain high rating</p>
                  <p className="text-xs text-amber-700" id="driver-dashboard-tip-2-description">Good service leads to better opportunities</p>
                </div>
                <div className="space-y-2" id="driver-dashboard-tip-3">
                  <p className="text-sm text-amber-800 font-medium" id="driver-dashboard-tip-3-title">🛣️ Know your city</p>
                  <p className="text-xs text-amber-700" id="driver-dashboard-tip-3-description">Efficient routes = happier passengers</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;