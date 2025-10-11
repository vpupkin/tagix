import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RotateCcw, MapPin, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const BookAgainModal = ({ 
  isOpen, 
  onClose, 
  previousRide
}) => {
  const navigate = useNavigate();

  const handleBookAgain = () => {
    if (!previousRide) return;

    // Prepare the location data to pass to the booking page
    const bookingData = {
      pickup: {
        address: previousRide.pickup_location?.address || previousRide.pickup_address || '',
        latitude: previousRide.pickup_location?.latitude || 0,
        longitude: previousRide.pickup_location?.longitude || 0
      },
      dropoff: {
        address: previousRide.dropoff_location?.address || previousRide.dropoff_address || '',
        latitude: previousRide.dropoff_location?.latitude || 0,
        longitude: previousRide.dropoff_location?.longitude || 0
      },
      vehicle_type: previousRide.vehicle_type || 'economy',
      passenger_count: previousRide.passenger_count || 1,
      special_requirements: previousRide.special_requirements || ''
    };

    // Store the booking data in sessionStorage for the booking page to use
    sessionStorage.setItem('bookAgainData', JSON.stringify(bookingData));
    
    // Close the modal
    onClose();
    
    // Navigate to the booking page
    navigate('/book-ride');
    
    toast.success('Redirecting to booking page with your previous route...');
  };

  if (!previousRide) return null;

  const pickupAddress = previousRide.pickup_location?.address || previousRide.pickup_address || 'Pickup Location';
  const dropoffAddress = previousRide.dropoff_location?.address || previousRide.dropoff_address || 'Destination';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-indigo-600" />
            Book Again
          </DialogTitle>
          <DialogDescription>
            Use the same route from your previous ride. You can modify any details on the booking page.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Route Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Previous Route</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-900">{pickupAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-900">{dropoffAddress}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            This will take you to the booking page where you can modify vehicle type, passenger count, and other options.
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBookAgain}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookAgainModal;