'use client';

import { useSession } from '@/context/SessionContext';
import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Main Content Component
function CreateVoucherContent() {
  const { user, isAuthenticated } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    exp_date: new Date().toISOString().split('T')[0],
    employee_id: '',
    driver_phone: '',
    vehicle_no: '',
    station_id: '',
    advance: '0',
    total_expense: '0'
  });

  const [voucherItems, setVoucherItems] = useState([
    { item_details: '', amount: '0', image: null }
  ]);

  const [stations, setStations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchFormData();
  }, [isAuthenticated, router]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      setError('');
      setDataLoaded(false);
      
      const response = await fetch('/api/create-voucher');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch form data');
      }
      
      setStations(data.stations || []);
      setEmployees(data.employees || []);
      setDataLoaded(true);
      
    } catch (error) {
      console.error('Error fetching form data:', error);
      setError('Failed to load form data: ' + error.message);
      setStations([]);
      setEmployees([]);
      setDataLoaded(false);
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
    const updatedItems = [...voucherItems];
    updatedItems[index][field] = value;
    setVoucherItems(updatedItems);
  };

  const addVoucherItem = () => {
    setVoucherItems(prev => [
      ...prev,
      { item_details: '', amount: '0', image: null }
    ]);
  };

  const removeVoucherItem = (index) => {
    if (voucherItems.length > 1) {
      const updatedItems = voucherItems.filter((_, i) => i !== index);
      setVoucherItems(updatedItems);
    } else {
      alert("At least one item is required.");
    }
  };

  const handleImageChange = (index, file) => {
    handleItemChange(index, 'image', file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!confirm("Are you sure you want to create this voucher?")) {
      setLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      
      // Add main form data
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });

      // Add user_id from session
      if (user?.id) {
        submitData.append('user_id', user.id);
      } else {
        throw new Error('User not authenticated');
      }

      // Add voucher items
      voucherItems.forEach((item, index) => {
        submitData.append('item_details[]', item.item_details);
        submitData.append('amount[]', item.amount);
        if (item.image) {
          submitData.append('image[]', item.image);
        } else {
          submitData.append('image[]', '');
        }
      });

      const response = await fetch('/api/create-voucher', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        // Prefer the formatted voucher_code if provided by the API
        const displayCode = result.voucher_code || result.voucher_no;
        alert(`✅ Voucher created successfully!\n\nVoucher No: ${displayCode}`);
        
        // Reset form
        setFormData({
          exp_date: new Date().toISOString().split('T')[0],
          employee_id: '',
          driver_phone: '',
          vehicle_no: '',
          station_id: '',
          advance: '0',
          total_expense: '0'
        });
        
        setVoucherItems([
          { item_details: '', amount: '0', image: null }
        ]);
        
        // Redirect to driver voucher wallet page after success
        setTimeout(() => {
          router.push('/voucher-wallet-driver');
        }, 1500);
        
      } else {
        const errorMsg = result.error || 'Failed to create voucher';
        const missingFields = result.missingFields ? ` Missing fields: ${result.missingFields.join(', ')}` : '';
        setError(errorMsg + missingFields);
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
      setError('Failed to create voucher: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen w-64 z-30">
        <Sidebar activePage="CreateVoucher" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white shadow-sm">
          <Header />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <button 
                      onClick={() => router.back()}
                      className="mr-4 text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Create New Voucher</h1>
                    <button 
                      onClick={fetchFormData}
                      className="ml-auto text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md"
                      disabled={loading}
                    >
                      {loading ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                      <strong>Error:</strong> {error}
                      <button 
                        onClick={fetchFormData}
                        className="ml-2 text-sm underline"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {/* Voucher Date */}
                      <div>
                        <label htmlFor="exp_date" className="block text-sm font-medium text-gray-700">
                          Voucher Date *
                        </label>
                        <input
                          type="date"
                          id="exp_date"
                          name="exp_date"
                          value={formData.exp_date}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      {/* Employee Dropdown */}
                      <div>
                        <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700">
                          Employee *
                        </label>
                        <select
                          id="employee_id"
                          name="employee_id"
                          value={formData.employee_id}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                          disabled={loading}
                        >
                          <option value="">
                            {loading ? 'Loading employees...' : 'Select an employee'}
                          </option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name} {employee.emp_code ? `(${employee.emp_code})` : ''}
                            </option>
                          ))}
                          {!loading && employees.length === 0 && (
                            <option value="" disabled>
                              No employees available
                            </option>
                          )}
                        </select>
                        {employees.length > 0 && (
                          <p className="mt-1 text-xs text-gray-500">
                            {employees.length} employees available
                          </p>
                        )}
                      </div>

                      {/* Driver Phone */}
                      <div>
                        <label htmlFor="driver_phone" className="block text-sm font-medium text-gray-700">
                          Driver Phone No. *
                        </label>
                        <input
                          type="text"
                          id="driver_phone"
                          name="driver_phone"
                          value={formData.driver_phone}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                          placeholder="Enter driver phone number"
                        />
                      </div>

                      {/* Vehicle Number */}
                      <div>
                        <label htmlFor="vehicle_no" className="block text-sm font-medium text-gray-700">
                          Vehicle No. *
                        </label>
                        <input
                          type="text"
                          id="vehicle_no"
                          name="vehicle_no"
                          value={formData.vehicle_no}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                          placeholder="Enter vehicle number"
                        />
                      </div>

                      {/* Station Dropdown */}
                      <div>
                        <label htmlFor="station_id" className="block text-sm font-medium text-gray-700">
                          Station *
                        </label>
                        <select
                          id="station_id"
                          name="station_id"
                          value={formData.station_id}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select Station</option>
                          {stations.map(station => (
                            <option key={station.id} value={station.id}>
                              {station.station_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Advance */}
                      <div>
                        <label htmlFor="advance" className="block text-sm font-medium text-gray-700">
                          Advance
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="advance"
                          name="advance"
                          value={formData.advance}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      {/* Total Expense */}
                      <div>
                        <label htmlFor="total_expense" className="block text-sm font-medium text-gray-700">
                          Total Expense
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="total_expense"
                          name="total_expense"
                          value={formData.total_expense}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <hr className="my-8" />

                    {/* Voucher Items */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Voucher Items *</h3>
                      
                      {voucherItems.map((item, index) => (
                        <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-end">
                            <div className="sm:col-span-5">
                              <label className="block text-sm font-medium text-gray-700">
                                Item Details *
                              </label>
                              <input
                                type="text"
                                value={item.item_details}
                                onChange={(e) => handleItemChange(index, 'item_details', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter item details"
                                required
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-sm font-medium text-gray-700">
                                Amount *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                                placeholder="Enter amount"
                                required
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-sm font-medium text-gray-700">
                                Item Image
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageChange(index, e.target.files[0])}
                                className="mt-1 block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                            </div>

                            <div className="sm:col-span-1">
                              <button
                                type="button"
                                onClick={() => removeVoucherItem(index)}
                                disabled={voucherItems.length === 1}
                                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addVoucherItem}
                        className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Add More Items
                      </button>
                    </div>

                    <div className="flex justify-end space-x-4 pt-6">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Creating...' : 'Create Voucher'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function CreateVoucher() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <CreateVoucherContent />
    </Suspense>
  );
}