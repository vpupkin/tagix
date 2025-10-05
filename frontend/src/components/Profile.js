import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import GravatarAvatar from './ui/GravatarAvatar';
import { 
  User, 
  Mail, 
  Phone, 
  Star, 
  Car, 
  Shield,
  Save,
  Edit,
  Camera,
  MapPin,
  Calendar,
  Activity,
  CreditCard,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [driverProfile, setDriverProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [driverFormData, setDriverFormData] = useState({
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    license_plate: '',
    license_number: '',
    vehicle_type: 'economy'
  });

  useEffect(() => {
    if (user?.role === 'driver') {
      fetchDriverProfile();
    }
  }, [user]);

  const fetchDriverProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/driver/profile`);
      setDriverProfile(response.data);
      setDriverFormData({
        vehicle_make: response.data.vehicle_make || '',
        vehicle_model: response.data.vehicle_model || '',
        vehicle_year: response.data.vehicle_year || new Date().getFullYear(),
        license_plate: response.data.license_plate || '',
        license_number: response.data.license_number || '',
        vehicle_type: response.data.vehicle_type || 'economy'
      });
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching driver profile:', error);
      }
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDriverInputChange = (e) => {
    setDriverFormData({
      ...driverFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleVehicleTypeChange = (value) => {
    setDriverFormData({
      ...driverFormData,
      vehicle_type: value
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In a real app, this would update the user profile via API
      // For now, we'll just update the context
      updateUser(formData);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDriverProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (driverProfile) {
        // Update existing profile (would need an update endpoint)
        toast.info('Driver profile update not implemented yet');
      } else {
        // Create new driver profile
        await axios.post(`${API_URL}/api/driver/profile`, driverFormData);
        toast.success('Driver profile created successfully!');
        fetchDriverProfile();
      }
    } catch (error) {
      console.error('Error saving driver profile:', error);
      toast.error(error.response?.data?.detail || 'Failed to save driver profile');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'driver':
        return <Car className="h-4 w-4" />;
      case 'rider':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'driver':
        return 'bg-blue-100 text-blue-800';
      case 'rider':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="profile-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <User className="h-8 w-8 text-indigo-600" />
            <span>My Profile</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <Card className="card-hover">
              <CardHeader className="text-center">
                <div className="relative mx-auto mb-4">
                  <GravatarAvatar 
                    name={user?.name || 'User'} 
                    userId={user?.id || 'default'} 
                    size={96}
                    showBorder={true}
                    borderColor="#E5E7EB"
                  />
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Camera className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                <CardTitle className="text-xl">{user?.name}</CardTitle>
                <CardDescription className="flex items-center justify-center space-x-2">
                  {getRoleIcon(user?.role)}
                  <Badge className={getRoleColor(user?.role)}>
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{user?.rating || 5.0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Rides</span>
                  <span className="font-medium">{user?.total_rides || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="font-medium">
                    {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge className={user?.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {user?.is_online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                {user?.role === 'driver' && (
                  <TabsTrigger value="driver">Driver Details</TabsTrigger>
                )}
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal">
                <Card className="card-hover">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <User className="h-5 w-5 text-indigo-600" />
                          <span>Personal Information</span>
                        </CardTitle>
                        <CardDescription>
                          Update your personal details and contact information
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditing(!editing)}
                        data-testid="edit-profile-button"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {editing ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              disabled={!editing}
                              className="pl-10"
                              data-testid="name-input"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              disabled={!editing}
                              className="pl-10"
                              data-testid="email-input"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            disabled={!editing}
                            className="pl-10"
                            data-testid="phone-input"
                          />
                        </div>
                      </div>
                      
                      {editing && (
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setEditing(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={loading}
                            className="btn-primary"
                            data-testid="save-profile-button"
                          >
                            {loading ? (
                              <>
                                <Save className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Driver Details Tab */}
              {user?.role === 'driver' && (
                <TabsContent value="driver">
                  <Card className="card-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Car className="h-5 w-5 text-indigo-600" />
                        <span>Driver Information</span>
                      </CardTitle>
                      <CardDescription>
                        {driverProfile ? 'Update your vehicle and driver details' : 'Complete your driver profile to start earning'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSaveDriverProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vehicle_make">Vehicle Make</Label>
                            <Input
                              id="vehicle_make"
                              name="vehicle_make"
                              placeholder="e.g., Toyota"
                              value={driverFormData.vehicle_make}
                              onChange={handleDriverInputChange}
                              data-testid="vehicle-make-input"
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="vehicle_model">Vehicle Model</Label>
                            <Input
                              id="vehicle_model"
                              name="vehicle_model"
                              placeholder="e.g., Camry"
                              value={driverFormData.vehicle_model}
                              onChange={handleDriverInputChange}
                              data-testid="vehicle-model-input"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vehicle_year">Year</Label>
                            <Input
                              id="vehicle_year"
                              name="vehicle_year"
                              type="number"
                              min="2000"
                              max={new Date().getFullYear() + 1}
                              value={driverFormData.vehicle_year}
                              onChange={handleDriverInputChange}
                              data-testid="vehicle-year-input"
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="vehicle_type">Vehicle Type</Label>
                            <Select 
                              value={driverFormData.vehicle_type} 
                              onValueChange={handleVehicleTypeChange}
                            >
                              <SelectTrigger data-testid="vehicle-type-select">
                                <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="economy">Economy</SelectItem>
                                <SelectItem value="comfort">Comfort</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="suv">SUV</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="license_plate">License Plate</Label>
                            <Input
                              id="license_plate"
                              name="license_plate"
                              placeholder="e.g., ABC123"
                              value={driverFormData.license_plate}
                              onChange={handleDriverInputChange}
                              data-testid="license-plate-input"
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="license_number">Driver's License</Label>
                            <Input
                              id="license_number"
                              name="license_number"
                              placeholder="License number"
                              value={driverFormData.license_number}
                              onChange={handleDriverInputChange}
                              data-testid="license-number-input"
                              required
                            />
                          </div>
                        </div>
                        
                        {driverProfile && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Approval Status</span>
                              <Badge className={driverProfile.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {driverProfile.is_approved ? 'Approved' : 'Pending Review'}
                              </Badge>
                            </div>
                            {!driverProfile.is_approved && (
                              <p className="text-sm text-gray-600 mt-2">
                                Your driver profile is under review. You'll be notified once approved.
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={loading}
                            className="btn-primary"
                            data-testid="save-driver-profile-button"
                          >
                            {loading ? (
                              <>
                                <Save className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                {driverProfile ? 'Update Profile' : 'Create Profile'}
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Settings Tab */}
              <TabsContent value="settings">
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-indigo-600" />
                      <span>Account Settings</span>
                    </CardTitle>
                    <CardDescription>
                      Manage your account preferences and security settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Email Notifications</p>
                            <p className="text-sm text-gray-600">Receive updates about your rides</p>
                          </div>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">SMS Notifications</p>
                            <p className="text-sm text-gray-600">Get text updates for ride status</p>
                          </div>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Location Sharing</p>
                            <p className="text-sm text-gray-600">Allow location tracking during rides</p>
                          </div>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
                      
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          <Shield className="h-4 w-4 mr-2" />
                          Change Password
                        </Button>
                        
                        <Button variant="outline" className="w-full justify-start">
                          <Phone className="h-4 w-4 mr-2" />
                          Two-Factor Authentication
                        </Button>
                        
                        <Button variant="outline" className="w-full justify-start">
                          <Activity className="h-4 w-4 mr-2" />
                          Login Activity
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Data & Privacy</h3>
                      
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          Download My Data
                        </Button>
                        
                        <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;