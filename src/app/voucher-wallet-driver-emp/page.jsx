// src/app/voucher-wallet-driver-emp/page.jsx
'use client';

import AuditLogsPanel from 'components/AuditLogsPanel'; // Ensure this import exists
import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Error component
function VoucherWalletEmpError({ error, onRetry, onGoBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              Try Again
            </button>
            <button
              onClick={onGoBack}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Content Component
function VoucherWalletDriverEmpContent() {
  const [vouchers, setVouchers] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [driverName, setDriverName] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [modalData, setModalData] = useState({
    showCash: false,
    showAdvance: false,
    selectedVoucher: null
  });
  const [logsPanel, setLogsPanel] = useState({ open: false, recordId: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const emp_id = searchParams.get('emp_id');

  useEffect(() => {
    if (!emp_id) {
      setError('No employee ID provided');
      return;
    }
    fetchVouchers();
  }, [emp_id]);

  const fetchVouchers = async () => {
    try {
      setError(null);
      
      const url = `/api/voucher-wallet-driver-emp?emp_id=${emp_id}`;
      
      console.log('Fetching staff vouchers from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch data');
      }
      
      setVouchers(data.vouchers || []);
      setPermissions(data.permissions);
      setDriverName(data.driver_name);
      setCurrentUser(data.current_user);
      
      console.log('Staff data loaded successfully:', {
        vouchers_count: data.vouchers?.length,
        driver_name: data.driver_name,
        emp_id: emp_id
      });
      
    } catch (error) {
      console.error('Error fetching staff vouchers:', error);
      setError(error.message);
    }
  };

  // Modal handlers
  const openCashModal = (voucher) => {
    setModalData({
      showCash: true,
      showAdvance: false,
      selectedVoucher: voucher
    });
  };

  const openAdvanceModal = (voucher) => {
    setModalData({
      showCash: false,
      showAdvance: true,
      selectedVoucher: voucher
    });
  };

  const closeModal = () => {
    setModalData({
      showCash: false,
      showAdvance: false,
      selectedVoucher: null
    });
  };
  
  const openLogModal = (voucher) => {
    setLogsPanel({ open: true, recordId: voucher?.voucher_id || null });
  };
  
  const closeLogModal = () => {
    setLogsPanel({ open: false, recordId: null });
  };

  // Form handlers
  const handleAddCash = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('/api/process-add-cash', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Cash added successfully!');
        closeModal();
        fetchVouchers(); // Refresh data
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error adding cash: ' + error.message);
    }
  };

  const handleAddAdvance = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('/api/process-add-advance', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Advance added successfully!');
        closeModal();
        fetchVouchers(); // Refresh data
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error adding advance: ' + error.message);
    }
  };

  const handleStatusUpdate = async (voucher_id, status) => {
    if (confirm(`Are you sure you want to ${status === 1 ? 'approve' : 'reject'} this voucher?`)) {
      try {
        const response = await fetch(`/api/update-voucher-status?voucher_id=${voucher_id}&status=${status}`);
        const data = await response.json();
        
        if (data.success) {
          alert(`Voucher ${status === 1 ? 'approved' : 'rejected'} successfully!`);
          fetchVouchers(); // Refresh data
        } else {
          alert('Error: ' + data.error);
        }
      } catch (error) {
        alert('Error updating status: ' + error.message);
      }
    }
  };

  const getAmountColor = (amount) => {
    const numAmount = parseFloat(amount || 0);
    if (numAmount < 0) return 'text-red-600';
    if (numAmount > 0) return 'text-green-600';
    return 'text-black';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // रुपए फॉर्मेट करने के लिए (₹ सिंबल के साथ)
  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    // भारतीय रुपए फॉर्मेट में
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusBadge = (voucher) => {
    if (voucher.status == 1) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✓</span>;
    } else if (voucher.status == 2) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">✗</span>;
    } else {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳</span>;
    }
  };

  const goBack = () => {
    router.back();
  };

  if (error && !emp_id) {
    return (
      <VoucherWalletEmpError 
        error={error} 
        onRetry={fetchVouchers} 
        onGoBack={goBack}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile and Desktop */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:flex lg:flex-shrink-0 fixed lg:fixed inset-y-0 left-0 z-50 w-64 transform 
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar activePage="VoucherWallet" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen overflow-hidden">
        {/* Desktop Header - Fixed at top */}
        <div className="hidden lg:block fixed top-0 left-64 right-0 z-20 bg-white shadow-sm"><Header /></div>

        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {driverName ? `${driverName}'s Vouchers` : 'Staff Vouchers'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchVouchers}
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 pt-[56px] lg:pt-16 overflow-y-auto p-4 md:p-6 bg-gray-50 pb-24">
          <div className="max-w-full mx-auto">
            {/* Header Section */}
            <div className="mb-4 lg:mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <button 
                      onClick={goBack}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                      title="Go Back"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      {driverName ? `${driverName}'s Vouchers` : 'Staff Vouchers'}
                    </h1>
                  </div>
                  
                  {driverName && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs lg:text-sm">
                      <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-blue-800">ID:</span>
                          <span className="text-blue-600">{emp_id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-blue-800">Name:</span>
                          <span className="text-blue-600">{driverName}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={fetchVouchers}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
                    title="Refresh"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden lg:inline">Refresh</span>
                  </button>
                  <Link 
                    href="/voucher-wallet-driver"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
                    title="All Vouchers"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="hidden lg:inline">All Vouchers</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-red-800 font-medium flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Error Loading Data
                    </div>
                    <div className="text-red-600 text-xs mt-1">{error}</div>
                  </div>
                  <button
                    onClick={fetchVouchers}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Stats Summary - Responsive Grid */}
            {vouchers.length > 0 && !error && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg shadow border">
                  <div className="text-xs text-gray-600">Total Vouchers</div>
                  <div className="text-lg font-bold text-gray-900">{vouchers.length}</div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow border">
                  <div className="text-xs text-gray-600">Total Amount</div>
                  <div className="text-lg font-bold text-green-600 truncate">
                    {formatCurrency(vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.total_expense || 0), 0))}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow border">
                  <div className="text-xs text-gray-600">Pending Amount</div>
                  <div className="text-lg font-bold text-red-600 truncate">
                    {formatCurrency(vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.remaining_amount || 0), 0))}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow border">
                  <div className="text-xs text-gray-600">Advance Amount</div>
                  <div className="text-lg font-bold text-blue-600 truncate">
                    {formatCurrency(vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.advance || 0), 0))}
                  </div>
                </div>
              </div>
            )}

            {/* Table - Mobile Card View / Desktop Table View */}
            <div className="bg-white rounded-lg shadow overflow-hidden border">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No.</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reserve</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vouchers.length > 0 && !error ? (
                      (() => {
                        const pendingVouchers = vouchers.filter(v => v.status == 0 || v.status == null);
                        const otherVouchers = vouchers.filter(v => v.status != 0 && v.status != null);
                        let displayIndex = 0;
                        
                        return (
                          <>
                            {/* Pending Vouchers Section */}
                            {pendingVouchers.length > 0 && (
                              <>
                                <tr className="bg-yellow-50">
                                  <td colSpan="11" className="px-3 py-2">
                                    <button
                                      onClick={() => setPendingExpanded(!pendingExpanded)}
                                      className="flex items-center justify-between w-full text-left"
                                    >
                                      <span className="font-semibold text-yellow-800 text-xs">
                                        Pending Vouchers ({pendingVouchers.length})
                                      </span>
                                      <svg 
                                        className={`w-4 h-4 text-yellow-800 transition-transform ${pendingExpanded ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                                {pendingExpanded && pendingVouchers.map((voucher, idx) => {
                                  displayIndex++;
                                  return (
                                    <tr key={voucher.voucher_id || idx} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                        {displayIndex}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                                        <div className="text-xs">{voucher.voucher_no || 'N/A'}</div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                        <div className="text-xs">{formatDate(voucher.exp_date)}</div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                        <div className="text-xs truncate max-w-[100px]">{voucher.station_name || 'N/A'}</div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                        <div className="text-xs">{voucher.vehicle_no || 'N/A'}</div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                        <div className="text-xs">{formatCurrency(voucher.advance)}</div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                                        <div className="text-xs">{formatCurrency(voucher.total_expense)}</div>
                                      </td>
                                      <td className={`px-3 py-2 whitespace-nowrap font-medium ${getAmountColor(voucher.remaining_amount)}`}>
                                        <div className="text-xs">{formatCurrency(voucher.remaining_amount)}</div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-purple-600">
                                        <div className="text-xs">{formatCurrency(voucher.reserve_amount || (parseFloat(voucher.total_expense || 0) - parseFloat(voucher.remaining_amount || 0)))}</div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {getStatusBadge(voucher)}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1 items-center">
                                          <button
                                            onClick={() => openCashModal(voucher)}
                                            className="bg-gray-800 hover:bg-gray-900 text-white p-1 rounded text-xs"
                                            title="Add Expense"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="ml-1">Add Expense</span>
                                          </button>

                                          <button
                                            onClick={() => openAdvanceModal(voucher)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs"
                                            title="Add Advance"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="ml-1">Add Advance</span>
                                          </button>

                                          <Link
                                            href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                                            className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs"
                                            title="Edit"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span className="ml-1">Edit</span>
                                          </Link>
                                          
                                          <Link
                                            href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                                            className="bg-cyan-500 hover:bg-cyan-600 text-white p-1 rounded text-xs"
                                            title="View"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            <span className="ml-1">View</span>
                                          </Link>

                                          {permissions?.can_edit == 1 && voucher.status == 0 && (
                                            <>
                                              <button
                                                onClick={() => handleStatusUpdate(voucher.voucher_id, 1)}
                                                className="bg-green-600 hover:bg-green-700 text-white p-1 rounded text-xs"
                                                title="Approve"
                                              >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              </button>
                                              <button
                                                onClick={() => handleStatusUpdate(voucher.voucher_id, 2)}
                                                className="bg-red-600 hover:bg-red-700 text-white p-1 rounded text-xs"
                                                title="Reject"
                                              >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                              <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-[10px] font-medium">
                                                Pending
                                              </span>
                                            </>
                                          )}
                                          
                                          <button
                                            onClick={() => openLogModal(voucher)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white p-1 rounded text-xs"
                                            title="Logs"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M5 8h14" />
                                            </svg>
                                            <span className="ml-1">Log</span>
                                          </button>
                                          
                                          {voucher.status == 1 && (
                                            <div className="w-full mt-1">
                                              <div className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-[10px] font-medium">
                                                Approved by {voucher.approved_by || 'N/A'} on {voucher.updated_at || voucher.approved_at || ''}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}
                            
                            {/* Other Vouchers */}
                            {otherVouchers.map((voucher, idx) => {
                              displayIndex++;
                              return (
                                <tr key={voucher.voucher_id || idx} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                    {displayIndex}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                                    <div className="text-xs">{voucher.voucher_no || 'N/A'}</div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                    <div className="text-xs">{formatDate(voucher.exp_date)}</div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                    <div className="text-xs truncate max-w-[100px]">{voucher.station_name || 'N/A'}</div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                    <div className="text-xs">{voucher.vehicle_no || 'N/A'}</div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                    <div className="text-xs">{formatCurrency(voucher.advance)}</div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                                    <div className="text-xs">{formatCurrency(voucher.total_expense)}</div>
                                  </td>
                                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${getAmountColor(voucher.remaining_amount)}`}>
                                    <div className="text-xs">{formatCurrency(voucher.remaining_amount)}</div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-purple-600">
                                    <div className="text-xs">{formatCurrency(voucher.reserve_amount || (parseFloat(voucher.total_expense || 0) - parseFloat(voucher.remaining_amount || 0)))}</div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {getStatusBadge(voucher)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="flex flex-wrap gap-1 items-center">
                                      <button
                                        onClick={() => openCashModal(voucher)}
                                        className="bg-gray-800 hover:bg-gray-900 text-white p-1 rounded text-xs"
                                        title="Add Expense"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                        <span className="ml-1">Add Expense</span>
                                      </button>

                                      <button
                                        onClick={() => openAdvanceModal(voucher)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs"
                                        title="Add Advance"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                        <span className="ml-1">Add Advance</span>
                                      </button>

                                      <Link
                                        href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs"
                                        title="Edit"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span className="ml-1">Edit</span>
                                      </Link>
                                      
                                      <Link
                                        href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                                        className="bg-cyan-500 hover:bg-cyan-600 text-white p-1 rounded text-xs"
                                        title="View"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        <span className="ml-1">View</span>
                                      </Link>

                                      {voucher.status == 1 && (
                                        <Link
                                          href={`/voucher-print?voucher_id=${voucher.voucher_id}`}
                                          target="_blank"
                                          className="bg-yellow-600 hover:bg-yellow-700 text-white p-1 rounded text-xs"
                                          title="Print"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                          </svg>
                                        </Link>
                                      )}
                                      
                                      <button
                                        onClick={() => openLogModal(voucher)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white p-1 rounded text-xs"
                                        title="Logs"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M5 8h14" />
                                        </svg>
                                        <span className="ml-1">Log</span>
                                      </button>
                                      
                                      {voucher.status == 1 && (
                                        <div className="w-full mt-1">
                                          <div className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-[10px] font-medium">
                                            Approved by {voucher.approved_by || 'N/A'} on {voucher.updated_at || voucher.approved_at || ''}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        );
                      })()
                    ) : (
                      <tr>
                        <td colSpan="11" className="px-3 py-8 text-center">
                          <div className="text-gray-500 text-sm mb-2">
                            No vouchers found for this staff member
                          </div>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={fetchVouchers}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                            >
                              Try Again
                            </button>
                            <Link
                              href="/voucher-wallet-driver"
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
                            >
                              View All
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                {vouchers.length > 0 && !error ? (
                  (() => {
                    const pendingVouchers = vouchers.filter(v => v.status == 0 || v.status == null);
                    const otherVouchers = vouchers.filter(v => v.status != 0 && v.status != null);
                    
                    return (
                      <div className="p-3 space-y-3">
                        {/* Pending Vouchers Section */}
                        {pendingVouchers.length > 0 && (
                          <div className="mb-4">
                            <button
                              onClick={() => setPendingExpanded(!pendingExpanded)}
                              className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between"
                            >
                              <span className="font-semibold text-yellow-800 text-sm">
                                Pending Vouchers ({pendingVouchers.length})
                              </span>
                              <svg 
                                className={`w-5 h-5 text-yellow-800 transition-transform ${pendingExpanded ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {pendingExpanded && (
                              <div className="mt-3 space-y-3">
                                {pendingVouchers.map((voucher, idx) => (
                                  <div key={voucher.voucher_id || idx} className="bg-white border rounded-lg p-3 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <div className="font-medium text-gray-900 text-sm">
                                          #{voucher.voucher_no || 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {formatDate(voucher.exp_date)} • {voucher.station_name || 'N/A'}
                                        </div>
                                      </div>
                                      <div>
                                        {getStatusBadge(voucher)}
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                      <div>
                                        <div className="text-gray-500">Advance</div>
                                        <div className="font-medium">{formatCurrency(voucher.advance)}</div>
                                      </div>
                                      <div>
                                        <div className="text-gray-500">Total</div>
                                        <div className="font-medium">{formatCurrency(voucher.total_expense)}</div>
                                      </div>
                                      <div>
                                        <div className="text-gray-500">Pending</div>
                                        <div className={`font-medium ${getAmountColor(voucher.remaining_amount)}`}>
                                          {formatCurrency(voucher.remaining_amount)}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-gray-500">Reserve</div>
                                        <div className="font-medium text-purple-600">
                                          {formatCurrency(voucher.reserve_amount || (parseFloat(voucher.total_expense || 0) - parseFloat(voucher.remaining_amount || 0)))}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => openCashModal(voucher)}
                                        className="flex-1 bg-gray-800 hover:bg-gray-900 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                        Add Expense
                                      </button>
                                      
                                      <button
                                        onClick={() => openAdvanceModal(voucher)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                        Add Advance
                                      </button>
                                      
                                      {permissions?.can_edit == 1 && voucher.status == 0 && (
                                        <>
                                          <button
                                            onClick={() => handleStatusUpdate(voucher.voucher_id, 1)}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => handleStatusUpdate(voucher.voucher_id, 2)}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Reject
                                          </button>
                                        </>
                                      )}
                                      <Link
                                        href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                      </Link>
                                      <Link
                                        href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Other Vouchers */}
                        {otherVouchers.map((voucher, idx) => (
                          <div key={voucher.voucher_id || idx} className="bg-white border rounded-lg p-3 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  #{voucher.voucher_no || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatDate(voucher.exp_date)} • {voucher.station_name || 'N/A'}
                                </div>
                              </div>
                              <div>
                                {getStatusBadge(voucher)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div>
                                <div className="text-gray-500">Advance</div>
                                <div className="font-medium">{formatCurrency(voucher.advance)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Total</div>
                                <div className="font-medium">{formatCurrency(voucher.total_expense)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Pending</div>
                                <div className={`font-medium ${getAmountColor(voucher.remaining_amount)}`}>
                                  {formatCurrency(voucher.remaining_amount)}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Reserve</div>
                                <div className="font-medium text-purple-600">
                                  {formatCurrency(voucher.reserve_amount || (parseFloat(voucher.total_expense || 0) - parseFloat(voucher.remaining_amount || 0)))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => openCashModal(voucher)}
                                className="flex-1 bg-gray-800 hover:bg-gray-900 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                Add Expense
                              </button>
                              
                              <button
                                onClick={() => openAdvanceModal(voucher)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                Add Advance
                              </button>
                              
                              <Link
                                href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </Link>
                              
                              <Link
                                href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </Link>
                              
                              <button
                                onClick={() => openLogModal(voucher)}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M5 8h14" />
                                </svg>
                                Log
                              </button>
                              
                              {voucher.status == 1 && (
                                <Link
                                  href={`/voucher-print?voucher_id=${voucher.voucher_id}`}
                                  target="_blank"
                                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-xs flex items-center justify-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                  Print
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-gray-500 text-sm mb-2">
                      No vouchers found for this staff member
                    </div>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={fetchVouchers}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Try Again
                      </button>
                      <Link
                        href="/voucher-wallet-driver"
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
                      >
                        View All
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modals */}
            {modalData.showCash && modalData.selectedVoucher && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-4 w-full max-w-md">
                  <h3 className="text-md font-semibold mb-3">Add Cash to Voucher #{modalData.selectedVoucher.voucher_no}</h3>
                  <form onSubmit={handleAddCash}>
                    <input type="hidden" name="voucher_id" value={modalData.selectedVoucher.voucher_id} />
                    <input type="hidden" name="voucher_no" value={modalData.selectedVoucher.voucher_no} />
                    <input type="hidden" name="user_id" value={currentUser?.id || ''} />
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Details</label>
                      <textarea 
                        name="item_details" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                        rows="2"
                      ></textarea>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                      <input 
                        type="number" 
                        name="amount" 
                        min="1" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        name="add_cash"
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Add Cash
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {modalData.showAdvance && modalData.selectedVoucher && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-4 w-full max-w-md">
                  <h3 className="text-md font-semibold mb-3">Add Advance to Voucher #{modalData.selectedVoucher.voucher_no}</h3>
                  <form onSubmit={handleAddAdvance}>
                    <input type="hidden" name="voucher_id" value={modalData.selectedVoucher.voucher_id} />
                    <input type="hidden" name="user_id" value={currentUser?.id || ''} />
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount (₹)</label>
                      <input 
                        type="number" 
                        name="advance_amount" 
                        min="1" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        name="add_advice"
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Add Advance
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-white border-t">
          <Footer />
        </div>

        {/* Floating Add Button for Mobile */}
        {permissions?.can_create === 1 && (
          <Link 
            href="/create-voucher" 
            className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-colors z-50 lg:p-3"
          >
            <svg className="w-6 h-6 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="sr-only lg:not-sr-only lg:ml-1">Add</span>
          </Link>
        )}
        
        {logsPanel.open && logsPanel.recordId && (
          <AuditLogsPanel
            recordId={logsPanel.recordId}
            recordType="voucher"
            onClose={closeLogModal}
          />
        )}
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function VoucherWalletDriverEmp() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <VoucherWalletDriverEmpContent />
    </Suspense>
  );
}
