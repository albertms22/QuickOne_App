import React, { useState, useEffect } from 'react';
import { providerAPI, categoriesAPI } from '../api/api';
import Navbar from '../components/Navbar';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Link } from 'react-router-dom';
import { FiSearch, FiMapPin, FiStar } from 'react-icons/fi';

const BrowseProviders = () => {
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [maxDistance, setMaxDistance] = useState(null); // null = show all
  const [sortBy, setSortBy] = useState('distance');

  useEffect(() => {
    getUserLocation();
    loadCategories();
  }, []);

  useEffect(() => {
    if (userLocation || maxDistance === null) {
      loadData();
    }
  }, [userLocation, maxDistance]);

  useEffect(() => {
    filterProviders();
  }, [searchTerm, selectedCategory, providers]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Load data anyway without location
          loadData();
        }
      );
    } else {
      loadData();
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesRes = await categoriesAPI.getAll();
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
      }
      if (maxDistance) {
        params.max_distance = maxDistance;
      }
      
      const providersRes = await providerAPI.getAll(params);
      setProviders(providersRes.data);
      setFilteredProviders(providersRes.data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.profile.bio?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => 
        p.profile.service_categories.includes(selectedCategory)
      );
    }

    setFilteredProviders(filtered);
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
    <div className="min-h-screen bg-gray-50" data-testid="browse-providers">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Browse Service Providers</h1>
          <p className="text-sm md:text-base text-gray-600">Find trusted professionals for your needs</p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search providers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {userLocation && (
                <Select value={maxDistance?.toString() || 'all'} onValueChange={(val) => setMaxDistance(val === 'all' ? null : parseInt(val))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Distance</SelectItem>
                    <SelectItem value="5">Within 5 km</SelectItem>
                    <SelectItem value="10">Within 10 km</SelectItem>
                    <SelectItem value="20">Within 20 km</SelectItem>
                    <SelectItem value="50">Within 50 km</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4">
          <p className="text-gray-600">
            {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {filteredProviders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No providers found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Link key={provider.user.id} to={`/provider/${provider.user.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer" data-testid={`provider-card-${provider.user.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {provider.user.profile_photo ? (
                        <img 
                          src={provider.user.profile_photo} 
                          alt={provider.user.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                          {provider.user.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{provider.user.full_name}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {provider.user.location && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <FiMapPin className="text-xs" /> {provider.user.location}
                            </p>
                          )}
                          {provider.distance_km !== null && provider.distance_km !== undefined && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                              📍 {provider.distance_km} km away
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {provider.profile.bio && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{provider.profile.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {provider.profile.service_categories.slice(0, 3).map((cat, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {cat}
                        </span>
                      ))}
                      {provider.profile.service_categories.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          +{provider.profile.service_categories.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <FiStar className="text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{provider.profile.average_rating.toFixed(1)}</span>
                        <span className="text-gray-500 text-sm">({provider.profile.total_reviews})</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {provider.services_count} service{provider.services_count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {provider.profile.is_available ? (
                      <div className="mt-3">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✓ Available
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          Currently Unavailable
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseProviders;