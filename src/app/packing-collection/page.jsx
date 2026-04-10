'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from '@/context/SessionContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import React, { Suspense } from 'react';
import { BiArrowBack, BiSearch, BiMenu } from "react-icons/bi";

// Loading Fallback Component
function LoadingFallback() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      
      <div className="lg:ml-64 flex flex-col flex-1 min-h-screen">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading packing carton data...</p>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

// Main Content Component (wrapped with Suspense)
function PackingCollectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSession();
  const [packingCollections, setPackingCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [packingName, setPackingName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const packingId = searchParams.get('id');

  // Memoize filtered collections to prevent unnecessary re-calculations
  const filteredCollections = useMemo(() => {
    return packingCollections.filter(collection => {
      const matchesSearch = collection.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           collection.customer_id?.toString().includes(searchTerm.toLowerCase()) ||
                           collection.amount?.toString().includes(searchTerm.toLowerCase()) ||
                           collection.collection_date?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           collection.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [packingCollections, searchTerm]);

  // Memoize pagination calculations
  const { totalPages, startIndex, endIndex, paginatedCollections } = useMemo(() => {
    const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCollections = filteredCollections.slice(startIndex, endIndex);
    return { totalPages, startIndex, endIndex, paginatedCollections };
  }, [filteredCollections, currentPage, itemsPerPage]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && packingId) {
      checkPermissions();
    }
  }, [user, authLoading, packingId]);

  const checkPermissions = async () => {
    try {
      const response = await fetch('/api/check-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: user?.id,
          user_role: user?.role,
          module_name: 'Packing'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const perms = data.permissions || data;
        setHasPermission(perms.can_view === true);
        if (!perms.can_view) {
          router.push('/dashboard');
        }
      } else {
        setHasPermission(false);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
      router.push('/dashboard');
    }
  };

  const fetchPackingCollections = async () => {
    try {
      const response = await fetch(`/api/packing-collection?vendor_id=${packingId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPackingCollections(data.collections || []);
          setPackingName(data.vendor_name || '');
        } else {
          console.error('API error:', data.error);
        }
      }
    } catch (error) {
      console.error('Error fetching packing collections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission && packingId) {
      fetchPackingCollections();
    }
  }, [hasPermission, packingId]);


  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchTerm]);

  useEffect(() => {
    const total = filteredCollections.reduce((sum, collection) => sum + parseFloat(collection.amount || 0), 0);
    setTotalAmount(total);
  }, [filteredCollections]);

  if (authLoading || loading) {
    return <LoadingFallback />;
  }

  if (!hasPermission) {
    return null;
  }

  if (!packingId) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
            <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl">
              <Sidebar onClose={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Fixed Sidebar - Desktop Only */}
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        
        <div className="lg:ml-64 flex flex-col flex-1 min-h-screen">
          <Header onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
          
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {/* Mobile Menu Toggle */}
                  <button
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    className="lg:hidden p-2 text-gray-600 hover:text-yellow-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <BiMenu className="text-xl" />
                  </button>
                  
                  <button
                    onClick={() => router.push('/packing')}
                    className="text-yellow-600 hover:text-yellow-800 flex items-center gap-2"
                  >
                    <BiArrowBack className="text-xl" />
                    <span className="hidden sm:inline">Back to Packing</span>
                    <span className="sm:hidden">Back</span>
                  </button>
                </div>
                
                <h1 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">Error</h1>
                <p className="text-gray-600 text-sm sm:text-base px-4">Packing ID is required. Please use: /packing-collection?id=2</p>
              </div>
            </div>
          </main>
          
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl">
            <Sidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Fixed Sidebar - Desktop Only */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      
      {/* Main Content Area with margin for sidebar */}
      <div className="lg:ml-64 flex flex-col flex-1 min-h-screen">
        <Header onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            {/* Header with back button and mobile menu */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:text-yellow-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <BiMenu className="text-xl" />
                </button>
                
                <button
                  onClick={() => router.push('/packing')}
                  className="text-yellow-600 hover:text-yellow-800 flex items-center gap-2"
                >
                  <BiArrowBack className="text-xl" />
                  <span className="hidden sm:inline">Back to Packing</span>
                  <span className="sm:hidden">Back</span>
                </button>
              </div>
              
              <h1 className="text-xl sm:text-3xl font-bold text-gray-800 truncate">
                Packing In - {packingName || `Packing ${packingId}`}
              </h1>
            </div>

            {/* Search and Total Amount */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="relative">
                <BiSearch className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="text"
                  placeholder="Search by customer name, ID, amount, date, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
                />
              </div>
              
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-yellow-800 font-semibold text-sm sm:text-base">Total Amount:</span>
                <span className="text-green-600 font-bold text-lg sm:text-xl">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Packing Collections Cards - Mobile Only */}
            <div className="lg:hidden space-y-3">
              {paginatedCollections.map((collection, index) => (
                <div key={startIndex + index} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="p-3 sm:p-4 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                          {collection.customer_name || `Customer ${collection.customer_id}`}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                          <span className="text-gray-600 text-sm">
                            <span className="font-medium">Date:</span> {new Date(collection.collection_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-base sm:text-lg font-bold text-green-600">
                          &#8377;{parseFloat(collection.amount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Notes */}
                  {(collection.notes && collection.notes.trim() !== '') && (
                    <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 text-sm font-medium">Notes:</span>
                        <span className="text-gray-700 text-sm flex-1 break-words">
                          {collection.notes}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        ID: {collection.customer_id}
                      </div>
                      <div className="text-xs text-gray-400">
                        #{startIndex + index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredCollections.length === 0 && (
                <div className="text-center py-8 sm:py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                  <div className="text-3xl sm:text-4xl mb-4">&#128193;</div>
                  <p className="text-base sm:text-lg font-medium">
                    {searchTerm ? 'No records found' : 'No packing records found'}
                  </p>
                  <p className="text-sm mt-2 px-4">
                    {searchTerm ? 'Try adjusting your search' : 'No collections available'}
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Table - Hidden on Mobile */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Customer Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Collection Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCollections.map((collection, index) => (
                    <tr key={startIndex + index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        {collection.customer_name || `Customer ${collection.customer_id}`}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-green-600 font-semibold">
                          &#8377;{parseFloat(collection.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(collection.collection_date).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-gray-600 text-sm">
                          {collection.notes || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCollections.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No packing carton records found matching your search' : 'No packing carton records found for this packing'}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredCollections.length > 0 && (
              <div className="mt-4 flex flex-col gap-4">
                {/* Items per page and info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">Items per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 text-center sm:text-right">
                    {startIndex + 1}-{Math.min(endIndex, filteredCollections.length)} of {filteredCollections.length}
                  </span>
                </div>

                {/* Page Navigation */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Prev
                      </button>

                      <div className="flex gap-1 flex-wrap justify-center">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 text-sm border rounded min-w-[2.5rem] ${
                                currentPage === pageNum
                                  ? 'bg-yellow-500 text-white border-yellow-500'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

// Main Export Component with Suspense
export default function PackingCollectionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PackingCollectionContent />
    </Suspense>
  );
}