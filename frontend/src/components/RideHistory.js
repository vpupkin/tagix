import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { 
  History, 
  MapPin, 
  Clock, 
  Star, 
  DollarSign, 
  Search,
  Filter,
  Calendar,
  Navigation,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import BookAgainModal from './BookAgainModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StarRating = ({ rating, onRatingChange, readonly = false }) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRatingChange && onRatingChange(star)}
          disabled={readonly}
          className={`h-5 w-5 ${
            star <= rating 
              ? 'text-yellow-400 fill-current' 
              : 'text-gray-300'
          } ${!readonly ? 'hover:text-yellow-400 cursor-pointer' : 'cursor-default'}`}
        >
          <Star className="h-full w-full" />
        </button>
      ))}
    </div>
  );
};

const RatingModal = ({ ride, isOpen, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await onSubmit({
        rating,
        comment: comment.trim() || null
      });
      onClose();
      toast.success('Rating submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Ride</DialogTitle>
          <DialogDescription>
            How was your experience with this ride?
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center justify-center py-4">
              <StarRating rating={rating} onRatingChange={setRating} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const RideDetailsModal = ({ ride, isOpen, onClose }) => {
  if (!ride) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ride Details</DialogTitle>
          <DialogDescription>
            Complete information about your ride
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Ride ID</Label>
              <p className="font-mono text-sm">{ride.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Status</Label>
              <Badge className={getStatusColor(ride.status)}>
                {ride.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="w-px h-6 bg-gray-300"></div>
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Pickup</p>
                  <p className="text-sm text-gray-600">{ride.pickup_location?.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Destination</p>
                  <p className="text-sm text-gray-600">{ride.dropoff_location?.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Distance</Label>
              <p className="text-sm">{ride.estimated_distance_km?.toFixed(1) || 'N/A'} km</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Duration</Label>
              <p className="text-sm">{ride.estimated_duration_minutes || 'N/A'} min</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Fare</Label>
              <p className="text-lg font-semibold text-green-600">
                ${ride.estimated_fare?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Created</Label>
              <p className="text-sm">{formatDate(ride.created_at || ride.accepted_at || ride.completed_at || ride.requested_at)}</p>
            </div>
          </div>
          
          {ride.completed_at && (
            <div>
              <Label className="text-sm font-medium text-gray-600">Completed</Label>
              <p className="text-sm">{formatDate(ride.completed_at)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
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

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-600" />;
    case 'accepted':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Date error';
  }
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

const RideHistory = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRide, setSelectedRide] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBookAgainModal, setShowBookAgainModal] = useState(false);

  useEffect(() => {
    fetchRides();
  }, []);

  useEffect(() => {
    filterRides();
  }, [rides, searchTerm, statusFilter]);

  const fetchRides = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rides/my-rides`);
      setRides(response.data);
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
        ride.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ride => ride.status === statusFilter);
    }

    setFilteredRides(filtered);
  };

  const handleRateRide = async (rideId, ratingData) => {
    try {
      await axios.post(`${API_URL}/api/rides/${rideId}/rate`, ratingData);
      // Refresh rides to show updated rating status
      fetchRides();
    } catch (error) {
      console.error('Error rating ride:', error);
      throw error;
    }
  };

  const openRatingModal = (ride) => {
    setSelectedRide(ride);
    setShowRatingModal(true);
  };

  const openDetailsModal = (ride) => {
    setSelectedRide(ride);
    setShowDetailsModal(true);
  };

  const canRateRide = (ride) => {
    return ride.status === 'completed' && user.role === 'rider';
  };

  const openBookAgainModal = (ride) => {
    setSelectedRide(ride);
    setShowBookAgainModal(true);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600">Loading ride history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="ride-history">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <History className="h-8 w-8 text-indigo-600" />
            <span>Ride History</span>
          </h1>
          <p className="text-gray-600 mt-1">
            View and manage all your {user.role === 'admin' ? 'platform' : ''} rides
          </p>
        </div>

        {/* Filters */}
        <Card className="card-hover mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by location or ride ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-rides"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rides</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rides List */}
        {filteredRides.length > 0 ? (
          <div className="space-y-4">
            {filteredRides.map((ride) => (
              <Card key={ride.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(ride.status)}
                          <Badge className={getStatusColor(ride.status)}>
                            {ride.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(ride.created_at || ride.accepted_at || ride.completed_at || ride.requested_at)}
                        </div>
                        <div className="text-sm font-mono text-gray-400">
                          #{ride.id.slice(-8)}
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        {/* Route */}
                        <div className="flex-1">
                          <div className="flex items-start space-x-3">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <div className="w-px h-6 bg-gray-300"></div>
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            </div>
                            <div className="flex-1 space-y-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {ride.pickup_location?.address || 'Pickup location not specified'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {ride.dropoff_location?.address || 'Destination not specified'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Trip Info */}
                        <div className="flex flex-col items-end space-y-2">
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              ${ride.estimated_fare?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(() => {
                                const distance = calculateDistance(ride.pickup_location, ride.dropoff_location);
                                const duration = calculateDuration(distance);
                                return distance && duration 
                                  ? `${distance.toFixed(1)} km • ${duration} min`
                                  : `${ride.estimated_distance_km?.toFixed(1) || 'N/A'} km • ${ride.estimated_duration_minutes || 'N/A'} min`;
                              })()}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailsModal(ride)}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Details</span>
                            </Button>
                            
                            {canRateRide(ride) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRatingModal(ride)}
                                className="flex items-center space-x-1"
                                data-testid={`rate-ride-${ride.id}`}
                              >
                                <Star className="h-4 w-4" />
                                <span>Rate</span>
                              </Button>
                            )}
                            
                            {user.role === 'rider' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openBookAgainModal(ride)}
                                className="flex items-center space-x-1 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                data-testid={`book-again-${ride.id}`}
                              >
                                <RotateCcw className="h-4 w-4" />
                                <span>Book Again</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="card-hover">
            <CardContent className="p-12 text-center">
              <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No rides found' : 'No rides yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : `You haven't taken any rides yet`
                }
              </p>
              {(!searchTerm && statusFilter === 'all' && user.role === 'rider') && (
                <Button className="btn-primary">
                  Book Your First Ride
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rating Modal */}
        <RatingModal
          ride={selectedRide}
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedRide(null);
          }}
          onSubmit={(ratingData) => handleRateRide(selectedRide.id, ratingData)}
        />

        {/* Details Modal */}
        <RideDetailsModal
          ride={selectedRide}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRide(null);
          }}
        />

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
    </div>
  );
};

export default RideHistory;