import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const AdminWithdrawals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user && user.user_type !== 'admin') {
      alert('Access denied. Admin only.');
      navigate('/');
      return;
    }
    loadWithdrawals();
  }, [user, navigate]);

  const loadWithdrawals = async (status = null) => {
    try {
      setLoading(true);
      const response = await adminAPI.getWithdrawals(status);
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (withdrawal, action) => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setAdminNotes('');
    setTransactionRef('');
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!selectedWithdrawal) return;

    try {
      setProcessing(true);
      await adminAPI.updateWithdrawal(selectedWithdrawal.id, {
        action: actionType,
        admin_notes: adminNotes,
        transaction_reference: actionType === 'approve' ? transactionRef : null
      });

      alert(`Withdrawal ${actionType}d successfully!`);
      setShowModal(false);
      loadWithdrawals();
    } catch (error) {
      console.error('Action failed:', error);
      alert(error.response?.data?.detail || 'Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  const WithdrawalCard = ({ withdrawal }) => {
    const netAmount = withdrawal.amount * 0.9; // After 10% commission

    return (
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{withdrawal.provider_name || 'Unknown Provider'}</h3>
            <p className="text-sm text-gray-600">{withdrawal.provider_email}</p>
            {withdrawal.provider_phone && (
              <p className="text-sm text-gray-600">{withdrawal.provider_phone}</p>
            )}
          </div>
          {getStatusBadge(withdrawal.status)}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-500">Amount Requested</p>
            <p className="text-lg font-bold text-gray-900">₦{withdrawal.amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">After 10% Fee</p>
            <p className="text-lg font-bold text-green-600">₦{netAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded mb-3">
          <p className="text-xs text-gray-500 mb-1">Bank Details:</p>
          <p className="text-sm font-medium">{withdrawal.account_name}</p>
          <p className="text-sm text-gray-700">{withdrawal.bank_account_number}</p>
          <p className="text-sm text-gray-600">Bank Code: {withdrawal.bank_code}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>Requested: {new Date(withdrawal.created_at).toLocaleDateString()}</span>
          {withdrawal.completed_at && (
            <span>Processed: {new Date(withdrawal.completed_at).toLocaleDateString()}</span>
          )}
        </div>

        {withdrawal.admin_notes && (
          <div className="bg-blue-50 p-2 rounded mb-3">
            <p className="text-xs text-gray-600">Admin Notes:</p>
            <p className="text-sm">{withdrawal.admin_notes}</p>
          </div>
        )}

        {withdrawal.status === 'pending' && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => openModal(withdrawal, 'approve')}
            >
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-red-600 border-red-600"
              onClick={() => openModal(withdrawal, 'reject')}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    );
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

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved' || w.status === 'success');
  const rejectedWithdrawals = withdrawals.filter(w => w.status === 'failed');

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
            <Link to="/admin/withdrawals" className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-3">
              Withdrawals
            </Link>
            <Link to="/admin/users" className="text-gray-600 hover:text-blue-600 pb-3">
              Users
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Pending ({pendingWithdrawals.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({approvedWithdrawals.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedWithdrawals.length})</TabsTrigger>
                <TabsTrigger value="all">All ({withdrawals.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingWithdrawals.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">No pending withdrawals</p>
                  ) : (
                    pendingWithdrawals.map(withdrawal => (
                      <WithdrawalCard key={withdrawal.id} withdrawal={withdrawal} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="approved">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {approvedWithdrawals.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">No approved withdrawals</p>
                  ) : (
                    approvedWithdrawals.map(withdrawal => (
                      <WithdrawalCard key={withdrawal.id} withdrawal={withdrawal} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rejected">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rejectedWithdrawals.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">No rejected withdrawals</p>
                  ) : (
                    rejectedWithdrawals.map(withdrawal => (
                      <WithdrawalCard key={withdrawal.id} withdrawal={withdrawal} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {withdrawals.map(withdrawal => (
                    <WithdrawalCard key={withdrawal.id} withdrawal={withdrawal} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Action Modal */}
      {showModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {actionType === 'approve' ? 'Approve' : 'Reject'} Withdrawal
            </h2>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Provider:</p>
              <p className="font-semibold">{selectedWithdrawal.provider_name}</p>
              <p className="text-sm text-gray-600 mt-2">Amount:</p>
              <p className="font-semibold text-lg">₦{selectedWithdrawal.amount.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-2">Net Amount (after 10% fee):</p>
              <p className="font-semibold text-lg text-green-600">₦{(selectedWithdrawal.amount * 0.9).toLocaleString()}</p>
            </div>

            {actionType === 'approve' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Bank transfer reference"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Admin Notes {actionType === 'reject' && '(Required)'}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                rows="3"
                placeholder={actionType === 'approve' ? 'Optional notes' : 'Reason for rejection'}
                required={actionType === 'reject'}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAction}
                disabled={processing || (actionType === 'reject' && !adminNotes)}
                className={actionType === 'approve' ? 'flex-1 bg-green-600 hover:bg-green-700' : 'flex-1 bg-red-600 hover:bg-red-700'}
              >
                {processing ? 'Processing...' : `Confirm ${actionType === 'approve' ? 'Approval' : 'Rejection'}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={processing}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
