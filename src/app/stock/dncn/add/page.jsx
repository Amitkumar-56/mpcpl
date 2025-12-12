'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AddDNCNContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [formData, setFormData] = useState({
    type: 'Supplier', // Transporter/Supplier
    supplier_id: '',
    transporter_id: '',
    dncn_type: 'Debit',
    amount: '',
    remarks: ''
  });

  useEffect(() => {
    if (id) {
      fetchStockData();
      fetchSuppliersAndTransporters();
    } else {
      setError('Stock ID is required');
      setLoading(false);
    }
  }, [id]);

  const fetchSuppliersAndTransporters = async () => {
    try {
      const [suppliersRes, transportersRes] = await Promise.all([
        fetch('/api/suppliers'),
        fetch('/api/transporters')
      ]);
      
      const suppliersData = await suppliersRes.json();
      const transportersData = await transportersRes.json();
      
      if (Array.isArray(suppliersData)) {
        setSuppliers(suppliersData);
      }
      
      if (transportersData.success && Array.isArray(transportersData.data)) {
        setTransporters(transportersData.data);
      }
    } catch (err) {
      console.error('Error fetching suppliers/transporters:', err);
    }
  };

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/stock/dncn?id=${id}`);
      const data = await response.json();
      
      if (data.success) {
        setStockData(data.stock);
        // Pre-fill supplier if available
        if (data.stock.supplier_id) {
          setFormData(prev => ({
            ...prev,
            supplier_id: data.stock.supplier_id.toString()
          }));
        }
      } else {
        setError(data.error || 'Failed to fetch stock data');
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const amount = parseFloat(formData.amount);
      const currentDncn = parseFloat(stockData.dncn || 0);
      const newDncn = formData.dncn_type === 'Debit' 
        ? currentDncn + amount 
        : currentDncn - amount;

      const response = await fetch('/api/stock/dncn/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: id,
          type: formData.type,
          supplier_id: formData.type === 'Supplier' ? formData.supplier_id : null,
          transporter_id: formData.type === 'Transporter' ? formData.transporter_id : null,
          dncn_type: formData.dncn_type,
          amount: amount,
          remarks: formData.remarks || '',
          current_dncn: currentDncn,
          new_dncn: newDncn
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('DNCN added successfully!');
        router.push(`/stock/dncn?id=${id}`);
      } else {
        setError(data.error || 'Failed to add DNCN');
      }
    } catch (err) {
      console.error('Error adding DNCN:', err);
      setError('Failed to add DNCN: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (error && !stockData) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Link
                href="/stock"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Stock
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  const currentDncn = parseFloat(stockData?.dncn || 0);
  const previewNewDncn = formData.amount && parseFloat(formData.amount) > 0
    ? (formData.dncn_type === 'Debit' 
        ? currentDncn + parseFloat(formData.amount)
        : currentDncn - parseFloat(formData.amount))
    : currentDncn;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
              <nav className="flex space-x-2 text-sm text-gray-600 mb-4">
                <Link href="/stock" className="text-blue-600 hover:text-blue-800">
                  Stock
                </Link>
                <span>/</span>
                <Link href={`/stock/dncn?id=${id}`} className="text-blue-600 hover:text-blue-800">
                  DNCN
                </Link>
                <span>/</span>
                <span className="text-gray-900">Add DNCN</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Add Debit/Credit Note
              </h1>
            </div>

            {/* Stock Info Card */}
            {stockData && (
              <div className="bg-white rounded-lg shadow mb-6 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Invoice Number</label>
                    <p className="text-gray-900 font-medium">{stockData.invoice_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Supplier</label>
                    <p className="text-gray-900 font-medium">{stockData.supplier_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Product</label>
                    <p className="text-gray-900 font-medium">{stockData.product_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Current DNCN</label>
                    <p className={`text-lg font-bold ${currentDncn >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{currentDncn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="bg-white rounded-lg shadow p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Transporter/Supplier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Transporter/Supplier
                    </label>
                    <div className="space-y-3">
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="Supplier">Supplier</option>
                        <option value="Transporter">Transporter</option>
                      </select>
                      
                      {formData.type === 'Supplier' ? (
                        <select
                          name="supplier_id"
                          value={formData.supplier_id}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          name="transporter_id"
                          value={formData.transporter_id}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select Transporter</option>
                          {transporters.map((transporter) => (
                            <option key={transporter.id} value={transporter.id}>
                              {transporter.transporter_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* DNCN Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      DNCN Type
                    </label>
                    <select
                      name="dncn_type"
                      value={formData.dncn_type}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Debit">Debit</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter remarks (optional)"
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y"
                  />
                </div>

                {/* Preview */}
                {formData.amount && parseFloat(formData.amount) > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Preview</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current DNCN:</span>
                        <span className={`font-medium ${currentDncn >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{currentDncn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{formData.dncn_type} Amount:</span>
                        <span className={`font-medium ${formData.dncn_type === 'Debit' ? 'text-red-600' : 'text-green-600'}`}>
                          {formData.dncn_type === 'Debit' ? '+' : '-'}₹{parseFloat(formData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200">
                        <span className="text-gray-900 font-semibold">New DNCN:</span>
                        <span className={`text-lg font-bold ${previewNewDncn >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{previewNewDncn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        type: 'Supplier',
                        supplier_id: stockData?.supplier_id?.toString() || '',
                        transporter_id: '',
                        dncn_type: 'Debit',
                        amount: '',
                        remarks: ''
                      });
                    }}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function AddDNCNPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <AddDNCNContent />
    </Suspense>
  );
}

