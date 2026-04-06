'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading component for Suspense fallback
function ActivityLogsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading activity logs...</p>
      </div>
    </div>
  );
}

// Main component that uses useSearchParams
function ActivityLogsContent({ 
  pageName = "", 
  recordType = "filling_request",
  showFilters = true,
  limit = 50 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: parseInt(searchParams.get('page') || '1'),
    totalPages: 1,
    total: 0,
    limit: parseInt(searchParams.get('limit') || limit)
  });
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    handler: searchParams.get('handler') || 'all',
    createdBy: searchParams.get('createdBy') || 'all',
    processedBy: searchParams.get('processedBy') || 'all',
    completedBy: searchParams.get('completedBy') || 'all',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || ''
  });
  const [uniqueHandlers, setUniqueHandlers] = useState([]);
  const [uniqueCreators, setUniqueCreators] = useState([]);
  const [uniqueProcessors, setUniqueProcessors] = useState([]);
  const [uniqueCompleters, setUniqueCompleters] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Update URL when filters or pagination change
  useEffect(() => {
    const params = new URLSearchParams();
    if (pagination.currentPage > 1) params.set('page', pagination.currentPage.toString());
    if (pagination.limit !== limit) params.set('limit', pagination.limit.toString());
    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.handler !== 'all') params.set('handler', filters.handler);
    if (filters.createdBy !== 'all') params.set('createdBy', filters.createdBy);
    if (filters.processedBy !== 'all') params.set('processedBy', filters.processedBy);
    if (filters.completedBy !== 'all') params.set('completedBy', filters.completedBy);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    
    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(url, { scroll: false });
  }, [pagination.currentPage, pagination.limit, filters, router, limit]);

  useEffect(() => {
    fetchActivities();
  }, [pagination.currentPage, pagination.limit, recordType, filters]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        recordType: recordType
      });
      
      // Add filters to API call
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.handler !== 'all') queryParams.append('handler', filters.handler);
      if (filters.createdBy !== 'all') queryParams.append('createdBy', filters.createdBy);
      if (filters.processedBy !== 'all') queryParams.append('processedBy', filters.processedBy);
      if (filters.completedBy !== 'all') queryParams.append('completedBy', filters.completedBy);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      const response = await fetch(`/api/filling-requests/activity-log?${queryParams.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setActivities(result.data);
        setPagination(prev => ({
          ...prev,
          totalPages: result.pagination.totalPages,
          total: result.pagination.total
        }));
        
        // Extract unique values for filters
        const handlers = [...new Set(result.data.map(a => a.currentHandler).filter(Boolean))];
        setUniqueHandlers(handlers);
        const creators = [...new Set(result.data.map(a => a.createdBy).filter(Boolean))];
        setUniqueCreators(creators);
        const processors = [...new Set(result.data.map(a => a.processedBy).filter(Boolean))];
        setUniqueProcessors(processors);
        const completers = [...new Set(result.data.map(a => a.completedBy).filter(Boolean))];
        setUniqueCompleters(completers);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, currentPage: newPage });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on filter change
  };

  const downloadPDF = async () => {
    try {
      setIsDownloading(true);
      const html2pdf = (await import('html2pdf.js')).default;
      
      const pdfContent = document.createElement('div');
      pdfContent.style.padding = '20px';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.style.backgroundColor = 'white';
      
      pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; margin-bottom: 10px;">Activity Logs Report</h1>
          <p style="color: #666;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
          <hr style="margin: 20px 0;" />
        </div>
      `;
      
      if (filters.search || filters.status !== 'all' || filters.handler !== 'all' || 
          filters.createdBy !== 'all' || filters.processedBy !== 'all' || 
          filters.completedBy !== 'all' || filters.dateFrom || filters.dateTo) {
        pdfContent.innerHTML += `
          <div style="margin-bottom: 20px; padding: 10px; background: #f3f4f6; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Filters Applied:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${filters.search ? `<li>Search: ${filters.search}</li>` : ''}
              ${filters.status !== 'all' ? `<li>Status: ${filters.status}</li>` : ''}
              ${filters.handler !== 'all' ? `<li>Handler: ${filters.handler}</li>` : ''}
              ${filters.createdBy !== 'all' ? `<li>Created By: ${filters.createdBy}</li>` : ''}
              ${filters.processedBy !== 'all' ? `<li>Processed By: ${filters.processedBy}</li>` : ''}
              ${filters.completedBy !== 'all' ? `<li>Completed By: ${filters.completedBy}</li>` : ''}
              ${filters.dateFrom ? `<li>Date From: ${filters.dateFrom}</li>` : ''}
              ${filters.dateTo ? `<li>Date To: ${filters.dateTo}</li>` : ''}
            </ul>
          </div>
        `;
      }
      
      let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
              <th style="padding: 10px; text-align: left;">Request ID</th>
              <th style="padding: 10px; text-align: left;">Description</th>
              <th style="padding: 10px; text-align: left;">Status</th>
              <th style="padding: 10px; text-align: left;">Handler</th>
              <th style="padding: 10px; text-align: left;">Created</th>
              <th style="padding: 10px; text-align: left;">Last Updated</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      activities.forEach(activity => {
        tableHTML += `
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 8px;">${activity.requestId}</td>
            <td style="padding: 8px;">${(activity.customerDescription || activity.description || '-').replace('#', '')}</td>
            <td style="padding: 8px;">${activity.status || 'Unknown'}</td>
            <td style="padding: 8px;">${activity.currentHandler || '-'}</td>
            <td style="padding: 8px;">${formatDate(activity.createdAt)}</td>
            <td style="padding: 8px;">${formatDate(activity.updatedDate || activity.lastActionDate)}</td>
          </tr>
        `;
      });
      
      tableHTML += `</tbody></table>`;
      pdfContent.innerHTML += tableHTML;
      
      pdfContent.innerHTML += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 9px; color: #666;">
          <p>Total Records: ${activities.length} | Generated: ${new Date().toLocaleString('en-IN')}</p>
        </div>
      `;
      
      const options = {
        margin: [10, 10, 10, 10],
        filename: `activity-logs-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      await html2pdf().set(options).from(pdfContent).save();
    } catch (error) {
      console.error('PDF Error:', error);
      alert('Failed to generate PDF: ' + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      created: { color: 'from-blue-500 to-blue-600', label: 'Created', icon: '📝', bg: 'bg-blue-50', text: 'text-blue-700' },
      processed: { color: 'from-yellow-500 to-yellow-600', label: 'Processed', icon: '⚙️', bg: 'bg-yellow-50', text: 'text-yellow-700' },
      completed: { color: 'from-green-500 to-green-600', label: 'Completed', icon: '✅', bg: 'bg-green-50', text: 'text-green-700' },
      cancelled: { color: 'from-red-500 to-red-600', label: 'Cancelled', icon: '❌', bg: 'bg-red-50', text: 'text-red-700' },
      unknown: { color: 'from-gray-500 to-gray-600', label: 'Unknown', icon: '❓', bg: 'bg-gray-50', text: 'text-gray-700' }
    };
    const config = statusConfig[status] || statusConfig.unknown;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${config.bg} ${config.text}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAllActivities = (activity) => {
    const activitiesList = [];
    if (activity.createdBy && activity.createdAt) {
      activitiesList.push({
        type: 'create',
        label: 'Created',
        user: activity.createdBy,
        date: activity.createdAt,
        icon: '📝',
        color: 'text-blue-600'
      });
    }
    if (activity.processedBy && activity.processedDate) {
      activitiesList.push({
        type: 'process',
        label: 'Processed',
        user: activity.processedBy,
        date: activity.processedDate,
        icon: '⚙️',
        color: 'text-yellow-600'
      });
    }
    if (activity.completedBy && activity.completedDate) {
      activitiesList.push({
        type: 'complete',
        label: 'Completed',
        user: activity.completedBy,
        date: activity.completedDate,
        icon: '✅',
        color: 'text-green-600'
      });
    }
    if (activity.cancelledBy && activity.cancelledDate) {
      activitiesList.push({
        type: 'cancel',
        label: 'Cancelled',
        user: activity.cancelledBy,
        date: activity.cancelledDate,
        icon: '❌',
        color: 'text-red-600'
      });
    }
    if (activity.updatedBy && activity.updatedDate) {
      const isDuplicate = activitiesList.some(a => 
        a.user === activity.updatedBy && 
        Math.abs(new Date(a.date) - new Date(activity.updatedDate)) < 1000
      );
      if (!isDuplicate) {
        activitiesList.push({
          type: 'update',
          label: 'Updated',
          user: activity.updatedBy,
          date: activity.updatedDate,
          icon: '✏️',
          color: 'text-purple-600'
        });
      }
    }
    return activitiesList;
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <ActivityLogsLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Activities</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchActivities}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    total: pagination.total,
    created: activities.filter(a => a.status === 'created').length,
    processed: activities.filter(a => a.status === 'processed').length,
    completed: activities.filter(a => a.status === 'completed').length,
    cancelled: activities.filter(a => a.status === 'cancelled').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleBack}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Back to Filling Requests</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Activity Logs
          </h1>
          <p className="text-gray-600 mt-1">Track and monitor all system activities</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard title="Total Records" value={stats.total} icon="📊" color="bg-blue-100" />
          <StatCard title="Created" value={stats.created} icon="📝" color="bg-blue-100" />
          <StatCard title="Processed" value={stats.processed} icon="⚙️" color="bg-yellow-100" />
          <StatCard title="Completed" value={stats.completed} icon="✅" color="bg-green-100" />
          <StatCard title="Cancelled" value={stats.cancelled} icon="❌" color="bg-red-100" />
        </div>

        {/* Filters Card */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
              <button
                onClick={downloadPDF}
                disabled={activities.length === 0 || isDownloading}
                className="px-5 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Generating...
                  </>
                ) : (
                  <>📄 Export PDF</>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="🔍 Search by ID or description..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="created">📝 Created</option>
                  <option value="processed">⚙️ Processed</option>
                  <option value="completed">✅ Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Handler</label>
                <select
                  value={filters.handler}
                  onChange={(e) => handleFilterChange('handler', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Handlers</option>
                  {uniqueHandlers.map(handler => (
                    <option key={handler} value={handler}>{handler}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
                <select
                  value={filters.createdBy}
                  onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Creators</option>
                  {uniqueCreators.map(creator => (
                    <option key={creator} value={creator}>{creator}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Processed By</label>
                <select
                  value={filters.processedBy}
                  onChange={(e) => handleFilterChange('processedBy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Processors</option>
                  {uniqueProcessors.map(processor => (
                    <option key={processor} value={processor}>{processor}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Completed By</label>
                <select
                  value={filters.completedBy}
                  onChange={(e) => handleFilterChange('completedBy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Completers</option>
                  {uniqueCompleters.map(completer => (
                    <option key={completer} value={completer}>{completer}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Activities Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Timeline
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-5xl mb-3">📋</span>
                        <p className="text-gray-500 font-medium">No activity logs found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activities.map((activity) => {
                    const allActivities = getAllActivities(activity);
                    const lastUpdate = activity.updatedDate || activity.lastActionDate;
                    const lastUpdater = activity.updatedBy || activity.currentHandler;
                    
                    return (
                      <tr key={activity.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-indigo-600">
                            {activity.requestId}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-800 max-w-md">
                            {(activity.customerDescription || activity.description || '-').replace('#', '')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(activity.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            {allActivities.map((act, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className={act.color}>{act.icon}</span>
                                <span className="font-medium text-gray-700">{act.label}:</span>
                                <span className="text-gray-600">{act.user}</span>
                                <span className="text-gray-400 text-xs">
                                  {formatDate(act.date)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-700 font-medium">
                              {formatDate(lastUpdate)}
                            </div>
                            {lastUpdater && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                by {lastUpdater}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of{' '}
                <span className="font-semibold">{pagination.total}</span> entries
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ← Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);
                    
                    if (endPage - startPage + 1 < maxVisible) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                            pagination.currentPage === i
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Last
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    setPagination({ 
                      ...pagination, 
                      limit: parseInt(e.target.value), 
                      currentPage: 1 
                    });
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ActivityLogs(props) {
  return (
    <Suspense fallback={<ActivityLogsLoading />}>
      <ActivityLogsContent {...props} />
    </Suspense>
  );
}