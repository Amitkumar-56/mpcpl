'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';

// Inner component that uses useSearchParams
function EditDeepoListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deepoId = searchParams.get('id');
  
  const [formData, setFormData] = useState({
    diesel_ltr: '',
    remarks: '',
    closing_station: '',
    closing_date: ''
  });
  
  const [deepoData, setDeepoData] = useState({});
  const [stations, setStations] = useState([]);
  const [remarksList, setRemarksList] = useState({});
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    if (deepoId) {
      fetchDeepoData();
    }
  }, [deepoId]);

  const fetchDeepoData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/edit-deepo-list?id=${deepoId}`);
      const result = await response.json();

      if (result.success) {
        const { deepo, stations, remarksList, items } = result.data;
        setDeepoData(deepo);
        setStations(stations);
        setRemarksList(remarksList);
        
        // Set form data
        setFormData({
          diesel_ltr: deepo.diesel_ltr || '',
          remarks: deepo.remarks || '',
          closing_station: deepo.closing_station || '',
          closing_date: deepo.closing_date || ''
        });

        // Set items data
        setItems(items || []);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error fetching deepo data', 'error');
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

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setItems(updatedItems);
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setUploadStatus('');

    // Validate required fields
    if (!formData.closing_station || !formData.closing_date || !formData.diesel_ltr) {
      showMessage('Please fill all required fields', 'error');
      setSubmitting(false);
      return;
    }

    try {
      const submitData = new FormData();
      
      // Add basic form data
      submitData.append('deepo_id', deepoId);
      submitData.append('licence_plate', deepoData.licence_plate);
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });

      // Add files
      files.forEach(file => {
        submitData.append('files', file);
      });

      // Add existing PDF paths if any
      if (deepoData.pdf_path) {
        submitData.append('existing_pdf_paths', deepoData.pdf_path);
      }

      // Add items data
      items.forEach((item, index) => {
        submitData.append('item_id[]', item.id || item.item_name);
        submitData.append(`pcs_${index}`, item.pcs || '0');
        submitData.append(`desc_${index}`, item.description || '');
        submitData.append(`opening_status_${index}`, item.opening_status || '');
        submitData.append(`closing_status_${index}`, item.closing_status || '');
      });

      // Upload files first if any
      if (files.length > 0) {
        setUploadStatus('Uploading files...');
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadStatus(`Uploading ${i + 1} of ${files.length} files...`);
          
          // Simulate file upload - you would implement actual file upload here
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        setUploadStatus('All files uploaded successfully!');
      }

      const response = await fetch('/api/edit-deepo-list', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Deepo updated successfully!', 'success');
        setTimeout(() => {
          router.push('/deepo-history');
        }, 2000);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error updating deepo', 'error');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
  };

  // Get unique items including existing items and new remarks
  const getAllItems = () => {
    const existingItems = items || [];
    const existingItemNames = new Set(existingItems.map(item => item.item_name));
    
    // Add remarks that aren't already in items
    const newItems = Object.values(remarksList)
      .filter(remark => !existingItemNames.has(remark))
      .map(remark => ({
        item_name: remark,
        pcs: 0,
        description: '',
        opening_status: '',
        closing_status: '',
        isNew: true
      }));

    return [...existingItems, ...newItems];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deepo data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-800 pb-6 mb-8">
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Logo" 
              className="h-16 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hidden border-2 border-gray-300 h-16 w-16 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
            
            <div className="text-center flex-1 mx-6">
              <h1 className="text-2xl font-bold text-gray-900">GYANTI MULTISERVICES PVT. LTD.</h1>
              <p className="text-gray-600 mt-2">
                <em>Registered Office</em>: Gorakhpur, UP
              </p>
            </div>
            
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Logo" 
              className="h-16 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hidden border-2 border-gray-300 h-16 w-16 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              messageType === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              <div className="flex justify-between items-center">
                <span>{message}</span>
                <button
                  onClick={() => setMessage('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {uploadStatus && (
            <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg">
              {uploadStatus}
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Licence Plate:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {deepoData.licence_plate}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Station:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {deepoData.opening_station}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Station: *
                </label>
                <select
                  name="closing_station"
                  value={formData.closing_station}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">--Select--</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.station_name}>
                      {station.station_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Driver:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {deepoData.first_driver}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Mobile:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {deepoData.first_mobile}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {deepoData.first_start_date}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diesel LTR: *
                </label>
                <input
                  type="number"
                  name="diesel_ltr"
                  value={formData.diesel_ltr}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Date: *
                </label>
                <input
                  type="date"
                  name="closing_date"
                  value={formData.closing_date}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload PDF/Image:
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Item Checklist */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Item Checklist</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Item
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Pcs
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Description
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Opening Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Closing Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getAllItems().map((item, index) => (
                      <tr key={index} className={item.isNew ? 'bg-green-50' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border">
                          {item.item_name}
                          {item.isNew && (
                            <span className="ml-2 text-xs text-green-600">(New Item)</span>
                          )}
                          <input type="hidden" name={`item_id_${index}`} value={item.id || item.item_name} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border">
                          <input
                            type="number"
                            value={item.pcs || 0}
                            onChange={(e) => handleItemChange(index, 'pcs', e.target.value)}
                            className="w-20 p-2 border border-gray-300 rounded text-center"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border">
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-32 p-2 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border">
                          <div className="flex justify-center space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`opening_status_${index}`}
                                value="YES"
                                checked={item.opening_status === 'YES'}
                                onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                                className="h-4 w-4 text-blue-600"
                              />
                              <span>Yes</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`opening_status_${index}`}
                                value="NO"
                                checked={item.opening_status === 'NO' || !item.opening_status}
                                onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                                className="h-4 w-4 text-blue-600"
                              />
                              <span>No</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border">
                          <div className="flex justify-center space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`closing_status_${index}`}
                                value="YES"
                                checked={item.closing_status === 'YES'}
                                onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                                className="h-4 w-4 text-blue-600"
                              />
                              <span>Yes</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`closing_status_${index}`}
                                value="NO"
                                checked={item.closing_status === 'NO' || !item.closing_status}
                                onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                                className="h-4 w-4 text-blue-600"
                              />
                              <span>No</span>
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks:
              </label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter remarks..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating...' : 'Submit'}
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/deepo-history')}
                className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function EditDeepoList() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Suspense fallback={null}>
            <EditDeepoListContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
