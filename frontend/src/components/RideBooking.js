import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APIProvider, Map, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  DollarSign, 
  Car, 
  Users,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AddressAutocomplete = ({ onPlaceSelect, placeholder, value, testId }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const placesLibrary = useMapsLibrary('places');
  const autocompleteService = React.useRef(null);
  const placesService = React.useRef(null);

  React.useEffect(() => {
    if (!placesLibrary) return;
    
    try {
      autocompleteService.current = new placesLibrary.AutocompleteService();
      placesService.current = new placesLibrary.PlacesService(
        document.createElement('div')
      );
    } catch (error) {
      console.warn('Google Maps Places service not available:', error);
      // Fallback: disable autocomplete features gracefully
    }
  }, [placesLibrary]);

  const fetchSuggestions = useCallback(async (input) => {
    if (!autocompleteService.current || input.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const request = {
        input,
        types: ['establishment', 'geocode']
        // Removed country restriction to allow global search
      };

      autocompleteService.current.getPlacePredictions(
        request,
        (predictions, status) => {
          setIsLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
          } else {
            console.warn('Google Places API error:', status);
            setSuggestions([]);
          }
        }
      );
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setIsLoading(false);
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    fetchSuggestions(value);
  };

  const handleManualAddressSubmit = () => {
    if (!inputValue.trim()) return;
    
    // Try to parse as coordinates first (lat, lng format)
    const coordMatch = inputValue.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const placeData = {
          placeId: `manual_${Date.now()}`,
          name: `Location (${lat}, ${lng})`,
          address: inputValue,
          location: { latitude: lat, longitude: lng }
        };
        onPlaceSelect && onPlaceSelect(placeData);
        return;
      }
    }
    
    // If not coordinates, treat as address and use geocoding
    // For now, we'll create a placeholder location
    const placeData = {
      placeId: `manual_${Date.now()}`,
      name: inputValue,
      address: inputValue,
      location: { 
        latitude: 37.7749, // Default to San Francisco
        longitude: -122.4194 
      }
    };
    onPlaceSelect && onPlaceSelect(placeData);
  };

  const handleSuggestionClick = async (suggestion) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    
    if (!placesService.current) return;

    const request = {
      placeId: suggestion.place_id,
      fields: ['place_id', 'geometry', 'name', 'formatted_address']
    };

    placesService.current.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const placeData = {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address,
          location: {
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng()
          }
        };
        onPlaceSelect && onPlaceSelect(placeData);
      }
    });
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full"
        data-testid={testId}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
            >
              <div className="font-medium text-gray-900">
                {suggestion.structured_formatting.main_text}
              </div>
              <div className="text-sm text-gray-600">
                {suggestion.structured_formatting.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Fallback message when Google Maps API is not available */}
      {!placesLibrary && inputValue.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm text-yellow-800 mb-2">
            <strong>Google Maps API not configured.</strong> You can:
          </div>
          <div className="text-xs text-yellow-700 mb-2">
            • Enter coordinates: <code>48.6670336, 9.7910784</code>
          </div>
          <div className="text-xs text-yellow-700 mb-2">
            • Enter full address: <code>Stuttgart Central Station, Germany</code>
          </div>
          <button
            onClick={handleManualAddressSubmit}
            className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
          >
            Use This Address
          </button>
        </div>
      )}
    </div>
  );
};

