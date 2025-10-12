import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Car, MapPin } from 'lucide-react';

const UserInfoFloatingBox = () => {
  const { user } = useAuth();

  // Don't show if user is not logged in
  if (!user) {
    return null;
  }

  // Get role-based colors and icons
  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return {
          bgColor: 'bg-purple-100',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-800',
          icon: <Shield className="h-4 w-4" />,
          label: 'Admin'
        };
      case 'driver':
        return {
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          icon: <Car className="h-4 w-4" />,
          label: 'Driver'
        };
      case 'rider':
        return {
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          icon: <MapPin className="h-4 w-4" />,
          label: 'Rider'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          icon: <User className="h-4 w-4" />,
          label: 'User'
        };
    }
  };

  const roleInfo = getRoleInfo(user.role);

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 ${roleInfo.bgColor} ${roleInfo.borderColor} border-2 rounded-lg shadow-lg p-3 max-w-xs transition-all duration-300 hover:shadow-xl`}
      data-testid="user-info-floating-box"
    >
      <div className="flex items-center space-x-3">
        {/* User Avatar */}
        <div className={`w-10 h-10 ${roleInfo.bgColor} ${roleInfo.borderColor} border-2 rounded-full flex items-center justify-center`}>
          <User className={`h-5 w-5 ${roleInfo.textColor}`} />
        </div>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`text-sm font-medium ${roleInfo.textColor} truncate`}>
              {user.name}
            </span>
            <Badge 
              variant="secondary" 
              className={`${roleInfo.bgColor} ${roleInfo.textColor} border-0 text-xs px-2 py-0.5`}
            >
              <div className="flex items-center space-x-1">
                {roleInfo.icon}
                <span>{roleInfo.label}</span>
              </div>
            </Badge>
          </div>
          
          <div className={`text-xs ${roleInfo.textColor} opacity-75 truncate`}>
            {user.email}
          </div>
          
          <div className={`text-xs ${roleInfo.textColor} opacity-60 mt-1`}>
            ID: {user.id.slice(-8)}
          </div>
        </div>
      </div>
      
      {/* Made with Emergent text */}
      <div className={`text-xs ${roleInfo.textColor} opacity-50 text-center mt-2 pt-2 border-t ${roleInfo.borderColor}`}>
        Made with Emergent
      </div>
    </div>
  );
};

export default UserInfoFloatingBox;
