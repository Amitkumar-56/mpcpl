'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Sidebar from '../../components/sidebar';

export default function CreateRequestPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    products_codes: '',
    station_id: '',
    vehicle_no: '',
    driver_no: '',
    request_type: 'Liter',
    qty: '',
    aty: '',
    remarks: '',
  });

  const [selectedProduct, setSelectedProduct] = useState(null);

  // Product configuration based on IDs
  const productConfig = {
    7: { name: "DEF Lose (R)", type: "liter", min: 1, fullTank: 60 },
    8: { name: "DEF Lose (B)", type: "liter", min: 1000 },
    9: { name: "DEF Bucket (R)", type: "bucket", bucketSize: 20, min: 1 },
    10: { name: "DEF Bucket (B)", type: "bucket", bucketSize: 10, min: 10 },
    3: { name: "Industrial Oil 40 (R)", type: "liter", min: 1, fullTank: 250 },
    4: { name: "Industrial Oil 40 (B)", type: "liter", min: 1500 },
    5: { name: "Industrial Oil 60 (R)", type: "liter", min: 1, fullTank: 250},
    6: { name: "Industrial Oil 60 (B)", type: "liter", min: 1500 },
  };

  // Fetch customers, products, stations
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError('');
        
        const [customersRes, productsRes, stationsRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/create-request'),
          fetch('/api/stations')
        ]);

        if (!customersRes.ok) throw new Error('Failed to fetch customers');
        if (!productsRes.ok) throw new Error('Failed to fetch products');
        if (!stationsRes.ok) throw new Error('Failed to fetch stations');

        const customersData = await customersRes.json();
        const productsData = await productsRes.json();
        const stationsData = await stationsRes.json();

        setCustomers(customersData);
        setProducts(productsData);
        setStations(stationsData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Handle form field change
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'products_codes') {
      const prodId = parseInt(value);
      const product = productConfig[prodId] || null;
      setSelectedProduct(product);

      if (product?.fullTank) {
        // Auto-set request type to Full tank and qty
        setFormData(prev => ({
          ...prev,
          qty: product.fullTank,
          aty: '',
          request_type: 'Full tank'
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          qty: '',
          aty: '',
          request_type: 'Liter'
        }));
      }
    }

    if (name === 'request_type' && selectedProduct?.fullTank) {
      if (value === 'Full tank') {
        setFormData(prev => ({ ...prev, qty: selectedProduct.fullTank, aty: '' }));
      } else {
        setFormData(prev => ({ ...prev, qty: '', aty: '' }));
      }
    }
  };

  // Handle dynamic qty/aty input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let qty = formData.qty;

    if (selectedProduct?.type === 'bucket') {
      if (name === 'aty') qty = value * selectedProduct.bucketSize;
    } else {
      qty = value;
    }

    setFormData(prev => ({ ...prev, [name]: value, qty }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert('Please select a product.');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch('/api/submit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Request created successfully! RID: ${data.rid}`);
        router.push('/filling-requests'); // ✅ redirect to filling requests
      } else {
        alert(data.error || 'Failed to create request.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('An error occurred while creating request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      customer: '',
      products_codes: '',
      station_id: '',
      vehicle_no: '',
      driver_no: '',
      request_type: 'Liter',
      qty: '',
      aty: '',
      remarks: '',
    });
    setSelectedProduct(null);
  };

  if (loading && customers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:block fixed top-0 left-0 h-full w-64 bg-gray-100 shadow-lg z-20">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col md:ml-64">
        <div className="fixed top-0 left-0 md:left-64 right-0 z-10">
          <Header />
        </div>

        <main className="flex-1 mt-20 mb-20 md:mb-16 overflow-auto px-4 py-6">
          <div className="mb-6 flex items-center space-x-2">
            <button
              onClick={() => router.back()}
              className="text-blue-500 hover:text-blue-700 flex items-center"
            >
              &larr; Back
            </button>
            <h1 className="text-2xl font-bold">Purchase Request</h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">New Request</h2>

            {selectedProduct && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="font-medium">Selected: {selectedProduct.name}</p>
                <p className="text-sm text-gray-600">
                  {selectedProduct.min && `Min: ${selectedProduct.min}Ltr `}
                  {selectedProduct.fullTank && `• Full Tank = ${selectedProduct.fullTank}Ltr `}
                  {selectedProduct.bucketSize && `• 1 Bucket = ${selectedProduct.bucketSize}Ltr `}
                </p>
              </div>
            )}

            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
              {/* Customer */}
              <div className="flex flex-col">
                <label className="mb-1 font-medium">Select Customer *</label>
                <select
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                  disabled={loading || submitting}
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name || `Customer ${c.id}`}</option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div className="flex flex-col">
                <label className="mb-1 font-medium">Select Product *</label>
                <select
                  name="products_codes"
                  value={formData.products_codes}
                  onChange={handleChange}
                  className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                  disabled={loading || submitting}
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.pcode}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic qty */}
              {selectedProduct && (
                <div className="flex flex-col">
                  <label className="mb-1 font-medium">
                    {selectedProduct.type === "bucket"
                      ? `No. of Buckets (Min ${selectedProduct.min}) *`
                      : `Liters (Min ${selectedProduct.min}) *`}
                  </label>
                  <input
                    type="number"
                    name="aty"
                    value={formData.aty}
                    onChange={handleInputChange}
                    min={selectedProduct.min}
                    className="border p-2 rounded"
                    required={selectedProduct.type !== 'liter' || formData.request_type === 'Liter'}
                  />
                  {selectedProduct.type === 'bucket' && (
                    <input
                      type="number"
                      value={formData.qty}
                      disabled
                      className="border p-2 rounded bg-gray-100 mt-2"
                      placeholder="Total Liters"
                    />
                  )}
                  {selectedProduct.fullTank && formData.request_type === 'Full tank' && (
                    <p className="text-sm text-gray-600 mt-1">
                      Full Tank = {selectedProduct.fullTank} Ltr
                    </p>
                  )}
                </div>
              )}

              {/* Station */}
              <div className="flex flex-col">
                <label className="mb-1 font-medium">Select Station *</label>
                <select
                  name="station_id"
                  value={formData.station_id}
                  onChange={handleChange}
                  className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                  disabled={loading || submitting}
                >
                  <option value="">Select Station</option>
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>{s.station_name || `Station ${s.id}`}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle */}
              <div className="flex flex-col">
                <label className="mb-1 font-medium">Vehicle Number *</label>
                <input
                  type="text"
                  name="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={handleChange}
                  placeholder="Enter Vehicle Number"
                  className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Driver */}
              <div className="flex flex-col">
                <label className="mb-1 font-medium">Driver Number *</label>
                <input
                  type="tel"
                  name="driver_no"
                  value={formData.driver_no}
                  onChange={handleChange}
                  placeholder="Enter Driver Number"
                  className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Request Type */}
              <div className="flex flex-col">
                <label className="mb-1 font-medium">Request Type *</label>
                <div className="flex flex-wrap gap-4">
                  {['Liter', 'Full tank'].map(type => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="request_type"
                        value={type}
                        checked={formData.request_type === type}
                        onChange={handleChange}
                        className="accent-blue-500"
                        disabled={submitting || !selectedProduct || (type === 'Full tank' && !selectedProduct?.fullTank)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="flex flex-col md:col-span-2">
                <label className="mb-1 font-medium">Remarks</label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="Enter Remarks"
                  className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={submitting}
                />
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 flex gap-4 justify-end mt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2 rounded bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200"
                  disabled={submitting}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={submitting || !selectedProduct}
                >
                  {submitting ? 'Creating Request...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </main>

        <div className="fixed bottom-0 left-0 md:left-64 right-0 z-10">
          <Footer />
        </div>
      </div>
    </div>
  );
}
