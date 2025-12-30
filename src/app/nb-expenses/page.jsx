'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// ✅ Loading spinner removed - show page skeleton instead

// Main Expenses Content Component
function ExpensesContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [expenses, setExpenses] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Separate effect for filters - with debounce to prevent too many requests
  useEffect(() => {
    if (user && !loading) {
      const timer = setTimeout(() => {
        fetchExpenses(1); // Reset to page 1 when filters change
      }, 500); // Debounce 500ms
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchExpenses = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      // Build query string with filters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);
      
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.minAmount) params.append('minAmount', filters.minAmount);
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
      
      const response = await fetch(`/api/nb-expenses?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        // ✅ Only logout on 401 if it's a real authentication error, not just an API error
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
          // Only logout if the error specifically says unauthorized/auth failed
          if (errorData.error && (errorData.error.includes('Unauthorized') || errorData.error.includes('login'))) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('user');
              sessionStorage.clear();
            }
            router.push('/login');
            return;
          }
          // Otherwise treat as a regular error
          setError(errorData.error || 'Failed to load expenses');
          setLoading(false);
          return;
        }
        
        // Handle 403 (permission denied) separately - don't logout
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({ error: 'Access denied' }));
          setError(errorData.error || 'You do not have permission to view expenses');
          setLoading(false);
          return;
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        setError(errorData.error || `Failed to load expenses (${response.status})`);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Failed to load expenses');
        return;
      }
      
      setExpenses(data.expenses || []);
      setPermissions(data.permissions || {});
      setPagination(data.pagination || {
        page: page,
        limit: pagination.limit,
        total: 0,
        totalPages: 1
      });
      
    } catch (err) {
      setError(err.message || 'Failed to load expenses. Please try again.');
      console.error('❌ [NB Expenses] Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // ✅ Show page skeleton instead of spinner
  if (loading && expenses.length === 0) {
    return (
      <div className="h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto">
              <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
              <div className="bg-white shadow rounded-lg p-4 mb-6">
                <div className="h-40 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0 p-4">
          {/* Error Message */}
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

          {/* Header Section */}
          <div className="max-w-7xl mx-auto mb-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">NB Expenses</h1>
                <p className="text-gray-600">
                  Total: {pagination.total} expenses
                  {expenses.length > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      (Showing {expenses.length} of {pagination.total})
                    </span>
                  )}
                </p>
              </div>
              
              {/* ✅ Show create button if can_create is 1 or true */}
              {(permissions?.can_create === 1 || permissions?.can_create === true) && (
                <Link
                  href="/create-expense"
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Expense</span>
                </Link>
              )}
            </div>
          </div>

          {/* Filters Section */}
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search expenses..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Min Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Max Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    placeholder="10000.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={handleClearFilters}
                  className="text-gray-600 hover:text-gray-800 underline text-sm"
                >
                  Clear Filters
                </button>
                
                <button
                  onClick={() => fetchExpenses(1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="max-w-7xl mx-auto">
            {expenses.length > 0 ? (
              <>
                {/* Desktop View */}
                <div className="hidden md:block">
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid To</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {expenses.map((expense) => (
                            <tr key={`expense-${expense.id}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(expense.payment_date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="font-medium">{expense.title}</div>
                                {expense.reason && (
                                  <div className="text-xs text-gray-500 mt-1">{expense.reason}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">{expense.details}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.paid_to}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {formatCurrency(expense.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {permissions.can_edit && (
                                  <Link
                                    href={`/nb-expense/edit?id=${expense.id}`}
                                    className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-600 rounded hover:bg-blue-50"
                                  >
                                    Edit
                                  </Link>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  {expenses.map((expense) => (
                    <div key={`expense-mobile-${expense.id}`} className="bg-white shadow rounded-lg border border-gray-200 p-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium text-gray-500">ID:</div>
                        <div className="text-gray-900">{expense.id}</div>
                        
                        <div className="font-medium text-gray-500">Date:</div>
                        <div className="text-gray-900">{formatDate(expense.payment_date)}</div>
                        
                        <div className="font-medium text-gray-500">Title:</div>
                        <div className="text-gray-900 font-medium">{expense.title}</div>
                        
                        <div className="font-medium text-gray-500">Amount:</div>
                        <div className="text-gray-900 font-semibold">{formatCurrency(expense.amount)}</div>
                        
                        <div className="font-medium text-gray-500">Paid To:</div>
                        <div className="text-gray-900">{expense.paid_to}</div>
                        
                        {expense.details && (
                          <>
                            <div className="font-medium text-gray-500">Details:</div>
                            <div className="text-gray-900">{expense.details}</div>
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
                </div>
              </>
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No expenses found</p>
                {filters.search || filters.dateFrom || filters.dateTo || filters.minAmount || filters.maxAmount ? (
                  <p className="text-gray-400 text-sm mt-2">Try clearing your filters</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="max-w-7xl mx-auto mt-6">
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => fetchExpenses(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className={`px-4 py-2 border rounded-md ${
                    pagination.page <= 1 || loading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                <span className="text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => fetchExpenses(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className={`px-4 py-2 border rounded-md ${
                    pagination.page >= pagination.totalPages || loading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main Page Component with Suspense - ✅ No spinner fallback
export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}