'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading component for Suspense fallback
function EditExpenseLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading expense data...</p>
      </div>
    </div>
  );
}

// Error component
function EditExpenseError({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-xl mb-4">Error</div>
        <div className="text-gray-600 mb-6">{error}</div>
        <div className="space-x-4">
          <button 
            onClick={onRetry}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <Link 
            href="/nb-expenses"
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Expenses
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main Edit Expense Content Component
function EditExpenseContent() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expense, setExpense] = useState(null);
  const [userInfo, setUserInfo] = useState({ role: '', employee_id: '' });
  const [contentLoading, setContentLoading] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      if (!response.ok) throw new Error('Failed to verify user');
      
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUserInfo({
          role: data.user.role,
          employee_id: data.user.employee_id
        });
        if (id) {
          await fetchExpense(data.user.role, data.user.employee_id);
        }
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      setError('Failed to load user information');
      setContentLoading(false);
    }
  };

  const fetchExpense = async (role, employeeId) => {
    try {
      const response = await fetch(`/api/nb-expenses/edit?id=${id}&role=${role}&employee_id=${employeeId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch expense');
      }
      
      const data = await response.json();
      setExpense(data.expense);
      setAmount(data.expense.amount.toString());
    } catch (err) {
      setError(err.message);
    } finally {
      setContentLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || isNaN(parseFloat(amount))) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/nb-expenses/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          amount: parseFloat(amount),
          role: userInfo.role,
          employee_id: userInfo.employee_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update expense');
      }

      router.push('/nb-expenses');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const retryLoading = () => {
    setError('');
    setContentLoading(true);
    fetchUserInfo();
  };

  // Handle missing ID
  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl mb-4">No expense ID provided</div>
          <Link 
            href="/nb-expenses"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Expenses
          </Link>
        </div>
      </div>
    );
  }

  // Show error state if there's an error during initial loading
  if (error && !expense && contentLoading === false) {
    return <EditExpenseError error={error} onRetry={retryLoading} />;
  }

  // Show loading state for initial content
  if (contentLoading) {
    return <EditExpenseLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <Link 
            href="/nb-expenses" 
            className="text-gray-500 hover:text-gray-700 mr-4 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Expense Amount</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          {expense && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-medium text-gray-700 mb-3">Expense Details:</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Title:</span>
                  <span>{expense.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Date:</span>
                  <span>{expense.payment_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Paid To:</span>
                  <span>{expense.paid_to}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Current Amount:</span>
                  <span className="font-bold">${parseFloat(expense.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Amount'
              )}
            </button>
            
            <Link
              href="/nb-expenses"
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function EditExpensePage() {
  return (
    <Suspense fallback={<EditExpenseLoading />}>
      <EditExpenseContent />
    </Suspense>
  );
}