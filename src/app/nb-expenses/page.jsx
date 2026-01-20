'use client';

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import {
  BiArrowBack,
  BiChevronDown,
  BiChevronUp,
  BiDollar,
  BiDownload,
  BiEdit,
  BiFile,
  BiFilterAlt,
  BiMessageDetail,
  BiPrinter,
  BiRefresh,
  BiSearch,
  BiTrendingDown,
  BiTrendingUp
} from "react-icons/bi";

// CSV Export Function
const exportToCSV = (data, filename = 'expenses_export.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create CSV headers
  const headers = [
    'S.No',
    'Date',
    'Customer Name',
    'Details',
    'Receiver',
    'Reason/Remark',
    'Amount (₹)',
    'Type',
    'Payment Type',
    'Source'
  ];

  // Create CSV rows
  const csvRows = data.map((record, index) => [
    index + 1,
    formatDateForExport(record.payment_date),
    `"${(record.customer_name || '').replace(/"/g, '""')}"`,
    `"${(record.details || '').replace(/"/g, '""')}"`,
    `"${(record.paid_to || '').replace(/"/g, '""')}"`,
    `"${((record.reason || record.remark || '')).replace(/"/g, '""')}"`,
    record.amount,
    record.type,
    record.payment_type,
    record.source_table === 'expense' ? 'Expense' : 'Cash Transaction'
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper function for date formatting in export
const formatDateForExport = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

// Expense Logs Component
function ExpenseLogs({ expenseId, sourceTable }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const recordType = sourceTable === 'recharge_wallet' ? 'cash_balance' : 'nb_expense';
        const response = await fetch(`/api/audit-log?record_type=${recordType}&record_id=${expenseId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.logs) {
            setLogs(result.logs);
          }
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };
    if (expenseId) {
      fetchLogs();
    }
  }, [expenseId, sourceTable]);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <BiFile className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No activity logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Activity Logs</h4>
      {logs.map((log, idx) => {
        const parseValue = (value) => {
          if (!value) return null;
          try {
            return typeof value === 'string' ? JSON.parse(value) : value;
          } catch (e) {
            return value;
          }
        };
        
        const newValue = parseValue(log.newValue);
        const oldValue = parseValue(log.oldValue);
        
        return (
          <div key={idx} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  log.action === 'add' ? 'bg-green-100 text-green-800 border border-green-200' :
                  log.action === 'edit' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  'bg-gray-100 text-gray-800 border border-gray-200'
                }`}>
                  {log.action?.toUpperCase() || 'ACTION'}
                </span>
                <span className="font-medium text-gray-700 text-sm">
                  {log.user_name || log.userName || 'System'}
                </span>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : ''}
              </span>
            </div>
            
            <div className="space-y-2">
              {log.remarks && (
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{log.remarks}</p>
              )}
              
              {log.action === 'edit' && oldValue && newValue && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs font-medium text-gray-600 mb-1">Changes Made:</p>
                  <div className="space-y-1">
                    {oldValue.customer_name !== newValue.customer_name && (
                      <div className="text-xs bg-yellow-50 p-1.5 rounded flex items-center gap-2">
                        <span className="font-medium">Customer:</span>
                        <span className="line-through text-red-500">{oldValue.customer_name}</span>
                        <BiArrowBack className="text-gray-400" />
                        <span className="text-green-600 font-medium">{newValue.customer_name}</span>
                      </div>
                    )}
                    {oldValue.amount !== newValue.amount && (
                      <div className="text-xs bg-yellow-50 p-1.5 rounded flex items-center gap-2">
                        <span className="font-medium">Amount:</span>
                        <span className="line-through text-red-500">₹{oldValue.amount}</span>
                        <BiArrowBack className="text-gray-400" />
                        <span className="text-green-600 font-medium">₹{newValue.amount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-6">
            <div className="animate-pulse">
              <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-48 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-lg shadow p-4">
                <div className="animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 w-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

// Main Expenses Component
function ExpensesContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [expenses, setExpenses] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    expenseType: 'all'
  });
  const [expandedExpenses, setExpandedExpenses] = useState({});
  const [expandedActions, setExpandedActions] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    amount: '',
    payment_date: '',
    payment_type: 'Cash',
    remark: '',
    type: 'Outward',
    details: '',
    paid_to: '',
    reason: ''
  });

  const toggleExpenseLogs = (expenseId) => {
    setExpandedExpenses(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
  };

  const toggleActionMenu = (expenseId) => {
    setExpandedActions(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading && user.id) {
      fetchExpenses();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user && !authLoading && user.id && !loading) {
      const timer = setTimeout(() => {
        fetchExpenses(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [filters, user, authLoading]);

  const fetchExpenses = async (page = 1, getAll = false) => {
    try {
      if (!getAll) setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', getAll ? 10000 : pagination.limit);
      
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.minAmount) params.append('minAmount', filters.minAmount);
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
      if (filters.expenseType) params.append('expenseType', filters.expenseType);
      if (getAll) params.append('getAll', 'true');
      
      const response = await fetch(`/api/nb-expenses?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        
        setError(`Server error: Received HTML instead of JSON (Status: ${response.status})`);
        if (!getAll) setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        
        if (response.status === 403) {
          setError(data.error || 'You do not have permission to view expenses');
          if (!getAll) setLoading(false);
          return;
        }
        
        setError(data.error || `Failed to load expenses (${response.status})`);
        if (!getAll) setLoading(false);
        return;
      }
      
      if (!data.success) {
        setError(data.error || 'Failed to load expenses');
        if (!getAll) setLoading(false);
        return;
      }
      
      if (getAll) {
        // Return data for export
        return data.expenses || [];
      } else {
        setExpenses(data.expenses || []);
        setPermissions(data.permissions || {});
        setPagination(data.pagination || {
          page: page,
          limit: pagination.limit,
          total: 0,
          totalPages: 1
        });
      }
      
    } catch (err) {
      console.error('Error fetching expenses:', err);
      
      if (err instanceof SyntaxError && err.message.includes('JSON')) {
        setError('Server returned an invalid response. Please refresh the page.');
      } else {
        setError(err.message || 'Failed to load expenses. Please try again.');
      }
    } finally {
      if (!getAll) setLoading(false);
    }
  };

  // Export current page data to CSV
  const handleExportCurrentPage = () => {
    if (expenses.length === 0) {
      alert('No data available to export');
      return;
    }
    
    setExportLoading(true);
    try {
      const filename = `expenses_page_${pagination.page}_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(expenses, filename);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Export all data to CSV
  const handleExportAllData = async () => {
    setExportLoading(true);
    try {
      const allData = await fetchExpenses(1, true);
      if (allData && allData.length > 0) {
        const filename = `expenses_all_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(allData, filename);
      } else {
        alert('No data found to export');
      }
    } catch (error) {
      console.error('Error exporting all data:', error);
      alert('Error exporting all data: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Format currency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
      expenseType: 'all'
    });
  };

  // Payment type badge styling
  const getPaymentTypeBadge = (type) => {
    const styles = {
      Cash: 'bg-green-100 text-green-800 border border-green-200',
      RTGS: 'bg-blue-100 text-blue-800 border border-blue-200',
      NEFT: 'bg-purple-100 text-purple-800 border border-purple-200',
      UPI: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      CHEQUE: 'bg-red-100 text-red-800 border border-red-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
        {type}
      </span>
    );
  };

  // Handle edit button click
  const handleEditClick = (record) => {
    setEditingRecord(record);
    setExpandedActions({});
    
    if (record.source_table === 'expense') {
      setFormData({
        customer_name: record.customer_name || '',
        amount: record.amount?.toString() || '',
        payment_date: record.payment_date ? record.payment_date.split('T')[0] : '',
        payment_type: record.payment_type || 'Cash',
        remark: record.remark || '',
        type: record.type || 'Outward',
        details: record.details || '',
        paid_to: record.paid_to || '',
        reason: record.reason || ''
      });
    } else {
      setFormData({
        customer_name: record.customer_name || '',
        amount: record.amount?.toString() || '',
        payment_date: record.payment_date ? record.payment_date.split('T')[0] : '',
        payment_type: record.payment_type || 'Cash',
        remark: record.remark || '',
        type: 'Inward',
        details: record.details || '',
        paid_to: '',
        reason: record.remark || ''
      });
    }
    
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingRecord?.id) {
      alert('Invalid record');
      return;
    }
    
    try {
      const apiData = {
        id: editingRecord.id,
        customer_name: formData.customer_name,
        amount: formData.amount,
        payment_date: formData.payment_date,
        payment_type: formData.payment_type,
        remark: formData.remark,
        type: formData.type,
        source_table: editingRecord.source_table
      };
      
      if (editingRecord.source_table === 'expense') {
        apiData.details = formData.details;
        apiData.paid_to = formData.paid_to;
        apiData.reason = formData.reason;
      }
      
      const response = await fetch('/api/nb-expenses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Record updated successfully!');
        setIsModalOpen(false);
        fetchExpenses(pagination.page);
      } else {
        alert(result.error || 'Failed to update record');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Calculate totals
  const inwardTotal = expenses
    .filter(e => e.type === 'Inward')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  
  const outwardTotal = expenses
    .filter(e => e.type === 'Outward')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  if (authLoading || (loading && expenses.length === 0)) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Breadcrumb and Title */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <button
                onClick={() => router.back()}
                className="flex items-center hover:text-blue-600 transition-colors"
              >
                <BiArrowBack className="mr-1" />
                Back
              </button>
              <span>/</span>
              <a href="/" className="hover:text-blue-600 transition-colors">Home</a>
              <span>/</span>
              <span className="text-gray-800 font-medium">NB Expenses & Cash</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">NB Expenses & Cash Transactions</h1>
                <p className="text-gray-600 text-sm mt-1">Manage and track all expenses and cash transactions</p>
              </div>
              {permissions?.can_create && (
                <Link
                  href="/create-expense"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">Add Expense</span>
                </Link>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{pagination.total.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Inward Total</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(inwardTotal)}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <BiTrendingDown className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Outward Total</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(outwardTotal)}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                  <BiTrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Net Balance</p>
                  <p className={`text-2xl font-bold mt-1 ${(inwardTotal - outwardTotal) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(inwardTotal - outwardTotal)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <BiDollar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters Toggle and Export Buttons */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                showFilters 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BiFilterAlt className="w-5 h-5" />
              <span className="font-medium">{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            </button>
            
            <div className="flex items-center gap-2">
              <div className="relative group">
                <button
                  onClick={handleExportCurrentPage}
                  disabled={exportLoading || expenses.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
                >
                  {exportLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <BiDownload className="w-5 h-5" />
                      <span>Export to CSV</span>
                    </>
                  )}
                </button>
                
                {/* Export Options Dropdown */}
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs text-gray-500 font-medium border-b mb-2">
                      Export Options
                    </div>
                    <button
                      onClick={handleExportCurrentPage}
                      disabled={expenses.length === 0}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <BiDownload className="w-4 h-4" />
                        <span>Current Page</span>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {expenses.length} records
                      </span>
                    </button>
                    
                    <button
                      onClick={handleExportAllData}
                      disabled={exportLoading}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors disabled:opacity-50 mt-1"
                    >
                      <div className="flex items-center gap-2">
                        <BiDownload className="w-4 h-4" />
                        <span>All Records</span>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {pagination.total} records
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => fetchExpenses(1)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all disabled:opacity-50"
              >
                <BiRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="bg-white rounded-xl shadow-lg p-5 mb-6 border border-gray-200 animate-slideDown">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BiFilterAlt className="text-blue-600" />
                  Filter Records
                </h3>
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Search customer or remark..."
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    max={getTodayDate()}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    max={getTodayDate()}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={filters.minAmount}
                      onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={filters.maxAmount}
                      onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                      placeholder="10000"
                      min="0"
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                  <select
                    value={filters.expenseType}
                    onChange={(e) => handleFilterChange('expenseType', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="all">All Types</option>
                    <option value="inward">Inward (Cash Received)</option>
                    <option value="outward">Outward (Expenses)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => fetchExpenses(1)}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <BiSearch className="w-5 h-5" />
                      <span className="font-medium">Apply Filters</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Main Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <BiFile className="text-blue-600" />
                  Combined Transactions
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Page:</span>
                <select
                  value={pagination.page}
                  onChange={(e) => fetchExpenses(parseInt(e.target.value))}
                  disabled={loading}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: pagination.totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <BiFile className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium">No records found</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {filters.search || filters.dateFrom || filters.dateTo 
                              ? 'Try changing your filters' 
                              : 'Add your first expense or cash transaction'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((record) => (
                      <React.Fragment key={`${record.source_table}-${record.id}`}>
                        <tr className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(record.payment_date)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Source: {record.source_table === 'expense' ? 'Expense' : 'Cash'}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.customer_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                              {record.reason || record.remark || 'No remark'}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">
                              {record.details || record.remark || '-'}
                            </div>
                            {record.paid_to && (
                              <div className="text-xs text-gray-500 mt-1">
                                Receiver: {record.paid_to}
                              </div>
                            )}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-bold px-3 py-1.5 rounded-lg inline-block ${
                              record.type === 'Inward' 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {record.type === 'Inward' ? '+' : '-'} {formatCurrency(record.amount)}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              record.type === 'Inward' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {record.type}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPaymentTypeBadge(record.payment_type)}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap relative">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditClick(record)}
                                className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200"
                              >
                                <BiEdit className="mr-2" />
                                Edit
                              </button>
                              
                              <button
                                onClick={() => toggleActionMenu(record.id)}
                                className="inline-flex items-center px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium border border-gray-200"
                              >
                                {expandedActions[record.id] ? (
                                  <BiChevronUp className="mr-1" />
                                ) : (
                                  <BiChevronDown className="mr-1" />
                                )}
                                More
                              </button>
                            </div>
                            
                            {/* Expanded Actions Menu */}
                            {expandedActions[record.id] && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <div className="p-2">
                                  <button
                                    onClick={() => {
                                      toggleExpenseLogs(record.id);
                                      toggleActionMenu(record.id);
                                    }}
                                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    <BiMessageDetail className="mr-2" />
                                    View Activity Logs
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      // Print functionality
                                      window.print();
                                      toggleActionMenu(record.id);
                                    }}
                                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    <BiPrinter className="mr-2" />
                                    Print Receipt
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                        
                        {/* Expanded Activity Logs */}
                        {expandedExpenses[record.id] && (
                          <tr className="bg-gray-50">
                            <td colSpan="7" className="px-6 py-4 border-t">
                              <div className="max-w-4xl mx-auto">
                                <ExpenseLogs expenseId={record.id} sourceTable={record.source_table} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchExpenses(pagination.page - 1)}
                      disabled={pagination.page <= 1 || loading}
                      className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm font-medium ${
                        pagination.page <= 1 || loading
                          ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                          : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => fetchExpenses(pageNum)}
                            disabled={loading}
                            className={`w-8 h-8 rounded-lg text-sm font-medium ${
                              pagination.page === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => fetchExpenses(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages || loading}
                      className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm font-medium ${
                        pagination.page >= pagination.totalPages || loading
                          ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                          : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-300'
                      }`}
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />

        {/* Edit Modal */}
        {isModalOpen && editingRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Edit {editingRecord.source_table === 'recharge_wallet' ? 'Cash Transaction' : 'Expense'} Entry
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    editingRecord.source_table === 'recharge_wallet' 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {editingRecord.source_table === 'recharge_wallet' ? 'Cash Transaction' : 'Expense'}
                  </span>
                  <span className="text-sm text-gray-500">
                    ID: {editingRecord.id}
                  </span>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        name="customer_name"
                        value={formData.customer_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        name="payment_date"
                        value={formData.payment_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Type *
                      </label>
                      <select
                        name="payment_type"
                        value={formData.payment_type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      >
                        <option value="Cash">Cash</option>
                        <option value="RTGS">RTGS</option>
                        <option value="NEFT">NEFT</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">CHEQUE</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remark
                    </label>
                    <input
                      type="text"
                      name="remark"
                      value={formData.remark}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter remark"
                    />
                  </div>

                  {editingRecord.source_table === 'expense' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Details
                        </label>
                        <textarea
                          name="details"
                          value={formData.details}
                          onChange={handleInputChange}
                          rows="2"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter details"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Receiver
                          </label>
                          <input
                            type="text"
                            name="paid_to"
                            value={formData.paid_to}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter receiver name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason
                          </label>
                          <input
                            type="text"
                            name="reason"
                            value={formData.reason}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter reason"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="px-6 py-5 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-md hover:shadow-lg"
                  >
                    Update Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Export
export default function ExpensesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ExpensesContent />
    </Suspense>
  );
}