import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { providerAPI, withdrawalsAPI } from '../api/api';
import { FiCreditCard, FiDollarSign, FiClock } from 'react-icons/fi';

const Withdrawals = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [walletRes, withdrawalsRes] = await Promise.all([
        providerAPI.getWallet(),
        withdrawalsAPI.getAll()
      ]);
      
      setWallet(walletRes.data);
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      if (error.response?.status === 403) {
        alert('Only providers can access withdrawals');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalRequest = async (e) => {
    e.preventDefault();
    setError('');

    const withdrawalAmount = parseFloat(amount);

    // Validations
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (withdrawalAmount < 5000) {
      setError('Minimum withdrawal amount is ₦5,000');
      return;
    }

    if (withdrawalAmount > wallet.balance) {
      setError(`Insufficient balance. Available: ₦${wallet.balance.toLocaleString()}`);
      return;
    }

    if (!wallet.bank_account_number || !wallet.bank_code || !wallet.account_name) {
      setError('Please update your bank details in your profile first');
      return;
    }

    try {
      setRequesting(true);
      await withdrawalsAPI.request({ amount: withdrawalAmount });
      alert('Withdrawal request submitted successfully! It will be processed by admin.');
      setAmount('');
      loadData();
    } catch (error) {
      console.error('Withdrawal request failed:', error);
      setError(error.response?.data?.detail || 'Failed to submit withdrawal request');
    } finally {
      setRequesting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status]}>{status}</Badge>;
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage your earnings and withdrawal requests</p>
        </div>

        {/* Wallet Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                  <p className="text-3xl font-bold text-green-600">₦{wallet?.balance?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <FiCreditCard className="text-green-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Earned</p>
                  <p className="text-3xl font-bold text-blue-600">₦{wallet?.total_earned?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FiDollarSign className="text-blue-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Withdrawals</p>
                  <p className="text-3xl font-bold text-yellow-600">{wallet?.pending_withdrawals || 0}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <FiClock className="text-yellow-600 text-2xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Details Display */}
        {wallet && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent>
              {wallet.bank_account_number ? (
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-semibold">Account Name:</span> {wallet.account_name}</p>
                  <p className="text-sm"><span className="font-semibold">Account Number:</span> {wallet.bank_account_number}</p>
                  <p className="text-sm"><span className="font-semibold">Bank Code:</span> {wallet.bank_code}</p>
                </div>
              ) : (
                <div className="text-amber-600 bg-amber-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">⚠️ Bank details not set</p>
                  <p className="text-sm mb-3">Please update your bank details to request withdrawals</p>
                  <Button size="sm" onClick={() => navigate('/profile')}>Update Profile</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Request Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdrawalRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Amount (₦)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="5000"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: ₦5,000 • Available: ₦{wallet?.balance?.toLocaleString() || '0'}</p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={requesting || !wallet?.bank_account_number}
                className="w-full"
              >
                {requesting ? 'Processing...' : 'Request Withdrawal'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Withdrawals are processed manually by admin within 1-3 business days
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No withdrawal requests yet</p>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-lg">₦{withdrawal.amount.toLocaleString()}</p>
                          {getStatusBadge(withdrawal.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Account:</span> {withdrawal.account_name} - {withdrawal.bank_account_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Requested:</span> {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                        {withdrawal.completed_at && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Completed:</span> {new Date(withdrawal.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Withdrawals;
