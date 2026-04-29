'use client';
 
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";

// Component to fetch and display transfer logs
function TransferLogs({ transferId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        // Fetch stock transfer logs
        const response = await fetch(`/api/entity-logs?entity_type=stock_transfer&entity_id=${transferId}`);
        const result = await response.json();
        if (result.success && result.logs) {
          setLogs(result.logs);
        }
      } catch (error) {
        console.error('Error fetching transfer logs:', error);
      } finally {
        setLoading(false);
      }
    };
    if (transferId) {
      fetchLogs();
    }
  }, [transferId]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-4">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-white rounded border">
        No activity logs found for this transfer.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log, idx) => (
        <div key={idx} className="bg-white rounded border p-3 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-medium text-gray-700">{log.action || 'Action'}:</span>
              <span className="ml-2 text-gray-900">
                {log.user_name || log.employee_name || log.performed_by_name || 'Unknown User'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {log.performed_at_formatted || log.created_at_formatted || 
               (log.performed_at ? new Date(log.performed_at).toLocaleString('en-IN') : '')}
            </span>
          </div>
          
          {/* Show transfer details */}
          <div className="mt-2 text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              {log.station_from_name && (
                <span>From: {log.station_from_name}</span>
              )}
              {log.station_to_name && (
                <span>To: {log.station_to_name}</span>
              )}
              {log.product_name && (
                <span>Product: {log.product_name}</span>
              )}
              {log.quantity && (
                <span>Qty: {log.quantity}</span>
              )}
            </div>
          </div>
          
          {log.remarks && (
            <p className="text-xs text-gray-600 mt-1">{log.remarks}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Create a separate component that contains the main logic
function StockTransfersContent() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const toggleTransferLogs = (transferId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transferId)) {
        newSet.delete(transferId);
      } else {
        newSet.add(transferId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  useEffect(() => {
    // Handle query parameter id - if present, expand that row
    const idParam = searchParams.get('id');
    if (idParam && transfers.length > 0) {
      const transferId = parseInt(idParam);
      // Expand the row if it exists
      if (transfers.some(t => t.id === transferId)) {
        setExpandedRows(prev => new Set([...prev, transferId]));
      }
    }
  }, [searchParams, transfers]);

  const fetchTransfers = async () => {
    try {
      console.log("🔄 Fetching stock transfers...");
      const response = await fetch("/api/stock-transfers");
      const data = await response.json();
      
      console.log("📥 Transfers response:", data);
      
      if (response.ok) {
        setTransfers(data.transfers || []);
        console.log("✅ Transfers loaded:", data.transfers?.length);
      } else {
        setError(data.error || "Failed to fetch transfers");
      }
    } catch (err) {
      console.error("❌ Error fetching transfers:", err);
      setError("Failed to fetch stock transfers");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      1: { class: "bg-yellow-100 text-yellow-800", text: "Dispatch" },
      2: { class: "bg-blue-100 text-blue-800", text: "Pending" },
      3: { class: "bg-green-100 text-green-800", text: "Completed" },
    };

    const config = statusConfig[status] || { class: "bg-gray-100 text-gray-800", text: "Unknown" };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const toggleRow = (transferId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transferId)) {
        newSet.delete(transferId);
      } else {
        newSet.add(transferId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Desktop: Relative, Mobile: Fixed/Overlay */}
      <div className="flex-shrink-0 z-50 lg:relative">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white shadow-sm">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          <Link
            href="/stock-transfers/product"
            className="bg-green-600 hover:bg-green-700 text-white p-3.5 lg:px-6 lg:py-3 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center lg:space-x-2 hover:scale-110 active:scale-95"
            title="Product Transfers"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="hidden lg:inline font-medium">Product Transfers</span>
          </Link>
          <Link
            href="/stock-transfers/create"
            className="bg-purple-600 hover:bg-purple-700 text-white p-3.5 lg:px-6 lg:py-3 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center lg:space-x-2 hover:scale-110 active:scale-95"
            title="Create Stock Transfer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden lg:inline font-medium">New Transfer</span>
          </Link>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-5 py-5 border-b border-gray-100 bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-lg">🚚</span>
                <h2 className="text-lg font-bold text-gray-800 tracking-tight">Stock Transfer Details</h2>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  href="/stock-transfers/activity-logs"
                  className="flex-1 sm:flex-none bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Activity Logs</span>
                </Link>
                <button 
                  onClick={fetchTransfers}
                  className="flex-1 sm:flex-none bg-gray-50 text-gray-600 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-semibold border border-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
          <div className="p-0 lg:p-6">
            {error && (
              <div className="m-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Mobile Card View (shown only on small screens) */}
            <div className="lg:hidden space-y-4 p-4 bg-gray-50/50">
              {transfers.length > 0 ? (
                transfers.map((transfer, index) => {
                  const transferId = transfer.id || transfer.ID || transfer.stock_transfer_id || 0;
                  const isExpanded = expandedRows.has(transferId);
                  const isLogsOpen = expandedLogs.has(transferId);
                  
                  return (
                    <div key={transferId} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">#{index + 1} Transfer</span>
                            <h3 className="font-bold text-gray-900 mt-0.5">{transfer.station_from_name}</h3>
                            <div className="flex items-center text-blue-600 font-medium text-xs mt-1">
                              <span>→</span>
                              <span className="ml-1">{transfer.station_to_name}</span>
                            </div>
                          </div>
                          {getStatusBadge(transfer.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 py-3 border-y border-gray-50">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Product</p>
                            <p className="text-sm font-semibold text-gray-800">{transfer.product_name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Quantity</p>
                            <p className="text-sm font-bold text-blue-600">{transfer.transfer_quantity}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1">👤 {transfer.driver_name || transfer.driver_id}</span>
                            <span className="flex items-center gap-1 mt-1">🚚 {transfer.vehicle_no || transfer.vehicle_id}</span>
                          </div>
                          <p className="font-medium">{formatDate(transfer.created_at)}</p>
                        </div>
                        
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={() => {
                              router.push(`/stock-transfers/stock-create-details?id=${transferId}`, { scroll: false });
                            }}
                            className="flex-1 bg-gray-50 hover:bg-blue-50 text-blue-600 font-bold py-2.5 rounded-xl text-xs transition-colors border border-blue-100 flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Details
                          </button>
                          <button
                            onClick={() => toggleTransferLogs(transferId)}
                            className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 ${isLogsOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Logs {isLogsOpen ? '▴' : '▾'}
                          </button>
                        </div>
                      </div>
                      
                      {isLogsOpen && (
                        <div className="bg-gray-50 p-4 border-t border-gray-100 animate-fade-in">
                          <TransferLogs transferId={transferId} />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                   <p className="text-gray-500 font-medium">No transfer records found</p>
                </div>
              )}
            </div>

            {/* Desktop Table View (hidden on small screens) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">#</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Station From</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Station To</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Driver</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vehicle</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logs</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {transfers.length > 0 ? (
                    transfers.map((transfer, index) => {
                      const transferId = transfer.id || transfer.ID || transfer.stock_transfer_id || 0;
                      const isExpanded = expandedRows.has(transferId);
                      return (
                        <React.Fragment key={transferId}>
                          <tr className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-400">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{transfer.station_from_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{transfer.station_to_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{transfer.driver_name || transfer.driver_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{transfer.vehicle_no || transfer.vehicle_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">{transfer.transfer_quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{transfer.product_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(transfer.status)}
                                <button
                                  onClick={() => toggleRow(transferId)}
                                  className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title={isExpanded ? "Hide Details" : "Show Details"}
                                >
                                  <svg 
                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleTransferLogs(transferId)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${expandedLogs.has(transferId) ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-50'}`}
                              >
                                {expandedLogs.has(transferId) ? <BiChevronUp size={16} /> : <BiChevronDown size={16} />}
                                <span>Logs</span>
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${transferId}-expanded`} className="bg-gray-50/50">
                              <td colSpan="9" className="px-8 py-6">
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 grid grid-cols-2 lg:grid-cols-3 gap-8">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created Date</p>
                                    <p className="text-sm font-bold text-gray-800">{formatDate(transfer.created_at)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</p>
                                    <button
                                      onClick={() => router.push(`/stock-transfers/stock-create-details?id=${transferId}`)}
                                      className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-blue-100"
                                    >
                                      {String(transfer.status) === '3' ? (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          <span>Edit Transfer</span>
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          <span>View Details</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          {expandedLogs.has(transferId) && (
                            <tr key={`${transferId}-logs`} className="bg-gray-50/50">
                              <td colSpan="9" className="px-8 pb-6 pt-0">
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                   <TransferLogs transferId={transferId} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-6 py-20 text-center">
                        <div className="text-gray-400">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-xl font-bold text-gray-500">No stock transfers found</p>
                          <p className="mt-2 font-medium">Create a new transfer to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </main>

        {/* Fixed Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function StockTransfersLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="mr-4 p-2 rounded-lg bg-gray-200 animate-pulse">
                <div className="w-6 h-6"></div>
              </div>
              <div>
                <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Floating Action Button Skeleton */}
        <div className="fixed bottom-8 right-8 bg-gray-200 text-gray-200 px-6 py-3 rounded-full shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
          </div>
        </div>

        {/* Content Card Skeleton */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Table Skeleton */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[...Array(10)].map((_, index) => (
                      <th key={index} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {[...Array(10)].map((_, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Alternative simpler loading component
function StockTransfersSimpleLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading stock transfers...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function StockTransfers() {
  return (
    <Suspense fallback={<StockTransfersLoading />}>
      <StockTransfersContent />
    </Suspense>
  );
}
