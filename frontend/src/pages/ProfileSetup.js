import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import ImageUpload from '../components/ImageUpload';
import MultiImageUpload from '../components/MultiImageUpload';
import api, { providerAPI } from '../api/api';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location: '',
    profile_photo: null
  });

  // Provider-specific fields
  const [providerData, setProviderData] = useState({
    service_categories: [],
    portfolio_images: [],
    years_experience: '',
    bio: '',
    hourly_rate: '',
    pricing_type: 'hourly'
  });

  const serviceCategories = [
    'Home Repairs',
    'Cleaning Services',
    'Tutoring & Education',
    'Beauty & Wellness',
    'Pet Care',
    'Gardening & Landscaping',
    'Moving & Delivery',
    'Tech Support',
    'Event Services',
    'Other'
  ];

  const experienceLevels = [
    { value: '0', label: 'Beginner (0-2 years)' },
    { value: '3', label: 'Intermediate (3-5 years)' },
    { value: '6', label: 'Expert (5+ years)' }
  ];

  useEffect(() => {
    loadProfileStatus();
  }, []);

  const loadProfileStatus = async () => {
    try {
      const response = await api.get('/auth/profile-status');
      setProfileStatus(response.data);

      // Pre-fill existing data
      if (user) {
        setFormData({
          full_name: user.full_name || '',
          phone: user.phone || '',
          location: user.location || '',
          profile_photo: user.profile_photo || null
        });

        // Load provider profile if provider
        if (user.user_type === 'provider') {
          try {
            const profileRes = await providerAPI.getProfile();
            const profile = profileRes.data;
            setProviderData({
              service_categories: profile.service_categories || [],
              portfolio_images: profile.portfolio_images || [],
              years_experience: profile.years_experience?.toString() || '',
              bio: profile.bio || '',
              hourly_rate: profile.hourly_rate?.toString() || '',
              pricing_type: profile.pricing_type || 'hourly'
            });
          } catch (err) {
            console.error('Failed to load provider profile:', err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load profile status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProviderChange = (e) => {
    setProviderData({ ...providerData, [e.target.name]: e.target.value });
  };

  const handleCategoryToggle = (category) => {
    const current = providerData.service_categories;
    if (current.includes(category)) {
      setProviderData({
        ...providerData,
        service_categories: current.filter(c => c !== category)
      });
    } else {
      setProviderData({
        ...providerData,
        service_categories: [...current, category]
      });
    }
  };

  const handleSkip = () => {
    // Allow users to skip and access the app even without completing profile
    if (user.user_type === 'provider') {
      navigate('/provider/dashboard');
    } else {
      navigate('/customer/dashboard');
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      // Update user profile (Fixed: changed /users/profile to /auth/profile)
      await api.put('/auth/profile', {
        full_name: formData.full_name,
        phone: formData.phone,
        location: formData.location,
        profile_photo: formData.profile_photo
      });

      // Update provider profile if provider
      if (user.user_type === 'provider') {
        await providerAPI.updateProfile({
          service_categories: providerData.service_categories,
          portfolio_images: providerData.portfolio_images,
          years_experience: parseInt(providerData.years_experience) || 0,
          bio: providerData.bio,
          hourly_rate: parseFloat(providerData.hourly_rate) || 0,
          pricing_type: providerData.pricing_type
        });
      }

      // Check completion status
      const statusRes = await api.get('/auth/profile-status');
      
      if (statusRes.data.profile_completed) {
        // Refresh user data
        await refreshUser();
        
        // Redirect to appropriate dashboard
        if (user.user_type === 'provider') {
          navigate('/provider/dashboard');
        } else {
          navigate('/customer/dashboard');
        }
      } else {
        setError(`Please complete all required fields: ${statusRes.data.missing_fields.join(', ')}`);
        setProfileStatus(statusRes.data);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err.response?.data?.detail || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isProvider = user?.user_type === 'provider';
  const completionPercentage = profileStatus?.completion_percentage || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <p className="text-gray-600 mt-2">
              Complete your profile to start using QuickOne
            </p>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Profile Completion</span>
                <span className="text-sm font-bold text-blue-600">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                {/* Profile Photo */}
                <div>
                  <Label>Profile Picture ✅ REQUIRED</Label>
                  <ImageUpload
                    currentImage={formData.profile_photo}
                    onImageUpload={(url) => setFormData({ ...formData, profile_photo: url })}
                    label="Upload Profile Photo"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 200x200 pixels, Max 5MB</p>
                </div>

                {/* Full Name */}
                <div>
                  <Label htmlFor="full_name">Full Name ✅ REQUIRED</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone">Phone Number ✅ REQUIRED</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+234 XXX XXX XXXX"
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <Label htmlFor="location">Location (City, State) ✅ REQUIRED</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., Lagos, Nigeria"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Provider-Specific Fields */}
            {isProvider && (
              <>
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Service Provider Information</h3>

                  {/* Service Categories */}
                  <div className="mb-6">
                    <Label>Service Categories ✅ REQUIRED (Select at least one)</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {serviceCategories.map((category) => (
                        <label 
                          key={category}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            providerData.service_categories.includes(category)
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-white border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={providerData.service_categories.includes(category)}
                            onChange={() => handleCategoryToggle(category)}
                            className="mr-2"
                          />
                          <span className="text-sm">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio */}
                  <div className="mb-6">
                    <Label>Your Portfolio ✅ REQUIRED (Minimum 3 photos)</Label>
                    <MultiImageUpload
                      currentImages={providerData.portfolio_images}
                      onImagesChange={(images) => setProviderData({ ...providerData, portfolio_images: images })}
                      maxImages={10}
                      label="Upload Portfolio Photos"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {providerData.portfolio_images.length} / 3 minimum uploaded
                    </p>
                  </div>

                  {/* Experience Level */}
                  <div className="mb-6">
                    <Label htmlFor="years_experience">Experience Level ✅ REQUIRED</Label>
                    <select
                      id="years_experience"
                      name="years_experience"
                      value={providerData.years_experience}
                      onChange={handleProviderChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Select experience level</option>
                      {experienceLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* About You (Optional) */}
                  <div className="mb-6">
                    <Label htmlFor="bio">About You (Optional)</Label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={providerData.bio}
                      onChange={handleProviderChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows="4"
                      maxLength="500"
                      placeholder="Describe your services and expertise (max 500 characters)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {providerData.bio.length} / 500 characters
                    </p>
                  </div>

                  {/* Pricing (Optional) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hourly_rate">Hourly Rate (Optional)</Label>
                      <Input
                        id="hourly_rate"
                        name="hourly_rate"
                        type="number"
                        value={providerData.hourly_rate}
                        onChange={handleProviderChange}
                        placeholder="₦0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pricing_type">Price Type</Label>
                      <select
                        id="pricing_type"
                        name="pricing_type"
                        value={providerData.pricing_type}
                        onChange={handleProviderChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : completionPercentage === 100 ? 'Complete Profile' : 'Save Progress'}
              </Button>
              
              <Button
                onClick={handleSkip}
                disabled={saving}
                variant="outline"
                className="flex-1"
              >
                Skip for Now
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              {completionPercentage < 100 
                ? 'You can skip and complete your profile later. However, complete profiles get more visibility!'
                : 'All required fields completed! Click "Complete Profile" to continue'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;
