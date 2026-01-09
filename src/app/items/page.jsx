'use client';

import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Sidebar from "../../components/sidebar";

// Component to fetch and display item logs
function ItemLogs({ itemId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!itemId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/audit-logs?record_type=item&record_id=${itemId}`);
        
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
        console.error('Error fetching item logs:', error);
        setError('Failed to load logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [itemId]);

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
        No activity logs found for this item.
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
function ItemsListContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page')) || 1;

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false
  });
  const [expandedItems, setExpandedItems] = useState({});
  
  const toggleItemLogs = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
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

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true });
      fetchItems();
      return;
    }

    // Check cached permissions from session/user object first
    if (user.permissions && user.permissions['Items']) {
      const itemPerms = user.permissions['Items'];
      if (itemPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: itemPerms.can_view,
          can_edit: itemPerms.can_edit,
          can_delete: itemPerms.can_delete
        });
        fetchItems();
        return;
      }
    }

    // Check cache storage
    const cacheKey = `perms_${user.id}_Items`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchItems();
        return;
      }
    }
    
    try {
      const moduleName = 'Items';
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

      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed
      };

      // Cache permissions for quick reuse
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        fetchItems();
      } else {
        setHasPermission(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/items?page=${currentPage}&limit=10`);
      const result = await response.json();

      if (result.success) {
        setItems(result.data.items);
        setPagination(result.data.pagination);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };


  const handlePageChange = (page) => {
    router.push(`/items?page=${page}`);
  };

  // Format price in Indian Rupees
  const formatPrice = (price) => {
    if (!price && price !== 0) return '₹0';
    return `₹${new Intl.NumberFormat('en-IN').format(price)}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading items...</p>
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
   <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
      
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          {/* Error Message */}
          {error && (
            <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <div className="text-sm sm:text-base text-red-700">{error}</div>
            </div>
          )}

          {/* Floating Add Button */}
          {permissions.can_edit && (
            <Link
              href="/add-items"
              className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 sm:px-6 rounded-full shadow-lg z-50 flex items-center space-x-2 transition-colors duration-200 text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Items</span>
            </Link>
          )}

          {/* Items List Section */}
          <div className="py-4 sm:py-6">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Items List</h2>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      S.No
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Logs
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <React.Fragment key={item.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.item_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(item.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            {permissions.can_edit && (
                              <Link
                                href={`/edit-item?id=${item.id}`}
                                className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                                title="Edit"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleItemLogs(item.id)}
                            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm"
                            title="View Activity Logs"
                          >
                            {expandedItems[item.id] ? (
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
                      {expandedItems[item.id] && (
                        <tr className="bg-gray-50">
                          <td colSpan="5" className="px-4 sm:px-6 py-4">
                            <div className="max-w-full sm:max-w-4xl">
                              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Activity Logs for {item.item_name}</h3>
                              <div className="overflow-x-auto">
                                <ItemLogs itemId={item.id} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))
                  ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                    No items found.
                    {permissions.can_edit && (
                      <> <Link href="/add-items" className="text-purple-600 hover:text-purple-500">Add your first item</Link></>
                    )}
                  </td>
                </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Cards View */}
            <div className="lg:hidden p-4">
              <div className="space-y-3">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 mb-1">
                            S.No: {(pagination.currentPage - 1) * pagination.limit + index + 1}
                          </div>
                          <div className="font-semibold text-base text-gray-900 truncate">{item.item_name}</div>
                          <div className="text-lg font-bold text-purple-600 mt-1">
                            {formatPrice(item.price)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                          {permissions.can_edit && (
                            <Link
                              href={`/edit-item?id=${item.id}`}
                              className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      {/* Mobile Logs Section */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => toggleItemLogs(item.id)}
                          className="w-full flex items-center justify-between text-blue-600 hover:text-blue-800 transition-colors py-2"
                        >
                          <span className="text-sm font-medium">Activity Logs</span>
                          {expandedItems[item.id] ? (
                            <BiChevronUp size={20} />
                          ) : (
                            <BiChevronDown size={20} />
                          )}
                        </button>
                        {expandedItems[item.id] && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <ItemLogs itemId={item.id} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500">
                    No items found.
                    {permissions.can_edit && (
                      <> <Link href="/add-items" className="text-purple-600 hover:text-purple-500">Add your first item</Link></>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-3 sm:px-4 lg:px-6 py-4 sm:py-6 mt-4 sm:mt-6 rounded-lg shadow-sm">
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
        </div>
      </main>
      <div className="flex-shrink-0">
        <Footer />
      </div>
    </div>
  </div>
  );
}

// Main component with Suspense
export default function ItemsList() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading items...</p>
          </div>
        </div>
      }
    >
      <ItemsListContent />
    </Suspense>
  );
}
