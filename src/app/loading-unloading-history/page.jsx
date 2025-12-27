// src/app/loading-unloading-history/page.jsx
'use client';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// ✅ Loading spinner removed - show page skeleton instead

// Error component
function ErrorDisplay({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 text-xl mb-4">{error}</div>
        <button
          onClick={onRetry}
          className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Summary Card Component - Light colors
function SummaryCard({ icon, value, label }) {
  return (
    <div className="bg-gray-50 text-gray-900 rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
}

// Main content component that will be wrapped in Suspense
function LoadingUnloadingContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useSession();

  useEffect(() => {
    if (user) {
      // ✅ FIX: Check permissions first before fetching data
      checkPermissions();
    } else {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  // ✅ Refresh data when navigating back to this page
  useEffect(() => {
    const handleFocus = () => {
      if (user && document.visibilityState === 'visible') {
        // Refresh data when page gets focus (user navigates back)
        fetchData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const checkPermissions = async () => {
    setLoading(true);
    setError(null);
    
    if (!user || !user.id) {
      router.push('/login');
      setLoading(false);
      return;
    }

    // Admin (role 5) has full access
    if (user.role === 5) {
      await fetchData();
      return;
    }

    // ✅ FIX: Check user's cached permissions from verify API first
    if (user.permissions && user.permissions['Loading History']) {
      const loadingPerms = user.permissions['Loading History'];
      if (loadingPerms.can_view) {
        await fetchData();
        return;
      } else {
        setError('You are not allowed to access this page.');
        setLoading(false);
        return;
      }
    }

    // Check cache first
    const cacheKey = `perms_${user.id}_Loading History`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        await fetchData();
        return;
      } else {
        setError('You are not allowed to access this page.');
        setLoading(false);
        return;
      }
    }

    try {
      // ✅ FIX: Use exact module name as stored in database: "Loading History"
      const moduleName = 'Loading History';
      console.log('🔐 Checking permissions for:', { employee_id: user.id, role: user.role, module: moduleName });
      
      const response = await fetch(
        `/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`
      );
      const data = await response.json();

      console.log('🔐 Permission check result:', {
        employee_id: user.id,
        role: user.role,
        module: moduleName,
        allowed: data.allowed,
        error: data.error
      });

      // Cache permission
      sessionStorage.setItem(cacheKey, JSON.stringify({ can_view: data.allowed }));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (data.allowed) {
        await fetchData();
      } else {
        setError('You are not allowed to access this page.');
        setLoading(false);
        console.log('❌ Access denied - No permission for Loading History module');
      }
    } catch (error) {
      console.error('❌ Permission check error:', error);
      setError('Failed to check permissions');
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user || !user.id) {
        router.push('/login');
        setLoading(false);
        return;
      }

      // ✅ Fetch data with proper error handling
      const response = await fetch(`/api/loading-unloading-history?user_id=${user.id}&role=${user.role || ''}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('You are not allowed to access this page.');
          setLoading(false);
          return;
        }
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            sessionStorage.clear();
          }
          router.push('/login');
          setLoading(false);
          return;
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText || 'Failed to fetch data'}` };
        }
        
        const errorMessage = errorData.error || errorData.message || 'Failed to fetch data';
        setError(errorMessage);
        setLoading(false);
        console.error('❌ API Error Response:', errorData);
        return;
      }

      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      
      // ✅ FIX: Handle case where shipments might be empty array but still valid
      if (result.shipments !== undefined && result.summary !== undefined) {
        setData({
          shipments: result.shipments || [],
          permissions: result.permissions || { can_view: 0, can_edit: 0, can_create: 0 },
          summary: result.summary || { total: 0, completed: 0, pending: 0, drivers: 0 }
        });
      } else {
        setError('Invalid data structure received from server');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('❌ Error fetching loading-unloading data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };


  // ✅ Show page skeleton instead of spinner
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
          <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
            <Header />
          </div>
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 bg-gray-50">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-gray-100 rounded-lg p-6 h-32 animate-pulse"></div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
          <div className="bg-white shadow-sm">
            <Header />
          </div>
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 bg-gray-50">
            <ErrorDisplay error={error} onRetry={checkPermissions} />
          </main>
        </div>
      </div>
    );
  }

  // Show no data state - but still show the page structure
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
          <main className="pt-16 lg:pt-20 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="text-gray-600 text-xl mb-4">No data available</div>
                <button
                  onClick={checkPermissions}
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Retry
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
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        {/* Fixed Header - ✅ Removed fixed positioning to prevent overlap */}
        <div className="bg-white shadow-sm">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4 text-gray-600 hover:text-gray-800 transition-transform hover:-translate-x-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Loading & Unloading Dashboard</h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Total {shipments.length} shipment{shipments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Create Button - Show if user has create permission */}
              {(permissions?.can_create === 1 || permissions?.can_create === true) && (
                <Link
                  href="/loading-unloading-history/create-loading-unloading"
                  className="inline-flex items-center justify-center bg-gray-400 hover:bg-gray-500 text-white font-medium px-4 py-2 rounded-lg transition duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Record
                </Link>
              )}
              <nav className="hidden md:flex space-x-2 text-sm text-gray-600">
                <Link href="/dashboard" className="hover:text-gray-900">Home</Link>
                <span>/</span>
                <span className="text-gray-900">Loading & Unloading</span>
              </nav>
            </div>
          </div>
        {/* Summary Cards */}
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <SummaryCard
              icon="🚚"
              value={summary.total}
              label="Total Shipments"
            />
            <SummaryCard
              icon="✅"
              value={summary.completed}
              label="Completed Loadings"
            />
            <SummaryCard
              icon="⏳"
              value={summary.pending}
              label="Pending Loadings"
            />
            <SummaryCard
              icon="👨‍💼"
              value={summary.drivers}
              label="Active Drivers"
            />
          </div>
        

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Shipment Records</h2>
              <span className="text-sm text-gray-500">Total: {shipments.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {shipments.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanker</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consignee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loading Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Weight (Loading)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shipments.map((shipment) => (
                    <tr key={shipment.id || shipment.shipment_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {shipment.id || shipment.shipment_id}
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
                        {shipment.consignee || shipment.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {shipment.final_loading_datetime 
                          ? new Date(shipment.final_loading_datetime).toLocaleString('en-GB')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {shipment.net_weight_loading || shipment.net_weight || '0'} Kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipment.created_at 
                          ? new Date(shipment.created_at).toLocaleDateString('en-GB')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/loading-unloading-history/pdf-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                            target="_blank"
                            className="text-gray-600 hover:text-gray-800"
                          >
                            View
                          </Link>
                          {(permissions?.can_edit === 1 || permissions?.can_edit === true) && (
                            <>
                              <span className="text-gray-300">|</span>
                              <Link
                                href={`/loading-unloading-history/edit-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                                className="text-gray-600 hover:text-gray-800"
                              >
                                Edit
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">No shipment records found</p>
                <p className="text-sm text-gray-500 mb-4">No loading/unloading records available.</p>
              </div>
            )}
          </div>
        </div>
        </main>

        {/* Fixed Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary - ✅ No spinner fallback
export default function LoadingUnloadingHistory() {
  return (
    <Suspense fallback={null}>
      <LoadingUnloadingContent />
    </Suspense>
  );
}
