// src/app/voucher-advance-details/page.jsx
'use client';

import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Simple Loading component
function AdvanceDetailsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
    </div>
  );
}

// Main Content Component
function AdvanceDetailsContent() {
  const searchParams = useSearchParams();
  const voucher_id = searchParams.get('voucher_id');
  
  const [advanceHistory, setAdvanceHistory] = useState([]);
  const [voucherInfo, setVoucherInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (voucher_id) {
      fetchAdvanceHistory();
    } else {
      setError('No voucher ID provided');
      setLoading(false);
    }
  }, [voucher_id]);

  const fetchAdvanceHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/advance-history-by-voucher?voucher_id=${voucher_id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch advance history');
      }
      
      setAdvanceHistory(data.advance_history || []);
      
      // Fetch basic voucher info
      fetchVoucherInfo();
      
    } catch (error) {
      console.error('Error fetching advance history:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoucherInfo = async () => {
    try {
      const response = await fetch(`/api/voucher-print?voucher_id=${voucher_id}`);
      const data = await response.json();
      
      if (data.success && data.voucher) {
        setVoucherInfo(data.voucher);
      }
    } catch (error) {
      console.error('Error fetching voucher info:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const goBack = () => {
    window.history.back();
  };

  const totalAdvance = advanceHistory.reduce((sum, adv) => sum + (parseFloat(adv?.amount || 0) || 0), 0);

  if (loading) {
    return <AdvanceDetailsLoading />;
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
                Advance Payment History
              </h1>
              {voucherInfo && (
                <div className="text-sm text-gray-600">
                  Voucher #{voucherInfo.voucher_no} - {voucherInfo.vehicle_no}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={fetchAdvanceHistory}
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
                <span className="text-lg">Back</span>
              </button>
              <Link 
                href="/voucher-advance-history"
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm flex items-center gap-2 touch-target"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                All Advances
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
                    onClick={fetchAdvanceHistory}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Voucher Info Card */}
            {voucherInfo && (
              <div className="bg-white rounded-lg shadow border p-6 mb-6">
                <h2 className="font-bold text-gray-800 mb-4">Voucher Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Voucher Number</p>
                    <p className="font-medium text-gray-900">{voucherInfo.voucher_no || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Vehicle Number</p>
                    <p className="font-medium text-gray-900">{voucherInfo.vehicle_no || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Employee Name</p>
                    <p className="font-medium text-gray-900">{voucherInfo.emp_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Total Advance Amount</p>
                    <p className="font-bold text-blue-600">{formatCurrency(voucherInfo.advance)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Advance History Table */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              {/* Table Header */}
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-800">Payment History</h2>
                  <span className="text-sm text-gray-600">
                    {advanceHistory.length} payment{advanceHistory.length !== 1 ? 's' : ''} found
                  </span>
                </div>
              </div>

              {advanceHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Given Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Given By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {advanceHistory.map((adv, idx) => (
                        <tr key={adv.id || idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">{formatCurrency(adv.amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(adv.given_date)}</td>
                          <td className="px-4 py-3 text-sm">
                            {adv.given_by_name ? (
                              <span className="font-medium text-gray-900">{adv.given_by_name}</span>
                            ) : (
                              <span className="text-gray-500">ID: {adv.given_by || 'N/A'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{adv.given_by_phone || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-gray-100">
                        <td colSpan="2" className="px-4 py-3 text-right text-gray-900">Total:</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{formatCurrency(totalAdvance)}</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No advance payment history found</div>
                  <button
                    onClick={fetchAdvanceHistory}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function VoucherAdvanceDetails() {
  return (
    <Suspense fallback={<AdvanceDetailsLoading />}>
      <AdvanceDetailsContent />
    </Suspense>
  );
}
