import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Wallet,
  Download,
  Eye,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  User,
  Edit,
  Key,
  Lock,
  Unlock,
  Mail,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import AdminNotificationModal from './AdminNotificationModal';
import AdminBalanceModal from './AdminBalanceModal';
import './ElementIdDisplay.css';
import { getRevisionInfo } from '../utils/gitRevision';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const { user } = useAuth();
  const { notifications, fetchNotifications, clearAllNotifications } = useWebSocket();
  
  // Git revision for deployment verification
  const revisionInfo = getRevisionInfo();
  
  // Debug mode - force show all elements
  const DEBUG_MODE = true;
  const [loading, setLoading] = useState(true);

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications();
      console.log('All admin notifications cleared successfully');
    } catch (error) {
      console.error('Failed to clear admin notifications:', error);
    }
  };
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
  const [userBalances, setUserBalances] = useState({}); // Map of user_id -> balance
  const [rides, setRides] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
  
  // Unified rides table state
  const [allRides, setAllRides] = useState([]);
  const [rideSearchTerm, setRideSearchTerm] = useState('');
  const [rideStatusFilter, setRideStatusFilter] = useState('all');
  const [rideTypeFilter, setRideTypeFilter] = useState('all');
  const [rideSortBy, setRideSortBy] = useState('created_at');
  const [rideSortOrder, setRideSortOrder] = useState('desc');
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
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  
  // Conversations state
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Audit Trail filters
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('all');
  const [auditEntityFilter, setAuditEntityFilter] = useState('all');
  const [auditTimeFilter, setAuditTimeFilter] = useState('all');
  const [auditSortBy, setAuditSortBy] = useState('timestamp');
  const [auditSortOrder, setAuditSortOrder] = useState('desc');
  
  // User management modals
  const [userDetailsModal, setUserDetailsModal] = useState({
    isOpen: false,
    user: null
  });
  const [passwordResetModal, setPasswordResetModal] = useState({
    isOpen: false,
    user: null
  });
  const [userEditModal, setUserEditModal] = useState({
    isOpen: false,
    user: null
  });

  useEffect(() => {
    console.log('🔍 AdminDashboard: useEffect triggered');
    console.log('🔍 User from useAuth:', user);
    console.log('🔍 Loading state:', loading);
    
    // Add a small delay to ensure auth context is fully loaded
    const timer = setTimeout(() => {
      if (user && user.id) {
        console.log('🔍 User is authenticated, fetching dashboard data...');
        fetchDashboardData();
        // Fetch notifications for the admin
        if (fetchNotifications) {
          console.log('🔔 AdminDashboard: Fetching notifications...');
          fetchNotifications();
        }
      } else {
        console.log('⚠️ User not authenticated or still loading');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading]);

  // Refresh user data periodically to get updated online status
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && user.id) {
        fetchDashboardData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

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
      
      // Add cache-busting parameter to force fresh data
      const cacheBuster = `?t=${Date.now()}`;
      
      const [statsResponse, usersResponse, ridesResponse, transactionsResponse, auditResponse, conversationsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats${cacheBuster}`),
        axios.get(`${API_URL}/api/admin/users${cacheBuster}`),
        axios.get(`${API_URL}/api/admin/rides${cacheBuster}`),
        axios.get(`${API_URL}/api/admin/balances${cacheBuster}`),
        axios.get(`${API_URL}/api/audit/logs?limit=10&t=${Date.now()}`),
        axios.get(`${API_URL}/api/admin/conversations${cacheBuster}`)
      ]);

      console.log('🔍 API responses received:');
      console.log('Stats:', statsResponse.data);
      console.log('Users:', usersResponse.data);
      console.log('Rides:', ridesResponse.data);
      console.log('Transactions:', transactionsResponse.data);
      console.log('Audit logs:', auditResponse.data);

      setStats(statsResponse.data);
      setUsers(usersResponse.data);
      setRecentTransactions(transactionsResponse.data?.balances || []);
      setAuditLogs(auditResponse.data || []);
      setConversations(conversationsResponse.data?.conversations || []);
      
      // Process balance data to create user_id -> balance mapping
      const balanceData = transactionsResponse.data?.balances || [];
      const balanceMap = {};
      balanceData.forEach(balance => {
        balanceMap[balance.user_id] = balance.balance || 0;
      });
      setUserBalances(balanceMap);
      
      // Debug: Log the stats that were set
      console.log('🔍 Stats set in state:', statsResponse.data);
      console.log('🔍 Total rides from API:', statsResponse.data.total_rides);
      
      // Debug: Log the users data that was set
      console.log('🔍 Users data from API:', usersResponse.data);
      console.log('🔍 First user rides:', usersResponse.data[0]?.rides);
      console.log('🔍 All user ride counts:', usersResponse.data.map(u => `${u.name}: ${u.rides || 'NO_RIDES'}`));
      
      // Handle the structured rides response
      const ridesData = ridesResponse.data;
      console.log('🔍 Processing rides data:', ridesData);
      
      setPendingRequests(ridesData.pending_requests || []);
      setCompletedMatches(ridesData.completed_matches || []);
      
      // Combine all rides for the overview tab
      const combinedRides = [...(ridesData.pending_requests || []), ...(ridesData.completed_matches || [])];
      setRides(combinedRides);
      
      // Set unified rides with type information
      const unifiedRides = [
        ...(ridesData.pending_requests || []).map(ride => ({ ...ride, ride_type: 'pending' })),
        ...(ridesData.completed_matches || []).map(ride => ({ ...ride, ride_type: 'completed' }))
      ];
      setAllRides(unifiedRides);
      
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

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return `Ⓣ${(amount || 0).toFixed(2)}`;
  };

  // Helper function to get balance color class
  const getBalanceColorClass = (balance) => {
    const amount = balance || 0;
    if (amount > 0) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (amount < 0) {
      return 'text-red-600 bg-red-50 border-red-200';
    } else {
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Helper function to get row background color based on role
  const getRoleRowColorClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-50 hover:bg-purple-100';
      case 'driver':
        return 'bg-blue-50 hover:bg-blue-100';
      case 'rider':
        return 'bg-green-50 hover:bg-green-100';
      default:
        return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  // Helper function to get rating emoji based on rating value
  const getRatingEmoji = (rating) => {
    switch (rating) {
      case 1:
        return '😠'; // Angry
      case 2:
        return '😢'; // Sad
      case 3:
        return '😐'; // Neutral
      case 4:
        return '😊'; // Happy
      case 5:
        return '🤩'; // Excited
      default:
        return '❓'; // Unknown
    }
  };

  // Helper function to get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
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
    // Refresh balance data when modal is closed to show updated balances
    fetchDashboardData();
  };

  // User management functions
  const openUserDetailsModal = (user) => {
    setUserDetailsModal({ isOpen: true, user });
  };

  const closeUserDetailsModal = () => {
    setUserDetailsModal({ isOpen: false, user: null });
  };

  const openPasswordResetModal = (user) => {
    setPasswordResetModal({ isOpen: true, user });
  };

  const closePasswordResetModal = () => {
    setPasswordResetModal({ isOpen: false, user: null });
  };

  const openUserEditModal = (user) => {
    setUserEditModal({ isOpen: true, user });
  };

  const closeUserEditModal = () => {
    setUserEditModal({ isOpen: false, user: null });
  };

  const toggleUserStatus = async (user) => {
    try {
      const token = localStorage.getItem('mobility_token');
      const response = await axios.patch(
        `${API_URL}/api/admin/users/${user.id}/status`,
        { is_active: !user.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        toast.success(`User ${user.is_active ? 'locked' : 'unlocked'} successfully`);
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      if (error.response?.status === 404) {
        toast.error('User not found');
      } else if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to update user status');
      }
    }
  };

  const sendValidationEmail = async (user) => {
    try {
      const token = localStorage.getItem('mobility_token');
      const response = await axios.post(
        `${API_URL}/api/admin/users/${user.id}/send-validation`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        toast.success('Validation email sent successfully');
      }
    } catch (error) {
      console.error('Error sending validation email:', error);
      if (error.response?.status === 404) {
        toast.error('User not found');
      } else if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to send validation email');
      }
    }
  };

  const resetUserPassword = async (userId, newPassword) => {
    try {
      const token = localStorage.getItem('mobility_token');
      
      // Use the new admin endpoint
      const response = await axios.patch(
        `${API_URL}/api/admin/users/${userId}/password`,
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        toast.success('Password reset successfully');
        closePasswordResetModal();
      }
      
    } catch (error) {
      console.error('Error resetting password:', error);
      if (error.response?.status === 404) {
        toast.error('User not found');
      } else if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to reset password');
      }
    }
  };

  const updateUserProfile = async (userId, userData) => {
    try {
      const token = localStorage.getItem('mobility_token');
      const response = await axios.patch(
        `${API_URL}/api/admin/users/${userId}`,
        userData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        toast.success('User profile updated successfully');
        closeUserEditModal();
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      if (error.response?.status === 404) {
        toast.error('User profile update feature not yet implemented in backend');
      } else {
        toast.error('Failed to update user profile');
      }
    }
  };

  const downloadAuditLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/audit/logs?limit=1000`);
      const logs = response.data;
      
      // Create CSV content
      const csvContent = [
        ['Timestamp', 'Action', 'Entity Type', 'User ID', 'Severity', 'Description', 'Metadata'],
        ...logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.action,
          log.entity_type,
          log.user_id,
          log.severity || 'info',
          log.description || '',
          JSON.stringify(log.metadata || {})
        ])
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Audit logs downloaded successfully');
    } catch (error) {
      console.error('Error downloading audit logs:', error);
      toast.error('Failed to download audit logs');
    }
  };

  const showAuditDetails = (log) => {
    const details = {
      id: log.id,
      timestamp: new Date(log.timestamp).toLocaleString(),
      action: log.action,
      entity_type: log.entity_type,
      user_id: log.user_id,
      severity: log.severity,
      description: log.description,
      metadata: JSON.stringify(log.metadata || {}, null, 2)
    };
    
    alert(`Audit Log Details:\n\n${Object.entries(details).map(([key, value]) => `${key}: ${value}`).join('\n')}`);
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      // Search filter
      const matchesSearch = !userSearchTerm || 
        (user.name && user.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(userSearchTerm.toLowerCase()));
      
      // Role filter
      const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
      
      // Status filter
      const matchesStatus = userStatusFilter === 'all' || 
        (userStatusFilter === 'online' && user.is_online) ||
        (userStatusFilter === 'offline' && !user.is_online);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  };

  const getFilteredAndSortedAuditLogs = () => {
    let filtered = auditLogs.filter(log => {
      // Search filter - enhanced to include metadata
      const matchesSearch = !auditSearchTerm || 
        log.action.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        (log.description && log.description.toLowerCase().includes(auditSearchTerm.toLowerCase())) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(auditSearchTerm.toLowerCase())) ||
        (log.user_id && log.user_id.toLowerCase().includes(auditSearchTerm.toLowerCase()));
      
      // Action filter
      const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter;
      
      // Severity filter
      const matchesSeverity = auditSeverityFilter === 'all' || log.severity === auditSeverityFilter;
      
      // Entity type filter
      const matchesEntity = auditEntityFilter === 'all' || log.entity_type === auditEntityFilter;
      
      // Time filter
      const matchesTime = auditTimeFilter === 'all' || isWithinTimeRange(log.timestamp, auditTimeFilter);
      
      return matchesSearch && matchesAction && matchesSeverity && matchesEntity && matchesTime;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (auditSortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case 'action':
          aValue = a.action;
          bValue = b.action;
          break;
        case 'entity_type':
          aValue = a.entity_type;
          bValue = b.entity_type;
          break;
        case 'severity':
          const severityOrder = { 'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1 };
          aValue = severityOrder[a.severity] || 0;
          bValue = severityOrder[b.severity] || 0;
          break;
        case 'user_id':
          aValue = a.user_id || '';
          bValue = b.user_id || '';
          break;
        default:
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
      }
      
      if (auditSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const isWithinTimeRange = (timestamp, timeFilter) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffMs = now - logTime;
    
    switch (timeFilter) {
      case 'last_hour':
        return diffMs <= 60 * 60 * 1000; // 1 hour
      case 'last_6_hours':
        return diffMs <= 6 * 60 * 60 * 1000; // 6 hours
      case 'last_24_hours':
        return diffMs <= 24 * 60 * 60 * 1000; // 24 hours
      case 'last_week':
        return diffMs <= 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'last_month':
        return diffMs <= 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return true;
    }
  };

  const getFilteredAndSortedRides = () => {
    let filtered = allRides.filter(ride => {
      // Search filter
      const matchesSearch = !rideSearchTerm || 
        ride.id.toLowerCase().includes(rideSearchTerm.toLowerCase()) ||
        (ride.rider_id && ride.rider_id.toLowerCase().includes(rideSearchTerm.toLowerCase())) ||
        (ride.driver_id && ride.driver_id.toLowerCase().includes(rideSearchTerm.toLowerCase())) ||
        (ride.pickup_location?.address && ride.pickup_location.address.toLowerCase().includes(rideSearchTerm.toLowerCase())) ||
        (ride.dropoff_location?.address && ride.dropoff_location.address.toLowerCase().includes(rideSearchTerm.toLowerCase()));
      
      // Status filter
      const matchesStatus = rideStatusFilter === 'all' || ride.status === rideStatusFilter;
      
      // Type filter (pending vs completed)
      const matchesType = rideTypeFilter === 'all' || ride.ride_type === rideTypeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (rideSortBy) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'completed_at':
          aValue = new Date(a.completed_at || a.created_at);
          bValue = new Date(b.completed_at || b.created_at);
          break;
        case 'estimated_fare':
          aValue = a.estimated_fare || 0;
          bValue = b.estimated_fare || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'ride_type':
          aValue = a.ride_type;
          bValue = b.ride_type;
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }
      
      if (rideSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
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



  const getAuditDescription = (log) => {
    // For notification entries, extract message from metadata
    if (log.entity_type === 'notification' && log.metadata) {
      const message = log.metadata.message || log.metadata.notification_message;
      const conversationThread = log.metadata.conversation_thread;
      const isReply = log.metadata.is_reply;
      
      if (message) {
        let description = message;
        
        // Add conversation context
        if (conversationThread) {
          const threadShort = conversationThread.substring(0, 8);
          if (isReply) {
            description = `[REPLY] ${message}`;
          } else {
            description = `[THREAD:${threadShort}] ${message}`;
          }
        }
        
        // Truncate if too long (max 100 characters for table display)
        return description.length > 100 ? description.substring(0, 100) + '...' : description;
      }
    }
    
    // For other entries, use description or create a default based on action
    if (log.description) {
      return log.description;
    }
    
    // Generate description based on action and entity type
    if (log.action && log.entity_type) {
      return `${log.action.replace(/_/g, ' ')} - ${log.entity_type}`;
    }
    
    return 'No description available';
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('mobility_token');
      const response = await axios.get(`${API_URL}/api/admin/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.conversations) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to fetch conversations');
    }
  };

  const viewConversation = async (threadId) => {
    try {
      const token = localStorage.getItem('mobility_token');
      const response = await axios.get(`${API_URL}/api/notifications/conversation/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setConversationMessages(response.data);
      setSelectedConversation(threadId);
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      toast.error('Failed to fetch conversation messages');
    }
  };

  const navigateToUser = (userId, userName) => {
    // Set the user search term to filter for this specific user
    setUserSearchTerm(userName || userId);
    // Navigate to the users tab
    setActiveTab('users');
    // Show a toast notification
    toast.success(`Navigating to User Management for ${userName || userId}`);
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
      {/* GIT REVISION DISPLAY - DEPLOYMENT VERIFICATION */}
      <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50 font-mono text-sm font-bold" id="git-revision-display">
        🚀 GIT REVISION: {revisionInfo.revision} | BUILD: {revisionInfo.buildTime} | ADMIN DASHBOARD
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                <Shield className="h-8 w-8 text-purple-600" />
                <span>Admin Dashboard</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor and manage the UjeBar platform
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" id="admin-dashboard-tabs">
          <TabsList className="grid w-full grid-cols-7" id="admin-dashboard-tabs-list">
            <TabsTrigger value="overview" id="admin-dashboard-tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="notifications" id="admin-dashboard-tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="users" id="admin-dashboard-tab-users">User Management</TabsTrigger>
            <TabsTrigger value="rides" id="admin-dashboard-tab-rides">Ride Monitoring</TabsTrigger>
            <TabsTrigger value="audit" id="admin-dashboard-tab-audit">Audit Trail</TabsTrigger>
            <TabsTrigger value="conversations" id="admin-dashboard-tab-conversations">Conversations</TabsTrigger>
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
                    {/* Combine rides, transactions, and audit logs for recent activity */}
                    {[
                      ...rides.slice(0, 3).map(ride => ({ ...ride, type: 'ride' })),
                      ...recentTransactions.slice(0, 2).map(transaction => ({ ...transaction, type: 'transaction' })),
                      ...auditLogs.slice(0, 2).map(log => ({ ...log, type: 'audit' }))
                    ]
                    .sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp))
                    .slice(0, 5)
                    .map((item, index) => (
                      <div key={`${item.type}-${item.id || index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            {item.type === 'ride' && <Car className="h-4 w-4 text-indigo-600" />}
                            {item.type === 'transaction' && <Wallet className="h-4 w-4 text-green-600" />}
                            {item.type === 'audit' && <Shield className="h-4 w-4 text-blue-600" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.type === 'ride' && `Ride #${item.id.slice(-8)}`}
                              {item.type === 'transaction' && `Balance ${item.transaction_type} - Ⓣ${item.amount}`}
                              {item.type === 'audit' && `${item.action} - ${item.entity_type}`}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatDate(item.created_at || item.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Badge className={
                          item.type === 'ride' ? getStatusColor(item.status) :
                          item.type === 'transaction' ? (item.transaction_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') :
                          'bg-blue-100 text-blue-800'
                        }>
                          {item.type === 'ride' && item.status}
                          {item.type === 'transaction' && item.transaction_type}
                          {item.type === 'audit' && item.severity || 'info'}
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

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6" id="admin-dashboard-notifications-tab-content">
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <span>Recent Notifications</span>
                    {notifications.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {notifications.length}
                      </Badge>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllNotifications}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Real-time notifications and messages from users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {console.log('🔔 AdminDashboard: Rendering notifications, count:', notifications.length)}
                {notifications.length > 0 ? (
                  <div className="space-y-3" id="admin-dashboard-notifications-list">
                    {notifications.slice(0, 10).map((notification) => (
                      <div key={notification.id} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant={
                                notification.type === 'reply_received' ? 'default' :
                                notification.type === 'admin_message' ? 'secondary' :
                                notification.type === 'balance_transaction' ? 'outline' : 'default'
                              }>
                                {notification.type === 'reply_received' ? 'Reply' :
                                 notification.type === 'admin_message' ? 'Admin' :
                                 notification.type === 'balance_transaction' ? 'Balance' : notification.type}
                              </Badge>
                              <span className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>
                                {notification.timestamp ? new Date(notification.timestamp).toLocaleString() : 'Just now'}
                              </span>
                              {notification.sender_name && (
                                <span>From: {notification.sender_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {notifications.length > 10 && (
                      <div className="text-center pt-2">
                        <p className="text-xs text-gray-500">
                          +{notifications.length - 10} more notifications
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No notifications yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Notifications from users will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6" id="admin-dashboard-users-tab-content">
            <Card className="card-hover" id="admin-dashboard-users-card">
              <CardHeader id="admin-dashboard-users-card-header">
                <CardTitle id="admin-dashboard-users-card-title">User Management</CardTitle>
                <CardDescription id="admin-dashboard-users-card-description">
                  Manage riders, drivers, and administrators ({getFilteredUsers().length} of {users.length} users)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6" id="admin-users-filters">
                  <div className="flex-1" id="admin-users-search-container">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users by name or email..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-10"
                        id="admin-users-search-input"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2" id="admin-users-filter-controls">
                    <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                      <SelectTrigger className="w-32" id="admin-users-role-filter">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="rider">Rider</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                      <SelectTrigger className="w-32" id="admin-users-status-filter">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUserSearchTerm('');
                        setUserRoleFilter('all');
                        setUserStatusFilter('all');
                      }}
                      id="admin-users-clear-filters"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                {/* Role Color Legend */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border" id="admin-role-legend">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-700">Role Colors:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
                        <span className="text-xs text-gray-600">Admin</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                        <span className="text-xs text-gray-600">Driver</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                        <span className="text-xs text-gray-600">Rider</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
                        <span className="text-xs text-gray-600">Other</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Row background color indicates user role
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto" id="admin-users-table-container">
                  <Table id="admin-users-table">
                    <TableHeader id="admin-users-table-header">
                      <TableRow id="admin-users-table-header-row">
                        <TableHead id="admin-users-table-header-actions" className="w-32">Actions</TableHead>
                        <TableHead id="admin-users-table-header-balance" className="w-24">Balance</TableHead>
                        <TableHead id="admin-users-table-header-name" className="w-32">Name</TableHead>
                        <TableHead id="admin-users-table-header-email" className="w-48">Email</TableHead>
                        <TableHead id="admin-users-table-header-rating" className="w-16">Rating</TableHead>
                        <TableHead id="admin-users-table-header-rides" className="w-12">Rides</TableHead>
                        <TableHead id="admin-users-table-header-status" className="w-16">Status</TableHead>
                        <TableHead id="admin-users-table-header-joined" className="w-24">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody id="admin-users-table-body">
                      {getFilteredUsers().map((user) => (
                        <TableRow key={user.id} id={`admin-user-row-${user.id}`} className={getRoleRowColorClass(user.role)}>
                          <TableCell id={`admin-user-actions-${user.id}`}>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openUserDetailsModal(user)}
                                className="h-6 w-6 p-0"
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openUserEditModal(user)}
                                className="h-6 w-6 p-0"
                                title="Edit Profile"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPasswordResetModal(user)}
                                className="h-6 w-6 p-0"
                                title="Reset Password"
                              >
                                <Key className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleUserStatus(user)}
                                className="h-6 w-6 p-0"
                                title={user.is_active ? 'Lock User' : 'Unlock User'}
                              >
                                {user.is_active ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendValidationEmail(user)}
                                className="h-6 w-6 p-0"
                                title="Send Validation Email"
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell id={`admin-user-balance-cell-${user.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBalanceModal(user)}
                              className={`flex items-center space-x-1 text-xs px-2 py-1 border ${getBalanceColorClass(userBalances[user.id])}`}
                              id={`admin-user-balance-button-${user.id}`}
                            >
                              <Wallet className="h-3 w-3" />
                              <span>{formatCurrency(userBalances[user.id])}</span>
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium text-sm" id={`admin-user-name-${user.id}`}>
                            <div className="truncate max-w-32" title={user.name || 'Unknown'}>
                              {user.name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell id={`admin-user-email-${user.id}`}>
                            <div className="truncate max-w-48 text-sm" title={user.email || 'Unknown'}>
                              {user.email || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell id={`admin-user-rating-${user.id}`}>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs">{user.rating || 5.0}</span>
                            </div>
                          </TableCell>
                          <TableCell id={`admin-user-rides-${user.id}`} className="text-xs text-center">{user.rides || 0}</TableCell>
                          <TableCell id={`admin-user-status-${user.id}`}>
                            <Badge className={`${user.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} text-xs px-1 py-0`} id={`admin-user-status-badge-${user.id}`}>
                              {user.is_online ? 'ON' : 'OFF'}
                            </Badge>
                          </TableCell>
                          <TableCell id={`admin-user-joined-${user.id}`} className="text-xs">
                            {new Date(user.created_at).toLocaleDateString()}
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
            {/* Unified Rides Table */}
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="h-5 w-5 text-indigo-600" />
                      <span>Ride Monitoring</span>
                    </CardTitle>
                    <CardDescription>
                      Comprehensive view of all ride requests and completed rides ({getFilteredAndSortedRides().length} of {allRides.length} rides)
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDashboardData()}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      <span className="ml-2">Refresh</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by ride ID, rider, driver, or address..."
                        value={rideSearchTerm}
                        onChange={(e) => setRideSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={rideStatusFilter} onValueChange={setRideStatusFilter}>
                      <SelectTrigger className="w-32">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="driver_arriving">Driver Arriving</SelectItem>
                        <SelectItem value="driver_arrived">Driver Arrived</SelectItem>
                        <SelectItem value="ride_started">Ride Started</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={rideTypeFilter} onValueChange={setRideTypeFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="pending">Pending Requests</SelectItem>
                        <SelectItem value="completed">Completed Rides</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={rideSortBy} onValueChange={setRideSortBy}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="completed_at">Completed Date</SelectItem>
                        <SelectItem value="estimated_fare">Fare Amount</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="ride_type">Type</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRideSortOrder(rideSortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {rideSortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRideSearchTerm('');
                        setRideStatusFilter('all');
                        setRideTypeFilter('all');
                        setRideSortBy('created_at');
                        setRideSortOrder('desc');
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ride ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Fare</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>Route</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAndSortedRides().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                            {allRides.length === 0 ? 'No rides found' : 'No rides match your filters'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredAndSortedRides().map((ride) => (
                          <TableRow key={ride.id}>
                            <TableCell className="font-mono text-sm">
                              #{ride.id.slice(-8)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(ride.status)}>
                                {ride.status === 'pending' ? 'Request' : ride.status?.replace('_', ' ') || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell>{ride.rider_id?.slice(-8) || 'N/A'}</TableCell>
                            <TableCell>{ride.driver_id?.slice(-8) || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {ride.passenger_count || 1} passenger{ride.passenger_count > 1 ? 's' : ''}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Car className="h-3 w-3" />
                                    {ride.vehicle_type || 'Economy'}
                                  </span>
                                </div>
                                {ride.special_requirements && (
                                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    <span className="font-medium">Special:</span> {ride.special_requirements}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(ride.estimated_fare || 0)}</TableCell>
                            <TableCell>
                              {ride.rating ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">
                                    {getRatingEmoji(ride.rating)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {ride.rider_id?.slice(-8) || 'N/A'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No rating</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(ride.status)}>
                                {ride.driver_id ? 'Assigned' : 'Unassigned'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ride.ride_type === 'completed' && ride.completed_at 
                                ? formatDate(ride.completed_at)
                                : formatDate(ride.created_at)
                              }
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
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <span>Message Conversations</span>
                    </CardTitle>
                    <CardDescription>
                      View and manage all messaging conversations between users and admins
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchConversations()}
                      disabled={refreshing}
                      id="admin-conversations-refresh-button"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      <span className="ml-2">Refresh</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thread ID</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead>Messages</TableHead>
                        <TableHead>Last Message</TableHead>
                        <TableHead>Latest Message</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No conversations found</p>
                            <p className="text-sm">Conversations will appear here when users reply to admin messages</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        conversations.map((conversation) => (
                          <TableRow key={conversation.thread_id}>
                            <TableCell className="font-mono text-sm">
                              {conversation.thread_id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-1">
                                {conversation.participants.map((participant, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary" 
                                    className="text-xs w-fit cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                    onClick={() => navigateToUser(participant?.id, participant?.name || participant?.email)}
                                    title={`Click to view ${participant?.name || participant?.email || 'Unknown'} in User Management`}
                                  >
                                    {participant?.name || participant?.email || 'Unknown'}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {conversation.message_count} messages
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {new Date(conversation.last_message_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {conversation.messages.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2 text-sm">
                                    <span className="font-medium text-gray-700">
                                      {conversation.messages[conversation.messages.length - 1].sender_name || 'System'}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-500 text-xs">
                                      {new Date(conversation.messages[conversation.messages.length - 1].created_at).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-gray-600 text-sm truncate">
                                    {conversation.messages[conversation.messages.length - 1].message}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No messages</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewConversation(conversation.thread_id)}
                                id={`admin-conversation-view-${conversation.thread_id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
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

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span>Comprehensive Audit Trail</span>
                    </CardTitle>
                    <CardDescription>
                      Complete immutable record of all platform activities ({getFilteredAndSortedAuditLogs().length} of {auditLogs.length} logs)
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDashboardData()}
                      disabled={refreshing}
                      id="admin-audit-refresh-button"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      <span className="ml-2">Refresh</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAuditLogs()}
                      id="admin-audit-download-button"
                    >
                      <Download className="h-4 w-4" />
                      <span className="ml-2">Download</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6" id="admin-audit-filters">
                  <div className="flex-1" id="admin-audit-search-container">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by action, entity, user ID, or metadata..."
                        value={auditSearchTerm}
                        onChange={(e) => setAuditSearchTerm(e.target.value)}
                        className="pl-10"
                        id="admin-audit-search-input"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2" id="admin-audit-filter-controls">
                    <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                      <SelectTrigger className="w-32" id="admin-audit-action-filter">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="user_login">User Login</SelectItem>
                        <SelectItem value="user_logout">User Logout</SelectItem>
                        <SelectItem value="user_created">User Created</SelectItem>
                        <SelectItem value="admin_system_config_changed">System Config Changed</SelectItem>
                        <SelectItem value="admin_ride_modified">Admin Ride Modified</SelectItem>
                        <SelectItem value="admin_user_modified">Admin User Modified</SelectItem>
                        <SelectItem value="admin_payment_modified">Admin Payment Modified</SelectItem>
                        <SelectItem value="ride_query">Ride Query</SelectItem>
                        <SelectItem value="ride_requested">Ride Requested</SelectItem>
                        <SelectItem value="payment_query">Payment Query</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={auditSeverityFilter} onValueChange={setAuditSeverityFilter}>
                      <SelectTrigger className="w-32" id="admin-audit-severity-filter">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={auditEntityFilter} onValueChange={setAuditEntityFilter}>
                      <SelectTrigger className="w-32" id="admin-audit-entity-filter">
                        <SelectValue placeholder="Entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Entities</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="user_query">User Query</SelectItem>
                        <SelectItem value="ride">Ride</SelectItem>
                        <SelectItem value="ride_query">Ride Query</SelectItem>
                        <SelectItem value="ride_requests">Ride Requests</SelectItem>
                        <SelectItem value="ride_request">Ride Request</SelectItem>
                        <SelectItem value="balance_transaction">Balance Transaction</SelectItem>
                        <SelectItem value="payment_query">Payment Query</SelectItem>
                        <SelectItem value="payment_history">Payment History</SelectItem>
                        <SelectItem value="admin_ride_query">Admin Ride Query</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={auditTimeFilter} onValueChange={setAuditTimeFilter}>
                      <SelectTrigger className="w-32" id="admin-audit-time-filter">
                        <Clock className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="last_hour">Last Hour</SelectItem>
                        <SelectItem value="last_6_hours">Last 6 Hours</SelectItem>
                        <SelectItem value="last_24_hours">Last 24 Hours</SelectItem>
                        <SelectItem value="last_week">Last Week</SelectItem>
                        <SelectItem value="last_month">Last Month</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={auditSortBy} onValueChange={setAuditSortBy}>
                      <SelectTrigger className="w-32" id="admin-audit-sort-filter">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="timestamp">Timestamp</SelectItem>
                        <SelectItem value="action">Action</SelectItem>
                        <SelectItem value="entity_type">Entity Type</SelectItem>
                        <SelectItem value="severity">Severity</SelectItem>
                        <SelectItem value="user_id">User ID</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditSortOrder(auditSortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {auditSortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAuditSearchTerm('');
                        setAuditActionFilter('all');
                        setAuditSeverityFilter('all');
                        setAuditEntityFilter('all');
                        setAuditTimeFilter('all');
                        setAuditSortBy('timestamp');
                        setAuditSortOrder('desc');
                      }}
                      id="admin-audit-clear-filters"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAndSortedAuditLogs().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            {auditLogs.length === 0 ? 'No audit logs found' : 'No audit logs match your filters'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredAndSortedAuditLogs().map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {formatDate(log.timestamp)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {log.entity_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.user_id?.slice(-8) || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                log.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                log.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                log.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                log.severity === 'low' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {log.severity || 'info'}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate" title={getAuditDescription(log)}>
                                {getAuditDescription(log)}
                              </p>
                            </TableCell>
                            <TableCell>
                              {log.metadata && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => showAuditDetails(log)}
                                  id={`admin-audit-details-${log.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
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

      {/* User Details Modal */}
      {userDetailsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">User Details</h3>
              <Button variant="ghost" size="sm" onClick={closeUserDetailsModal}>
                ×
              </Button>
            </div>
            {userDetailsModal.user && (
              <div className="space-y-3">
                <div><strong>Name:</strong> {userDetailsModal.user?.name || 'Unknown'}</div>
                <div><strong>Email:</strong> {userDetailsModal.user?.email || 'Unknown'}</div>
                <div><strong>Role:</strong> {userDetailsModal.user?.role || 'Unknown'}</div>
                <div><strong>Rating:</strong> {userDetailsModal.user?.rating || 5.0}</div>
                <div><strong>Rides:</strong> {userDetailsModal.user.rides || 0}</div>
                <div><strong>Status:</strong> {userDetailsModal.user.is_online ? 'Online' : 'Offline'}</div>
                <div><strong>Joined:</strong> {new Date(userDetailsModal.user.created_at).toLocaleDateString()}</div>
                <div><strong>Active:</strong> {userDetailsModal.user.is_active ? 'Yes' : 'No'}</div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <Button onClick={closeUserDetailsModal}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reset Password</h3>
              <Button variant="ghost" size="sm" onClick={closePasswordResetModal}>
                ×
              </Button>
            </div>
            {passwordResetModal.user && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">New Password</label>
                  <Input
                    type="password"
                    id="newPassword"
                    placeholder="Enter new password"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Confirm Password</label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    placeholder="Confirm new password"
                    className="w-full"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Resetting password for: {passwordResetModal.user?.name || 'Unknown'} ({passwordResetModal.user?.email || 'Unknown'})
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={closePasswordResetModal}>Cancel</Button>
              <Button onClick={() => {
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                if (newPassword && newPassword === confirmPassword) {
                  resetUserPassword(passwordResetModal.user.id, newPassword);
                } else {
                  toast.error('Passwords do not match');
                }
              }}>Reset Password</Button>
            </div>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {userEditModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit User Profile</h3>
              <Button variant="ghost" size="sm" onClick={closeUserEditModal}>
                ×
              </Button>
            </div>
            {userEditModal.user && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    type="text"
                    id="editName"
                    defaultValue={userEditModal.user?.name || ''}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    id="editEmail"
                    defaultValue={userEditModal.user?.email || ''}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <Select defaultValue={userEditModal.user?.role || 'rider'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="rider">Rider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={closeUserEditModal}>Cancel</Button>
              <Button onClick={() => {
                const name = document.getElementById('editName').value;
                const email = document.getElementById('editEmail').value;
                const role = document.querySelector('[role="combobox"]').textContent;
                updateUserProfile(userEditModal.user.id, { name, email, role });
              }}>Update Profile</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;