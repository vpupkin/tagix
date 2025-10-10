import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Target,
  Clock,
  Map
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DriverLocationManager = ({ onLocationUpdate, onPreferencesUpdate }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    radius_km: 25,
    auto_accept: false,
    notifications_enabled: true,
    current_location: null,
    is_online: false
  });
  
  const [locationInput, setLocationInput] = useState('');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const radiusTimeoutRef = useRef(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (radiusTimeoutRef.current) {
        clearTimeout(radiusTimeoutRef.current);
      }
    };
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/driver/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('🔍 Fetched preferences:', response.data);
      
      // Ensure radius_km is within valid range
      const preferences = response.data;
      if (preferences.radius_km && (preferences.radius_km < 5 || preferences.radius_km > 100)) {
        console.warn('⚠️ Invalid radius_km detected, resetting to default:', preferences.radius_km);
        preferences.radius_km = 25; // Reset to default
      }
      
      setPreferences(preferences);
      if (preferences.current_location?.address) {
        setLocationInput(preferences.current_location.address);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load driver preferences');
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (!locationInput.trim()) {
      toast.error('Please enter a location');
      return;
    }

    try {
      setIsUpdatingLocation(true);
      
      // For now, we'll use a simple geocoding approach
      // In a real app, you'd use Google Maps Geocoding API
      const locationData = {
        location: {
          latitude: 48.7758, // Default to Stuttgart for demo
          longitude: 9.1829,
          address: locationInput.trim()
        }
      };

      const response = await axios.post(`${API_URL}/api/location/update`, locationData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        toast.success('Location updated successfully');
        setPreferences(prev => ({
          ...prev,
          current_location: locationData.location
        }));
        onLocationUpdate?.(locationData.location);
      }
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/driver/preferences`, newPreferences, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        setPreferences(prev => ({ ...prev, ...newPreferences }));
        toast.success('Preferences updated successfully');
        onPreferencesUpdate?.(newPreferences);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update preferences';
      toast.error(errorMessage);
      
      // Revert local state on error
      if (newPreferences.radius_km) {
        setPreferences(prev => ({ ...prev, radius_km: prev.radius_km }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (value) => {
    const radius = value[0];
    console.log('🔍 Radius change requested:', radius, 'Current:', preferences.radius_km);
    
    // Validate radius before updating
    if (radius < 5 || radius > 100) {
      console.warn('⚠️ Invalid radius value:', radius);
      return;
    }
    
    // Update local state immediately for responsive UI
    setPreferences(prev => ({ ...prev, radius_km: radius }));
    
    // Debounce the API call to avoid too many requests
    if (radiusTimeoutRef.current) {
      clearTimeout(radiusTimeoutRef.current);
    }
    
    radiusTimeoutRef.current = setTimeout(() => {
      console.log('🔍 Sending radius update to API:', radius);
      updatePreferences({ radius_km: radius });
    }, 500); // Wait 500ms after user stops moving slider
  };

  const handleAutoAcceptChange = (checked) => {
    updatePreferences({ auto_accept: checked });
  };

  const handleNotificationsChange = (checked) => {
    updatePreferences({ notifications_enabled: checked });
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding would be done here in a real app
          const locationData = {
            location: {
              latitude,
              longitude,
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            }
          };

          const response = await axios.post(`${API_URL}/api/location/update`, locationData, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.status === 200) {
            toast.success('Current location updated');
            setPreferences(prev => ({
              ...prev,
              current_location: locationData.location
            }));
            setLocationInput(locationData.location.address);
            onLocationUpdate?.(locationData.location);
          }
        } catch (error) {
          console.error('Error updating location:', error);
          toast.error('Failed to update location');
        } finally {
          setIsUpdatingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get current location');
        setIsUpdatingLocation(false);
      }
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location & Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location & Preferences
        </CardTitle>
        <CardDescription>
          Manage your location and ride matching preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Location Display */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Current Location</Label>
          {preferences.current_location ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  {preferences.current_location.address}
                </p>
                <p className="text-xs text-green-600">
                  {preferences.current_location.latitude.toFixed(4)}, {preferences.current_location.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">No location set</p>
            </div>
          )}
        </div>

        {/* Location Update */}
        <div className="space-y-3">
          <Label htmlFor="location-input">Update Location</Label>
          <div className="flex gap-2">
            <Input
              id="location-input"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Enter address or location"
              className="flex-1"
            />
            <Button
              onClick={updateLocation}
              disabled={isUpdatingLocation}
              size="sm"
              variant="outline"
            >
              {isUpdatingLocation ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={getCurrentLocation}
              disabled={isUpdatingLocation}
              size="sm"
              variant="outline"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Radius Setting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Ride Matching Radius</Label>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {preferences.radius_km} km
            </Badge>
          </div>
          <div className="space-y-2">
            <Slider
              value={[preferences.radius_km]}
              onValueChange={handleRadiusChange}
              max={100}
              min={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>5 km</span>
              <span>100 km</span>
            </div>
            {/* Quick preset buttons */}
            <div className="flex gap-2 mt-2">
              {[10, 25, 50, 75, 100].map((preset) => (
                <Button
                  key={preset}
                  variant={preferences.radius_km === preset ? "default" : "outline"}
                  size="sm"
                  className="text-xs px-2 py-1 h-6"
                  onClick={() => handleRadiusChange([preset])}
                >
                  {preset}km
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Only rides within this radius will be shown as available
          </p>
        </div>

        {/* Additional Preferences */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Auto Accept Rides</Label>
              <p className="text-xs text-gray-600">
                Automatically accept rides within your radius
              </p>
            </div>
            <Switch
              checked={preferences.auto_accept}
              onCheckedChange={handleAutoAcceptChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Notifications</Label>
              <p className="text-xs text-gray-600">
                Receive notifications for new ride requests
              </p>
            </div>
            <Switch
              checked={preferences.notifications_enabled}
              onCheckedChange={handleNotificationsChange}
            />
          </div>
        </div>

        {/* Status Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                preferences.is_online ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span className={preferences.is_online ? 'text-green-600' : 'text-gray-600'}>
                {preferences.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverLocationManager;
