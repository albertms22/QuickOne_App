import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { FiHome, FiUser, FiLogOut, FiBriefcase, FiList, FiMenu, FiX } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50" data-testid="navbar">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" onClick={closeMobileMenu}>
              QuickOne
            </Link>

            {user && (
              <>
                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6">
                  {user.user_type === 'provider' ? (
                    <>
                      <Link
                        to="/provider/dashboard"
                        className={`flex items-center gap-2 hover:text-blue-600 transition-colors ${
                          isActive('/provider/dashboard') ? 'text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                        data-testid="provider-dashboard-link"
                      >
                        <FiHome size={18} /> Dashboard
                      </Link>
                      <Link
                        to="/provider/services"
                        className={`flex items-center gap-2 hover:text-blue-600 transition-colors ${
                          isActive('/provider/services') ? 'text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <FiList size={18} /> My Services
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/customer/dashboard"
                        className={`flex items-center gap-2 hover:text-blue-600 transition-colors ${
                          isActive('/customer/dashboard') ? 'text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                        data-testid="customer-dashboard-link"
                      >
                        <FiHome size={18} /> Dashboard
                      </Link>
                      <Link
                        to="/browse"
                        className={`flex items-center gap-2 hover:text-blue-600 transition-colors ${
                          isActive('/browse') ? 'text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <FiBriefcase size={18} /> Browse
                      </Link>
                    </>
                  )}

                  <Link
                    to="/profile"
                    className={`flex items-center gap-2 hover:text-blue-600 transition-colors ${
                      isActive('/profile') ? 'text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <FiUser size={18} /> Profile
                  </Link>

                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600"
                    data-testid="logout-btn"
                  >
                    <FiLogOut size={18} /> Logout
                  </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Menu - Slides from right */}
      {user && (
        <>
          {/* Overlay */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
              onClick={closeMobileMenu}
            />
          )}
          
          {/* Sidebar */}
          <div className={`fixed top-0 right-0 h-full w-72 bg-white/95 backdrop-blur-lg shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Menu
                </h2>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col space-y-2">
                  {user.user_type === 'provider' ? (
                    <>
                      <Link
                        to="/provider/dashboard"
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all ${
                          isActive('/provider/dashboard') ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium shadow-sm' : 'text-gray-700'
                        }`}
                      >
                        <FiHome size={20} /> Dashboard
                      </Link>
                      <Link
                        to="/provider/services"
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all ${
                          isActive('/provider/services') ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium shadow-sm' : 'text-gray-700'
                        }`}
                      >
                        <FiList size={20} /> My Services
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/customer/dashboard"
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all ${
                          isActive('/customer/dashboard') ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium shadow-sm' : 'text-gray-700'
                        }`}
                      >
                        <FiHome size={20} /> Dashboard
                      </Link>
                      <Link
                        to="/browse"
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all ${
                          isActive('/browse') ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium shadow-sm' : 'text-gray-700'
                        }`}
                      >
                        <FiBriefcase size={20} /> Browse Services
                      </Link>
                    </>
                  )}

                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all ${
                      isActive('/profile') ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium shadow-sm' : 'text-gray-700'
                    }`}
                  >
                    <FiUser size={20} /> Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-all w-full text-left mt-4"
                  >
                    <FiLogOut size={20} /> Logout
                  </button>
                </div>
              </div>

              {/* User Info at Bottom */}
              <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs text-blue-600 mt-1 capitalize">{user.user_type}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;