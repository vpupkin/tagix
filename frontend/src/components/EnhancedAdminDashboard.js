import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { 
  Users, 
  Car, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Shield,
  Search,
  Filter,
  Edit,
  Eye,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  UserX,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EnhancedAdminDashboard = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [payments, setPayments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState({});
  
  // Filter states
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: '',
    status: '',
    limit: 50,
    offset: 0
  });
  
  const [rideFilters, setRideFilters] = useState({
    search: '',
    status: '',
    limit: 50,
    offset: 0
  });
  
  const [paymentFilters, setPaymentFilters] = useState({
    search: '',
    status: '',
    limit: 50,
    offset: 0
  });
  
  const [auditFilters, setAuditFilters] = useState({
    search: '',
    action: '',
    entity_type: '',
    severity: '',
    limit: 50,
    offset: 0
  });
  
  // Edit states
  const [editingUser, setEditingUser] = useState(null);
  const [editingRide, setEditingRide] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  
  // Form states
  const [userUpdateForm, setUserUpdateForm] = useState({
    name: '',
    email: '',
    phone: '',
    is_verified: false,
    rating: 5.0,
    status: 'active',
    admin_notes: ''
  });
  
  const [suspensionForm, setSuspensionForm] = useState({
    reason: '',
    duration_days: ''
  });

  // Auth headers
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAllData();
    }
  }, [user, token]);

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchPlatformStats(),
        fetchUsersWithFilters(),
        fetchRidesWithFilters(),
        fetchPaymentsWithFilters(),
        fetchAuditLogs(),
        fetchAuditStatistics()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPlatformStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/stats`, {
        headers: getAuthHeaders()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    }
  };

  const fetchUsersWithFilters = async (filters = userFilters) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await axios.get(`${API_URL}/api/admin/users/filtered?${params}`, {
        headers: getAuthHeaders()
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRidesWithFilters = async (filters = rideFilters) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await axios.get(`${API_URL}/api/admin/rides/filtered?${params}`, {
        headers: getAuthHeaders()
      });
      
      console.log('🔍 EnhancedAdminDashboard: Filtered rides response:', response.data);
      
      // The backend returns {pending_requests: [...], completed_matches: [...]}
      const pendingRequests = response.data.pending_requests || [];
      const completedMatches = response.data.completed_matches || [];
      const allRides = [...pendingRequests, ...completedMatches];
      
      console.log('🔍 Setting rides:', allRides.length, 'pending:', pendingRequests.length, 'completed:', completedMatches.length);
      setRides(allRides);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const fetchPaymentsWithFilters = async (filters = paymentFilters) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await axios.get(`${API_URL}/api/admin/payments/filtered?${params}`, {
        headers: getAuthHeaders()
      });
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchAuditLogs = async (filters = auditFilters) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await axios.get(`${API_URL}/api/audit/logs?${params}`, {
        headers: getAuthHeaders()
      });
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const fetchAuditStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/audit/statistics`, {
        headers: getAuthHeaders()
      });
      setAuditStats(response.data);
    } catch (error) {
      console.error('Error fetching audit statistics:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      const params = new URLSearchParams();
      Object.entries(userUpdateForm).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });
      
      await axios.put(`${API_URL}/api/admin/users/${editingUser.id}/update?${params}`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsersWithFilters();
      fetchAuditLogs(); // Refresh audit logs
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!suspensionForm.reason) {
      toast.error('Please provide a suspension reason');
      return;
    }
    
    try {
      const params = new URLSearchParams();
      params.append('reason', suspensionForm.reason);
      if (suspensionForm.duration_days) {
        params.append('duration_days', suspensionForm.duration_days);
      }
      
      await axios.post(`${API_URL}/api/admin/users/${userId}/suspend?${params}`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('User suspended successfully');
      setSuspensionForm({ reason: '', duration_days: '' });
      fetchUsersWithFilters();
      fetchAuditLogs(); // Refresh audit logs
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    }
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserUpdateForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      is_verified: user.is_verified || false,
      rating: user.rating || 5.0,
      status: user.status || 'active',
      admin_notes: ''
    });
  };

  const exportAuditLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/audit/logs?limit=1000`, {
        headers: getAuthHeaders()
      });
      const logs = response.data;
      
      const csvContent = [
        'Timestamp,Action,User ID,Entity Type,Entity ID,Severity,IP Address,User Agent',
        ...logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.action,
          log.user_id || '',
          log.entity_type,
          log.entity_id || '',
          log.severity,
          log.ip_address || '',
          log.user_agent || ''
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error('Failed to export audit logs');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'active':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'suspended':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Loading enhanced admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="enhanced-admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                <Shield className="h-8 w-8 text-purple-600" />
                <span>Enhanced Admin Dashboard</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Comprehensive platform management with audit trails
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={exportAuditLogs}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export Audit Logs</span>
              </Button>
              <Button 
                onClick={fetchAllData}
                disabled={refreshing}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh All</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_users || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Rides</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_rides || 0}</p>
                </div>
                <Car className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${stats.total_revenue || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Online Drivers</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.online_drivers || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Audit Logs</p>
                  <p className="text-3xl font-bold text-gray-900">{auditStats.total_audit_logs || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tabs with Audit Information */}
        <Tabs defaultValue="audit" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="rides">Ride Monitoring</TabsTrigger>
            <TabsTrigger value="payments">Payment Control</TabsTrigger>
          </TabsList>

          {/* Enhanced Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Comprehensive Audit Trail</CardTitle>
                    <CardDescription>
                      Complete immutable record of all platform activities
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Search audit logs..."
                      value={auditFilters.search}
                      onChange={(e) => setAuditFilters({...auditFilters, search: e.target.value})}
                      className="w-48"
                    />
                    <Select value={auditFilters.severity} onValueChange={(value) => setAuditFilters({...auditFilters, severity: value})}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => fetchAuditLogs()}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Audit Statistics Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-blue-600">Total Logs</p>
                          <p className="text-xl font-bold text-blue-900">{auditStats.total_audit_logs || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-green-600">Recent (24h)</p>
                          <p className="text-xl font-bold text-green-900">{auditStats.recent_activity_24h || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="text-sm text-orange-600">High Severity</p>
                          <p className="text-xl font-bold text-orange-900">
                            {auditStats.severity_distribution?.find(s => s._id === 'high')?.count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-sm text-red-600">Critical</p>
                          <p className="text-xl font-bold text-red-900">
                            {auditStats.severity_distribution?.find(s => s._id === 'critical')?.count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit Logs Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{formatDate(log.timestamp)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>
                              {log.user_id ? (
                                <span className="text-sm font-mono">{log.user_id.slice(-8)}</span>
                              ) : (
                                <span className="text-gray-400">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="text-sm font-medium">{log.entity_type}</div>
                                {log.entity_id && (
                                  <div className="text-xs text-gray-500 font-mono">{log.entity_id.slice(-8)}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getSeverityColor(log.severity)}>
                                {log.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-mono">{log.ip_address || 'N/A'}</span>
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Audit Log Details</DialogTitle>
                                    <DialogDescription>
                                      Complete audit trail information
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Action</Label>
                                        <p className="text-sm">{log.action}</p>
                                      </div>
                                      <div>
                                        <Label>Timestamp</Label>
                                        <p className="text-sm">{new Date(log.timestamp).toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <Label>User ID</Label>
                                        <p className="text-sm font-mono">{log.user_id || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <Label>Severity</Label>
                                        <Badge className={getSeverityColor(log.severity)}>{log.severity}</Badge>
                                      </div>
                                    </div>
                                    {log.old_data && (
                                      <div>
                                        <Label>Previous Data</Label>
                                        <pre className="text-xs bg-gray-100 p-3 rounded mt-1 overflow-auto max-h-32">
                                          {JSON.stringify(log.old_data, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {log.new_data && (
                                      <div>
                                        <Label>New Data</Label>
                                        <pre className="text-xs bg-gray-100 p-3 rounded mt-1 overflow-auto max-h-32">
                                          {JSON.stringify(log.new_data, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {log.metadata && (
                                      <div>
                                        <Label>Metadata</Label>
                                        <pre className="text-xs bg-gray-100 p-3 rounded mt-1 overflow-auto max-h-32">
                                          {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management & Control</CardTitle>
                    <CardDescription>
                      Comprehensive user administration with audit trails
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Search users..."
                      value={userFilters.search}
                      onChange={(e) => setUserFilters({...userFilters, search: e.target.value})}
                      className="w-64"
                    />
                    <Select value={userFilters.role} onValueChange={(value) => setUserFilters({...userFilters, role: value})}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="rider">Rider</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => fetchUsersWithFilters()}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'driver' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(user.status)}>
                              {user.status || 'active'}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.rating || 5.0}</TableCell>
                          <TableCell>
                            {user.is_verified ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Suspend User</DialogTitle>
                                    <DialogDescription>
                                      Suspend {user.name}'s account
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Reason for Suspension</Label>
                                      <Textarea
                                        value={suspensionForm.reason}
                                        onChange={(e) => setSuspensionForm({...suspensionForm, reason: e.target.value})}
                                        placeholder="Explain why this user is being suspended..."
                                      />
                                    </div>
                                    <div>
                                      <Label>Duration (days) - Optional</Label>
                                      <Input
                                        type="number"
                                        value={suspensionForm.duration_days}
                                        onChange={(e) => setSuspensionForm({...suspensionForm, duration_days: e.target.value})}
                                        placeholder="Leave empty for indefinite"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleSuspendUser(user.id)}
                                      className="w-full"
                                      variant="destructive"
                                    >
                                      Suspend User
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* User Edit Dialog */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
                  <DialogDescription>
                    Modify user details with full audit trail
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={userUpdateForm.name}
                      onChange={(e) => setUserUpdateForm({...userUpdateForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={userUpdateForm.email}
                      onChange={(e) => setUserUpdateForm({...userUpdateForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Rating</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={userUpdateForm.rating}
                      onChange={(e) => setUserUpdateForm({...userUpdateForm, rating: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={userUpdateForm.status} onValueChange={(value) => setUserUpdateForm({...userUpdateForm, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Admin Notes</Label>
                    <Textarea
                      value={userUpdateForm.admin_notes}
                      onChange={(e) => setUserUpdateForm({...userUpdateForm, admin_notes: e.target.value})}
                      placeholder="Add notes about this modification..."
                    />
                  </div>
                  <Button onClick={handleUpdateUser} className="w-full">
                    Update User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Enhanced Rides Tab */}
          <TabsContent value="rides" className="space-y-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Real-Time Ride Monitoring</CardTitle>
                    <CardDescription>Monitor all ride activities with complete audit trails</CardDescription>
                  </div>
                  <Button onClick={() => fetchRidesWithFilters()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Rides
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Ride Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-blue-600">Pending</p>
                          <p className="text-xl font-bold text-blue-900">
                            {rides.filter(r => r.status === 'pending').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Car className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="text-sm text-yellow-600">Active</p>
                          <p className="text-xl font-bold text-yellow-900">
                            {rides.filter(r => ['accepted', 'in_progress'].includes(r.status)).length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-green-600">Completed</p>
                          <p className="text-xl font-bold text-green-900">
                            {rides.filter(r => r.status === 'completed').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <UserX className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-sm text-red-600">Cancelled</p>
                          <p className="text-xl font-bold text-red-900">
                            {rides.filter(r => r.status === 'cancelled').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-purple-600">Total Revenue</p>
                          <p className="text-xl font-bold text-purple-900">
                            ${rides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.estimated_fare || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rides Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ride ID</TableHead>
                          <TableHead>Rider</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Fare</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rides.slice(0, 10).map((ride) => (
                          <TableRow key={ride.id}>
                            <TableCell className="font-mono text-sm">{ride.id?.slice(-8)}</TableCell>
                            <TableCell className="font-mono text-sm">{ride.rider_id?.slice(-8)}</TableCell>
                            <TableCell className="font-mono text-sm">{ride.driver_id?.slice(-8) || 'Unassigned'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(ride.status)}>
                                {ride.status?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>
                                <div>From: {ride.pickup_location?.address}</div>
                                <div className="text-gray-500">To: {ride.dropoff_location?.address}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">${ride.estimated_fare}</TableCell>
                            <TableCell>{formatDate(ride.created_at)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Control & Revenue Tracking</CardTitle>
                    <CardDescription>Monitor all payment transactions with comprehensive audit trails</CardDescription>
                  </div>
                  <Button onClick={() => fetchPaymentsWithFilters()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Payments
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Payment Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-green-600">Completed</p>
                          <p className="text-xl font-bold text-green-900">
                            {payments.filter(p => p.status === 'completed').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="text-sm text-yellow-600">Pending</p>
                          <p className="text-xl font-bold text-yellow-900">
                            {payments.filter(p => p.status === 'pending').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-blue-600">Total Revenue</p>
                          <p className="text-xl font-bold text-blue-900">
                            ${payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-purple-600">Platform Fees</p>
                          <p className="text-xl font-bold text-purple-900">
                            ${payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.platform_fee || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payments Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment ID</TableHead>
                          <TableHead>Ride ID</TableHead>
                          <TableHead>Rider</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Driver Earnings</TableHead>
                          <TableHead>Platform Fee</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.slice(0, 10).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-sm">{payment.id?.slice(-8)}</TableCell>
                            <TableCell className="font-mono text-sm">{payment.ride_id?.slice(-8)}</TableCell>
                            <TableCell className="font-mono text-sm">{payment.rider_id?.slice(-8)}</TableCell>
                            <TableCell className="font-mono text-sm">{payment.driver_id?.slice(-8)}</TableCell>
                            <TableCell className="font-semibold">${payment.amount}</TableCell>
                            <TableCell className="font-semibold text-green-600">${payment.driver_earnings}</TableCell>
                            <TableCell className="font-semibold text-purple-600">${payment.platform_fee}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(payment.status)}>
                                {payment.status?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(payment.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;