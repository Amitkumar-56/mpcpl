'use client';

import ExportButton from '@/components/ExportButton';
import Link from 'next/link';
import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import React from 'react';
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

// Component to fetch and display tanker logs
function TankerLogs({ tankerId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!tankerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Fetch audit logs for this tanker
        const response = await fetch(`/api/audit-logs?record_type=tanker&record_id=${tankerId}`);
        
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
        console.error('Error fetching tanker logs:', error);
        setError('Failed to load logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [tankerId]);

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
        No activity logs found for this tanker.
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

// Loading components
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading tanker history...</p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(15)].map((_, i) => (
                <th key={i} className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(15)].map((_, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissionDenied() {
  const router = useRouter();
  
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

function EmptyState({ hasEditPermission }) {
  return (
    <div className="text-center py-12">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No tankers found</h3>
      <p className="mt-1 text-sm text-gray-500">Get started by creating a new tanker record.</p>
      {hasEditPermission && (
        <div className="mt-6">
          <Link
            href="/tanker-list"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Create Tanker Detail
          </Link>
        </div>
      )}
    </div>
  );
}

function MessageAlert({ message, messageType, onClose }) {
  if (!message) return null;

  return (
    <div className={`mb-6 p-4 rounded-lg ${
      messageType === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
    }`}>
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Main content component
function TankerHistoryContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [tankers, setTankers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [permissions, setPermissions] = useState({
    can_edit: false,
    can_view: false,
    can_delete: false
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedTankers, setExpandedTankers] = useState({});
  
  const toggleTankerLogs = (tankerId) => {
    setExpandedTankers(prev => ({
      ...prev,
      [tankerId]: !prev[tankerId]
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
      fetchTankerHistory();
      return;
    }

    // ✅ FIX: Check user's cached permissions from verify API first
    if (user.permissions && user.permissions['Tanker History']) {
      const tankerPerms = user.permissions['Tanker History'];
      if (tankerPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: tankerPerms.can_view,
          can_edit: tankerPerms.can_edit,
          can_delete: tankerPerms.can_delete
        });
        fetchTankerHistory();
        return;
      }
    }
    
    // Check cache first
    const cacheKey = `perms_${user.id}_Tanker History`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchTankerHistory();
        return;
      }
    }
    
    try {
      // ✅ FIX: Use exact module name as stored in database: "Tanker History"
      const moduleName = 'Tanker History';
      console.log('🔐 Checking permissions for:', { employee_id: user.id, role: user.role, module: moduleName });
      
      // Add timeout to permission checks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // Fetch all permissions in parallel
      const [viewRes, editRes, deleteRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`, {
          signal: controller.signal
        }),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`, {
          signal: controller.signal
        }),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`, {
          signal: controller.signal
        })
      ]);
      
      clearTimeout(timeoutId);
      
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
        fetchTankerHistory();
      } else {
        setHasPermission(false);
        setLoading(false);
        console.log('❌ Access denied - No permission for Tanker History module');
      }
    } catch (error) {
      console.error('❌ Permission check error:', error);
      if (error.name === 'AbortError') {
        console.warn('Permission check timeout, using cached permissions if available');
        // Try to use cached permissions on timeout
        const cacheKey = `perms_${user.id}_Tanker History`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedPerms = JSON.parse(cached);
            if (cachedPerms.can_view) {
              setHasPermission(true);
              setPermissions(cachedPerms);
              fetchTankerHistory();
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

  const fetchTankerHistory = async () => {
    try {
      setLoading(true);
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/tanker-history', {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      const result = await response.json();

      if (result.success) {
        setTankers(result.data || []);
      } else {
        showMessage(result.message || 'Failed to fetch tanker history', 'error');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        showMessage('Request timeout. Please try again.', 'error');
      } else {
        showMessage('Error fetching tanker history', 'error');
        console.error('Error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tankerId) => {
    if (!confirm('Are you sure you want to approve this tanker?')) {
      return;
    }

    try {
      const response = await fetch('/api/tanker-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tankerId,
          action: 'approve'
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Tanker approved successfully!', 'success');
        fetchTankerHistory();
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error approving tanker', 'error');
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

  const closeMessage = () => {
    setMessage('');
    setMessageType('');
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '0000-00-00') return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    return new Date(dateTimeString).toLocaleString();
  };

  const handleDownloadPDF = async (tankerId) => {
    try {
      window.open(`/approve-tanker?id=${tankerId}`, '_blank');
    } catch (error) {
      showMessage('Error opening PDF', 'error');
    }
  };

  // Show loading state
  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  // Show permission denied
  if (!hasPermission) {
    return <PermissionDenied />;
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
              <h1 className="text-2xl font-bold text-gray-900">Tanker History</h1>
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
                  <span className="text-gray-500">Tanker History</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Message */}
        <MessageAlert message={message} messageType={messageType} onClose={closeMessage} />

        {/* Create Button */}
        {permissions.can_edit && (
          <div className="mb-6 flex justify-end">
            <Link
              href="/tanker-list"
              className="fixed bottom-8 right-8 z-10 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Tanker Detail</span>
            </Link>
          </div>
        )}

        {/* Tanker Table */}
        <Suspense fallback={<TableSkeleton />}>
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto max-w-full">
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
                      Opening Meter
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                      Closing Meter
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
                  {tankers.length > 0 ? (
                  tankers.map((tanker) => (
                    <React.Fragment key={tanker.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tanker.id}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tanker.licence_plate}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                          {tanker.first_driver}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                          {tanker.first_mobile}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                          {formatDate(tanker.first_start_date)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                          {tanker.opening_station}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                          {tanker.opening_meter}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                          {tanker.closing_meter}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedRows);
                              if (newExpanded.has(tanker.id)) {
                                newExpanded.delete(tanker.id);
                              } else {
                                newExpanded.add(tanker.id);
                              }
                              setExpandedRows(newExpanded);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title={expandedRows.has(tanker.id) ? "Collapse" : "Expand"}
                          >
                            {expandedRows.has(tanker.id) ? (
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
                            onClick={() => toggleTankerLogs(tanker.id)}
                            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm"
                            title="View Activity Logs"
                          >
                            {expandedTankers[tanker.id] ? (
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
                      {expandedRows.has(tanker.id) && (
                        <tr className="bg-blue-50 border-t-2 border-blue-200">
                          <td colSpan="10" className="px-4 sm:px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Diesel LTR</div>
                                <div className="text-sm text-gray-900">{tanker.diesel_ltr || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Closing Station</div>
                                <div className="text-sm text-gray-900">{tanker.closing_station || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Closing Date</div>
                                <div className="text-sm text-gray-900">{formatDate(tanker.closing_date)}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Approved By</div>
                                <div className="text-sm text-gray-900">{tanker.approved_name || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Created At</div>
                                <div className="text-sm text-gray-900">{formatDateTime(tanker.created_at)}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                  tanker.status === 'approved' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {tanker.status === 'approved' ? 'Trip Closed' : 'Trip Open'}
                                </span>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Actions</div>
                                <div className="flex flex-wrap gap-1">
                                  {permissions.can_edit && (
                                    <Link
                                      href={`/edit-tanker-list?id=${tanker.id}`}
                                      className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      Edit
                                    </Link>
                                  )}
                                  <Link
                                    href={`/tanker-view?id=${tanker.id}`}
                                    className="text-cyan-600 hover:text-cyan-900 bg-cyan-100 hover:bg-cyan-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                  >
                                    View
                                  </Link>
                                  <Link
                                    href={`/tanker-logs?tanker_id=${tanker.id}`}
                                    className="inline-block text-purple-600 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                                    title="View Activity Logs"
                                  >
                                    📋 Logs
                                  </Link>

                                  {tanker.status !== 'approved' ? (
                                    permissions.can_edit && (
                                      <button
                                        onClick={() => handleApprove(tanker.id)}
                                        className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                      >
                                        Approve
                                      </button>
                                    )
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleDownloadPDF(tanker.id)}
                                        className="text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                        title="Download PDF"
                                      >
                                        <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        PDF
                                      </button>
                                      {permissions.can_edit && (
                                        <Link
                                          href={`/tanker-new-list?id=${tanker.id}`}
                                          className="text-yellow-600 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                                        >
                                          New
                                        </Link>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* Logs Row */}
                      {expandedTankers[tanker.id] && (
                        <tr className="bg-gray-50">
                          <td colSpan="10" className="px-3 sm:px-6 py-4">
                            <div className="max-w-full sm:max-w-4xl">
                              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Activity Logs for Tanker #{tanker.id}</h3>
                              <div className="overflow-x-auto">
                                <TankerLogs tankerId={tanker.id} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center">
                        <EmptyState hasEditPermission={permissions.can_edit} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden p-4 space-y-4">
                {tankers.length > 0 ? (
                  tankers.map((tanker) => (
                    <div key={tanker.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">Tanker #{tanker.id}</h3>
                          <p className="text-sm text-gray-600">{tanker.licence_plate}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedRows);
                              if (newExpanded.has(tanker.id)) {
                                newExpanded.delete(tanker.id);
                              } else {
                                newExpanded.add(tanker.id);
                              }
                              setExpandedRows(newExpanded);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          >
                            {expandedRows.has(tanker.id) ? (
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
                            onClick={() => toggleTankerLogs(tanker.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          >
                            {expandedTankers[tanker.id] ? (
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
                          <p className="text-gray-900 font-medium">{tanker.first_driver || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Mobile</p>
                          <p className="text-gray-900 font-medium">{tanker.first_mobile || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Start Date</p>
                          <p className="text-gray-900 font-medium">{formatDate(tanker.first_start_date)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Opening Station</p>
                          <p className="text-gray-900 font-medium">{tanker.opening_station || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Opening Meter</p>
                          <p className="text-gray-900 font-medium">{tanker.opening_meter || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Closing Meter</p>
                          <p className="text-gray-900 font-medium">{tanker.closing_meter || '-'}</p>
                        </div>
                      </div>

                      {/* Expanded Details Mobile */}
                      {expandedRows.has(tanker.id) && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-gray-500">Diesel LTR</p>
                              <p className="text-gray-900 font-medium">{tanker.diesel_ltr || '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Closing Station</p>
                              <p className="text-gray-900 font-medium">{tanker.closing_station || '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Closing Date</p>
                              <p className="text-gray-900 font-medium">{formatDate(tanker.closing_date)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Approved By</p>
                              <p className="text-gray-900 font-medium">{tanker.approved_name || '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Created At</p>
                              <p className="text-gray-900 font-medium text-xs">{formatDateTime(tanker.created_at)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Status</p>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                tanker.status === 'approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {tanker.status === 'approved' ? 'Trip Closed' : 'Trip Open'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 pt-2">
                            {permissions.can_edit && (
                              <Link
                                href={`/edit-tanker-list?id=${tanker.id}`}
                                className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium"
                              >
                                Edit
                              </Link>
                            )}
                            <Link
                              href={`/tanker-view?id=${tanker.id}`}
                              className="text-cyan-600 hover:text-cyan-900 bg-cyan-100 hover:bg-cyan-200 px-2 py-1 rounded text-xs font-medium"
                            >
                              View
                            </Link>
                            {tanker.status !== 'approved' && permissions.can_edit && (
                              <button
                                onClick={() => handleApprove(tanker.id)}
                                className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs font-medium"
                              >
                                Approve
                              </button>
                            )}
                            {tanker.status === 'approved' && (
                              <>
                                <button
                                  onClick={() => handleDownloadPDF(tanker.id)}
                                  className="text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs font-medium"
                                >
                                  PDF
                                </button>
                                {permissions.can_edit && (
                                  <Link
                                    href={`/tanker-new-list?id=${tanker.id}`}
                                    className="text-yellow-600 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded text-xs font-medium"
                                  >
                                    New
                                  </Link>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mobile Logs Section */}
                      {expandedTankers[tanker.id] && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-700 mb-2">Activity Logs for Tanker #{tanker.id}</h3>
                          <TankerLogs tankerId={tanker.id} />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <EmptyState hasEditPermission={permissions.can_edit} />
                )}
              </div>
          </div>
        </Suspense>
      </main>
    </div>
  );
}

// Main component with Suspense boundary
export default function TankerHistory() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<LoadingSpinner />}>
            <TankerHistoryContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
