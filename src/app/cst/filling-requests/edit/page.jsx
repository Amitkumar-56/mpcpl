'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    id: '',
    rid: '',
    product: '',
    station: '',
    customer: '',
    vehicle_number: '',
    driver_number: '',
    qty: '',
    aqty: '',
    status: ''
  });
  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      fetchRequestData(id);
      fetchDropdownData();
    } else {
      setError('Request ID not found');
      setLoading(false);
    }
  }, []);

  const fetchRequestData = async (id) => {
    try {
      const response = await fetch(`/api/cst/filling-requests/edit?id=${id}`);
      const data = await response.json();
      
      if (data.success) {
        setFormData({
          id: data.request.id,
          rid: data.request.rid,
          product: data.request.sub_product_id || data.request.product,
          station: data.request.fs_id || data.request.station,
          customer: data.request.cid || data.request.customer,
          vehicle_number: data.request.vehicle_number || data.request.licence_plate,
          driver_number: data.request.driver_number || data.request.phone,
          qty: data.request.qty,
          aqty: data.request.aqty || '',
          status: data.request.status
        });
      } else {
        setError(data.message || 'Failed to fetch request');
      }
    } catch (error) {
      setError('Error fetching request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [productCodesRes, stationsRes, customersRes] = await Promise.all([
        fetch('/api/product-codes'),
        fetch('/api/stations'),
        fetch('/api/customers')
      ]);

      const productCodesData = await productCodesRes.json();
      const stationsData = await stationsRes.json();
      const customersData = await customersRes.json();

      console.log('📦 Product Codes:', productCodesData);
      console.log('⛽ Stations:', stationsData);
      console.log('👥 Customers:', customersData);

      // Handle different response formats
      const productCodesArray = Array.isArray(productCodesData) ? productCodesData : 
                               (productCodesData.product_codes || productCodesData.data || []);
      const stationsArray = Array.isArray(stationsData) ? stationsData : 
                           (stationsData.stations || stationsData.data || []);
      const customersArray = Array.isArray(customersData) ? customersData : 
                             (customersData.customers || customersData.data || []);

      setProducts(productCodesArray);
      setStations(stationsArray);
      setCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      setError('Error loading dropdown data');
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
    setError('');

    try {
      const response = await fetch('/api/cst/filling-requests/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        router.push('/cst/filling-requests');
      } else {
        setError(data.message || 'Failed to update request');
      }
    } catch (error) {
      setError('Error updating request: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Edit Filling Request</h1>
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
              {/* ID Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID
                </label>
                <input
                  type="text"
                  value={formData.id}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request ID
                </label>
                <input
                  type="text"
                  value={formData.rid}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className={`px-3 py-2 rounded-md text-center font-medium ${
                  formData.status === 'Completed' 
                    ? 'bg-green-100 text-green-800' 
                    : formData.status === 'Pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {formData.status}
                </div>
              </div>

              {/* Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  name="product"
                  value={formData.product}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.pcode} - {product.pname}
                      </option>
                    ))}
                </select>
              </div>

              {/* Station */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loading Station <span className="text-red-500">*</span>
                </label>
                <select
                  name="station"
                  value={formData.station}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Station</option>
                  {stations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.station_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  name="customer"
                  value={formData.customer}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  name="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter vehicle number"
                />
              </div>

              {/* Driver Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Number
                </label>
                <input
                  type="number"
                  name="driver_number"
                  value={formData.driver_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter driver number"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (Ltr) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="qty"
                  value={formData.qty}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter quantity"
                />
              </div>

              {/* Actual Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Quantity
                </label>
                <input
                  type="number"
                  name="aqty"
                  value={formData.aqty}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter actual quantity"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
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
