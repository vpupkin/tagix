import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import GravatarAvatar from './ui/GravatarAvatar';
import { 
  Car, 
  User, 
  Bell, 
  Settings, 
  LogOut, 
  Menu,
  X,
  MapPin,
  CreditCard,
  History,
  Shield
} from 'lucide-react';

const Navbar = ({ onAuthClick }) => {
  const { user, logout } = useAuth();
  const { connected, notifications, clearAllNotifications } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications();
      // You could add a toast notification here if you want
      console.log('All notifications cleared successfully');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      // You could add an error toast here if you want
    }
  };

  const NavLink = ({ to, children, onClick }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => {
          setMobileMenuOpen(false);
          onClick && onClick();
        }}
        className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
          isActive
            ? 'bg-indigo-100 text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
        }`}
        data-testid={`nav-link-${to.replace('/', '') || 'home'}`}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 group"
            data-testid="logo-link"
          >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text hidden sm:block">
              MobilityHub
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <>
                {user.role === 'rider' && (
                  <>
                    <NavLink to="/rider">Dashboard</NavLink>
                    <NavLink to="/book-ride">Book Ride</NavLink>
                    <NavLink to="/rides">My Rides</NavLink>
                  </>
                )}
                {user.role === 'driver' && (
                  <>
                    <NavLink to="/driver">Dashboard</NavLink>
                    <NavLink to="/rides">My Rides</NavLink>
                  </>
                )}
                {user.role === 'admin' && (
                  <>
                    <NavLink to="/admin">Admin Panel</NavLink>
                    <NavLink to="/rides">All Rides</NavLink>
                  </>
                )}
              </>
            ) : (
              <>
                <NavLink to="/">Home</NavLink>
                <a 
                  href="#features" 
                  className="px-4 py-2 text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                >
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  className="px-4 py-2 text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                >
                  How It Works
                </a>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Connection Status */}
                <div className="hidden sm:flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-xs text-gray-500">
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="relative p-2"
                      data-testid="notifications-button"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Notifications</h3>
                          <p className="text-sm text-gray-500">{unreadCount} unread</p>
                        </div>
                        {notifications.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAllNotifications}
                            className="text-xs text-gray-500 hover:text-red-600"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 5).map((notification) => (
                          <DropdownMenuItem key={notification.id} className="p-3 flex-col items-start">
                            <div className="font-medium text-sm">{notification.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{notification.message}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No notifications
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center space-x-2 p-2"
                      data-testid="user-menu-button"
                    >
                      <GravatarAvatar 
                        name={user.name} 
                        userId={user.id} 
                        size={32}
                        showBorder={false}
                      />
                      <span className="hidden sm:block font-medium text-gray-700">
                        {user.name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="p-3 border-b">
                      <div className="flex items-center space-x-3 mb-2">
                        <GravatarAvatar 
                          name={user.name} 
                          userId={user.id} 
                          size={40}
                          showBorder={true}
                          borderColor="#E5E7EB"
                        />
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>
                    
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link to="/rides" className="flex items-center space-x-2">
                        <History className="h-4 w-4" />
                        <span>Ride History</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    {user.role === 'rider' && (
                      <DropdownMenuItem asChild>
                        <Link to="/payments" className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4" />
                          <span>Payment Methods</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {user.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center space-x-2">
                          <Shield className="h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="flex items-center space-x-2 text-red-600 focus:text-red-600"
                      data-testid="logout-button"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button 
                onClick={onAuthClick} 
                className="btn-primary"
                data-testid="login-button"
              >
                Get Started
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-button"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-2">
            {user ? (
              <>
                {user.role === 'rider' && (
                  <>
                    <NavLink to="/rider">Dashboard</NavLink>
                    <NavLink to="/book-ride">Book Ride</NavLink>
                    <NavLink to="/rides">My Rides</NavLink>
                  </>
                )}
                {user.role === 'driver' && (
                  <>
                    <NavLink to="/driver">Dashboard</NavLink>
                    <NavLink to="/rides">My Rides</NavLink>
                  </>
                )}
                {user.role === 'admin' && (
                  <>
                    <NavLink to="/admin">Admin Panel</NavLink>
                    <NavLink to="/rides">All Rides</NavLink>
                  </>
                )}
                <div className="border-t pt-2 mt-2">
                  <NavLink to="/profile">Profile</NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    data-testid="mobile-logout-button"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <NavLink to="/">Home</NavLink>
                <a 
                  href="#features" 
                  className="block px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  className="block px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </a>
                <div className="pt-2 mt-2 border-t">
                  <Button 
                    onClick={() => {
                      onAuthClick();
                      setMobileMenuOpen(false);
                    }} 
                    className="w-full btn-primary"
                    data-testid="mobile-login-button"
                  >
                    Get Started
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;