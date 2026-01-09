// src/app/stock/purchase-for-use-history/PurchaseTable.jsx
'use client';

import Footer from '@/components/Footer';
import Sidebar from '@/components/sidebar';
import Header from "components/Header";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PurchaseForUseHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setError(null);
        setLoading(true);
        
        let res;
        try {
          res = await fetch('/api/purchase-for-use-history', { cache: 'no-store' });
        } catch (networkErr) {
          throw new Error('Failed to fetch purchase history (primary).');
        }
        
        if (!res.ok) {
          throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('API Data:', data);

        if (data && data.success && Array.isArray(data.data)) {
          setHistoryData(data.data);
        } else if (data && Array.isArray(data)) {
          setHistoryData(data);
        } else {
          // Fallback to alternate endpoint
          try {
            const altRes = await fetch('/api/purchases-for-use', { cache: 'no-store' });
            if (!altRes.ok) {
              throw new Error(`Fallback failed: ${altRes.status} ${altRes.statusText}`);
            }
            const altData = await altRes.json();
            if (altData && altData.success && Array.isArray(altData.data)) {
              setHistoryData(altData.data);
            } else if (Array.isArray(altData)) {
              setHistoryData(altData);
            } else {
              throw new Error('Invalid data format from fallback API');
            }
          } catch (fbErr) {
            throw new Error('Failed to fetch purchase history (fallback).');
          }
        }
      } catch (error) {
        console.error('Error fetching purchase history:', error);
        setError(error.message);
        setHistoryData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handlePurchaseClick = () => {
    router.push('/stock/purchases-for-use');
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US');
    } catch {
      return 'Invalid Date';
    }
  };

  // Format currency in INR
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(Number(amount));
  };

  // Generate key for list items
  const generateKey = (item, index) => {
    return item.id ? `purchase-${item.id}` : `purchase-${index}-${Date.now()}`;
  };

  // Toggle row expansion
  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Format date time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Purchase for Use History
              </h1>
              <p className="text-gray-600 text-sm">
                Manage and view your purchase transactions
              </p>
            </div>

            <button
              onClick={handlePurchaseClick}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition flex items-center gap-2 mt-4 md:mt-0"
            >
              <span>+</span>
              Purchase for use
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">⚠</span>
                  <div>
                    <h3 className="text-red-800 font-medium">Error</h3>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </div>
                <button
                  onClick={handleRetry}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading purchases...</span>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            historyData.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchases Found</h3>
                <p className="text-gray-500 mb-6">Get started by creating your first purchase record.</p>
                <button
                  onClick={handlePurchaseClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg"
                >
                  Create First Purchase
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Table Header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Purchase Records ({historyData.length})
                  </h2>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Station
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {historyData.map((item, index) => (
                        <>
                          <tr key={generateKey(item, index)} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm font-medium text-gray-900">
                              #{item.id || 'N/A'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {item.supplier_name || 'N/A'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {item.product_name || 'N/A'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {item.station_name || 'N/A'}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-gray-900">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {item.quantity || 0} Kg
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {formatDate(item.invoice_date)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {formatDate(item.created_at)}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <button
                                onClick={() => toggleRow(item.id)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {expandedRows.has(item.id) ? 'Hide Logs' : 'Show Logs'}
                              </button>
                            </td>
                          </tr>
                          {expandedRows.has(item.id) && item.audit_logs && item.audit_logs.length > 0 && (
                            <tr>
                              <td colSpan="9" className="px-4 py-4 bg-gray-50">
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-gray-700 mb-2">
                                    Activity Logs ({item.audit_logs.length})
                                  </div>
                                  {item.audit_logs.map((log, logIndex) => (
                                    <div key={logIndex} className="bg-white border border-gray-200 rounded p-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                        <div className="text-xs font-semibold text-gray-800">
                                          Created By: {log.user_name}
                                          {log.employee_code && (
                                            <span className="text-gray-600 ml-1">({log.employee_code})</span>
                                          )}
                                          {log.user_id && (
                                            <span className="text-gray-500 ml-1">[ID: {log.user_id}]</span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {formatDateTime(log.created_at)}
                                        </div>
                                      </div>
                                      {log.remarks && (
                                        <div className="text-xs text-gray-700 mt-1">
                                          {log.remarks}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {historyData.map((item, index) => (
                    <div key={generateKey(item, index)} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="text-sm font-semibold text-gray-900">
                            #{item.id || 'N/A'}
                          </div>
                          <button
                            onClick={() => toggleRow(item.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            {expandedRows.has(item.id) ? 'Hide Logs' : 'Show Logs'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Supplier:</span>
                            <span className="ml-1 text-gray-900 font-medium">{item.supplier_name || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Product:</span>
                            <span className="ml-1 text-gray-900 font-medium">{item.product_name || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Station:</span>
                            <span className="ml-1 text-gray-900 font-medium">{item.station_name || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Amount:</span>
                            <span className="ml-1 text-gray-900 font-medium">{formatCurrency(item.amount)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.quantity || 0} Kg
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Invoice Date:</span>
                            <span className="ml-1 text-gray-900">{formatDate(item.invoice_date)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Created:</span>
                            <span className="ml-1 text-gray-900">{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                        {expandedRows.has(item.id) && item.audit_logs && item.audit_logs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs font-semibold text-gray-700 mb-2">
                              Activity Logs ({item.audit_logs.length})
                            </div>
                            <div className="space-y-2">
                              {item.audit_logs.map((log, logIndex) => (
                                <div key={logIndex} className="bg-gray-50 border border-gray-200 rounded p-2">
                                  <div className="text-xs font-semibold text-gray-800 mb-1">
                                    Created By: {log.user_name}
                                    {log.employee_code && (
                                      <span className="text-gray-600 ml-1">({log.employee_code})</span>
                                    )}
                                    {log.user_id && (
                                      <span className="text-gray-500 ml-1">[ID: {log.user_id}]</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 mb-1">
                                    {formatDateTime(log.created_at)}
                                  </div>
                                  {log.remarks && (
                                    <div className="text-xs text-gray-700">
                                      {log.remarks}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
