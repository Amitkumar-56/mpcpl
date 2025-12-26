'use client';
import ExportButton from '@/components/ExportButton';
import Link from 'next/link';
import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

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
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-red-500 text-center">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Error Loading Page</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={onRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Content Component
function LRManagementContent() {
  const [shipments, setShipments] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only fetch if component is mounted
    let isMounted = true;
    
    if (isMounted) {
      fetchShipments();
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/lr-list', {
        signal: controller.signal,
        credentials: 'include', // Include cookies for auth
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `Failed to fetch shipments (${response.status})`);
      }
      
      const data = await response.json();
      
      // Check if data has expected structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server');
      }
      
      setShipments(data.shipments || []);
      setPermissions(data.permissions || {});
      
      // ✅ Debug: Log permissions to help troubleshoot
      console.log('✅ [LR List] Data loaded successfully:', {
        shipmentsCount: (data.shipments || []).length,
        permissions: data.permissions
      });
      
    } catch (err) {
      // Handle abort (timeout)
      if (err.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else {
        setError(err.message || 'Failed to load shipments. Please try again.');
      }
      console.error('❌ [LR List] Error fetching shipments:', err);
    } finally {
      // ✅ Always set loading to false
      setLoading(false);
    }
  };


  if (loading) {
    return <LoadingFallback />;
  }

  if (error && !shipments.length) {
    return <ErrorFallback error={error} onRetry={fetchShipments} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ FIX: Check can_create permission - handle both number and boolean */}
      {(permissions.can_create === 1 || permissions.can_create === true) && (
        <Link 
          href="/create-lr"
          className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 sm:px-6 rounded-full shadow-lg transition duration-200 z-50 flex items-center space-x-2 text-sm sm:text-base"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Create LR</span>
        </Link>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
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

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Shipment List</h2>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipments.length > 0 ? (
                  shipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{shipment.lr_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.consigner}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.consignee}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.from_location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.to_location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.tanker_no}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link 
                            href={`/transport-receipt?id=${shipment.id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-900 transition duration-150"
                          >
                            View
                          </Link>
                          
                          {(permissions.can_edit === 1 || permissions.can_edit === true) && (
                            <>
                              <span className="text-gray-300">|</span>
                              <Link 
                                href={`/create-lr?id=${shipment.id}`}
                                className="text-orange-600 hover:text-orange-900 transition duration-150"
                              >
                                Edit
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No shipments found</p>
                        {(permissions.can_edit === 1 || permissions.can_edit === true) && (
                          <Link 
                            href="/create-lr"
                            className="mt-2 inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition duration-200"
                          >
                            Create First LR
                          </Link>
                        )}
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
                {permissions.can_edit === 1 && (
                  <Link 
                    href="/create-lr"
                    className="mt-3 inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition duration-200 text-sm"
                  >
                    Create First LR
                  </Link>
                )}
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
                    {permissions.can_edit === 1 && (
                      <Link 
                        href={`/create-lr?id=${shipment.id}`}
                        className="text-orange-600 text-sm"
                      >
                        Edit
                      </Link>
                    )}
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<LoadingFallback />}>
            <LRManagementContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
