'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import ExportButton from './ExportButton';

/**
 * Reusable Activity Logs Component
 * Can be used on any page to show activity logs specific to that page
 * 
 * @param {string} pageName - Name of the page (e.g., 'Stock Management', 'Customer Management')
 * @param {string} section - Section name (optional, for filtering)
 * @param {string} recordType - Record type (e.g., 'stock', 'customer', 'supplier')
 * @param {number} recordId - Specific record ID to filter (optional)
 * @param {string} uniqueCode - Unique code to filter (optional)
 * @param {boolean} showFilters - Show filter controls (default: true)
 * @param {number} limit - Number of logs per page (default: 50)
 */
export default function ActivityLogs({
  pageName,
  section = null,
  recordType = null,
  recordId = null,
  uniqueCode = null,
  showFilters = true,
  limit = 50
}) {
  const { user } = useSession();
  const isAdmin = user && Number(user.role) === 5;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [availableActions, setAvailableActions] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
    from_date: '',
    to_date: ''
  });
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters, pageName, section, recordType, recordId, uniqueCode]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      
      // Always filter by page name
      if (pageName) {
        params.append('page', pageName);
      }
      
      // Filter by section if provided
      if (section) {
        params.append('section', section);
      }
      
      // Filter by record type if provided
      if (recordType) {
        params.append('record_type', recordType);
      }
      
      // Filter by record ID if provided
      if (recordId) {
        params.append('record_id', recordId.toString());
      }
      
      // Filter by unique code if provided
      if (uniqueCode) {
        params.append('unique_code', uniqueCode);
      }
      
      // Additional filters
      if (filters.action) {
        params.append('action', filters.action);
      }
      if (filters.user_id) {
        params.append('user_id', filters.user_id);
      }
      if (filters.from_date) {
        params.append('from_date', filters.from_date);
      }
      if (filters.to_date) {
        params.append('to_date', filters.to_date);
      }
      
      params.append('limit', limit.toString());
      params.append('offset', ((currentPage - 1) * limit).toString());
      
      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        const logsData = result.data || [];
        setLogs(logsData);
        setTotal(result.total || 0);
        setHasMore(result.hasMore || false);
        
        // Extract unique actions from logs
        const uniqueActions = [...new Set(logsData.map(log => log.action).filter(Boolean))].sort();
        setAvailableActions(uniqueActions);
      } else {
        setError(result.error || 'Failed to fetch activity logs');
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err.message || 'Error fetching activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      user_id: '',
      from_date: '',
      to_date: ''
    });
    setCurrentPage(1);
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const time = timeStr || '00:00:00';
    return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${time}`;
  };

  const formatValue = (value) => {
    if (!value && value !== 0) return 'N/A';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    // Format role numbers to role names
    const roleNames = {
      1: 'Staff',
      2: 'Incharge',
      3: 'Team Leader',
      4: 'Accountant',
      5: 'Admin',
      6: 'Driver'
    };
    if (typeof value === 'number' && roleNames[value]) {
      return `${roleNames[value]} (${value})`;
    }
    return String(value);
  };

  const getActionColor = (action) => {
    const colors = {
      'create': 'bg-blue-100 text-blue-800 border-blue-200',
      'add': 'bg-green-100 text-green-800 border-green-200',
      'edit': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'delete': 'bg-red-100 text-red-800 border-red-200',
      'approve': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'reject': 'bg-rose-100 text-rose-800 border-rose-200',
      'update': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[action?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getActionIcon = (action) => {
    const icons = {
      'create': '➕',
      'add': '➕',
      'edit': '✏️',
      'delete': '🗑️',
      'approve': '✅',
      'reject': '❌',
      'update': '🔄'
    };
    return icons[action?.toLowerCase()] || '📝';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Activity Logs
          {pageName && <span className="text-sm font-normal text-gray-500 ml-2">({pageName})</span>}
        </h2>
        <ExportButton 
          data={logs} 
          fileName={`activity_logs_${pageName || 'all'}`} 
          columns={[
            { header: 'Date', key: 'action_date' },
            { header: 'Time', key: 'action_time' },
            { header: 'Section', key: 'section' },
            { header: 'Unique Code', key: 'unique_code' },
            { header: 'Action', key: 'action' },
            { header: 'User', key: 'user_name' },
            { header: 'Field', key: 'field_name' },
            { header: 'Old Value', key: 'old_value' },
            { header: 'New Value', key: 'new_value' },
            { header: 'Remarks', key: 'remarks' }
          ]}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Actions</option>
                {availableActions.length > 0 ? (
                  availableActions.map(action => (
                    <option key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="create">Create</option>
                    <option value="add">Add</option>
                    <option value="edit">Edit</option>
                    <option value="delete">Delete</option>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                    <option value="update">Update</option>
                  </>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <input
                type="number"
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                placeholder="Filter by user ID"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-600">
        Showing {logs.length} of {total} logs
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8">
            <div className="space-y-3">
              <div className="h-6 w-40 bg-gray-200 rounded"></div>
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No activity logs found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value Change</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(log.action_date, log.action_time)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {log.section || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                    {log.unique_code || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : 'N/A')}
                    {log.user_id && (
                      <span className="text-gray-500 ml-1">(ID: {log.user_id})</span>
                    )}
                    {/* Only show role for admin users */}
                    {isAdmin && log.creator_info?.role_name && (
                      <span className="text-gray-500 ml-1">- {log.creator_info.role_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                      <span className="mr-1">{getActionIcon(log.action)}</span>
                      {log.action || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                    {log.old_value || log.new_value ? (
                      <div className="text-xs">
                        {log.field_name && (
                          <div className="font-medium text-gray-700 mb-1">{log.field_name}:</div>
                        )}
                        <div className="text-gray-600 space-y-1">
                          {typeof log.old_value === 'object' && typeof log.new_value === 'object' ? (
                            // Object comparison - show key-value changes
                            Object.keys({...log.old_value, ...log.new_value}).map(key => {
                              const oldVal = log.old_value?.[key];
                              const newVal = log.new_value?.[key];
                              // Skip internal fields like created_by_employee_id, edited_by_employee_id, etc.
                              if (key.includes('created_by') || key.includes('edited_by') || key === 'employee_id') {
                                return null;
                              }
                              if (oldVal !== newVal) {
                                return (
                                  <div key={key} className="border-l-2 border-gray-300 pl-2">
                                    <span className="font-medium text-gray-700">{key}:</span>{' '}
                                    <span className="line-through text-red-600">{formatValue(oldVal)}</span>
                                    {' → '}
                                    <span className="text-green-600 font-semibold">{formatValue(newVal)}</span>
                                  </div>
                                );
                              }
                              return null;
                            }).filter(Boolean)
                          ) : (
                            // Simple value comparison
                            <>
                              <span className="line-through text-red-600">{formatValue(log.old_value)}</span>
                              {' → '}
                              <span className="text-green-600 font-semibold">{formatValue(log.new_value)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                    <div className="space-y-1">
                      {log.remarks && (
                        <div className="italic">{log.remarks}</div>
                      )}
                      {log.record_type && (
                        <div className="text-xs text-gray-500">
                          Type: <span className="font-medium">{log.record_type}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && logs.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {Math.ceil(total / limit)}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!hasMore}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

