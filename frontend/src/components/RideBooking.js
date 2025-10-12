import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APIProvider, Map, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps';

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Route Renderer Component
const RouteRenderer = ({ origin, destination }) => {
  const mapsLibrary = useMapsLibrary('routes');
  const [route, setRoute] = useState(null);

  useEffect(() => {
    if (!mapsLibrary || !origin || !destination) return;

    const directionsService = new mapsLibrary.DirectionsService();
    const directionsRenderer = new mapsLibrary.DirectionsRenderer({
      suppressMarkers: true, // We're using our own markers
      polylineOptions: {
        strokeColor: '#3B82F6',
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });

    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: mapsLibrary.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK' && result) {
        setRoute(result);
        directionsRenderer.setDirections(result);
      }
    });

    return () => {
      if (directionsRenderer) {
        directionsRenderer.setMap(null);
      }
    };
  }, [mapsLibrary, origin, destination]);

  return null; // This component doesn't render anything visible
};
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

// Simple input component for when Google Maps is not available
const SimpleAddressInput = ({ onPlaceSelect, placeholder, value, testId }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [showCoordinateInput, setShowCoordinateInput] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const parseCoordinates = (input) => {
    // Try to parse coordinates in various formats
    const coordPatterns = [
      /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/, // "48.6670336, 9.7910784"
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/, // "48.6670336 9.7910784"
      /lat[:\s]*(-?\d+\.?\d*)[,\s]*lng[:\s]*(-?\d+\.?\d*)/i, // "lat: 48.6670336, lng: 9.7910784"
    ];

    for (const pattern of coordPatterns) {
      const match = input.match(pattern);
      if (match) {
        const latitude = parseFloat(match[1]);
        const longitude = parseFloat(match[2]);
        if (!isNaN(latitude) && !isNaN(longitude) && 
            latitude >= -90 && latitude <= 90 && 
            longitude >= -180 && longitude <= 180) {
          return { latitude, longitude };
        }
      }
    }
    return null;
  };

  const handleSubmit = () => {
    // Allow submission if we have input value OR if we're in coordinate mode with valid coordinates
    if (inputValue.trim() || (showCoordinateInput && lat && lng)) {
      let latitude, longitude;
      let displayAddress = inputValue || `Location (${lat}, ${lng})`;
      
      // Try to parse coordinates from input
      const coords = parseCoordinates(inputValue);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
        displayAddress = inputValue;
      } else if (showCoordinateInput && lat && lng) {
        // Use manually entered coordinates
        latitude = parseFloat(lat);
        longitude = parseFloat(lng);
        displayAddress = `Location (${lat}, ${lng})`;
      } else {
        // Use default test coordinates (Stuttgart, Germany)
        latitude = 48.7758;
        longitude = 9.1829;
        displayAddress = inputValue || 'Stuttgart, Germany (Default)';
      }

      // Create a place object for manual entry
      const placeData = {
        formatted_address: displayAddress,
        geometry: {
          location: {
            lat: () => latitude,
            lng: () => longitude
          }
        },
        name: displayAddress,
        place_id: `manual_${Date.now()}`,
        // Add address property for compatibility with handleBookRide
        address: displayAddress,
        // Add location object for backend compatibility
        location: {
          latitude: latitude,
          longitude: longitude,
          address: displayAddress
        }
      };
      
      if (onPlaceSelect) {
        onPlaceSelect(placeData);
        // Clear the input after successful selection
        setInputValue('');
        setShowCoordinateInput(false);
        setLat('');
        setLng('');
      }
    }
  };

  
  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        data-testid={testId}
      />
      {inputValue.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm text-yellow-800 mb-2">
            <strong>Manual Entry Mode</strong> - Test environment without Google Maps
          </div>
          <div className="text-xs text-yellow-700 mb-2">
            <strong>Option 1:</strong> Enter coordinates: <code>48.6670336, 9.7910784</code><br/>
            <strong>Option 2:</strong> Enter address: <code>Stuttgart, Germany</code><br/>
            <strong>Option 3:</strong> Use default test location (Stuttgart)
          </div>
          
          {!showCoordinateInput && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={handleSubmit}
                className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
              >
                Use This Location
              </button>
              <button
                onClick={() => setShowCoordinateInput(true)}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Enter Coordinates
              </button>
            </div>
          )}
          
          {showCoordinateInput && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Use Coordinates
                </button>
                <button
                  onClick={() => setShowCoordinateInput(false)}
                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Google Maps enabled component with new API
const GoogleMapsAddressAutocomplete = ({ onPlaceSelect, placeholder, value, testId }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  
  const placesLibrary = useMapsLibrary('places');
  const autocompleteService = React.useRef(null);
  const placesService = React.useRef(null);

  // Set up global error handler for Google Maps API
  React.useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('Google Maps API authentication failed');
      setApiError('Google Maps API authentication failed. Please check your API key configuration.');
    };
    
    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  React.useEffect(() => {
    if (!placesLibrary) {
      console.log('❌ placesLibrary not loaded yet');
      return;
    }
    
    console.log('🔍 placesLibrary loaded:', placesLibrary);
    console.log('🔍 Available services:', Object.keys(placesLibrary));
    
    try {
      // Always use the legacy API for now as it's more reliable
      if (placesLibrary.AutocompleteService) {
        console.log('✅ Initializing AutocompleteService');
        autocompleteService.current = new placesLibrary.AutocompleteService();
      } else {
        console.warn('❌ AutocompleteService not available in placesLibrary');
      }
      
      if (placesLibrary.PlacesService) {
        console.log('✅ Initializing PlacesService');
        placesService.current = new placesLibrary.PlacesService(
          document.createElement('div')
        );
      } else {
        console.warn('❌ PlacesService not available in placesLibrary');
      }
    } catch (error) {
      console.warn('Google Maps Places service not available:', error);
      setApiError('Google Maps Places service not available');
    }
  }, [placesLibrary]);

  const fetchSuggestions = useCallback(async (input) => {
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }

    // If API error, don't try to fetch suggestions
    if (apiError) {
      setSuggestions([]);
      return;
    }

    // Add a small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setIsLoading(true);
    
    try {
      // Use the legacy API that actually works
      if (autocompleteService.current) {
        const request = {
          input,
          types: ['establishment', 'geocode']
        };

        autocompleteService.current.getPlacePredictions(
          request,
          (predictions, status) => {
            setIsLoading(false);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              console.log('✅ Got autocomplete suggestions:', predictions.length);
              setSuggestions(predictions);
            } else {
              console.warn('Google Places API error:', status);
              // Show manual entry option when API fails
              setSuggestions([{
                description: `${input} (Manual Entry)`,
                place_id: `manual_${Date.now()}`,
                structured_formatting: {
                  main_text: input,
                  secondary_text: 'Manual Entry - Click to use this location'
                }
              }]);
            }
          }
        );
      } else {
        console.warn('AutocompleteService not available');
        // No API available, show manual entry
        setSuggestions([{
          description: `${input} (Manual Entry)`,
          place_id: `manual_${Date.now()}`,
          structured_formatting: {
            main_text: input,
            secondary_text: 'Manual Entry - Click to use this location'
          }
        }]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setIsLoading(false);
      setSuggestions([]);
    }
  }, [apiError, placesLibrary]);

  // Debounced input handler to prevent too many API calls
  const debouncedFetchSuggestions = useCallback(
    debounce((value) => {
      fetchSuggestions(value);
    }, 500),
    [fetchSuggestions]
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedFetchSuggestions(value);
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

    try {
      // Use the old API that works reliably
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
    } catch (error) {
      console.error('Error getting place details:', error);
    }
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
      
      {apiError && (
        <div className="absolute z-50 w-full mt-1 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-sm text-red-800 mb-2">
            <strong>Google Maps API Error:</strong> {apiError}
          </div>
          <div className="text-xs text-red-700">
            You can still enter addresses manually. The system will use your input as the location.
          </div>
        </div>
      )}
      
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
    </div>
  );
};

