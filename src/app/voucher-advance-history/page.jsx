// src/app/voucher-advance-history/page.jsx
'use client';

import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import React, { Suspense, useEffect, useState } from 'react';

// Simple Loading component
function AdvanceHistoryLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
    </div>
  );
}

// Main Content Component
function AdvanceHistoryContent() {
  const [advances, setAdvances] = useState([]);
  const [filteredAdvances, setFilteredAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    limit: 10,
    has_next: false,
    has_prev: false
  });
  const [summary, setSummary] = useState({
    total_advances: 0,
    total_advance_amount: 0,
    avg_advance_amount: 0,
    max_advance_amount: 0,
    min_advance_amount: 0
  });

  useEffect(() => {
    fetchAdvances(1);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAdvances(advances);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = advances.filter(advance => 
        (advance.voucher_no && advance.voucher_no.toLowerCase().includes(query)) ||
        (advance.vehicle_no && advance.vehicle_no.toLowerCase().includes(query)) ||
        (advance.emp_name && advance.emp_name.toLowerCase().includes(query)) ||
        (advance.emp_phone && advance.emp_phone.includes(query)) ||
        (advance.station_name && advance.station_name.toLowerCase().includes(query))
      );
      setFilteredAdvances(filtered);
    }
  }, [advances, searchQuery]);

  const fetchAdvances = async (page = pagination.current_page, limit = pagination.limit) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const response = await fetch(`/api/voucher-advance-history?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch data');
      }
      
      setAdvances(data.advances || []);
      setFilteredAdvances(data.advances || []);
      setPermissions(data.permissions);
      setSummary(data.summary || {});
      if (data.pagination) {
        setPagination(data.pagination);
      }
      
    } catch (error) {
      console.error('Error fetching advance history:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchAdvances(newPage, pagination.limit);
    }
  };

  const handleLimitChange = (newLimit) => {
    const newPage = 1; // Reset to first page when changing limit
    fetchAdvances(newPage, newLimit);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const goBack = () => {
    window.history.back();
  };

  if (loading) {
    return <AdvanceHistoryLoading />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar activePage="VoucherWallet" />
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 md:p-6 max-w-full">
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                All Advance History
              </h1>
              {permissions && (
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <span>View: {permissions.can_view ? 'Yes' : 'No'}</span>
                  <span>Edit: {permissions.can_edit ? 'Yes' : 'No'}</span>
                  <span>Create: {permissions.can_create ? 'Yes' : 'No'}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => fetchAdvances(pagination.current_page, pagination.limit)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 touch-target"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={goBack}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-2 touch-target"
              >
                <span className="text-lg">Back</span>
              </button>
              <Link 
                href="/voucher-wallet-driver"
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm flex items-center gap-2 touch-target"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Driver Wallet
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-red-800 font-medium mb-1">Error Loading Data</div>
                    <div className="text-red-600 text-sm">{error}</div>
                  </div>
                  <button
                    onClick={() => fetchAdvances(pagination.current_page, pagination.limit)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by voucher number, vehicle number, employee name..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-600">
                  Found {filteredAdvances.length} {filteredAdvances.length === 1 ? 'record' : 'records'} matching "{searchQuery}"
                </div>
              )}
            </div>

            {/* Summary Cards */}
            {pagination.total_records > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Total Advances</div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{summary.total_advances}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                  <div className="text-xl md:text-2xl font-bold text-blue-600">{formatCurrency(summary.total_advance_amount)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Average Amount</div>
                  <div className="text-xl md:text-2xl font-bold text-green-600">{formatCurrency(summary.avg_advance_amount)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Max Amount</div>
                  <div className="text-xl md:text-2xl font-bold text-purple-600">{formatCurrency(summary.max_advance_amount)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Min Amount</div>
                  <div className="text-xl md:text-2xl font-bold text-orange-600">{formatCurrency(summary.min_advance_amount)}</div>
                </div>
              </div>
            )}

            {/* Advances Table */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              {/* Table Header */}
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-800">Advance History</h2>
                  <span className="text-sm text-gray-600">
                    {searchQuery 
                      ? `${filteredAdvances.length} of ${pagination.total_records} records` 
                      : `Page ${pagination.current_page} of ${pagination.total_pages} (${pagination.total_records} total records)`
                    }
                  </span>
                </div>
              </div>

              {/* Desktop Table */}
              {filteredAdvances.length > 0 ? (
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Voucher ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Voucher No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehicle No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Employee Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Advance Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Station</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredAdvances.map((advance, idx) => (
                        <tr key={advance.voucher_id || idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/voucher-advance-details?voucher_id=${advance.voucher_id}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer">
                              {advance.voucher_id || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{advance.voucher_no || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{advance.vehicle_no || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">
                            {advance.emp_id ? (
                              <Link 
                                href={`/voucher-wallet-driver-emp?emp_id=${advance.emp_id}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {advance.emp_name || 'N/A'}
                              </Link>
                            ) : (
                              <span className="text-gray-900">{advance.emp_name || 'N/A'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{advance.emp_phone || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">{formatCurrency(advance.advance)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(advance.exp_date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{advance.station_name || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Mobile Cards View */}
              {filteredAdvances.length > 0 ? (
                <div className="block md:hidden space-y-4">
                  {filteredAdvances.map((advance, idx) => (
                    <div key={advance.voucher_id || idx} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = `/voucher-advance-details?voucher_id=${advance.voucher_id}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">#{advance.voucher_no || 'N/A'}</h3>
                          <p className="text-sm text-gray-600">{formatDate(advance.exp_date)}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded">#{idx + 1}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">Voucher ID</p>
                          <p className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                            {advance.voucher_id || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Vehicle No</p>
                          <p className="font-medium text-gray-900">{advance.vehicle_no || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Employee Name</p>
                          {advance.emp_id ? (
                            <Link 
                              href={`/voucher-wallet-driver-emp?emp_id=${advance.emp_id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {advance.emp_name || 'N/A'}
                            </Link>
                          ) : (
                            <p className="font-medium text-gray-900">{advance.emp_name || 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Phone</p>
                          <p className="font-medium text-gray-900">{advance.emp_phone || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600 text-sm">Advance Amount:</span>
                          <span className="font-bold text-blue-600">{formatCurrency(advance.advance)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Station:</span>
                          <span className="font-medium text-gray-900">{advance.station_name || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  {searchQuery ? (
                    <>
                      <div className="text-gray-500 text-lg mb-4">No advance records found matching "{searchQuery}"</div>
                      <div className="text-gray-400 text-sm mb-4">Try searching with different terms</div>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-2"
                      >
                        Clear Search
                      </button>
                      <button
                        onClick={() => fetchAdvances(pagination.current_page, pagination.limit)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                      >
                        Refresh
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-500 text-lg mb-4">No advance records found</div>
                      <button
                        onClick={() => fetchAdvances(pagination.current_page, pagination.limit)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                      >
                        Refresh
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="bg-white rounded-lg shadow border p-4 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show</span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                      className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-sm text-gray-600">entries</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Showing {((pagination.current_page - 1) * pagination.limit) + 1} to {Math.min(pagination.current_page * pagination.limit, pagination.total_records)} of {pagination.total_records} entries
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={!pagination.has_prev}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={!pagination.has_prev}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.current_page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.current_page >= pagination.total_pages - 2) {
                          pageNum = pagination.total_pages - 4 + i;
                        } else {
                          pageNum = pagination.current_page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 text-sm border rounded ${
                              pageNum === pagination.current_page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={!pagination.has_next}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.total_pages)}
                      disabled={!pagination.has_next}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Last
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function VoucherAdvanceHistory() {
  return (
    <Suspense fallback={<AdvanceHistoryLoading />}>
      <AdvanceHistoryContent />
    </Suspense>
  );
}
