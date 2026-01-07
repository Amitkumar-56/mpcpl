// src/app/voucher-print/page.jsx
'use client';

import { useSession } from '@/context/SessionContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading Component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    </div>
  );
}

// Error Component
function ErrorDisplay({ error, voucher_id, onRetry, onGoBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md w-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-red-700 mb-4">{error}</p>
          <p className="text-sm text-gray-600 mb-4">Voucher ID: {voucher_id}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onGoBack}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Voucher Content Component
function VoucherContent() {
  const [voucherData, setVoucherData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const voucher_id = searchParams.get('voucher_id');
  const { user, logout } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (voucher_id) {
      fetchVoucherData();
    } else {
      setError('Voucher ID is required');
      setLoading(false);
    }
  }, [voucher_id]);

  const fetchVoucherData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching voucher data for ID:', voucher_id);
      
      const response = await fetch(`/api/voucher-print?voucher_id=${voucher_id}`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📄 Voucher data received:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Voucher not found');
      }
      
      setVoucherData(data);
    } catch (error) {
      console.error('❌ Fetch error:', error);
      setError(error.message || 'Failed to fetch voucher data');
    } finally {
      setLoading(false);
    }
  };

  const printVoucher = () => {
    window.print();
  };

  const goBack = () => {
    const emp_id = voucherData?.voucher?.emp_id || user?.id;
    
    if (emp_id) {
      router.push(`/voucher-wallet-driver-emp?emp_id=${emp_id}`);
    } else {
      router.back();
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Loading State
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error State
  if (error) {
    return (
      <ErrorDisplay 
        error={error}
        voucher_id={voucher_id}
        onRetry={fetchVoucherData}
        onGoBack={goBack}
      />
    );
  }

  // Render voucher content
  const { voucher, items = [], advance_history = [], total_amount = 0 } = voucherData;
  const itemsTotal = Array.isArray(items)
    ? items.reduce((sum, i) => sum + (parseFloat(i?.amount || 0) || 0), 0)
    : 0;
  const displayTotal = (itemsTotal > 0 ? itemsTotal : (parseFloat(total_amount || 0) || parseFloat(voucher?.total_expense || 0) || 0));
  const remaining_amount = parseFloat(voucher?.advance || 0) - displayTotal;
  const formatINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(n || 0));

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 print:bg-white print:p-0">
      <div className="max-w-4xl sm:max-w-6xl mx-auto bg-white rounded-lg shadow print:shadow-none print:max-w-none print:p-2">
        {/* Print Buttons - Hidden during print */}
        <div className="print:hidden text-center mb-4 sm:mb-6 space-x-2">
          <button 
            onClick={printVoucher}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors touch-target"
          >
            🖨️ Print Voucher
          </button>
          <button 
            onClick={goBack}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors flex items-center gap-2 touch-target"
          >
            <span className="text-lg">←</span>
            <span className="hidden sm:inline">Go Back to Wallet</span>
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors touch-target"
          >
            Logout
          </button>
        </div>

        {/* Voucher Content */}
        <div className="voucher-content border border-gray-300 rounded-lg p-4 sm:p-6 print:border-0 print:shadow-none print:p-4">
          {/* Company Header */}
          <div className="text-center mb-4 sm:mb-6 border-b pb-2 sm:pb-4">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2">
              GYANTI MULTISERVICES PRIVATE LIMITED
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">{voucher?.station_address || "Address not available"}</p>
          </div>

          {/* Voucher Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm">
            <div className="text-center">
              <div className="font-semibold bg-gray-100 py-1 sm:py-2 border">Voucher No</div>
              <div className="py-1 sm:py-2 border border-t-0">{voucher?.voucher_no || 'N/A'}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold bg-gray-100 py-1 sm:py-2 border">Location</div>
              <div className="py-1 sm:py-2 border border-t-0">{voucher?.station_name || 'N/A'}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold bg-gray-100 py-1 sm:py-2 border">Date</div>
              <div className="py-1 sm:py-2 border border-t-0">{voucher?.exp_date || 'N/A'}</div>
            </div>
          </div>

          {/* Driver and Vehicle Info */}
          <div className="mb-4 sm:mb-6 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="font-semibold w-20 sm:w-24">Driver:</span>
              <span className="flex-1">{voucher?.emp_name || "Not specified"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="font-semibold w-20 sm:w-24">Vehicle No:</span>
              <span className="flex-1">{voucher?.vehicle_no || "Not specified"}</span>
            </div>
            {voucher?.approved_by_name && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className="font-semibold w-20 sm:w-24">Approved By:</span>
                <span className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                  {voucher?.approved_by_name}
                </span>
              </div>
            )}
          </div>

          {/* Voucher Items Table */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-center mb-3 border-b pb-2">Voucher Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border border-gray-300 text-left">Item ID</th>
                    <th className="p-2 border border-gray-300 text-left">Description</th>
                    <th className="p-2 border border-gray-300 text-left">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items && items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={item.item_id || index}>
                        <td className="p-2 border border-gray-300">{item.item_id || 'N/A'}</td>
                        <td className="p-2 border border-gray-300">{item.item_details || 'N/A'}</td>
                        <td className="p-2 border border-gray-300">{formatINR(item.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-4 text-center text-gray-500">
                        No items found
                      </td>
                    </tr>
                  )}
                  
                  {/* Summary Rows */}
                  <tr className="font-bold bg-gray-50">
                    <td colSpan="2" className="p-2 border border-gray-300 text-right">Total Amount</td>
                    <td className="p-2 border border-gray-300">{formatINR(displayTotal)}</td>
                  </tr>
                  <tr className="font-bold bg-green-50">
                    <td colSpan="2" className="p-2 border border-gray-300 text-right">Advance Paid</td>
                    <td className="p-2 border border-gray-300 text-green-700">
                      {formatINR(voucher?.advance)}
                    </td>
                  </tr>
                  <tr className={`font-bold ${remaining_amount < 0 ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <td colSpan="2" className="p-2 border border-gray-300 text-right">
                      {remaining_amount < 0 ? 'Excess Paid' : 'Remaining Amount'}
                    </td>
                    <td className={`p-2 border border-gray-300 ${remaining_amount < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                      {formatINR(Math.abs(remaining_amount))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Advance History */}
          {advance_history && advance_history.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-center mb-3 border-b pb-2 text-green-700">💵 Advance History</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-green-300 text-sm">
                  <thead>
                    <tr className="bg-green-100 border-green-300">
                      <th className="p-2 border border-green-300 text-left font-semibold text-green-800">Amount</th>
                      <th className="p-2 border border-green-300 text-left font-semibold text-green-800">Given Date</th>
                      <th className="p-2 border border-green-300 text-left font-semibold text-green-800">Time</th>
                      <th className="p-2 border border-green-300 text-left font-semibold text-green-800">Given By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advance_history.map((adv, idx) => (
                      <tr key={adv.id || idx} className={idx % 2 === 0 ? 'bg-green-50' : 'bg-white text-green-700'}>
                        <td className="p-2 border border-green-300 font-bold text-green-800">{formatINR(adv.amount)}</td>
                        <td className="p-2 border border-green-300 text-green-700">
                          {adv.given_date ? new Date(adv.given_date).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="p-2 border border-green-300 text-green-700 text-xs">
                          {adv.given_date ? new Date(adv.given_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="p-2 border border-green-300 font-semibold text-green-800">{adv.given_by_name || 'N/A'}</td>
                      </tr>
                    ))}
                    {/* Total Advance Row */}
                    <tr className="font-bold bg-green-200 border-green-300 text-green-900">
                      <td colSpan="3" className="p-2 border border-green-300 text-right">Total Advance</td>
                      <td className="p-2 border border-green-300">
                        {formatINR(advance_history.reduce((sum, adv) => sum + (parseFloat(adv.amount || 0) || 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-yellow-800 text-sm text-center">📋 No advance history found for this voucher</p>
            </div>
          )}

          {/* QR Code and Stamp Section */}
          <div className="flex justify-between items-start mt-8 pt-6 border-t border-gray-300">
            <div className="text-center flex-1">
              <div className="mb-2 font-semibold">Driver QR Code</div>
              {voucher?.emp_qr_code ? (
                <img 
                  src={`/uploads/${voucher.emp_qr_code}`} 
                  alt="Driver QR Code" 
                  className="w-24 h-24 mx-auto border border-gray-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-24 h-24 mx-auto border border-gray-300 flex items-center justify-center text-gray-500 text-xs">
                  No QR
                </div>
              )}
            </div>
            
            <div className="text-center flex-1">
              <div className="mb-2 font-semibold">Company Stamp</div>
              <img 
                src="/mpcl_stamp.jpg" 
                alt="Company Stamp" 
                className="h-20 w-auto mx-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-300">
            <div className="text-center flex-1">
              <div className="font-semibold mb-2">Prepared by:</div>
              <div className="border-t border-gray-400 pt-1 mx-4">
                {voucher?.emp_name || "Not specified"}
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="font-semibold mb-2">Approved by:</div>
              <div className="border-t border-gray-400 pt-1 mx-4">
                {voucher?.approved_by_name || "Not approved"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function VoucherPrint() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <VoucherContent />
    </Suspense>
  );
}