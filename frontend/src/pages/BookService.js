import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { servicesAPI, bookingsAPI } from '../api/api';
import Navbar from '../components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { FiMapPin, FiCalendar, FiClock } from 'react-icons/fi';

const BookService = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    preferred_date: '',
    preferred_time: '',
    service_location: '',
    notes: '',
    estimated_budget: ''
  });

  useEffect(() => {
    loadService();
    getUserLocation();
  }, [serviceId]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Could use reverse geocoding here to get address
          console.log('User location:', position.coords);
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  };

  const loadService = async () => {
    try {
      const response = await servicesAPI.getOne(serviceId);
      setService(response.data);
      setFormData(prev => ({
        ...prev,
        estimated_budget: response.data.price.toString()
      }));
    } catch (error) {
      console.error('Failed to load service:', error);
      setError('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const bookingData = {
        service_id: serviceId,
        provider_id: service.provider_id,
        ...formData,
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : null
      };

      const response = await bookingsAPI.create(bookingData);
      setSuccess(true);
      
      // Redirect to payment page
      setTimeout(() => {
        navigate(`/payment/${response.data.id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Service not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="book-service-page">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8 max-w-4xl">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Book Service</h1>
          <p className="text-sm md:text-base text-gray-600">Fill in the details to book this service</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent>
                {success ? (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      ✅ Booking created! Redirecting to payment...
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preferred_date">
                          <FiCalendar className="inline mr-1" /> Preferred Date
                        </Label>
                        <Input
                          id="preferred_date"
                          name="preferred_date"
                          type="date"
                          value={formData.preferred_date}
                          onChange={handleChange}
                          required
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preferred_time">
                          <FiClock className="inline mr-1" /> Preferred Time
                        </Label>
                        <Input
                          id="preferred_time"
                          name="preferred_time"
                          type="time"
                          value={formData.preferred_time}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service_location">
                        <FiMapPin className="inline mr-1" /> Service Location
                      </Label>
                      <Input
                        id="service_location"
                        name="service_location"
                        placeholder="Enter your address"
                        value={formData.service_location}
                        onChange={handleChange}
                        required
                      />
                      <p className="text-xs text-gray-500">Enter the full address where the service should be provided</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        placeholder="Any special requirements or instructions..."
                        value={formData.notes}
                        onChange={handleChange}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimated_budget">Your Budget (₦)</Label>
                      <Input
                        id="estimated_budget"
                        name="estimated_budget"
                        type="number"
                        value={formData.estimated_budget}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500">Default is the service price, but you can adjust if needed</p>
                    </div>

                    <div className="pt-4">
                      <Button type="submit" className="w-full" size="lg" disabled={submitting} data-testid="submit-booking-btn">
                        {submitting ? 'Creating Booking...' : 'Request Booking'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Service Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Service Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{service.title}</h3>
                    <p className="text-sm text-gray-600">{service.category}</p>
                  </div>

                  <p className="text-sm text-gray-700 line-clamp-3">{service.description}</p>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Service Price</span>
                      <span className="text-xl font-bold text-blue-600">₦{service.price.toLocaleString()}</span>
                    </div>
                    {service.duration && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Duration</span>
                        <span className="text-gray-700">{service.duration} minutes</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      ℹ️ Your booking request will be sent to the provider for confirmation. You'll be notified once they respond.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookService;