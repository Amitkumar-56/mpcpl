// src/app/voucher-wallet-driver/page.jsx
'use client';

import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading component
function VoucherWalletLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading driver wallet...</p>
      </div>
    </div>
  );
}

// Error component
function VoucherWalletError({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Content Component
function VoucherWalletDriverContent() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [driverName, setDriverName] = useState(null);
  const [error, setError] = useState(null);
  
  const searchParams = useSearchParams();
  const emp_id = searchParams.get('emp_id');

  useEffect(() => {
    fetchVouchers();
  }, [emp_id]);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = emp_id 
        ? `/api/voucher-wallet-driver?emp_id=${emp_id}`
        : '/api/voucher-wallet-driver';
      
      console.log('Fetching vouchers from:', url);
      
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
      
      console.log('Data loaded successfully:', {
        vouchers_count: data.vouchers?.length,
        driver_name: data.driver_name,
        permissions: data.permissions
      });
      
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
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

  const goBack = () => {
    window.history.back();
  };

  if (loading) {
    return <VoucherWalletLoading />;
  }

  if (error) {
    return <VoucherWalletError error={error} onRetry={fetchVouchers} />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="md:sticky md:top-0 md:h-screen w-full md:w-64 z-20">
        <Sidebar activePage="VoucherWallet" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="sticky top-0 z-10">
          <Header />
        </div>

        {/* Page Content */}
        <div className="flex-1 p-4">
          <div className="max-w-7xl mx-auto">
            {/* Header - Your PHP card-title equivalent */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {driverName ? `${driverName}'s Wallet` : 'Driver Wallet List'}
                  </h1>
                  <p className="text-gray-600 mt-1">Manage and view driver vouchers</p>
                  
                  {permissions && (
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
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
                  <button
                    onClick={goBack}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                  <Link 
                    href="/dashboard"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
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

            {/* Action Buttons - Your PHP action buttons equivalent */}
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
              
              {permissions?.can_edit === 1 && (
                <Link 
                  href="/create-voucher" 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Voucher
                </Link>
              )}
            </div>

            {/* Stats Summary - Your PHP stats equivalent */}
            {vouchers.length > 0 && !error && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              </div>
            )}

            {/* Table - Your PHP table equivalent */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vouchers.length > 0 && !error ? (
                      vouchers.map((voucher, index) => (
                        <tr key={voucher.voucher_id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {voucher.voucher_no || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(voucher.exp_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {voucher.vehicle_no || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {voucher.emp_id ? (
                              <Link 
                                href={`/voucher-wallet-driver-emp?emp_id=${voucher.emp_id}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              >
                                {voucher.emp_name || 'N/A'}
                              </Link>
                            ) : (
                              <span className="text-gray-900">{voucher.emp_name || 'N/A'}</span>
                            )}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2 flex justify-center">
                            <Link
                              href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              Items
                            </Link>
                            <Link
                              href={`/voucher-print?voucher_id=${voucher.voucher_id}`}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              Print
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="px-6 py-12 text-center">
                          <div className="text-gray-500 text-lg mb-2">
                            {error ? 'Error loading vouchers' : 'No vouchers found'}
                          </div>
                          <div className="text-gray-400 text-sm mb-4">
                            {emp_id ? 'No vouchers found for this driver' : 'No vouchers available in system'}
                          </div>
                          <button
                            onClick={fetchVouchers}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            Try Again
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function VoucherWalletDriver() {
  return (
    <Suspense fallback={<VoucherWalletLoading />}>
      <VoucherWalletDriverContent />
    </Suspense>
  );
}