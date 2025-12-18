'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function CustomerLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [customerInfo, setCustomerInfo] = useState(null);

  useEffect(() => {
    if (customerId) {
      fetchLogs();
      fetchCustomerInfo();
    }
  }, [customerId, filter]);

  const fetchCustomerInfo = async () => {
    try {
      const response = await fetch(`/api/customers/customer-details?id=${customerId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setCustomerInfo(result.data);
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customer-audit-logs?customer_id=${customerId}`);
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
      case 'recharge': return 'bg-green-100 text-green-800 border-green-300';
      case 'payment': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'created': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'updated': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'recharge': return '💰';
      case 'payment': return '💳';
      case 'created': return '➕';
      case 'updated': return '✏️';
      default: return '📝';
    }
  };

  const getActionLabel = (actionType) => {
    switch (actionType) {
      case 'recharge': return 'Recharge';
      case 'payment': return 'Payment';
      case 'created': return 'Created';
      case 'updated': return 'Updated';
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

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  if (!customerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Customer ID is required</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customer Activity Logs</h1>
                {customerInfo && (
                  <p className="text-sm text-gray-600 mt-1">
                    Customer ID: {customerId} | Name: {customerInfo.name || 'N/A'}
                  </p>
                )}
              </div>
            </div>
            <Link
              href={`/customers/client-history?customer_id=${customerId}`}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Back to History
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Buttons */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
            {['all', 'recharge', 'payment', 'created', 'updated'].map((filterType) => (
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
              <p className="mt-4 text-gray-600">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
              <p className="mt-1 text-sm text-gray-500">No activity logs available for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      Amount
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
                          <div className="font-medium">{log.user_name || 'System'}</div>
                          {log.user_id && (
                            <div className="text-xs text-gray-500">ID: {log.user_id}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatCurrency(log.amount)}
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
          )}
        </div>

        {/* Summary Card */}
        {logs.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-800">Total Actions</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{logs.length}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-medium text-green-800">Total Recharge</div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {formatCurrency(logs.filter(l => l.action_type === 'recharge').reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0))}
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-800">Total Payments</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {formatCurrency(logs.filter(l => l.action_type === 'payment').reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0))}
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm font-medium text-yellow-800">Recharge Count</div>
              <div className="text-2xl font-bold text-yellow-900 mt-1">
                {logs.filter(l => l.action_type === 'recharge').length}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomerLogs() {
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
      <CustomerLogsContent />
    </Suspense>
  );
}

