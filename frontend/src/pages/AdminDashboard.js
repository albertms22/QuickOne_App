import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FiUsers, FiDollarSign, FiCalendar, FiTrendingUp, FiClock, FiStar } from 'react-icons/fi';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (user && user.user_type !== 'admin') {
      alert('Access denied. Admin only.');
      navigate('/');
      return;
    }
    
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getActivity(10)
      ]);
      
      setStats(statsRes.data);
      setActivity(activityRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Admin only.');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">QuickOne Admin Panel</h1>
            <div className="flex gap-4">
              <span className="text-blue-100">Welcome, {user?.full_name}</span>
              <button onClick={() => navigate('/')} className="text-white hover:text-blue-200">
                Exit Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <nav className="flex gap-6 py-3">
            <Link to="/admin/dashboard" className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-3">
              Dashboard
            </Link>
            <Link to="/admin/withdrawals" className="text-gray-600 hover:text-blue-600 pb-3">
              Withdrawals
            </Link>
            <Link to="/admin/users" className="text-gray-600 hover:text-blue-600 pb-3">
              Users
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.users?.total || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.users?.customers || 0} customers • {stats?.users?.providers || 0} providers
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FiUsers className="text-blue-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Bookings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Bookings</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.bookings?.active || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.bookings?.completed_this_month || 0} completed this month
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <FiCalendar className="text-yellow-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ₦{stats?.revenue?.total?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ₦{stats?.revenue?.month_revenue?.toLocaleString() || '0'} this month
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <FiDollarSign className="text-green-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Earnings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Platform Earnings (10%)</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ₦{stats?.revenue?.platform_earnings?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ₦{stats?.revenue?.month_earnings?.toLocaleString() || '0'} this month
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <FiTrendingUp className="text-purple-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Withdrawals */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Withdrawals</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.withdrawals?.pending_count || 0}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    ₦{stats?.withdrawals?.pending_amount?.toLocaleString() || '0'} total
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <FiClock className="text-amber-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Rating */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.ratings?.average || 0} ⭐</p>
                  <p className="text-xs text-gray-500 mt-1">Platform average</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <FiStar className="text-yellow-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link to="/admin/withdrawals">
                  <Button className="w-full justify-start" variant="outline">
                    <FiClock className="mr-2" />
                    Review {stats?.withdrawals?.pending_count || 0} Pending Withdrawals
                  </Button>
                </Link>
                <Link to="/admin/users">
                  <Button className="w-full justify-start" variant="outline">
                    <FiUsers className="mr-2" />
                    Manage Users
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activity.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                ) : (
                  activity.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {item.type === 'booking' ? (
                          <FiCalendar className="text-blue-600" />
                        ) : (
                          <FiDollarSign className="text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{item.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
