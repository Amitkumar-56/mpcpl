'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import React from 'react';
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

// Component to fetch and display deepo logs
function DeepoLogs({ deepoId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!deepoId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/audit-logs?record_type=deepo&record_id=${deepoId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
          // API returns data array
          setLogs(result.data || []);
        } else {
          setError(result.error || 'Failed to load logs');
        }
      } catch (error) {
        console.error('Error fetching deepo logs:', error);
        setError('Failed to load logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [deepoId]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-4">Loading logs...</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-4 bg-red-50 rounded border border-red-200">
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-white rounded border">
        No activity logs found for this deepo.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log, idx) => (
        <div key={idx} className="bg-white rounded border p-2 sm:p-3 text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-700">{log.action || 'Action'}:</span>
              <span className="ml-1 sm:ml-2 text-gray-900 break-words">{log.user_name || log.user_display_name || log.userName || (log.user_id ? `Employee ID: ${log.user_id}` : 'Unknown User')}</span>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : ''}
            </span>
          </div>
          {log.remarks && (
            <p className="text-xs text-gray-600 mt-1 sm:mt-2 break-words">{log.remarks}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Main component content
function DeepoHistoryContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [deepos, setDeepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [permissions, setPermissions] = useState({
    can_edit: false,
    can_view: false,
    can_delete: false
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedDeepos, setExpandedDeepos] = useState({});
  
  const toggleDeepoLogs = (deepoId) => {
    setExpandedDeepos(prev => ({
      ...prev,
      [deepoId]: !prev[deepoId]
    }));
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;
    
    // Admin (role 5) has full access
    if (user.role === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true });
      fetchDeepoHistory();
      return;
    }

    // ✅ FIX: Check user's cached permissions from verify API first
    if (user.permissions && user.permissions['Deepo History']) {
      const deepoPerms = user.permissions['Deepo History'];
      if (deepoPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: deepoPerms.can_view,
          can_edit: deepoPerms.can_edit,
          can_delete: deepoPerms.can_delete
        });
        fetchDeepoHistory();
        return;
      }
    }
    
    // ✅ FIX: Use exact module name as stored in database: "Deepo History"
    const moduleName = 'Deepo History';
    
    // Check cache first
    const cacheKey = `perms_${user.id}_Deepo History`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchDeepoHistory();
        return;
      }
    }
    
    try {
      console.log('🔐 Checking permissions for:', { employee_id: user.id, role: user.role, module: moduleName });
      
      // Fetch all permissions in parallel (optimized - no redundant calls)
      const [viewRes, editRes, deleteRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`)
      ]);
      
      const [viewData, editData, deleteData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        deleteRes.json()
      ]);
      
      console.log('🔐 Permission check results:', {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed,
        errors: { view: viewData.error, edit: editData.error, delete: deleteData.error }
      });
      
      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed
      };
      
      // Cache permissions for 5 minutes
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        fetchDeepoHistory();
      } else {
        setHasPermission(false);
        setLoading(false);
        console.log('❌ Access denied - No permission for Deepo History module');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      if (error.name === 'AbortError') {
        console.warn('Permission check timeout, using cached permissions if available');
        // Try to use cached permissions on timeout
        const cacheKey = `perms_${user.id}_Deepo History`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedPerms = JSON.parse(cached);
            if (cachedPerms.can_view) {
              setHasPermission(true);
              setPermissions(cachedPerms);
              fetchDeepoHistory();
              return;
            }
          } catch (e) {
            // Invalid cache
          }
        }
      }
      setHasPermission(false);
      setLoading(false);
    }
  };

  const fetchDeepoHistory = async () => {
    try {
      setLoading(true);
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/deepo-history', {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      const result = await response.json();

      if (result.success) {
        setDeepos(result.data || []);
      } else {
        showMessage(result.message || 'Failed to fetch deepo history', 'error');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        showMessage('Request timeout. Please try again.', 'error');
      } else {
        showMessage('Error fetching deepo history', 'error');
        console.error('Error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deepoId) => {
    if (!confirm('Are you sure you want to approve this deepo?')) {
      return;
    }

    try {
      const response = await fetch('/api/deepo-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: deepoId,
          action: 'approve'
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Deepo approved successfully!', 'success');
        // Refresh the list
        fetchDeepoHistory();
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error approving deepo', 'error');
      console.error('Error:', error);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '0000-00-00') return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    return new Date(dateTimeString).toLocaleString();
  };

  const handleDownloadPDF = async (deepoId) => {
    try {
      window.open(`/approve-deepo?id=${deepoId}`, '_blank');
    } catch (error) {
      showMessage('Error opening PDF', 'error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deepo history...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
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
                className="mr-4 text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Deepo History</h1>
            </div>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <Link href="/" className="text-gray-500 hover:text-gray-700">
                    Home
                  </Link>
                </li>
                <li>
                  <span className="text-gray-400">/</span>
                </li>
                <li>
                  <span className="text-gray-500">Deepo History</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            messageType === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            <div className="flex justify-between items-center">
              <span>{message}</span>
              <button
                onClick={() => setMessage('')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Create Button */}
        {permissions.can_edit && (
          <div className="mb-6 flex justify-end">
            <Link
              href="/deepo-list"
              className="fixed bottom-8 right-8 z-10 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Deepo Detail</span>
            </Link>
          </div>
        )}

        {/* Deepo Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Licence Plate
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    First Driver
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    First Mobile
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Start Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Opening Station
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    Diesel LTR
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closing Station
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expand
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Logs
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deepos.map((deepo) => (
                  <React.Fragment key={deepo.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {deepo.id}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {deepo.licence_plate}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {deepo.first_driver}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {deepo.first_mobile}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {formatDate(deepo.first_start_date)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {deepo.opening_station}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                        {deepo.diesel_ltr}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {deepo.closing_station}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedRows);
                            if (newExpanded.has(deepo.id)) {
                              newExpanded.delete(deepo.id);
                            } else {
                              newExpanded.add(deepo.id);
                            }
                            setExpandedRows(newExpanded);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title={expandedRows.has(deepo.id) ? "Collapse" : "Expand"}
                        >
                          {expandedRows.has(deepo.id) ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleDeepoLogs(deepo.id)}
                          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm"
                          title="View Activity Logs"
                        >
                          {expandedDeepos[deepo.id] ? (
                            <>
                              <BiChevronUp size={18} className="sm:inline" />
                              <span className="ml-1 text-xs hidden sm:inline">Hide</span>
                            </>
                          ) : (
                            <>
                              <BiChevronDown size={18} className="sm:inline" />
                              <span className="ml-1 text-xs hidden sm:inline">Logs</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(deepo.id) && (
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td colSpan="10" className="px-4 sm:px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">Closing Date</div>
                              <div className="text-sm text-gray-900">{formatDate(deepo.closing_date)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">Approved By</div>
                              <div className="text-sm text-gray-900">{deepo.approved_name || '-'}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">Created At</div>
                              <div className="text-sm text-gray-900">{formatDateTime(deepo.created_at)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                deepo.status === 'approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {deepo.status === 'approved' ? 'Trip Closed' : 'Trip Open'}
                              </span>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">Actions</div>
                              <div className="flex flex-wrap gap-1">
                                {/* View Button - visible if can_view */}
                                {permissions.can_view && (
                                  <Link
                                    href={`/deepo-view?id=${deepo.id}`}
                                    className="text-cyan-600 hover:text-cyan-900 bg-cyan-100 hover:bg-cyan-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                  >
                                    View
                                  </Link>
                                )}
                                {/* Edit Button - visible only if can_edit */}
                                {permissions.can_edit && (
                                  <Link
                                    href={`/edit-deepo-list?id=${deepo.id}`}
                                    className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                  >
                                    Edit
                                  </Link>
                                )}
                                <Link
                                  href={`/deepo-logs?deepo_id=${deepo.id}`}
                                  className="inline-block text-purple-600 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                                  title="View Activity Logs"
                                >
                                  📋 Logs
                                </Link>

                                {/* Approve button - only if can_edit */}
                                {deepo.status !== 'approved' && permissions.can_edit && (
                                  <button
                                    onClick={() => handleApprove(deepo.id)}
                                    className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                  >
                                    Approve
                                  </button>
                                )}
                                {deepo.status === 'approved' && (
                                  <>
                                    <button
                                      onClick={() => handleDownloadPDF(deepo.id)}
                                      className="text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                      title="Download PDF"
                                    >
                                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      PDF
                                    </button>
                                    <Link
                                      href={`/deepo-new-list?id=${deepo.id}`}
                                      className="text-yellow-600 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      New
                                    </Link>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Logs Row */}
                    {expandedDeepos[deepo.id] && (
                      <tr className="bg-gray-50">
                        <td colSpan="10" className="px-3 sm:px-6 py-4">
                          <div className="max-w-full sm:max-w-4xl">
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Activity Logs for Deepo #{deepo.id}</h3>
                            <div className="overflow-x-auto">
                              <DeepoLogs deepoId={deepo.id} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden p-4 space-y-4">
              {deepos.length > 0 ? (
                deepos.map((deepo) => (
                  <div key={deepo.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">Deepo #{deepo.id}</h3>
                        <p className="text-sm text-gray-600">{deepo.licence_plate}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedRows);
                            if (newExpanded.has(deepo.id)) {
                              newExpanded.delete(deepo.id);
                            } else {
                              newExpanded.add(deepo.id);
                            }
                            setExpandedRows(newExpanded);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        >
                          {expandedRows.has(deepo.id) ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => toggleDeepoLogs(deepo.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        >
                          {expandedDeepos[deepo.id] ? (
                            <BiChevronUp size={20} />
                          ) : (
                            <BiChevronDown size={20} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-gray-500 text-xs">Driver</p>
                        <p className="text-gray-900 font-medium">{deepo.first_driver || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Mobile</p>
                        <p className="text-gray-900 font-medium">{deepo.first_mobile || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Start Date</p>
                        <p className="text-gray-900 font-medium">{formatDate(deepo.first_start_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Opening Station</p>
                        <p className="text-gray-900 font-medium">{deepo.opening_station || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Diesel LTR</p>
                        <p className="text-gray-900 font-medium">{deepo.diesel_ltr || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Closing Station</p>
                        <p className="text-gray-900 font-medium">{deepo.closing_station || '-'}</p>
                      </div>
                    </div>

                    {/* Expanded Details Mobile */}
                    {expandedRows.has(deepo.id) && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Closing Date</p>
                            <p className="text-gray-900 font-medium">{formatDate(deepo.closing_date)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Approved By</p>
                            <p className="text-gray-900 font-medium">{deepo.approved_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Created At</p>
                            <p className="text-gray-900 font-medium text-xs">{formatDateTime(deepo.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Status</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              deepo.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {deepo.status === 'approved' ? 'Trip Closed' : 'Trip Open'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-2">
                          {permissions.can_view && (
                            <Link
                              href={`/deepo-view?id=${deepo.id}`}
                              className="text-cyan-600 hover:text-cyan-900 bg-cyan-100 hover:bg-cyan-200 px-2 py-1 rounded text-xs font-medium"
                            >
                              View
                            </Link>
                          )}
                          {permissions.can_edit && (
                            <Link
                              href={`/edit-deepo-list?id=${deepo.id}`}
                              className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium"
                            >
                              Edit
                            </Link>
                          )}
                          {deepo.status !== 'approved' && permissions.can_edit && (
                            <button
                              onClick={() => handleApprove(deepo.id)}
                              className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs font-medium"
                            >
                              Approve
                            </button>
                          )}
                          {deepo.status === 'approved' && (
                            <>
                              <button
                                onClick={() => handleDownloadPDF(deepo.id)}
                                className="text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs font-medium"
                              >
                                PDF
                              </button>
                              <Link
                                href={`/deepo-new-list?id=${deepo.id}`}
                                className="text-yellow-600 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded text-xs font-medium"
                              >
                                New
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mobile Logs Section */}
                    {expandedDeepos[deepo.id] && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h3 className="text-xs font-semibold text-gray-700 mb-2">Activity Logs for Deepo #{deepo.id}</h3>
                        <DeepoLogs deepoId={deepo.id} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No deepos found</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Main component with Suspense
export default function DeepoHistory() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
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
            <DeepoHistoryContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