// Main AddressAutocomplete component that conditionally renders the right version
const AddressAutocomplete = ({ onPlaceSelect, placeholder, value, testId }) => {
  const hasValidApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY && 
                        process.env.REACT_APP_GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key_here';
  
  if (hasValidApiKey) {
    return (
      <GoogleMapsAddressAutocomplete 
        onPlaceSelect={onPlaceSelect}
        placeholder={placeholder}
        value={value}
        testId={testId}
      />
    );
  } else {
    return (
      <SimpleAddressInput 
        onPlaceSelect={onPlaceSelect}
        placeholder={placeholder}
        value={value}
        testId={testId}
      />
    );
  }
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

  // Check for pre-filled data from "Book Again" feature
  useEffect(() => {
    const bookAgainData = sessionStorage.getItem('bookAgainData');
    if (bookAgainData) {
      try {
        const data = JSON.parse(bookAgainData);
        
        // Pre-fill the form with the previous ride data
        if (data.pickup && data.pickup.address) {
          setPickupLocation({
            address: data.pickup.address,
            location: {
              latitude: data.pickup.latitude,
              longitude: data.pickup.longitude
            }
          });
        }
        
        if (data.dropoff && data.dropoff.address) {
          setDropoffLocation({
            address: data.dropoff.address,
            location: {
              latitude: data.dropoff.latitude,
              longitude: data.dropoff.longitude
            }
          });
        }
        
        if (data.vehicle_type) {
          setSelectedVehicleType(data.vehicle_type);
        }
        
        if (data.passenger_count) {
          setPassengerCount(data.passenger_count);
        }
        
        if (data.special_requirements) {
          setSpecialRequirements(data.special_requirements);
        }
        
        // Clear the session storage after using the data
        sessionStorage.removeItem('bookAgainData');
        
        // Show a toast notification
        toast.success('Previous ride details loaded! You can modify any details before booking.');
        
      } catch (error) {
        console.error('Error parsing book again data:', error);
        sessionStorage.removeItem('bookAgainData');
      }
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
          {(!process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here') && (
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
                  <div className="mt-2 text-xs text-blue-600">
                    <strong>Test coordinates:</strong> <code>48.6670336, 9.7910784</code> (Stuttgart, Germany)
                  </div>
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
                  {process.env.REACT_APP_GOOGLE_MAPS_API_KEY && 
                   process.env.REACT_APP_GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key_here' ? (
                    <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                      <AddressAutocomplete
                        onPlaceSelect={handlePickupSelect}
                        placeholder="Enter pickup location"
                        value={pickupLocation?.address || ''}
                        testId="pickup-input"
                      />
                    </APIProvider>
                  ) : (
                    <AddressAutocomplete
                      onPlaceSelect={handlePickupSelect}
                      placeholder="Enter pickup location (coordinates: 48.6670336, 9.7910784)"
                      value={pickupLocation?.address || ''}
                      testId="pickup-input"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dropoff">Destination</Label>
                  {process.env.REACT_APP_GOOGLE_MAPS_API_KEY && 
                   process.env.REACT_APP_GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key_here' ? (
                    <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                      <AddressAutocomplete
                        onPlaceSelect={handleDropoffSelect}
                        placeholder="Where are you going?"
                        value={dropoffLocation?.address || ''}
                        testId="destination-input"
                      />
                    </APIProvider>
                  ) : (
                    <AddressAutocomplete
                      onPlaceSelect={handleDropoffSelect}
                      placeholder="Where are you going? (coordinates: 48.7758, 9.1829)"
                      value={dropoffLocation?.address || ''}
                      testId="destination-input"
                    />
                  )}
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
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span>Trip Details</span>
                  </div>
                  {/* Passenger Count Selector */}
                  <div className="flex items-center space-x-1" data-testid="passenger-count">
                    {[
                      { count: 1, icon: '👤', tooltip: '1 passenger' },
                      { count: 2, icon: '👥', tooltip: '2 passengers' },
                      { count: 3, icon: '👨‍👩‍👧', tooltip: '3 passengers' },
                      { count: 4, icon: '👨‍👩‍👧‍👦', tooltip: '4+ passengers' }
                    ].map(({ count, icon, tooltip }) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setPassengerCount(count)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all duration-200 ${
                          passengerCount === count
                            ? 'bg-indigo-600 text-white shadow-md scale-110'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                        }`}
                        title={tooltip}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="space-y-2">
                  <Label htmlFor="requirements">Special Requirements (Optional)</Label>
                  
                  {/* Emoji Picker */}
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                    <span className="text-xs text-gray-600 font-medium mb-1 w-full">Quick add:</span>
                    {[
                      { emoji: '🚗', tooltip: 'Vehicle related' },
                      { emoji: '♿', tooltip: 'Wheelchair accessible' },
                      { emoji: '👶', tooltip: 'Baby/Child seat' },
                      { emoji: '🛒', tooltip: 'Shopping/Groceries' },
                      { emoji: '🧳', tooltip: 'Luggage/Baggage' },
                      { emoji: '🐕', tooltip: 'Pet friendly' },
                      { emoji: '🚭', tooltip: 'No smoking' },
                      { emoji: '🔇', tooltip: 'Quiet ride' },
                      { emoji: '🌡️', tooltip: 'Temperature control' },
                      { emoji: '🔌', tooltip: 'Phone charging' },
                      { emoji: '💧', tooltip: 'Water needed' },
                      { emoji: '🍽️', tooltip: 'Food delivery' },
                      { emoji: '🏥', tooltip: 'Medical/Doctor' },
                      { emoji: '✈️', tooltip: 'Airport pickup' },
                      { emoji: '🎵', tooltip: 'Music preference' },
                      { emoji: '📱', tooltip: 'Phone call needed' },
                      { emoji: '⏰', tooltip: 'Time sensitive' },
                      { emoji: '🚪', tooltip: 'Door to door' },
                      { emoji: '💺', tooltip: 'Extra comfort' },
                      { emoji: '🆘', tooltip: 'Emergency/Urgent' }
                    ].map(({ emoji, tooltip }) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('requirements');
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newText = specialRequirements.substring(0, start) + emoji + specialRequirements.substring(end);
                          setSpecialRequirements(newText);
                          // Focus back to textarea and set cursor position
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + emoji.length, start + emoji.length);
                          }, 0);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all duration-200 bg-white hover:bg-gray-100 hover:scale-110 border border-gray-200 hover:border-gray-300"
                        title={tooltip}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  
                  <Textarea
                    id="requirements"
                    placeholder="Any special requests or requirements... (Click emojis above to add them)"
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
                  {process.env.REACT_APP_GOOGLE_MAPS_API_KEY && 
                   process.env.REACT_APP_GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key_here' ? (
                    <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                      <Map
                        defaultCenter={mapCenter}
                        center={mapCenter}
                        defaultZoom={12}
                        gestureHandling="greedy"
                        disableDefaultUI={false}
                        mapId="DEMO_MAP_ID"
                        onError={(error) => {
                          console.warn('Google Maps error:', error);
                        }}
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
                        
                        {/* Route visualization */}
                        {pickupLocation && dropoffLocation && (
                          <RouteRenderer 
                            origin={{
                              lat: pickupLocation.location.latitude,
                              lng: pickupLocation.location.longitude
                            }}
                            destination={{
                              lat: dropoffLocation.location.latitude,
                              lng: dropoffLocation.location.longitude
                            }}
                          />
                        )}
                      </Map>
                    </APIProvider>
                  ) : (
                    <div className="h-96 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                      <div className="text-center p-6 max-w-md">
                        <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-blue-600 text-2xl">🚗</span>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Test Mode - Manual Entry</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Google Maps API not configured. Using manual location entry for testing.
                        </p>
                        <div className="bg-white rounded-lg p-4 text-left text-xs text-gray-600 space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">Pickup:</span>
                            <span className="text-gray-800">
                              {pickupLocation ? pickupLocation.address : 'Not selected'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Dropoff:</span>
                            <span className="text-gray-800">
                              {dropoffLocation ? dropoffLocation.address : 'Not selected'}
                            </span>
                          </div>
                          {pickupLocation && dropoffLocation && (
                            <div className="flex justify-between border-t pt-2">
                              <span className="font-medium">Distance:</span>
                              <span className="text-gray-800">
                                {Math.round(getDistanceFromLatLonInKm(
                                  pickupLocation.location.latitude,
                                  pickupLocation.location.longitude,
                                  dropoffLocation.location.latitude,
                                  dropoffLocation.location.longitude
                                ) * 10) / 10} km
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 text-xs text-blue-600">
                          💡 Tip: Enter coordinates like "48.6670336, 9.7910784" for precise locations
                        </div>
                      </div>
                    </div>
                  )}
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