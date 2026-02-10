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

// Summary Card Component - Responsive
function SummaryCard({ icon, value, label, trend }) {
  return (
    <div className="bg-white text-gray-900 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{icon}</div>
      <div className="text-xl sm:text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs sm:text-sm text-gray-600">{label}</div>
      {trend && (
        <div className={`text-xs mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// Main content component
function LoadingUnloadingContent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Dynamic filtering and sorting
  const filteredAndSortedShipments = data?.shipments ? [...data.shipments]
    .filter(shipment => {
      const matchesSearch = !searchTerm || 
        (shipment.tanker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         shipment.driver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         shipment.consignee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         shipment.dispatch?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterStatus === 'all' ||
        (filterStatus === 'completed' && (shipment.net_weight_loading > 0 || shipment.net_weight_unloading > 0)) ||
        (filterStatus === 'pending' && (!shipment.net_weight_loading && !shipment.net_weight_unloading));
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.final_loading_datetime || 0) - new Date(a.final_loading_datetime || 0);
        case 'tanker':
          return (a.tanker || '').localeCompare(b.tanker || '');
        case 'driver':
          return (a.driver || '').localeCompare(b.driver || '');
        default:
          return 0;
      }
    }) : [];

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedShipments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedShipments = filteredAndSortedShipments.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
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
            {/* Page Header - Responsive */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => router.back()}
                    className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                    title="Go Back"
                  >
                    ←
                  </button>
                  {/* Create New Button - Moved to Left */}
                  {/* TEMPORARY DEBUG: Always show button for testing */}
                  {true && (
                    <Link
                      href="/loading-unloading-history/create-loading-unloading"
                      className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition duration-200 shadow-sm text-sm sm:text-base"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="hidden sm:inline">Create New</span>
                      <span className="sm:hidden">New</span>
                    </Link>
                  )}
                  {/* ORIGINAL PERMISSION CHECK - Commented out for testing */}
                  {/* {(permissions?.can_create === 1 || user?.role === 5) && (
                    <Link
                      href="/loading-unloading-history/create-loading-unloading"
                      className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition duration-200 shadow-sm text-sm sm:text-base"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="hidden sm:inline">Create New</span>
                      <span className="sm:hidden">New</span>
                    </Link>
                  )} */}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Loading & Unloading Dashboard</h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">
                      Manage and track all loading/unloading activities
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Filters - Responsive */}
            <div className="mb-6 sm:mb-8 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by tanker, driver, customer..."
                      className="w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <svg className="absolute left-2 sm:left-3 top-2.5 sm:top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="date">Date</option>
                    <option value="tanker">Tanker</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3 sm:mb-0">
                  <span className="text-xs sm:text-sm text-gray-600">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-xs sm:text-sm text-gray-600">per page</span>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 sm:px-3 py-1 text-sm border border-gray-300 rounded-l hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-gray-50 border-t border-b border-gray-300">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 sm:px-3 py-1 text-sm border border-gray-300 rounded-r hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
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

            {/* Shipments Table - Responsive */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Shipment Records</h2>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-xs sm:text-sm text-gray-500">
                      {filteredAndSortedShipments.length} record{filteredAndSortedShipments.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium disabled:opacity-50"
                    >
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>

            {paginatedShipments.length > 0 ? (
              <>
                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-gray-200">
                  {paginatedShipments.map((shipment, index) => (
                    <div key={shipment.id || shipment.shipment_id || index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="space-y-3">
                        {/* Header Row */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">#{shipment.id || shipment.shipment_id || 'N/A'}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              (shipment.net_weight_loading > 0 || shipment.net_weight_unloading > 0) 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {(shipment.net_weight_loading > 0 || shipment.net_weight_unloading > 0) ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleExpand(shipment.id || shipment.shipment_id || index)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {expandedId === (shipment.id || shipment.shipment_id || index) ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              )}
                            </svg>
                          </button>
                        </div>

                        {/* Main Info Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 block">Tanker:</span>
                            <span className="font-medium text-gray-900">{shipment.tanker || shipment.tanker_number || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Driver:</span>
                            <span className="font-medium text-gray-900">{shipment.driver || shipment.driver_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Customer:</span>
                            <span className="font-medium text-gray-900">{shipment.consignee || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Date:</span>
                            <span className="font-medium text-gray-900">
                              {shipment.final_loading_datetime 
                                ? new Date(shipment.final_loading_datetime).toLocaleDateString('en-GB')
                                : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Net Weight */}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm">Net Weight:</span>
                          <span className="font-bold text-lg text-green-600">
                            {shipment.net_weight_loading || shipment.net_weight_unloading || '0'}
                          </span>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === (shipment.id || shipment.shipment_id || index) && (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div className="p-3 bg-gray-50 rounded">
                                <span className="text-gray-500 block">Dispatch From:</span>
                                <span className="font-medium">{shipment.dispatch || shipment.dispatch_from || '-'}</span>
                              </div>
                              <div className="p-3 bg-gray-50 rounded">
                                <span className="text-gray-500 block">Mobile:</span>
                                <span className="font-medium">{shipment.driver_mobile || '-'}</span>
                              </div>
                              <div className="p-3 bg-gray-50 rounded">
                                <span className="text-gray-500 block">Entered By (Loading):</span>
                                <span className="font-medium">{shipment.entered_by_loading || '-'}</span>
                              </div>
                              <div className="p-3 bg-gray-50 rounded">
                                <span className="text-gray-500 block">Entered By (Unloading):</span>
                                <span className="font-medium">{shipment.entered_by_unloading || '-'}</span>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-3 border-t border-gray-200">
                              <Link
                                href={`/loading-unloading-history/pdf-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                                target="_blank"
                                className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                View PDF
                              </Link>
                              {(permissions?.can_edit === 1 || user?.role === 5) && (
                                <Link
                                  href={`/loading-unloading-history/edit-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                                  className="flex-1 bg-gray-600 text-white text-center py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                >
                                  Edit
                                </Link>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto scrollbar-none">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanker
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Driver
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dispatch From
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mobile
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Name
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loading Date
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Net Wt
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedShipments.map((shipment, index) => (
                        <Fragment key={shipment.id || shipment.shipment_id || index}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{shipment.id || shipment.shipment_id || 'N/A'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shipment.tanker || shipment.tanker_number || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shipment.driver || shipment.driver_name || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shipment.dispatch || shipment.dispatch_from || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shipment.driver_mobile || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shipment.consignee || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shipment.final_loading_datetime 
                                ? new Date(shipment.final_loading_datetime).toLocaleDateString('en-GB')
                                : '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center space-x-2">
                                <Link
                                  href={`/loading-unloading-history/pdf-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                                  target="_blank"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  View
                                </Link>
                                {(permissions?.can_edit === 1 || user?.role === 5) && (
                                  <Link
                                    href={`/loading-unloading-history/edit-loading-unloading?shipment_id=${shipment.id || shipment.shipment_id}`}
                                    className="text-gray-600 hover:text-gray-800 text-sm"
                                  >
                                    Edit
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedId === (shipment.id || shipment.shipment_id || index) && (
                            <tr className="bg-gray-50">
                              <td colSpan={9} className="px-4 sm:px-6 py-4">
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
              </>
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
