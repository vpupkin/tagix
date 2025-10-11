import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { 
  MapPin, 
  Clock, 
  Star, 
  Car, 
  Plus, 
  History, 
  CreditCard,
  Activity,
  ChevronRight,
  Navigation,
  Zap,
  Wallet,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { getRevisionInfo } from '../utils/gitRevision';
import NotificationWithReply from './NotificationWithReply';
import BookAgainModal from './BookAgainModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RiderDashboard = () => {
  const { user } = useAuth();
  const { connected, notifications } = useWebSocket();
  const [recentRides, setRecentRides] = useState([]);
  
  // Git revision for deployment verification
  const revisionInfo = getRevisionInfo();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRides: 0,
    completedRides: 0,
    pendingRides: 0,
    totalSpent: 0,
    averageRating: 5.0,
    favoriteDestination: 'Not available'
  });
  const [balance, setBalance] = useState({
    currentBalance: 0.0,
    recentTransactions: []
  });
  const [showBookAgainModal, setShowBookAgainModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  useEffect(() => {
    fetchRecentRides();
    fetchUserStats();
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

  const fetchRecentRides = async () => {
    try {
      console.log('🔍 RiderDashboard: fetchRecentRides called');
      console.log('🔍 API_URL:', API_URL);
      console.log('🔍 User:', user);
      
      if (!API_URL) {
        console.error('❌ API_URL is undefined!');
        toast.error('Backend URL not configured');
        return;
      }
      
      if (!user) {
        console.error('❌ User not authenticated!');
        toast.error('Please login first');
        return;
      }
      
      console.log('🔍 Making API call to /api/rides/my-rides...');
      const response = await axios.get(`${API_URL}/api/rides/my-rides`);
      console.log('🔍 My rides response:', response.data);
      
      // Get all rides and sort by creation date (newest first)
      const allRides = response.data || [];
      
      // Sort by creation date (newest first) and get last 3
      const sortedRides = allRides.sort((a, b) => 
        new Date(b.created_at || b.accepted_at || b.completed_at) - new Date(a.created_at || a.accepted_at || a.completed_at)
      );
      const recentRides = sortedRides.slice(0, 3);
      
      console.log('🔍 Setting recent rides:', recentRides.length);
      console.log('🔍 Total rides:', allRides.length);
      console.log('🔍 Recent rides data:', recentRides);
      setRecentRides(recentRides);
    } catch (error) {
      console.error('❌ Error fetching rides:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to load recent rides: ${error.message}`);
    }
  };

  const fetchUserStats = async () => {
    try {
      console.log('🔍 RiderDashboard: fetchUserStats called');
      const response = await axios.get(`${API_URL}/api/rides/my-rides`);
      const allRides = response.data || [];
      
      // Calculate stats from the same data source as recent rides
      const completedRides = allRides.filter(ride => ride.status === 'completed');
      const pendingRides = allRides.filter(ride => ['pending', 'accepted', 'driver_arriving', 'in_progress'].includes(ride.status));
      const totalSpent = completedRides.reduce((sum, ride) => sum + (ride.estimated_fare || ride.fare || 0), 0);
      
      console.log('🔍 Setting user stats:');
      console.log('  Total rides:', allRides.length);
      console.log('  Completed rides:', completedRides.length);
      console.log('  Pending rides:', pendingRides.length);
      console.log('  Total spent:', totalSpent);
      
      setStats({
        totalRides: allRides.length,
        completedRides: completedRides.length,
        pendingRides: pendingRides.length,
        totalSpent: totalSpent,
        averageRating: user.rating || 5.0,
        favoriteDestination: 'Downtown' // This would be calculated from ride history
      });
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      console.log('🔍 RiderDashboard: fetchUserBalance called');
      
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
    if (!dateString || dateString === 'N/A') {
      return 'Date not available';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date error';
    }
  };

  const openBookAgainModal = (ride) => {
    setSelectedRide(ride);
    setShowBookAgainModal(true);
  };


  const calculateDistance = (pickup, dropoff) => {
    if (!pickup?.latitude || !pickup?.longitude || !dropoff?.latitude || !dropoff?.longitude) {
      return null;
    }
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (dropoff.latitude - pickup.latitude) * Math.PI / 180;
    const dLon = (dropoff.longitude - pickup.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pickup.latitude * Math.PI / 180) * Math.cos(dropoff.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateDuration = (distanceKm) => {
    if (!distanceKm) return null;
    // Assume average speed of 30 km/h in city traffic
    const averageSpeed = 30;
    return Math.round((distanceKm / averageSpeed) * 60); // minutes
  };

  const quickActions = [
    {
      title: 'Book a Ride',
      description: 'Find a ride to your destination',
      icon: <Car className="h-6 w-6" />,
      action: '/book-ride',
      color: 'from-blue-500 to-indigo-600',
      testId: 'book-ride-action'
    },
    {
      title: 'Ride History',
      description: 'View all your past rides',
      icon: <History className="h-6 w-6" />,
      action: '/rides',
      color: 'from-emerald-500 to-green-600',
      testId: 'ride-history-action'
    },
    {
      title: 'Payment Methods',
      description: 'Manage your payment options',
      icon: <CreditCard className="h-6 w-6" />,
      action: '/payments',
      color: 'from-purple-500 to-violet-600',
      testId: 'payment-methods-action'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="rider-dashboard" id="rider-dashboard-main">
      {/* GIT REVISION DISPLAY - DEPLOYMENT VERIFICATION */}
      <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 z-50 font-mono text-sm font-bold" id="git-revision-display-rider">
        🚀 GIT REVISION: {revisionInfo.revision} | BUILD: {revisionInfo.buildTime} | RIDER DASHBOARD
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12" id="rider-dashboard-container">
        {/* Header */}
        <div className="mb-8" id="rider-dashboard-header">
          <div className="flex items-center justify-between" id="rider-dashboard-header-content">
            <div id="rider-dashboard-welcome">
              <h1 className="text-3xl font-bold text-gray-900" id="rider-dashboard-title">
                Welcome back, {user.name}! 🚗
              </h1>
              <p className="text-gray-600 mt-1" id="rider-dashboard-subtitle">
                Ready for your next journey?
              </p>
            </div>
            <div className="flex items-center space-x-3" id="rider-dashboard-header-actions">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`} id="rider-dashboard-connection-status">
                <div className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-400' : 'bg-red-400'
                }`} id="rider-dashboard-connection-indicator" />
                <span id="rider-dashboard-connection-text">{connected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="rider-dashboard-grid">
          {/* Left Column - Quick Actions, Stats and Recent Rides */}
          <div className="lg:col-span-2 space-y-6" id="rider-dashboard-left-column">
            {/* Action Buttons and Balance - All 4 cards in single row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full" id="rider-dashboard-action-buttons-grid">
              {quickActions.map((action, index) => (
                <Link key={index} to={action.action} data-testid={action.testId} id={`rider-dashboard-action-button-${index}`}>
                  <Card className="card-hover group cursor-pointer h-full w-full" id={`rider-dashboard-action-button-card-${index}`}>
                    <CardContent className="p-8" id={`rider-dashboard-action-button-content-${index}`}>
                      <div className="flex items-center justify-between" id={`rider-dashboard-action-button-layout-${index}`}>
                        <div id={`rider-dashboard-action-button-info-${index}`}>
                          <p className="text-lg font-bold text-gray-900" id={`rider-dashboard-action-button-label-${index}`}>{action.title}</p>
                          <p className="text-sm text-gray-600 mt-1" id={`rider-dashboard-action-button-description-${index}`}>{action.description}</p>
                        </div>
                        <div className={`w-16 h-16 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200`} id={`rider-dashboard-action-button-icon-${index}`}>
                          {action.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              
              {/* Balance Card - 4th card in the same row */}
              <Card className="card-hover" id="rider-dashboard-balance-card">
                <CardContent className="p-8" id="rider-dashboard-balance-content">
                  <div className="flex items-center justify-between" id="rider-dashboard-balance-layout">
                    <div id="rider-dashboard-balance-info">
                      <p className="text-lg font-bold text-gray-900" id="rider-dashboard-balance-label">Balance</p>
                      <p className="text-2xl font-bold text-gray-900" id="rider-dashboard-balance-value">Ⓣ{balance.currentBalance.toFixed(2)}</p>
                      <p className="text-sm text-gray-600 mt-1" id="rider-dashboard-balance-details">Available funds</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white" id="rider-dashboard-balance-icon">
                      <Wallet className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="rider-dashboard-stats-grid">
              <Card className="card-hover" id="rider-dashboard-total-rides-card">
                <CardContent className="p-6" id="rider-dashboard-total-rides-content">
                  <div className="flex items-center justify-between" id="rider-dashboard-total-rides-layout">
                    <div id="rider-dashboard-total-rides-info">
                      <p className="text-sm font-medium text-gray-600" id="rider-dashboard-total-rides-label">Total Rides</p>
                      <p className="text-2xl font-bold text-gray-900" id="rider-dashboard-total-rides-value">{stats.totalRides}</p>
                      <p className="text-xs text-gray-500" id="rider-dashboard-total-rides-details">{stats.completedRides} completed, {stats.pendingRides} pending</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center" id="rider-dashboard-total-rides-icon">
                      <Activity className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover" id="rider-dashboard-total-spent-card">
                <CardContent className="p-6" id="rider-dashboard-total-spent-content">
                  <div className="flex items-center justify-between" id="rider-dashboard-total-spent-layout">
                    <div id="rider-dashboard-total-spent-info">
                      <p className="text-sm font-medium text-gray-600" id="rider-dashboard-total-spent-label">Total Spent</p>
                      <p className="text-2xl font-bold text-gray-900" id="rider-dashboard-total-spent-value">Ⓣ{stats.totalSpent.toFixed(2)}</p>
                      <p className="text-xs text-gray-500" id="rider-dashboard-total-spent-details">From completed rides only</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center" id="rider-dashboard-total-spent-icon">
                      <CreditCard className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover" id="rider-dashboard-rating-card">
                <CardContent className="p-6" id="rider-dashboard-rating-content">
                  <div className="flex items-center justify-between" id="rider-dashboard-rating-layout">
                    <div id="rider-dashboard-rating-info">
                      <p className="text-sm font-medium text-gray-600" id="rider-dashboard-rating-label">Your Rating</p>
                      <div className="flex items-center space-x-1" id="rider-dashboard-rating-display">
                        <p className="text-2xl font-bold text-gray-900" id="rider-dashboard-rating-value">{stats.averageRating}</p>
                        <Star className="h-5 w-5 text-yellow-400 fill-current" id="rider-dashboard-rating-star" />
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center" id="rider-dashboard-rating-icon">
                      <Star className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover" id="rider-dashboard-favorite-card">
                <CardContent className="p-6" id="rider-dashboard-favorite-content">
                  <div className="flex items-center justify-between" id="rider-dashboard-favorite-layout">
                    <div id="rider-dashboard-favorite-info">
                      <p className="text-sm font-medium text-gray-600" id="rider-dashboard-favorite-label">Favorite</p>
                      <p className="text-lg font-bold text-gray-900 truncate" id="rider-dashboard-favorite-value">{stats.favoriteDestination}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center" id="rider-dashboard-favorite-icon">
                      <MapPin className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Rides */}
            <Card className="card-hover" id="rider-dashboard-recent-rides-card">
              <CardHeader id="rider-dashboard-recent-rides-header">
                <div className="flex items-center justify-between" id="rider-dashboard-recent-rides-header-content">
                  <div id="rider-dashboard-recent-rides-title-section">
                    <CardTitle className="flex items-center space-x-2" id="rider-dashboard-recent-rides-title">
                      <History className="h-5 w-5 text-indigo-600" />
                      <span>Recent Rides</span>
                    </CardTitle>
                    <CardDescription id="rider-dashboard-recent-rides-description">
                      Your latest ride history
                    </CardDescription>
                  </div>
                  <Link to="/rides" id="rider-dashboard-view-all-rides-link">
                    <Button variant="outline" size="sm" id="rider-dashboard-view-all-rides-button">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent id="rider-dashboard-recent-rides-content">
                {recentRides.length > 0 ? (
                  <div className="space-y-4" id="rider-dashboard-recent-rides-list">
                    {recentRides.map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" id={`rider-dashboard-ride-${ride.id}`}>
                        <div className="flex items-center space-x-4" id={`rider-dashboard-ride-info-${ride.id}`}>
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center" id={`rider-dashboard-ride-icon-${ride.id}`}>
                            <Navigation className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div id={`rider-dashboard-ride-details-${ride.id}`}>
                            <p className="font-medium text-gray-900" id={`rider-dashboard-ride-route-${ride.id}`}>
                              {ride.pickup_location?.address || ride.pickup_address || 'Pickup Location'} → {ride.dropoff_location?.address || ride.dropoff_address || 'Destination'}
                            </p>
                            <p className="text-sm text-gray-600" id={`rider-dashboard-ride-date-${ride.id}`}>
                              {formatDate(ride.created_at || ride.accepted_at || ride.completed_at || ride.requested_at)}
                            </p>
                            {(() => {
                              const distance = calculateDistance(ride.pickup_location, ride.dropoff_location);
                              const duration = calculateDuration(distance);
                              return distance && duration ? (
                                <p className="text-xs text-gray-500" id={`rider-dashboard-ride-distance-${ride.id}`}>
                                  {distance.toFixed(1)} km • {duration} min
                                </p>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end space-y-2" id={`rider-dashboard-ride-status-${ride.id}`}>
                          <Badge className={getStatusColor(ride.status || 'pending')} id={`rider-dashboard-ride-badge-${ride.id}`}>
                            {(ride.status || 'pending').replace('_', ' ')}
                          </Badge>
                          <p className="text-sm font-medium text-gray-900" id={`rider-dashboard-ride-fare-${ride.id}`}>
                            Ⓣ{(ride.estimated_fare || ride.fare || 0).toFixed(2)}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openBookAgainModal(ride)}
                            className="flex items-center space-x-1 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs"
                            data-testid={`book-again-${ride.id}`}
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Book Again</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" id="rider-dashboard-no-rides">
                    <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" id="rider-dashboard-no-rides-icon" />
                    <p className="text-gray-500 mb-4" id="rider-dashboard-no-rides-message">No recent rides found</p>
                    <Link to="/book-ride" id="rider-dashboard-no-rides-book-link">
                      <Button className="btn-primary" id="rider-dashboard-no-rides-book-button">
                        Book Your First Ride
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notifications and Tips */}
          <div className="space-y-6" id="rider-dashboard-right-column">
            {/* Notifications */}
            <Card className="card-hover" id="rider-dashboard-notifications-card">
              <CardHeader id="rider-dashboard-notifications-header">
                <CardTitle className="flex items-center justify-between" id="rider-dashboard-notifications-title">
                  <span>Recent Notifications</span>
                  <Badge variant="secondary" id="rider-dashboard-notifications-count">{notifications.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent id="rider-dashboard-notifications-content">
                {notifications.length > 0 ? (
                  <div className="space-y-3" id="rider-dashboard-notifications-list">
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
                  <div className="text-center py-4" id="rider-dashboard-no-notifications">
                    <p className="text-gray-500 text-sm" id="rider-dashboard-no-notifications-message">No new notifications</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="card-hover bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200" id="rider-dashboard-tips-card">
              <CardHeader id="rider-dashboard-tips-header">
                <CardTitle className="text-indigo-900" id="rider-dashboard-tips-title">💡 Rider Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3" id="rider-dashboard-tips-content">
                <div className="space-y-2" id="rider-dashboard-tip-1">
                  <p className="text-sm text-indigo-800 font-medium" id="rider-dashboard-tip-1-title">🕒 Book in advance</p>
                  <p className="text-xs text-indigo-700" id="rider-dashboard-tip-1-description">Schedule your rides during peak hours to avoid waiting.</p>
                </div>
                <div className="space-y-2" id="rider-dashboard-tip-2">
                  <p className="text-sm text-indigo-800 font-medium" id="rider-dashboard-tip-2-title">⭐ Rate your driver</p>
                  <p className="text-xs text-indigo-700" id="rider-dashboard-tip-2-description">Help maintain service quality by rating your experience.</p>
                </div>
                <div className="space-y-2" id="rider-dashboard-tip-3">
                  <p className="text-sm text-indigo-800 font-medium" id="rider-dashboard-tip-3-title">📍 Be precise with location</p>
                  <p className="text-xs text-indigo-700" id="rider-dashboard-tip-3-description">Provide clear pickup instructions to save time.</p>
                </div>
              </CardContent>
            </Card>

            {/* Safety Card */}
            <Card className="card-hover bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" id="rider-dashboard-safety-card">
              <CardHeader id="rider-dashboard-safety-header">
                <CardTitle className="text-emerald-900" id="rider-dashboard-safety-title">🛡️ Safety First</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3" id="rider-dashboard-safety-content">
                <div className="space-y-2" id="rider-dashboard-safety-tip-1">
                  <p className="text-sm text-emerald-800 font-medium" id="rider-dashboard-safety-tip-1-title">Check driver details</p>
                  <p className="text-xs text-emerald-700" id="rider-dashboard-safety-tip-1-description">Always verify driver photo and license plate.</p>
                </div>
                <div className="space-y-2" id="rider-dashboard-safety-tip-2">
                  <p className="text-sm text-emerald-800 font-medium" id="rider-dashboard-safety-tip-2-title">Share your trip</p>
                  <p className="text-xs text-emerald-700" id="rider-dashboard-safety-tip-2-description">Let friends know your trip details for safety.</p>
                </div>
                <div className="space-y-2" id="rider-dashboard-safety-tip-3">
                  <p className="text-sm text-emerald-800 font-medium" id="rider-dashboard-safety-tip-3-title">Emergency contact</p>
                  <p className="text-xs text-emerald-700" id="rider-dashboard-safety-tip-3-description">Use in-app emergency features if needed.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Book Again Modal */}
      <BookAgainModal
        isOpen={showBookAgainModal}
        onClose={() => {
          setShowBookAgainModal(false);
          setSelectedRide(null);
        }}
        previousRide={selectedRide}
      />
    </div>
  );
};

export default RiderDashboard;