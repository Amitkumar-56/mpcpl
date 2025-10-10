'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TransactionHistory() {
  const [historyData, setHistoryData] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const customerId = searchParams.get('id');
  const page = parseInt(searchParams.get('page')) || 1;
  const searchQuery = searchParams.get('search') || '';
  const productFilter = searchParams.get('product') || '';
  const limit = 10;

  useEffect(() => {
    if (customerId) {
      fetchClientHistory();
      fetchProducts();
    }
  }, [customerId, page, searchQuery, productFilter]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?customer_id=${customerId}`);
      const result = await res.json();
      if (result.success) setProducts(result.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchClientHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        customer_id: customerId,
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(productFilter && { product: productFilter })
      });
      
      const res = await fetch(`/api/customers/client-history?${params}`);
      const result = await res.json();
      
      if (result.success) {
        setHistoryData(result.data);
      } else {
        setError(result.error || 'Failed to fetch client history');
      }
    } catch (err) {
      setError('Error fetching transaction data');
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductFilter = (product) => {
    const params = new URLSearchParams(searchParams);
    if (product) params.set('product', product);
    else params.delete('product');
    params.set('page', '1');
    router.replace(`${pathname}?${params}`);
  };

  const handleSearch = (term) => {
    const params = new URLSearchParams(searchParams);
    if (term) params.set('search', term);
    else params.delete('search');
    params.set('page', '1');
    router.replace(`${pathname}?${params}`);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.replace(`${pathname}?${params}`);
  };

  const handleExportCSV = () => {
    // Implement CSV export functionality
    alert('Export CSV functionality to be implemented');
  };

  // Calculate outstanding balance safely
  const outstandingBalance = historyData.transactions?.reduce((total, item) => {
    return total + (parseFloat(item.amount) || 0);
  }, 0) || 0;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-b-4 border-gray-300"></div>
          </div>
        </div>
      </div>
    );
  }

  const headers = [
    '#', 'Station', 'Completed Date', 'Product', 'Sub Product', 'Vehicle', 
    'Type', 'Loading Qty', 'Amount', 'Credit', 'Credit Date', 'Balance', 
    'Remaining Limit', 'Limit', 'Increase Amount', 'Decrease Amount', 'Updated By'
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <Link 
                href="/customers" 
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                ←
              </Link>
              <div className="ml-4">
                <h1 className="text-2xl font-semibold text-gray-900">Transaction History</h1>
                <nav className="text-sm text-gray-500">
                  <ol className="flex space-x-2">
                    <li>
                      <Link href="/dashboard" className="hover:underline hover:text-gray-700">
                        Home
                      </Link>
                    </li>
                    <li>/</li>
                    <li>
                      <Link href="/customers" className="hover:underline hover:text-gray-700">
                        Customers
                      </Link>
                    </li>
                    <li>/</li>
                    <li className="text-gray-700">Transaction History</li>
                  </ol>
                </nav>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-md font-medium text-sm">
                Outstanding: ₹{outstandingBalance.toFixed(2)}
              </span>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors text-sm"
              >
                <span>⬇</span>
                Export CSV
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          {/* Filters Section */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  Filter by Product:
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={productFilter} 
                  onChange={e => handleProductFilter(e.target.value)}
                >
                  <option value="">All Products</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  Search:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="w-full border border-gray-300 rounded-md p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                  {searchQuery && (
                    <button 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => handleSearch('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Info */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, historyData.pagination?.totalCount || 0)} of {historyData.pagination?.totalCount || 0} transactions 
            {(searchQuery || productFilter) && ' (filtered)'}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    {headers.map((header, index) => (
                      <th key={index} className="px-4 py-3 text-left text-sm font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyData.transactions?.length > 0 ? (
                    historyData.transactions.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {((page - 1) * limit) + index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.station_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.product_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.sub_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.vehicle_number || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-md text-white text-xs font-medium ${
                            item.trans_type === 'credit' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}>
                            {item.trans_type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.quantity || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          ₹{parseFloat(item.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">
                          ₹{parseFloat(item.credit || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.credit_date || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ₹{parseFloat(item.balance || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.remaining_limit || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.limit || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.increase_amount || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.decrease_amount || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.employee_name || 'System'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={headers.length} className="px-4 py-8 text-center text-gray-500">
                        No transaction history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {historyData.transactions?.length > 0 ? (
              historyData.transactions.map((item, index) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">#</span>
                      <span className="font-semibold">{((page - 1) * limit) + index + 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Station</span>
                      <span className="font-semibold">{item.station_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date</span>
                      <span className="font-semibold">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Product</span>
                      <span className="font-semibold">{item.product_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className={`px-2 py-1 rounded text-white text-xs ${
                        item.trans_type === 'credit' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}>
                        {item.trans_type || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-semibold text-blue-600">
                        ₹{parseFloat(item.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Balance</span>
                      <span className="font-semibold">
                        ₹{parseFloat(item.balance || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Updated By</span>
                      <span className="font-semibold">{item.employee_name || 'System'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                No transaction history found
              </div>
            )}
          </div>

          {/* Pagination */}
          {historyData.pagination && historyData.pagination.totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
              <div className="text-sm text-gray-600">
                Page {historyData.pagination.currentPage} of {historyData.pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handlePageChange(page - 1)} 
                  disabled={!historyData.pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, historyData.pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (historyData.pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= historyData.pagination.totalPages - 2) {
                    pageNum = historyData.pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button 
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 border rounded-md transition-colors ${
                        page === pageNum 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => handlePageChange(page + 1)} 
                  disabled={!historyData.pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}