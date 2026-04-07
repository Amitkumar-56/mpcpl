'use client';

import AuditLogsPanel from 'components/AuditLogsPanel';
import Footer from 'components/Footer';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function VoucherWalletEmpError({ error, onRetry, onGoBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={onRetry} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Try Again</button>
            <button onClick={onGoBack} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm">Go Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusNum = parseInt(status);
  if (statusNum === 1) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">✓ Approved</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">⏳ Pending</span>;
}

function VoucherWalletDriverEmpContent() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({}); // track per-voucher loading
  const [modalData, setModalData] = useState({ showCash: false, showAdvance: false, selectedVoucher: null });
  const [logsPanel, setLogsPanel] = useState({ open: false, recordId: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const emp_id = searchParams.get('emp_id');

  useEffect(() => {
    if (!emp_id) { setError('No employee ID provided'); setLoading(false); return; }
    fetchVouchers();
  }, [emp_id]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      setError(null);
      const timestamp = Date.now(); // Add timestamp to prevent caching
      const response = await fetch(`/api/voucher-wallet-driver-emp?emp_id=${emp_id}&_t=${timestamp}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || `HTTP ${response.status}`);
      console.log('Fetched vouchers:', data.vouchers.map(v => ({ id: v.voucher_id, status: v.status, approved_by: v.approved_by })));
      setVouchers(data.vouchers || []);
      setDriverName(data.driver_name || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Status update uses POST with JSON body — proper REST
  const handleStatusUpdate = async (voucher_id, status) => {
    // Optimistic update — UI changes immediately
    const originalVouchers = [...vouchers];
    setVouchers(prev => prev.map(v => v.voucher_id === voucher_id ? { ...v, status, approved_by: 'Processing...' } : v));
    setUpdatingStatus(prev => ({ ...prev, [voucher_id]: true }));

    try {
      const response = await fetch('/api/update-voucher-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucher_id, status }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        // Rollback on failure - fetch fresh data
        setVouchers(originalVouchers);
        showToast(data.error || 'Status update failed', 'error');
      } else {
        showToast(status == 1 ? 'Voucher approved!' : 'Status updated!', 'success');
        // Immediately refresh data to ensure consistency
        await fetchVouchers();
      }
    } catch (err) {
      // Rollback on network error
      setVouchers(originalVouchers);
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [voucher_id]: false }));
    }
  };

  const openCashModal = (voucher) => setModalData({ showCash: true, showAdvance: false, selectedVoucher: voucher });
  const openAdvanceModal = (voucher) => setModalData({ showCash: false, showAdvance: true, selectedVoucher: voucher });
  const closeModal = () => setModalData({ showCash: false, showAdvance: false, selectedVoucher: null });
  const openLogModal = (voucher) => setLogsPanel({ open: true, recordId: voucher?.voucher_id ?? null });
  const closeLogModal = () => setLogsPanel({ open: false, recordId: null });

  const handleAddCash = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/process-add-cash', { method: 'POST', body: new FormData(e.target) });
      const data = await response.json();
      if (data.success) { showToast('Cash added!'); closeModal(); fetchVouchers(); }
      else showToast(data.error || 'Failed to add cash', 'error');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const handleAddAdvance = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/process-add-advance', { method: 'POST', body: new FormData(e.target) });
      const data = await response.json();
      if (data.success) { showToast('Advance added!'); closeModal(); fetchVouchers(); }
      else showToast(data.error || 'Failed to add advance', 'error');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : 'N/A';
  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const getAmountColor = (amount) => {
    const n = parseFloat(amount || 0);
    return n < 0 ? 'text-red-600 font-semibold' : n > 0 ? 'text-green-600 font-semibold' : 'text-gray-900';
  };

  const totalAmount = vouchers.reduce((s, v) => s + parseFloat(v.advance || 0) - parseFloat(v.total_expense || 0), 0);
  const pendingAmount = vouchers.reduce((s, v) => s + parseFloat(v.advance || 0) - parseFloat(v.total_expense || 0), 0);
  const advanceAmount = vouchers.reduce((s, v) => s + parseFloat(v.advance || 0), 0);

  if (!emp_id && !loading) {
    return <VoucherWalletEmpError error="No employee ID provided" onRetry={fetchVouchers} onGoBack={() => router.back()} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? '✗ ' : '✓ '}{toast.msg}
        </div>
      )}

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:flex lg:flex-shrink-0 fixed lg:fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out`}>
        <Sidebar activePage="VoucherWallet" />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Desktop header */}
        <div className="hidden lg:flex fixed top-0 left-64 right-0 z-20 bg-white shadow-sm border-b border-gray-200 px-6 py-3 items-center justify-between">
          <h1 className="text-lg font-bold text-blue-800">Voucher Wallet</h1>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">A</div>
        </div>

        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
          <div className="flex items-center justify-between p-3 h-14">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <h1 className="text-base font-bold text-gray-900 truncate">{driverName ? `${driverName}'s Vouchers` : 'Staff Vouchers'}</h1>
            </div>
            <button onClick={fetchVouchers} className="p-2 text-gray-600 hover:text-gray-900" title="Refresh">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 pt-14 lg:pt-16 lg:ml-64 p-4 md:p-6 bg-gray-100 overflow-y-auto">
          <div className="max-w-full mx-auto pb-20">

            {/* Page header */}
            <div className="mb-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => router.back()} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Go Back">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                      {driverName ? `${driverName}'s Vouchers` : 'Staff Vouchers'}
                    </h1>
                  </div>
                  {driverName && (
                    <div className="inline-flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                      <span className="text-blue-500 font-medium">ID:</span>
                      <span className="text-blue-700 font-bold">{emp_id}</span>
                      <span className="text-blue-300">|</span>
                      <span className="text-blue-500 font-medium">Name:</span>
                      <span className="text-blue-700 font-bold">{driverName}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={fetchVouchers} className="flex items-center gap-1.5 bg-white border border-gray-300 hover:border-green-400 hover:text-green-700 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <Link href="/voucher-wallet-driver" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    <span className="hidden sm:inline">All Vouchers</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-red-800 font-medium text-sm">⚠ Error Loading Data</div>
                  <div className="text-red-600 text-xs mt-0.5">{error}</div>
                </div>
                <button onClick={fetchVouchers} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium">Retry</button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex justify-center items-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-gray-500 text-sm">Loading vouchers...</div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            {!loading && vouchers.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total Vouchers', value: vouchers.length, color: 'text-gray-900', bg: 'bg-white', icon: '📋' },
                  { label: 'Total Expense', value: formatCurrency(totalAmount), color: 'text-green-700', bg: 'bg-green-50', icon: '💰' },
                  { label: 'Pending Amount', value: formatCurrency(pendingAmount), color: 'text-red-700', bg: 'bg-red-50', icon: '⏳' },
                  { label: 'Advance Given', value: formatCurrency(advanceAmount), color: 'text-blue-700', bg: 'bg-blue-50', icon: '💳' },
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} rounded-xl p-4 shadow-sm border border-gray-100`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
                      <span className="text-base">{stat.icon}</span>
                    </div>
                    <div className={`text-base lg:text-lg font-bold truncate ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Desktop Table */}
            {!loading && (
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-700">Voucher Records ({vouchers.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['#', 'Voucher No.', 'Date', 'Station', 'Vehicle', 'Advance', 'Total Expense', 'Pending', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {vouchers.length > 0 ? vouchers.map((voucher, index) => (
                        <tr key={voucher.voucher_id || index} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-3 py-2.5 text-gray-400 text-xs">{index + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-gray-800 text-xs whitespace-nowrap">{voucher.voucher_no || 'N/A'}</td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{formatDate(voucher.exp_date)}</td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs max-w-[120px] truncate">{voucher.station_name || 'N/A'}</td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{voucher.vehicle_no || 'N/A'}</td>
                          <td className="px-3 py-2.5 text-blue-600 font-medium text-xs">{formatCurrency(voucher.advance)}</td>
                          <td className="px-3 py-2.5 font-semibold text-gray-800 text-xs">{formatCurrency(voucher.total_expense)}</td>
                          <td className={`px-3 py-2.5 text-xs ${getAmountColor(parseFloat(voucher.advance || 0) - parseFloat(voucher.total_expense || 0))}`}>{formatCurrency(parseFloat(voucher.advance || 0) - parseFloat(voucher.total_expense || 0))}</td>
                          <td className="px-3 py-2.5"><StatusBadge status={voucher.status} /></td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              <button onClick={() => openCashModal(voucher)} className="bg-gray-700 hover:bg-gray-900 text-white px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap">₹ Expense</button>
                              <button onClick={() => openAdvanceModal(voucher)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap">₹ Advance</button>
                              <Link href={`/edit-voucher?voucher_id=${voucher.voucher_id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap inline-flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Edit
                              </Link>
                              <Link href={`/voucher-items?voucher_id=${voucher.voucher_id}`} className="bg-cyan-500 hover:bg-cyan-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap inline-flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> View
                              </Link>

                              {/* APPROVE BUTTON - Disabled if already approved */}
                              {voucher.status == 1 ? (
                                <button
                                  disabled={true}
                                  className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300 cursor-not-allowed opacity-60 whitespace-nowrap inline-flex items-center gap-0.5"
                                  title="Already Approved"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Approved
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusUpdate(voucher.voucher_id, 1)}
                                  disabled={updatingStatus[voucher.voucher_id]}
                                  className="px-2 py-1 rounded text-xs font-medium bg-green-600 hover:bg-green-700 text-white transition-colors whitespace-nowrap inline-flex items-center gap-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                  title="Approve Voucher"
                                >
                                  {updatingStatus[voucher.voucher_id]
                                    ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span> ...</>
                                    : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Approve</>
                                  }
                                </button>
                              )}

                              <Link href={`/voucher-print?voucher_id=${voucher.voucher_id}`} target="_blank" className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap inline-flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2-4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
                              </Link>
                              <button onClick={() => openLogModal(voucher)} className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap inline-flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M5 8h14" /></svg> Log
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="10" className="px-4 py-12 text-center">
                            <div className="text-gray-400 text-4xl mb-3">📭</div>
                            <div className="text-gray-600 font-medium mb-1">No vouchers found</div>
                            <div className="text-gray-400 text-sm mb-4">This staff member has no vouchers yet</div>
                            <div className="flex gap-2 justify-center">
                              <button onClick={fetchVouchers} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Refresh</button>
                              <Link href="/voucher-wallet-driver" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">View All</Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mobile card view */}
            {!loading && (
              <div className="lg:hidden space-y-3">
                {vouchers.length > 0 ? vouchers.map((voucher, index) => (
                  <div key={voucher.voucher_id || index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-gray-900">#{voucher.voucher_no || 'N/A'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatDate(voucher.exp_date)} • {voucher.station_name || 'N/A'}</div>
                        {voucher.vehicle_no && <div className="text-xs text-blue-500 mt-0.5">🚗 {voucher.vehicle_no}</div>}
                      </div>
                      <StatusBadge status={voucher.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-gray-50 rounded-lg p-3">
                      {[
                        { label: 'Advance', value: formatCurrency(voucher.advance), color: 'text-blue-600' },
                        { label: 'Total Expense', value: formatCurrency(voucher.total_expense), color: 'text-gray-800 font-bold' },
                        { label: 'Pending', value: formatCurrency(parseFloat(voucher.advance || 0) - parseFloat(voucher.total_expense || 0)), color: getAmountColor(parseFloat(voucher.advance || 0) - parseFloat(voucher.total_expense || 0)) },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="text-gray-400 mb-0.5">{item.label}</div>
                          <div className={`font-medium ${item.color}`}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => openCashModal(voucher)} className="bg-gray-700 hover:bg-gray-900 text-white py-2 rounded-lg text-xs font-medium">₹ Add Expense</button>
                      <button onClick={() => openAdvanceModal(voucher)} className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-medium">₹ Add Advance</button>
                      <Link href={`/edit-voucher?voucher_id=${voucher.voucher_id}`} className="bg-blue-600 text-white py-2 rounded-lg text-xs font-medium text-center">✏ Edit</Link>
                      <Link href={`/voucher-items?voucher_id=${voucher.voucher_id}`} className="bg-cyan-500 text-white py-2 rounded-lg text-xs font-medium text-center">👁 View</Link>

                      {/* Approve button - Disabled if already approved */}
                      {voucher.status == 1 ? (
                        <button
                          disabled={true}
                          className="py-2 rounded-lg text-xs font-medium bg-green-100 text-green-800 border border-green-300 cursor-not-allowed opacity-60 flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Approved
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusUpdate(voucher.voucher_id, 1)}
                          disabled={updatingStatus[voucher.voucher_id]}
                          className="py-2 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {updatingStatus[voucher.voucher_id] ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>} Approve
                        </button>
                      )}

                      <Link href={`/voucher-print?voucher_id=${voucher.voucher_id}`} target="_blank" className="bg-yellow-500 text-white py-2 rounded-lg text-xs font-medium text-center">🖨 Print</Link>
                      <button onClick={() => openLogModal(voucher)} className="bg-purple-600 text-white py-2 rounded-lg text-xs font-medium">📋 Logs</button>
                    </div>
                  </div>
                )) : (
                  !loading && (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                      <div className="text-gray-400 text-4xl mb-3">📭</div>
                      <div className="text-gray-600 font-medium mb-1">No vouchers found</div>
                      <div className="text-gray-400 text-sm mb-4">This staff member has no vouchers</div>
                      <div className="flex gap-2 justify-center">
                        <button onClick={fetchVouchers} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Refresh</button>
                        <Link href="/voucher-wallet-driver" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">View All</Link>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-white border-t border-gray-200">
          <div className="h-12"><Footer /></div>
        </div>

        {/* FAB */}
        <Link href="/create-voucher" className="fixed bottom-16 right-5 bg-purple-600 hover:bg-purple-700 text-white p-3.5 rounded-full shadow-lg transition-colors z-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </Link>

        {logsPanel.open && logsPanel.recordId && (
          <AuditLogsPanel recordId={logsPanel.recordId} recordType="voucher" onClose={closeLogModal} />
        )}
      </div>

      {/* Add Expense Modal */}
      {modalData.showCash && modalData.selectedVoucher && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Add Expense</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700 mb-4 font-medium">Voucher #{modalData.selectedVoucher.voucher_no}</div>
            <form onSubmit={handleAddCash} className="space-y-4">
              <input type="hidden" name="voucher_id" value={modalData.selectedVoucher.voucher_id} />
              <input type="hidden" name="voucher_no" value={modalData.selectedVoucher.voucher_no} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Details <span className="text-red-500">*</span></label>
                <textarea name="item_details" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" required rows="3" placeholder="Describe the expense..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹) <span className="text-red-500">*</span></label>
                <input type="number" name="amount" min="1" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required placeholder="0.00" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" name="add_cash" className="flex-1 px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Advance Modal */}
      {modalData.showAdvance && modalData.selectedVoucher && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Add Advance</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="bg-indigo-50 rounded-lg px-3 py-2 text-sm text-indigo-700 mb-4 font-medium">Voucher #{modalData.selectedVoucher.voucher_no}</div>
            <form onSubmit={handleAddAdvance} className="space-y-4">
              <input type="hidden" name="voucher_id" value={modalData.selectedVoucher.voucher_id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Advance Amount (₹) <span className="text-red-500">*</span></label>
                <input type="number" name="advance_amount" min="1" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required placeholder="0.00" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" name="add_advice" className="flex-1 px-3 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Add Advance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VoucherWalletDriverEmp() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    }>
      <VoucherWalletDriverEmpContent />
    </Suspense>
  );
}