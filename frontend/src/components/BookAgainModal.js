import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RotateCcw, MapPin, Users, Car, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BookAgainModal = ({ 
  isOpen, 
  onClose, 
  previousRide,
  onBookRide 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pickup_address: '',
    dropoff_address: '',
    vehicle_type: 'economy',
    passenger_count: 1,
    special_requirements: ''
  });

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && previousRide) {
      setFormData({
        pickup_address: previousRide.pickup_location?.address || previousRide.pickup_address || '',
        dropoff_address: previousRide.dropoff_location?.address || previousRide.dropoff_address || '',
        vehicle_type: previousRide.vehicle_type || 'economy',
        passenger_count: previousRide.passenger_count || 1,
        special_requirements: previousRide.special_requirements || ''
      });
    }
  }, [isOpen, previousRide]);

  const vehicleTypes = [
    { id: 'economy', name: 'Economy', description: 'Affordable rides for everyday trips' },
    { id: 'standard', name: 'Standard', description: 'Comfortable rides with standard vehicles' },
    { id: 'premium', name: 'Premium', description: 'Luxury vehicles for special occasions' },
    { id: 'xl', name: 'XL', description: 'Larger vehicles for groups up to 6 passengers' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBookAgain = async () => {
    if (!formData.pickup_address || !formData.dropoff_address) {
      toast.error('Please enter both pickup and dropoff locations');
      return;
    }

    if (formData.pickup_address === formData.dropoff_address) {
      toast.error('Pickup and dropoff locations must be different');
      return;
    }

    setLoading(true);

    try {
      // Create ride data with the form data
      const rideData = {
        pickup_location: {
          latitude: previousRide.pickup_location?.latitude || 0,
          longitude: previousRide.pickup_location?.longitude || 0,
          address: formData.pickup_address
        },
        dropoff_location: {
          latitude: previousRide.dropoff_location?.latitude || 0,
          longitude: previousRide.dropoff_location?.longitude || 0,
          address: formData.dropoff_address
        },
        vehicle_type: formData.vehicle_type,
        passenger_count: formData.passenger_count,
        special_requirements: formData.special_requirements || null
      };

      // Call the onBookRide callback with the ride data
      await onBookRide(rideData);
      
      // Close the modal
      onClose();
      
    } catch (error) {
      console.error('Error booking ride:', error);
      toast.error('Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  if (!previousRide) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-indigo-600" />
            Book Again
          </DialogTitle>
          <DialogDescription>
            Rebook your previous ride with the same route. You can modify the details before confirming.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Route Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Route
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pickup">Pickup Location</Label>
                <Input
                  id="pickup"
                  value={formData.pickup_address}
                  onChange={(e) => handleInputChange('pickup_address', e.target.value)}
                  placeholder="Enter pickup location"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dropoff">Destination</Label>
                <Input
                  id="dropoff"
                  value={formData.dropoff_address}
                  onChange={(e) => handleInputChange('dropoff_address', e.target.value)}
                  placeholder="Enter destination"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ride Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Car className="h-4 w-4" />
                Ride Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vehicle-type">Vehicle Type</Label>
                <Select 
                  value={formData.vehicle_type} 
                  onValueChange={(value) => handleInputChange('vehicle_type', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="passengers">Number of Passengers</Label>
                <Select 
                  value={formData.passenger_count.toString()} 
                  onValueChange={(value) => handleInputChange('passenger_count', parseInt(value))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select passenger count" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {count} {count === 1 ? 'Passenger' : 'Passengers'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Special Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Special Requirements (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.special_requirements}
                onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                placeholder="Any special requirements or notes for your ride..."
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBookAgain}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Booking...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Book Again
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookAgainModal;
