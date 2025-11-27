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
  const [invoicedRecords, setInvoicedRecords] = useState(new Set());
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [checkingRecords, setCheckingRecords] = useState(new Set());
  const [invoicingRecords, setInvoicingRecords] = useState(new Set());

  // Get employee profile
  useEffect(() => {
    const getEmployeeProfile = () => {
      try {
        const sessionUser = sessionStorage.getItem('user');
        const localStorageUser = localStorage.getItem('user');
        const localStorageProfile = localStorage.getItem('employee_profile');
        const sessionStorageProfile = sessionStorage.getItem('employee_profile');
        
        let profile = null;
        
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
          setEmployeeProfile({
            id: profile.id,
            name: profile.name || 'Unknown'
          });
        }
      } catch (error) {
        console.error('Error getting employee profile:', error);
      }
    };
    
    getEmployeeProfile();
    window.addEventListener('storage', getEmployeeProfile);
    
    return () => {
      window.removeEventListener('storage', getEmployeeProfile);
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
        
        // Update selected records based on is_checked and is_invoiced from database
        const checkedRecords = new Set();
        const invoicedRecords = new Set();
        
        result.data.records.forEach(record => {
          if (record.is_checked) {
            checkedRecords.add(record.id);
          }
          if (record.is_invoiced) {
            invoicedRecords.add(record.id);
          }
        });
        
        setSelectedRecords(checkedRecords);
        setInvoicedRecords(invoicedRecords);
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

  // Handle check record with button
  const handleCheckRecord = async (recordId, isChecked) => {
    if (!employeeProfile) {
      alert('❌ Please login to check records');
      return;
    }

    // Prevent unchecking if already checked
    const record = data.records.find(r => r.id === recordId);
    if (record && record.is_checked && !isChecked) {
      alert('❌ Cannot uncheck. Once checked, it cannot be unchecked.');
      return;
    }

    setCheckingRecords(prev => new Set(prev).add(recordId));

    try {
      const response = await fetch('/api/reports/update-check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_id: recordId,
          is_checked: isChecked,
          checked_by: employeeProfile.id
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

        // Auto-invoice when checked
        if (isChecked) {
          // Automatically invoice the record
          await handleInvoiceRecord(recordId, true);
        }

        // Show success message
        if (isChecked) {
          const element = document.getElementById(`check-btn-${recordId}`);
          if (element) {
            element.classList.add('checked-success');
            setTimeout(() => {
              element.classList.remove('checked-success');
            }, 2000);
          }
        }

        // Refresh data from API
        await fetchReportData();
      }
    } catch (error) {
      console.error('Update check status error:', error);
      alert('❌ Error updating check status');
    } finally {
      setCheckingRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  // Handle invoice record with button
  const handleInvoiceRecord = async (recordId, isInvoiced) => {
    if (!employeeProfile) {
      alert('❌ Please login to invoice records');
      return;
    }

    // Prevent uninvoicing if already invoiced
    const record = data.records.find(r => r.id === recordId);
    if (record && record.is_invoiced && !isInvoiced) {
      alert('❌ Cannot uninvoice. Once invoiced, it cannot be uninvoiced.');
      return;
    }

    setInvoicingRecords(prev => new Set(prev).add(recordId));

    try {
      const response = await fetch('/api/reports/update-invoice-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_id: recordId,
          is_invoiced: isInvoiced,
          invoiced_by: employeeProfile.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setInvoicedRecords(prev => {
          const newSet = new Set(prev);
          if (isInvoiced) {
            newSet.add(recordId);
          } else {
            newSet.delete(recordId);
          }
          return newSet;
        });

        // Show success message
        if (isInvoiced) {
          const element = document.getElementById(`invoice-btn-${recordId}`);
          if (element) {
            element.classList.add('invoiced-success');
            setTimeout(() => {
              element.classList.remove('invoiced-success');
            }, 2000);
          }
        }

        // Refresh data from API
        await fetchReportData();
      }
    } catch (error) {
      console.error('Update invoice status error:', error);
      alert('❌ Error updating invoice status');
    } finally {
      setInvoicingRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  const handleSelectAll = async (isChecked) => {
    if (!employeeProfile) {
      alert('❌ Please login to check records');
      return;
    }

    // Show confirmation for uncheck all
    if (!isChecked && selectedRecords.size > 0) {
      const confirmUncheck = confirm(`Are you sure you want to uncheck all ${selectedRecords.size} records?`);
      if (!confirmUncheck) return;
    }

    // Process all records
    const promises = data.records.map(record => {
      if (isChecked && !selectedRecords.has(record.id)) {
        return handleCheckRecord(record.id, true);
      } else if (!isChecked && selectedRecords.has(record.id)) {
        return handleCheckRecord(record.id, false);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
  };

  const handleInvoiceAll = async (isInvoiced) => {
    if (!employeeProfile) {
      alert('❌ Please login to invoice records');
      return;
    }

    // Show confirmation for uninvoice all
    if (!isInvoiced && invoicedRecords.size > 0) {
      const confirmUninvoice = confirm(`Are you sure you want to uninvoice all ${invoicedRecords.size} records?`);
      if (!confirmUninvoice) return;
    }

    // Process all records
    const promises = data.records.map(record => {
      if (isInvoiced && !invoicedRecords.has(record.id)) {
        return handleInvoiceRecord(record.id, true);
      } else if (!isInvoiced && invoicedRecords.has(record.id)) {
        return handleInvoiceRecord(record.id, false);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
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

  const handleViewInvoiced = () => {
    if (invoicedRecords.size === 0) {
      alert('Please select at least one record to view invoiced.');
      return;
    }
    
    const invoicedIds = Array.from(invoicedRecords).join(',');
    const queryParams = new URLSearchParams({
      invoiced_ids: invoicedIds,
      ...filters
    });
    
    router.push(`/reports/invoiced-records?${queryParams}`);
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

  // Check button component for each record
  const CheckButton = ({ record }) => {
    const isChecked = record.is_checked || selectedRecords.has(record.id);
    const isLoading = checkingRecords.has(record.id);
    const isDisabled = !employeeProfile || isLoading || record.is_checked; // Disable if already checked
    
    return (
      <div className="flex flex-col items-center space-y-1">
        <button
          id={`check-btn-${record.id}`}
          onClick={() => handleCheckRecord(record.id, !isChecked)}
          disabled={isDisabled}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 transform
            ${isChecked
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:scale-105 hover:shadow-xl'
            }
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            flex items-center justify-center space-x-2 min-w-[100px]
          `}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Processing</span>
            </>
          ) : isChecked ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs">Checked</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-xs">Check</span>
            </>
          )}
        </button>
        {record.is_checked && record.checked_by_name && (
          <span className="text-xs text-gray-600 text-center">
            By: {record.checked_by_name}
          </span>
        )}
      </div>
    );
  };

  // Invoice button component for each record
  const InvoiceButton = ({ record }) => {
    const isInvoiced = record.is_invoiced || invoicedRecords.has(record.id);
    const isLoading = invoicingRecords.has(record.id);
    const isDisabled = !employeeProfile || isLoading || record.is_invoiced; // Disable if already invoiced
    
    return (
      <div className="flex flex-col items-center space-y-1">
        <button
          id={`invoice-btn-${record.id}`}
          onClick={() => handleInvoiceRecord(record.id, !isInvoiced)}
          disabled={isDisabled}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 transform
            ${isInvoiced
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md hover:scale-105 hover:shadow-xl'
            }
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            flex items-center justify-center space-x-2 min-w-[100px]
          `}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Processing</span>
            </>
          ) : isInvoiced ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">Invoiced</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-xs">Invoice</span>
            </>
          )}
        </button>
        {record.is_invoiced && record.invoiced_by_name && (
          <span className="text-xs text-gray-600 text-center">
            By: {record.invoiced_by_name}
          </span>
        )}
      </div>
    );
  };

  // Select All Check Button Component
  const SelectAllCheckButton = () => {
    const allChecked = selectedRecords.size === data.records.length && data.records.length > 0;
    const someChecked = selectedRecords.size > 0 && selectedRecords.size < data.records.length;
    
    return (
      <button
        onClick={() => handleSelectAll(!allChecked)}
        disabled={!employeeProfile || data.records.length === 0}
        className={`
          px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105
          ${allChecked
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
            : someChecked
            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white shadow-lg'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md'
          }
          ${!employeeProfile || data.records.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
          flex items-center space-x-3
        `}
      >
        {allChecked ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Uncheck All ({selectedRecords.size})</span>
          </>
        ) : someChecked ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>Check All ({selectedRecords.size} of {data.records.length})</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Check All ({data.records.length})</span>
          </>
        )}
      </button>
    );
  };

  // Select All Invoice Button Component
  const SelectAllInvoiceButton = () => {
    const allInvoiced = invoicedRecords.size === data.records.length && data.records.length > 0;
    const someInvoiced = invoicedRecords.size > 0 && invoicedRecords.size < data.records.length;
    
    return (
      <button
        onClick={() => handleInvoiceAll(!allInvoiced)}
        disabled={!employeeProfile || data.records.length === 0}
        className={`
          px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105
          ${allInvoiced
            ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg'
            : someInvoiced
            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white shadow-lg'
            : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md'
          }
          ${!employeeProfile || data.records.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
          flex items-center space-x-3
        `}
      >
        {allInvoiced ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Uninvoice All ({invoicedRecords.size})</span>
          </>
        ) : someInvoiced ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>Invoice All ({invoicedRecords.size} of {data.records.length})</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Invoice All ({data.records.length})</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Report</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Employee Profile Info */}
          {employeeProfile ? (
            <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200 shadow-sm">
              <span className="text-sm font-medium text-green-700 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                ✅ {employeeProfile.name}
              </span>
            </div>
          ) : (
            <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-200 shadow-sm">
              <span className="text-sm font-medium text-red-700 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                ❌ Not Logged In
              </span>
            </div>
          )}
          
          {/* View Checked Records Button */}
          <button
            onClick={handleViewChecked}
            disabled={selectedRecords.size === 0}
            className={`
              px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105
              ${selectedRecords.size > 0 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-sm'
              }
              flex items-center space-x-2
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              View Checked ({selectedRecords.size})
            </span>
          </button>

          {/* View Invoiced Records Button */}
          <button
            onClick={handleViewInvoiced}
            disabled={invoicedRecords.size === 0}
            className={`
              px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105
              ${invoicedRecords.size > 0 
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-sm'
              }
              flex items-center space-x-2
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>
              View Invoiced ({invoicedRecords.size})
            </span>
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-gray-600">
          <li><a href="/" className="hover:text-gray-900 transition-colors">Home</a></li>
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-end space-x-2">
            <button
              onClick={fetchReportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Filter
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 transition-colors"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Total Quantity (Filtered)</div>
          <div className="text-2xl font-bold text-blue-600">{totals.grandTotalQty.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Showing: {totals.pageQty.toFixed(2)} (This Page)</div>
        </div>
        
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Total Amount (Filtered)</div>
          <div className="text-2xl font-bold text-green-600">₹{totals.grandTotalAmount.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Showing: ₹{totals.pageAmount.toFixed(2)} (This Page)</div>
        </div>
        
        <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Total Records (Filtered)</div>
          <div className="text-2xl font-bold text-purple-600">{totals.grandTotalRecords}</div>
          <div className="text-xs text-gray-500">Showing: {totals.pageRecords} (This Page)</div>
        </div>
      </div>

      {/* Select All Buttons - New Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Check All Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Check Records</h3>
              <p className="text-sm text-gray-600 mt-1">
                {employeeProfile 
                  ? `Mark records as checked for verification`
                  : 'Please login to check records'
                }
              </p>
            </div>
            <SelectAllCheckButton />
          </div>
        </div>

        {/* Invoice All Section */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Invoice Records</h3>
              <p className="text-sm text-gray-600 mt-1">
                {employeeProfile 
                  ? `Mark records as invoiced for billing`
                  : 'Please login to invoice records'
                }
              </p>
            </div>
            <SelectAllInvoiceButton />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="15" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : data.records.length > 0 ? (
                data.records.map((record, index) => (
                  <tr 
                    key={record.id} 
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${selectedRecords.has(record.id) ? 'bg-green-50 border-l-4 border-l-green-500' : ''}
                      ${invoicedRecords.has(record.id) ? 'bg-purple-50 border-r-4 border-r-purple-500' : ''}
                      ${checkingRecords.has(record.id) ? 'bg-blue-50' : ''}
                      ${invoicingRecords.has(record.id) ? 'bg-orange-50' : ''}
                    `}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <CheckButton record={record} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <InvoiceButton record={record} />
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
                      <div className="flex space-x-1">
                        {['doc1', 'doc2', 'doc3'].map((doc) => (
                          <a
                            key={doc}
                            href={record[doc] || '/assets/4595376-200.png'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block transition-transform hover:scale-110"
                          >
                            <img
                              src={record[doc] || '/assets/4595376-200.png'}
                              alt="Document"
                              className="w-10 h-10 object-cover rounded border shadow-sm"
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
                  <td colSpan="15" className="px-6 py-4 text-center text-sm text-gray-500">
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
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setPagination(prev => ({ ...prev, currentPage: page }))}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  page === pagination.currentPage
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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