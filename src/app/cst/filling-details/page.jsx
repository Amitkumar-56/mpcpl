'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function FillingDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState({
    image1: null,
    image2: null,
    image3: null
  });
  const [imagePreviews, setImagePreviews] = useState({
    image1: null,
    image2: null,
    image3: null
  });

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      fetchRequestDetails(id);
    } else {
      setError('Request ID not found');
      setLoading(false);
    }
  }, [searchParams]);

  const fetchRequestDetails = async (id) => {
    try {
      const response = await fetch(`/api/cst/filling-details?id=${id}`);
      const data = await response.json();
      if (data.success) {
        setRequest(data.request);
        if (data.request.images) {
          const parsedImages = JSON.parse(data.request.images || '{}');
          setImagePreviews({
            image1: parsedImages.image1 || null,
            image2: parsedImages.image2 || null,
            image3: parsedImages.image3 || null
          });
        }
      } else {
        setError(data.message || 'Failed to fetch request details');
      }
    } catch (error) {
      setError('Error fetching request details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (imageKey, file) => {
    if (file) {
      console.log("🖼️ Image Upload Detected:");
      console.log("📎 Image Key:", imageKey);
      console.log("📁 File Name:", file.name);
      console.log("📏 File Size:", file.size, "bytes");
      console.log("🔧 File Type:", file.type);
      
      setImages(prev => ({
        ...prev,
        [imageKey]: file
      }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("✅ Image Preview Generated for:", imageKey);
        setImagePreviews(prev => ({
          ...prev,
          [imageKey]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    console.log("🟡 CST Details Form Submission Started");
    console.log("📋 Request ID:", request?.id);
    console.log("📊 Status:", request?.status);
    console.log("📏 Actual Quantity:", request?.aqty);
    console.log("💬 Remarks:", request?.remark);
    console.log("🖼️ Images:", Object.keys(images).filter(key => images[key]).length, "files uploaded");

    try {
      console.log("🌐 Sending API Request to /api/cst/filling-details");
      
      const formData = new FormData();
      formData.append('id', request.id);
      formData.append('status', request.status);
      formData.append('aqty', request.aqty || '');
      formData.append('remark', request.remark || '');
      Object.keys(images).forEach(key => {
        if (images[key]) {
          formData.append(key, images[key]);
          console.log("📎 Uploading Image:", key, images[key].name);
        }
      });
      
      const response = await fetch('/api/cst/filling-details', {
        method: 'POST',
        body: formData
      });

      console.log("📡 API Response Status:", response.status);
      
      const data = await response.json();
      console.log("📦 API Response Data:", data);

      if (data.success) {
        console.log("✅ CST Details Updated Successfully");
        console.log("🔄 Redirecting to /cst/filling-requests");
        router.push('/cst/filling-requests');
      } else {
        console.log("❌ API Error:", data.message);
        setError(data.message || 'Failed to update request');
      }
    } catch (error) {
      console.error("🔴 Network Error:", error);
      setError('Error updating request: ' + error.message);
    } finally {
      console.log("🏁 Submitting State Set to False");
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    console.log("🔄 Input Change Detected in Details:");
    console.log("📝 Field Name:", name);
    console.log("💭 New Value:", value);
    
    // ✅ Automatic quantity update logic
    if (name === 'aqty') {
      console.log("⛽ Actual Quantity Updated - Automatic Update Triggered");
      console.log("📏 Old Actual Quantity:", request?.aqty);
      console.log("📏 New Actual Quantity:", value);
    }
    
    if (name === 'status') {
      console.log("📊 Status Updated:", value);
    }
    
    setRequest(prev => ({
      ...prev,
      [name]: value
    }));
    
    console.log("✅ Request State Updated");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 max-w-md">
          <div className="text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Filling Request Details</h1>
              <Link
                href="/cst/filling-requests"
                className="text-blue-600 hover:text-blue-800"
              >
                Back to Requests
              </Link>
            </div>
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
              <div className="text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request ID
                </label>
                <input
                  type="text"
                  value={request?.rid || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product
                </label>
                <input
                  type="text"
                  value={request?.product_name || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station
                </label>
                <input
                  type="text"
                  value={request?.station_name || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={request?.customer_name || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Number
                </label>
                <input
                  type="text"
                  value={request?.phone || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (Ltr)
                </label>
                <input
                  type="text"
                  value={request?.qty || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Quantity (Ltr)
                </label>
                <input
                  type="number"
                  name="aqty"
                  value={request?.aqty || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter actual quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date & Time
                </label>
                <input
                  type="text"
                  value={request?.created_at ? new Date(request.created_at).toLocaleString() : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={request?.status || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                name="remark"
                value={request?.remark || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter remarks"
              />
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image 1
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {imagePreviews.image1 ? (
                      <div className="relative">
                        <img
                          src={imagePreviews.image1}
                          alt="Image 1"
                          className="w-full h-48 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreviews(prev => ({ ...prev, image1: null }));
                            setImages(prev => ({ ...prev, image1: null }));
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <label htmlFor="image1" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Click to upload
                          </span>
                          <input
                            id="image1"
                            name="image1"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleImageChange('image1', e.target.files[0])}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image 2
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {imagePreviews.image2 ? (
                      <div className="relative">
                        <img
                          src={imagePreviews.image2}
                          alt="Image 2"
                          className="w-full h-48 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreviews(prev => ({ ...prev, image2: null }));
                            setImages(prev => ({ ...prev, image2: null }));
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <label htmlFor="image2" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Click to upload
                          </span>
                          <input
                            id="image2"
                            name="image2"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleImageChange('image2', e.target.files[0])}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image 3
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {imagePreviews.image3 ? (
                      <div className="relative">
                        <img
                          src={imagePreviews.image3}
                          alt="Image 3"
                          className="w-full h-48 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreviews(prev => ({ ...prev, image3: null }));
                            setImages(prev => ({ ...prev, image3: null }));
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <label htmlFor="image3" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Click to upload
                          </span>
                          <input
                            id="image3"
                            name="image3"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleImageChange('image3', e.target.files[0])}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              {/* ✅ View Mode - Read Only */}
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back to Requests
              </button>
              
              {/* ✅ Edit Button - Automatic Edit Enable */}
              {request?.status === 'Pending' && (
                <button
                  type="button"
                  onClick={() => {
                    console.log("🔧 Edit Button Clicked - Automatic Edit Mode Enabled");
                    console.log("📋 Request ID:", request?.id);
                    console.log("🔄 Enabling Edit Mode for All Fields");
                    
                    // Enable all input fields
                    const inputs = document.querySelectorAll('input[name="aqty"], select[name="status"], textarea[name="remark"]');
                    inputs.forEach(input => {
                      input.removeAttribute('readonly');
                      input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
                      input.classList.add('bg-white', 'text-gray-900');
                    });
                    
                    // Show submit button
                    const submitBtn = document.querySelector('button[type="submit"]');
                    if (submitBtn) {
                      submitBtn.style.display = 'inline-flex';
                    }
                    
                    // Hide edit button
                    const editBtn = document.querySelector('button[onclick*="Edit Button Clicked"]');
                    if (editBtn) {
                      editBtn.style.display = 'none';
                    }
                    
                    console.log("✅ Edit Mode Enabled Successfully");
                  }}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Edit Request
                </button>
              )}
              
              {/* ✅ Submit Button - Hidden by default, shown when edit mode enabled */}
              <button
                type="submit"
                disabled={submitting}
                style={{ display: 'none' }}
                className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  submitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </span>
                ) : 'Update Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <FillingDetailsContent />
    </Suspense>
  );
}
