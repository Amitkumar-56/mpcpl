'use client';

import { Suspense, useEffect, useState } from "react";
import { BiCalendar, BiSearch } from "react-icons/bi";

// Loading component
function OldFillingHistoryLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading old filling history...</p>
      </div>
    </div>
  );
}

// Main content component - wrapped in Suspense boundary
function OldFillingHistoryContent() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [customerInfo, setCustomerInfo] = useState(null);

  // Fetch old filling history
  const fetchOldFillingHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user data from localStorage/sessionStorage
      let userData = null;
      try {
        const savedCustomer = localStorage.getItem("customer") || sessionStorage.getItem("customer");
        if (savedCustomer) {
          userData = JSON.parse(savedCustomer);
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }

      if (!userData || !userData.id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching OLD filling history for user:', userData);
      console.log('📧 User Email:', userData.email);
      console.log('🆔 User ID:', userData.id);

      // Fetch from old filling history API
      const response = await fetch(`/api/old-filling-history?email=${encodeURIComponent(userData.email)}&page=${currentPage}&search=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch old filling history');
      }

      console.log('📊 Old Filling History Data:', data);
      
      setHistoryData(data.history || []);
      setCustomerInfo(data.customerInfo || null);
      setTotalPages(data.pagination?.totalPages || 1);
      
    } catch (error) {
      console.error('❌ Error fetching old filling history:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOldFillingHistory();
  }, [currentPage, searchTerm]);

  const getTransactionTypeStyle = (transType) => {
    if (!transType) return 'bg-gray-100 text-gray-800';
    
    const type = transType.toLowerCase();
    if (type === 'outward' || type === 'out' || type === 'sale') {
      return 'bg-red-100 text-red-800';
    } else if (type === 'inward' || type === 'in' || type === 'purchase') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-orange-100 text-orange-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOldFillingHistory();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <OldFillingHistoryLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <div className="text-gray-600 mb-6">{error}</div>
          <button 
            onClick={fetchOldFillingHistory}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-4 md:p-6 max-w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Old Filling History
          </h1>
          <p className="text-gray-600 mb-4">View your complete filling history from old system</p>
          
          {customerInfo && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-orange-800 mb-2">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">ID:</span>
                  <span className="ml-2 font-medium">{customerInfo.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">{customerInfo.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{customerInfo.email}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-orange-600">
                📜 Data from old filling history system
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by date, amount, product, vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-4 py-3 border-b bg-orange-50">
            <h2 className="font-bold text-orange-800">Old Filling History</h2>
            <p className="text-sm text-gray-600">
              Showing {historyData.length} records from old system
            </p>
          </div>

          {historyData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Station</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Completed Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">RID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">FS ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Trans Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Current Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Filling Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Credit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">IN Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">D Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Limit Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Credit Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Available Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Old Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">New Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Remaining Limit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Updated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyData.map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.station_name || 'Unknown Station'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(record.filling_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.pname || 'Unknown Product'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.rid || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.fs_id || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeStyle(record.trans_type)}`}>
                          {record.trans_type || 'Filling'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.current_stock || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.filling_qty || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(record.credit)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(record.in_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(record.d_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          {record.limit_type || 'Standard'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(record.credit_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.available_stock || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(record.old_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(record.new_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(record.remaining_limit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.created_by || 'System'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(record.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BiCalendar className="mx-auto text-gray-400 text-4xl mb-4" />
              <p className="text-gray-500">No old filling history records found</p>
              <p className="text-sm text-gray-400 mt-2">
                This shows data from old filling history system only
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded ${
                    currentPage === page
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OldFillingHistoryPage() {
  return (
    <Suspense fallback={<OldFillingHistoryLoading />}>
      <OldFillingHistoryContent />
    </Suspense>
  );
}