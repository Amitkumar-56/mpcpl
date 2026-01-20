// src/app/stock-transfers/page.jsx
'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react'; // React को import करें
import * as XLSX from 'xlsx';

export default function StockTransactions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    subType: 'all',
    status: 'all',
    stationId: '',
    productId: ''
  });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  
  const router = useRouter();
  const tableRef = useRef(null);

  // Fetch data on component mount and filter change
  useEffect(() => {
    fetchTransactions();
  }, [filters, dateRange]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.subType !== 'all') params.append('subType', filters.subType);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.stationId) params.append('stationId', filters.stationId);
      if (filters.productId) params.append('productId', filters.productId);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const url = `/api/stock-transfers?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.data || []);
        setSummary(data.summary || {});
      } else {
        setError(data.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  // Toggle row expansion
  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      const response = await fetch('/api/stock-transfers');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Export failed');
      }
      
      const exportData = (data.data || []).map((item, index) => ({
        'S.No': index + 1,
        'Date': item.date_formatted || new Date(item.created_at).toLocaleString('en-IN'),
        'Transaction ID': item.id,
        'Station': `${item.station_id} - ${item.station_name}`,
        'Product': `${item.product_id} - ${item.product_name}`,
        'Type': item.type,
        'Sub Type': item.sub_type,
        'Quantity': item.quantity,
        'Status': item.status,
        'Remarks': item.remarks,
        'Destination Station': item.destination_station || 'N/A',
        'Driver': item.driver_name || 'N/A',
        'Vehicle': item.vehicle_no || 'N/A',
        'Source': item.source === 'nb-stock' ? 'NB-Stock Entry' : 'Stock Transfer'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const wscols = [
        { wch: 5 },   { wch: 20 },  { wch: 15 },  { wch: 20 },
        { wch: 20 },  { wch: 10 },  { wch: 15 },  { wch: 10 },
        { wch: 12 },  { wch: 25 },  { wch: 20 },  { wch: 15 },
        { wch: 15 },  { wch: 15 }
      ];
      ws['!cols'] = wscols;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Transactions');
      
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Stock_Transactions_${dateStr}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Error exporting to Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      type: 'all',
      subType: 'all',
      status: 'all',
      stationId: '',
      productId: ''
    });
    setDateRange({
      startDate: '',
      endDate: ''
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'dispatch': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get type badge color
  const getTypeColor = (type) => {
    return type === 'Inward' 
      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
      : 'bg-rose-100 text-rose-800 border border-rose-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen z-30">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 ml-16 flex flex-col min-h-screen transition-all duration-300">
        {/* Header */}
        <div className="fixed top-0 right-0 lg:left-64 left-16 z-20 transition-all duration-300">
          <Header />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 pt-16 pb-6 overflow-y-auto">
          <div className="p-4 md:p-6">
            {/* Floating Action Buttons */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
              {/* Stock Transfer by Product Button */}
              <Link
                href="/stock-transfers/product"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-5 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Product Transfer</span>
                <span className="sm:hidden">Product</span>
              </Link>
              
              <Link
                href="/nb-stock/create-nb-expense"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Add NB-Stock</span>
                <span className="sm:hidden">NB-Stock</span>
              </Link>
              
              <Link
                href="/stock-transfers/create"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Create Transfer</span>
                <span className="sm:hidden">Transfer</span>
              </Link>
            </div>

            {/* Header Section */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center">
                  <button
                    onClick={() => router.back()}
                    className="mr-3 text-purple-600 hover:text-purple-800 transition-colors p-2 hover:bg-purple-50 rounded-lg"
                    aria-label="Go back"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stock Transactions</h1>
                    <p className="text-sm text-gray-600 mt-1">Track all inward and outward stock movements</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                 
                  
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                  </button>
                  
                  <button
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                  
                  <button
                    onClick={exportToExcel}
                    disabled={exportLoading || transactions.length === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    {exportLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Export
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Summary Cards - Responsive Grid */}
              {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Total Transactions</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{summary.totalTransactions}</div>
                      </div>
                      <div className="text-3xl text-gray-300">📊</div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                        {summary.inwardCount || 0} Inward
                      </span>
                      <span className="text-xs px-2 py-1 bg-rose-100 text-rose-800 rounded-full">
                        {summary.outwardCount || 0} Outward
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Total Inward</div>
                        <div className="text-2xl font-bold text-emerald-600 mt-1">
                          {summary.totalInward?.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-3xl text-emerald-200">⬇️</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      {summary.nbStockCount || 0} NB-Stock entries
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-100 hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Total Outward</div>
                        <div className="text-2xl font-bold text-rose-600 mt-1">
                          {summary.totalOutward?.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-3xl text-rose-200">⬆️</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      {summary.transferCount || 0} Stock transfers
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Net Stock</div>
                        <div className={`text-2xl font-bold mt-1 ${summary.netStock >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {summary.netStock?.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-3xl text-blue-200">⚖️</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      Inward - Outward
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filters Panel - Collapsible */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 mb-6 transition-all duration-300 ${showFilters ? 'block' : 'hidden'}`}>
              <div className="p-5">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={resetFilters}
                      className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 px-3 py-1.5 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      value={filters.type}
                      onChange={(e) => setFilters({...filters, type: e.target.value})}
                    >
                      <option value="all">All Types</option>
                      <option value="inward">Inward Only</option>
                      <option value="outward">Outward Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sub Type</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      value={filters.subType}
                      onChange={(e) => setFilters({...filters, subType: e.target.value})}
                    >
                      <option value="all">All Sub Types</option>
                      <option value="nb-stock">NB-Stock</option>
                      <option value="stock-transfer">Stock Transfer</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="dispatch">Dispatch</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Station ID</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      placeholder="Station ID"
                      value={filters.stationId}
                      onChange={(e) => setFilters({...filters, stationId: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product ID</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      placeholder="Product ID"
                      value={filters.productId}
                      onChange={(e) => setFilters({...filters, productId: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      />
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" ref={tableRef}>
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
                  <div className="text-sm text-gray-500">
                    Showing {transactions.length} of {summary?.totalTransactions || 0} transactions
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                    <span className="text-gray-600">Loading transactions...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <button
                      onClick={fetchTransactions}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300"
                    >
                      Try Again
                    </button>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-gray-700 mb-2">No transactions found</p>
                    <p className="text-sm text-gray-500">Try adjusting your filters or create a new transaction</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Date & Type</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Station</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Product</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Quantity</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {transactions.map((txn) => {
                              const isExpanded = expandedRows.has(txn.id);
                              return (
                                <React.Fragment key={`${txn.id}-fragment`}>
                                  <tr 
                                    key={txn.id}
                                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                    onClick={() => toggleRow(txn.id)}
                                  >
                                    {/* Date & Type */}
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                      <div className="text-gray-900 font-medium">
                                        {txn.date_formatted || new Date(txn.created_at).toLocaleDateString('en-IN')}
                                      </div>
                                      <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(txn.type)}`}>
                                          {txn.type} • {txn.sub_type}
                                        </span>
                                      </div>
                                    </td>
                                    
                                    {/* Station */}
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                      <div className="font-medium text-gray-900">{txn.station_name}</div>
                                      <div className="text-gray-500">ID: {txn.station_id}</div>
                                    </td>
                                    
                                    {/* Product */}
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                      <div className="font-medium text-gray-900">{txn.product_name}</div>
                                      <div className="text-gray-500">ID: {txn.product_id}</div>
                                    </td>
                                    
                                    {/* Quantity */}
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                        txn.quantity > 1000 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : txn.quantity > 100 
                                          ? 'bg-amber-100 text-amber-800' 
                                          : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {txn.quantity.toLocaleString()}
                                      </div>
                                    </td>
                                    
                                    {/* Status */}
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}>
                                        {txn.status}
                                      </span>
                                    </td>
                                    
                                    {/* Actions */}
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRow(txn.id);
                                          }}
                                          className="text-gray-400 hover:text-gray-600 transition-colors"
                                          aria-label={isExpanded ? "Collapse details" : "Expand details"}
                                        >
                                          <svg 
                                            className={`w-5 h-5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  
                                  {/* Expanded Row Details */}
                                  {isExpanded && (
                                    <tr key={`${txn.id}-expanded`} className="bg-gray-50">
                                      <td colSpan={6} className="px-4 py-4 sm:px-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-lg border border-gray-200">
                                          {/* Left Column */}
                                          <div className="space-y-4">
                                            <div>
                                              <h4 className="text-sm font-medium text-gray-900 mb-2">Transaction Details</h4>
                                              <div className="space-y-2">
                                                <div className="flex justify-between">
                                                  <span className="text-sm text-gray-500">Transaction ID:</span>
                                                  <span className="text-sm font-medium text-gray-900">{txn.id}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-sm text-gray-500">Source:</span>
                                                  <span className="text-sm font-medium text-gray-900">
                                                    {txn.source === 'nb-stock' ? 'NB-Stock Entry' : 'Stock Transfer'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-sm text-gray-500">Created:</span>
                                                  <span className="text-sm text-gray-900">
                                                    {new Date(txn.created_at).toLocaleString('en-IN')}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div>
                                              <h4 className="text-sm font-medium text-gray-900 mb-2">Remarks</h4>
                                              <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-sm text-gray-700">{txn.remarks}</p>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Right Column */}
                                          <div className="space-y-4">
                                            {txn.destination_station && (
                                              <div>
                                                <h4 className="text-sm font-medium text-gray-900 mb-2">Destination</h4>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                  <p className="text-sm font-medium text-gray-900">{txn.destination_station}</p>
                                                </div>
                                              </div>
                                            )}
                                            
                                            {(txn.driver_name || txn.vehicle_no) && (
                                              <div>
                                                <h4 className="text-sm font-medium text-gray-900 mb-2">Transfer Details</h4>
                                                <div className="space-y-2">
                                                  {txn.driver_name && (
                                                    <div className="flex justify-between">
                                                      <span className="text-sm text-gray-500">Driver:</span>
                                                      <span className="text-sm font-medium text-gray-900">{txn.driver_name}</span>
                                                    </div>
                                                  )}
                                                  {txn.vehicle_no && (
                                                    <div className="flex justify-between">
                                                      <span className="text-sm text-gray-500">Vehicle:</span>
                                                      <span className="text-sm font-medium text-gray-900">{txn.vehicle_no}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                            
                                            <div className="flex gap-2 pt-4">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  // View details action
                                                  router.push(`/stock-transfers/${txn.id}`);
                                                }}
                                                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                              >
                                                View Details
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  // Edit action
                                                  router.push(`/stock-transfers/edit/${txn.id}`);
                                                }}
                                                className="flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Pagination (Optional) */}
              {transactions.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Page 1 of 1
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        Previous
                      </button>
                      <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <div className="sticky bottom-0 right-0 lg:left-64 left-16 bg-white border-t border-gray-200 transition-all duration-300">
          <Footer />
        </div>
      </div>
    </div>
  );
}