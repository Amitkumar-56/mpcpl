'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading components
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading data...</p>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b-2 border-gray-800 pb-6 mb-8">
            <div className="h-20 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="text-center flex-1 mx-8">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-2 animate-pulse"></div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
              </div>
            </div>
            <div className="h-20 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Section Title Skeleton */}
          <div className="text-center mb-8">
            <div className="h-10 bg-gray-200 rounded-lg w-64 mx-auto animate-pulse"></div>
          </div>

          {/* Form Fields Skeleton */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-28 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons Skeleton */}
          <div className="flex justify-center space-x-4 pt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-8">
      <div className="h-8 bg-gray-200 rounded-lg w-48 mx-auto mb-6 animate-pulse"></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(11)].map((_, i) => (
                <th key={i} className="px-4 py-3 border">
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(11)].map((_, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 border">
                    <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MessageAlert({ message, messageType, onClose }) {
  if (!message) return null;

  return (
    <div className={`mb-6 p-4 rounded-lg ${
      messageType === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
    }`}>
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Main form component
function TankerFormContent() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    licence_plate: '',
    first_driver: '',
    first_mobile: '',
    first_start_date: '',
    opening_meter: '',
    closing_meter: '',
    diesel_ltr: '',
    opening_station: '',
    closing_station: '',
    remarks: ''
  });

  const [items, setItems] = useState([]);
  const [dropdownData, setDropdownData] = useState({
    employees: [],
    vehicles: [],
    stations: [],
    items: []
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    fetchDropdownData();
    setFormData(prev => ({
      ...prev,
      first_start_date: new Date().toISOString().split('T')[0]
    }));
  }, []);

  const fetchDropdownData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tanker-list');
      const result = await response.json();

      if (result.success) {
        setDropdownData(result.data);
        
        // Initialize items with default values
        const initializedItems = result.data.items.map(item => ({
          ...item,
          pcs: 0,
          description: '',
          opening_status: '',
          closing_status: '',
          opening_driver_sign: '',
          opening_checker_sign: '',
          closing_driver_sign: '',
          closing_checker_sign: ''
        }));
        setItems(initializedItems);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error fetching data', 'error');
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

  const handleDriverChange = (e) => {
    const selectedDriver = e.target.value;
    const employee = dropdownData.employees.find(emp => emp.name === selectedDriver);
    
    setFormData(prev => ({
      ...prev,
      first_driver: selectedDriver,
      first_mobile: employee ? employee.phone : ''
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
    setSubmitting(true);
    setMessage('');

    try {
      const submitData = {
        ...formData,
        items_data: items
      };

      const response = await fetch('/api/tanker-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Tanker created successfully!', 'success');
        setTimeout(() => {
          router.push(`/tanker-history?success=1&id=${result.data.tanker_history_id}`);
        }, 2000);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error creating tanker', 'error');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const closeMessage = () => {
    setMessage('');
    setMessageType('');
  };

  const handleReset = () => {
    setFormData({
      licence_plate: '',
      first_driver: '',
      first_mobile: '',
      first_start_date: new Date().toISOString().split('T')[0],
      opening_meter: '',
      closing_meter: '',
      diesel_ltr: '',
      opening_station: '',
      closing_station: '',
      remarks: ''
    });

    const resetItems = items.map(item => ({
      ...item,
      pcs: 0,
      description: '',
      opening_status: '',
      closing_status: '',
      opening_driver_sign: '',
      opening_checker_sign: '',
      closing_driver_sign: '',
      closing_checker_sign: ''
    }));
    setItems(resetItems);
  };

  if (loading) {
    return <LoadingSpinner />;
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
              className="h-20 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hidden border-2 border-gray-300 h-20 w-20 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
            
            <div className="text-center flex-1 mx-8">
              <h1 className="text-3xl font-bold text-gray-900">GYANTI MULTISERVICES PVT. LTD.</h1>
              <p className="text-gray-600 mt-2 text-sm">
                <em><strong>Registered Office</strong></em> : Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007 <br />
                E-Mail – accounts@gyanti.in <br />
                GSTIN – 09AAGCG6220R1Z3, CIN No. U15549UP2016PTC088333
              </p>
            </div>
            
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Logo" 
              className="h-20 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hidden border-2 border-gray-300 h-20 w-20 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
          </div>

          {/* Section Title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 bg-gray-100 py-3 rounded-lg">
              Tanker Details Form
            </h2>
          </div>

          {/* Messages */}
          <MessageAlert message={message} messageType={messageType} onClose={closeMessage} />

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Licence Plate *
                  </label>
                  <select
                    name="licence_plate"
                    value={formData.licence_plate}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select Licence Plate --</option>
                    {dropdownData.vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.licence_plate}>
                        {vehicle.licence_plate}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Station *
                  </label>
                  <select
                    name="opening_station"
                    value={formData.opening_station}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select Station --</option>
                    {dropdownData.stations.map((station) => (
                      <option key={station.id} value={station.station_name}>
                        {station.station_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Station
                  </label>
                  <select
                    name="closing_station"
                    value={formData.closing_station}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Station --</option>
                    {dropdownData.stations.map((station) => (
                      <option key={station.id} value={station.station_name}>
                        {station.station_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Suspense>

            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            }>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Meter *
                  </label>
                  <input
                    type="number"
                    name="opening_meter"
                    value={formData.opening_meter}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Meter
                  </label>
                  <input
                    type="number"
                    name="closing_meter"
                    value={formData.closing_meter}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

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
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </Suspense>

            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-28 mb-2 animate-pulse"></div>
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            }>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Driver Name *
                  </label>
                  <select
                    name="first_driver"
                    value={formData.first_driver}
                    onChange={handleDriverChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select Driver --</option>
                    {dropdownData.employees.map((emp) => (
                      <option key={emp.name} value={emp.name} data-phone={emp.phone}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Mobile No
                  </label>
                  <div className="p-3 bg-gray-100 border border-gray-300 rounded-md">
                    {formData.first_mobile || '-- Select Driver First --'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="first_start_date"
                    value={formData.first_start_date}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </Suspense>

            {/* Item Checklist */}
            <Suspense fallback={<TableSkeleton />}>
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center bg-gray-100 py-3 rounded-lg">
                  Item Checklist
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                          Item Name
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
                          Opening Driver Signature
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                          Opening Checker Signature
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border" colSpan="2">
                          Closing
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                          Closing Driver Signature
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                          Closing Checker Signature
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
                      {items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border">
                            {item.item_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="number"
                              value={item.pcs}
                              onChange={(e) => handleItemChange(index, 'pcs', e.target.value)}
                              min="0"
                              className="w-16 p-2 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-32 p-2 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center border">
                            <input
                              type="radio"
                              name={`opening_status_${index}`}
                              value="YES"
                              checked={item.opening_status === 'YES'}
                              onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center border">
                            <input
                              type="radio"
                              name={`opening_status_${index}`}
                              value="NO"
                              checked={item.opening_status === 'NO'}
                              onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={item.opening_driver_sign}
                              onChange={(e) => handleItemChange(index, 'opening_driver_sign', e.target.value)}
                              className="w-24 p-2 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={item.opening_checker_sign}
                              onChange={(e) => handleItemChange(index, 'opening_checker_sign', e.target.value)}
                              className="w-24 p-2 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center border">
                            <input
                              type="radio"
                              name={`closing_status_${index}`}
                              value="YES"
                              checked={item.closing_status === 'YES'}
                              onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center border">
                            <input
                              type="radio"
                              name={`closing_status_${index}`}
                              value="NO"
                              checked={item.closing_status === 'NO'}
                              onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={item.closing_driver_sign}
                              onChange={(e) => handleItemChange(index, 'closing_driver_sign', e.target.value)}
                              className="w-24 p-2 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border">
                            <input
                              type="text"
                              value={item.closing_checker_sign}
                              onChange={(e) => handleItemChange(index, 'closing_checker_sign', e.target.value)}
                              className="w-24 p-2 border border-gray-300 rounded"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Suspense>

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
                {submitting ? 'Saving...' : 'Save Details'}
              </button>
              
              <button
                type="button"
                onClick={() => window.print()}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Print Form
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Reset Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function TankerList() {
  return (
    <Suspense fallback={null}>
      <TankerFormContent />
    </Suspense>
  );
}