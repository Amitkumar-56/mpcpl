// src/app/voucher-wallet-driver/page.jsx
'use client';

import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { BiChevronDown, BiChevronUp } from "react-icons/bi";

// Component to fetch and display voucher logs
function VoucherLogs({ voucherId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!voucherId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/audit-logs?record_type=voucher&record_id=${voucherId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
          // API returns data array
          setLogs(result.data || []);
        } else {
          setError(result.error || 'Failed to load logs');
        }
      } catch (error) {
        console.error('Error fetching voucher logs:', error);
        setError('Failed to load logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [voucherId]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-4">Loading logs...</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-4 bg-red-50 rounded border border-red-200">
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-white rounded border">
        No activity logs found for this voucher.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log, idx) => (
        <div key={idx} className="bg-white rounded border p-2 sm:p-3 text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-700">{log.action || 'Action'}:</span>
              <span className="ml-1 sm:ml-2 text-gray-900 break-words">{log.user_name || log.user_display_name || log.userName || (log.user_id ? `Employee ID: ${log.user_id}` : 'Unknown User')}</span>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : ''}
            </span>
          </div>
          {log.remarks && (
            <p className="text-xs text-gray-600 mt-1 sm:mt-2 break-words">{log.remarks}</p>
          )}
        </div>
      ))}
    </div>
  );
}

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
  const [expandedVouchers, setExpandedVouchers] = useState({});
  
  const searchParams = useSearchParams();
  const emp_id = searchParams.get('emp_id');
  
  const toggleVoucherLogs = (voucherId) => {
    setExpandedVouchers(prev => ({
      ...prev,
      [voucherId]: !prev[voucherId]
    }));
  };

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
              {permissions && permissions.can_create && (
                <Link
                  href="/create-voucher"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2 touch-target"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H8m8 0l-8-8m0 0l8 8" />
                  </svg>
                  Create New Voucher
                </Link>
              )}
              <button
                onClick={fetchVouchers}
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
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">Back</span>
              </button>
              <Link 
                href="/dashboard"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2 touch-target"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">Dashboard</span>
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

              {/* Desktop Table */}
              {vouchers.length > 0 ? (
                <div className="hidden md:block overflow-x-auto">
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vouchers.map((voucher, idx) => (
                        <React.Fragment key={voucher.voucher_id || idx}>
                        <tr className="hover:bg-gray-50">
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
                          <td className="px-3 sm:px-4 py-3 text-sm">
                            <button
                              onClick={() => toggleVoucherLogs(voucher.voucher_id || idx)}
                              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                              title="View Activity Logs"
                            >
                              {expandedVouchers[voucher.voucher_id || idx] ? (
                                <>
                                  <BiChevronUp size={18} className="sm:inline" />
                                  <span className="ml-1 text-xs hidden sm:inline">Hide</span>
                                </>
                              ) : (
                                <>
                                  <BiChevronDown size={18} className="sm:inline" />
                                  <span className="ml-1 text-xs hidden sm:inline">Logs</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                        {/* Expandable Logs Row */}
                        {expandedVouchers[voucher.voucher_id || idx] && (
                          <tr className="bg-gray-50">
                            <td colSpan="12" className="px-3 sm:px-4 py-4">
                              <div className="max-w-full sm:max-w-4xl">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Activity Logs for Voucher #{voucher.voucher_no || voucher.voucher_id}</h3>
                                <div className="overflow-x-auto">
                                  <VoucherLogs voucherId={voucher.voucher_id} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Mobile Cards View */}
              {vouchers.length > 0 ? (
                <div className="block md:hidden space-y-4">
                  {vouchers.map((voucher, idx) => (
                    <div key={voucher.voucher_id || idx} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">#{voucher.voucher_no || 'N/A'}</h3>
                          <p className="text-sm text-gray-600">{formatDate(voucher.exp_date)}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded">#{idx + 1}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">Vehicle</p>
                          <p className="font-medium text-gray-900">{voucher.vehicle_no || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Driver</p>
                          {voucher.emp_id ? (
                            <Link 
                              href={`/voucher-wallet-driver-emp?emp_id=${voucher.emp_id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {voucher.emp_name || 'N/A'}
                            </Link>
                          ) : (
                            <p className="font-medium text-gray-900">{voucher.emp_name || 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Phone</p>
                          <p className="font-medium text-gray-900">{voucher.driver_phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Advance</p>
                          <p className="font-medium text-gray-900">{formatCurrency(voucher.advance)}</p>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600 text-sm">Total:</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(voucher.total_expense)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600 text-sm">Pending:</span>
                          <span className={`font-semibold ${parseFloat(voucher.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(voucher.remaining_amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Reserve:</span>
                          <span className="font-semibold text-purple-600">
                            {formatCurrency(voucher.reserve_amount || (parseFloat(voucher.total_expense || 0) - parseFloat(voucher.remaining_amount || 0)))}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-200">
                        <Link
                          href={`/edit-voucher?voucher_id=${voucher.voucher_id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm text-center"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/voucher-items?voucher_id=${voucher.voucher_id}`}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm text-center"
                        >
                          Items
                        </Link>
                        <Link
                          href={`/voucher-print?voucher_id=${voucher.voucher_id}`}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm text-center"
                        >
                          Print
                        </Link>
                      </div>
                      
                      {/* Mobile Logs Section */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => toggleVoucherLogs(voucher.voucher_id || idx)}
                          className="w-full flex items-center justify-between text-blue-600 hover:text-blue-800 transition-colors py-2"
                        >
                          <span className="text-sm font-medium">Activity Logs</span>
                          {expandedVouchers[voucher.voucher_id || idx] ? (
                            <BiChevronUp size={20} />
                          ) : (
                            <BiChevronDown size={20} />
                          )}
                        </button>
                        {expandedVouchers[voucher.voucher_id || idx] && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <VoucherLogs voucherId={voucher.voucher_id} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
        <div className="flex-shrink-0">
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