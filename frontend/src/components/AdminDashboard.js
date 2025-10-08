import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { 
  Users, 
  Car, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  MapPin,
  Clock,
  Star,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import AdminNotificationModal from './AdminNotificationModal';
import AdminBalanceModal from './AdminBalanceModal';
import './ElementIdDisplay.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const { user } = useAuth();
  
  // Debug mode - force show all elements
  const DEBUG_MODE = true;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_users: 0,
    total_drivers: 0,
    total_riders: 0,
    total_rides: 0,
    completed_rides: 0,
    online_drivers: 0,
    total_revenue: 0,
    completion_rate: 0
  });
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [notificationModal, setNotificationModal] = useState({
    isOpen: false,
    rideId: null,
    riderId: null,
    driverId: null,
    riderName: null,
    driverName: null
  });
  const [balanceModal, setBalanceModal] = useState({
    isOpen: false,
    userId: null,
    userName: null,
    userEmail: null,
    userRole: null
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('🔍 AdminDashboard: useEffect triggered');
    console.log('🔍 User from useAuth:', user);
    console.log('🔍 Loading state:', loading);
    
    if (user && !loading) {
      console.log('🔍 User is authenticated, fetching dashboard data...');
      fetchDashboardData();
    } else {
      console.log('⚠️ User not authenticated or still loading');
    }
  }, [user, loading]);

  const fetchDashboardData = async () => {
    try {
      console.log('🔍 AdminDashboard: Starting data fetch...');
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
      
      setRefreshing(true);
      console.log('🔍 Making API calls...');
      console.log('🔍 Axios default headers:', axios.defaults.headers.common);
      
      const [statsResponse, usersResponse, ridesResponse] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`),
        axios.get(`${API_URL}/api/admin/users`),
        axios.get(`${API_URL}/api/admin/rides`)
      ]);

      console.log('🔍 API responses received:');
      console.log('Stats:', statsResponse.data);
      console.log('Users:', usersResponse.data);
      console.log('Rides:', ridesResponse.data);

      setStats(statsResponse.data);
      setUsers(usersResponse.data);
      
      // Handle the structured rides response
      const ridesData = ridesResponse.data;
      console.log('🔍 Processing rides data:', ridesData);
      
      setPendingRequests(ridesData.pending_requests || []);
      setCompletedMatches(ridesData.completed_matches || []);
      
      // Combine all rides for the overview tab
      const allRides = [...(ridesData.pending_requests || []), ...(ridesData.completed_matches || [])];
      setRides(allRides);
      
      console.log('🔍 Final state:');
      console.log('Pending requests:', ridesData.pending_requests?.length || 0);
      console.log('Completed matches:', ridesData.completed_matches?.length || 0);
      console.log('Total rides:', allRides.length);
      
    } catch (error) {
      console.error('❌ Error fetching admin data:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openNotificationModal = (ride) => {
    setNotificationModal({
      isOpen: true,
      rideId: ride.id,
      riderId: ride.rider_id,
      driverId: ride.driver_id,
      riderName: ride.rider_name || 'Unknown Rider',
      driverName: ride.driver_name || 'Unknown Driver'
    });
  };

  const closeNotificationModal = () => {
    setNotificationModal({
      isOpen: false,
      rideId: null,
      riderId: null,
      driverId: null,
      riderName: null,
      driverName: null
    });
  };

  const openBalanceModal = (user) => {
    setBalanceModal({
      isOpen: true,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role
    });
  };

  const closeBalanceModal = () => {
    setBalanceModal({
      isOpen: false,
      userId: null,
      userName: null,
      userEmail: null,
      userRole: null
    });
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
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'driver':
        return 'bg-blue-100 text-blue-800';
      case 'rider':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                <Shield className="h-8 w-8 text-purple-600" />
                <span>Admin Dashboard</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor and manage the MobilityHub platform
              </p>
            </div>
            <Button 
              onClick={fetchDashboardData}
              disabled={refreshing}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* HARDCODED BALANCE BUTTON - ALWAYS VISIBLE */}
        <div className="bg-red-100 border-4 border-red-600 p-6 rounded-lg mb-6" id="hardcoded-balance-button-container">
          <h2 className="text-xl font-bold text-red-800 mb-4" id="hardcoded-balance-button-title">🚨 BALANCE BUTTON ID (HARDCODED)</h2>
          <div className="bg-white p-4 border-2 border-red-500 rounded" id="hardcoded-balance-button-content">
            <p className="text-lg font-mono text-red-900" id="hardcoded-balance-button-id">
              <strong>NEW BALANCE BUTTON ID:</strong> admin-user-balance-button-530eed2f-73dd-4b43-974c-612d199555dc
            </p>
            <p className="text-sm text-red-700 mt-2" id="hardcoded-balance-button-note">
              This ID should be on the NEW BALANCE button (FIRST COLUMN) for DRRRRRRR2nd driver
            </p>
            <Button 
              className="mt-4 bg-red-600 hover:bg-red-700 text-white" 
              id="hardcoded-balance-button-test"
              onClick={() => {
                const button = document.getElementById('admin-user-balance-button-530eed2f-73dd-4b43-974c-612d199555dc');
                if (button) {
                  alert('NEW Balance button found in FIRST COLUMN!');
                  button.click();
                } else {
                  alert('NEW Balance button NOT found! First column missing.');
                }
              }}
            >
              Test Balance Button
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="admin-dashboard-stats-grid">
          <Card className="card-hover" id="admin-dashboard-total-users-card">
            <CardContent className="p-6" id="admin-dashboard-total-users-content">
              <div className="flex items-center justify-between" id="admin-dashboard-total-users-container">
                <div id="admin-dashboard-total-users-info">
                  <p className="text-sm font-medium text-gray-600" id="admin-dashboard-total-users-label">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900" id="admin-dashboard-total-users-count">{stats.total_users}</p>
                  <p className="text-sm text-gray-500 mt-1" id="admin-dashboard-total-users-breakdown">
                    {stats.total_riders} riders • {stats.total_drivers} drivers
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center" id="admin-dashboard-total-users-icon-container">
                  <Users className="h-6 w-6 text-blue-600" id="admin-dashboard-total-users-icon" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Rides</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_rides}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {stats.completed_rides} completed
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Car className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.completion_rate}% completion rate
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Online Drivers</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.online_drivers}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    of {stats.total_drivers} total
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Different Views */}
        <Tabs defaultValue="overview" className="space-y-6" id="admin-dashboard-tabs">
          <TabsList className="grid w-full grid-cols-4" id="admin-dashboard-tabs-list">
            <TabsTrigger value="overview" id="admin-dashboard-tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="users" id="admin-dashboard-tab-users">User Management</TabsTrigger>
            <TabsTrigger value="rides" id="admin-dashboard-tab-rides">Ride Monitoring</TabsTrigger>
            <TabsTrigger value="analytics" id="admin-dashboard-tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription>
                    Latest platform activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rides.slice(0, 5).map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Car className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Ride #{ride.id.slice(-8)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatDate(ride.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(ride.status)}>
                          {ride.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span>System Health</span>
                  </CardTitle>
                  <CardDescription>
                    Platform status and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">API Status</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Operational</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Database</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Connected</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">WebSocket</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Active</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Payment System</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Functional</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6" id="admin-dashboard-users-tab-content">
            <Card className="card-hover" id="admin-dashboard-users-card">
              <CardHeader id="admin-dashboard-users-card-header">
                <CardTitle id="admin-dashboard-users-card-title">User Management</CardTitle>
                <CardDescription id="admin-dashboard-users-card-description">
                  Manage riders, drivers, and administrators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto" id="admin-users-table-container">
                  <Table id="admin-users-table">
                    <TableHeader id="admin-users-table-header">
                      <TableRow id="admin-users-table-header-row">
                        <TableHead id="admin-users-table-header-balance">BALANCE</TableHead>
                        <TableHead id="admin-users-table-header-name">Name</TableHead>
                        <TableHead id="admin-users-table-header-email">Email</TableHead>
                        <TableHead id="admin-users-table-header-role">Role</TableHead>
                        <TableHead id="admin-users-table-header-rating">Rating</TableHead>
                        <TableHead id="admin-users-table-header-rides">Rides</TableHead>
                        <TableHead id="admin-users-table-header-status">Status</TableHead>
                        <TableHead id="admin-users-table-header-joined">Joined</TableHead>
                        <TableHead id="admin-users-table-header-actions">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody id="admin-users-table-body">
                      {users.map((user) => (
                        <TableRow key={user.id} id={`admin-user-row-${user.id}`}>
                          <TableCell id={`admin-user-balance-cell-${user.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBalanceModal(user)}
                              className="flex items-center space-x-1 bg-green-100 hover:bg-green-200 border-green-300"
                              id={`admin-user-balance-button-${user.id}`}
                            >
                              <Wallet className="h-4 w-4 text-green-600" />
                              <span className="text-green-800 font-semibold">BALANCE</span>
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium" id={`admin-user-name-${user.id}`}>{user.name}</TableCell>
                          <TableCell id={`admin-user-email-${user.id}`}>{user.email}</TableCell>
                          <TableCell id={`admin-user-role-${user.id}`}>
                            <Badge className={getUserRoleColor(user.role)} id={`admin-user-role-badge-${user.id}`}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell id={`admin-user-rating-${user.id}`}>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span>{user.rating || 5.0}</span>
                            </div>
                          </TableCell>
                          <TableCell id={`admin-user-rides-${user.id}`}>{user.total_rides || 0}</TableCell>
                          <TableCell id={`admin-user-status-${user.id}`}>
                            <Badge className={user.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} id={`admin-user-status-badge-${user.id}`}>
                              {user.is_online ? 'Online' : 'Offline'}
                            </Badge>
                          </TableCell>
                          <TableCell id={`admin-user-joined-${user.id}`}>
                            {formatDate(user.created_at)}
                          </TableCell>
                          <TableCell id={`admin-user-actions-${user.id}`}>
                            <span className="text-gray-400 text-sm">-</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rides Tab */}
          <TabsContent value="rides" className="space-y-6">
            {/* Pending Requests */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pending Requests ({pendingRequests.length})</span>
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Ride requests waiting for driver acceptance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ride ID</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Fare</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((ride) => (
                        <TableRow key={ride.id}>
                          <TableCell className="font-mono text-sm">
                            #{ride.id.slice(-8)}
                          </TableCell>
                          <TableCell>{ride.rider_id?.slice(-8) || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm truncate">
                                {ride.pickup_location?.address || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                → {ride.dropoff_location?.address || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(ride.estimated_fare || 0)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ride.status)}>
                              {ride.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(ride.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openNotificationModal(ride)}
                              className="flex items-center space-x-1"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>Notify</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Completed Matches */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Completed Rides ({completedMatches.length})</span>
                  <Badge variant="default">{completedMatches.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Successfully completed ride matches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ride ID</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Fare</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedMatches.map((ride) => (
                        <TableRow key={ride.id}>
                          <TableCell className="font-mono text-sm">
                            #{ride.id.slice(-8)}
                          </TableCell>
                          <TableCell>{ride.rider_id?.slice(-8) || 'N/A'}</TableCell>
                          <TableCell>{ride.driver_id?.slice(-8) || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm truncate">
                                {ride.pickup_location?.address || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                → {ride.dropoff_location?.address || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(ride.estimated_fare || 0)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ride.status)}>
                              {ride.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(ride.completed_at || ride.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openNotificationModal(ride)}
                              className="flex items-center space-x-1"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>Notify</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="text-lg font-semibold text-green-600">
                      {stats.completion_rate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Rating</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-lg font-semibold">4.8</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Driver Utilization</span>
                    <span className="text-lg font-semibold text-blue-600">
                      {stats.total_drivers > 0 ? Math.round((stats.online_drivers / stats.total_drivers) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Revenue per Ride</span>
                    <span className="text-lg font-semibold text-purple-600">
                      {formatCurrency(stats.completed_rides > 0 ? stats.total_revenue / stats.completed_rides : 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Insights */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    <span>Growth Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">Revenue Growth</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Platform revenue is trending upward with consistent ride completion rates.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">User Engagement</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      High user satisfaction with {stats.online_drivers} active drivers online.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-orange-900">Market Coverage</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      Expanding coverage area with increased driver availability.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Admin Notification Modal */}
      <AdminNotificationModal
        isOpen={notificationModal.isOpen}
        onClose={closeNotificationModal}
        rideId={notificationModal.rideId}
        riderId={notificationModal.riderId}
        driverId={notificationModal.driverId}
        riderName={notificationModal.riderName}
        driverName={notificationModal.driverName}
      />

      {/* Admin Balance Modal */}
      <AdminBalanceModal
        isOpen={balanceModal.isOpen}
        onClose={closeBalanceModal}
        userId={balanceModal.userId}
        userName={balanceModal.userName}
        userEmail={balanceModal.userEmail}
        userRole={balanceModal.userRole}
      />
    </div>
  );
};

export default AdminDashboard;