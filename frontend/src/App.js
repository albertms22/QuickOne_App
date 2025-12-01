import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ProviderDashboard from './pages/ProviderDashboard';
import ProviderServices from './pages/ProviderServices';
import CustomerDashboard from './pages/CustomerDashboard';
import BrowseProviders from './pages/BrowseProviders';
import ProviderDetail from './pages/ProviderDetail';
import BookService from './pages/BookService';
import Chat from './pages/Chat';
import Review from './pages/Review';
import Profile from './pages/Profile';
import TestImages from './pages/TestImages';
import Payment from './pages/Payment';
import PaymentCallback from './pages/PaymentCallback';
import Withdrawals from './pages/Withdrawals';
import AdminDashboard from './pages/AdminDashboard';
import AdminWithdrawals from './pages/AdminWithdrawals';
import AdminUsers from './pages/AdminUsers';
import ProfileSetup from './pages/ProfileSetup';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Profile Setup (Skip profile check for this route) */}
          <Route
            path="/profile-setup"
            element={
              <ProtectedRoute skipProfileCheck={true}>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />

          {/* Provider Routes */}
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute allowedType="provider">
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/services"
            element={
              <ProtectedRoute allowedType="provider">
                <ProviderServices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/profile-setup"
            element={
              <ProtectedRoute allowedType="provider">
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/withdrawals"
            element={
              <ProtectedRoute allowedType="provider">
                <Withdrawals />
              </ProtectedRoute>
            }
          />

          {/* Customer Routes */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute allowedType="customer">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/browse"
            element={
              <ProtectedRoute allowedType="customer">
                <BrowseProviders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/:providerId"
            element={
              <ProtectedRoute allowedType="customer">
                <ProviderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book/:serviceId"
            element={
              <ProtectedRoute allowedType="customer">
                <BookService />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review/:bookingId"
            element={
              <ProtectedRoute allowedType="customer">
                <Review />
              </ProtectedRoute>
            }
          />
          
          {/* Payment Route */}
          <Route
            path="/payment/:bookingId"
            element={
              <ProtectedRoute allowedType="customer">
                <Payment />
              </ProtectedRoute>
            }
          />
          
          {/* Payment Callback Route */}
          <Route
            path="/payment/callback"
            element={
              <ProtectedRoute allowedType="customer">
                <PaymentCallback />
              </ProtectedRoute>
            }
          />

          {/* Shared Routes */}
          <Route
            path="/chat/:bookingId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          
          {/* Test Route - Remove in production */}
          <Route
            path="/test-images"
            element={
              <ProtectedRoute>
                <TestImages />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedType="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/withdrawals"
            element={
              <ProtectedRoute allowedType="admin">
                <AdminWithdrawals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedType="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
