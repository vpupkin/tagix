import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MockRideBooking = () => {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    pickup: '',
    dropoff: '',
    vehicleType: 'standard'
  });
  const [loading, setLoading] = useState(false);

  const mockLocations = [
    { name: 'Downtown Plaza', lat: 40.7128, lng: -74.0060 },
    { name: 'Central Park', lat: 40.7829, lng: -73.9654 },
    { name: 'Times Square', lat: 40.7580, lng: -73.9855 },
    { name: 'Brooklyn Bridge', lat: 40.7061, lng: -73.9969 },
    { name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445 },
    { name: 'Empire State Building', lat: 40.7484, lng: -73.9857 },
    { name: 'JFK Airport', lat: 40.6413, lng: -73.7781 },
    { name: 'LaGuardia Airport', lat: 40.7769, lng: -73.8740 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.pickup || !formData.dropoff) {
      toast.error('Please select both pickup and dropoff locations');
      return;
    }

    if (formData.pickup === formData.dropoff) {
      toast.error('Pickup and dropoff locations must be different');
      return;
    }

    setLoading(true);

    try {
      const pickupLocation = mockLocations.find(loc => loc.name === formData.pickup);
      const dropoffLocation = mockLocations.find(loc => loc.name === formData.dropoff);

      const requestData = {
        pickup_location: {
          latitude: pickupLocation.lat,
          longitude: pickupLocation.lng,
          address: pickupLocation.name
        },
        dropoff_location: {
          latitude: dropoffLocation.lat,
          longitude: dropoffLocation.lng,
          address: dropoffLocation.name
        },
        vehicle_type: formData.vehicleType,
        passenger_count: 1
      };

      const response = await axios.post(`${API_URL}/api/rides/request`, requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success(`Ride requested! Estimated fare: $${response.data.estimated_fare}`);
      
      // Reset form
      setFormData({
        pickup: '',
        dropoff: '',
        vehicleType: 'standard'
      });

    } catch (error) {
      console.error('Error requesting ride:', error);
      toast.error(error.response?.data?.detail || 'Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Please log in to book a ride</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">Book Your Ride</h2>
      
      {/* Mock Map Display */}
      <div className="mb-6 h-64 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-2">🗺️</div>
          <p className="text-gray-600">Mock Map View</p>
          <p className="text-sm text-gray-500">
            {formData.pickup && formData.dropoff ? 
              `Route: ${formData.pickup} → ${formData.dropoff}` : 
              'Select pickup and dropoff locations'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pickup Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Pickup Location
          </label>
          <select
            value={formData.pickup}
            onChange={(e) => setFormData({...formData, pickup: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            <option value="">Select pickup location...</option>
            {mockLocations.map((location) => (
              <option key={location.name} value={location.name}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropoff Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🎯 Dropoff Location
          </label>
          <select
            value={formData.dropoff}
            onChange={(e) => setFormData({...formData, dropoff: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            <option value="">Select dropoff location...</option>
            {mockLocations.map((location) => (
              <option key={location.name} value={location.name}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🚗 Vehicle Type
          </label>
          <select
            value={formData.vehicleType}
            onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="economy">🚙 Economy ($)</option>
            <option value="comfort">🚗 Comfort ($$)</option>
            <option value="premium">🚘 Premium ($$$)</option>
            <option value="suv">🚐 SUV ($$$$)</option>
          </select>
        </div>

        {/* Estimated Fare Display */}
        {formData.pickup && formData.dropoff && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Trip Estimate</h3>
            <p className="text-blue-700">Distance: ~5-15 miles</p>
            <p className="text-blue-700">Duration: ~10-30 minutes</p>
            <p className="text-blue-700 font-bold">
              Estimated Fare: $
              {formData.vehicleType === 'economy' ? '12-18' :
               formData.vehicleType === 'standard' ? '15-25' :
               formData.vehicleType === 'premium' ? '20-35' : '30-50'}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !formData.pickup || !formData.dropoff}
          className="w-full bg-purple-600 text-white p-4 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Requesting Ride...
            </span>
          ) : (
            '🚗 Request Ride'
          )}
        </button>
      </form>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">📝 Development Mode</h4>
        <p className="text-sm text-yellow-700">
          This is a mock interface for testing. In production, this would use real Google Maps integration for address autocomplete and route visualization.
        </p>
      </div>
    </div>
  );
};

export default MockRideBooking;