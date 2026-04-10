'use client';

import { useSession } from '@/context/SessionContext';
import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Main Content Component
function CreateExpenseContent() {
  const { user, isAuthenticated } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    title: '',
    details: '',
    paid_to: '',
    reason: '',
    amount: '',
    vendor_id: ''
  });
  
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vendors, setVendors] = useState([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchCurrentBalance();
    fetchVendors();
  }, [isAuthenticated, router]);

  const fetchCurrentBalance = async () => {
    try {
      const response = await fetch('/api/create-expense');
      if (response.ok) {
        const result = await response.json();
        setCurrentBalance(result.data?.currentBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const result = await response.json();
        setVendors(result.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const confirmSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate amount
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    // Check if expense exceeds balance
    if (amountNum > currentBalance) {
      setError(`Expense amount (₹${amountNum.toLocaleString('en-IN')}) exceeds current balance (₹${currentBalance.toLocaleString('en-IN')})`);
      return;
    }

    if (confirm("Are you sure you want to create this expense?")) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/create-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result.message || 'Expense created successfully!');
        
        // Update local balance
        if (result.newBalance !== undefined) {
          setCurrentBalance(result.newBalance);
        }
        
        // Redirect to cash management page after success
        setTimeout(() => {
          router.push('/cash-management');
        }, 1500);
      } else {
        setError(result.error || 'Failed to create expense');
      }
    } catch (error) {
      setError('Network error: Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      title: '',
      details: '',
      paid_to: '',
      reason: '',
      amount: '',
      vendor_id: ''
    });
    setError('');
    setSuccess('');
  };

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed Sidebar - Hidden on mobile */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 z-30 bg-white shadow-lg">
        <Sidebar activePage="CreateExpense" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-0 lg:left-64 z-20 bg-white shadow-md">
          <Header />
        </div>

        {/* Scrollable Main Content - Adjusted for header height */}
        <main className="flex-1 mt-16 pb-24 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white shadow-lg rounded-xl">
                <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
                  <div className="flex items-center">
                    <button 
                      type="button"
                      onClick={() => router.back()}
                      className="mr-3 sm:mr-4 text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Add New Expense</h1>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-base sm:text-lg font-semibold text-gray-900">
                        Current Cash Balance:
                      </p>
                      <span className="text-xl sm:text-2xl font-bold text-blue-600 mt-2 sm:mt-0">
                        ₹{parseFloat(currentBalance).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {success && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 sm:py-4 rounded-lg flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {success}
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 sm:py-4 rounded-lg flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <form className="space-y-6 sm:space-y-8" onSubmit={(e) => {
                    e.preventDefault();
                    confirmSubmit(e);
                  }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="payment_date"
                          name="payment_date"
                          value={formData.payment_date}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700 mb-2">
                          Parking <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="vendor_id"
                          name="vendor_id"
                          value={formData.vendor_id}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          required
                        >
                          <option value="">Select a parking *</option>
                          {vendors.map(vendor => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name} (₹{vendor.amount || 0})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                          Customer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter customer name"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="paid_to" className="block text-sm font-medium text-gray-700 mb-2">
                          Receiver <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="paid_to"
                          name="paid_to"
                          value={formData.paid_to}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter receiver name"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
                          Details
                        </label>
                        <textarea
                          id="details"
                          name="details"
                          value={formData.details}
                          onChange={handleInputChange}
                          rows={3}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter expense details"
                        />
                      </div>

                      <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                          Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="reason"
                          name="reason"
                          value={formData.reason}
                          onChange={handleInputChange}
                          rows={4}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter expense reason"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">₹</span>
                          </div>
                          <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-6 sm:pt-8">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 sm:px-8 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating...
                          </span>
                        ) : 'Submit'}
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={loading}
                        className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 py-3 px-6 sm:px-8 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        Reset
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Fixed Footer at bottom */}
        <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-10 bg-white border-t">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function CreateExpense() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CreateExpenseContent />
    </Suspense>
  );
}