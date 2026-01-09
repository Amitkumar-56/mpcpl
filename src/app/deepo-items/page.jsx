'use client';

import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

// Component to fetch and display remark logs
function RemarkLogs({ remarkId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!remarkId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/audit-logs?record_type=remark&record_id=${remarkId}`);
        
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
        console.error('Error fetching remark logs:', error);
        setError('Failed to load logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [remarkId]);

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
        No activity logs found for this remark.
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

// Inner component that uses useSearchParams
function DeepoItemsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page')) || 1;

  const [remarks, setRemarks] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({ can_view: false, can_edit: false, can_create: false });
  const [expandedRemarks, setExpandedRemarks] = useState({});
  
  const toggleRemarkLogs = (remarkId) => {
    setExpandedRemarks(prev => ({
      ...prev,
      [remarkId]: !prev[remarkId]
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
  }, [user, authLoading, currentPage]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;
    
    // Admin has full access
    if (Number(user.role) === 5) {
      setPermissions({ can_view: true, can_edit: true, can_create: true });
      setHasPermission(true);
      fetchRemarks();
      return;
    }
    
    // Check cache first
    const cacheKey = `perms_${user.id}_remarks`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedPerms = JSON.parse(cached);
        setPermissions(cachedPerms);
        if (cachedPerms.can_view) {
          setHasPermission(true);
          fetchRemarks();
          return;
        }
      } catch (e) {
        console.error('Error parsing cached permissions:', e);
      }
    }
    
    try {
      // Fetch all permissions at once
      const moduleName = 'Remarks';
      const [viewRes, editRes, createRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`)
      ]);
      
      const [viewData, editData, createData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        createRes.json()
      ]);
      
      const perms = {
        can_view: viewData.allowed || false,
        can_edit: editData.allowed || false,
        can_create: createData.allowed || false
      };
      
      setPermissions(perms);
      
      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      if (perms.can_view) {
        setHasPermission(true);
        fetchRemarks();
      } else {
        setHasPermission(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setLoading(false);
      setPermissions({ can_view: false, can_edit: false, can_create: false });
    }
  };

  const fetchRemarks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/deepo-items?page=${currentPage}&limit=10`);
      const result = await response.json();

      if (result.success) {
        setRemarks(result.data.remarks);
        setPagination(result.data.pagination);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to load remarks');
    } finally {
      setLoading(false);
    }
  };


  const handlePageChange = (page) => {
    router.push(`/deepo-items?page=${page}`);
  };

  // Format price in Indian Rupees
  const formatPrice = (price) => {
    if (!price && price !== 0) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(price) || 0);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading remarks...</p>
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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Remarks</h1>
            </div>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <Link href="/" className="text-gray-400 hover:text-gray-500">
                    Home
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-4 text-sm font-medium text-gray-500">Remarks List</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Floating Add Button - Only show if user has can_create permission */}
        {(permissions?.can_create === true || permissions?.can_create === 1) && (
          <Link
            href="/add-remarks"
            className="fixed bottom-8 right-8 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center space-x-2 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Remark</span>
          </Link>
        )}

        {/* Remarks List Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Remarks List</h2>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      S.No
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Logs
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {remarks.length > 0 ? (
                    remarks.map((remark, index) => (
                      <React.Fragment key={remark.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {remark.remarks_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatPrice(remark.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {remark.image_path ? (
                            <img 
                              src={remark.image_path} 
                              alt={remark.remarks_name}
                              className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <span className="text-gray-400 italic">No Image</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            {/* Edit button - Only show if user has can_edit permission */}
                            {(permissions?.can_edit === true || permissions?.can_edit === 1) ? (
                              <Link
                                href={`/edit-remarks?id=${remark.id}`}
                                className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                                title="Edit"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </Link>
                            ) : (
                              <span className="text-gray-400 text-xs">No permission</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleRemarkLogs(remark.id)}
                            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm"
                            title="View Activity Logs"
                          >
                            {expandedRemarks[remark.id] ? (
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
                      {/* Expandable Logs Row */}
                      {expandedRemarks[remark.id] && (
                        <tr className="bg-gray-50">
                          <td colSpan="6" className="px-4 sm:px-6 py-4">
                            <div className="max-w-full sm:max-w-4xl">
                              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Activity Logs for {remark.remarks_name}</h3>
                              <div className="overflow-x-auto">
                                <RemarkLogs remarkId={remark.id} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
                        No remarks found. <Link href="/add-remarks" className="text-purple-600 hover:text-purple-500">Add your first remark</Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-4 p-4">
              {remarks.length > 0 ? (
                remarks.map((remark, index) => (
                  <div key={remark.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{remark.remarks_name}</h3>
                        <p className="text-xs text-gray-500 mt-1">S.No: {(pagination.currentPage - 1) * pagination.limit + index + 1}</p>
                      </div>
                      {(permissions?.can_edit === true || permissions?.can_edit === 1) ? (
                        <Link
                          href={`/edit-remarks?id=${remark.id}`}
                          className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">No permission</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Price</p>
                        <p className="text-lg font-semibold text-gray-900">{formatPrice(remark.price)}</p>
                      </div>
                      <div>
                        {remark.image_path ? (
                          <img 
                            src={remark.image_path} 
                            alt={remark.remarks_name}
                            className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Mobile Logs Section */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => toggleRemarkLogs(remark.id)}
                        className="w-full flex items-center justify-between text-blue-600 hover:text-blue-800 transition-colors py-2"
                      >
                        <span className="text-sm font-medium">Activity Logs</span>
                        {expandedRemarks[remark.id] ? (
                          <BiChevronUp size={20} />
                        ) : (
                          <BiChevronDown size={20} />
                        )}
                      </button>
                      {expandedRemarks[remark.id] && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <RemarkLogs remarkId={remark.id} />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No remarks found.</p>
                  {(permissions?.can_create === true || permissions?.can_create === 1) && (
                    <Link href="/add-remarks" className="text-purple-600 hover:text-purple-500 text-sm mt-2 inline-block">Add your first remark</Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-6 sm:px-6 mt-6 rounded-lg shadow-sm">
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)}
                    </span> of{' '}
                    <span className="font-medium">{pagination.totalRecords}</span> results
                  </p>
                </div>
                <div>
                  <ul className="flex items-center space-x-2">
                    {/* Previous Page */}
                    <li>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                    </li>

                    {/* Page Numbers */}
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <li key={page}>
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                            page === pagination.currentPage
                              ? 'z-10 bg-purple-600 text-white border-purple-600'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                          } border rounded-md`}
                        >
                          {page}
                        </button>
                      </li>
                    ))}

                    {/* Next Page */}
                    <li>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}

// Main component with Suspense
export default function DeepoItems() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={null}>
            <DeepoItemsContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
