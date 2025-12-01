import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, providerAPI, categoriesAPI } from '../api/api';
import Navbar from '../components/Navbar';
import ImageUpload from '../components/ImageUpload';
import MultiImageUpload from '../components/MultiImageUpload';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    profile_photo: null
  });
  const [providerProfile, setProviderProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const categoriesRes = await categoriesAPI.getAll();
      setCategories(categoriesRes.data);

      setUserProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        profile_photo: user.profile_photo || null
      });

      if (user.user_type === 'provider') {
        const profileRes = await providerAPI.getProfile();
        setProviderProfile(profileRes.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserProfileChange = (e) => {
    setUserProfile({ ...userProfile, [e.target.name]: e.target.value });
  };

  const handleProviderProfileChange = (field, value) => {
    setProviderProfile({ ...providerProfile, [field]: value });
  };

  const handleCategoryToggle = (categoryName) => {
    const currentCategories = providerProfile.service_categories || [];
    const newCategories = currentCategories.includes(categoryName)
      ? currentCategories.filter(c => c !== categoryName)
      : [...currentCategories, categoryName];
    
    setProviderProfile({ ...providerProfile, service_categories: newCategories });
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Update user profile
      const userUpdateData = {
        full_name: userProfile.full_name,
        phone: userProfile.phone,
        location: userProfile.location,
        profile_photo: userProfile.profile_photo
      };
      const userRes = await authAPI.updateProfile(userUpdateData);
      updateUser(userRes.data);

      // Update provider profile if applicable
      if (user.user_type === 'provider' && providerProfile) {
        await providerAPI.updateProfile({
          bio: providerProfile.bio,
          service_categories: providerProfile.service_categories,
          pricing_type: providerProfile.pricing_type,
          hourly_rate: providerProfile.hourly_rate,
          fixed_price: providerProfile.fixed_price,
          years_experience: providerProfile.years_experience,
          is_available: providerProfile.is_available,
          portfolio_images: providerProfile.portfolio_images || []
        });
      }

      setSuccess('Profile updated successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-gray-50" data-testid="profile-page">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8 max-w-4xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage your account information</p>
        </div>

        {success && (
          <Alert className="bg-green-50 border-green-200 mb-6">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Basic Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <ImageUpload
                onImageUpload={(url) => setUserProfile({ ...userProfile, profile_photo: url })}
                currentImage={userProfile.profile_photo}
                label="Upload Profile Picture"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={userProfile.full_name}
                onChange={handleUserProfileChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={userProfile.email}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={userProfile.phone}
                onChange={handleUserProfileChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="City, State"
                value={userProfile.location}
                onChange={handleUserProfileChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Provider Profile */}
        {user.user_type === 'provider' && providerProfile && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Provider Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell customers about yourself and your services..."
                  value={providerProfile.bio || ''}
                  onChange={(e) => handleProviderProfileChange('bio', e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {(providerProfile.bio || '').length}/500 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Service Categories</Label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <div key={cat.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={cat.name}
                        checked={providerProfile.service_categories?.includes(cat.name)}
                        onCheckedChange={() => handleCategoryToggle(cat.name)}
                      />
                      <Label htmlFor={cat.name} className="font-normal cursor-pointer">
                        {cat.icon} {cat.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="years_experience">Years of Experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    value={providerProfile.years_experience || ''}
                    onChange={(e) => handleProviderProfileChange('years_experience', parseInt(e.target.value) || null)}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricing_type">Pricing Type</Label>
                  <Select
                    value={providerProfile.pricing_type}
                    onValueChange={(value) => handleProviderProfileChange('pricing_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {providerProfile.pricing_type === 'hourly' && (
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate (₦)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      value={providerProfile.hourly_rate || ''}
                      onChange={(e) => handleProviderProfileChange('hourly_rate', parseFloat(e.target.value) || null)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                {providerProfile.pricing_type === 'fixed' && (
                  <div className="space-y-2">
                    <Label htmlFor="fixed_price">Fixed Price (₦)</Label>
                    <Input
                      id="fixed_price"
                      type="number"
                      value={providerProfile.fixed_price || ''}
                      onChange={(e) => handleProviderProfileChange('fixed_price', parseFloat(e.target.value) || null)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_available"
                  checked={providerProfile.is_available}
                  onCheckedChange={(checked) => handleProviderProfileChange('is_available', checked)}
                />
                <Label htmlFor="is_available" className="font-normal cursor-pointer">
                  I am currently available for bookings
                </Label>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Portfolio Images (Optional)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Showcase your previous work (up to 10 images)
                </p>
                <MultiImageUpload
                  onImagesChange={(images) => handleProviderProfileChange('portfolio_images', images)}
                  currentImages={providerProfile.portfolio_images || []}
                  maxImages={10}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" data-testid="save-profile-btn">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;