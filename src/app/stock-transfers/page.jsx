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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="flex-shrink-0">
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
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
          <Link
            href="/stock-transfers/product"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Product Transfers</span>
          </Link>
          <Link
            href="/stock-transfers/create"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Stock Transfer</span>
          </Link>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Stock Transfer Details</h2>
              <button 
                onClick={fetchTransfers}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logs</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transfers.length > 0 ? (
                    transfers.map((transfer, index) => {
                      // Ensure we get the correct ID field
                      const transferId = transfer.id || transfer.ID || transfer.stock_transfer_id || 0;
                      const isExpanded = expandedRows.has(transferId);
                      return (
                        <React.Fragment key={transferId}>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.station_from_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.station_to_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.driver_name || transfer.driver_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.vehicle_no || transfer.vehicle_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{transfer.transfer_quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.product_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(transfer.status)}
                                <button
                                  onClick={() => toggleRow(transferId)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  title={isExpanded ? "Hide Details" : "Show Details"}
                                >
                                  <svg 
                                    className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-45' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleTransferLogs(transferId)}
                                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                                title="View Activity Logs"
                              >
                                {expandedLogs.has(transferId) ? (
                                  <>
                                    <BiChevronUp size={18} />
                                    <span className="ml-1 text-xs">Hide</span>
                                  </>
                                ) : (
                                  <>
                                    <BiChevronDown size={18} />
                                    <span className="ml-1 text-xs">Logs</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${transferId}-expanded`} className="bg-gray-50">
                              <td colSpan="9" className="px-6 py-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-700">Created Date:</span>
                                    <span className="ml-2 text-gray-900">{formatDate(transfer.created_at)}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Action:</span>
                                    <span className="ml-2">
                                      <button
                                        onClick={() => {
                                          console.log('View Details clicked for transfer:', transfer, 'ID:', transferId);
                                          // Update URL with query parameter
                                          router.push(`/stock-transfers/stock-create-details?id=${transferId}`, { scroll: false });
                                          // Expand the row
                                          setExpandedRows(prev => new Set([...prev, transferId]));
                                        }}
                                        className="text-blue-600 hover:text-blue-900 transition-colors inline-flex items-center"
                                        title="View Details"
                                      >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="ml-1">View Details</span>
                                      </button>
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-lg font-medium">No stock transfer records found</p>
                          <p className="mt-2">Create your first stock transfer to get started.</p>
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