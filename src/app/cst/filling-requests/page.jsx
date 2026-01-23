// src/app/cst/filling-requests/page.jsx
"use client";

import Footer from "@/components/Footer";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import Link from 'next/link';
import React, { Suspense, useCallback, useEffect, useState } from 'react';

function FillingRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [customerId, setCustomerId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [customerEligibility, setCustomerEligibility] = useState({ 
    eligibility: 'Yes', 
    reason: '', 
    dayLimit: 0, 
    dayCount: 0 
  });
  const [imagePreview, setImagePreview] = useState(null);

  // Load customer ID from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('customer');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          if (user && user.id) {
            setCustomerId(String(user.id).trim());
          }
        }
      } catch (e) {
        console.error('Error reading customer from localStorage', e);
      }
    }
  }, []);

  // ✅ Fetch filling requests
  const fetchFillingRequests = React.useCallback(async (filter = 'All') => {
    if (!customerId) {
      console.log("❌ CST: No customer ID available");
      return;
    }
    
    console.log("🚀 CST: Starting fetch with customerId:", customerId, "filter:", filter);
    
    try {
      setLoading(true);
      setError('');
      
      let url = `/api/cst/filling-requests?cid=${customerId}`;
      if (filter !== 'All') {
        url += `&status=${filter}`;
      }
      
      console.log("📡 CST: Fetching from URL:", url);
      
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("📡 CST: Response status:", response.status);
      console.log("📡 CST: Response ok:", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log("❌ CST: Error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("✅ CST: Parsed response:", data);
      
      if (data.success) {
        const requestsArray = Array.isArray(data.requests) ? data.requests : [];
        console.log("✅ CST: Setting requests:", requestsArray.length, "items");
        
        // ✅ Calculate customer eligibility status based on day_limit
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Get today's pending requests count
        const todayPendingRequests = requestsArray.filter(req => {
          const isPending = req.status === 'pending' || req.status === 'Pending';
          if (!isPending) return false;
          
          const requestDate = req.created ? new Date(req.created).toISOString().split('T')[0] : null;
          return requestDate === today;
        });
        
        // Get day_limit from any request (assuming all have same day_limit for customer)
        const dayLimit = requestsArray[0]?.day_limit || 0;
        const dayCount = todayPendingRequests.length;
        
        let customerEligibilityStatus = { 
          eligibility: 'Yes', 
          reason: '', 
          dayLimit: dayLimit, 
          dayCount: dayCount 
        };
        
        // Check day_limit eligibility
        if (dayLimit > 0 && dayCount >= dayLimit) {
          customerEligibilityStatus = {
            eligibility: 'No',
            reason: `Daily limit reached (${dayCount}/${dayLimit})`,
            dayLimit: dayLimit,
            dayCount: dayCount
          };
        }
        
        setCustomerEligibility(customerEligibilityStatus);
        setRequests(requestsArray);
      } else {
        const errorMsg = data.message || data.error || 'Failed to fetch requests';
        console.log("❌ CST: API returned error:", errorMsg);
        setError(errorMsg);
        setRequests([]);
      }
    } catch (err) {
      console.log("❌ CST: Fetch error:", err);
      setError(err.message || 'An error occurred while fetching requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // ✅ Fetch data when filter or customerId changes
  useEffect(() => {
    console.log("🔄 useEffect triggered - Customer ID:", customerId, "Filter:", statusFilter);
    if (customerId) {
      console.log("🚀 Fetching requests...");
      fetchFillingRequests(statusFilter);
    } else {
      console.log("⏳ Waiting for customer ID...");
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
  const getRequestImages = (request) => {
    let imgs = [];
    if (request.images) {
      try {
        const parsed = typeof request.images === 'string' ? JSON.parse(request.images) : request.images;
        if (parsed?.image1) imgs.push(parsed.image1);
        if (parsed?.image2) imgs.push(parsed.image2);
        if (parsed?.image3) imgs.push(parsed.image3);
      } catch {}
    }
    if (imgs.length === 0) {
      if (request.doc1) imgs.push(request.doc1);
      if (request.doc2) imgs.push(request.doc2);
      if (request.doc3) imgs.push(request.doc3);
    }
    return imgs.filter(Boolean);
  };

  // Format date function
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateString;
    }
  };

  // ✅ Check if edit button should be shown - केवल Pending में enable
  const canEditRequest = (request) => {
    const displayStatus = mapStatus(request.status);
    
    // ✅ केवल Pending में ही edit allow करें
    if (displayStatus !== 'Pending') {
      return false;
    }
    
    // ✅ Day limit check
    if (customerEligibility.dayLimit > 0 && customerEligibility.dayCount >= customerEligibility.dayLimit) {
      return false;
    }
    
    // ✅ Regular eligibility check
    const isEligible = request.eligibility === 'Yes';
    return isEligible;
  };

  // ✅ Get edit button title/message
  const getEditButtonTitle = (request) => {
    const displayStatus = mapStatus(request.status);
    
    if (displayStatus !== 'Pending') {
      return `Cannot edit ${displayStatus} request`;
    }
    
    if (customerEligibility.dayLimit > 0 && customerEligibility.dayCount >= customerEligibility.dayLimit) {
      return `Daily limit reached (${customerEligibility.dayCount}/${customerEligibility.dayLimit})`;
    }
    
    if (request.eligibility !== 'Yes') {
      return `Not eligible: ${request.eligibility_reason || 'Credit limit exceeded'}`;
    }
    
    return 'Edit Request';
  };

  // ✅ Check if eligibility should be shown (केवल Pending में)
  const shouldShowEligibility = (request) => {
    const displayStatus = mapStatus(request.status);
    return displayStatus === 'Pending';
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
  };

  // ✅ Handle retry
  const handleRetry = useCallback(() => {
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

  // ✅ Show loading while checking authentication
  if (typeof window === 'undefined' || loading && !customerId) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <div className="hidden md:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 md:ml-64 min-w-0 min-h-screen">
          <div className="fixed top-0 left-0 md:left-64 right-0 z-40 bg-white">
            <CstHeader onMenuClick={toggleSidebar} />
          </div>
          <main className="pt-16 flex-1 overflow-y-auto flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
          <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white z-40">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  // ✅ Redirect to login if not authenticated
  if (!customerId) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <div className="hidden md:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 md:ml-64 min-w-0 min-h-screen">
          <div className="fixed top-0 left-0 md:left-64 right-0 z-40 bg-white">
            <CstHeader onMenuClick={toggleSidebar} />
          </div>
          <main className="pt-16 flex-1 overflow-y-auto flex items-center justify-center">
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
          <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white z-40">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="hidden md:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 md:ml-64 min-w-0 min-h-screen">
        <div className="fixed top-0 left-0 md:left-64 right-0 z-40 bg-white">
          <CstHeader onMenuClick={toggleSidebar} />
        </div>
        
        <main className="pt-16 flex-1 overflow-y-auto bg-gray-100 min-h-0">
          <div className="p-4 md:p-8 pb-20">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Filling Requests</h1>
                  <p className="text-gray-600 mt-2">Track and manage your fuel filling requests</p>
                  
                  <Link 
                    href="/cst/filling-requests/create-request"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 w-fit mt-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create New Request</span>
                  </Link>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <div className="bg-white rounded-lg p-3 shadow border">
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="text-xl font-bold text-gray-900">{requests.length}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 shadow border border-yellow-200">
                    <div className="text-sm text-yellow-700">Pending</div>
                    <div className="text-xl font-bold text-yellow-800">
                      {requests.filter(r => r.status === 'pending' || r.status === 'Pending').length}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 shadow border border-blue-200">
                    <div className="text-sm text-blue-700">Processing</div>
                    <div className="text-xl font-bold text-blue-800">
                      {requests.filter(r => r.status === 'processing' || r.status === 'Processing').length}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 shadow border border-green-200">
                    <div className="text-sm text-green-700">Completed</div>
                    <div className="text-xl font-bold text-green-800">
                      {requests.filter(r => r.status === 'completed' || r.status === 'Completed').length}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 shadow border border-red-200">
                    <div className="text-sm text-red-700">Cancelled</div>
                    <div className="text-xl font-bold text-red-800">
                      {requests.filter(r => r.status === 'cancelled' || r.status === 'Cancelled').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow border">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2">Filter by:</span>
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
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-lg shadow border p-8 text-center">
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Loading requests...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
                <div className="text-red-600 text-lg mb-2 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Error loading requests
                </div>
                <div className="text-red-500 mb-4">{error}</div>
                <button
                  onClick={handleRetry}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center mx-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </button>
              </div>
            )}

            {/* Requests Table - Desktop */}
            {!loading && !error && requests.length > 0 && (
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          {/* ✅ Eligibility column - केवल Pending के लिए */}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div>Eligibility</div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {requests.flatMap((request, index) => [
                          // Main Row
                          <tr 
                            key={`${request.id}-main`} 
                            className={`hover:bg-gray-50 transition-colors ${getRowBgClass(request.status)}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                              {request.rid}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="font-medium">
                                {request.product_name || request.product_code || 'N/A'}
                              </div>
                              {request.product_code && (
                                <div className="text-xs text-gray-500">Code: {request.product_code}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.station_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="font-medium">{request.vehicle_number}</div>
                              <div className="text-xs text-gray-500">{request.driver_number}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                {getRequestImages(request).slice(0,3).map((src, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setImagePreview(src)}
                                    className="w-10 h-10 rounded overflow-hidden border hover:ring-2 hover:ring-blue-500"
                                    aria-label="Preview image"
                                  >
                                    <img src={src} alt="doc" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                                {getRequestImages(request).length === 0 && (
                                  <span className="text-xs text-gray-500">No images</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="font-semibold">{request.qty}</span> Ltr
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusClass(request.status)}`}>
                                  {mapStatus(request.status)}
                                </span>
                                {/* ✅ Processing By */}
                                {mapStatus(request.status) === 'Processing' && request.processing_by_name && (
                                  <div className="text-xs text-gray-600">
                                    Processing by: {request.processing_by_name}
                                    {request.processed_date && (
                                      <div className="text-gray-500">
                                        {formatDateTime(request.processed_date)}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* ✅ Completed By */}
                                {mapStatus(request.status) === 'Completed' && request.completed_by_name && (
                                  <div className="text-xs text-gray-600">
                                    Completed by: {request.completed_by_name}
                                    {request.completed_date && (
                                      <div className="text-gray-500">
                                        {formatDateTime(request.completed_date)}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* ✅ Cancelled By */}
                                {mapStatus(request.status) === 'Cancelled' && request.cancelled_by_name && (
                                  <div className="text-xs text-gray-600">
                                    Cancelled by: {request.cancelled_by_name}
                                    {request.cancelled_date && (
                                      <div className="text-gray-500">
                                        {formatDateTime(request.cancelled_date)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* ✅ Eligibility Cell - केवल Pending में दिखेगा, बाकी में खाली */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {shouldShowEligibility(request) ? (
                                <div className="flex flex-col gap-1">
                                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                                    request.eligibility === 'Yes' 
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : request.eligibility === 'No'
                                      ? 'bg-red-100 text-red-800 border-red-200'
                                      : 'bg-gray-100 text-gray-800 border-gray-200'
                                  }`}>
                                    {request.eligibility || 'N/A'}
                                  </span>
                                  {request.eligibility_reason && request.eligibility !== 'N/A' && (
                                    <div className="text-xs text-gray-600 max-w-xs truncate" title={request.eligibility_reason}>
                                      {request.eligibility_reason}
                                    </div>
                                  )}
                                  {/* ✅ Day Limit Info (केवल Pending में) */}
                                  {customerEligibility.dayLimit > 0 && (
                                    <div className={`text-xs ${
                                      customerEligibility.dayCount >= customerEligibility.dayLimit 
                                        ? 'text-red-600 font-medium' 
                                        : 'text-gray-500'
                                    }`}>
                                      Day: {customerEligibility.dayCount}/{customerEligibility.dayLimit}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // ✅ Processing/Completed/Cancelled requests में खाली (कोई text नहीं)
                                <div className="text-sm">
                                  {/* खाली रहेगा */}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>{formatDateTime(request.created)}</div>
                              {/* ✅ Created By */}
                              {request.created_by_name && (
                                <div className="text-xs text-gray-500">
                                  By: {request.created_by_name}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <Link
                                  href={`/cst/filling-details?id=${request.id}`}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                  title="View Details"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                  View
                                </Link>
                                
                                {/* ✅ Edit Button - केवल Pending में enable */}
                                {canEditRequest(request) ? (
                                  <Link
                                    href={`/cst/filling-requests/edit?id=${request.id}`}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                    title={getEditButtonTitle(request)}
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Edit
                                  </Link>
                                ) : (
                                  <button
                                    disabled
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                                    title={getEditButtonTitle(request)}
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Edit
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>,
                          
                          // Expanded Row (if expanded)
                          expandedRows.has(request.id) && (
                            <tr key={`${request.id}-expanded`} className="bg-gray-50">
                              <td colSpan={10} className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-gray-500 text-sm">Created By</div>
                                    <div className="font-medium text-gray-900">
                                      {request.created_by_name || 'System'}
                                    </div>
                                    {request.created_date && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {formatDateTime(request.created_date)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-gray-500 text-sm">Remarks</div>
                                    <div className="text-sm text-gray-900">
                                      {request.remark || 'No remarks'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 text-sm">Additional Info</div>
                                    <div className="text-sm text-gray-900 space-y-1">
                                      {/* ✅ केवल Pending में Eligibility दिखाएं */}
                                      {mapStatus(request.status) === 'Pending' && (
                                        <div>
                                          <span className="font-medium">Eligibility:</span> 
                                          <span className={`ml-2 px-2 py-1 text-xs rounded ${
                                            request.eligibility === 'Yes' 
                                              ? 'bg-green-100 text-green-800'
                                              : request.eligibility === 'No'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-gray-100 text-gray-800'
                                          }`}>
                                            {request.eligibility || 'N/A'}
                                          </span>
                                          {request.eligibility_reason && (
                                            <div className="text-xs text-gray-600 mt-1">
                                              Reason: {request.eligibility_reason}
                                            </div>
                                          )}
                                          {/* ✅ Day Limit in expanded view */}
                                          {customerEligibility.dayLimit > 0 && (
                                            <div className="text-xs mt-1">
                                              <span className="font-medium">Day Limit:</span> 
                                              <span className={`ml-1 ${
                                                customerEligibility.dayCount >= customerEligibility.dayLimit 
                                                  ? 'text-red-600 font-medium' 
                                                  : 'text-gray-600'
                                              }`}>
                                                {customerEligibility.dayCount}/{customerEligibility.dayLimit}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {request.processing_by_name && (
                                        <div>Processing by: {request.processing_by_name}</div>
                                      )}
                                      {request.completed_by_name && (
                                        <div>Completed by: {request.completed_by_name}</div>
                                      )}
                                      {request.cancelled_by_name && (
                                        <div>Cancelled by: {request.cancelled_by_name}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        ])}
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
                            <h3 className="font-semibold text-gray-900 font-mono">{request.rid}</h3>
                            <p className="text-sm text-gray-600">
                              {request.product_name || request.product_code || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{request.station_name || 'N/A'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusClass(request.status)}`}>
                              {mapStatus(request.status)}
                            </span>
                            {/* ✅ Mobile में Eligibility - केवल Pending में दिखेगा */}
                            {shouldShowEligibility(request) && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                                request.eligibility === 'Yes' 
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : request.eligibility === 'No'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {request.eligibility || 'N/A'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRequestImages(request).slice(0,3).map((src, idx) => (
                            <button
                              key={idx}
                              onClick={() => setImagePreview(src)}
                              className="w-16 h-16 rounded overflow-hidden border hover:ring-2 hover:ring-blue-500"
                              aria-label="Preview image"
                            >
                              <img src={src} alt="doc" className="w-full h-full object-cover" />
                            </button>
                          ))}
                          {getRequestImages(request).length === 0 && (
                            <span className="text-xs text-gray-500">No images</span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Vehicle:</span>
                            <div className="font-medium">{request.vehicle_number}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Driver:</span>
                            <div>{request.driver_number}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <div className="font-semibold">{request.qty} Ltr</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <div>{formatDateTime(request.created)}</div>
                          </div>
                        </div>
                        
                        {/* ✅ Day Limit Info (केवल Pending में) */}
                        {shouldShowEligibility(request) && customerEligibility.dayLimit > 0 && (
                          <div className={`text-xs px-3 py-2 rounded ${
                            customerEligibility.dayCount >= customerEligibility.dayLimit 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            <span className="font-medium">Day Limit:</span> 
                            <span className="ml-1">
                              {customerEligibility.dayCount}/{customerEligibility.dayLimit}
                            </span>
                            {customerEligibility.dayCount >= customerEligibility.dayLimit && (
                              <div className="mt-1 text-red-600">
                                Daily limit reached
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* ✅ Created By Info */}
                        {request.created_by_name && (
                          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                            <span className="font-medium">Created by:</span> {request.created_by_name}
                          </div>
                        )}
                        
                        {/* ✅ Processing By Info */}
                        {request.processing_by_name && (
                          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                            <span className="font-medium">Processing by:</span> {request.processing_by_name}
                            {request.processed_date && (
                              <div className="mt-1">On: {formatDateTime(request.processed_date)}</div>
                            )}
                          </div>
                        )}
                        
                        {/* ✅ Completed By Info */}
                        {request.completed_by_name && (
                          <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                            <span className="font-medium">Completed by:</span> {request.completed_by_name}
                            {request.completed_date && (
                              <div className="mt-1">On: {formatDateTime(request.completed_date)}</div>
                            )}
                          </div>
                        )}
                        
                        {expandedRows.has(request.id) && (
                          <div className="grid grid-cols-1 gap-2 text-sm mt-2 pt-2 border-t border-gray-200">
                            <div>
                              <span className="text-gray-500">Remark:</span>
                              <div className="text-gray-900">{request.remark || '-'}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">OTP:</span>
                              <div className="font-mono">{request.otp || '-'}</div>
                            </div>
                            {/* ✅ Expanded view में Eligibility - केवल Pending में दिखेगा */}
                            {shouldShowEligibility(request) && (
                              <div>
                                <span className="text-gray-500">Eligibility:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    request.eligibility === 'Yes' 
                                      ? 'bg-green-100 text-green-800'
                                      : request.eligibility === 'No'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {request.eligibility || 'N/A'}
                                  </span>
                                  {request.eligibility_reason && (
                                    <span className="text-xs text-gray-600">
                                      ({request.eligibility_reason})
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Link 
                                href={`/cst/filling-details?id=${request.id}`}
                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 text-center"
                              >
                                View Details
                              </Link>
                              {/* ✅ Mobile Edit Button - केवल Pending में enable */}
                              {canEditRequest(request) ? (
                                <Link 
                                  href={`/cst/filling-requests/edit?id=${request.id}`}
                                  className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 text-center"
                                >
                                  Edit
                                </Link>
                              ) : (
                                <button
                                  disabled
                                  className="flex-1 bg-gray-400 text-white px-3 py-2 rounded text-sm cursor-not-allowed text-center"
                                  title={getEditButtonTitle(request)}
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {mapStatus(request.status) === 'Cancelled' && request.cancelled_by_name && (
                          <div className="text-xs text-gray-600 p-2 bg-red-50 rounded border border-red-200">
                            <span className="font-semibold">Cancelled by:</span> {request.cancelled_by_name}
                            {request.cancelled_date && (
                              <div className="mt-1">
                                {formatDateTime(request.cancelled_date)}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <button
                            onClick={() => toggleRow(request.id)}
                            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-100 flex items-center"
                            aria-label="Toggle details"
                          >
                            {expandedRows.has(request.id) ? (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                Less
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                More
                              </>
                            )}
                          </button>
                          <div className="flex gap-2">
                            <Link 
                              href={`/cst/filling-details?id=${request.id}`}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                            >
                              View
                            </Link>
                            {/* ✅ Mobile Edit Button */}
                            {canEditRequest(request) ? (
                              <Link 
                                href={`/cst/filling-requests/edit?id=${request.id}`}
                                className="bg-yellow-600 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-700"
                              >
                                Edit
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="bg-gray-400 text-white px-3 py-1.5 rounded text-sm cursor-not-allowed"
                                title={getEditButtonTitle(request)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
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
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
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

        <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white z-40">
          <Footer />
        </div>
        {imagePreview && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setImagePreview(null)}
            ></div>
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
                <div className="flex justify-between items-center p-3 border-b">
                  <div className="font-medium">Image Preview</div>
                  <button
                    onClick={() => setImagePreview(null)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close preview"
                  >
                    ×
                  </button>
                </div>
                <div className="p-3">
                  <img src={imagePreview} alt="preview" className="w-full h-auto object-contain max-h-[75vh]" />
                </div>
              </div>
            </div>
          </>
        )}
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
