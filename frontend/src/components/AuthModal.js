import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car, User, Shield, Eye, EyeOff, Mail, Phone, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'rider'
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = (value) => {
    setFormData({
      ...formData,
      role: value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      onClose();
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name || !formData.phone) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formData.phone,
      role: formData.role
    });
    setLoading(false);

    if (result.success) {
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      role: 'rider'
    });
    setShowPassword(false);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'rider':
        return <User className="h-4 w-4" />;
      case 'driver':
        return <Car className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'rider':
        return 'Book rides and travel safely';
      case 'driver':
        return 'Drive and earn money';
      case 'admin':
        return 'Manage the platform';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-[95vw] max-w-md max-h-[95vh] overflow-y-auto mx-4 my-4 sm:mx-0 sm:my-0" 
        data-testid="auth-modal"
      >
        <DialogHeader className="pb-4 px-1">
          <DialogTitle className="text-center text-lg sm:text-xl font-bold gradient-text">
            Welcome to MobilityHub
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 text-sm">
            Your journey starts here
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full" onValueChange={resetForm}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
            <TabsTrigger value="register" data-testid="register-tab">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="space-y-4 mt-4 px-1">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="login-email" className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-11 text-base"
                    data-testid="login-email-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="login-password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pr-10 h-11 text-base"
                    data-testid="login-password-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-primary h-11 text-base"
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="text-center text-xs text-gray-600 mt-3">
              Don't have an account?{' '}
              <button 
                onClick={() => document.querySelector('[value="register"]').click()}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Sign up here
              </button>
            </div>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="space-y-4 mt-4 px-1">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="register-name" className="text-sm">Full Name</Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10 h-11 text-base"
                    data-testid="register-name-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="register-email" className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-11 text-base"
                    data-testid="register-email-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="register-phone" className="text-sm">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="pl-10 h-11 text-base"
                    data-testid="register-phone-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="register-role" className="text-sm">I want to</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger data-testid="role-select" className="h-11 text-base">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rider" className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2 w-full">
                        {getRoleIcon('rider')}
                        <div>
                          <div className="font-medium">Rider</div>
                          <div className="text-sm text-gray-500">{getRoleDescription('rider')}</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="driver" className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2 w-full">
                        {getRoleIcon('driver')}
                        <div>
                          <div className="font-medium">Driver</div>
                          <div className="text-sm text-gray-500">{getRoleDescription('driver')}</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="register-password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password (min. 6 characters)"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pr-10 h-11 text-base"
                    data-testid="register-password-input"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-primary h-11 text-base"
                disabled={loading}
                data-testid="register-submit-button"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center text-xs text-gray-600 mt-3">
              Already have an account?{' '}
              <button 
                onClick={() => document.querySelector('[value="login"]').click()}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Sign in here
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;