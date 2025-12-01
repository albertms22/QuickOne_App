import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories')
};

// Provider API
export const providerAPI = {
  getProfile: () => api.get('/provider/profile'),
  updateProfile: (data) => api.put('/provider/profile', data),
  getAll: (params) => api.get('/providers', { params }),
  getDetail: (id) => api.get(`/providers/${id}`),
  getWallet: () => api.get('/provider/wallet')
};

// Services API
export const servicesAPI = {
  create: (data) => api.post('/services', data),
  getAll: (params) => api.get('/services', { params }),
  getOne: (id) => api.get(`/services/${id}`),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
  generateDescription: (data) => api.post('/ai/generate-description', data)
};

// Bookings API
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  getAll: () => api.get('/bookings'),
  getOne: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, status) => api.put(`/bookings/${id}/status`, { status }),
  // Bargaining endpoints
  makeOffer: (bookingId, data) => api.post(`/bookings/${bookingId}/offer-price`, data),
  getOffers: (bookingId) => api.get(`/bookings/${bookingId}/offers`),
  respondToOffer: (offerId, data) => api.put(`/offers/${offerId}/respond`, data)
};

// Messages API
export const messagesAPI = {
  getAll: (bookingId) => api.get(`/messages/${bookingId}`)
};

// Reviews API
export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getProviderReviews: (providerId) => api.get(`/reviews/provider/${providerId}`)
};

// Payments API
export const paymentsAPI = {
  initialize: (bookingId) => api.post('/payments/initialize', null, { params: { booking_id: bookingId } }),
  verify: (reference) => api.post(`/payments/verify/${reference}`)
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`)
};

// Transactions API
export const transactionsAPI = {
  getAll: () => api.get('/transactions')
};

// Withdrawals API
export const withdrawalsAPI = {
  request: (data) => api.post('/withdrawals/request', data),
  getAll: () => api.get('/withdrawals')
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getWithdrawals: (status) => api.get('/admin/withdrawals', { params: { status } }),
  updateWithdrawal: (id, data) => api.put(`/admin/withdrawals/${id}`, data),
  getUsers: (user_type) => api.get('/admin/users', { params: { user_type } }),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  verifyUser: (userId) => api.put(`/admin/users/${userId}/verify`),
  toggleUserActive: (userId) => api.put(`/admin/users/${userId}/toggle-active`),
  getActivity: (limit) => api.get('/admin/activity', { params: { limit } })
};

export default api;