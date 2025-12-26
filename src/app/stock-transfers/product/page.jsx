"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/sidebar";

function ProductTransfersContent() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [historyData, setHistoryData] = useState({}); // Store history for each transfer
  const router = useRouter();

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stock-transfers-product");
      const data = await response.json();
      
      if (response.ok) {
        setTransfers(data.transfers || []);
      } else {
        setError(data.error || "Failed to fetch transfers");
      }
    } catch (err) {
      console.error("Error fetching transfers:", err);
      setError("Failed to fetch product transfers");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { color: "bg-yellow-100 text-yellow-800", text: "Pending" },
      in_transit: { color: "bg-blue-100 text-blue-800", text: "In Transit" },
      completed: { color: "bg-green-100 text-green-800", text: "Completed" }
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const toggleRow = async (transferId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(transferId)) {
      newExpanded.delete(transferId);
    } else {
      newExpanded.add(transferId);
      // Fetch history if not already loaded
      if (!historyData[transferId]) {
        await fetchHistory(transferId);
      }
    }
    setExpandedRows(newExpanded);
  };

  const fetchHistory = async (transferId) => {
    try {
      const response = await fetch(`/api/stock-transfers-product/history?id=${transferId}`);
      const data = await response.json();
      
      if (response.ok) {
        setHistoryData(prev => ({
          ...prev,
          [transferId]: data.history || []
        }));
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product transfers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar activePage="Stock Transfers" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="pt-16 lg:pt-20 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/stock-transfers/product/create"
            className="fixed bottom-8 right-8 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2 z-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Product Transfer</span>
          </Link>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Product Transfers</h2>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Station</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Station</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transfers.length > 0 ? (
                      transfers.map((transfer, index) => {
                        const transferId = transfer.id;
                        const isExpanded = expandedRows.has(transferId);
                        const history = historyData[transferId] || [];
                        
                        return (
                          <React.Fragment key={transferId}>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.station_from_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.station_to_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.product_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transfer.transfer_quantity}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {getStatusBadge(transfer.status)}
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      toggleRow(transferId);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    title={isExpanded ? "Hide History" : "Show History"}
                                  >
                                    <svg 
                                      className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(transfer.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Link
                                  href={`/stock-transfers/product/edit?id=${transfer.id}`}
                                  className="text-blue-600 hover:text-blue-900 mr-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Edit
                                </Link>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gray-50">
                                <td colSpan="8" className="px-6 py-4">
                                  <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Transfer History & Logs</h3>
                                    {history.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                          <thead className="bg-gray-100">
                                            <tr>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Station</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Product</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Quantity</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Current Stock</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Available Stock</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Created By</th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {history.map((item, idx) => (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                  {formatDate(item.filling_date || item.created_at)}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    item.trans_type === 'Inward' 
                                                      ? 'bg-green-100 text-green-800' 
                                                      : 'bg-red-100 text-red-800'
                                                  }`}>
                                                    {item.trans_type || 'N/A'}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                  {item.station_name || `Station ${item.fs_id}`}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                  {item.product_name || `Product ${item.product_id}`}
                                                </td>
                                                <td className={`px-4 py-2 whitespace-nowrap text-xs font-medium ${
                                                  (item.filling_qty || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                  {item.filling_qty > 0 ? '+' : ''}{item.filling_qty || 0}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                  {item.current_stock || 0}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                  {item.available_stock || 0}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                                  {item.created_by_name || 'System'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-center py-4 text-sm text-gray-500">
                                        No history found for this transfer
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                          No product transfers found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function ProductTransfers() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductTransfersContent />
    </Suspense>
  );
}

