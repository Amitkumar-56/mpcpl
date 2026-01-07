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
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>
        <main className="pt-24 lg:pt-28 flex-1 overflow-y-auto scrollbar-none px-4 sm:px-6 lg:px-8 py-4 md:py-8 bg-gray-50">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-gray-100 rounded-lg p-6 h-32 animate-pulse"></div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
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
      const apiUrl = `/api/loading-unloading-history?user_id=${user.id}&role=${user.role || ''}${sid ? `&shipment_id=${sid}` : ''}`;
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>

        {/* Main Content Area */}
        <main className="pt-24 lg:pt-28 flex-1 overflow-y-auto scrollbar-none px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="text-blue-600 hover:text-blue-800 text-2xl transition-colors"
                    title="Go Back"
                  >
                    ←
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Loading & Unloading Dashboard</h1>
                    <p className="text-gray-600 mt-1">
                      Manage and track all loading/unloading activities
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {(permissions?.can_create === 1 || user?.role === 5) && (
                    <Link
                      href="/loading-unloading-history/create-loading-unloading"
                      className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition duration-200 shadow-sm"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create New
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              <SummaryCard
                icon="📦"
                value={summary.total}
                label="Total Shipments"
              />
              <SummaryCard
                icon="✅"
                value={summary.completed}
                label="Completed"
              />
              <SummaryCard
                icon="⏳"
                value={summary.pending}
                label="Pending"
              />
              <SummaryCard
                icon="👨‍✈️"
                value={summary.drivers}
                label="Active Drivers"
              />
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
              <div className="overflow-x-auto scrollbar-none">
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
                              className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                              aria-expanded={expandedId === (shipment.id || shipment.shipment_id || index)}
                            >
                              {shipment.net_weight_loading || '0'}
                              {expandedId === (shipment.id || shipment.shipment_id || index) ? (
                                <svg className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                  <rect x="4" y="9" width="12" height="2" rx="1" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                  <rect x="4" y="9" width="12" height="2" rx="1" />
                                  <rect x="9" y="4" width="2" height="12" rx="1" />
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
                                        {(permissions?.can_edit === 1 || user?.role === 5) && (
                                          <Link
                                            href={`/loading-unloading-history/edit-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                                            className="text-gray-600 hover:text-gray-800"
                                          >
                                            Edit
                                          </Link>
                                        )}
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
