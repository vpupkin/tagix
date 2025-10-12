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
  RotateCcw,
  User,
  Car
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SmileRating = ({ selectedEmotion, onEmotionSelect, readonly = false }) => {
  const emotions = [
    { id: 1, emoji: '😠', label: 'Angry', color: 'text-red-500' },
    { id: 2, emoji: '😢', label: 'Sad', color: 'text-orange-500' },
    { id: 3, emoji: '😐', label: 'Neutral', color: 'text-yellow-500' },
    { id: 4, emoji: '😊', label: 'Happy', color: 'text-green-500' },
    { id: 5, emoji: '🤩', label: 'Excited', color: 'text-blue-500' }
  ];

  return (
    <div className="flex items-center justify-center space-x-2">
      {emotions.map((emotion) => (
        <button
          key={emotion.id}
          type="button"
          onClick={() => !readonly && onEmotionSelect && onEmotionSelect(emotion)}
          disabled={readonly}
          className={`text-2xl transition-all duration-200 ${
            selectedEmotion?.id === emotion.id 
              ? `${emotion.color} scale-125` 
              : 'text-gray-300 hover:text-gray-400'
          } ${!readonly ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          title={emotion.label}
        >
          {emotion.emoji}
        </button>
      ))}
    </div>
  );
};

const InlineRating = ({ ride, onRatingSubmit }) => {
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEmotionSelect = async (emotion) => {
    setSelectedEmotion(emotion);
    setSubmitting(true);
    
    try {
      // Generate automatic comment based on emotion and ride details
      const driverName = ride.driver_name || 'Driver';
      const pickupAddress = ride.pickup_location?.address || 'pickup location';
      const dropoffAddress = ride.dropoff_location?.address || 'destination';
      
      const emotionText = emotion.label.toLowerCase();
      const autoComment = `Rider was ${emotionText} with ${driverName} on the ride from ${pickupAddress} to ${dropoffAddress}`;
      
      await onRatingSubmit({
        rating: emotion.id,
        comment: autoComment
      });
      
      toast.success(`Rating submitted! You were ${emotionText} with this ride.`);
    } catch (error) {
      toast.error('Failed to submit rating');
      setSelectedEmotion(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
      <p className="text-sm text-gray-600 mb-2 text-center">How was your ride?</p>
      <SmileRating 
        selectedEmotion={selectedEmotion} 
        onEmotionSelect={handleEmotionSelect}
        readonly={submitting}
      />
      {submitting && (
        <p className="text-xs text-gray-500 text-center mt-2">Submitting rating...</p>
      )}
    </div>
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

const getRatingEmoji = (rating) => {
  switch (rating) {
    case 1: return '😠'; // Angry
    case 2: return '😢'; // Sad
    case 3: return '😐'; // Neutral
    case 4: return '😊'; // Happy
    case 5: return '🤩'; // Excited
    default: return '❓'; // Unknown
  }
};

const RideHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRide, setSelectedRide] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [ratingRides, setRatingRides] = useState(new Set()); // Track which rides are being rated

  useEffect(() => {
    fetchRides();
  }, []);

  useEffect(() => {
    filterRides();
  }, [rides, searchTerm, statusFilter]);

  const fetchRides = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rides/my-rides`);
      const rides = response.data || [];
      
      // Sort rides by date (newest first) - default sorting
      const sortedRides = rides.sort((a, b) => {
        const dateA = new Date(b.completed_at || b.created_at || b.accepted_at || b.requested_at);
        const dateB = new Date(a.completed_at || a.created_at || a.accepted_at || a.requested_at);
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

  const startRating = (ride) => {
    setRatingRides(prev => new Set([...prev, ride.id]));
  };

  const stopRating = (rideId) => {
    setRatingRides(prev => {
      const newSet = new Set(prev);
      newSet.delete(rideId);
      return newSet;
    });
  };

  const openDetailsModal = (ride) => {
    setSelectedRide(ride);
    setShowDetailsModal(true);
  };

  const canRateRide = (ride) => {
    return ride.status === 'completed' && user.role === 'rider';
  };

  const handleBookAgain = (ride) => {
    // Prepare the location data to pass to the booking page
    const bookingData = {
      pickup: {
        address: ride.pickup_location?.address || ride.pickup_address || '',
        latitude: ride.pickup_location?.latitude || 0,
        longitude: ride.pickup_location?.longitude || 0
      },
      dropoff: {
        address: ride.dropoff_location?.address || ride.dropoff_address || '',
        latitude: ride.dropoff_location?.latitude || 0,
        longitude: ride.dropoff_location?.longitude || 0
      },
      vehicle_type: ride.vehicle_type || 'economy',
      passenger_count: ride.passenger_count || 1,
      special_requirements: ride.special_requirements || ''
    };

    // Store the booking data in sessionStorage for the booking page to use
    sessionStorage.setItem('bookAgainData', JSON.stringify(bookingData));
    
    // Navigate to the booking page
    navigate('/book-ride');
    
    toast.success('Previous ride details loaded! You can modify any details before booking.');
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

                        {/* Additional Ride Information */}
                        <div className="flex-1 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            {/* Driver Information */}
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-500">Driver</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {ride.driver_name || 'Unknown Driver'}
                                </p>
                              </div>
                            </div>

                            {/* Vehicle Type */}
                            <div className="flex items-center space-x-2">
                              <Car className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-500">Vehicle</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {ride.vehicle_type || 'Economy'}
                                </p>
                              </div>
                            </div>

                            {/* Passenger Count */}
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-500">Passengers</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {ride.passenger_count || 1} passenger{(ride.passenger_count || 1) > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>

                            {/* Rating Display */}
                            {ride.rating && (
                              <div className="flex items-center space-x-2">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <div>
                                  <p className="text-xs text-gray-500">Your Rating</p>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-lg">
                                      {getRatingEmoji(ride.rating)}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {ride.rating}/5
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Special Requirements */}
                            {ride.special_requirements && (
                              <div className="flex items-start space-x-2 md:col-span-2">
                                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-500">Special Requirements</p>
                                  <p className="text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                    {ride.special_requirements}
                                  </p>
                                </div>
                              </div>
                            )}
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
                            
                            {canRateRide(ride) && !ratingRides.has(ride.id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startRating(ride)}
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
                                onClick={() => handleBookAgain(ride)}
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
                  
                  {/* Inline Rating System */}
                  {canRateRide(ride) && ratingRides.has(ride.id) && (
                    <InlineRating 
                      ride={ride} 
                      onRatingSubmit={(ratingData) => {
                        handleRateRide(ride.id, ratingData);
                        stopRating(ride.id);
                      }}
                    />
                  )}
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


        {/* Details Modal */}
        <RideDetailsModal
          ride={selectedRide}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRide(null);
          }}
        />

      </div>
    </div>
  );
};

export default RideHistory;