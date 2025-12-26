// src/app/voucher-wallet-driver-emp/page.jsx
'use client';

import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import ExportButton from '@/components/ExportButton';

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

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getStatusBadge = (voucher) => {
    if (voucher.status == 1) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved by {voucher.approved_by} on {voucher.approved_date}</span>;
    } else if (voucher.status == 2) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected by {voucher.rejected_by} on {voucher.rejected_date}</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
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
    <div className="flex h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 z-30">
        <Sidebar activePage="VoucherWallet" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-64 z-20">
          <Header />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 mt-16 overflow-auto">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <button 
                        onClick={goBack}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {driverName ? `${driverName}'s Vouchers` : 'Staff Vouchers'}
                      </h1>
                    </div>
                    
                    {driverName && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="font-medium text-blue-800">Employee ID:</span>
                            <span className="text-blue-600 ml-2">{emp_id}</span>
                          </div>
                          <div>
                            <span className="font-medium text-blue-800">Name:</span>
                            <span className="text-blue-600 ml-2">{driverName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {permissions && (
                      <div className="flex gap-4 mt-3 text-sm text-gray-600">
                        <span>View: {permissions.can_view ? '✅' : '❌'}</span>
                        <span>Edit: {permissions.can_edit ? '✅' : '❌'}</span>
                        <span>Delete: {permissions.can_delete ? '✅' : '❌'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={fetchVouchers}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                    <Link 
                      href="/voucher-wallet-driver"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      All Vouchers
                    </Link>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-red-800 font-medium flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Error Loading Data
                      </div>
                      <div className="text-red-600 text-sm mt-1">{error}</div>
                    </div>
                    <button
                      onClick={fetchVouchers}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Add Button */}
              {permissions?.can_create === 1 && (
                <Link href="/create-voucher" className="fixed bottom-10 right-10 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full shadow-lg transition-colors z-50 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Voucher</span>
                </Link>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mb-6">
                <Link 
                  href="/voucher-history-cash" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  View Voucher Items
                </Link>
              </div>

              {/* Stats Summary */}
              {vouchers.length > 0 && !error && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="text-sm text-gray-600">Total Vouchers</div>
                    <div className="text-2xl font-bold text-gray-900">{vouchers.length}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="text-sm text-gray-600">Total Amount</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.total_expense || 0), 0))}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="text-sm text-gray-600">Pending Amount</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.remaining_amount || 0), 0))}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="text-sm text-gray-600">Total Advance</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.advance || 0), 0))}
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No.</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                              {/* Pending Vouchers Section - Collapsible */}
                              {pendingVouchers.length > 0 && (
                                <>
                                  <tr className="bg-yellow-50">
                                    <td colSpan="10" className="px-6 py-3">
                                      <button
                                        onClick={() => setPendingExpanded(!pendingExpanded)}
                                        className="flex items-center justify-between w-full text-left"
                                      >
                                        <span className="font-semibold text-yellow-800">
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
                                    </td>
                                  </tr>
                                  {pendingExpanded && pendingVouchers.map((voucher, idx) => {
                                    displayIndex++;
                                    return (
                          <tr key={voucher.voucher_id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {displayIndex}
                          </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {voucher.voucher_no || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(voucher.exp_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {voucher.station_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {voucher.vehicle_no || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {voucher.driver_phone || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(voucher.advance)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(voucher.total_expense)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getAmountColor(voucher.remaining_amount)}`}>
                              {formatCurrency(voucher.remaining_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex flex-wrap gap-1">
                                {/* Add Cash Button */}
                                <button
                                  onClick={() => openCashModal(voucher)}
                                  className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  Cash
                                </button>

                                {/* Add Advance Button */}
                                <button
                                  onClick={() => openAdvanceModal(voucher)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  Advance
                                </button>

                                {/* Edit Button */}
                                <Link
                                  href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </Link>

                                {/* View Button */}
                                <Link
                                  href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </Link>

                                {/* Print Button */}
                                {voucher.status == 1 && (
                                  <Link
                                    href={`/voucher-print?voucher_id=${voucher.voucher_id}`}
                                    target="_blank"
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print
                                  </Link>
                                )}

                                {/* Approve/Reject Buttons */}
                                {permissions?.can_edit == 1 && voucher.status == 0 && (
                                  <>
                                    <button
                                      onClick={() => handleStatusUpdate(voucher.voucher_id, 1)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleStatusUpdate(voucher.voucher_id, 2)}
                                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Reject
                                    </button>
                                  </>
                                )}

                                {/* Status Badge */}
                                <div className="mt-1">
                                  {getStatusBadge(voucher)}
                                </div>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {displayIndex}
                          </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {voucher.voucher_no || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(voucher.exp_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {voucher.station_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {voucher.vehicle_no || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {voucher.driver_phone || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(voucher.advance)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(voucher.total_expense)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getAmountColor(voucher.remaining_amount)}`}>
                              {formatCurrency(voucher.remaining_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex flex-wrap gap-1">
                                {/* Add Cash Button */}
                                <button
                                  onClick={() => openCashModal(voucher)}
                                  className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  Cash
                                </button>

                                {/* Add Advance Button */}
                                <button
                                  onClick={() => openAdvanceModal(voucher)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  Advance
                                </button>

                                {/* Edit Button */}
                                <Link
                                  href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </Link>

                                {/* View Button */}
                                <Link
                                  href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </Link>

                                {/* Print Button */}
                                {voucher.status == 1 && (
                                  <Link
                                    href={`/voucher-print?voucher_id=${voucher.voucher_id}`}
                                    target="_blank"
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print
                                  </Link>
                                )}

                                {/* Status Badge */}
                                <div className="mt-1">
                                  {getStatusBadge(voucher)}
                                </div>
                              </div>
                            </td>
                          </tr>
                                    );
                                  })}
                            </>
                          );
                        })()
                      ) : (
                        <>
                          {/* No Vouchers Message */}
                          {vouchers.length === 0 && !error && (
                                <tr>
                                  <td colSpan="10" className="px-6 py-12 text-center">
                                    <div className="text-gray-500 text-lg mb-2">
                                      No vouchers found for this staff member
                                    </div>
                                    <div className="text-gray-400 text-sm mb-4">
                                      {emp_id && driverName ? `No vouchers found for ${driverName}` : 'No vouchers available'}
                                    </div>
                                    <div className="flex gap-3 justify-center">
                                      <button
                                        onClick={fetchVouchers}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                      >
                                        Try Again
                                      </button>
                                      <Link
                                        href="/voucher-wallet-driver"
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                                      >
                                        View All Vouchers
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                          )}
                          
                          {/* Error Message */}
                          {error && (
                                <tr>
                                  <td colSpan="10" className="px-6 py-12 text-center">
                                    <div className="text-gray-500 text-lg mb-2">
                                      Error loading vouchers
                                    </div>
                                    <div className="flex gap-3 justify-center">
                                      <button
                                        onClick={fetchVouchers}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                      >
                                        Try Again
                                      </button>
                                      <Link
                                        href="/voucher-wallet-driver"
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                                      >
                                        View All Vouchers
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Cash Modal */}
              {modalData.showCash && modalData.selectedVoucher && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Add Cash to Voucher #{modalData.selectedVoucher.voucher_no}</h3>
                    <form onSubmit={handleAddCash}>
                      <input type="hidden" name="voucher_id" value={modalData.selectedVoucher.voucher_id} />
                      <input type="hidden" name="voucher_no" value={modalData.selectedVoucher.voucher_no} />
                      <input type="hidden" name="user_id" value={currentUser?.id || ''} />
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Details</label>
                        <textarea 
                          name="item_details" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          rows="3"
                        ></textarea>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                        <input 
                          type="number" 
                          name="amount" 
                          min="1" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          name="add_cash"
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Add Cash
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Add Advance Modal */}
              {modalData.showAdvance && modalData.selectedVoucher && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Add Advance to Voucher #{modalData.selectedVoucher.voucher_no}</h3>
                    <form onSubmit={handleAddAdvance}>
                      <input type="hidden" name="voucher_id" value={modalData.selectedVoucher.voucher_id} />
                      <input type="hidden" name="user_id" value={currentUser?.id || ''} />
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Advance Amount</label>
                        <input 
                          type="number" 
                          name="advance_amount" 
                          min="1" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          name="add_advice"
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Add Advance
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Info Box */}
              {vouchers.length > 0 && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="font-medium text-blue-800">Showing vouchers for:</span>
                      <span className="text-blue-600 ml-2">{driverName} (ID: {emp_id})</span>
                      <span className="text-blue-600 ml-4">• Total: {vouchers.length} vouchers</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="fixed bottom-0 right-0 left-64 z-10">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function VoucherWalletDriverEmp() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-50">Loading...</div>}>
      <VoucherWalletDriverEmpContent />
    </Suspense>
  );
}