import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI } from '../api/api';
import Navbar from '../components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Link } from 'react-router-dom';
import { FiCalendar, FiCheckCircle, FiClock, FiSearch } from 'react-icons/fi';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await bookingsAPI.getAll();
      setBookings(response.data);

      const pendingCount = response.data.filter(b => b.status === 'pending').length;
      const confirmedCount = response.data.filter(b => b.status === 'accepted').length;
      const completedCount = response.data.filter(b => b.status === 'customer_confirmed' || b.payment_status === 'paid').length;

      setStats({
        pendingBookings: pendingCount,
        confirmedBookings: confirmedCount,
        completedBookings: completedCount
      });
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompletion = async (bookingId) => {
    try {
      await bookingsAPI.updateStatus(bookingId, 'customer_confirmed');
      loadData();
    } catch (error) {
      console.error('Failed to confirm completion:', error);
      alert('Failed to confirm completion');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      customer_confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status]}>{status.replace('_', ' ')}</Badge>;
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

  return (
    <div className="min-h-screen bg-gray-50" data-testid="customer-dashboard">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome, {user.full_name}!</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage your bookings and find services</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <FiClock className="text-yellow-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Confirmed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.confirmedBookings}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FiCalendar className="text-blue-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedBookings}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <FiCheckCircle className="text-green-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/browse">
                <Button data-testid="browse-services-btn">
                  <FiSearch className="mr-2" /> Browse Services
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>My Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="space-y-4">
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">You haven't made any bookings yet</p>
                      <Link to="/browse">
                        <Button>Browse Services</Button>
                      </Link>
                    </div>
                  ) : (
                    bookings.map(booking => (
                      <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid={`booking-${booking.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">Service Booking</h4>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">📅 {booking.preferred_date} at {booking.preferred_time}</p>
                            <p className="text-sm text-gray-600 mb-1">📍 {booking.service_location}</p>
                            <p className="text-sm text-gray-600">💰 ₦{booking.total_amount.toLocaleString()}</p>
                            {booking.notes && (
                              <p className="text-sm text-gray-700 mt-2 italic">Note: {booking.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Link to={`/chat/${booking.id}`}>
                              <Button size="sm" variant="outline">Chat</Button>
                            </Link>
                            {booking.status === 'completed' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleConfirmCompletion(booking.id)}>
                                Confirm Completion
                              </Button>
                            )}
                            {booking.status === 'customer_confirmed' && booking.payment_status === 'pending' && (
                              <Link to={`/payment/${booking.id}`}>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Pay Now</Button>
                              </Link>
                            )}
                            {booking.payment_status === 'paid' && (
                              <Link to={`/review/${booking.id}`}>
                                <Button size="sm">Review</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pending">
                <div className="space-y-4">
                  {bookings.filter(b => b.status === 'pending').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No pending bookings</p>
                  ) : (
                    bookings.filter(b => b.status === 'pending').map(booking => (
                      <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">Service Booking</h4>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">📅 {booking.preferred_date} at {booking.preferred_time}</p>
                            <p className="text-sm text-gray-600">💰 ₦{booking.total_amount.toLocaleString()}</p>
                          </div>
                          <Link to={`/chat/${booking.id}`}>
                            <Button size="sm" variant="outline">Chat</Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="confirmed">
                <div className="space-y-4">
                  {bookings.filter(b => b.status === 'accepted' || b.status === 'completed').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No confirmed bookings</p>
                  ) : (
                    bookings.filter(b => b.status === 'accepted' || b.status === 'completed').map(booking => (
                      <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">Service Booking</h4>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">📅 {booking.preferred_date} at {booking.preferred_time}</p>
                            <p className="text-sm text-gray-600">💰 ₦{booking.total_amount.toLocaleString()}</p>
                          </div>
                          <Link to={`/chat/${booking.id}`}>
                            <Button size="sm" variant="outline">Chat</Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="space-y-4">
                  {bookings.filter(b => b.payment_status === 'paid').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No completed & paid bookings yet</p>
                  ) : (
                    bookings.filter(b => b.payment_status === 'paid').map(booking => (
                      <div key={booking.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">Service Booking</h4>
                              {getStatusBadge(booking.status)}
                              <Badge className="bg-green-100 text-green-800">Paid</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">📅 {booking.preferred_date}</p>
                            <p className="text-sm text-gray-600">💰 ₦{booking.total_amount.toLocaleString()}</p>
                          </div>
                          <Link to={`/review/${booking.id}`}>
                            <Button size="sm">Leave Review</Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerDashboard;