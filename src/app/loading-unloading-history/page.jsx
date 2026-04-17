// src/app/loading-unloading-history/page.jsx
'use client';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, Suspense, useEffect, useState } from 'react';

// Loading Skeleton Component
function PageSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 flex items-center justify-center p-6 bg-gray-50/50">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
              <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
            </div>
            <p className="text-gray-600 font-medium mt-4 tracking-wide">Loading Dashboard Data...</p>
          </div>
        </main>
      </div>
    </div>
  );
}

// Error component
function ErrorDisplay({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md mx-4">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <div className="text-red-600 text-xl font-semibold mb-4">Error</div>
        <div className="text-gray-600 mb-6 text-sm">{error}</div>
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ icon, value, label }) {
  return (
    <div className="bg-white text-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
}

// Main content component
function LoadingUnloadingContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const router = useRouter();
  const { user } = useSession();

  useEffect(() => {
    const init = async () => {
      if (!user) {
        console.log('No user, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('User found, starting fetch...', { id: user.id, role: user.role });
      await fetchData();
    };

    init();

    // Add visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('Page visible again, refreshing data...');
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, router]);

  // Refetch data when page changes
  useEffect(() => {
    if (user && !loading) {
      fetchData();
    }
  }, [currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user || !user.id) {
        console.error('No user ID');
        router.push('/login');
        return;
      }

      console.log('Starting fetch for user:', user.id);

      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const sid = sp ? sp.get('shipment_id') : null;
      const apiUrl = `/api/loading-unloading-history?user_id=${user.id}&role=${user.role || ''}&page=${currentPage}&limit=10${sid ? `&shipment_id=${sid}` : ''}`;
      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      console.log('Response status:', response.status);

      const result = await response.json();
      console.log('API Result:', result);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('user');
          sessionStorage.clear();
          router.push('/login');
          return;
        }

        if (response.status === 403) {
          setError(result.error || 'Access denied. You do not have permission.');
          return;
        }

        throw new Error(result.error || result.message || `HTTP ${response.status}`);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      setData({
        shipments: Array.isArray(result.shipments) ? result.shipments : [],
        permissions: result.permissions || { can_view: 0, can_edit: 0, can_create: 0 },
        summary: result.summary || { total: 0, completed: 0, pending: 0, drivers: 0 }
      });
      setPagination(result.pagination || null);

    } catch (err) {
      console.error('Fetch error details:', err);
      setError(err.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchData();
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePrevPage = () => {
    if (pagination && pagination.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Show loading skeleton
  if (loading) {
    return <PageSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
          <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
            <Header />
          </div>
          <main className="pt-24 lg:pt-28 flex-1 overflow-y-auto scrollbar-none px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <div className="max-w-5xl mx-auto">
              <ErrorDisplay error={error} onRetry={handleRetry} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show no data state
  if (!data) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
          <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
            <Header />
          </div>
          <main className="pt-24 lg:pt-28 flex-1 overflow-y-auto scrollbar-none px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">No data available</div>
                <button
                  onClick={handleRetry}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const { shipments, permissions, summary } = data;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0">
          <Header />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.back()}
                    className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    title="Go Back"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Loading & Unloading</h1>
                </div>
                <p className="text-gray-500 text-sm mt-1 ml-11">Manage and track all loading/unloading activities</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {(permissions?.can_create === 1 || Number(user?.role) === 5 || true) && (
                  <Link
                    href="/loading-unloading-history/create-loading-unloading"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 hover:shadow-md transition-all font-medium text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Record
                  </Link>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Shipments */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path></svg>
                </div>
                <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Total Shipments</h3>
                <p className="text-3xl font-bold text-gray-800">{summary.total || 0}</p>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1"><div className="bg-blue-500 h-1 rounded-full w-full"></div></div>
              </div>

              {/* Completed */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-12 h-12 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                </div>
                <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Completed</h3>
                <p className="text-3xl font-bold text-emerald-600">{summary.completed || 0}</p>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1"><div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${summary.total ? (summary.completed / summary.total) * 100 : 0}%` }}></div></div>
              </div>

              {/* Pending */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-12 h-12 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                </div>
                <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Pending</h3>
                <p className="text-3xl font-bold text-orange-500">{summary.pending || 0}</p>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1"><div className="bg-orange-500 h-1 rounded-full" style={{ width: `${summary.total ? (summary.pending / summary.total) * 100 : 0}%` }}></div></div>
              </div>

              {/* Active Drivers */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-12 h-12 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                </div>
                <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Active Drivers</h3>
                <p className="text-3xl font-bold text-indigo-600">{summary.drivers || 0}</p>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1"><div className="bg-indigo-500 h-1 rounded-full w-full"></div></div>
              </div>
            </div>

            {/* Shipments Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Shipment Records</h2>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {shipments.length} record{shipments.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={fetchData}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {shipments.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-b-lg">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tanker
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Driver
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dispatch From
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mobile
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Loading Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Net Wt
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {shipments.map((shipment, index) => (
                          <Fragment key={shipment.id || shipment.shipment_id || index}>
                            <tr key={(shipment.id || shipment.shipment_id || index) + '-row'} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{shipment.id || shipment.shipment_id || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {shipment.tanker || shipment.tanker_number || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {shipment.driver || shipment.driver_name || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {shipment.dispatch || shipment.dispatch_from || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {shipment.driver_mobile || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {shipment.consignee || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {shipment.final_loading_datetime
                                  ? new Date(shipment.final_loading_datetime).toLocaleDateString('en-GB')
                                  : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => toggleExpand(shipment.id || shipment.shipment_id || index)}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                  aria-expanded={expandedId === (shipment.id || shipment.shipment_id || index)}
                                >
                                  {shipment.net_weight_loading || '0'}
                                  {expandedId === (shipment.id || shipment.shipment_id || index) ? (
                                    <svg className="w-4 h-4 ml-1.5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 ml-1.5 transform -rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                              </td>
                            </tr>
                            {expandedId === (shipment.id || shipment.shipment_id || index) && (
                              <tr key={(shipment.id || shipment.shipment_id || index) + '-details'} className="bg-gray-50">
                                <td colSpan={8} className="px-6 py-4">
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="p-3 border border-gray-200 rounded">
                                        <div className="text-xs text-gray-500">Logs</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          <div>Entered By (Loading): {shipment.entered_by_loading || '-'}</div>
                                          <div className="mt-1">Entered By (Unloading): {shipment.entered_by_unloading || '-'}</div>
                                        </div>
                                      </div>
                                      <div className="p-3 border border-gray-200 rounded">
                                        <div className="text-xs text-gray-500">Actions</div>
                                        <div className="text-sm font-semibold text-blue-600">
                                          <div className="flex items-center space-x-4">
                                            <Link
                                              href={`/loading-unloading-history/pdf-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                                              target="_blank"
                                              className="hover:text-blue-800"
                                            >
                                              View
                                            </Link>
                                            <Link
                                              href={`/loading-unloading-history/edit-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                                              className="text-gray-600 hover:text-gray-800"
                                            >
                                              Edit
                                            </Link>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-semibold text-gray-700 mb-2">No Records Found</p>
                  <p className="text-sm text-gray-500 mb-6">No shipment records available</p>
                  {(permissions?.can_create === 1 || user?.role === 5) && (
                    <Link
                      href="/loading-unloading-history/create-loading-unloading"
                      className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition duration-200"
                    >
                      Create First Record
                    </Link>
                  )}
                </div>
              )}

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing {((pagination.currentPage - 1) * pagination.recordsPerPage) + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)} of{' '}
                      {pagination.totalRecords} records
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={handlePrevPage}
                        disabled={!pagination.hasPrevPage}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                pageNum === pagination.currentPage
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={handleNextPage}
                        disabled={!pagination.hasNextPage}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function LoadingUnloadingHistory() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LoadingUnloadingContent />
    </Suspense>
  );
}
