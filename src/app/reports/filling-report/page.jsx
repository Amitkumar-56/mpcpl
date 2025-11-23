// src/app/reports/filling-report/page.jsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ReportHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({
    product: searchParams.get('product') || '',
    loading_station: searchParams.get('loading_station') || '',
    customer: searchParams.get('customer') || '',
    from_date: searchParams.get('from_date') || '',
    to_date: searchParams.get('to_date') || ''
  });
  
  const [data, setData] = useState({
    records: [],
    products: [],
    stations: [],
    customers: []
  });
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0
  });
  
  const [totals, setTotals] = useState({
    pageQty: 0,
    pageAmount: 0,
    pageRecords: 0,
    grandTotalQty: 0,
    grandTotalAmount: 0,
    grandTotalRecords: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [employeeProfile, setEmployeeProfile] = useState(null);

  // Get employee profile - सिर्फ ID और Name लें
  useEffect(() => {
    const getEmployeeProfile = () => {
      try {
        // Check multiple storage keys - login system stores as 'user' in sessionStorage
        const sessionUser = sessionStorage.getItem('user'); // SessionContext stores here
        const localStorageUser = localStorage.getItem('user');
        const localStorageProfile = localStorage.getItem('employee_profile');
        const sessionStorageProfile = sessionStorage.getItem('employee_profile');
        
        let profile = null;
        
        // Priority: sessionStorage 'user' > localStorage 'user' > sessionStorage 'employee_profile' > localStorage 'employee_profile'
        if (sessionUser) {
          profile = JSON.parse(sessionUser);
        } else if (localStorageUser) {
          profile = JSON.parse(localStorageUser);
        } else if (sessionStorageProfile) {
          profile = JSON.parse(sessionStorageProfile);
        } else if (localStorageProfile) {
          profile = JSON.parse(localStorageProfile);
        }
        
        if (profile && profile.id) {
          // सिर्फ ID और Name लें - बाकी कुछ नहीं
          setEmployeeProfile({
            id: profile.id,
            name: profile.name || 'Unknown'
          });
          console.log('✅ Employee Profile Loaded:', { id: profile.id, name: profile.name });
        } else {
          console.warn('❌ No employee profile found');
          console.log('Checked storage:', {
            sessionUser: !!sessionUser,
            localStorageUser: !!localStorageUser,
            sessionStorageProfile: !!sessionStorageProfile,
            localStorageProfile: !!localStorageProfile
          });
        }
      } catch (error) {
        console.error('Error getting employee profile:', error);
      }
    };
    
    getEmployeeProfile();
    
    // Listen for storage changes (in case user logs in on another tab)
    const handleStorageChange = () => {
      getEmployeeProfile();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch initial dropdown data
  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Fetch data when filters or page changes
  useEffect(() => {
    fetchReportData();
  }, [filters, pagination.currentPage]);

  const fetchDropdownData = async () => {
    try {
      const response = await fetch('/api/reports/filling-report');
      const result = await response.json();
      
      if (result.success) {
        setData(prev => ({
          ...prev,
          products: result.data.products,
          stations: result.data.stations,
          customers: result.data.customers
        }));
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/filling-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          page: pagination.currentPage,
          limit: 100
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setData(prev => ({ ...prev, records: result.data.records }));
        setPagination(result.data.pagination);
        setTotals(result.data.totals);
        
        // Update selected records based on is_checked from database
        const checkedRecords = new Set();
        result.data.records.forEach(record => {
          if (record.is_checked) {
            checkedRecords.add(record.id);
          }
        });
        setSelectedRecords(checkedRecords);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/reports/filling-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          export: true
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.csv) {
        // Convert to CSV and download
        const csvContent = [
          result.csv.headers.join(','),
          ...result.csv.data.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'filling_report.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Handle check record - सिर्फ ID भेजें
  const handleCheckRecord = async (recordId, isChecked) => {
    if (!employeeProfile) {
      alert('❌ Please login to check records');
      return;
    }

    try {
      const response = await fetch('/api/reports/update-check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_id: recordId,
          is_checked: isChecked,
          checked_by: employeeProfile.id // सिर्फ ID भेजें
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSelectedRecords(prev => {
          const newSet = new Set(prev);
          if (isChecked) {
            newSet.add(recordId);
          } else {
            newSet.delete(recordId);
          }
          return newSet;
        });

        // Refresh data from API to get the actual checked_by_name from employee_profile
        await fetchReportData();
      }
    } catch (error) {
      console.error('Update check status error:', error);
    }
  };

  const handleSelectAll = (isChecked) => {
    if (!employeeProfile) {
      alert('❌ Please login to check records');
      return;
    }

    data.records.forEach(record => {
      if (isChecked && !selectedRecords.has(record.id)) {
        handleCheckRecord(record.id, true);
      } else if (!isChecked && selectedRecords.has(record.id)) {
        handleCheckRecord(record.id, false);
      }
    });
  };

  const handleViewChecked = () => {
    if (selectedRecords.size === 0) {
      alert('Please select at least one record to view.');
      return;
    }
    
    const checkedIds = Array.from(selectedRecords).join(',');
    const queryParams = new URLSearchParams({
      checked_ids: checkedIds,
      ...filters
    });
    
    router.push(`/reports/checked-records?${queryParams}`);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return 'text-yellow-600';
      case 'Cancelled': return 'text-red-600';
      case 'Processing': return 'text-blue-600';
      case 'Completed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Report</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Employee Profile Info - सिर्फ Name दिखाएं */}
          {employeeProfile ? (
            <div className="bg-green-50 px-3 py-2 rounded-md border border-green-200">
              <span className="text-sm font-medium text-green-700">
                ✅ {employeeProfile.name}
              </span>
            </div>
          ) : (
            <div className="bg-red-50 px-3 py-2 rounded-md border border-red-200">
              <span className="text-sm font-medium text-red-700">
                ❌ Not Logged In
              </span>
            </div>
          )}
          
          <button
            onClick={handleViewChecked}
            disabled={selectedRecords.size === 0}
            className={`px-4 py-2 rounded-md ${
              selectedRecords.size > 0 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            View Checked Records ({selectedRecords.size})
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-gray-600">
          <li><a href="/" className="hover:text-gray-900">Home</a></li>
          <li>→</li>
          <li className="text-gray-900">Create Report</li>
        </ol>
      </nav>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={filters.product}
              onChange={(e) => handleFilterChange('product', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Products</option>
              {data.products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.pname}
                </option>
              ))}
            </select>
          </div>

          {/* Loading Station */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loading Station</label>
            <select
              value={filters.loading_station}
              onChange={(e) => handleFilterChange('loading_station', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Stations</option>
              {data.stations.map(station => (
                <option key={station.id} value={station.id}>
                  {station.station_name}
                </option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Customers</option>
              {data.customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange('from_date', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-end space-x-2">
            <button
              onClick={fetchReportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Filter
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total Quantity (Filtered)</div>
          <div className="text-2xl font-bold text-blue-600">{totals.grandTotalQty.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Showing: {totals.pageQty.toFixed(2)} (This Page)</div>
        </div>
        
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total Amount (Filtered)</div>
          <div className="text-2xl font-bold text-green-600">₹{totals.grandTotalAmount.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Showing: ₹{totals.pageAmount.toFixed(2)} (This Page)</div>
        </div>
        
        <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total Records (Filtered)</div>
          <div className="text-2xl font-bold text-purple-600">{totals.grandTotalRecords}</div>
          <div className="text-xs text-gray-500">Showing: {totals.pageRecords} (This Page)</div>
        </div>
      </div>

      {/* Select All */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedRecords.size === data.records.length && data.records.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            disabled={!employeeProfile}
            className={`w-5 h-5 ${
              employeeProfile 
                ? 'text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500 focus:ring-2' 
                : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
            }`}
          />
          <span className={`text-sm font-medium ${
            !employeeProfile ? 'text-gray-400' : 'text-gray-700'
          }`}>
            Select All ({data.records.length} records on this page)
            {!employeeProfile && " - Please login to select records"}
          </span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loading Station</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created at</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checked By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checked At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="16" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : data.records.length > 0 ? (
                data.records.map((record, index) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(record.id)}
                        onChange={(e) => handleCheckRecord(record.id, e.target.checked)}
                        disabled={!employeeProfile}
                        className={`w-5 h-5 ${
                          employeeProfile 
                            ? 'text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500 focus:ring-2' 
                            : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(pagination.currentPage - 1) * 100 + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.rid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.station_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.vehicle_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.client_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.driver_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.aqty}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{record.amount || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(record.created)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.completed_date ? formatDateTime(record.completed_date) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.checked_by_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.checked_at ? formatDateTime(record.checked_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-1">
                        {['doc1', 'doc2', 'doc3'].map((doc) => (
                          <a
                            key={doc}
                            href={record[doc] || '/assets/4595376-200.png'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={record[doc] || '/assets/4595376-200.png'}
                              alt="Document"
                              className="w-10 h-10 object-cover rounded border"
                            />
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getStatusClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="16" className="px-6 py-4 text-center text-sm text-gray-500">
                    No filling requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-end mt-6">
          <nav className="flex items-center space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={pagination.currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setPagination(prev => ({ ...prev, currentPage: page }))}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  page === pagination.currentPage
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

// Loading component
function ReportHistoryLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
          <div className="h-8 w-48 bg-gray-300 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-64 bg-gray-300 rounded animate-pulse"></div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="h-6 w-32 bg-gray-300 rounded animate-pulse mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-300 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-300 rounded-lg animate-pulse"></div>
        ))}
      </div>
      
      <div className="bg-white rounded-lg shadow-md">
        <div className="h-96 bg-gray-300 animate-pulse"></div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function ReportHistory() {
  return (
    <Suspense fallback={<ReportHistoryLoading />}>
      <ReportHistoryContent />
    </Suspense>
  );
}