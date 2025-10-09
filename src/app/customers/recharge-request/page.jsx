'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RechargeRequestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const customerId = searchParams.get('id');

  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: '2',
    transaction_id: '',
    utr_no: '',
    comments: ''
  });

  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    } else {
      setError('Customer ID is required');
      setPageLoading(false);
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setPageLoading(true);
      const response = await fetch(`/api/customers/recharge-request?id=${customerId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (response.ok && data.customer && data.balance) {
        setCustomerData({
          customer: {
            name: data.customer.name || 'No name found',
            phone: data.customer.phone || 'No phone found'
          },
          balance: {
            current_balance: Number(data.balance.current_balance) || 0,
            current_limit: Number(data.balance.current_limit) || 0
          }
        });
      } else {
        setError(data.error || 'Failed to fetch customer data');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Network error occurred while fetching customer data');
    } finally {
      setPageLoading(false);
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
    setLoading(true);
    setError('');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/customers/recharge-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          com_id: parseInt(customerId),
          amount: parseFloat(formData.amount)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Recharge added successfully!');
        setShowModal(false);
        setFormData({
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          payment_type: '2',
          transaction_id: '',
          utr_no: '',
          comments: ''
        });
        fetchCustomerData();
      } else {
        setError(data.error || 'Failed to process recharge');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Network error occurred while processing recharge');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const numValue = Number(value);
    return `₹${isNaN(numValue) ? '0.00' : numValue.toFixed(2)}`;
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (error && !customerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => router.push('/customers')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No Data</h3>
            <p className="text-yellow-600 mb-4">No customer data available</p>
            <button 
              onClick={() => router.push('/customers')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
       <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.back()} 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Recharge Request</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Recharge Button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="fixed top-6 right-6 z-50 inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold text-base rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Recharge Wallet
      </button>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ">
        {/* Customer Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg font-semibold text-gray-900">Customer Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-600 mb-1">Customer Name</div>
                <div className="text-lg font-semibold text-gray-900">{customerData.customer.name}</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-600 mb-1">Phone Number</div>
                <div className="text-lg font-semibold text-gray-900">{customerData.customer.phone}</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-600 mb-1">Current Balance</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(customerData.balance.current_balance)}
                </div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-sm font-medium text-orange-600 mb-1">Current Limit</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(customerData.balance.current_limit)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div
          className="fixed inset-0 bg-opacity-60 flex-items-center justify-center z-[60] transition-opacity duration-200"
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-auto relative overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-700">
              <h2 className="text-lg font-semibold text-white">
                Recharge Wallet - {customerData.customer.name}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  min="0.01"
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Amount"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type</label>
                <select
                  name="payment_type"
                  value={formData.payment_type}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2">RTGS</option>
                  <option value="3">NEFT</option>
                  <option value="4">UPI</option>
                  <option value="5">CHEQUE</option>
                  <option value="1">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                <input
                  type="text"
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div className="flex justify-end space-x-4 border-t pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
      <Footer />
          </div>
        </div>
  );
}
