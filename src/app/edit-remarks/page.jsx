'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Wrap the main component with Suspense
function EditRemarksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [remark, setRemark] = useState({
    remarks_name: '',
    price: '',
    image: null,
    imagePreview: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid remark ID');
      setLoading(false);
      return;
    }

    fetchRemark();
  }, [id]);

  const fetchRemark = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/remarks?id=${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch remark');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setRemark({
          remarks_name: data.data.remarks_name || '',
          price: data.data.price || '',
          image: null,
          imagePreview: data.data.image || null
        });
      } else {
        throw new Error(data.error || 'Remark not found');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setRemark({
          ...remark,
          image: file,
          imagePreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!remark.remarks_name.trim()) {
      setError('Remark name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('remarks_name', remark.remarks_name.trim());
      formData.append('price', remark.price || '');
      
      if (remark.image) {
        formData.append('image', remark.image);
      }

      const response = await fetch(`/api/remarks?id=${id}`, {
        method: 'PUT',
        body: formData, // Use FormData instead of JSON
      });

      if (!response.ok) {
        throw new Error('Failed to update remark');
      }

      const data = await response.json();
      
      if (data.success) {
        router.push('/deepo-items');
      } else {
        throw new Error(data.error || 'Failed to update remark');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !remark.remarks_name) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Edit Remark</h1>
                <p className="text-gray-600 mt-1">Update remark information</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label htmlFor="remarks_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Remark Name *
                  </label>
                  <input
                    type="text"
                    id="remarks_name"
                    value={remark.remarks_name}
                    onChange={(e) => setRemark({ ...remark, remarks_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter remark name"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Price (Optional)
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={remark.price}
                    onChange={(e) => setRemark({ ...remark, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter price (optional)"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                    Image (Optional)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      id="image"
                      onChange={handleImageChange}
                      accept="image/*"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    
                    {/* Image Preview */}
                    {(remark.imagePreview || remark.image) && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">Current Image:</p>
                        <div className="relative w-32 h-32 border border-gray-300 rounded-lg overflow-hidden">
                          <img
                            src={remark.imagePreview || `/uploads/${remark.image}`}
                            alt="Remark preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setRemark({ ...remark, image: null, imagePreview: null })}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Update Remark'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component wrapped with Suspense
export default function EditRemarksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <EditRemarksPageContent />
    </Suspense>
  );
}