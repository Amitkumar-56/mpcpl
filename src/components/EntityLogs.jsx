// src/components/EntityLogs.jsx - Reusable component to display entity logs
'use client';

import { useEffect, useState } from 'react';

export default function EntityLogs({ entityType, entityId }) {
  const [logs, setLogs] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (entityType && entityId) {
      fetchLogs();
    }
  }, [entityType, entityId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/entity-logs?entity_type=${entityType}&entity_id=${entityId}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.logs[0] || null);
        setAuditLogs(result.audit_logs || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!logs && auditLogs.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-500">No activity logs found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Entity Logs (Created/Updated/Processed/Completed) */}
      {logs && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity Logs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Created By */}
            {logs.created_by_name && logs.created_by_name !== 'System' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-blue-900">Created By</span>
                </div>
                <p className="text-sm text-gray-700 font-medium">{logs.created_by_name}</p>
                {logs.created_date_formatted && (
                  <p className="text-xs text-gray-500 mt-1">{logs.created_date_formatted}</p>
                )}
              </div>
            )}

            {/* Updated By */}
            {logs.updated_by_name && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  <span className="text-xs font-semibold text-purple-900">Last Updated By</span>
                </div>
                <p className="text-sm text-gray-700 font-medium">{logs.updated_by_name}</p>
                {logs.updated_date_formatted && (
                  <p className="text-xs text-gray-500 mt-1">{logs.updated_date_formatted}</p>
                )}
              </div>
            )}

            {/* Processed By */}
            {logs.processed_by_name && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <svg className="w-4 h-4 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-yellow-900">Processed By</span>
                </div>
                <p className="text-sm text-gray-700 font-medium">{logs.processed_by_name}</p>
                {logs.processed_date_formatted && (
                  <p className="text-xs text-gray-500 mt-1">{logs.processed_date_formatted}</p>
                )}
              </div>
            )}

            {/* Completed By */}
            {logs.completed_by_name && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-green-900">Completed By</span>
                </div>
                <p className="text-sm text-gray-700 font-medium">{logs.completed_by_name}</p>
                {logs.completed_date_formatted && (
                  <p className="text-xs text-gray-500 mt-1">{logs.completed_date_formatted}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Logs (Detailed History) */}
      {auditLogs.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Change History</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">
                    {log.action === 'create' && '🆕 Created'}
                    {log.action === 'edit' && '✏️ Updated'}
                    {log.action === 'delete' && '🗑️ Deleted'}
                    {!['create', 'edit', 'delete'].includes(log.action) && `📝 ${log.action}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">
                  <span className="font-medium">By:</span> {log.user_name || 'Unknown'}
                </p>
                {log.remarks && (
                  <p className="text-xs text-gray-600 mb-1">{log.remarks}</p>
                )}
                {log.old_value && log.new_value && (
                  <div className="text-xs text-gray-500 mt-2 p-2 bg-white rounded border">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <span className="font-medium text-red-600">Before:</span>
                        <pre className="whitespace-pre-wrap text-xs mt-1">
                          {typeof log.old_value === 'string' 
                            ? log.old_value 
                            : JSON.stringify(log.old_value, null, 2)}
                        </pre>
                      </div>
                      <div className="mx-2 text-gray-300">→</div>
                      <div className="flex-1">
                        <span className="font-medium text-green-600">After:</span>
                        <pre className="whitespace-pre-wrap text-xs mt-1">
                          {typeof log.new_value === 'string' 
                            ? log.new_value 
                            : JSON.stringify(log.new_value, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

