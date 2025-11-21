'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

// Inner component that uses useSearchParams
function EditTankerListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tankerId = searchParams.get('id');
  
  const [formData, setFormData] = useState({
    closing_meter: '',
    diesel_ltr: '',
    remarks: '',
    closing_station: '',
    closing_date: ''
  });
  
  const [tankerData, setTankerData] = useState({});
  const [stations, setStations] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    if (tankerId) {
      fetchTankerData();
    }
  }, [tankerId]);

  const fetchTankerData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/edit-tanker-list?id=${tankerId}`);
      const result = await response.json();

      if (result.success) {
        const { tanker, stations, allItems, items } = result.data;
        setTankerData(tanker);
        setStations(stations);
        setAllItems(allItems);
        setItems(items);
        
        // Set form data
        setFormData({
          closing_meter: tanker.closing_meter || '',
          diesel_ltr: tanker.diesel_ltr || '',
          remarks: tanker.remarks || '',
          closing_station: tanker.closing_station || '',
          closing_date: tanker.closing_date || ''
        });
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error fetching tanker data', 'error');
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

    try {
      const submitData = new FormData();
      
      // Add basic form data
      submitData.append('tanker_id', tankerId);
      submitData.append('licence_plate', tankerData.licence_plate);
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });

      // Add files
      files.forEach(file => {
        submitData.append('files', file);
      });

      // Add existing PDF paths if any
      if (tankerData.pdf_path) {
        submitData.append('existing_pdf_paths', tankerData.pdf_path);
      }

      // Add items data
      submitData.append('all_items_count', allItems.length.toString());
      allItems.forEach((item, index) => {
        const existingItem = items.find(i => i.item_id === item.id) || {};
        submitData.append(`item_id_${index}`, item.id);
        submitData.append(`item_name_${index}`, item.item_name);
        submitData.append(`pcs_${index}`, existingItem.pcs || '');
        submitData.append(`desc_${index}`, existingItem.description || '');
        submitData.append(`opening_status_${index}`, existingItem.opening_status || '');
        submitData.append(`closing_status_${index}`, existingItem.closing_status || '');
        submitData.append(`opening_driver_sign_${index}`, existingItem.opening_driver_sign || '');
        submitData.append(`opening_checker_sign_${index}`, existingItem.opening_checker_sign || '');
        submitData.append(`closing_driver_sign_${index}`, existingItem.closing_driver_sign || '');
        submitData.append(`closing_checker_sign_${index}`, existingItem.closing_checker_sign || '');
      });

      const response = await fetch('/api/edit-tanker-list', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Tanker updated successfully!', 'success');
        setTimeout(() => {
          router.push('/tanker-history');
        }, 2000);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error updating tanker', 'error');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tanker data...</p>
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
            
            <div className="text-center flex-1 mx-8">
              <h1 className="text-3xl font-bold text-gray-900">GYANTI MULTISERVICES PVT. LTD.</h1>
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

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Licence Plate:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {tankerData.licence_plate}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Station:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {tankerData.opening_station}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Station:
                </label>
                <select
                  name="closing_station"
                  value={formData.closing_station}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  {tankerData.first_driver}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Mobile:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {tankerData.first_mobile}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {tankerData.first_start_date}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Meter:
                </label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                  {tankerData.opening_meter}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Meter: *
                </label>
                <input
                  type="number"
                  name="closing_meter"
                  value={formData.closing_meter}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border" colSpan="2">
                        Opening
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Opening Driver Sign
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Opening Checker Sign
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border" colSpan="2">
                        Closing
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Closing Driver Sign
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Closing Checker Sign
                      </th>
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase border">YES</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase border">NO</th>
                      <th></th>
                      <th></th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase border">YES</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase border">NO</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allItems.map((item, index) => {
                      const existingItem = items.find(i => i.item_id === item.id) || {};
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border">
                            {item.item_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="number"
                              value={existingItem.pcs || ''}
                              onChange={(e) => handleItemChange(index, 'pcs', e.target.value)}
                              className="w-16 p-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={existingItem.description || ''}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-32 p-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center border">
                            <input
                              type="radio"
                              name={`opening_status_${index}`}
                              value="YES"
                              checked={existingItem.opening_status === 'YES'}
                              onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center border">
                            <input
                              type="radio"
                              name={`opening_status_${index}`}
                              value="NO"
                              checked={existingItem.opening_status === 'NO'}
                              onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={existingItem.opening_driver_sign || ''}
                              onChange={(e) => handleItemChange(index, 'opening_driver_sign', e.target.value)}
                              className="w-24 p-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={existingItem.opening_checker_sign || ''}
                              onChange={(e) => handleItemChange(index, 'opening_checker_sign', e.target.value)}
                              className="w-24 p-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center border">
                            <input
                              type="radio"
                              name={`closing_status_${index}`}
                              value="YES"
                              checked={existingItem.closing_status === 'YES'}
                              onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center border">
                            <input
                              type="radio"
                              name={`closing_status_${index}`}
                              value="NO"
                              checked={existingItem.closing_status === 'NO'}
                              onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={existingItem.closing_driver_sign || ''}
                              onChange={(e) => handleItemChange(index, 'closing_driver_sign', e.target.value)}
                              className="w-24 p-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={existingItem.closing_checker_sign || ''}
                              onChange={(e) => handleItemChange(index, 'closing_checker_sign', e.target.value)}
                              className="w-24 p-1 border border-gray-300 rounded"
                            />
                          </td>
                        </tr>
                      );
                    })}
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

            {/* Submit Button */}
            <div className="text-center pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function EditTankerList() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tanker edit form...</p>
          </div>
        </div>
      }
    >
      <EditTankerListContent />
    </Suspense>
  );
}