const RideBooking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState('economy');
  const [passengerCount, setPassengerCount] = useState(1);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [rideRequestId, setRideRequestId] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('form'); // form, booking, confirmed, error

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Could not get user location:', error);
        }
      );
    }
  }, []);

  // Calculate fare when locations change
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      calculateFare();
    }
  }, [pickupLocation, dropoffLocation, selectedVehicleType]);

  const calculateFare = () => {
    if (!pickupLocation || !dropoffLocation) return;

    // Simple distance calculation (in a real app, you'd use Google's Distance Matrix API)
    const distance = getDistanceFromLatLonInKm(
      pickupLocation.location.latitude,
      pickupLocation.location.longitude,
      dropoffLocation.location.latitude,
      dropoffLocation.location.longitude
    );

    const baseFare = 3.00;
    const ratePerKm = {
      economy: 1.50,
      comfort: 2.00,
      premium: 3.00,
      suv: 2.50
    };

    const fare = baseFare + (distance * ratePerKm[selectedVehicleType]);
    setEstimatedFare(fare);
  };

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const handlePickupSelect = (place) => {
    setPickupLocation(place);
    setMapCenter({
      lat: place.location.latitude,
      lng: place.location.longitude
    });
  };

  const handleDropoffSelect = (place) => {
    setDropoffLocation(place);
  };

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation) {
      toast.error('Please select both pickup and dropoff locations');
      return;
    }

    setLoading(true);
    setBookingStatus('booking');

    try {
      const rideData = {
        pickup_location: {
          latitude: pickupLocation.location.latitude,
          longitude: pickupLocation.location.longitude,
          address: pickupLocation.address
        },
        dropoff_location: {
          latitude: dropoffLocation.location.latitude,
          longitude: dropoffLocation.location.longitude,
          address: dropoffLocation.address
        },
        vehicle_type: selectedVehicleType,
        passenger_count: passengerCount,
        special_requirements: specialRequirements || null
      };

      const response = await axios.post(`${API_URL}/api/rides/request`, rideData);
      
      setRideRequestId(response.data.request_id);
      setAvailableDrivers(response.data.matches_found || 0);
      setBookingStatus('confirmed');
      
      toast.success('Ride request submitted successfully!');
      
      // Redirect to rides page after a short delay
      setTimeout(() => {
        navigate('/rides');
      }, 3000);
      
    } catch (error) {
      console.error('Error booking ride:', error);
      setBookingStatus('error');
      toast.error(error.response?.data?.detail || 'Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypes = [
    {
      id: 'economy',
      name: 'Economy',
      description: 'Affordable rides',
      icon: '🚗',
      multiplier: 1.0
    },
    {
      id: 'comfort',
      name: 'Comfort',
      description: 'Extra legroom',
      icon: '🚙',
      multiplier: 1.3
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Luxury vehicles',
      icon: '🚗',
      multiplier: 2.0
    },
    {
      id: 'suv',
      name: 'SUV',
      description: 'Extra space',
      icon: '🚐',
      multiplier: 1.7
    }
  ];

  const getVehicleTypeInfo = (type) => {
    return vehicleTypes.find(v => v.id === type) || vehicleTypes[0];
  };

  if (bookingStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-md mx-auto px-4">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ride Requested!</h2>
              <p className="text-gray-600 mb-4">
                We're finding the best driver for you.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Request ID</p>
                <p className="font-mono text-sm">{rideRequestId}</p>
              </div>
              <p className="text-sm text-gray-500">
                {availableDrivers} drivers found nearby
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Redirecting to your rides...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (bookingStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-md mx-auto px-4">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Failed</h2>
              <p className="text-gray-600 mb-4">
                We couldn't process your ride request. Please try again.
              </p>
              <Button 
                onClick={() => setBookingStatus('form')}
                className="btn-primary"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="ride-booking">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book a Ride</h1>
          <p className="text-gray-600 mt-1">Where would you like to go?</p>
          
          {/* Google Maps API Status */}
          {!process.env.REACT_APP_GOOGLE_MAPS_API_KEY && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">ℹ</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Google Maps Integration</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    To enable real-time address search and autocomplete, configure your Google Maps API key in the <code>.env</code> file.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    <strong>Current mode:</strong> Manual address entry (coordinates or full addresses)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Location Selection */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  <span>Where to?</span>
                </CardTitle>
                <CardDescription>
                  Set your pickup and destination locations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Location</Label>
                  <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                    <AddressAutocomplete
                      onPlaceSelect={handlePickupSelect}
                      placeholder="Enter pickup location"
                      value={pickupLocation?.address || ''}
                      testId="pickup-input"
                    />
                  </APIProvider>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dropoff">Destination</Label>
                  <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                    <AddressAutocomplete
                      onPlaceSelect={handleDropoffSelect}
                      placeholder="Where are you going?"
                      value={dropoffLocation?.address || ''}
                      testId="destination-input"
                    />
                  </APIProvider>
                </div>

                {pickupLocation && dropoffLocation && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Navigation className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-900">
                        Route Selected
                      </span>
                    </div>
                    <Badge variant="secondary">
                      ~{getDistanceFromLatLonInKm(
                        pickupLocation.location.latitude,
                        pickupLocation.location.longitude,
                        dropoffLocation.location.latitude,
                        dropoffLocation.location.longitude
                      ).toFixed(1)} km
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Selection */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Car className="h-5 w-5 text-indigo-600" />
                  <span>Choose Vehicle</span>
                </CardTitle>
                <CardDescription>
                  Select your preferred ride type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vehicleTypes.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      onClick={() => setSelectedVehicleType(vehicle.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedVehicleType === vehicle.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`vehicle-${vehicle.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{vehicle.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{vehicle.name}</p>
                          <p className="text-sm text-gray-600">{vehicle.description}</p>
                        </div>
                        {pickupLocation && dropoffLocation && (
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              ${(estimatedFare * vehicle.multiplier).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Options */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <span>Trip Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passengers">Number of Passengers</Label>
                  <Select value={passengerCount.toString()} onValueChange={(value) => setPassengerCount(parseInt(value))}>
                    <SelectTrigger data-testid="passenger-count">
                      <SelectValue placeholder="Select passengers" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((count) => (
                        <SelectItem key={count} value={count.toString()}>
                          {count} passenger{count > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Special Requirements (Optional)</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Any special requests or requirements..."
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    rows={3}
                    data-testid="special-requirements"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            {pickupLocation && dropoffLocation && (
              <Card className="card-hover bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-indigo-900">Trip Summary</span>
                    <Badge className="bg-indigo-100 text-indigo-800">
                      {getVehicleTypeInfo(selectedVehicleType).name}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="w-px h-6 bg-gray-300"></div>
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Pickup</p>
                        <p className="text-sm text-gray-600">{pickupLocation.address}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Destination</p>
                        <p className="text-sm text-gray-600">{dropoffLocation.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Estimated Fare</span>
                    </div>
                    <span className="text-lg font-bold text-indigo-900">
                      ${(estimatedFare * getVehicleTypeInfo(selectedVehicleType).multiplier).toFixed(2)}
                    </span>
                  </div>

                  <Button
                    onClick={handleBookRide}
                    disabled={loading || !pickupLocation || !dropoffLocation}
                    className="w-full btn-primary mt-4"
                    data-testid="book-ride-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Booking...
                      </>
                    ) : (
                      <>
                        Book Ride
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Navigation className="h-5 w-5 text-indigo-600" />
                  <span>Route Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="map-container-large">
                  <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                    <Map
                      defaultCenter={mapCenter}
                      center={mapCenter}
                      defaultZoom={12}
                      gestureHandling="greedy"
                      disableDefaultUI={false}
                    >
                      {pickupLocation && (
                        <AdvancedMarker position={{
                          lat: pickupLocation.location.latitude,
                          lng: pickupLocation.location.longitude
                        }}>
                          <div className="custom-marker bg-green-500 text-white font-bold">
                            P
                          </div>
                        </AdvancedMarker>
                      )}
                      
                      {dropoffLocation && (
                        <AdvancedMarker position={{
                          lat: dropoffLocation.location.latitude,
                          lng: dropoffLocation.location.longitude
                        }}>
                          <div className="custom-marker bg-red-500 text-white font-bold">
                            D
                          </div>
                        </AdvancedMarker>
                      )}
                    </Map>
                  </APIProvider>
                </div>
              </CardContent>
            </Card>

            {/* Trip Info */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <span>Trip Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Estimated Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {pickupLocation && dropoffLocation 
                        ? `${Math.ceil(getDistanceFromLatLonInKm(
                            pickupLocation.location.latitude,
                            pickupLocation.location.longitude,
                            dropoffLocation.location.latitude,
                            dropoffLocation.location.longitude
                          ) * 2)} min`
                        : '--'
                      }
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Distance</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {pickupLocation && dropoffLocation 
                        ? `${getDistanceFromLatLonInKm(
                            pickupLocation.location.latitude,
                            pickupLocation.location.longitude,
                            dropoffLocation.location.latitude,
                            dropoffLocation.location.longitude
                          ).toFixed(1)} km`
                        : '--'
                      }
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Car className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">Ready to go?</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Select your locations and vehicle type to book your ride.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideBooking;