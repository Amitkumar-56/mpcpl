// src/app/loading-unloading-history/edit-loading-unloading/page.jsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

// Inner component that uses useSearchParams
function EditLoadingUnloadingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shipmentId = searchParams.get('shipment_id');
  
  const [formData, setFormData] = useState({
    tanker: '',
    driver: '',
    dispatch: '',
    driver_mobile: '',
    empty_weight_loading: '',
    loaded_weight_loading: '',
    net_weight_loading: '',
    final_loading_datetime: '',
    entered_by_loading: '',
    seal1_loading: '',
    seal2_loading: '',
    seal_datetime_loading: '',
    sealed_by_loading: '',
    density_loading: '',
    temperature_loading: '',
    timing_loading: '',
    consignee: '',
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
    pdf_path: ''
  });

  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (shipmentId) {
      fetchShipmentData();
    }
  }, [shipmentId]);

  const fetchShipmentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/loading-unloading-history/edit-loading-unloading?shipment_id=${shipmentId}`);
      const result = await response.json();

      if (result.success) {
        const shipment = result.data;
        
        // Format datetime fields for input
        const formatDateTime = (datetime) => {
          if (!datetime || datetime === '0000-00-00 00:00:00') return '';
          const date = new Date(datetime);
          return date.toISOString().slice(0, 16);
        };

        setFormData({
          tanker: shipment.tanker || '',
          driver: shipment.driver || '',
          dispatch: shipment.dispatch || '',
          driver_mobile: shipment.driver_mobile || '',
          empty_weight_loading: shipment.empty_weight_loading || '',
          loaded_weight_loading: shipment.loaded_weight_loading || '',
          net_weight_loading: shipment.net_weight_loading || '',
          final_loading_datetime: formatDateTime(shipment.final_loading_datetime),
          entered_by_loading: shipment.entered_by_loading || '',
          seal1_loading: shipment.seal1_loading || '',
          seal2_loading: shipment.seal2_loading || '',
          seal_datetime_loading: formatDateTime(shipment.seal_datetime_loading),
          sealed_by_loading: shipment.sealed_by_loading || '',
          density_loading: shipment.density_loading || '',
          temperature_loading: shipment.temperature_loading || '',
          timing_loading: shipment.timing_loading || '',
          consignee: shipment.consignee || '',
          empty_weight_unloading: shipment.empty_weight_unloading || '',
          loaded_weight_unloading: shipment.loaded_weight_unloading || '',
          net_weight_unloading: shipment.net_weight_unloading || '',
          final_unloading_datetime: formatDateTime(shipment.final_unloading_datetime),
          entered_by_unloading: shipment.entered_by_unloading || '',
          seal1_unloading: shipment.seal1_unloading || '',
          seal2_unloading: shipment.seal2_unloading || '',
          seal_datetime_unloading: formatDateTime(shipment.seal_datetime_unloading),
          sealed_by_unloading: shipment.sealed_by_unloading || '',
          density_unloading: shipment.density_unloading || '',
          temperature_unloading: shipment.temperature_unloading || '',
          timing_unloading: shipment.timing_unloading || '',
          pdf_path: shipment.pdf_path || ''
        });
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Error fetching shipment data');
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

  const handleFileChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key !== 'pdf_path') {
          submitData.append(key, formData[key]);
        }
      });
      
      submitData.append('shipment_id', shipmentId);
      submitData.append('current_pdf_path', formData.pdf_path);
      
      if (pdfFile) {
        submitData.append('pdf_file', pdfFile);
      }

      const response = await fetch('/api/loading-unloading-history/edit-loading-unloading', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Shipment updated successfully');
        setTimeout(() => {
          router.push('/loading-unloading-history');
        }, 2000);
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setMessage('❌ Error updating shipment');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shipment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {message && (
          <div className={`p-4 mb-6 rounded-lg text-center ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          <input type="hidden" name="shipment_id" value={shipmentId} />

          {/* Header */}
          <div className="flex items-center justify-between mb-8 border-b-2 border-gray-300 pb-6">
            <div className="w-20 h-20 flex items-center justify-center border border-gray-300 bg-gray-50 p-2">
              <img 
                src="/LOGO_NEW.jpg" 
                alt="Company Logo" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden border-2 border-dashed border-gray-300 w-16 h-16 flex items-center justify-center text-xs text-gray-500">
                LOGO
              </div>
            </div>
            
            <div className="text-center flex-1 mx-6">
              <h1 className="text-2xl font-bold text-gray-800">GYANTI MULTISERVICES PVT. LTD.</h1>
              <p className="text-gray-600 text-sm mt-2">
                Registered Office : Nakha No. 1, Moharipur, Gorakhpur,<br />
                Uttar Pradesh – 273007<br />
                E-Mail – accounts@gyanti.in | GSTIN – 09AAGCGG20R123 | CIN No. U15549UP2016PTC088333
              </p>
              <h2 className="text-xl font-semibold text-gray-800 mt-4">Tanker Loading & Unloading Checklist</h2>
            </div>
            
            <div className="w-20 h-20 flex items-center justify-center border border-gray-300 bg-gray-50 p-2">
              <img 
                src="/LOGO_NEW.jpg" 
                alt="Company Logo" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden border-2 border-dashed border-gray-300 w-16 h-16 flex items-center justify-center text-xs text-gray-500">
                LOGO
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-center mb-6 text-gray-800">
            Supplier Gyanti Multiservices Pvt Ltd
          </h3>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanker No:
              </label>
              <input
                type="text"
                name="tanker"
                value={formData.tanker}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver Name:
              </label>
              <input
                type="text"
                name="driver"
                value={formData.driver}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dispatch From:
              </label>
              <input
                type="text"
                name="dispatch"
                value={formData.dispatch}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver Mobile No:
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

          {/* Loading Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 bg-gray-100 py-2 px-4 rounded">
              Loading Details
            </h3>

            {/* Loading Weights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  name="loaded_weight_loading"
                  value={formData.loaded_weight_loading}
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
                  name="net_weight_loading"
                  value={formData.net_weight_loading}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Loading Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

            {/* Seals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

            {/* Seal Date and Checked By */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

            {/* Density, Temperature, Timing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Unloading Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 bg-gray-100 py-2 px-4 rounded">
              Unloading Details (Customer)
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                name="consignee"
                value={formData.consignee}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Unloading Weights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

            {/* Unloading Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

            {/* Unloading Seals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

            {/* Unloading Seal Date and Checked By */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

            {/* Unloading Density, Temperature, Timing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload PDF/Image:
            </label>
            <input
              type="file"
              name="pdf_file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {formData.pdf_path && (
              <p className="text-sm text-gray-600 mt-2">
                Current file: {formData.pdf_path.split('/').pop()}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Updating...' : 'Update Shipment'}
          </button>

          {/* Footer */}
          <div className="text-center border-t border-gray-300 pt-6 mt-8">
            <p className="font-semibold text-gray-800">GYANTI MULTISERVICES PVT. LTD.</p>
            <p className="text-gray-600 text-sm mt-2">
              Registered Office : Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007<br />
              E-Mail – accounts@gyanti.in | GSTIN – 09AAGCGG20R123 | CIN No. U15549UP2016PTC088333
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function EditLoadingUnloading() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading edit form...</p>
          </div>
        </div>
      }
    >
      <EditLoadingUnloadingContent />
    </Suspense>
  );
}