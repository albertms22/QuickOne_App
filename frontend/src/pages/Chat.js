import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messagesAPI, bookingsAPI } from '../api/api';
import Navbar from '../components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FiSend, FiDollarSign } from 'react-icons/fi';
import PriceOfferModal from '../components/PriceOfferModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Chat = () => {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [booking, setBooking] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [priceOffers, setPriceOffers] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectWebSocket = () => {
    const wsUrl = BACKEND_URL.replace('http', 'ws') + `/api/ws/chat/${bookingId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    setWs(websocket);
  };

  const loadData = async () => {
    try {
      const [messagesRes, bookingRes, offersRes] = await Promise.all([
        messagesAPI.getAll(bookingId),
        bookingsAPI.getOne(bookingId),
        bookingsAPI.getOffers(bookingId).catch(() => ({ data: [] }))
      ]);
      setMessages(messagesRes.data);
      setBooking(bookingRes.data);
      setPriceOffers(offersRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    const messageData = {
      sender_id: user.id,
      text: newMessage.trim()
    };

    ws.send(JSON.stringify(messageData));
    setNewMessage('');
  };

  const handleSendOffer = async (amount, message) => {
    try {
      await bookingsAPI.makeOffer(bookingId, {
        offered_price: amount,
        message: message
      });
      // Reload offers and booking data
      const [offersRes, bookingRes] = await Promise.all([
        bookingsAPI.getOffers(bookingId),
        bookingsAPI.getOne(bookingId)
      ]);
      setPriceOffers(offersRes.data);
      setBooking(bookingRes.data);
    } catch (error) {
      console.error('Failed to send offer:', error);
      throw error;
    }
  };

  const handleRespondToOffer = async (offerId, response, counterAmount = null) => {
    try {
      const data = {
        response: response,
        ...(counterAmount && { counter_offer: counterAmount })
      };
      await bookingsAPI.respondToOffer(offerId, data);
      // Reload offers and booking data
      const [offersRes, bookingRes] = await Promise.all([
        bookingsAPI.getOffers(bookingId),
        bookingsAPI.getOne(bookingId)
      ]);
      setPriceOffers(offersRes.data);
      setBooking(bookingRes.data);
    } catch (error) {
      console.error('Failed to respond to offer:', error);
      alert(error.response?.data?.detail || 'Failed to respond to offer');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
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
    <div className="min-h-screen bg-gray-50" data-testid="chat-page">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8 max-w-4xl">
        {/* Booking Info */}
        {booking && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Booking Chat</h3>
                  <p className="text-sm text-gray-600">
                    📅 {booking.preferred_date} at {booking.preferred_time}
                  </p>
                  {booking.price_negotiated && booking.agreed_price && (
                    <p className="text-sm text-green-600 font-semibold mt-1">
                      💰 Agreed Price: ₦{booking.agreed_price.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {getStatusBadge(booking.status)}
                  {!booking.price_negotiated && (
                    <Button 
                      size="sm" 
                      onClick={() => setShowOfferModal(true)}
                      className="mt-2"
                    >
                      <FiDollarSign className="mr-1" />
                      Negotiate Price
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Price Negotiation History */}
        {priceOffers.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="border-b">
              <CardTitle className="text-base">💬 Price Negotiation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {priceOffers.map((offer, index) => {
                const isOwnOffer = offer.offered_by === user.id;
                const isProvider = user.id === booking.provider_id;
                const canRespond = !isOwnOffer && offer.status === 'pending';
                
                return (
                  <div 
                    key={offer.id} 
                    className={`border rounded-lg p-3 ${
                      offer.status === 'accepted' ? 'bg-green-50 border-green-300' : 
                      offer.status === 'rejected' ? 'bg-red-50 border-red-300' : 
                      'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {isOwnOffer ? 'You' : (isProvider ? 'Customer' : 'Provider')} offered:
                        </p>
                        <p className="text-xl font-bold text-blue-600">
                          ₦{offer.offered_price.toLocaleString()}
                        </p>
                      </div>
                      <Badge className={
                        offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {offer.status}
                      </Badge>
                    </div>
                    
                    {offer.message && (
                      <p className="text-sm text-gray-600 mb-2">"{offer.message}"</p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      {new Date(offer.created_at).toLocaleString()}
                    </p>

                    {canRespond && (
                      <div className="mt-3 flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleRespondToOffer(offer.id, 'accept')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          ✓ Accept
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            const counter = prompt('Enter your counter offer amount (₦):');
                            if (counter && !isNaN(counter) && parseFloat(counter) > 0) {
                              handleRespondToOffer(offer.id, 'counter', parseFloat(counter));
                            }
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          ↔ Counter
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleRespondToOffer(offer.id, 'reject')}
                          variant="outline"
                          className="flex-1 text-red-600 hover:text-red-700"
                        >
                          ✗ Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Chat Card */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user.id;
                return (
                  <div
                    key={index}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${index}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {message.sender_name}
                        </p>
                      )}
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Message Input */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                data-testid="message-input"
              />
              <Button type="submit" disabled={!newMessage.trim()} data-testid="send-message-btn">
                <FiSend />
              </Button>
            </form>
          </div>
        </Card>

        {/* Price Offer Modal */}
        <PriceOfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          booking={booking}
          currentUser={user}
          onOfferSent={handleSendOffer}
        />
      </div>
    </div>
  );
};

export default Chat;
