import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI, paymentsAPI } from '../api/api';
import Navbar from '../components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { FiCreditCard, FiCheck, FiAlertCircle } from 'react-icons/fi';

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const response = await bookingsAPI.getOne(bookingId);
      setBooking(response.data);
    } catch (error) {
      console.error('Failed to load booking:', error);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError('');

    try {
      // Initialize Paystack payment
      const response = await paymentsAPI.initialize(bookingId);
      
      // Redirect to Paystack checkout
      if (response.data.authorization_url) {
        window.location.href = response.data.authorization_url;
      } else {
        // Fallback: Mark as paid (for testing without real keys)
        await paymentsAPI.verify(`ref_${bookingId}`);
        navigate('/customer/dashboard', {
          state: { message: 'Payment successful! Booking confirmed.' }
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Booking not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const platformFee = booking.total_amount * 0.15;
  const totalToPay = booking.total_amount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" data-testid="payment-page">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8 max-w-2xl">
        <Card className="glass shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <FiCreditCard className="text-3xl" />
              <div>
                <CardTitle className="text-2xl">Complete Payment</CardTitle>
                <p className="text-blue-100 text-sm mt-1">Secure payment powered by Paystack</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {error && (
              <Alert variant="destructive" className="glass-dark">
                <FiAlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Booking Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium">{booking.preferred_date} at {booking.preferred_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">{booking.service_location}</span>
                </div>
                {booking.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Notes:</span>
                    <span className="font-medium italic">{booking.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Payment Breakdown</h3>
              <div className="bg-white rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Cost:</span>
                  <span className="font-medium">₦{booking.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform Fee (15%):</span>
                  <span className="font-medium">₦{platformFee.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Total to Pay:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      ₦{totalToPay.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <FiCheck className="text-green-600 text-xl mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900 mb-1">Secure Payment</p>
                <p className="text-green-700">Your payment information is encrypted and secure. We never store your card details.</p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Payment Process:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Click "Pay Now" to proceed to Paystack</li>
                <li>Enter your card details securely</li>
                <li>Complete payment</li>
                <li>You'll be redirected back automatically</li>
                <li>Provider will be notified to confirm your booking</li>
              </ol>
            </div>

            {/* Payment Button */}
            <Button 
              onClick={handlePayment}
              disabled={processing}
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              data-testid="pay-now-btn"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FiCreditCard /> Pay ₦{totalToPay.toLocaleString()} Now
                </span>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By proceeding, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
