import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { providerAPI, reviewsAPI } from '../api/api';
import Navbar from '../components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FiStar, FiMapPin, FiDollarSign, FiClock, FiBriefcase } from 'react-icons/fi';

const ProviderDetail = () => {
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProvider();
  }, [providerId]);

  const loadProvider = async () => {
    try {
      const response = await providerAPI.getDetail(providerId);
      setProvider(response.data);
    } catch (error) {
      console.error('Failed to load provider:', error);
    } finally {
      setLoading(false);
    }
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

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Provider not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="provider-detail">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        {/* Provider Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {provider.user.profile_photo ? (
                <img 
                  src={provider.user.profile_photo} 
                  alt={provider.user.full_name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-5xl font-bold">
                  {provider.user.full_name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{provider.user.full_name}</h1>
                    {provider.user.location && (
                      <p className="text-gray-600 flex items-center gap-2">
                        <FiMapPin /> {provider.user.location}
                      </p>
                    )}
                  </div>
                  {provider.profile.is_available && (
                    <Badge className="bg-green-100 text-green-800">Available</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <FiStar className="text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{provider.profile.average_rating.toFixed(1)}</span>
                    <span className="text-gray-500">({provider.profile.total_reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiBriefcase className="text-gray-500" />
                    <span className="text-gray-700">{provider.profile.total_bookings} completed jobs</span>
                  </div>
                  {provider.profile.years_experience && (
                    <div className="flex items-center gap-2">
                      <FiClock className="text-gray-500" />
                      <span className="text-gray-700">{provider.profile.years_experience} years experience</span>
                    </div>
                  )}
                </div>

                {provider.profile.bio && (
                  <p className="text-gray-700 mb-4">{provider.profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {provider.profile.service_categories.map((cat, idx) => (
                    <Badge key={idx} variant="outline">{cat}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Section */}
        {provider.profile.portfolio_images && provider.profile.portfolio_images.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {provider.profile.portfolio_images.map((image, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden border">
                    <img 
                      src={image} 
                      alt={`Portfolio ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services and Reviews */}
        <Tabs defaultValue="services">
          <TabsList className="mb-4">
            <TabsTrigger value="services">Services ({provider.services.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({provider.reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            {provider.services.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No services available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {provider.services.map((service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow overflow-hidden" data-testid={`service-${service.id}`}>
                    {service.images && service.images.length > 0 && (
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={service.images[0]} 
                          alt={service.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                          <Badge variant="outline">{service.category}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">₦{service.price.toLocaleString()}</p>
                          {service.duration && (
                            <p className="text-sm text-gray-500">{service.duration} min</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">{service.description}</p>
                      <Link to={`/book/${service.id}`}>
                        <Button className="w-full" data-testid={`book-service-${service.id}`}>Book This Service</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {provider.reviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No reviews yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {provider.reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{review.customer_name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <FiStar
                                key={i}
                                className={`text-sm ${
                                  i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProviderDetail;
