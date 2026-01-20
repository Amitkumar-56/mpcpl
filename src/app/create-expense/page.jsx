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
    amount: ''
  });
  
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchCurrentBalance();
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
      amount: ''
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
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 z-30 bg-white shadow-lg">
        <Sidebar activePage="CreateExpense" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-64 z-20 bg-white shadow-md">
          <Header />
        </div>

        {/* Scrollable Main Content - Adjusted for header height */}
        <main className="flex-1 mt-16 pb-24 overflow-y-auto">
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <button 
                      type="button"
                      onClick={() => router.back()}
                      className="mr-4 text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Add New Expense</h1>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-lg font-semibold text-gray-900">
                      Current Cash Balance: <span className="text-blue-600">₹{parseFloat(currentBalance).toLocaleString('en-IN')}</span>
                    </p>
                  </div>

                  {success && (
                    <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                      {success}
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

                  <form className="space-y-6" onSubmit={(e) => {
                    e.preventDefault();
                    confirmSubmit(e);
                  }}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          id="payment_date"
                          name="payment_date"
                          value={formData.payment_date}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                          Customer Name
                        </label>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter customer name"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="paid_to" className="block text-sm font-medium text-gray-700 mb-1">
                          Receiver
                        </label>
                        <input
                          type="text"
                          id="paid_to"
                          name="paid_to"
                          value={formData.paid_to}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter expense details"
                        />
                      </div>

                      <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                          Reason
                        </label>
                        <textarea
                          id="reason"
                          name="reason"
                          value={formData.reason}
                          onChange={handleInputChange}
                          rows={4}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter expense reason"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                          Amount
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
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-3 pl-10 pr-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center space-x-4 pt-6">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white py-3 px-8 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition duration-200"
                      >
                        {loading ? 'Creating...' : 'Submit'}
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={loading}
                        className="bg-gray-300 text-gray-700 py-3 px-8 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-200 disabled:cursor-not-allowed transition duration-200"
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
        <div className="fixed bottom-0 right-0 left-64 z-10 bg-white border-t">
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