'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading component
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading record data...</p>
      </div>
    </div>
  );
}

// Form skeleton loader
function FormSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
          </div>
          
          {/* Basic Information Skeleton */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <div className="h-6 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading Details Skeleton */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <div className="h-6 bg-gray-200 rounded w-40 mb-6 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button Skeleton */}
          <div className="flex justify-center">
            <div className="h-12 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main form component wrapped in Suspense
function ShipmentFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  
  const [formData, setFormData] = useState({
    tanker_number: '',
    driver_name: '',
    dispatch_from: '',
    driver_mobile: '',
    empty_weight_loading: '',
    loaded_weight: '',
    net_weight: '',
    final_loading_datetime: '',
    entered_by_loading: '',
    seal1_loading: '',
    seal2_loading: '',
    seal_datetime_loading: '',
    sealed_by_loading: '',
    density_loading: '',
    temperature_loading: '',
    timing_loading: '',
    customer_name: '',
    empty_weight_unloading: '',
    loaded_weight_unloading: '',
    net_weight_unloading: '',
    final_unloading_datetime: '',
    entered_by_unloading: '',
    seal1_unloading: '',
    seal2_unloading: '',
    seal_datetime_unloading: '',
    sealed_by_unloading: '',
    density_unloading: '',
    temperature_unloading: '',
    timing_unloading: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (id && id > 0) {
      fetchRecordData();
    }
  }, [id]);

  const fetchRecordData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shipment-records?id=${id}`);
      const result = await response.json();

      if (result.success) {
        const record = result.data;
        
        // Format datetime fields for input
        const formatDateTime = (datetime) => {
          if (!datetime || datetime === '0000-00-00 00:00:00') return '';
          const date = new Date(datetime);
          return date.toISOString().slice(0, 16);
        };

        setFormData({
          tanker_number: record.tanker_number || '',
          driver_name: record.driver_name || '',
          dispatch_from: record.dispatch_from || '',
          driver_mobile: record.driver_mobile || '',
          empty_weight_loading: record.empty_weight_loading || '',
          loaded_weight: record.loaded_weight || '',
          net_weight: record.net_weight || '',
          final_loading_datetime: formatDateTime(record.final_loading_datetime),
          entered_by_loading: record.entered_by_loading || '',
          seal1_loading: record.seal1_loading || '',
          seal2_loading: record.seal2_loading || '',
          seal_datetime_loading: formatDateTime(record.seal_datetime_loading),
          sealed_by_loading: record.sealed_by_loading || '',
          density_loading: record.density_loading || '',
          temperature_loading: record.temperature_loading || '',
          timing_loading: record.timing_loading || '',
          customer_name: record.customer_name || '',
          empty_weight_unloading: record.empty_weight_unloading || '',
          loaded_weight_unloading: record.loaded_weight_unloading || '',
          net_weight_unloading: record.net_weight_unloading || '',
          final_unloading_datetime: formatDateTime(record.final_unloading_datetime),
          entered_by_unloading: record.entered_by_unloading || '',
          seal1_unloading: record.seal1_unloading || '',
          seal2_unloading: record.seal2_unloading || '',
          seal_datetime_unloading: formatDateTime(record.seal_datetime_unloading),
          sealed_by_unloading: record.sealed_by_unloading || '',
          density_unloading: record.density_unloading || '',
          temperature_unloading: record.temperature_unloading || '',
          timing_unloading: record.timing_unloading || '',
          notes: record.notes || ''
        });
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Error fetching record data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/shipment-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id ? parseInt(id) : 0,
          ...formData
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Data saved successfully');
        if (!id) {
          // Redirect to the same page with new ID for edit mode
          setTimeout(() => {
            router.push(`/shipment-records?id=${result.id}`);
          }, 1500);
        }
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setMessage('❌ Error saving data');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {id ? 'Edit Shipment Record' : 'Create Shipment Record'}
            </h1>
            <p className="text-gray-600">
              {id ? 'Update existing shipment record' : 'Add new shipment record'}
            </p>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-lg text-center ${
              message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <Suspense fallback={
              <div className="border-b border-gray-200 pb-8">
                <div className="h-6 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i}>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            }>
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Basic Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanker Number *
                    </label>
                    <input
                      type="text"
                      name="tanker_number"
                      value={formData.tanker_number}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Name *
                    </label>
                    <input
                      type="text"
                      name="driver_name"
                      value={formData.driver_name}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dispatch From *
                    </label>
                    <input
                      type="text"
                      name="dispatch_from"
                      value={formData.dispatch_from}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Mobile No *
                    </label>
                    <input
                      type="text"
                      name="driver_mobile"
                      value={formData.driver_mobile}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </Suspense>

            {/* Loading Details Section */}
            <Suspense fallback={
              <div className="border-b border-gray-200 pb-8">
                <div className="h-6 bg-gray-200 rounded w-40 mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map(i => (
                    <div key={i}>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            }>
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Loading Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Empty Weight (Kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="empty_weight_loading"
                      value={formData.empty_weight_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loaded Weight (Kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="loaded_weight"
                      value={formData.loaded_weight}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Net Weight (Kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="net_weight"
                      value={formData.net_weight}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Final Loading Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="final_loading_datetime"
                      value={formData.final_loading_datetime}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entered By Name
                    </label>
                    <input
                      type="text"
                      name="entered_by_loading"
                      value={formData.entered_by_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seal No. 01
                    </label>
                    <input
                      type="text"
                      name="seal1_loading"
                      value={formData.seal1_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seal No. 02
                    </label>
                    <input
                      type="text"
                      name="seal2_loading"
                      value={formData.seal2_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seal Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="seal_datetime_loading"
                      value={formData.seal_datetime_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sealed By
                    </label>
                    <input
                      type="text"
                      name="sealed_by_loading"
                      value={formData.sealed_by_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Density
                    </label>
                    <input
                      type="text"
                      name="density_loading"
                      value={formData.density_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature
                    </label>
                    <input
                      type="text"
                      name="temperature_loading"
                      value={formData.temperature_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timing
                    </label>
                    <input
                      type="time"
                      name="timing_loading"
                      value={formData.timing_loading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </Suspense>

            {/* Unloading Details Section */}
            <Suspense fallback={
              <div className="border-b border-gray-200 pb-8">
                <div className="h-6 bg-gray-200 rounded w-40 mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map(i => (
                    <div key={i}>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            }>
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Unloading Details</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Empty Weight (Kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="empty_weight_unloading"
                      value={formData.empty_weight_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loaded Weight (Kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="loaded_weight_unloading"
                      value={formData.loaded_weight_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Net Weight (Kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="net_weight_unloading"
                      value={formData.net_weight_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Final Unloading Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="final_unloading_datetime"
                      value={formData.final_unloading_datetime}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entered By Name
                    </label>
                    <input
                      type="text"
                      name="entered_by_unloading"
                      value={formData.entered_by_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seal No. 01
                    </label>
                    <input
                      type="text"
                      name="seal1_unloading"
                      value={formData.seal1_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seal No. 02
                    </label>
                    <input
                      type="text"
                      name="seal2_unloading"
                      value={formData.seal2_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seal Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="seal_datetime_unloading"
                      value={formData.seal_datetime_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sealed By
                    </label>
                    <input
                      type="text"
                      name="sealed_by_unloading"
                      value={formData.sealed_by_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Density
                    </label>
                    <input
                      type="text"
                      name="density_unloading"
                      value={formData.density_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature
                    </label>
                    <input
                      type="text"
                      name="temperature_unloading"
                      value={formData.temperature_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timing
                    </label>
                    <input
                      type="time"
                      name="timing_unloading"
                      value={formData.timing_unloading}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </Suspense>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (id ? 'Update Record' : 'Create Record')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ShipmentRecords() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ShipmentFormContent />
    </Suspense>
  );
}