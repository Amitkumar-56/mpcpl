'use client';

import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

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
      
      // Fetch all permissions in parallel
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
        fetchTankerHistory();
      } else {
        setHasPermission(false);
        setLoading(false);
        console.log('❌ Access denied - No permission for Tanker History module');
      }
    } catch (error) {
      console.error('❌ Permission check error:', error);
      setHasPermission(false);
      setLoading(false);
    }
  };

  const fetchTankerHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tanker-history');
      const result = await response.json();

      if (result.success) {
        setTankers(result.data);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error fetching tanker history', 'error');
      console.error('Error:', error);
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Licence Plate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Mobile
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opening Station
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opening Meter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing Meter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diesel LTR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing Station
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tankers.map((tanker) => (
                    <tr key={tanker.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.licence_plate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.first_driver}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.first_mobile}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(tanker.first_start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.opening_station}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.opening_meter}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.closing_meter}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.diesel_ltr}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.closing_station}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(tanker.closing_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tanker.approved_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(tanker.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer whitespace-nowrap ${
                          tanker.status === 'approved' 
                            ? 'bg-green-100 text-green-800 status-approved' 
                            : 'bg-yellow-100 text-yellow-800 status-pending'
                        }`}>
                          {tanker.status === 'approved' ? 'Trip Closed' : 'Trip Open'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={`/edit-tanker-list?id=${tanker.id}`}
                            className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Edit
                          </Link>
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
                            <button
                              onClick={() => handleApprove(tanker.id)}
                              className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Approve
                            </button>
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
                              <Link
                                href={`/tanker-new-list?id=${tanker.id}`}
                                className="text-yellow-600 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                New
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tankers.length === 0 && (
              <EmptyState hasEditPermission={permissions.can_edit} />
            )}
          </div>
        </Suspense>
      </main>
    </div>
  );
}

// Main component with Suspense boundary
export default function TankerHistory() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TankerHistoryContent />
    </Suspense>
  );
}