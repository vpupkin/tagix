import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { 
  CheckCircle, 
  CreditCard, 
  Clock, 
  ArrowRight,
  AlertCircle,
  Loader2,
  Home,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PaymentSuccess = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState('checking'); // checking, success, failed
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollAttempts, setPollAttempts] = useState(0);
  const maxPollAttempts = 10;
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      navigate('/rides');
      return;
    }

    // Start polling for payment status
    pollPaymentStatus();
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    if (attempts >= maxPollAttempts) {
      setPaymentStatus('failed');
      setLoading(false);
      toast.error('Payment status check timed out. Please check your email for confirmation.');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/payments/status/${sessionId}`);
      const data = response.data;
      
      setPaymentDetails(data);
      
      if (data.payment_status === 'paid') {
        setPaymentStatus('success');
        setLoading(false);
        toast.success('Payment successful! Thank you for your purchase.');
        return;
      } else if (data.payment_status === 'failed' || data.payment_status === 'expired') {
        setPaymentStatus('failed');
        setLoading(false);
        toast.error('Payment failed. Please try again.');
        return;
      }

      // If payment is still pending, continue polling
      setPollAttempts(attempts + 1);
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000); // Poll every 2 seconds
      
    } catch (error) {
      console.error('Error checking payment status:', error);
      
      if (attempts < maxPollAttempts - 1) {
        setPollAttempts(attempts + 1);
        setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
      } else {
        setPaymentStatus('failed');
        setLoading(false);
        toast.error('Error checking payment status. Please contact support.');
      }
    }
  };

  const handleGoToRides = () => {
    navigate('/rides');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading || paymentStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-md mx-auto px-4">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h2>
              <p className="text-gray-600 mb-4">
                Please wait while we confirm your payment...
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Session ID</p>
                <p className="font-mono text-sm">{sessionId}</p>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Attempt {pollAttempts + 1} of {maxPollAttempts}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8" data-testid="payment-success">
        <div className="max-w-md mx-auto px-4">
          <Card className="text-center shadow-lg">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-6">
                Thank you for your payment. Your transaction has been processed successfully.
              </p>
              
              {paymentDetails && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Receipt className="h-5 w-5 mr-2" />
                    Payment Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount</span>
                      <span className="text-sm font-medium">
                        {paymentDetails.currency?.toUpperCase()} ${paymentDetails.amount?.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Paid</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Session ID</span>
                      <span className="text-xs font-mono text-gray-500">{sessionId}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Date</span>
                      <span className="text-sm font-medium">
                        {new Date().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  onClick={handleGoToRides}
                  className="w-full btn-primary"
                  data-testid="go-to-rides-button"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  View My Rides
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                
                <Button 
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full"
                  data-testid="go-home-button"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  A confirmation email has been sent to {user?.email}.
                  If you have any questions, please contact our support team.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Payment failed state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8" data-testid="payment-failed">
      <div className="max-w-md mx-auto px-4">
        <Card className="text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">
              We couldn't process your payment. Please try again or contact support if the problem persists.
            </p>
            
            {paymentDetails && (
              <div className="bg-red-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Payment Status: {paymentDetails.payment_status}
                  </span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Session ID: {sessionId}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={handleGoToRides}
                className="w-full btn-primary"
                data-testid="retry-payment-button"
              >
                Try Again
              </Button>
              
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If you continue to experience issues, please contact our support team with the session ID above.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;