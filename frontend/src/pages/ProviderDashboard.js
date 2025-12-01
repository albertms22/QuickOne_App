import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI, providerAPI, transactionsAPI } from '../api/api';
import Navbar from '../components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiCalendar, FiStar, FiTrendingUp, FiCreditCard } from 'react-icons/fi';

const ProviderDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    averageRating: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bookingsRes, profileRes, transactionsRes, walletRes] = await Promise.all([
        bookingsAPI.getAll(),
        providerAPI.getProfile(),
        transactionsAPI.getAll(),
        providerAPI.getWallet()
      ]);

      setBookings(bookingsRes.data);
      setProfile(profileRes.data);
      setTransactions(transactionsRes.data);
      setWallet(walletRes.data);

      // Calculate stats
      const totalEarnings = walletRes.data.total_earned || 0;
      
      const pendingCount = bookingsRes.data.filter(b => b.status === 'pending').length;
      const completedCount = bookingsRes.data.filter(b => b.payment_status === 'paid').length;

      setStats({
        totalEarnings,
        pendingBookings: pendingCount,
        completedBookings: completedCount,
        averageRating: profileRes.data.average_rating || 0
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    try {
      await bookingsAPI.updateStatus(bookingId, action);
      loadData();
    } catch (error) {
      console.error('Failed to update booking:', error);
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
    <div className="min-h-screen bg-gray-50" data-testid="provider-dashboard">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome back, {user.full_name}!</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage your services and bookings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">₦{stats.totalEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <FiDollarSign className="text-green-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Wallet Balance</p>
                  <p className="text-2xl font-bold text-gray-900">₦{wallet ? wallet.balance.toLocaleString() : '0'}</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <FiCreditCard className="text-indigo-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <FiCalendar className="text-yellow-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)} ⭐</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <FiStar className="text-purple-600 text-2xl" />
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
              <div className="flex gap-4 flex-wrap">
                <Link to="/provider/services">
                  <Button>Manage Services</Button>
                </Link>
                <Link to="/provider/profile-setup">
                  <Button variant="outline">Update Profile</Button>
                </Link>
                <Link to="/provider/withdrawals">
                  <Button variant="outline" className="bg-green-50 hover:bg-green-100">
                    <FiCreditCard className="mr-2" /> Request Withdrawal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <div className="space-y-4">
                  {bookings.filter(b => b.status === 'pending').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No pending requests</p>
                  ) : (
                    bookings.filter(b => b.status === 'pending').map(booking => (
                      <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid={`booking-${booking.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">Booking Request</h4>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">📅 {booking.preferred_date} at {booking.preferred_time}</p>
                            <p className="text-sm text-gray-600 mb-1">📍 {booking.service_location}</p>
                            <p className="text-sm text-gray-600">💰 ₦{booking.total_amount.toLocaleString()}</p>
                            {booking.notes && (
                              <p className="text-sm text-gray-700 mt-2 italic">Note: {booking.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleBookingAction(booking.id, 'accepted')} data-testid={`accept-booking-${booking.id}`}>
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBookingAction(booking.id, 'cancelled')}>
                              Decline
                            </Button>
                            <Link to={`/chat/${booking.id}`}>
                              <Button size="sm" variant="ghost">Chat</Button>
                            </Link>
                          </div>
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
                              <h4 className="font-semibold">{booking.status === 'accepted' ? 'Accepted Booking' : 'Service Completed'}</h4>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">📅 {booking.preferred_date} at {booking.preferred_time}</p>
                            <p className="text-sm text-gray-600 mb-1">📍 {booking.service_location}</p>
                            <p className="text-sm text-gray-600">💰 ₦{booking.total_amount.toLocaleString()}</p>
                            {booking.status === 'completed' && (
                              <p className="text-sm text-amber-600 mt-2">⏳ Waiting for customer confirmation...</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {booking.status === 'accepted' && (
                              <Button size="sm" onClick={() => handleBookingAction(booking.id, 'completed')}>
                                Mark Completed
                              </Button>
                            )}
                            <Link to={`/chat/${booking.id}`}>
                              <Button size="sm" variant="ghost">Chat</Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="space-y-4">
                  {bookings.filter(b => b.status === 'customer_confirmed' || b.payment_status === 'paid').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No completed bookings yet</p>
                  ) : (
                    bookings.filter(b => b.status === 'customer_confirmed' || b.payment_status === 'paid').map(booking => (
                      <div key={booking.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">Completed Job</h4>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">📅 {booking.preferred_date}</p>
                            <p className="text-sm text-gray-600">💰 ₦{booking.total_amount.toLocaleString()}</p>
                          </div>
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

export default ProviderDashboard;