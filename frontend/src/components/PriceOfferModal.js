import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

const PriceOfferModal = ({ isOpen, onClose, booking, currentUser, onOfferSent }) => {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const offerAmount = parseFloat(amount);
    if (!offerAmount || offerAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      if (onOfferSent) {
        await onOfferSent(offerAmount, message);
      }
      onClose();
      setAmount('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  const isProvider = currentUser?.id === booking?.provider_id;
  const currentPrice = booking?.total_amount || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>💰 Make Price Offer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Current Price: <span className="font-semibold">₦{currentPrice.toLocaleString()}</span>
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {isProvider ? 'As the provider, you can propose your price' : 'Make an offer to the provider'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Your Offer (₦)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter your price offer"
                required
                min="1"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows="3"
                placeholder="Add a message with your offer..."
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Sending...' : 'Send Offer'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceOfferModal;
