'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function StockLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stockId = searchParams.get('stock_id');
  const stationId = searchParams.get('station_id');
  const productId = searchParams.get('product_id');
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (stockId || stationId) {
      fetchLogs();
    }
  }, [stockId, stationId, productId, filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = '/api/stock-audit-logs?';
      if (stockId) {
        url += `stock_id=${stockId}`;
      } else if (stationId && productId) {
        url += `station_id=${stationId}&product_id=${productId}`;
      } else {
        url += `station_id=${stationId}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        let filteredLogs = result.data || [];
        if (filter !== 'all') {
          filteredLogs = filteredLogs.filter(log => log.action_type === filter);
        }
        setLogs(filteredLogs);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'added': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'transferred': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'updated': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'added': return '➕';
      case 'transferred': return '🔄';
      case 'updated': return '✏️';
      default: return '📝';
    }
  };

  const getActionLabel = (actionType) => {
    switch (actionType) {
      case 'added': return 'Stock Added';
      case 'transferred': return 'Stock Transferred';
      case 'updated': return 'Stock Updated';
      default: return actionType;
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!stockId && !stationId) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div className="text-center bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
              <p className="text-gray-600 mb-4 text-sm sm:text-base">Stock ID or Station ID is required</p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm sm:text-base flex items-center gap-2"
              >
                <span className="text-lg">←</span>
                <span>Go Back</span>
              </button>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <Header />
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto">
          {/* Page Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-3">
                <div className="flex items-center">
                  <button
                    onClick={() => router.back()}
                    className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Stock Activity Logs</h1>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {stockId ? `Stock ID: ${stockId}` : `Station ID: ${stationId}${productId ? ` | Product ID: ${productId}` : ''}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      const csvContent = [
                        ['Date & Time', 'Action', 'User', 'Quantity', 'Remarks'],
                        ...logs.map(log => [
                          new Date(log.created_at).toLocaleString(),
                          log.action_type,
                          log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : 'N/A'),
                          log.quantity || '',
                          log.remarks || ''
                        ])
                      ].map(row => row.join(',')).join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `stock_logs_${stockId || stationId || 'all'}.csv`;
                      a.click();
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm sm:text-base text-center"
                  >
                    Export CSV
                  </button>
                  <Link
                    href={`/stock-history`}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm sm:text-base text-center"
                  >
                    Back to History
                  </Link>
                </div>
          </div>
        </div>
      </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Filter Buttons */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
            {['all', 'added', 'transferred', 'updated'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)} ({filterType === 'all' ? logs.length : logs.filter(l => l.action_type === filterType).length})
              </button>
            ))}
          </div>
        </div>

          {/* Logs List */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
                <p className="mt-1 text-sm text-gray-500">No activity logs available for this stock.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log, index) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action_type)}`}>
                          <span className="mr-2">{getActionIcon(log.action_type)}</span>
                          {getActionLabel(log.action_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : 'N/A')}</div>
                          {log.user_id && (
                            <div className="text-xs text-gray-500">ID: {log.user_id}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.quantity ? `${log.quantity}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-md">
                          {log.remarks ? (
                            <p className="text-gray-900">{log.remarks}</p>
                          ) : (
                            <span className="text-gray-400 italic">No remarks</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {logs.map((log, index) => (
                    <div key={log.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action_type)}`}>
                              <span className="mr-1">{getActionIcon(log.action_type)}</span>
                              {getActionLabel(log.action_type)}
                            </span>
                            <span className="text-xs text-gray-500">#{index + 1}</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900">
                              {log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : 'N/A')}
                            </p>
                            {log.user_id && (
                              <p className="text-xs text-gray-500">ID: {log.user_id}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                          <p className="text-xs font-medium text-gray-900">{formatDateTime(log.created_at)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100">
                        <div>
                          <span className="text-gray-600 text-xs">Quantity:</span>
                          <p className="font-medium">{log.quantity || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 text-xs">Remarks:</span>
                          <p className="text-gray-900 text-sm">{log.remarks || <span className="text-gray-400 italic">No remarks</span>}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        </main>

        {/* Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function StockLogs() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <StockLogsContent />
    </Suspense>
  );
}

