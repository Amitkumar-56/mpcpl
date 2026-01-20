'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { BiChevronDown, BiChevronUp, BiDownload, BiEdit, BiFilterAlt, BiRefresh, BiRupee, BiSearch, BiUpload, BiUser } from "react-icons/bi";

// Component to fetch and display expense logs
function ExpenseLogs({ expenseId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/audit-log?record_type=nb_expense&record_id=${expenseId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.logs) {
            setLogs(result.logs);
          }
        }
      } catch (error) {
        console.error('Error fetching expense logs:', error);
      } finally {
        setLoading(false);
      }
    };
    if (expenseId) {
      fetchLogs();
    }
  }, [expenseId]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-4">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-white rounded border">
        No activity logs found for this expense.
      </div>
    );
  }

  const parseValue = (value) => {
    if (!value) return null;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      console.error('Error parsing value:', e);
      return null;
    }
  };

  return (
    <div className="space-y-2">
      {logs.map((log, idx) => {
        const newValue = parseValue(log.newValue);
        const oldValue = parseValue(log.oldValue);
        
        return (
          <div key={idx} className="bg-white rounded border p-3 text-sm">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  log.action === 'add' ? 'bg-green-100 text-green-800' :
                  log.action === 'edit' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {log.action?.toUpperCase() || 'ACTION'}
                </span>
                <span className="font-medium text-gray-700">
                  {log.user_name || log.userName || 'Unknown User'}
                </span>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : ''}
              </span>
            </div>
            
            <div className="mt-3 space-y-2">
              {newValue?.title && (
                <div className="flex items-start gap-2">
                  <BiUser className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-gray-500">Customer:</span>
                    <p className="text-sm font-medium text-gray-800">
                      {newValue.title}
                    </p>
                  </div>
                </div>
              )}
              
              {newValue?.paid_to && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div>
                    <span className="text-xs text-gray-500">Receiver:</span>
                    <p className="text-sm font-medium text-gray-800">
                      {newValue.paid_to}
                    </p>
                  </div>
                </div>
              )}
              
              {newValue?.amount && (
                <div className="flex items-start gap-2">
                  <BiRupee className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-gray-500">Amount:</span>
                    <p className="text-sm font-medium text-gray-800">
                      ₹{new Intl.NumberFormat('en-IN').format(newValue.amount)}
                    </p>
                  </div>
                </div>
              )}
              
              {newValue?.reason && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <span className="text-xs text-gray-500">Reason:</span>
                    <p className="text-sm font-medium text-gray-800">
                      {newValue.reason}
                    </p>
                  </div>
                </div>
              )}
              
              {log.remarks && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-600">{log.remarks}</p>
                </div>
              )}
              
              {log.action === 'edit' && oldValue && newValue && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-gray-700 mb-2">Changes:</p>
                  <div className="space-y-1">
                    {oldValue.title !== newValue.title && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">Title:</span> "{oldValue.title}" → "{newValue.title}"
                      </div>
                    )}
                    {oldValue.amount !== newValue.amount && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">Amount:</span> ₹{oldValue.amount} → ₹{newValue.amount}
                      </div>
                    )}
                    {oldValue.paid_to !== newValue.paid_to && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">Receiver:</span> "{oldValue.paid_to}" → "{newValue.paid_to}"
                      </div>
                    )}
                    {oldValue.payment_date !== newValue.payment_date && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">Date:</span> {oldValue.payment_date} → {newValue.payment_date}
                      </div>
                    )}
                    {oldValue.reason !== newValue.reason && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">Reason:</span> "{oldValue.reason}" → "{newValue.reason}"
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

// Main Expenses Content Component
function ExpensesContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [expenses, setExpenses] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
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
    expenseType: 'outward' // 'outward' or 'all'
  });
  const [expandedExpenses, setExpandedExpenses] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  const toggleExpenseLogs = (expenseId) => {
    setExpandedExpenses(prev => ({
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

  const fetchExpenses = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);
      
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.minAmount) params.append('minAmount', filters.minAmount);
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
      if (filters.expenseType) params.append('expenseType', filters.expenseType);
      
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
        setLoading(false);
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
          setLoading(false);
          return;
        }
        
        setError(data.error || `Failed to load expenses (${response.status})`);
        setLoading(false);
        return;
      }
      
      if (!data.success) {
        setError(data.error || 'Failed to load expenses');
        return;
      }
      
      setExpenses(data.expenses || []);
      setPermissions(data.permissions || {});
      setPagination(data.pagination || {
        page: page,
        limit: pagination.limit,
        total: 0,
        totalPages: 1
      });
      
    } catch (err) {
      console.error('Error fetching expenses:', err);
      
      if (err instanceof SyntaxError && err.message.includes('JSON')) {
        setError('Server returned an invalid response. Please refresh the page.');
      } else {
        setError(err.message || 'Failed to load expenses. Please try again.');
      }
    } finally {
      setLoading(false);
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
      expenseType: 'outward'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);

  if (loading && expenses.length === 0) {
    return (
      <div className="h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto">
              <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
              <div className="bg-white shadow rounded-lg p-4 mb-6">
                <div className="h-40 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
          {error && (
            <div className="max-w-7xl mx-auto mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800 font-medium">{error}</span>
                  </div>
                  <button 
                    onClick={() => setError('')}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Go Back"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">NB Expenses</h1>
                  <p className="text-gray-600 text-sm md:text-base">
                    Total: {pagination.total} expenses • {formatCurrency(totalAmount)}
                    {expenses.length > 0 && (
                      <span className="ml-2 text-gray-500">
                        (Showing {expenses.length} of {pagination.total})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BiFilterAlt className="w-5 h-5" />
                  <span className="hidden md:inline">Filters</span>
                </button>
                
                <button
                  onClick={() => fetchExpenses(1)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <BiRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">Refresh</span>
                </button>
                
                {(permissions?.can_create === 1 || permissions?.can_create === true) && (
                  <Link
                    href="/create-expense"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Expense</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Current Page Total</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <BiRupee className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Current Page</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {pagination.page} of {pagination.totalPages}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Expense Type</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        filters.expenseType === 'outward' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <BiUpload className="inline w-3 h-3 mr-1" />
                        Outward
                      </div>
                      {filters.expenseType !== 'outward' && (
                        <div className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          <BiDownload className="inline w-3 h-3 mr-1" />
                          All
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <BiUpload className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="max-w-7xl mx-auto mb-6">
              <div className="bg-white shadow rounded-lg p-4 md:p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Clear All Filters
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                      <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Search by customer name, receiver..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      max={getTodayDate()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      max={getTodayDate()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={filters.minAmount}
                        onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={filters.maxAmount}
                        onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                        placeholder="10000"
                        min="0"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                    <select
                      value={filters.expenseType}
                      onChange={(e) => handleFilterChange('expenseType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="outward">Outward Expenses (Paid)</option>
                      <option value="all">All Expenses</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => fetchExpenses(1)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <BiSearch className="w-5 h-5" />
                        <span>Apply Filters</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            {expenses.length > 0 ? (
              <>
                <div className="hidden lg:block">
                  <div className="bg-white shadow rounded-lg overflow-hidden border">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logs</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {expenses.map((expense) => (
                            <React.Fragment key={`expense-${expense.id}`}>
                              <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    #{expense.id}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(expense.payment_date)}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{expense.title}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                  <div className="truncate">{expense.details || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {expense.paid_to || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                  <div className="truncate">{expense.reason || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="font-semibold text-gray-900">
                                    {formatCurrency(expense.amount)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    expense.expense_type === 'outward' || !expense.expense_type
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {expense.expense_type === 'outward' || !expense.expense_type ? (
                                      <>
                                        <BiUpload className="w-3 h-3 mr-1" />
                                        Outward
                                      </>
                                    ) : (
                                      <>
                                        <BiDownload className="w-3 h-3 mr-1" />
                                        Inward
                                      </>
                                    )}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {permissions.can_edit && (
                                    <Link
                                      href={`/nb-expense/edit?id=${expense.id}`}
                                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                                    >
                                      <BiEdit className="w-4 h-4" />
                                      Edit
                                    </Link>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => toggleExpenseLogs(expense.id)}
                                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                                    title="View Activity Logs"
                                  >
                                    {expandedExpenses[expense.id] ? (
                                      <>
                                        <BiChevronUp size={20} />
                                        <span className="text-sm">Hide Logs</span>
                                      </>
                                    ) : (
                                      <>
                                        <BiChevronDown size={20} />
                                        <span className="text-sm">View Logs</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                              {expandedExpenses[expense.id] && (
                                <tr className="bg-gray-50">
                                  <td colSpan="10" className="px-6 py-4">
                                    <div className="max-w-4xl">
                                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                        Activity Logs for Expense #{expense.id}
                                      </h3>
                                      <ExpenseLogs expenseId={expense.id} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="lg:hidden space-y-4">
                  {expenses.map((expense) => (
                    <div key={`expense-mobile-${expense.id}`} className="bg-white shadow rounded-lg border p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                            #{expense.id}
                          </span>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{expense.title}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              expense.expense_type === 'outward' || !expense.expense_type
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {expense.expense_type === 'outward' || !expense.expense_type ? (
                                <BiUpload className="w-3 h-3" />
                              ) : (
                                <BiDownload className="w-3 h-3" />
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{formatDate(expense.payment_date)}</p>
                        </div>
                        <span className="font-bold text-gray-900 text-lg">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        {expense.paid_to && (
                          <>
                            <div className="font-medium text-gray-500">Receiver:</div>
                            <div className="text-gray-900">{expense.paid_to}</div>
                          </>
                        )}
                        
                        {expense.reason && (
                          <>
                            <div className="font-medium text-gray-500">Reason:</div>
                            <div className="text-gray-900">{expense.reason}</div>
                          </>
                        )}
                        
                        {expense.details && (
                          <>
                            <div className="font-medium text-gray-500">Details:</div>
                            <div className="text-gray-900">{expense.details}</div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t">
                        <div className="flex gap-2">
                          {permissions.can_edit && (
                            <Link
                              href={`/nb-expense/edit?id=${expense.id}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 px-3 py-1 text-sm border border-blue-600 rounded-md"
                            >
                              <BiEdit className="w-4 h-4" />
                              Edit
                            </Link>
                          )}
                        </div>
                        
                        <button
                          onClick={() => toggleExpenseLogs(expense.id)}
                          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                        >
                          {expandedExpenses[expense.id] ? (
                            <>
                              <BiChevronUp size={20} />
                              <span className="text-sm">Hide Logs</span>
                            </>
                          ) : (
                            <>
                              <BiChevronDown size={20} />
                              <span className="text-sm">View Logs</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      {expandedExpenses[expense.id] && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium text-gray-700 mb-3">Activity Logs</h4>
                          <ExpenseLogs expenseId={expense.id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center border">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg mb-2">No expenses found</p>
                {(filters.search || filters.dateFrom || filters.dateTo || filters.minAmount || filters.maxAmount || filters.expenseType !== 'all') ? (
                  <>
                    <p className="text-gray-400 text-sm mb-4">Try adjusting your filters</p>
                    <button
                      onClick={handleClearFilters}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear all filters
                    </button>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">Start by adding your first expense</p>
                )}
              </div>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="max-w-7xl mx-auto mt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white shadow rounded-lg p-4 border">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{" "}
                  of <span className="font-medium">{pagination.total}</span> expenses
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchExpenses(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    className={`px-4 py-2 border rounded-lg flex items-center gap-1 ${
                      pagination.page <= 1 || loading
                        ? 'text-gray-400 cursor-not-allowed border-gray-300'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
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
                          className={`w-10 h-10 rounded-lg ${
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
                    className={`px-4 py-2 border rounded-lg flex items-center gap-1 ${
                      pagination.page >= pagination.totalPages || loading
                        ? 'text-gray-400 cursor-not-allowed border-gray-300'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
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
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}