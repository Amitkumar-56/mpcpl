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

      {/* Main Content - Fixed height and proper scrolling */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 w-full h-full">
          {/* Back Button and Station Info */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/nb-stock')}
                  className="flex items-center text-blue-600 hover:text-blue-800 transition duration-200 text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to NB Stock
                </button>
                <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-sm">
                  <span className="font-medium">Station ID:</span> {stationId}
                </div>
              </div>
              
              {/* Stock Info and Expense Button */}
              <div className="flex items-center space-x-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <div className="text-xs text-green-600">Current Stock</div>
                  <div className="text-base sm:text-lg font-bold text-green-800">
                    {data.summary.currentStock ? `${formatCurrency(data.summary.currentStock)} Ltr` : 'Loading...'}
                  </div>
                </div>
                
                <button
                  onClick={() => router.push(`/nb-stock/create-nb-expense?station_id=${stationId}`)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Add Expense
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards - Compact Grid */}
          {!loading && !error && data.expenseData.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="bg-white rounded-lg shadow p-3 border-l-4 border-blue-500">
                <div className="text-xs font-medium text-gray-500 mb-1">Total Expenses</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(data.summary.totalExpenses || 0)} Ltr
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 border-l-4 border-green-500">
                <div className="text-xs font-medium text-gray-500 mb-1">Total Records</div>
                <div className="text-lg font-bold text-gray-900">
                  {data.summary.totalRecords || 0}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 border-l-4 border-purple-500">
                <div className="text-xs font-medium text-gray-500 mb-1">Products</div>
                <div className="text-lg font-bold text-gray-900">
                  {data.summary.uniqueProducts || 0}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 border-l-4 border-amber-500">
                <div className="text-xs font-medium text-gray-500 mb-1">Unique Users</div>
                <div className="text-lg font-bold text-gray-900">
                  {data.summary.uniqueUsers || 0}
                </div>
              </div>
            </div>
          )}

          {/* Main Card - Fixed height with internal scrolling */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-180px)] flex flex-col">
            <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-0">NB Expense History</h2>
                {!loading && !error && (
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-500">
                      Showing <span className="font-semibold">{data.expenseData.length}</span> records
                    </div>
                    <button
                      onClick={fetchData}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition duration-200"
                      title="Refresh"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-auto p-2 sm:p-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-gray-600 text-sm">Loading expense history...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-red-500 mb-3">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 mb-2">Error Loading Data</h3>
                  <p className="text-gray-600 text-sm mb-4 max-w-md text-center">{error}</p>
                  <button
                    onClick={fetchData}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition duration-200 text-sm"
                  >
                    Try Again
                  </button>
                </div>
              ) : data.expenseData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-gray-400 mb-3">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 mb-2">No Expense Records</h3>
                  <p className="text-gray-600 text-sm mb-4 text-center">No expense history for Station ID: {stationId}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => router.push(`/nb-stock/create-nb-expense?station_id=${stationId}`)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-medium transition duration-200 text-sm"
                    >
                      Add First Expense
                    </button>
                    <button
                      onClick={() => router.push('/nb-stock')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition duration-200 text-sm"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-full inline-block align-middle">
                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-3">
                      {data.expenseData.map((row, index) => (
                        <div key={row.id} className="bg-gray-50 rounded border border-gray-200 p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-gray-500">Invoice Date</div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatDate(row.payment_date)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Stock Deducted</div>
                              <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                {formatCurrency(row.amount)} Ltr
                              </span>
                            </div>
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500">Invoice No.</div>
                              <div className="text-sm font-medium text-gray-900 truncate">{row.title}</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500">Customer</div>
                              <div className="text-sm font-medium text-gray-600">
                                {row.paid_to || '-'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Stock After</div>
                              <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                                row.remaining_stock >= 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {(row.remaining_stock || 0).toFixed(2)} Ltr
                              </span>
                            </div>
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500">Product</div>
                              <div className="text-sm text-gray-900">{row.product_name}</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500">Remarks</div>
                              <div className="text-sm text-gray-700 line-clamp-2">{row.reason || '-'}</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500">Created by</div>
                              <div className="text-sm font-medium text-blue-600">
                                {getUserBadge(row.created_by_name, row.created_by_id)}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                At: {new Date(row.created_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View - Compact */}
                    <table className="min-w-full divide-y divide-gray-200 hidden sm:table text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice No.
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock (Ltr)
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Before
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            After
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Remarks
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created by
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
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="text-xs text-gray-900">{formatDate(row.payment_date)}</div>
                              <div className="text-[10px] text-gray-500">
                                {new Date(row.payment_date).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{row.title}</div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">{row.paid_to || '-'}</div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                {formatCurrency(row.amount)} Ltr
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">{row.product_name}</div>
                              <div className="text-[10px] text-gray-500">ID: {row.product_id}</div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900">
                              <div className="font-medium text-blue-600">
                                {row.total_stock?.toFixed(2) || '0.00'} Ltr
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                                row.remaining_stock >= 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {(row.remaining_stock || 0).toFixed(2)} Ltr
                              </span>
                            </td>
                            <td className="px-2 py-1.5 max-w-[120px]">
                              <div className="text-xs text-gray-700 line-clamp-2">{row.reason || '-'}</div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex flex-col">
                                {getUserBadge(row.created_by_name, row.created_by_id)}
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  {new Date(row.created_at).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Compact */}
            {!loading && !error && data.expenseData.length > 0 && (
              <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-gray-600 mb-1 sm:mb-0">
                    <span className="font-medium">Last updated:</span> {new Date().toLocaleTimeString('en-IN')}
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Total deducted:</span>{' '}
                    <span className="font-bold text-red-600">
                      {formatCurrency(data.summary.totalExpenses)} Ltr
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Compact Footer */}
      <div className="flex-shrink-0">
        <div className="h-12">
          <Footer />
        </div>
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