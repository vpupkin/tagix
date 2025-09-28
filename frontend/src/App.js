import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

// Import components
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import HomePage from './components/HomePage';
import RiderDashboard from './components/RiderDashboard';
import DriverDashboard from './components/DriverDashboard';
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard';
import RideBooking from './components/RideBooking';
import RideHistory from './components/RideHistory';
import PaymentSuccess from './components/PaymentSuccess';
import Profile from './components/Profile';

// Auth context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <MainApp />
          <Toaster position="top-right" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

function MainApp() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <h2 className="text-2xl font-semibold text-gray-900">Loading MobilityHub...</h2>
        </div>
      </div>
    );
  }

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar onAuthClick={() => setShowAuth(true)} />
        
        <Routes>
          <Route path="/" element={
            user ? (
              user.role === 'rider' ? <Navigate to="/rider" /> :
              user.role === 'driver' ? <Navigate to="/driver" /> :
              user.role === 'admin' ? <Navigate to="/admin" /> :
              <HomePage onGetStarted={() => setShowAuth(true)} />
            ) : (
              <HomePage onGetStarted={() => setShowAuth(true)} />
            )
          } />
          
          <Route path="/rider" element={
            user && user.role === 'rider' ? <RiderDashboard /> : <Navigate to="/" />
          } />
          
          <Route path="/driver" element={
            user && user.role === 'driver' ? <DriverDashboard /> : <Navigate to="/" />
          } />
          
          <Route path="/admin" element={
            user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />
          } />
          
          <Route path="/book-ride" element={
            user && user.role === 'rider' ? <RideBooking /> : <Navigate to="/" />
          } />
          
          <Route path="/rides" element={
            user ? <RideHistory /> : <Navigate to="/" />
          } />
          
          <Route path="/profile" element={
            user ? <Profile /> : <Navigate to="/" />
          } />
          
          <Route path="/payment-success" element={
            user ? <PaymentSuccess /> : <Navigate to="/" />
          } />
        </Routes>
        
        {showAuth && (
          <AuthModal 
            isOpen={showAuth} 
            onClose={() => setShowAuth(false)} 
          />
        )}
      </div>
    </WebSocketProvider>
  );
}

export default App;