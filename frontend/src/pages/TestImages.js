import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import ImageUpload from '../components/ImageUpload';
import MultiImageUpload from '../components/MultiImageUpload';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

const TestImages = () => {
  const [singleImage, setSingleImage] = useState(null);
  const [multiImages, setMultiImages] = useState([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Image Upload Test Page</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Single Image Upload (Profile Picture)</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              onImageUpload={(url) => {
                setSingleImage(url);
                console.log('Single image uploaded:', url);
              }}
              currentImage={singleImage}
              label="Upload Profile Picture"
            />
            {singleImage && (
              <p className="mt-2 text-sm text-green-600">✅ Image uploaded successfully!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Multiple Image Upload (Service Gallery)</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiImageUpload
              onImagesChange={(images) => {
                setMultiImages(images);
                console.log('Multiple images:', images);
              }}
              currentImages={multiImages}
              maxImages={5}
            />
            {multiImages.length > 0 && (
              <p className="mt-2 text-sm text-green-600">
                ✅ {multiImages.length} image(s) uploaded successfully!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestImages;
