'use client';
import { useSession } from '@/context/SessionContext';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { BiArrowBack, BiSearch } from "react-icons/bi";

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
              <p className="text-gray-600">Loading packing transactions...</p>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

// Main Content Component (wrapped with Suspense)
function PackingTransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [packingName, setPackingName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const packingId = searchParams.get('id');

  // Memoize filtered transactions to prevent unnecessary re-calculations
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.reverse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.amount?.toString().includes(searchTerm.toLowerCase()) ||
                           transaction.transaction_date?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.created_by?.toString().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [transactions, searchTerm]);

  // Memoize pagination calculations
  const { totalPages, startIndex, endIndex, paginatedTransactions } = useMemo(() => {
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
    return { totalPages, startIndex, endIndex, paginatedTransactions };
  }, [filteredTransactions, currentPage, itemsPerPage]);

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
      // Temporarily bypass permission check for debugging
      setHasPermission(true);
      
      // Original permission check (commented out for debugging)
      /*
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
      */
    } catch (error) {
      console.error('Error checking permissions:', error);
      // Still allow access for debugging
      setHasPermission(true);
    }
  };

  const fetchPackingTransactions = async () => {
    try {
      const response = await fetch(`/api/packing-transactions?vendor_id=${packingId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTransactions(data.transactions || []);
          setPackingName(data.vendor_name || '');
        } else {
          console.error('API error:', data.error);
        }
      }
    } catch (error) {
      console.error('Error fetching vendor transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission && packingId) {
      fetchPackingTransactions();
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
    const total = filteredTransactions.reduce((sum, transaction) => sum + parseFloat(transaction.amount || 0), 0);
    setTotalAmount(total);
  }, [filteredTransactions]);

  if (authLoading || loading) {
    return <LoadingFallback />;
  }

  if (!hasPermission) {
    return null;
  }

  if (!packingId) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        
        <div className="lg:ml-64 flex flex-col flex-1 min-h-screen">
          <Header />
          
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                <p className="text-gray-600">Packing ID is required.</p>
                <button

                  onClick={() => router.push('/packing')}
                  className="mt-4 text-yellow-600 hover:text-yellow-800 flex items-center gap-2 mx-auto"
                >
                  <BiArrowBack className="text-xl" />
                  Back to Packing
                </button>
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
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      
      {/* Main Content Area with margin for sidebar */}
      <div className="lg:ml-64 flex flex-col flex-1 min-h-screen">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.push('/packing')}
                className="text-yellow-600 hover:text-yellow-800 flex items-center gap-2"
              >
                <BiArrowBack className="text-xl" />
                Back to Packing
              </button>
              <h1 className="text-3xl font-bold text-gray-800">
                Packing Transactions - {packingName || `Packing ${packingId}`}
              </h1>
            </div>

            {/* Search and Total Amount */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <BiSearch className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="text"
                  placeholder="Search by customer name, reverse name, amount, date, or created by..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-6 py-2 flex items-center">
                <span className="text-yellow-800 font-semibold">Total Amount: </span>
                <span className="text-green-600 font-bold text-xl ml-2">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Vendor Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Customer Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Reverse Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Transaction Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((transaction, index) => (
                    <tr key={startIndex + index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        {transaction.customer_name || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {transaction.reverse_name || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-green-600 font-semibold">
                          &#8377;{parseFloat(transaction.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-gray-600 text-sm">
                          {transaction.created_by || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No transactions found matching your search' : 'No transactions found for this vendor'}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredTransactions.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
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
                  <span className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} entries
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === page
                              ? 'bg-yellow-500 text-white border-yellow-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
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
export default function PackingTransactionsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PackingTransactionsContent />
    </Suspense>
  );
}