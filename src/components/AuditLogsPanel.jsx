'use client';

import { useEffect, useState } from 'react';

export default function AuditLogsPanel({ recordId, recordType, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'created', 'edited', 'approved', 'rejected'

  useEffect(() => {
    if (recordId) {
      fetchLogs();
    }
  }, [recordId, recordType]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/${recordType}-audit-logs?${recordType}_id=${recordId}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.action_type === filter);

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'created': return 'bg-blue-100 text-blue-800';
      case 'edited': return 'bg-yellow-100 text-yellow-800';
      case 'approve': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'created': return '➕';
      case 'edited': return '✏️';
      case 'approve': return '✅';
      case 'rejected': return '❌';
      default: return '📝';
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
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Activity Logs</h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {['all', 'created', 'edited', 'approve', 'rejected'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getActionIcon(log.action_type)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action_type)}`}>
                      {log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900">
                    {log.user_name || 'System'}
                  </p>
                  {log.remarks && (
                    <p className="text-xs text-gray-600 mt-1 italic">
                      "{log.remarks}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

