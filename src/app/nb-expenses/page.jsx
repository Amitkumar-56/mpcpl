'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

// Loading component for Suspense fallback
function ExpensesLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading expenses...</p>
      </div>
    </div>
  );
}

// Error boundary component (simplified version)
function ExpensesError({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-xl mb-4">Error</div>
        <div className="text-gray-600 mb-6">{error}</div>
        <button 
          onClick={onRetry}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Main Expenses Content Component
function ExpensesContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [expenses, setExpenses] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    hasMore: true
  });
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  // Function to remove duplicate expenses
  const removeDuplicateExpenses = (expensesArray) => {
    const seen = new Set();
    return expensesArray.filter(expense => {
      const identifier = `${expense.id}-${expense.payment_date}-${expense.amount}-${expense.title}`;
      if (seen.has(identifier)) {
        console.warn('Duplicate expense found:', expense);
        return false;
      }
      seen.add(identifier);
      return true;
    });
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/nb-expenses', {
        signal: controller.signal,
        credentials: 'include', // Include cookies for auth
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        const errorMessage = errorData.error || `Failed to load expenses (${response.status})`;
        
        // Don't redirect on 401, just show error
        if (response.status === 401) {
          setError('Unauthorized. Please login again.');
        } else {
          setError(errorMessage);
        }
        return;
      }
      
      const data = await response.json();
      
      // Check if data has expected structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server');
      }
      
      // Remove duplicates from the data
      const uniqueExpenses = removeDuplicateExpenses(data.expenses || []);
      setExpenses(uniqueExpenses);
      setPermissions(data.permissions || {});
    } catch (err) {
      // Handle abort (timeout)
      if (err.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else {
        setError(err.message || 'Failed to load expenses. Please try again.');
      }
      console.error('❌ [NB Expenses] Error fetching expenses:', err);
    } finally {
      // ✅ Always set loading to false
      setLoading(false);
    }
  };


  const loadMore = async () => {
    if (!pagination.hasMore) return;
    
    try {
      const nextPage = pagination.page + 1;
      const response = await fetch(`/api/nb-expenses?page=${nextPage}&limit=${pagination.limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to load more expenses');
      }
      
      const data = await response.json();
      const uniqueNewExpenses = removeDuplicateExpenses(data.expenses || []);
      
      if (uniqueNewExpenses.length > 0) {
        setExpenses(prev => {
          const combined = [...prev, ...uniqueNewExpenses];
          return removeDuplicateExpenses(combined);
        });
        setPagination(prev => ({ ...prev, page: nextPage }));
      } else {
        setPagination(prev => ({ ...prev, hasMore: false }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Payment Date', 'Title', 'Details', 'Paid To', 'Reason', 'Amount'];
    const csvData = expenses.map(expense => [
      expense.id,
      expense.payment_date,
      expense.title,
      expense.details,
      expense.paid_to,
      expense.reason,
      `$${parseFloat(expense.amount).toFixed(2)}`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter expenses and ensure uniqueness
  const filteredExpenses = removeDuplicateExpenses(
    expenses.filter(expense => {
      if (filters.search && 
          !expense.title?.toLowerCase().includes(filters.search.toLowerCase()) &&
          !expense.details?.toLowerCase().includes(filters.search.toLowerCase()) &&
          !expense.paid_to?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      if (filters.dateFrom && new Date(expense.payment_date) < new Date(filters.dateFrom)) {
        return false;
      }
      
      if (filters.dateTo && new Date(expense.payment_date) > new Date(filters.dateTo)) {
        return false;
      }
      
      if (filters.minAmount && parseFloat(expense.amount) < parseFloat(filters.minAmount)) {
        return false;
      }
      
      if (filters.maxAmount && parseFloat(expense.amount) > parseFloat(filters.maxAmount)) {
        return false;
      }
      
      return true;
    })
  );

  // Generate unique key for each expense
  const getExpenseKey = (expense, suffix = '') => {
    return `${expense.id}-${expense.payment_date}-${expense.amount}-${expense.title}${suffix}`;
  };

  // Show error state if there's an error and no expenses
  if (error && expenses.length === 0) {
    return <ExpensesError error={error} onRetry={fetchExpenses} />;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="max-w-7xl mx-auto mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800">{error}</span>
                  </div>
                  <button 
                    onClick={() => setError('')}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters Section */}
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search expenses..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                    placeholder="1000.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setFilters({
                    search: '',
                    dateFrom: '',
                    dateTo: '',
                    minAmount: '',
                    maxAmount: ''
                  })}
                  className="text-gray-600 hover:text-gray-800 underline text-sm"
                >
                  Clear Filters
                </button>
                <button
                  onClick={exportToCSV}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto">
            {/* Desktop View */}
            <div className="hidden md:block">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredExpenses.map((expense) => (
                        <tr key={getExpenseKey(expense)} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.payment_date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.title}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{expense.details}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.paid_to}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{expense.reason}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${parseFloat(expense.amount).toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {permissions.can_edit && (
                              <Link
                                href={`/nb-expense/edit?id=${expense.id}`}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Edit
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredExpenses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {expenses.length === 0 ? 'No expenses found' : 'No expenses match your filters'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {filteredExpenses.map((expense) => (
                <div key={getExpenseKey(expense, '-mobile')} className="bg-white shadow rounded-lg border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium text-gray-500">ID:</div>
                    <div className="text-gray-900">{expense.id}</div>
                    
                    <div className="font-medium text-gray-500">Date:</div>
                    <div className="text-gray-900">{expense.payment_date}</div>
                    
                    <div className="font-medium text-gray-500">Title:</div>
                    <div className="text-gray-900">{expense.title}</div>
                    
                    <div className="font-medium text-gray-500">Amount:</div>
                    <div className="text-gray-900">${parseFloat(expense.amount).toFixed(2)}</div>
                    
                    <div className="font-medium text-gray-500">Paid To:</div>
                    <div className="text-gray-900">{expense.paid_to}</div>
                    
                    {expense.details && (
                      <>
                        <div className="font-medium text-gray-500">Details:</div>
                        <div className="text-gray-900">{expense.details}</div>
                      </>
                    )}
                    
                    {expense.reason && (
                      <>
                        <div className="font-medium text-gray-500">Reason:</div>
                        <div className="text-gray-900">{expense.reason}</div>
                      </>
                    )}
                    
                    <div className="col-span-2 flex justify-end space-x-2 pt-2 border-t mt-2">
                      {permissions.can_edit && (
                        <Link
                          href={`/nb-expense/edit?id=${expense.id}`}
                          className="text-blue-600 hover:text-blue-900 px-3 py-1 text-sm border border-blue-600 rounded"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredExpenses.length === 0 && (
                <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                  {expenses.length === 0 ? 'No expenses found' : 'No expenses match your filters'}
                </div>
              )}
            </div>
          </div>

          {/* Load More Button */}
          {pagination.hasMore && filteredExpenses.length > 0 && (
            <div className="max-w-7xl mx-auto mt-4 text-center">
              <button
                onClick={loadMore}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Load More
              </button>
            </div>
          )}

          {/* Add Expense FAB - Show button if permissions loaded and can_create is true, or if permissions not loaded yet (optimistic UI) */}
          {(permissions.can_create === 1 || permissions.can_create === true || (!loading && Object.keys(permissions).length === 0)) && (
            <Link
              href="/create-expense"
              className={`fixed bottom-10 right-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 py-3 shadow-lg flex items-center space-x-2 z-50 transition-colors ${loading ? 'opacity-50 cursor-wait' : ''}`}
              onClick={(e) => {
                // Prevent navigation if loading or no permission
                if (loading || (Object.keys(permissions).length > 0 && permissions.can_create !== 1 && permissions.can_create !== true)) {
                  e.preventDefault();
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Expense</span>
            </Link>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function ExpensesPage() {
  return (
    <Suspense fallback={<ExpensesLoading />}>
      <ExpensesContent />
    </Suspense>
  );
}