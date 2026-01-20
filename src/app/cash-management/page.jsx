//src/app/nb-balance/cash-managemnet/page.jsx
'use client';
import { useSession } from '@/context/SessionContext';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

// Format amount to Indian Rupee
function formatIndianRupee(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Loading component for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
    </div>
  );
}

// Main content component wrapped in Suspense
function CashManagementContent() {
  const { user } = useSession();
  const [cashData, setCashData] = useState([]);
  const [totalCash, setTotalCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({ can_create: false });
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    paidTo: '',
    reason: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10
  });
  
  const router = useRouter();

  // Fetch data with current filters and pagination
  const fetchCashData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await fetch(`/api/nb-balance/cash-management?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setCashData(result.data.expenses);
        setTotalCash(result.data.totalCash);
        setPagination(prev => ({
          ...prev,
          ...result.data.pagination
        }));
      } else {
        console.error('Failed to fetch data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching cash data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]);

  // Check permissions and fetch data
  useEffect(() => {
    if (user) {
      checkPermissions();
    }
  }, [user]);

  const checkPermissions = async () => {
    if (!user || !user.id) {
      fetchCashData();
      return;
    }

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setPermissions({ can_create: true });
      fetchCashData();
      return;
    }

    // Check cached permissions
    if (user.permissions && user.permissions['NB Accounts']) {
      const nbPerms = user.permissions['NB Accounts'];
      setPermissions({ can_create: nbPerms.can_create || false });
      fetchCashData();
      return;
    }

    // Check cache
    const cacheKey = `perms_${user.id}_NB Accounts`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      setPermissions({ can_create: cachedPerms.can_create || false });
      fetchCashData();
      return;
    }

    try {
      const moduleName = 'NB Accounts';
      const createRes = await fetch(
        `/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`
      );
      const createData = await createRes.json();
      setPermissions({ can_create: createData.allowed || false });
      fetchCashData();
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions({ can_create: false });
      fetchCashData();
    }
  };

  // Handle filter changes with debounce
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on filter change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
      paidTo: '',
      reason: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Pagination handlers
  const goToPage = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const nextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  };

  const prevPage = () => {
    if (pagination.currentPage > 1) {
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {/* Header Section */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center py-6">
                <button 
                  onClick={() => router.back()}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Cash History</h1>
                  <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
                    <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                    <span>/</span>
                    <span className="text-gray-900">Cash History</span>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* Total Cash Card */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white text-lg font-semibold">Total Cash Balance</h2>
                  <p className="text-white text-3xl font-bold mt-2">
                    {formatIndianRupee(totalCash)}
                  </p>
                </div>
                <div className="text-white">
                  {/* Indian Rupee Symbol */}
                  <svg className="w-12 h-12 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Cash List</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button 
                    onClick={clearFilters}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Clear Filters
                  </button>
                  {permissions.can_create && (
                    <div className="flex gap-3">
                      {/* केवल Create Expense button है */}
                      <Link 
                        href="/create-expense"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base text-center"
                      >
                        Create Expense
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Search and Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search customer, details..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Loading Indicator */}
              {loading && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              {/* Desktop Table */}
              {!loading && (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          {/* Actions column हटा दिया गया है */}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cashData.length > 0 ? (
                          cashData.map((expense, index) => {
                            // सभी transactions Outward हैं
                            return (
                            <tr key={expense.id} className={`hover:bg-gray-50 transition-colors`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(pagination.currentPage - 1) * pagination.limit + index + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(expense.payment_date).toLocaleDateString('en-IN')}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="font-medium">
                                  {expense.customer_name || expense.customerName || expense.title || '-'}
                                </div>
                                {expense.details && (
                                  <div className="text-gray-500 text-xs mt-1">{expense.details}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.receiver || expense.paid_to || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {/* सिर्फ Outward बैज */}
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Outward
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.reason || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                                {/* हमेशा minus sign रहेगा */}
                                -{formatIndianRupee(Math.abs(expense.amount))}
                              </td>
                              {/* Edit button हटा दिया गया है */}
                            </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                              No expenses found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {cashData.length > 0 ? (
                      cashData.map((expense, index) => {
                        return (
                        <div key={expense.id} className={`border border-red-200 rounded-lg p-4 space-y-3`}>
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-gray-500">
                              #{(pagination.currentPage - 1) * pagination.limit + index + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Outward
                              </span>
                              <span className="text-lg font-semibold text-red-600">
                                -{formatIndianRupee(Math.abs(expense.amount))}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-gray-900 text-lg">
                              {expense.customer_name || expense.customerName || expense.title || '-'}
                            </h3>
                            {expense.details && (
                              <p className="text-sm text-gray-500 mt-1">{expense.details}</p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Date:</span>
                              <span className="text-gray-900">
                                {new Date(expense.payment_date).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Receiver:</span>
                              <span className="text-gray-900">{expense.receiver || expense.paid_to || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Reason:</span>
                              <span className="text-gray-900">{expense.reason || '-'}</span>
                            </div>
                          </div>
                          
                          {/* Mobile view में भी Edit button नहीं है */}
                        </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No expenses found
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {cashData.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4">
                      <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                        Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)} of{' '}
                        {pagination.totalRecords} entries
                      </div>
                      
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={prevPage}
                          disabled={!pagination.hasPreviousPage}
                          className={`px-3 py-1 rounded-lg border ${
                            pagination.hasPreviousPage
                              ? 'border-gray-300 hover:bg-gray-50 text-gray-700'
                              : 'border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Previous
                        </button>
                        
                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-3 py-1 rounded-lg border ${
                                pagination.currentPage === pageNum
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={nextPage}
                          disabled={!pagination.hasNextPage}
                          className={`px-3 py-1 rounded-lg border ${
                            pagination.hasNextPage
                              ? 'border-gray-300 hover:bg-gray-50 text-gray-700'
                              : 'border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
        
        {/* Footer - Only show when not loading */}
        {!loading && <Footer />}
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function CashManagementPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CashManagementContent />
    </Suspense>
  );
}