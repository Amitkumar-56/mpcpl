// src/app/voucher-wallet-driver/page.jsx
'use client';

import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Simple Loading component
function VoucherWalletLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
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

  // Calculate totals
  const totalAmount = vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.total_expense || 0), 0);
  const totalPending = vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.remaining_amount || 0), 0);
  const totalAdvance = vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.advance || 0), 0);

  if (loading) {
    return <VoucherWalletLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen w-64 bg-white shadow-lg z-30">
        <Sidebar activePage="VoucherWallet" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white shadow-sm z-40 border-b">
          <div className="h-full">
            <Header />
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 mt-16 mb-12 overflow-y-auto">
          <div className="p-4 md:p-6">
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                {driverName ? `${driverName}'s Wallet` : 'Driver Wallet List'}
              </h1>
              {permissions && (
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <span>View: {permissions.can_view ? '✅' : '❌'}</span>
                  <span>Edit: {permissions.can_edit ? '✅' : '❌'}</span>
                  <span>Create: {permissions.can_create ? '✅' : '❌'}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={fetchVouchers}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={goBack}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <Link 
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
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
                    onClick={fetchVouchers}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            {vouchers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Total Vouchers</div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{vouchers.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                  <div className="text-xl md:text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Advance Amount</div>
                  <div className="text-xl md:text-2xl font-bold text-blue-600">{formatCurrency(totalAdvance)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="text-sm text-gray-600 mb-1">Pending Amount</div>
                  <div className="text-xl md:text-2xl font-bold text-red-600">{formatCurrency(totalPending)}</div>
                </div>
              </div>
            )}

            {/* Vouchers Table */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              {/* Table Header */}
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-800">Vouchers List</h2>
                  <span className="text-sm text-gray-600">
                    {vouchers.length} vouchers
                  </span>
                </div>
              </div>

              {/* Table */}
              {vouchers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Voucher No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehicle</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Driver</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Advance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pending</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reserve</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vouchers.map((voucher, idx) => (
                        <tr key={voucher.voucher_id || idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{voucher.voucher_no || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(voucher.exp_date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{voucher.vehicle_no || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">
                            {voucher.emp_id ? (
                              <Link 
                                href={`/voucher-wallet-driver-emp?emp_id=${voucher.emp_id}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                {voucher.emp_name || 'N/A'}
                              </Link>
                            ) : (
                              <span className="text-gray-900">{voucher.emp_name || 'N/A'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{voucher.driver_phone || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(voucher.advance)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(voucher.total_expense)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`font-medium ${parseFloat(voucher.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(voucher.remaining_amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-purple-600">
                            {formatCurrency(voucher.reserve_amount || (parseFloat(voucher.total_expense || 0) - parseFloat(voucher.remaining_amount || 0)))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col gap-1 min-w-[100px]">
                              <Link
                                href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs text-center"
                              >
                                Edit
                              </Link>
                              <Link
                                href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs text-center"
                              >
                                Items
                              </Link>
                              <Link
                                href={`/voucher-print?voucher_id=${voucher.voucher_id}`}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs text-center"
                              >
                                Print
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No vouchers found</div>
                  <button
                    onClick={fetchVouchers}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer - Always at bottom */}
        <div className="fixed bottom-0 right-0 left-0 lg:left-64 h-12 bg-white border-t z-30">
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