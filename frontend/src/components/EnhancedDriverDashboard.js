import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Car, 
  MapPin, 
  DollarSign, 
  Clock, 
  User,
  Navigation,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Play,
  Square,
  Navigation2,
  Wallet
} from 'lucide-react';
import DriverLocationManager from './DriverLocationManager';
import NotificationWithReply from './NotificationWithReply';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EnhancedDriverDashboard = () => {
  const { user, token } = useAuth();
  const { notifications } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Driver state
  const [driverProfile, setDriverProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // Ride data
  const [availableRides, setAvailableRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  
  // Payment data
  const [earnings, setEarnings] = useState({
    total_earnings: 0,
    total_rides: 0,
    total_revenue: 0
  });
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState(0);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    console.log('🔍 EnhancedDriverDashboard: useEffect triggered');
    console.log('🔍 user:', user);
    console.log('🔍 user.role:', user?.role);
    console.log('🔍 token:', token ? 'present' : 'missing');
    
    if (user && user.role === 'driver') {
      console.log('🔍 Driver detected, fetching all data...');
      fetchAllData();
      // Set up auto-refresh every 30 seconds for available rides
      const interval = setInterval(() => {
        console.log('🔍 Interval: Refreshing available rides...');
        fetchAvailableRides();
      }, 30000);
      return () => {
        console.log('🔍 Clearing interval');
        clearInterval(interval);
      };
    } else {
      console.log('⚠️ Not a driver or user not loaded');
    }
  }, [user, token]);

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDriverProfile(),
        fetchAvailableRides(),
        fetchActiveRide(),
        fetchRideHistory(),
        fetchEarnings(),
        fetchPayments(),
        fetchBalance()
      ]);
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDriverProfile = async () => {
    try {
      console.log('🔍 EnhancedDriverDashboard: fetchDriverProfile called');
      const response = await axios.get(`${API_URL}/api/driver/profile`, {
        headers: getAuthHeaders()
      });
      console.log('🔍 Driver profile loaded:', response.data);
      setDriverProfile(response.data);
      setIsOnline(response.data.is_online || false);
      setCurrentLocation(response.data.current_location);
    } catch (error) {
      console.log('⚠️ Driver profile not found (404) - driver needs to set up profile');
      // Don't show error for missing profile, it's expected for new drivers
      setDriverProfile(null);
      // Use user data for online status instead
      if (user) {
        setIsOnline(user.is_online || false);
        setCurrentLocation(user.current_location);
      }
    }
  };

  const fetchAvailableRides = async () => {
    console.log('🔍 EnhancedDriverDashboard: fetchAvailableRides called');
    console.log('🔍 isOnline:', isOnline);
    console.log('🔍 user:', user);
    
    if (!isOnline) {
      console.log('⚠️ Driver not online, skipping fetch');
      return;
    }
    
    try {
      console.log('🔍 Making API call to /api/rides/available...');
      const response = await axios.get(`${API_URL}/api/rides/available`, {
        headers: getAuthHeaders()
      });
      console.log('🔍 Available rides response:', response.data);
      
      // Handle new response format with structured data
      if (response.data && typeof response.data === 'object') {
        if (response.data.available_rides) {
          // New format: { available_rides: [...], total_available: N, ... }
          console.log('🔍 Setting available rides (new format):', response.data.available_rides.length);
          setAvailableRides(response.data.available_rides);
          
          // Update current location with radius info
          if (response.data.driver_location && response.data.radius_km) {
            setCurrentLocation({
              ...response.data.driver_location,
              radius_km: response.data.radius_km
            });
          }
        } else if (Array.isArray(response.data)) {
          // Old format: direct array
          console.log('🔍 Setting available rides (old format):', response.data.length);
          setAvailableRides(response.data);
        } else {
          console.log('🔍 No rides found, setting empty array');
          setAvailableRides([]);
        }
      } else {
        console.log('🔍 Invalid response format, setting empty array');
        setAvailableRides([]);
      }
    } catch (error) {
      console.error('❌ Error fetching available rides:', error);
      console.error('Error details:', error.response?.data);
      if (error.response?.status !== 400) {
        console.error('Non-400 error fetching available rides:', error);
      }
      setAvailableRides([]);
    }
  };

  const fetchActiveRide = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rides/my-rides`, {
        headers: getAuthHeaders()
      });
      const rides = response.data;
      const active = rides.find(ride => 
        ['accepted', 'driver_arriving', 'in_progress'].includes(ride.status)
      );
      setActiveRide(active || null);
    } catch (error) {
      console.error('Error fetching active ride:', error);
    }
  };

  const fetchRideHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rides/my-rides`, {
        headers: getAuthHeaders()
      });
      setRideHistory(response.data.filter(ride => ride.status === 'completed'));
    } catch (error) {
      console.error('Error fetching ride history:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/summary`, {
        headers: getAuthHeaders()
      });
      setEarnings(response.data);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments`, {
        headers: getAuthHeaders()
      });
      setPayments(response.data.slice(0, 5)); // Show last 5 payments
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/balance`, {
        headers: getAuthHeaders()
      });
      setBalance(response.data.current_balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!currentLocation && !isOnline) {
      toast.error('Please update your location before going online');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/driver/online`, {}, {
        headers: getAuthHeaders()
      });
      
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      
      toast.success(response.data.message);
      
      if (newStatus) {
        fetchAvailableRides();
      } else {
        setAvailableRides([]);
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
      toast.error('Failed to update status');
    }
  };

  const updateLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          try {
            await axios.post(`${API_URL}/api/location/update`, {
              location: location
            }, {
              headers: getAuthHeaders()
            });
            
            setCurrentLocation(location);
            toast.success('Location updated successfully');
            
            if (isOnline) {
              fetchAvailableRides();
            }
          } catch (error) {
            console.error('Error updating location:', error);
            toast.error('Failed to update location');
          }
        },
        (error) => {
          toast.error('Failed to get your location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  const acceptRide = async (rideId) => {
    try {
      const response = await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
        action: 'accept'
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success('Ride accepted successfully!');
      fetchAvailableRides();
      fetchActiveRide();
    } catch (error) {
      console.error('Error accepting ride:', error);
      toast.error(error.response?.data?.detail || 'Failed to accept ride');
    }
  };

  const updateRideStatus = async (rideId, action, notes = '') => {
    try {
      const response = await axios.post(`${API_URL}/api/rides/${rideId}/update`, {
        action: action,
        notes: notes
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success(response.data.message);
      fetchActiveRide();
      
      if (action === 'complete') {
        fetchEarnings();
        fetchPayments();
        fetchRideHistory();
      }
    } catch (error) {
      console.error(`Error ${action} ride:`, error);
      toast.error(error.response?.data?.detail || `Failed to ${action} ride`);
    }
  };

  const formatCurrency = (amount) => {
    return `Ⓣ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || user.role !== 'driver') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You need driver privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading driver dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                <Car className="h-8 w-8 text-purple-600" />
                <span>Driver Dashboard</span>
              </h1>
              <p className="text-gray-600 mt-1">
                {driverProfile ? `${driverProfile.vehicle_make} ${driverProfile.vehicle_model}` : 'Manage your rides and earnings'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={updateLocation}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Update Location
              </button>
              <button
                onClick={toggleOnlineStatus}
                className={`flex items-center px-6 py-2 rounded-lg font-semibold transition-colors ${
                  isOnline 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-red-200' : 'bg-green-200'}`} />
                {isOnline ? 'Go Offline' : 'Go Online'}
              </button>
              <button
                onClick={fetchAllData}
                disabled={refreshing}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className={`p-2 rounded-full ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
                <Car className={`h-6 w-6 ${isOnline ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earnings.total_earnings || 0)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Rides</p>
                <p className="text-2xl font-bold text-gray-900">{earnings.total_rides || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-indigo-100">
                <Wallet className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Location & Preferences and Available Rides - Combined Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Location & Preferences Manager */}
          <DriverLocationManager 
            onLocationUpdate={(location) => {
              setCurrentLocation(location);
              // Refresh available rides when location changes
              if (isOnline) {
                fetchAvailableRides();
              }
            }}
            onPreferencesUpdate={(preferences) => {
              // Refresh available rides when radius changes
              if (isOnline) {
                fetchAvailableRides();
              }
            }}
          />

          {/* Available Rides Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Rides</p>
                <p className="text-2xl font-bold text-gray-900">{availableRides.length}</p>
                {currentLocation && (
                  <p className="text-xs text-gray-500 mt-1">
                    Within 25km of {currentLocation.latitude?.toFixed(4)}, {currentLocation.longitude?.toFixed(4)}
                  </p>
                )}
              </div>
              <div className="p-2 rounded-full bg-purple-100">
                <Navigation className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            
            {/* Available Rides List */}
            {availableRides.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableRides.slice(0, 5).map((ride) => (
                  <div key={ride.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {ride.pickup_location?.address || 'Pickup Location'} → {ride.dropoff_location?.address || 'Destination'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {ride.distance_km?.toFixed(1)}km • Ⓣ{ride.estimated_fare?.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          // Handle ride acceptance
                          console.log('Accepting ride:', ride.id);
                        }}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
                {availableRides.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{availableRides.length - 5} more rides available
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Navigation className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No rides available</p>
                <p className="text-xs text-gray-400">Go online to see available rides</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Ride */}
          {activeRide && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Navigation2 className="h-5 w-5 mr-2 text-blue-600" />
                Active Ride
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      activeRide.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                      activeRide.status === 'driver_arriving' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {activeRide.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>From:</strong> {activeRide.pickup_location?.address}</p>
                    <p><strong>To:</strong> {activeRide.dropoff_location?.address}</p>
                    <p><strong>Fare:</strong> {formatCurrency(activeRide.estimated_fare)}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {activeRide.status === 'accepted' && (
                    <button
                      onClick={() => updateRideStatus(activeRide.id, 'arrive')}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Arrived at Pickup
                    </button>
                  )}
                  {(activeRide.status === 'accepted' || activeRide.status === 'driver_arriving') && (
                    <button
                      onClick={() => updateRideStatus(activeRide.id, 'start')}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Ride
                    </button>
                  )}
                  {activeRide.status === 'in_progress' && (
                    <button
                      onClick={() => updateRideStatus(activeRide.id, 'complete', 'Ride completed successfully')}
                      className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Complete Ride
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Available Rides */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  <Navigation className="h-5 w-5 mr-2 text-purple-600" />
                  Available Rides ({availableRides.length})
                </h3>
                {currentLocation && (
                  <p className="text-sm text-gray-600 mt-1">
                    Within {currentLocation.radius_km || 25}km of {currentLocation.address || 'your location'}
                  </p>
                )}
              </div>
              {isOnline && (
                <button
                  onClick={fetchAvailableRides}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {!isOnline ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Go online to see available rides</p>
              </div>
            ) : availableRides.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No rides available</p>
                <p className="text-sm text-gray-500">Check back in a few moments</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableRides.map((ride) => (
                  <div key={ride.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>From:</strong> {ride.pickup_location?.address}</p>
                          <p><strong>To:</strong> {ride.dropoff_location?.address}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(ride.estimated_fare)}</p>
                        <p className="text-xs text-gray-500">{ride.distance_to_pickup}km away</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <span>ETA: ~{ride.estimated_pickup_time} min</span>
                        <span className="mx-2">•</span>
                        <span>{ride.vehicle_type}</span>
                      </div>
                      <button
                        onClick={() => acceptRide(ride.id)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Recent Payments
          </h3>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No payments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Ride ID</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Your Earnings</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-2 text-sm">{formatDate(payment.created_at)}</td>
                      <td className="py-2 text-sm font-mono">{payment.ride_id.slice(-8)}</td>
                      <td className="py-2 text-sm">{formatCurrency(payment.amount)}</td>
                      <td className="py-2 text-sm font-semibold text-green-600">{formatCurrency(payment.driver_earnings)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              Recent Notifications
            </span>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </h3>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <NotificationWithReply
                  key={notification.id}
                  notification={notification}
                  onReplySent={(replyData) => {
                    console.log('Reply sent:', replyData);
                    toast.success('Reply sent successfully!');
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No new notifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDriverDashboard;