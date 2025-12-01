import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FiEye, FiCheckCircle, FiXCircle, FiLock, FiUnlock } from 'react-icons/fi';

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user && user.user_type !== 'admin') {
      alert('Access denied. Admin only.');
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, navigate]);

  const loadUsers = async (userType = null) => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers(userType);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (userId) => {
    try {
      setActionLoading(true);
      const response = await adminAPI.getUserDetails(userId);
      setSelectedUser(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load user details:', error);
      alert('Failed to load user details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyUser = async (userId) => {
    if (!confirm('Are you sure you want to manually verify this user?')) return;
    
    try {
      setActionLoading(true);
      await adminAPI.verifyUser(userId);
      alert('User verified successfully!');
      loadUsers();
      if (selectedUser?.id === userId) {
        handleViewDetails(userId);
      }
    } catch (error) {
      console.error('Failed to verify user:', error);
      alert('Failed to verify user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    const action = currentStatus ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      setActionLoading(true);
      await adminAPI.toggleUserActive(userId);
      alert(`User ${action}d successfully!`);
      loadUsers();
      if (selectedUser?.id === userId) {
        handleViewDetails(userId);
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      alert('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const UserCard = ({ userData }) => (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start gap-3 mb-3">
        {userData.profile_photo ? (
          <img 
            src={userData.profile_photo} 
            alt={userData.full_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-lg">
              {userData.full_name.charAt(0)}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">{userData.full_name}</h3>
            <Badge className={
              userData.user_type === 'provider' ? 'bg-blue-100 text-blue-800' : 
              userData.user_type === 'customer' ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }>
              {userData.user_type}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600">{userData.email}</p>
          {userData.phone && (
            <p className="text-sm text-gray-600">{userData.phone}</p>
          )}
          {userData.location && (
            <p className="text-sm text-gray-500 mt-1">📍 {userData.location}</p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>Joined: {new Date(userData.created_at).toLocaleDateString()}</span>
            {userData.email_verified ? (
              <span className="text-green-600">✓ Verified</span>
            ) : (
              <span className="text-gray-400">Not verified</span>
            )}
            {userData.is_active !== false ? (
              <span className="text-green-600">Active</span>
            ) : (
              <span className="text-red-600">Suspended</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Button 
          size="sm" 
          onClick={() => handleViewDetails(userData.id)}
          className="flex-1 text-xs"
          disabled={actionLoading}
        >
          <FiEye className="mr-1" />
          Details
        </Button>
        
        {!userData.email_verified && (
          <Button 
            size="sm" 
            onClick={() => handleVerifyUser(userData.id)}
            className="flex-1 text-xs bg-green-600 hover:bg-green-700"
            disabled={actionLoading}
          >
            <FiCheckCircle className="mr-1" />
            Verify
          </Button>
        )}
        
        <Button 
          size="sm" 
          onClick={() => handleToggleActive(userData.id, userData.is_active !== false)}
          className={`flex-1 text-xs ${userData.is_active !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          disabled={actionLoading}
        >
          {userData.is_active !== false ? (
            <>
              <FiLock className="mr-1" />
              Suspend
            </>
          ) : (
            <>
              <FiUnlock className="mr-1" />
              Activate
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const customers = users.filter(u => u.user_type === 'customer');
  const providers = users.filter(u => u.user_type === 'provider');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">QuickOne Admin Panel</h1>
            <button onClick={() => navigate('/admin/dashboard')} className="text-white hover:text-blue-200">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <nav className="flex gap-6 py-3">
            <Link to="/admin/dashboard" className="text-gray-600 hover:text-blue-600 pb-3">
              Dashboard
            </Link>
            <Link to="/admin/withdrawals" className="text-gray-600 hover:text-blue-600 pb-3">
              Withdrawals
            </Link>
            <Link to="/admin/users" className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-3">
              Users
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
                <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
                <TabsTrigger value="providers">Providers ({providers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map(userData => (
                    <UserCard key={userData.id} userData={userData} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="customers">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">No customers</p>
                  ) : (
                    customers.map(userData => (
                      <UserCard key={userData.id} userData={userData} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="providers">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">No providers</p>
                  ) : (
                    providers.map(userData => (
                      <UserCard key={userData.id} userData={userData} />
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>User Details</CardTitle>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* User Info */}
              <div className="flex items-start gap-4 mb-6">
                {selectedUser.profile_photo ? (
                  <img 
                    src={selectedUser.profile_photo} 
                    alt={selectedUser.full_name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-2xl">
                      {selectedUser.full_name.charAt(0)}
                    </span>
                  </div>
                )}
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">{selectedUser.full_name}</h2>
                  <Badge className={
                    selectedUser.user_type === 'provider' ? 'bg-blue-100 text-blue-800' : 
                    selectedUser.user_type === 'customer' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }>
                    {selectedUser.user_type}
                  </Badge>
                  
                  <div className="mt-3 space-y-1 text-sm">
                    <p><strong>Email:</strong> {selectedUser.email}</p>
                    {selectedUser.phone && <p><strong>Phone:</strong> {selectedUser.phone}</p>}
                    {selectedUser.location && <p><strong>Location:</strong> {selectedUser.location}</p>}
                    <p><strong>Joined:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Email Status</p>
                  <Badge className={selectedUser.email_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {selectedUser.email_verified ? '✓ Verified' : 'Not Verified'}
                  </Badge>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Account Status</p>
                  <Badge className={selectedUser.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedUser.is_active !== false ? 'Active' : 'Suspended'}
                  </Badge>
                </div>
              </div>

              {/* Statistics */}
              {selectedUser.stats && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedUser.user_type === 'provider' ? (
                      <>
                        <div className="border rounded-lg p-3">
                          <p className="text-sm text-gray-600">Services</p>
                          <p className="text-2xl font-bold">{selectedUser.stats.services_count}</p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-sm text-gray-600">Bookings</p>
                          <p className="text-2xl font-bold">{selectedUser.stats.bookings_count}</p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-sm text-gray-600">Reviews</p>
                          <p className="text-2xl font-bold">{selectedUser.stats.reviews_count}</p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-sm text-gray-600">Avg Rating</p>
                          <p className="text-2xl font-bold">⭐ {selectedUser.stats.avg_rating}</p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-sm text-gray-600">Wallet Balance</p>
                          <p className="text-2xl font-bold">₦{selectedUser.stats.wallet_balance.toLocaleString()}</p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-sm text-gray-600">Total Earned</p>
                          <p className="text-2xl font-bold">₦{selectedUser.stats.total_earned.toLocaleString()}</p>
                        </div>
                      </>
                    ) : (
                      <div className="border rounded-lg p-3">
                        <p className="text-sm text-gray-600">Total Bookings</p>
                        <p className="text-2xl font-bold">{selectedUser.stats.bookings_count}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {!selectedUser.email_verified && (
                  <Button 
                    onClick={() => handleVerifyUser(selectedUser.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={actionLoading}
                  >
                    <FiCheckCircle className="mr-2" />
                    Verify Email
                  </Button>
                )}
                
                <Button 
                  onClick={() => handleToggleActive(selectedUser.id, selectedUser.is_active !== false)}
                  className={`flex-1 ${selectedUser.is_active !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  disabled={actionLoading}
                >
                  {selectedUser.is_active !== false ? (
                    <>
                      <FiLock className="mr-2" />
                      Suspend Account
                    </>
                  ) : (
                    <>
                      <FiUnlock className="mr-2" />
                      Activate Account
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
