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
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DriverDashboard = () => {
  const { user, updateUser } = useAuth();
  const { connected, rideRequests, notifications } = useWebSocket();
  const [isOnline, setIsOnline] = useState(user?.is_online || false);
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

  useEffect(() => {
    fetchDriverData();
  }, []);

  useEffect(() => {
    if (isOnline) {
      fetchAvailableRides();
      // Set up interval to refresh available rides every 30 seconds
      const interval = setInterval(fetchAvailableRides, 30000);
      return () => clearInterval(interval);
    } else {
      setAvailableRides([]);
    }
  }, [isOnline]);

  const fetchDriverData = async () => {
    try {
      const [ridesResponse, profileResponse] = await Promise.allSettled([
        axios.get(`${API_URL}/api/rides/my-rides`),
        axios.get(`${API_URL}/api/driver/profile`)
      ]);

      if (ridesResponse.status === 'fulfilled') {
        const rides = ridesResponse.value.data;
        setRecentRides(rides.slice(0, 3));
        calculateStats(rides);
      }

      if (profileResponse.status === 'fulfilled') {
        setDriverProfile(profileResponse.value.data);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50 py-8" data-testid="driver-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Hello, {user.name}! 🚗
              </h1>
              <p className="text-gray-600 mt-1">
                {isOnline ? 'Ready to earn today?' : 'Go online to start earning'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span>{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-sm font-medium ${
                  isOnline ? 'text-emerald-700' : 'text-gray-600'
                }`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <Switch
                  checked={isOnline}
                  onCheckedChange={toggleOnlineStatus}
                  data-testid="online-toggle"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats and Performance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="card-hover bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">Today's Earnings</p>
                      <p className="text-3xl font-bold text-emerald-900">${stats.todayEarnings.toFixed(2)}</p>
                      <p className="text-sm text-emerald-600 mt-1">{stats.todayRides} rides completed</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Status</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {isOnline ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                            <span className="text-xl font-bold text-emerald-700">Online</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-5 w-5 text-gray-500" />
                            <span className="text-xl font-bold text-gray-700">Offline</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        {isOnline ? 'Ready for rides' : 'Go online to start'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Activity className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Rides</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
                    </div>
                    <Car className="h-8 w-8 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rating</p>
                      <div className="flex items-center space-x-1">
                        <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      </div>
                    </div>
                    <Star className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Rides */}
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <History className="h-5 w-5 text-indigo-600" />
                      <span>Recent Rides</span>
                    </CardTitle>
                    <CardDescription>
                      Your latest completed rides
                    </CardDescription>
                  </div>
                  <Link to="/rides">
                    <Button variant="outline" size="sm">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentRides.length > 0 ? (
                  <div className="space-y-4">
                    {recentRides.map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Navigation className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {ride.pickup_location?.address || 'Pickup'} → {ride.dropoff_location?.address || 'Destination'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(ride.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(ride.status)}>
                            {ride.status.replace('_', ' ')}
                          </Badge>
                          <p className="text-sm font-medium text-emerald-600 mt-1">
                            +${ride.estimated_fare?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No recent rides found</p>
                    <p className="text-sm text-gray-400">Go online to start receiving ride requests</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Ride Requests and Notifications */}
          <div className="space-y-6">
            {/* Available Rides */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Available Rides</span>
                  <Badge variant={availableRides.length > 0 ? "default" : "secondary"}>
                    {availableRides.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isOnline ? 'Available ride requests' : 'Go online to see requests'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isOnline ? (
                  availableRides.length > 0 ? (
                    <div className="space-y-4">
                      {availableRides.slice(0, 3).map((ride) => (
                        <div key={ride.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
                                {ride.pickup_location?.address || 'Pickup Location'}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                → {ride.dropoff_location?.address || 'Destination'}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              ${ride.estimated_fare?.toFixed(2) || '0.00'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-blue-600">
                              {ride.distance_to_pickup?.toFixed(1) || '0.0'} km away
                            </p>
                            <Button 
                              size="sm" 
                              className="btn-primary text-xs px-3 py-1"
                              onClick={() => acceptRideRequest(ride.id)}
                              data-testid={`accept-ride-${ride.id}`}
                            >
                              Accept
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No ride requests available</p>
                      <p className="text-xs text-gray-400 mt-1">Stay online to receive requests</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">You're offline</p>
                    <p className="text-xs text-gray-400 mt-1">Go online to start receiving ride requests</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            {driverProfile && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="h-5 w-5 text-indigo-600" />
                    <span>Vehicle Info</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Vehicle:</span>
                    <span className="text-sm font-medium">
                      {driverProfile.vehicle_year} {driverProfile.vehicle_make} {driverProfile.vehicle_model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">License Plate:</span>
                    <span className="text-sm font-medium">{driverProfile.license_plate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <Badge variant="secondary">{driverProfile.vehicle_type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge className={driverProfile.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {driverProfile.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Notifications</span>
                  <Badge variant="secondary">{notifications.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No new notifications</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Driver Tips */}
            <Card className="card-hover bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-900">💡 Driver Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-amber-800 font-medium">🕒 Peak hours: 7-9 AM, 5-7 PM</p>
                  <p className="text-xs text-amber-700">Higher demand = more ride requests</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-amber-800 font-medium">⭐ Maintain high rating</p>
                  <p className="text-xs text-amber-700">Good service leads to better opportunities</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-amber-800 font-medium">🛣️ Know your city</p>
                  <p className="text-xs text-amber-700">Efficient routes = happier passengers</p>
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