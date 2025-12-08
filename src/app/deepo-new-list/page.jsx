'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Inner component that uses useSearchParams
function DeepoNewListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [formData, setFormData] = useState({
    licence_plate: '',
    first_driver: '',
    first_mobile: '',
    first_start_date: '',
    closing_date: '',
    diesel_ltr: '',
    opening_station: '',
    closing_station: '',
    remarks: ''
  });
  
  const [items, setItems] = useState([]);
  const [stations, setStations] = useState([]);
  const [previousDeepo, setPreviousDeepo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      const url = id ? `/api/deepo-new-list?id=${id}` : '/api/deepo-new-list';
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        const { deepoData, items, stations, previousDeepo } = result.data;
        
        setStations(stations);
        setPreviousDeepo(previousDeepo);

        if (id && deepoData) {
          // Edit mode - populate with existing data
          setIsEditing(true);
          setFormData({
            licence_plate: deepoData.licence_plate || '',
            first_driver: deepoData.first_driver || '',
            first_mobile: deepoData.first_mobile || '',
            first_start_date: deepoData.first_start_date || '',
            closing_date: deepoData.closing_date || new Date().toISOString().split('T')[0],
            diesel_ltr: deepoData.diesel_ltr || '',
            opening_station: deepoData.opening_station || previousDeepo.closing_station || '',
            closing_station: deepoData.closing_station || '',
            remarks: deepoData.remarks || ''
          });
          
          // Set items with existing data
          if (items.length > 0) {
            setItems(items);
          }
        } else {
          // New mode - auto-fill from previous deepo
          setFormData(prev => ({
            ...prev,
            opening_station: previousDeepo.closing_station || '',
            first_start_date: previousDeepo.closing_date || new Date().toISOString().split('T')[0],
            closing_date: new Date().toISOString().split('T')[0]
          }));

          // If no items exist, fetch default items from remarks table
          if (items.length === 0) {
            const remarksResponse = await fetch('/api/remarks');
            const remarksResult = await remarksResponse.json();
            if (remarksResult.success) {
              setItems(remarksResult.data.map(item => ({
                ...item,
                pcs: 0,
                description: '',
                opening_status: '',
                closing_status: ''
              })));
            }
          } else {
            setItems(items);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
      setError('Failed to load form data');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        id: isEditing ? id : undefined,
        items: items.map(item => ({
          item_id: item.id,
          item_name: item.remarks_name || item.item_name,
          pcs: item.pcs || 0,
          description: item.description || '',
          opening_status: item.opening_status || '',
          closing_status: item.closing_status || ''
        }))
      };

      const response = await fetch('/api/deepo-new-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/deepo-history?success=1&id=${result.id}`);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An error occurred while saving the data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      licence_plate: '',
      first_driver: '',
      first_mobile: '',
      first_start_date: previousDeepo.closing_date || new Date().toISOString().split('T')[0],
      closing_date: new Date().toISOString().split('T')[0],
      diesel_ltr: '',
      opening_station: previousDeepo.closing_station || '',
      closing_station: '',
      remarks: ''
    });
    
    setItems(items.map(item => ({
      ...item,
      pcs: 0,
      description: '',
      opening_status: '',
      closing_status: ''
    })));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <img src="/LOGO_NEW.jpg" alt="Left Logo" className="h-16" />
            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold text-gray-800">GYANTI MULTISERVICES PVT. LTD.</h2>
              <div className="mt-2 text-gray-600">
                <div><em><strong>Registered Office</strong></em> : Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007</div>
                <div>E-Mail – accounts@gyanti.in</div>
                <div>GSTIN – 09AAGCG6220R1Z3, CIN No. U15549UP2016PTC088333</div>
              </div>
            </div>
            <img src="/LOGO_NEW.jpg" alt="Right Logo" className="h-16" />
          </div>
        </div>

        {/* Form Title */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-800 text-center">
              {isEditing ? 'Edit Deepo Details' : 'Deepo Details Form'}
            </h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Licence Plate *
              </label>
              <input
                type="text"
                name="licence_plate"
                value={formData.licence_plate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter licence plate"
              />
            </div>
          </div>

          {/* Station Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Station *
              </label>
              <input
                type="text"
                name="opening_station"
                value={formData.opening_station}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Opening station"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Station
              </label>
              <select
                name="closing_station"
                value={formData.closing_station}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Station --</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.station_name}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fuel and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diesel LTR *
              </label>
              <input
                type="number"
                name="diesel_ltr"
                value={formData.diesel_ltr}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Start Date *
              </label>
              <input
                type="date"
                name="first_start_date"
                value={formData.first_start_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Date *
              </label>
              <input
                type="date"
                name="closing_date"
                value={formData.closing_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Driver Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Driver Name *
              </label>
              <input
                type="text"
                name="first_driver"
                value={formData.first_driver}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Driver name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Mobile No *
              </label>
              <input
                type="text"
                name="first_mobile"
                value={formData.first_mobile}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mobile number"
              />
            </div>
          </div>

          {/* Item Checklist */}
          <div className="mb-6">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 text-center">
                Item Checklist
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pcs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opening YES
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opening NO
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing YES
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing NO
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.remarks_name || item.item_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={item.pcs || 0}
                          onChange={(e) => handleItemChange(index, 'pcs', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`opening_status_${index}`}
                          value="YES"
                          checked={item.opening_status === 'YES'}
                          onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`opening_status_${index}`}
                          value="NO"
                          checked={item.opening_status === 'NO'}
                          onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`closing_status_${index}`}
                          value="YES"
                          checked={item.closing_status === 'YES'}
                          onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`closing_status_${index}`}
                          value="NO"
                          checked={item.closing_status === 'NO'}
                          onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <input
              type="text"
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter remarks"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-center space-x-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Details' : 'Save Details')}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Print Form
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={() => router.push('/deepo-history')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Back to History
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function DeepoNewList() {
  return (
    <Suspense fallback={null}>
      <DeepoNewListContent />
    </Suspense>
  );
}