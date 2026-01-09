'use client';

/**
 * Reusable AuditLogs Component
 * Displays audit logs similar to filling requests page
 */
export default function AuditLogs({ logs, title = "Activity Logs", recordType = "record" }) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return null;
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const parseValue = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="text-xs font-medium text-gray-500 mb-2">
        {title} ({logs.length} {logs.length === 1 ? 'entry' : 'entries'})
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {logs.map((log, index) => {
          const userName = log.user_name || log.employee_name || (log.user_id ? `Employee ID: ${log.user_id}` : 'System');
          const employeeCode = log.employee_code || null;
          const action = log.action || 'unknown';
          const remarks = log.remarks || '';
          
          // Parse old and new values
          const oldValue = parseValue(log.old_value);
          const newValue = parseValue(log.new_value);
          
          // Check if this is a different employee from previous log
          const prevLog = index > 0 ? logs[index - 1] : null;
          const prevEmployeeId = prevLog?.user_id || null;
          const currentEmployeeId = log.user_id || null;
          const isDifferentEmployee = prevLog && prevEmployeeId !== currentEmployeeId && prevEmployeeId && currentEmployeeId;

          // Determine action icon and color
          let actionIcon = '📝';
          let bgColor = 'bg-blue-50';
          let borderColor = 'border-blue-200';
          let borderColorStrong = 'border-blue-400';
          let textColor = 'text-blue-800';
          let textColorLight = 'text-blue-700';
          let badgeBg = 'bg-blue-200';
          
          if (action === 'add' || action === 'create') {
            actionIcon = '➕';
            bgColor = 'bg-green-50';
            borderColor = 'border-green-200';
            borderColorStrong = 'border-green-400';
            textColor = 'text-green-800';
            textColorLight = 'text-green-700';
            badgeBg = 'bg-green-200';
          } else if (action === 'edit' || action === 'update') {
            actionIcon = '✏️';
            bgColor = 'bg-purple-50';
            borderColor = 'border-purple-200';
            borderColorStrong = 'border-purple-400';
            textColor = 'text-purple-800';
            textColorLight = 'text-purple-700';
            badgeBg = 'bg-purple-200';
          } else if (action === 'delete') {
            actionIcon = '🗑️';
            bgColor = 'bg-red-50';
            borderColor = 'border-red-200';
            borderColorStrong = 'border-red-400';
            textColor = 'text-red-800';
            textColorLight = 'text-red-700';
            badgeBg = 'bg-red-200';
          }

          return (
            <div 
              key={log.id || index} 
              className={`${bgColor} border rounded p-2 ${
                isDifferentEmployee ? `${borderColorStrong} border-l-4` : borderColor
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={`text-xs font-semibold ${textColor}`}>
                  {actionIcon} {action.charAt(0).toUpperCase() + action.slice(1)} #{logs.length - index}: {userName}
                  {employeeCode && (
                    <span className="text-gray-600 ml-1">({employeeCode})</span>
                  )}
                  {log.user_id && (
                    <span className="text-gray-500 ml-1">[ID: {log.user_id}]</span>
                  )}
                  {isDifferentEmployee && (
                    <span className={`ml-2 text-xs ${badgeBg} ${textColor} px-1.5 py-0.5 rounded`}>
                      Different Employee
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  {formatDateTime(log.created_at || log.action_date)}
                </div>
              </div>
              
              {/* Show remarks */}
              {remarks && (
                <div className={`text-xs ${textColorLight} mt-1`}>
                  {remarks}
                </div>
              )}
              
              {/* Show old/new value changes if available */}
              {(oldValue || newValue) && (
                <div className={`text-xs ${textColorLight} space-y-1 mt-1`}>
                  {oldValue && typeof oldValue === 'object' && (
                    <div className="text-gray-600">
                      <span className="font-medium">Before:</span> {JSON.stringify(oldValue, null, 2).substring(0, 100)}
                    </div>
                  )}
                  {newValue && typeof newValue === 'object' && (
                    <div className="text-gray-600">
                      <span className="font-medium">After:</span> {JSON.stringify(newValue, null, 2).substring(0, 100)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

