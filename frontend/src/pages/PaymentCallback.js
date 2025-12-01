import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsAPI } from '../api/api';
import Navbar from '../components/Navbar';
import { Card, CardContent } from '../components/ui/card';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (reference) {
      verifyPayment(reference);
    } else {
      setStatus('failed');
      setMessage('No payment reference found');
    }
  }, [searchParams]);

  const verifyPayment = async (reference) => {
    try {
      const response = await paymentsAPI.verify(reference);
      
      if (response.data.status === 'success') {
        setStatus('success');
        setMessage('Payment successful! Your booking has been confirmed.');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/customer/dashboard');
        }, 3000);
      } else {
        setStatus('failed');
        setMessage('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(error.response?.data?.detail || 'Payment verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="glass shadow-xl">
          <CardContent className="p-12 text-center">
            {status === 'verifying' && (
              <>
                <FiLoader className="text-6xl text-blue-600 mx-auto mb-4 animate-spin" />
                <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
                <p className="text-gray-600">Please wait while we confirm your payment</p>
              </>
            )}

            {status === 'success' && (
              <>
                <FiCheckCircle className="text-6xl text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
                <p className="text-gray-700 mb-4">{message}</p>
                <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
              </>
            )}

            {status === 'failed' && (
              <>
                <FiXCircle className="text-6xl text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
                <p className="text-gray-700 mb-6">{message}</p>
                <button
                  onClick={() => navigate('/customer/dashboard')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Back to Dashboard
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentCallback;
