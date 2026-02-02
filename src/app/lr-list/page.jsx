'use client';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { BiChevronDown, BiChevronUp } from "react-icons/bi";

// Component to fetch and display shipment logs
function ShipmentLogs({ shipmentId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        // Fetch audit logs for this shipment
        const response = await fetch(`/api/audit-logs?record_type=lr&record_id=${shipmentId}`);
        const result = await response.json();
        if (result.success) {
          const logsData = Array.isArray(result.logs) ? result.logs : (result.data || []);
          setLogs(logsData);
        }
      } catch (error) {
        console.error('Error fetching shipment logs:', error);
      } finally {
        setLoading(false);
      }
    };
    if (shipmentId) {
      fetchLogs();
    }
  }, [shipmentId]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-4">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-white rounded border">
        No activity logs found for this shipment.
      </div>
    );
  }

  // Helper to format action text
  const formatActionType = (action) => {
    if (!action) return 'Action';
    const lowerAction = action.toLowerCase();
    if (lowerAction === 'add' || lowerAction === 'create') return 'Created By';
    if (lowerAction === 'edit' || lowerAction === 'update') return 'Edited By';
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  return (
    <div className="space-y-2">
      {logs.map((log, idx) => (
        <div key={idx} className="bg-white rounded border p-3 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-medium text-gray-700">{formatActionType(log.action)}:</span>
              <span className="ml-2 text-gray-900 font-semibold">{log.user_name || log.userName || 'Unknown User'}</span>
            </div>
            <span className="text-xs text-gray-500">
              {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : ''}
            </span>
          </div>
          {log.remarks && (
            <p className="text-xs text-gray-600 mt-1">{log.remarks}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Loading Component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading shipments...</p>
      </div>
    </div>
  );
}

// Error Component
function ErrorFallback({ error, onRetry }) {
  const isAuthError = error && (error.includes('Unauthorized') || error.includes('login') || error.includes('Please login'));

  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-red-500 text-center">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">
            {isAuthError ? 'Authentication Required' : 'Error Loading Page'}
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          {isAuthError ? (
            <button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Go to Login
            </button>
          ) : (
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Content Component
function LRManagementContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [shipments, setShipments] = useState([]);
  const [permissions, setPermissions] = useState({ can_view: 0, can_edit: 0, can_create: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedShipments, setExpandedShipments] = useState({});
  const searchParams = useSearchParams();

  const toggleShipmentLogs = (shipmentId) => {
    setExpandedShipments(prev => ({
      ...prev,
      [shipmentId]: !prev[shipmentId]
    }));
  };

  // Check authentication and fetch data
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    fetchShipments();
  }, [user, authLoading, router]);

  const fetchShipments = async () => {
    if (!user) {
      setLoading(false);
      setError('Please login to access this page.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('/api/lr-list', {
        signal: controller.signal,
        credentials: 'include',
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));

        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            sessionStorage.clear();
          }
          router.push('/login');
          return;
        }

        throw new Error(errorData.error || `Failed to fetch shipments (${response.status})`);
      }

      const data = await response.json();

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server');
      }

      if (user) {
        setShipments(data.shipments || []);
        const loadedPermissions = data.permissions || { can_view: 0, can_edit: 0, can_create: 0 };
        setPermissions(loadedPermissions);

        console.log('✅ [LR List] Permissions loaded:', loadedPermissions);
        console.log('✅ [LR List] can_create value:', loadedPermissions.can_create, 'Type:', typeof loadedPermissions.can_create);
        console.log('✅ [LR List] Button should show:', loadedPermissions.can_create === 1 || loadedPermissions.can_create === true);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else {
        setError(err.message || 'Failed to load shipments. Please try again.');
      }
      console.error('❌ [LR List] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return null;
  }

  if (error && !shipments.length) {
    return <ErrorFallback error={error} onRetry={fetchShipments} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section with Create LR Button */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LR Management</h1>
              <p className="text-gray-600 mt-1">
                Total {shipments.length} shipment{shipments.length !== 1 ? 's' : ''}
              </p>
              <div className="mt-3">
                <Link
                  href="/driver-cash-collection-history"
                  className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition duration-200 text-sm"
                >
                  Driver Cash Collection History
                </Link>
              </div>
            </div>

            {/* 🔥 CREATE LR BUTTON - Show if user has create permission */}
            {(permissions?.can_create === 1 || permissions?.can_create === true || permissions?.can_create === '1') && (
              <Link
                href="/create-lr"
                className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition duration-200 shadow-sm"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New LR
              </Link>
            )}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-800">{error}</span>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Shipment List</h2>
              <button
                onClick={fetchShipments}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                disabled={loading}
              >
                <svg className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consigner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consignee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanker No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logs</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipments.length > 0 ? (
                  shipments.map((shipment) => (
                    <React.Fragment key={shipment.id}>
                      <tr className="hover:bg-gray-50 transition duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{shipment.lr_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.consigner}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.consignee}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.from_location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.to_location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.tanker_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <Link
                              href={`/transport-receipt?id=${shipment.id}`}
                              target="_blank"
                              className="text-blue-600 hover:text-blue-900 transition duration-150 text-sm"
                            >
                              View
                            </Link>

                            {(permissions?.can_edit === 1 || permissions?.can_edit === true) && (
                              <>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/create-lr?id=${shipment.id}`}
                                  className="text-orange-600 hover:text-orange-900 transition duration-150 text-sm"
                                >
                                  Edit
                                </Link>
                              </>
                            )}

                            {/* DELETE BUTTON REMOVED - Sadece View ve Edit */}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleShipmentLogs(shipment.id)}
                            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Activity Logs"
                          >
                            {expandedShipments[shipment.id] ? (
                              <>
                                <BiChevronUp size={18} />
                                <span className="ml-1 text-xs">Hide</span>
                              </>
                            ) : (
                              <>
                                <BiChevronDown size={18} />
                                <span className="ml-1 text-xs">Logs</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {/* Expandable Logs Row */}
                      {expandedShipments[shipment.id] && (
                        <tr className="bg-gray-50">
                          <td colSpan="9" className="px-6 py-4">
                            <div className="max-w-4xl">
                              <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Logs for LR #{shipment.lr_id}</h3>
                              <ShipmentLogs shipmentId={shipment.id} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No shipments found</p>
                        <p className="text-sm mt-1">Create your first LR using the button above</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden mt-4 space-y-3">
          {shipments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base font-medium">No shipments found</p>
              </div>
            </div>
          ) : (
            shipments.map((shipment) => (
              <div key={shipment.id} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-blue-600">LR: {shipment.lr_id}</h3>
                      <p className="text-sm text-gray-500">ID: {shipment.id}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/transport-receipt?id=${shipment.id}`}
                        target="_blank"
                        className="text-blue-600 text-sm"
                      >
                        View
                      </Link>
                      {(permissions?.can_edit === 1 || permissions?.can_edit === true) && (
                        <Link
                          href={`/create-lr?id=${shipment.id}`}
                          className="text-orange-600 text-sm"
                        >
                          Edit
                        </Link>
                      )}
                      {/* DELETE BUTTON REMOVED - Sadece View ve Edit */}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Consigner:</span>
                      <p>{shipment.consigner}</p>
                    </div>
                    <div>
                      <span className="font-medium">Consignee:</span>
                      <p>{shipment.consignee}</p>
                    </div>
                    <div>
                      <span className="font-medium">From:</span>
                      <p>{shipment.from_location}</p>
                    </div>
                    <div>
                      <span className="font-medium">To:</span>
                      <p>{shipment.to_location}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Tanker No:</span>
                      <p>{shipment.tanker_no}</p>
                    </div>
                  </div>

                  {/* Mobile Logs Section */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => toggleShipmentLogs(shipment.id)}
                      className="w-full flex items-center justify-between text-blue-600 hover:text-blue-800 transition-colors py-2"
                    >
                      <span className="text-sm font-medium">Activity Logs</span>
                      {expandedShipments[shipment.id] ? (
                        <BiChevronUp size={20} />
                      ) : (
                        <BiChevronDown size={20} />
                      )}
                    </button>
                    {expandedShipments[shipment.id] && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <ShipmentLogs shipmentId={shipment.id} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// Main Component with Suspense
export default function LRManagement() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0">
          <Suspense fallback={<LoadingFallback />}>
            <LRManagementContent />
          </Suspense>
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
