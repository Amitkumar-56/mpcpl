// src/app/loading-unloading-history/page.jsx
'use client';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
    </div>
  );
}

// Error component
function ErrorDisplay({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-600 text-xl mb-4">{error}</div>
        <button
          onClick={onRetry}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ icon, value, label, gradient }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} text-white rounded-xl p-6 shadow-sm`}>
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-white/90">{label}</div>
    </div>
  );
}

// Main content component that will be wrapped in Suspense
function LoadingUnloadingContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { user, loading: authLoading } = useSession();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      // ✅ FIX: Check permissions first before fetching data
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) {
      router.push('/login');
      return;
    }

    // Admin (role 5) has full access
    if (user.role === 5) {
      fetchData();
      return;
    }

    // ✅ FIX: Check user's cached permissions from verify API first
    if (user.permissions && user.permissions['Loading History']) {
      const loadingPerms = user.permissions['Loading History'];
      if (loadingPerms.can_view) {
        fetchData();
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
        fetchData();
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
        fetchData();
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
      if (!user || !user.id) {
        router.push('/login');
        return;
      }

      setLoading(true);
      setError(null);

      const response = await fetch(`/api/loading-unloading-history?user_id=${user.id}&role=${user.role || ''}`);
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('You are not allowed to access this page.');
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
        return;
      }
      
      if (result.shipments && result.summary) {
        setData(result);
      } else {
        setError('Invalid data structure received from server');
      }
    } catch (err) {
      console.error('Error fetching loading-unloading data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shipmentId) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData(); // Refresh data
      } else {
        alert('Failed to delete record');
      }
    } catch (err) {
      console.error('Error deleting record:', err);
    }
  };

  // Show loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchData} />;
  }

  // Show no data state
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-xl">No data available</div>
      </div>
    );
  }

  const { shipments, permissions, summary } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4 text-purple-600 hover:text-purple-800 transition-transform hover:-translate-x-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Loading & Unloading Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-3">
            <Link href="/" className="text-purple-600 hover:text-purple-800">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Loading & Unloading</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-300 rounded-xl p-6 shadow-sm animate-pulse h-32"></div>
            ))}
          </div>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              icon="🚚"
              value={summary.total}
              label="Total Shipments"
              gradient="from-purple-600 to-purple-800"
            />
            <SummaryCard
              icon="✅"
              value={summary.completed}
              label="Completed Loadings"
              gradient="from-blue-500 to-gray-800"
            />
            <SummaryCard
              icon="⏳"
              value={summary.pending}
              label="Pending Loadings"
              gradient="from-yellow-500 to-red-500"
            />
            <SummaryCard
              icon="👨‍💼"
              value={summary.drivers}
              label="Active Drivers"
              gradient="from-green-500 to-green-600"
            />
          </div>
        </Suspense>

        {/* Shipments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Shipment Overview</h2>
          </div>
          <Suspense fallback={
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-purple-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Tanker</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Dispatch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Mobile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Customer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Net Wt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Loading Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Entered By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shipments.map((shipment, index) => (
                    <tr key={shipment.shipment_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.shipment_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.tanker}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.driver}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.dispatch}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.driver_mobile}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.consignee}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          shipment.net_weight_loading > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {shipment.net_weight_loading || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(shipment.final_loading_datetime).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.entered_by_loading}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(shipment.created_at).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1">
                          {/* PDF Button */}
                          <a
                            href={`/api/loading-unloading/pdf-loading-unloading?shipment_id=${shipment.shipment_id}`}
                            className="w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                            title="Download PDF"
                          >
                            📄
                          </a>

                          {/* Edit Button */}
                          {permissions?.can_edit === 1 && (
                            <Link
                              href={`/loading-unloading/edit-loading-unloading?shipment_id=${shipment.shipment_id}`}
                              className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                              title="Edit Record"
                            >
                              ✏️
                            </Link>
                          )}

                          {/* Delete Button - Only for admin (role ID = 5) */}
                          {permissions?.can_delete === 1 && (
                            <button
                              onClick={() => handleDelete(shipment.shipment_id)}
                              className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                              title="Delete Record"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Suspense>
        </div>
      </main>

      {/* Floating Action Button */}
      {permissions?.can_edit === 1 && (
        <Link
          href="/loading-unloading-history/create-loading-unloading"
          className="fixed bottom-20 right-6 w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 z-40"
        >
          <span className="text-2xl">+</span>
        </Link>
      )}
    </div>
  );
}

// Main component with Suspense boundary
export default function LoadingUnloadingHistory() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoadingUnloadingContent />
    </Suspense>
  );
}