import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { History, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DriverRideHistory = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRides();
  }, []);

  useEffect(() => {
    filterRides();
  }, [rides, searchTerm, statusFilter]);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/rides/my-rides`);
      
      // Sort by date (newest first)
      const sortedRides = response.data.sort((a, b) => {
        const dateA = new Date(b.completed_at || b.created_at);
        const dateB = new Date(a.completed_at || a.created_at);
        return dateA - dateB;
      });
      
      setRides(sortedRides);
    } catch (error) {
      console.error('Error fetching rides:', error);
      toast.error('Failed to load ride history');
    } finally {
      setLoading(false);
    }
  };

  const filterRides = () => {
    let filtered = rides;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(ride => 
        (ride.pickup_location?.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ride.dropoff_location?.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ride.rider_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ride => ride.status === statusFilter);
    }

    setFilteredRides(filtered);
  };

  const formatCurrency = (amount) => {
    return `Ⓣ${(amount || 0).toFixed(2)}`;
  };

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

  const formatDistance = (distance) => {
    if (!distance) return 'N/A';
    return `${distance.toFixed(1)} km`;
  };

  const formatDuration = (durationMinutes) => {
    if (!durationMinutes) return 'N/A';
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getRatingEmoji = (rating) => {
    switch (rating) {
      case 1: return '😠';
      case 2: return '😢';
      case 3: return '😐';
      case 4: return '😊';
      case 5: return '🤩';
      default: return '—';
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

  const calculateEarnings = (fare) => {
    // Driver gets 80% (20% platform fee)
    return fare * 0.8;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <History className="h-5 w-5 text-purple-600" />
                  <span>Ride History</span>
                </CardTitle>
                <CardDescription>
                  View and manage all your completed rides ({filteredRides.length} of {rides.length} rides)
                </CardDescription>
              </div>
              <button
                onClick={fetchRides}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by rider, address, or ride ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading rides...</p>
              </div>
            ) : filteredRides.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ride ID</TableHead>
                      <TableHead>Rider</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Fare</TableHead>
                      <TableHead>Your Earnings</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRides.map((ride) => (
                      <TableRow key={ride.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-sm">
                          {formatDate(ride.completed_at || ride.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">
                          #{ride.id.slice(-8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <div className="font-medium">{ride.rider_name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{ride.rider_id?.slice(-8) || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-sm font-medium truncate">
                              {ride.pickup_location?.address || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              → {ride.dropoff_location?.address || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDistance(ride.distance_km)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDuration(ride.duration_minutes)}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {formatCurrency(ride.estimated_fare)}
                        </TableCell>
                        <TableCell className="font-medium text-sm text-green-600">
                          {formatCurrency(calculateEarnings(ride.estimated_fare || 0))}
                        </TableCell>
                        <TableCell>
                          {ride.rating ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-lg">{getRatingEmoji(ride.rating)}</span>
                              <span className="text-xs text-gray-500">{ride.rating}/5</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(ride.status)}>
                            {ride.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'No rides found' : 'No rides yet'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Complete your first ride to see it here'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverRideHistory;
