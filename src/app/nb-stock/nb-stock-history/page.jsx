// app/nb-stock/nb-stock-history/page.jsx
'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading component for Suspense
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Loading expense history...</p>
      </div>
    </div>
  );
}

// Main content component wrapped in Suspense
function NbStockHistoryContent() {
  const [data, setData] = useState({
    expenseData: [],
    summary: {},
    stationId: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const stationId = searchParams.get('station_id');

  useEffect(() => {
    if (!stationId) {
      setError('Station ID is required');
      setLoading(false);
      return;
    }

    fetchData();
  }, [stationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/nb-expense-history?station_id=${stationId}`);
      const result = await response.json();
      
      console.log('API Response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      setData({
        expenseData: result.data || [],
        summary: result.summary || {},
        stationId: result.stationId
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getUserBadge = (userName, userId) => {
    if (!userName || userName === 'Unknown') {
      return (
        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          Unknown
        </span>
      );
    }
    
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-yellow-100 text-yellow-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-red-100 text-red-800',
      'bg-teal-100 text-teal-800'
    ];
    
    const colorIndex = userId ? userId % colors.length : 0;
    
    return (
      <div className="flex items-center">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[colorIndex]}`}>
          {userName}
        </span>
        {userId && (
          <span className="ml-1 text-xs text-gray-500">(ID: {userId})</span>
        )}
      </div>
    );
  };

  if (!stationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Station ID Required</h1>
          <p className="text-gray-600 mb-6">Please provide a station ID to view expense history.</p>
          <button
            onClick={() => router.push('/nb-stock')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200"
          >
            Go to NB Stock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Fixed Header within main content */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <Header />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Back Button and Station Info */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/nb-stock')}
                className="flex items-center text-blue-600 hover:text-blue-800 transition duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to NB Stock
              </button>
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
                <span className="font-medium">Station ID:</span> {stationId}
              </div>
            </div>
            
            {/* Stock Info and Expense Button */}
            <div className="flex items-center space-x-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-600">Current Stock Available</div>
                <div className="text-xl font-bold text-green-800">
                  {data.summary.currentStock ? `${formatCurrency(data.summary.currentStock)} Ltr` : 'Loading...'}
                </div>
              </div>
              
              <button
                onClick={() => router.push(`/nb-stock/expense?station_id=${stationId}`)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Add New Expense
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards - Responsive Grid */}
        {!loading && !error && data.expenseData.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
              <div className="text-sm font-medium text-gray-500 mb-2">Total Expenses</div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalExpenses || 0)} Ltr
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <div className="text-sm font-medium text-gray-500 mb-2">Total Records</div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {data.summary.totalRecords || 0}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
              <div className="text-sm font-medium text-gray-500 mb-2">Products</div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {data.summary.uniqueProducts || 0}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-amber-500">
              <div className="text-sm font-medium text-gray-500 mb-2">Unique Users</div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {data.summary.uniqueUsers || 0}
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-0">Expense Details</h2>
              {!loading && !error && (
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-500">
                    Showing <span className="font-semibold">{data.expenseData.length}</span> records
                  </div>
                  <button
                    onClick={fetchData}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition duration-200"
                    title="Refresh"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="py-20">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">Loading expense history...</p>
                </div>
              </div>
            ) : error ? (
              <div className="py-10 sm:py-20 text-center">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 sm:w-20 sm:h-20 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
                <button
                  onClick={fetchData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200"
                >
                  Try Again
                </button>
              </div>
            ) : data.expenseData.length === 0 ? (
              <div className="py-10 sm:py-20 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 sm:w-20 sm:h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No Expense Records Found</h3>
                <p className="text-gray-600 mb-6">No expense history available for Station ID: {stationId}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push(`/nb-stock/expense?station_id=${stationId}`)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200"
                  >
                    Add First Expense
                  </button>
                  <button
                    onClick={() => router.push('/nb-stock')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  {/* Mobile Card View */}
                  <div className="sm:hidden space-y-4">
                    {data.expenseData.map((row, index) => (
                      <div key={row.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Date</div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(row.payment_date)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Expense</div>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              {formatCurrency(row.amount)} Ltr
                            </span>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500">Title</div>
                            <div className="text-sm font-medium text-gray-900 truncate">{row.title}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500">Product</div>
                            <div className="text-sm text-gray-900">{row.product_name}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Stock Before</div>
                            <div className="text-sm font-medium text-blue-600">
                              {row.total_stock?.toFixed(2) || '0.00'} Ltr
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Stock After</div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              row.remaining_stock >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {(row.remaining_stock || 0).toFixed(2)} Ltr
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expense (Ltr)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Before
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock After
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.expenseData.map((row, index) => (
                        <tr 
                          key={row.id} 
                          className={`hover:bg-gray-50 transition duration-150 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(row.payment_date)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(row.payment_date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{row.title}</div>
                            <div className="text-xs text-gray-500">Paid to: {row.paid_to}</div>
                          </td>
                          <td className="px-4 py-4 max-w-xs">
                            <div className="text-sm text-gray-900 line-clamp-2">{row.reason || '-'}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-red-100 text-red-800">
                              {formatCurrency(row.amount)} Ltr
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              By: {getUserBadge(row.created_by_name, row.created_by_id)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{row.product_name}</div>
                            <div className="text-xs text-gray-500">ID: {row.product_id}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-medium text-blue-600">
                              {row.total_stock?.toFixed(2) || '0.00'} Ltr
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                              row.remaining_stock >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {(row.remaining_stock || 0).toFixed(2)} Ltr
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer with summary */}
          {!loading && !error && data.expenseData.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600 mb-2 sm:mb-0">
                  <span className="font-medium">Last updated:</span> {new Date().toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total deduction:</span>{' '}
                  <span className="font-bold text-red-600">
                    {formatCurrency(data.summary.totalExpenses)} Ltr
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Footer at bottom */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200">
        <Footer />
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function NbStockHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      {/* Main Content Area with Suspense */}
      <div className="flex-1 ml-0 sm:ml-16 lg:ml-64 flex flex-col min-h-screen">
        <Suspense fallback={<LoadingSpinner />}>
          <NbStockHistoryContent />
        </Suspense>
      </div>
    </div>
  );
}