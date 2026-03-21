'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';

// Separate component that uses client-side features
function NbStockHistoryNonContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    records_per_page: 50,
    has_next: false,
    has_prev: false
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    customer_name: '',
    station_name: '',
    product_name: '',
    from_date: '',
    to_date: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Check admin permissions
    if (!['5', '4', '3', '7'].includes(String(parsedUser.role))) {
      setError('Access denied. Admin permissions required.');
      setLoading(false);
      return;
    }
    
    // Get URL parameters and set initial filters
    const urlParams = new URLSearchParams(window.location.search);
    const stationNameFromUrl = urlParams.get('station_name') || '';
    
    if (stationNameFromUrl) {
      setFilters(prev => ({
        ...prev,
        station_name: stationNameFromUrl
      }));
    }
    
    fetchData();
  }, []);

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.records_per_page.toString()
      });
      
      // Add filters
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });
      
      const response = await fetch(`/api/nb-stock-history-non?${queryParams}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    fetchData(1); // Reset to first page when applying filters
  };

  const clearFilters = () => {
    setFilters({
      customer_name: '',
      station_name: '',
      product_name: '',
      from_date: '',
      to_date: ''
    });
    fetchData(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchData(newPage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatQuantity = (quantity) => {
    return parseFloat(quantity || 0).toFixed(2);
  };

  if (loading && !user) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div>Loading...</div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="text-red-500">{error}</div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto">
          <div className="py-4 md:py-8">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">

              {/* Header */}
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Non-Billing Stock History
                </h1>
                {filters.station_name && (
                  <p className="text-blue-600 mt-2">
                    Showing records for station: <strong>{filters.station_name}</strong>
                  </p>
                )}
                <p className="text-gray-600 mt-2">
                  View completed non-billing customer requests history
                </p>
              </div>

              {/* Filters Toggle */}
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={filters.customer_name}
                        onChange={(e) => handleFilterChange('customer_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search customer..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Station Name
                      </label>
                      <input
                        type="text"
                        value={filters.station_name}
                        onChange={(e) => handleFilterChange('station_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search station..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={filters.product_name}
                        onChange={(e) => handleFilterChange('product_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search product..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={filters.from_date}
                        onChange={(e) => handleFilterChange('from_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={filters.to_date}
                        onChange={(e) => handleFilterChange('to_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={applyFilters}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                    >
                      Apply Filters
                    </button>
                    <button
                      onClick={clearFilters}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Records</h3>
                  <p className="text-2xl font-bold text-blue-600">{pagination.total_records}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Quantity</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatQuantity(data.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0))}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h3 className="text-sm font-medium text-gray-500">Current Page</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {pagination.current_page} / {pagination.total_pages}
                  </p>
                </div>
              </div>

              {/* Data Table */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-700">{error}</div>
                </div>
              ) : data.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <div className="text-gray-500">No records found</div>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Customer Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Station Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Product Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Request ID
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Completion Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((item, index) => (
                              <tr key={item.id || index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {item.customer_name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.station_name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.product_name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatQuantity(item.quantity)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  #{item.request_id || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(item.completion_date)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden">
                    <div className="space-y-3">
                      {data.map((item, index) => (
                        <div key={item.id || index} className="bg-white rounded-lg shadow-md p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {item.customer_name || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.station_name || 'N/A'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">
                                {formatQuantity(item.quantity)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Qty
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-gray-500">Product</div>
                              <div className="font-medium">{item.product_name || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Request ID</div>
                              <div className="font-medium">#{item.request_id || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-500">
                            {formatDate(item.completion_date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pagination */}
                  {pagination.total_pages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={!pagination.has_prev}
                        className={`px-3 py-1 rounded ${pagination.has_prev ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        Previous
                      </button>
                      
                      <span className="px-3 py-1 text-gray-700">
                        Page {pagination.current_page} of {pagination.total_pages}
                      </span>
                      
                      <button
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={!pagination.has_next}
                        className={`px-3 py-1 rounded ${pagination.has_next ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Main component with Suspense
export default function NbStockHistoryNon() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NbStockHistoryNonContent />
    </Suspense>
  );
}