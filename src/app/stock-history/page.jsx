'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useCallback, useRef } from 'react';

function StockHistoryContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState({
    filling_stations: {},
    products: [],
    rows: [],
    filters: {}
  });
  const [filters, setFilters] = useState({
    pname: '',
    from_date: '',
    to_date: ''
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const cid = searchParams.get('id');

  // ✅ Memoize fetchStockHistory to prevent unnecessary re-renders
  const fetchStockHistory = useCallback(async (filterParams = {}) => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) {
      console.log('⚠️ Fetch already in progress, skipping...');
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true); // Set loading state
      const params = new URLSearchParams();
      
      if (cid) params.append('id', cid);
      if (filterParams.pname) params.append('pname', filterParams.pname);
      if (filterParams.from_date) params.append('from_date', filterParams.from_date);
      if (filterParams.to_date) params.append('to_date', filterParams.to_date);

      const url = `/api/stock-history?${params}`;
      console.log('🔍 Fetching stock history from:', url);

      const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'include', // Include cookies for auth
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        
        // ✅ Don't throw error for 401/403 - just return empty data to prevent logout
        if (response.status === 401 || response.status === 403) {
          console.warn('⚠️ Authentication error, returning empty data instead of throwing');
          if (!isMountedRef.current) return;
          setData({
            filling_stations: {},
            products: [],
            rows: [],
            filters: {}
          });
          return; // Exit early, don't throw
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Stock history API response:', {
        success: result.success,
        rowsCount: result.data?.rows?.length || 0,
        error: result.error
      });

      if (!isMountedRef.current) {
        return; // Component unmounted, don't update state
      }

      if (result.success) {
        setData(result.data || {
          filling_stations: {},
          products: [],
          rows: [],
          filters: {}
        });
        // Only update filters if they're different to prevent re-renders
        const newFilters = {
          pname: result.data?.filters?.pname || '',
          from_date: result.data?.filters?.from_date || '',
          to_date: result.data?.filters?.to_date || ''
        };
        setFilters(prev => {
          if (prev.pname === newFilters.pname && 
              prev.from_date === newFilters.from_date && 
              prev.to_date === newFilters.to_date) {
            return prev; // No change, return previous state
          }
          return newFilters;
        });
      } else {
        console.error('❌ API returned error:', result.error);
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return; // Component unmounted, don't update state
      }
      console.error('❌ Error fetching stock history:', error);
      // Set empty data on error
      setData({
        filling_stations: {},
        products: [],
        rows: [],
        filters: {}
      });
    } finally {
      fetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false); // Clear loading state
      }
    }
  }, [cid]); // Only depend on cid

  useEffect(() => {
    isMountedRef.current = true;
    fetchStockHistory();
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStockHistory]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchStockHistory(filters);
  };

  const handleReset = () => {
    setFilters({
      pname: '',
      from_date: '',
      to_date: ''
    });
    fetchStockHistory({});
  };

  // Excel Export Function
  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      
      const params = new URLSearchParams();
      if (cid) params.append('id', cid);
      if (filters.pname) params.append('pname', filters.pname);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const response = await fetch(`/api/export/stock?${params}`);
      
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `stock-history-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success message
      alert('Excel file downloaded successfully!');
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleViewDetails = (id) => {
    console.log('View details for ID:', id);
    // Navigate to stock details page
    window.location.href = `/stock-details?id=${id}`;
  };

  const handleSendMessage = (id) => {
    console.log('Send message for ID:', id);
    // Implement send message functionality
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0';
  };


  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link 
              href="/stock"
              className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Stocks</h1>
              <nav className="flex mt-2">
                <ol className="flex items-center space-x-2 text-sm">
                  <li>
                    <a href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
                      Home
                    </a>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="ml-2 text-gray-500">All Stocks</span>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filter Stocks</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleFilterSubmit}>
              {cid && (
                <input type="hidden" name="id" value={cid} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label htmlFor="pname-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name
                  </label>
                  <select
                    id="pname-filter"
                    name="pname"
                    value={filters.pname}
                    onChange={(e) => setFilters({...filters, pname: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">All Products</option>
                    {data.products.map((product, index) => (
                      <option key={index} value={product}>
                        {product}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="from_date" className="block text-sm font-medium text-gray-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    id="from_date"
                    name="from_date"
                    value={filters.from_date}
                    onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="to_date" className="block text-sm font-medium text-gray-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    id="to_date"
                    name="to_date"
                    value={filters.to_date}
                    onChange={(e) => setFilters({...filters, to_date: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-8 py-2.5 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Stock History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Stock History</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Total Records: {data.rows.length}
                </p>
              </div>
              {/* Export to Excel Button */}
              <button
                onClick={handleExportToExcel}
                disabled={exportLoading || data.rows.length === 0}
                className="flex items-center px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {exportLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-600">Loading stock history...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto lg:overflow-x-visible">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Station
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle No
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loading Qty
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available Qty
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.rows.length > 0 ? (
                    data.rows.map((row) => {
                      const isEdited = row.trans_type?.toLowerCase() === 'edited';
                      const hasRid = row.rid && row.rid.trim() !== '';
                      
                      return (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-gray-50 transition-colors ${isEdited ? 'bg-purple-50 border-l-4 border-purple-500 cursor-pointer' : ''}`}
                        onClick={isEdited && hasRid ? () => {
                          // Redirect to filling requests page with search for the rid
                          window.location.href = `/filling-requests?search=${encodeURIComponent(row.rid)}`;
                        } : undefined}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{row.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.fs_id && data.filling_stations[row.fs_id] ? data.filling_stations[row.fs_id] : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {row.filling_date ? new Date(row.filling_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.pname ? <span className="font-medium">{row.pname}</span> : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            // ✅ Show Inward, Outward, or Edited
                            const transType = row.trans_type?.toLowerCase() || '';
                            let typeText;
                            let badgeColor;
                            
                            if (transType === 'inward') {
                              typeText = 'Inward';
                              badgeColor = 'bg-green-100 text-green-800';
                            } else if (transType === 'outward') {
                              typeText = 'Outward';
                              badgeColor = 'bg-red-100 text-red-800';
                            } else if (transType === 'edited') {
                              typeText = 'Edited ✏️';
                              badgeColor = 'bg-purple-100 text-purple-800 font-bold';
                            } else {
                              // Fallback: use stock_type if available
                              if (row.stock_type === 'extra') {
                                typeText = 'Extra';
                                badgeColor = 'bg-green-100 text-green-800';
                              } else if (row.stock_type === 'stored') {
                                typeText = 'Stored';
                                badgeColor = 'bg-red-100 text-red-800';
                              } else {
                                typeText = row.trans_type || 'N/A';
                                badgeColor = 'bg-gray-100 text-gray-800';
                              }
                            }
                            
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                                {typeText}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {/* Show vehicle number for outward and edited with rid (customer loading) */}
                          {(row.trans_type?.toLowerCase() === 'outward' || row.trans_type?.toLowerCase() === 'edited') && row.rid
                            ? (row.vehicle_number || '')
                            : ''
                          }
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {isEdited ? (
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-purple-800 bg-purple-50 px-2 py-1 rounded">
                                Before: {formatNumber(row.current_stock || 0)}L
                              </div>
                              <div className="text-xs text-gray-500">
                                Stock before edit
                              </div>
                            </div>
                          ) : (
                            formatNumber(row.current_stock)
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {isEdited ? (
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                                {(() => {
                                  // Parse quantity change from remarks: "Qty was X L, now Y L"
                                  let qtyChange = 0;
                                  if (row.remarks) {
                                    const qtyMatch = row.remarks.match(/Qty was ([\d,]+\.?\d*)\s*L,?\s*now ([\d,]+\.?\d*)\s*L/i);
                                    if (qtyMatch) {
                                      const oldQty = parseFloat(qtyMatch[1].replace(/,/g, ''));
                                      const newQty = parseFloat(qtyMatch[2].replace(/,/g, ''));
                                      qtyChange = oldQty - newQty; // Positive if decreased, negative if increased
                                    }
                                  }
                                  // Fallback: calculate from stock change (stock increases when qty decreases)
                                  if (qtyChange === 0) {
                                    const stockChange = parseFloat(row.available_stock || 0) - parseFloat(row.current_stock || 0);
                                    qtyChange = -stockChange; // Negative because stock change is opposite of qty change
                                  }
                                  return qtyChange > 0 
                                    ? `-${formatNumber(qtyChange)}L` 
                                    : qtyChange < 0 
                                    ? `+${formatNumber(Math.abs(qtyChange))}L` 
                                    : '0L';
                                })()}
                              </div>
                              <div className="text-xs text-gray-500">
                                Quantity change
                              </div>
                            </div>
                          ) : (
                            formatNumber(row.filling_qty)
                          )}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                          isEdited 
                            ? 'text-purple-700 font-bold'
                            : parseFloat(row.available_stock || 0) <= 0 
                            ? 'text-red-600 font-bold' 
                            : parseFloat(row.available_stock || 0) < 1000 
                            ? 'text-red-500' 
                            : 'text-gray-900'
                        }`}>
                          {row.available_stock !== null && row.available_stock !== undefined ? (
                            <>
                              {isEdited ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-bold text-purple-800 bg-purple-50 px-2 py-1 rounded">
                                    After: {formatNumber(row.available_stock)}L
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Stock after edit
                                  </div>
                                  {row.remarks && (
                                    <div className="text-xs text-purple-600 mt-1 italic">
                                      {row.remarks}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {formatNumber(row.available_stock)}
                                  {parseFloat(row.available_stock || 0) <= 0 && (
                                    <span className="ml-2 text-xs text-red-600">(Low Stock)</span>
                                  )}
                                </>
                              )}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.created_by_name || row.user_name || (row.created_by ? `Employee ID: ${row.created_by}` : '-')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(row.id)}
                              className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded hover:bg-blue-50"
                              title="View Details"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                              </svg>
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleSendMessage(row.id)}
                              className="text-green-600 hover:text-green-900 transition-colors p-1 rounded hover:bg-green-50"
                              title="Send Message"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd"/>
                              </svg>
                            </button>
                            <span className="text-gray-300">|</span>
                            <Link
                              href={`/stock-logs?station_id=${row.fs_id}&product_id=${row.product_id}`}
                              className="text-purple-600 hover:text-purple-900 transition-colors p-1 rounded hover:bg-purple-50"
                              title="View Activity Logs"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-lg font-medium text-gray-900 mb-2">No stock history found</p>
                          <p className="text-sm">Try adjusting your filters or check back later for new entries.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function StockHistory() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <StockHistoryContent />
    </Suspense>
  );
}
