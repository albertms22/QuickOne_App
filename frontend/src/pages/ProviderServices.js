import React, { useState, useEffect } from 'react';
import { servicesAPI, categoriesAPI } from '../api/api';
import Navbar from '../components/Navbar';
import MultiImageUpload from '../components/MultiImageUpload';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { FiEdit2, FiTrash2, FiPlus, FiZap } from 'react-icons/fi';

const ProviderServices = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    duration: '',
    images: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        servicesAPI.getAll(),
        categoriesAPI.getAll()
      ]);
      setServices(servicesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title || !formData.category) {
      alert('Please enter service title and select category first');
      return;
    }

    setGeneratingDesc(true);
    try {
      const response = await servicesAPI.generateDescription({
        title: formData.title,
        category: formData.category
      });
      setFormData({ ...formData, description: response.data.description });
    } catch (error) {
      console.error('Failed to generate description:', error);
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        duration: formData.duration ? parseInt(formData.duration) : null
      };

      if (editingService) {
        await servicesAPI.update(editingService.id, data);
      } else {
        await servicesAPI.create(data);
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price.toString(),
      duration: service.duration?.toString() || '',
      images: service.images || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await servicesAPI.delete(serviceId);
        loadData();
      } catch (error) {
        console.error('Failed to delete service:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      price: '',
      duration: '',
      images: []
    });
    setEditingService(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
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
    <div className="min-h-screen bg-gray-50" data-testid="provider-services">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Services</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage your service offerings</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} data-testid="add-service-btn">
                <FiPlus className="mr-2" /> Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Service Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Professional House Cleaning"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateDescription}
                      disabled={generatingDesc}
                      data-testid="generate-description-btn"
                    >
                      <FiZap className="mr-2" />
                      {generatingDesc ? 'Generating...' : 'AI Generate'}
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your service..."
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-500">Tip: Use AI Generate for a professional description</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₦)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="5000"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="60"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Service Images (Optional)</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Add photos or videos to showcase your service (up to 5 images)
                  </p>
                  <MultiImageUpload
                    onImagesChange={(images) => setFormData({ ...formData, images })}
                    currentImages={formData.images}
                    maxImages={5}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="save-service-btn">
                    {editingService ? 'Update Service' : 'Add Service'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">You haven't added any services yet</p>
              <Button onClick={() => setDialogOpen(true)}>
                <FiPlus className="mr-2" /> Add Your First Service
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow overflow-hidden" data-testid={`service-card-${service.id}`}>
                {service.images && service.images.length > 0 && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={service.images[0]} 
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{service.title}</CardTitle>
                      <p className="text-sm text-gray-500">{service.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(service)}>
                        <FiEdit2 />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(service.id)}>
                        <FiTrash2 className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{service.description}</p>
                  {service.images && service.images.length > 1 && (
                    <p className="text-xs text-gray-500 mb-2">+{service.images.length - 1} more photos</p>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">₦{service.price.toLocaleString()}</p>
                      {service.duration && (
                        <p className="text-xs text-gray-500">{service.duration} minutes</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderServices;