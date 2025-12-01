import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const categories = [
    { name: 'Home Repairs', icon: '🔧' },
    { name: 'Cleaning', icon: '🧹' },
    { name: 'Tutoring', icon: '📚' },
    { name: 'Beauty', icon: '💅' },
    { name: 'Pet Care', icon: '🐕' },
    { name: 'Gardening', icon: '🌿' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">QuickOne</h1>
          <div className="hidden sm:flex space-x-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button data-testid="get-started-btn">Get Started</Button>
            </Link>
          </div>
          <div className="sm:hidden">
            <Link to="/register">
              <Button size="sm" data-testid="get-started-btn">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-6">
          Find Professional Services <br />
          <span className="text-blue-600">Near You</span>
        </h2>
        <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto">
          Connect with trusted service providers for home repairs, cleaning, tutoring, and more. Book services instantly and pay securely.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="text-lg px-8 w-full sm:w-auto">
              Book a Service
            </Button>
          </Link>
          <Link to="/register">
            <Button size="lg" variant="outline" className="text-lg px-8 w-full sm:w-auto">
              Become a Provider
            </Button>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h3 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Popular Categories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl mb-2">{category.icon}</div>
                <p className="font-medium text-xs md:text-sm">{category.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Why Choose QuickOne?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-4">✅</div>
              <h4 className="text-lg md:text-xl font-bold mb-2">Verified Providers</h4>
              <p className="text-sm md:text-base text-gray-600">All service providers are verified and rated by the community</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-4">💳</div>
              <h4 className="text-lg md:text-xl font-bold mb-2">Secure Payments</h4>
              <p className="text-sm md:text-base text-gray-600">Safe and secure payment processing with multiple options</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-4">⚡</div>
              <h4 className="text-lg md:text-xl font-bold mb-2">Instant Booking</h4>
              <p className="text-sm md:text-base text-gray-600">Book services in seconds and get instant confirmation</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-12 md:py-16 text-center">
        <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Started?</h3>
        <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8">Join thousands of satisfied customers and providers</p>
        <Link to="/register">
          <Button size="lg" className="text-lg px-12 w-full sm:w-auto">
            Sign Up Now
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm md:text-base">&copy; 2025 QuickOne. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
