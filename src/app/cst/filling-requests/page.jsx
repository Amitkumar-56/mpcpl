// src/app/cst/filling-requests/page.jsx
"use client";

import Footer from "@/components/Footer";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FillingRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [customerId, setCustomerId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get customer ID from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("customer");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCustomerId(user.id);
    }
  }, []);

  // Fetch filling requests
  const fetchFillingRequests = async (filter = 'All') => {
    if (!customerId) return;
    
    try {
      setLoading(true);
      setError('');
      
      let url = `/api/cst/filling-requests?cid=${customerId}`;
      if (filter !== 'All') {
        url += `&status=${filter}`;
      }
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched data:', data);
      
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setError(data.message || 'Failed to fetch requests');
        setRequests([]);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when filter or customerId changes
  useEffect(() => {
    if (customerId) {
      fetchFillingRequests(statusFilter);
    }
  }, [statusFilter, customerId]);

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

  // Handle filter change
  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
  };

  // Handle retry
  const handleRetry = () => {
    fetchFillingRequests(statusFilter);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when clicking on overlay
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (!customerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <CstHeader onMenuClick={toggleSidebar} />
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0 md:ml-64' : 'ml-0'}`}>
            <main className="flex-1 p-8 flex items-center justify-center">
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
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar  />
  
        <div className="flex flex-col flex-1 overflow-hidden">
          <CstHeader />
        
        {/* Main Content */}
      
          <main className="p-4 md:p-8  ">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Filling Requests</h1>
                  <p className="text-gray-600 mt-2">Manage your filling requests</p>
                </div>
                <Link 
                  href="/cst/filling-requests/create-request"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>+ Create Request</span>
                </Link>
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Number</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {requests.map((request, index) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.rid}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.product_name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.station_name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.vehicle_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.driver_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.qty}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusClass(request.status)}`}>
                                {mapStatus(request.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(request.created).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">{request.rid}</h3>
                            <p className="text-sm text-gray-600">{request.product_name || 'N/A'} • {request.station_name || 'N/A'}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusClass(request.status)}`}>
                            {mapStatus(request.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Vehicle:</strong> {request.vehicle_number}</div>
                          <div><strong>Driver:</strong> {request.driver_number}</div>
                          <div><strong>Qty:</strong> {request.qty}</div>
                          <div><strong>Date:</strong> {new Date(request.created).toLocaleDateString()}</div>
                        </div>
                        
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
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">No filling requests found</div>
                <div className="text-gray-400 text-sm mb-4">
                  {statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} requests` : 'No requests yet'}
                </div>
                <Link 
                  href="/cst/filling-requests/create-request"
                  className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                  Create your first request
                </Link>
              </div>
            )}
          </main>

          <Footer />
      </div>
      
    
    
    </div>
  );
}