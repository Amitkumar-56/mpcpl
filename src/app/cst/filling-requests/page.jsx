// src/app/cst/filling-requests/page.jsx
"use client";

import Footer from "@/components/Footer";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import Link from 'next/link';
import React, { Fragment, Suspense, useCallback, useEffect, useState } from 'react';

function FillingRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [customerId, setCustomerId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // ✅ Get customer ID from localStorage - Safe SSR check
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR safety
    
    try {
      const savedUser = localStorage.getItem("customer");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && user.id) {
          // ✅ Ensure customer ID is converted to string properly
          const customerIdValue = String(user.id).trim();
          if (customerIdValue) {
            setCustomerId(customerIdValue);
            console.log("✅ Customer ID set:", customerIdValue, "(type:", typeof customerIdValue + ")");
          } else {
            console.log("❌ Customer ID is empty");
          }
        } else {
          console.log("❌ Invalid customer data in localStorage - missing ID:", user);
        }
      } else {
        console.log("❌ No customer found in localStorage");
      }
    } catch (error) {
      console.error("❌ Error reading from localStorage:", error);
    }
  }, []);

  // ✅ Fetch filling requests - wrapped in useCallback to prevent infinite loops
  const fetchFillingRequests = React.useCallback(async (filter = 'All') => {
    if (!customerId) {
      console.log("❌ No customer ID available");
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      let url = `/api/cst/filling-requests?cid=${customerId}`;
      if (filter !== 'All') {
        url += `&status=${filter}`;
      }
      
      console.log('📍 Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📍 Response status:', response.status);
      console.log('📍 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const responseText = await response.text();
      console.log('📍 Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        console.error('❌ Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('📍 Parsed data:', data);
      console.log('📍 Data success:', data.success);
      console.log('📍 Data requests:', data.requests);
      console.log('📍 Requests count:', data.requests?.length);
      console.log('📍 Requests type:', typeof data.requests);
      console.log('📍 Is array:', Array.isArray(data.requests));
      
      if (data.success) {
        const requestsArray = Array.isArray(data.requests) ? data.requests : [];
        console.log('✅ Requests array:', requestsArray);
        console.log('✅ Requests array length:', requestsArray.length);
        
        setRequests(requestsArray);
        console.log('✅ Requests state set with:', requestsArray.length, 'items');
        
        // ✅ Log if no requests found
        if (requestsArray.length === 0) {
          console.log('⚠️ No requests found for customer:', customerId, 'with filter:', filter);
          console.log('⚠️ Check server logs to verify if data exists in database');
        } else {
          console.log('✅ Successfully loaded', requestsArray.length, 'requests');
          console.log('✅ First request:', requestsArray[0]);
        }
      } else {
        const errorMsg = data.message || data.error || 'Failed to fetch requests';
        console.error('❌ API returned error:', errorMsg);
        setError(errorMsg);
        setRequests([]);
      }
    } catch (err) {
      console.error('❌ Error fetching requests:', err);
      setError(err.message || 'An error occurred while fetching requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // ✅ Fetch data when filter or customerId changes
  useEffect(() => {
    if (customerId) {
      console.log("🔄 Customer ID changed, fetching requests...");
      fetchFillingRequests(statusFilter);
    }
  }, [statusFilter, customerId, fetchFillingRequests]);

  // Map database status to display status
  const mapStatus = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'processing': 'Processing',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  // Status badge styling function
  const getStatusClass = (status) => {
    const displayStatus = mapStatus(status);
    switch (displayStatus) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const getRowBgClass = (status) => {
    const displayStatus = mapStatus(status);
    switch (displayStatus) {
      case 'Processing': return 'bg-blue-50';
      case 'Completed': return 'bg-green-50';
      case 'Cancelled': return 'bg-red-50';
      default: return '';
    }
  };
  const getMobileBorderClass = (status) => {
    const displayStatus = mapStatus(status);
    switch (displayStatus) {
      case 'Pending': return 'border-l-4 border-yellow-500';
      case 'Processing': return 'border-l-4 border-blue-500';
      case 'Completed': return 'border-l-4 border-green-600';
      case 'Cancelled': return 'border-l-4 border-red-500';
      default: return 'border-l-4 border-gray-300';
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    console.log("🎛️ Filter changed to:", filter);
    setStatusFilter(filter);
  };

  // ✅ Handle retry - Fixed to use current statusFilter
  const handleRetry = useCallback(() => {
    console.log("🔄 Retrying fetch...");
    if (customerId) {
      fetchFillingRequests(statusFilter);
    }
  }, [customerId, statusFilter, fetchFillingRequests]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when clicking on overlay
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const isOpen = prev.has(id);
      const next = new Set();
      if (!isOpen) next.add(id);
      return next;
    });
  };

  // Debug: Log state changes
  useEffect(() => {
    console.log("📊 State updated - Loading:", loading, "Error:", error, "Requests count:", requests.length);
  }, [loading, error, requests]);

  // ✅ Show loading while checking authentication
  if (typeof window === 'undefined' || loading && !customerId) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-shrink-0">
            <CstHeader onMenuClick={toggleSidebar} />
          </div>
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  // ✅ Redirect to login if not authenticated
  if (!customerId) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-shrink-0">
            <CstHeader onMenuClick={toggleSidebar} />
          </div>
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 text-lg mb-4">Customer not authenticated</div>
              <Link 
                href="/cst/login"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Go to Login
              </Link>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {/* ✅ Fixed Sidebar - Using flex layout */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* ✅ Main Content Area - Fixed layout */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* ✅ Fixed Header */}
        <div className="flex-shrink-0">
          <CstHeader onMenuClick={toggleSidebar} />
        </div>
        
        {/* ✅ Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 min-h-0">
        <div className="p-4 md:p-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Filling Requests</h1>
                <p className="text-gray-600 mt-2">Manage your filling requests</p>
                <Link 
                  href="/cst/filling-requests/create-request"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 w-fit"
                >
                  <span>+ Create Request</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['All', 'Pending', 'Processing', 'Completed', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? status === 'All' ? 'bg-gray-800 text-white' 
                      : status === 'Completed' ? 'bg-green-600 text-white'
                      : status === 'Processing' ? 'bg-blue-600 text-white'
                      : status === 'Cancelled' ? 'bg-red-600 text-white'
                      : 'bg-yellow-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading requests...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
              <div className="text-red-600 text-lg mb-2">Error loading requests</div>
              <div className="text-red-500 mb-4">{error}</div>
              <button
                onClick={handleRetry}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Requests Table - Desktop */}
          {!loading && !error && (
            <>
              <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-hide">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requests.map((request, index) => (
                        <Fragment key={request.id}>
                          <tr key={request.id} className={`${getRowBgClass(request.status)}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.rid}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.product_code || request.product_name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.station_name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.vehicle_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.driver_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.qty}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusClass(request.status)}`}>
                                {mapStatus(request.status)}
                              </span>
                              {mapStatus(request.status) === 'Cancelled' && request.cancelled_by_name && (
                                <div className="mt-1 text-xs text-gray-600">
                                  Cancelled by: <span className="font-semibold text-gray-900">{request.cancelled_by_name}</span>
                                  {request.cancelled_date && (
                                    <span className="ml-1">
                                      (
                                      {new Date(request.cancelled_date).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                      )
                                    </span>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={() => toggleRow(request.id)}
                                className="ml-2 px-3 py-1 rounded border text-sm hover:bg-gray-100"
                                aria-label="Toggle details"
                              >
                                {expandedRows.has(request.id) ? '-' : '+'}
                              </button>
                            </td>
                            
                          </tr>
                          {expandedRows.has(request.id) && (
                            <tr>
                              <td colSpan={8} className="px-6 py-4 bg-gray-50 text-sm text-gray-700">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-gray-500">Created Date</div>
                                    <div className="font-medium text-gray-900">
                                      {new Date(request.created).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                  <div className="md:col-span-2">
                                    <div className="text-gray-500">Actions</div>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      <Link 
                                        href={`/cst/filling-requests/${request.id}`}
                                        className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                                      >
                                        View
                                      </Link>
                                      {request.status === 'pending' && (
                                        <>
                                          <Link 
                                            href={`/cst/filling-requests/edit/${request.id}`}
                                            className="text-yellow-600 hover:text-yellow-900 px-2 py-1 rounded hover:bg-yellow-50"
                                          >
                                            Edit
                                          </Link>
                                          <button className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50">
                                            Delete
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className={`bg-white rounded-lg shadow border border-gray-200 p-4 ${getMobileBorderClass(request.status)}`}>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{request.rid}</h3>
                          <p className="text-sm text-gray-600">{request.product_code || request.product_name || 'N/A'} • {request.station_name || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusClass(request.status)}`}>
                            {mapStatus(request.status)}
                          </span>
                          <button
                            onClick={() => toggleRow(request.id)}
                            className="px-2 py-1 rounded border text-xs hover:bg-gray-100"
                            aria-label="Toggle details"
                          >
                            {expandedRows.has(request.id) ? '-' : '+'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Vehicle:</strong> {request.vehicle_number}</div>
                        <div><strong>Driver:</strong> {request.driver_number}</div>
                        <div><strong>Qty:</strong> {request.qty}</div>
                        <div><strong>Date:</strong> {new Date(request.created).toLocaleDateString()}</div>
                      </div>
                      
                      {expandedRows.has(request.id) && (
                        <div className="grid grid-cols-1 gap-2 text-sm mt-2">
                          <div><strong>Remark:</strong> {request.remark || '-'}</div>
                          <div><strong>OTP:</strong> {request.otp || '-'}</div>
                          <div className="flex gap-2 pt-1">
                            <Link 
                              href={`/cst/filling-requests/${request.id}`}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              View Details
                            </Link>
                            {request.status === 'pending' && (
                              <>
                                <Link 
                                  href={`/cst/filling-requests/edit/${request.id}`}
                                  className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                                >
                                  Edit
                                </Link>
                                <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {mapStatus(request.status) === 'Cancelled' && request.cancelled_by_name && (
                        <div className="text-xs text-gray-600">
                          Cancelled by: <span className="font-semibold text-gray-900">{request.cancelled_by_name}</span>
                          {request.cancelled_date && (
                            <span className="ml-1">
                              (
                              {new Date(request.cancelled_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              )
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Link 
                          href={`/cst/filling-requests/${request.id}`}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          View Details
                        </Link>
                        {request.status === 'pending' && (
                          <>
                            <Link 
                              href={`/cst/filling-requests/edit/${request.id}`}
                              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                            >
                              Edit
                            </Link>
                            <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {!loading && !error && requests.length === 0 && (
            <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg p-8">
              <div className="text-yellow-800 text-lg font-semibold mb-2">No filling requests found</div>
              <div className="text-yellow-600 text-sm mb-4">
                {statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} requests` : 'No requests yet'}
              </div>
              <div className="text-gray-500 text-xs mb-4">
                Customer ID: {customerId} | Filter: {statusFilter}
              </div>
              <Link 
                href="/cst/filling-requests/create-request"
                className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
              >
                Create your first request
              </Link>
            </div>
          )}
        </div>
        </main>

        {/* ✅ Fixed Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <FillingRequestsPage />
    </Suspense>
  );
}
