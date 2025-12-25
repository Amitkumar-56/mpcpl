// src/app/loading-unloading-history/page.jsx
'use client';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
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
  const [error, setError] = useState(null);
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
        console.log('❌ Access denied - No permission for Loading History module');
      }
    } catch (error) {
      console.error('❌ Permission check error:', error);
      setError('Failed to check permissions');
    }
  };

  const fetchData = async () => {
    try {
      if (!user || !user.id) {
        router.push('/login');
        return;
      }

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
    }
  };


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
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="pt-16 lg:pt-20 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4 text-purple-600 hover:text-purple-800 transition-transform hover:-translate-x-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Loading & Unloading Dashboard</h1>
            </div>
            <nav className="flex space-x-2 text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-gray-900">Home</Link>
              <span>/</span>
              <span className="text-gray-900">Loading & Unloading</span>
            </nav>
          </div>
        {/* Summary Cards */}
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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
              gradient="from-blue-500 to-blue-700"
            />
            <SummaryCard
              icon="⏳"
              value={summary.pending}
              label="Pending Loadings"
              gradient="from-yellow-500 to-orange-500"
            />
            <SummaryCard
              icon="👨‍💼"
              value={summary.drivers}
              label="Active Drivers"
              gradient="from-green-500 to-green-600"
            />
          </div>
        

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Shipment Overview</h2>
          </div>
          <div className="p-6 text-gray-700">
            Data will appear here
          </div>
        </div>
          
        {permissions?.can_create === 1 && (
          <Link
            href="/loading-unloading-history/create-loading-unloading"
            className="fixed bottom-20 right-6 w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 z-40"
          >
            <span className="text-2xl">+</span>
          </Link>
        )}
        </main>

        {/* Fixed Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
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
