'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Main component that uses useSearchParams
function NBStockActivityLogsContent({ 
  pageName = "", 
  recordType = "nb_stock",
  showFilters = true,
  limit = 50 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: parseInt(searchParams.get('page') || '1'),
    totalPages: 1,
    total: 0,
    limit: parseInt(searchParams.get('limit') || limit)
  });
  const [filters, setFilters] = useState({
    search: '',
    station: 'all',
    product: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [uniqueStations, setUniqueStations] = useState([]);
  const [uniqueProducts, setUniqueProducts] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Update URL when filters or pagination change
  useEffect(() => {
    const params = new URLSearchParams();
    if (pagination.currentPage > 1) params.set('page', pagination.currentPage.toString());
    if (pagination.limit !== limit) params.set('limit', pagination.limit.toString());
    if (filters.search) params.set('search', filters.search);
    if (filters.station !== 'all') params.set('station', filters.station);
    if (filters.product !== 'all') params.set('product', filters.product);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    
    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(url, { scroll: false });
  }, [pagination.currentPage, pagination.limit, filters, router, limit]);

  useEffect(() => {
    fetchAllOptions();
    fetchActivities(); // Initial load
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [pagination.currentPage, pagination.limit]);

  // Remove the automatic fetch on filter change - only fetch when user explicitly triggers it
  const applyFilters = async () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    // Don't set loading to true for filter operations
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: '1',
        limit: pagination.limit.toString(),
        recordType: recordType
      });
      
      // Add filters to API call
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.station !== 'all') queryParams.append('station', filters.station);
      if (filters.product !== 'all') queryParams.append('product', filters.product);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      const response = await fetch(`/api/nb-stock/activity-log?${queryParams.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setActivities(result.data);
        setPagination(prev => ({
          ...prev,
          currentPage: 1,
          totalPages: result.pagination.totalPages,
          total: result.pagination.total
        }));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    }
    // Don't set loading to false - keep the current state
  };

  const clearAllFilters = async () => {
    // Reset all filters to default
    setFilters({
      search: '',
      station: 'all',
      product: 'all',
      dateFrom: '',
      dateTo: ''
    });
    
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    
    // Fetch all data without filters
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: pagination.limit.toString(),
        recordType: recordType
      });
      
      const response = await fetch(`/api/nb-stock/activity-log?${queryParams.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setActivities(result.data);
        setPagination(prev => ({
          ...prev,
          currentPage: 1,
          totalPages: result.pagination.totalPages,
          total: result.pagination.total
        }));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    }
  };

  const fetchAllOptions = async () => {
    try {
      // Fetch all unique stations and products for filter dropdowns
      const response = await fetch('/api/nb-stock/activity-log/options');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUniqueStations(result.data.stations || []);
          setUniqueProducts(result.data.products || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch options:', err);
    }
  };

  const fetchActivities = async () => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        recordType: recordType
      });
      
      // Add filters to API call
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.station !== 'all') queryParams.append('station', filters.station);
      if (filters.product !== 'all') queryParams.append('product', filters.product);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      const response = await fetch(`/api/nb-stock/activity-log?${queryParams.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setActivities(result.data);
        setPagination(prev => ({
          ...prev,
          totalPages: result.pagination.totalPages,
          total: result.pagination.total
        }));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, currentPage: newPage });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleFilterChange = (key, value) => {
    // If date filters are being used, reset other filters to 'all'
    if ((key === 'dateFrom' || key === 'dateTo') && value) {
      setFilters({
        search: '',
        station: 'all',
        product: 'all',
        dateFrom: key === 'dateFrom' ? value : filters.dateFrom,
        dateTo: key === 'dateTo' ? value : filters.dateTo
      });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
    // Don't auto-fetch - user will click Apply Filters button
  };

  const downloadPDF = async () => {
    try {
      setIsDownloading(true);
      const html2pdf = (await import('html2pdf.js')).default;
      
      const pdfContent = document.createElement('div');
      pdfContent.style.padding = '20px';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.style.backgroundColor = 'white';
      
      pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; margin-bottom: 10px;">NB Stock Activity Logs Report</h1>
          <p style="color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
          <hr style="margin: 20px 0;" />
        </div>
      `;
      
      if (filters.search || filters.station !== 'all' || filters.product !== 'all' || filters.dateFrom || filters.dateTo) {
        pdfContent.innerHTML += `
          <div style="margin-bottom: 20px; padding: 10px; background: #f3f4f6; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Filters Applied:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${filters.search ? `<li>Search: ${filters.search}</li>` : ''}
              ${filters.station !== 'all' ? `<li>Station: ${filters.station}</li>` : ''}
              ${filters.product !== 'all' ? `<li>Product: ${filters.product}</li>` : ''}
              ${filters.dateFrom ? `<li>Date From: ${filters.dateFrom}</li>` : ''}
              ${filters.dateTo ? `<li>Date To: ${filters.dateTo}</li>` : ''}
            </ul>
          </div>
        `;
      }
      
      let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
              <th style="padding: 10px; text-align: left;">Station</th>
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: left;">Stock Quantity</th>
              <th style="padding: 10px; text-align: left;">Created</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.forEach(activity => {
        tableHTML += `
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 8px;">${activity.stationName}</td>
            <td style="padding: 8px;">${activity.productName}</td>
            <td style="padding: 8px;">${activity.stock}</td>
            <td style="padding: 8px;">${formatDate(activity.createdAt)}</td>
          </tr>
        `;
      });
      
      tableHTML += `</tbody>`;
      pdfContent.innerHTML += tableHTML;
      
      pdfContent.innerHTML += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 9px; color: #666;">
          <p>Total Records: ${activities.length} | Generated: ${new Date().toLocaleString('en-IN')}</p>
        </div>
      `;
      
      const options = {
        margin: [10, 10, 10, 10],
        filename: `nb-stock-activity-logs-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      await html2pdf().set(options).from(pdfContent).save();
    } catch (error) {
      console.error('PDF Error:', error);
      alert('Failed to generate PDF: ' + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Activities</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchActivities}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    total: pagination.total,
    totalStock: activities.reduce((sum, a) => sum + (parseInt(a.stock) || 0), 0),
    uniqueStations: [...new Set(activities.map(a => a.stationName))].length,
    uniqueProducts: [...new Set(activities.map(a => a.productName))].length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleBack}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Back to NB Stock</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            NB Stock Activity Logs
          </h1>
          <p className="text-gray-600 mt-1">Track and monitor all non-billing stock activities</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Records" value={stats.total} icon="📊" color="bg-blue-100" />
          <StatCard title="Total Stock" value={stats.totalStock.toLocaleString()} icon="📦" color="bg-green-100" />
          <StatCard title="Unique Stations" value={stats.uniqueStations} icon="🏢" color="bg-purple-100" />
          <StatCard title="Unique Products" value={stats.uniqueProducts} icon="📋" color="bg-orange-100" />
        </div>

        {/* Filters Card */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
              <div className="flex gap-3">
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  🔄 Clear All Filters
                </button>
                <button
                  onClick={applyFilters}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  🔍 Apply Filters
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={activities.length === 0 || isDownloading}
                  className="px-5 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDownloading ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Generating...
                    </>
                  ) : (
                    <>📄 Export PDF</>
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="🔍 Search by station or product..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Station</label>
                <select
                  value={filters.station}
                  onChange={(e) => handleFilterChange('station', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Stations</option>
                  {uniqueStations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                <select
                  value={filters.product}
                  onChange={(e) => handleFilterChange('product', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Products</option>
                  {uniqueProducts.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={() => handleFilterChange('dateFrom', '')}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={() => handleFilterChange('dateTo', '')}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activities Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Station
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Stock Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-5xl mb-3">📋</span>
                        <p className="text-gray-500 font-medium">No activity logs found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-indigo-600">
                          {activity.stationName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-800">
                          {activity.productName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {parseInt(activity.stock).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {formatDate(activity.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of{' '}
                <span className="font-semibold">{pagination.total}</span> entries
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ← Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);
                    
                    if (endPage - startPage + 1 < maxVisible) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                            pagination.currentPage === i
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Last
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    setPagination({ 
                      ...pagination, 
                      limit: parseInt(e.target.value), 
                      currentPage: 1 
                    });
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading NB Stock Activity Logs</h3>
        <p className="text-gray-600">Please wait while we load your data...</p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function NBStockActivityLogs(props) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NBStockActivityLogsContent {...props} />
    </Suspense>
  );
}