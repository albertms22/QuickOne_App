import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedType, skipProfileCheck = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check email verification (after login)
  if (!user.email_verified && location.pathname !== '/verify-email') {
    // Allow to continue for now, email verification is shown after registration
  }

  // Check profile completion (unless on profile setup page or skip check)
  // Changed behavior: Show profile setup reminder but don't force it
  // Users can skip and access the app, but incomplete profiles get lower visibility
  if (!skipProfileCheck && !user.profile_completed && location.pathname !== '/profile-setup') {
    // Admin users don't need profile completion
    // For providers and customers, we don't force profile completion anymore
    // They can access the app but will see reminders to complete their profile
  }

  if (allowedType && user.user_type !== allowedType) {
    // Redirect to appropriate dashboard based on user type
    if (user.user_type === 'admin') {
      return <Navigate to="/admin/dashboard" />;
    }
    return <Navigate to={user.user_type === 'provider' ? '/provider/dashboard' : '/customer/dashboard'} />;
  }

  return children;
};

export default ProtectedRoute;