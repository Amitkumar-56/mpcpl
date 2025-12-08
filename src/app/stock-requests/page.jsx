'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Head from 'next/head';
import Link from 'next/link';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function StockRequestsContent() {
  const [stockRequests, setStockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchStockRequests();
  }, []);

  const fetchStockRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/stock-requests', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include', // Include cookies
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Only logout on actual auth failure, not other errors
        if (response.status === 401 || response.status === 403) {
          console.log('Auth failed, redirecting to login');
          // Clear auth data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('user');
          // Redirect to login
          window.location.replace('/login');
          return;
        }
        
        throw new Error(errorData.error || `Failed to fetch stock requests (${response.status})`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStockRequests(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch stock requests');
        setStockRequests([]);
      }
    } catch (error) {
      console.error('Error fetching stock requests:', error);
      setError(error.message || 'Error fetching stock requests. Please try again.');
      setStockRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status) => {
    // Handle both numeric and string status values
    const statusValue = status?.toString().toLowerCase();
    
    // Map numeric values
    const numericMap = {
      '1': { text: 'Dispatched', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
      '2': { text: 'Processing', className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
      '3': { text: 'Completed', className: 'bg-green-100 text-green-800 border border-green-200' },
      '4': { text: 'Cancelled', className: 'bg-red-100 text-red-800 border border-red-200' }
    };
    
    // Map string values
    const stringMap = {
      'on_the_way': { text: 'On The Way', className: 'bg-purple-100 text-purple-800 border border-purple-200' },
      'pending': { text: 'Pending', className: 'bg-gray-100 text-gray-800 border border-gray-200' },
      'completed': { text: 'Completed', className: 'bg-green-100 text-green-800 border border-green-200' },
      'cancelled': { text: 'Cancelled', className: 'bg-red-100 text-red-800 border border-red-200' },
      'dispatched': { text: 'Dispatched', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
      'processing': { text: 'Processing', className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' }
    };
    
    // Check numeric first, then string
    const statusInfo = numericMap[statusValue] || stringMap[statusValue] || { 
      text: status || 'N/A', 
      className: 'bg-gray-100 text-gray-800 border border-gray-200' 
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading stock requests...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Stock Requests</title>
        <meta name="description" content="Stock requests management" />
      </Head>

      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Header />
          
          <main className="flex-1 overflow-y-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => router.back()}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <h1 className="text-2xl font-semibold text-gray-900">Stock Requests</h1>
                </div>
                <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
                  <Link href="/dashboard" className="hover:text-gray-900">
                    Home
                  </Link>
                  <span>/</span>
                  <span>Stock</span>
                  <span>/</span>
                  <span className="text-gray-900">Requests</span>
                </nav>
              </div>
              
              <Link
                href="/outstanding-history"
                className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Outstanding History
              </Link>
            </div>

            {/* Stock Requests Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">Requests</h2>
              </div>
              
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                {error ? (
                  <div className="p-6 text-center text-red-600">
                    {error}
                  </div>
                ) : stockRequests.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No stock requests found
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice Date
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice#
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Transporter
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                          Transporter Bill#
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Station
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Tanker No.
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ltr
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Sup Invoice
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                          DNCN
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payable
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.id}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.product_name || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                            <Link href={`/supplierinvoice?id=${request.supplier_id}`}>
                              {request.supplier_name || 'No Supplier'}
                            </Link>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(request.invoice_date)}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.invoice_number || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                            {request.transporter_name || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                            {request.transport_number || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.station_name || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                            {request.tanker_no || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.ltr || '0'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                            {request.v_invoice_value || '0'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm hidden xl:table-cell">
                            <Link
                              href={`/stock/dncn?id=${request.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {request.dncn || '0'}
                            </Link>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.payable || '0'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 sm:space-x-3">
                            <Link
                              href={`/supply-details?id=${request.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </Link>
                            <button className="text-green-600 hover:text-green-900">
                              <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <Link
                              href={`/stock/dncn?id=${request.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-600 hover:text-red-900"
                              title="View DN/CN in new tab"
                            >
                              <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default function StockRequests() {
  return (
    <Suspense fallback={null}>
      <StockRequestsContent />
    </Suspense>
  );
}
