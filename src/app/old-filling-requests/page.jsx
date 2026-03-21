// src/app/old-filling-requests/page.jsx
'use client';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading Component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading old filling requests...</p>
        <p className="text-sm text-gray-500 mt-2">Optimizing performance with pagination</p>
      </div>
    </div>
  );
}

// Skeleton Loading Component for Table
function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loading Station</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filling Qty</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Error Component
function ErrorFallback({ error, onRetry }) {
  const isAuthError = error && (error.includes('Unauthorized') || error.includes('login') || error.includes('Please login'));

  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-red-500 text-center">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">
            {isAuthError ? 'Authentication Required' : 'Error Loading Page'}
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          {isAuthError ? (
            <button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Go to Login
            </button>
          ) : (
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Content Component
function OldFillingRequestsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    loadingStation: ''
  });
  const [stations, setStations] = useState([]);
  const [exporting, setExporting] = useState(false);

  // Check authentication and fetch data
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Only allow roles 5, 4, 3, 7
    const allowedRoles = [5, 4, 3, 7];
    if (!allowedRoles.includes(Number(user.role))) {
      setError('Access Denied: You do not have permission to view this page.');
      setLoading(false);
      return;
    }

    fetchRequests();
    fetchStations();
  }, [authLoading, user]);

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStations(data.stations || []);
        }
      }
    } catch (err) {
      console.error('Error fetching stations:', err);
    }
  };

  const fetchRequests = async (page = 1, exportMode = false) => {
    try {
      if (!exportMode) {
        if (initialLoading) {
          setInitialLoading(false);
        }
        setLoading(true);
      } else {
        setExporting(true);
      }
      setError('');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });

      if (filters.fromDate) {
        params.append('from_date', filters.fromDate);
      }
      if (filters.toDate) {
        params.append('to_date', filters.toDate);
      }
      if (filters.loadingStation) {
        params.append('loading_station', filters.loadingStation);
      }
      if (exportMode) {
        params.append('export', 'true');
      }

      const response = await fetch(`/api/old-filling-requests?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.status === 403) {
        setError('You do not have permission to view this page');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load data');
      }

      setRequests(data.requests || []);
      setPagination(data.pagination);
      
      if (exportMode) {
        exportToCSV(data.requests);
      }
      
      console.log(`✅ Loaded ${data.requests?.length || 0} old filling requests`);

    } catch (err) {
      console.error('❌ Error fetching requests:', err);
      setError(err.message || 'Failed to load requests. Please try again.');
    } finally {
      if (!exportMode) {
        setLoading(false);
      } else {
        setExporting(false);
      }
    }
  };

  const exportToCSV = (data) => {
    const csv = [
      ['Request ID', 'Product', 'Loading Station', 'Vehicle No', 'Client Name', 'Filling Qty', 'Completed Date', 'Status', 'Remarks'],
      ...data.map(request => [
        request.request_id,
        request.product,
        request.loading_station,
        request.vehicle_no,
        request.client_name,
        request.filling_qty,
        request.completed_date,
        request.status,
        request.remark
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `old-filling-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchRequests(1);
  };

  const resetFilters = () => {
    setFilters({ fromDate: '', toDate: '', loadingStation: '' });
    setCurrentPage(1);
    fetchRequests(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchRequests(newPage);
  };

  const handleExport = () => {
    fetchRequests(1, true);
  };

  if (authLoading || initialLoading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return null;
  }

  if (error && !requests.length) {
    return <ErrorFallback error={error} onRetry={fetchRequests} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Old Filling Requests</h1>
              <p className="text-gray-600 mt-1">
                Total {pagination?.total || requests.length} request{(pagination?.total || requests.length) !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => fetchRequests(currentPage)}
                className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition duration-200 shadow-sm disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Requests</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loading Station</label>
                <select
                  value={filters.loadingStation}
                  onChange={(e) => handleFilterChange('loadingStation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Stations</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.station_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition duration-200"
                >
                  Apply Filters
                </button>
                <button
                  onClick={resetFilters}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-lg transition duration-200"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-800">{error}</span>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Old Filling Requests List</h2>
              {loading && (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Refreshing...
                </div>
              )}
            </div>
          </div>

          {loading && !initialLoading ? (
            <TableSkeleton />
          ) : (
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loading Station</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filling Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.length > 0 ? (
                    requests.map((request, index) => (
                      <tr key={`${request.request_id}-${index}`} className="hover:bg-gray-50 transition duration-150">
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{request.request_id}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{request.product}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{request.loading_station}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{request.vehicle_no}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{request.client_name}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{request.filling_qty}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{request.completed_date || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-lg font-medium">No old filling requests found</p>
                          <p className="text-sm mt-1">Requests will appear here when available</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                    {pagination.page}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden mt-4 space-y-3">
          {requests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base font-medium">No old filling requests found</p>
              </div>
            </div>
          ) : (
            requests.map((request, index) => (
              <div key={`${request.request_id}-${index}`} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-blue-600">Request #{request.request_id}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Product:</span>
                      <p className="text-gray-700">{request.product}</p>
                    </div>
                    <div>
                      <span className="font-medium">Vehicle No:</span>
                      <p className="text-gray-700">{request.vehicle_no}</p>
                    </div>
                    <div>
                      <span className="font-medium">Client Name:</span>
                      <p className="text-gray-700">{request.client_name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Loading Station:</span>
                      <p className="text-gray-700">{request.loading_station}</p>
                    </div>
                    <div>
                      <span className="font-medium">Filling Qty:</span>
                      <p className="text-gray-700">{request.filling_qty}</p>
                    </div>
                    <div>
                      <span className="font-medium">Completed Date:</span>
                      <p className="text-gray-700">{request.completed_date || 'Not completed'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mobile Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="lg:hidden mt-4 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                  {pagination.page}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Main Component with Suspense
export default function OldFillingRequests() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0">
          <Suspense fallback={<LoadingFallback />}>
            <OldFillingRequestsContent />
          </Suspense>
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}