// src/app/customers/client-history/TransactionHistory.jsx
'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TransactionHistory() {
  const [historyData, setHistoryData] = useState({ transactions: [], pagination: {} });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerDetails, setCustomerDetails] = useState(null);
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
      fetchCustomerDetails();
    }
  }, [customerId, page, searchQuery, productFilter]);

  const fetchCustomerDetails = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const result = await res.json();
      if (result.success) setCustomerDetails(result.data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?customer_id=${customerId}`);
      const result = await res.json();
      if (result.success) setProducts(result.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  };

  const fetchClientHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
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
        if (result.data.customer) {
          setCustomerDetails(result.data.customer);
        }
      } else {
        setError(result.message || 'Failed to fetch transaction history');
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
    // CSV export functionality
    if (historyData.transactions && historyData.transactions.length > 0) {
      const headers = [
        'Station', 'Date', 'Product', 'Vehicle', 'Type', 'Quantity', 
        'Deal Price', 'Amount', 'Credit', 'Outstanding Amount', 'Status'
      ];
      
      const csvData = historyData.transactions.map(item => [
        item.station_name || 'N/A',
        item.completed_date ? new Date(item.completed_date).toLocaleDateString() : 'N/A',
        item.product_name || 'N/A',
        item.vehicle_number || 'N/A',
        item.trans_type || 'N/A',
        `${item.quantity || '0'} Ltr`,
        `₹${parseFloat(item.deal_price || 0).toFixed(2)}`,
        `₹${parseFloat(item.amount || 0).toFixed(2)}`,
        `₹${parseFloat(item.credit || 0).toFixed(2)}`,
        `₹${parseFloat(item.outstanding_amount || 0).toFixed(2)}`,
        item.is_pending ? 'Pending' : 'Completed'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transaction-history-${customerId}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      alert('No data available to export');
    }
  };

  // Calculate outstanding balance safely
  const outstandingBalance = historyData.transactions?.reduce((total, item) => {
    return total + (parseFloat(item.outstanding_amount) || 0);
  }, 0) || 0;

  // Calculate total credit limit
  const totalCreditLimit = customerDetails?.credit_limit || 0;

  // Calculate available limit
  const availableLimit = totalCreditLimit - outstandingBalance;

  // Check eligibility based on pending invoices and days
  const isEligible = outstandingBalance === 0 || 
    (historyData.transactions?.every(transaction => 
      !transaction.is_pending || 
      (transaction.pending_days && transaction.pending_days <= (customerDetails?.grace_period || 0))
    ));

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
    '#', 'Station', 'Completed Date', 'Product', 'Vehicle', 
    'Type', 'Loading Qty (Ltr)', 'Deal Price', 'Amount', 'Credit', 
    'Outstanding Amount', 'Remaining Limit', 'Pending Days', 'Status', 'Updated By'
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
              {/* Eligibility Status */}
              <span className={`px-3 py-1 rounded-md font-medium text-sm ${
                isEligible 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}>
                {isEligible ? 'Eligible' : 'Not Eligible'}
              </span>
              
              {/* Outstanding Balance */}
              <span className="bg-blue-500 text-white px-3 py-1 rounded-md font-medium text-sm">
                Outstanding: ₹{outstandingBalance.toFixed(2)}
              </span>
              
              {/* Available Limit */}
              <span className="bg-green-500 text-white px-3 py-1 rounded-md font-medium text-sm">
                Available Limit: ₹{availableLimit.toFixed(2)}
              </span>
              
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm"
              >
                <span>⬇</span>
                Export CSV
              </button>
            </div>
          </div>

          {/* Customer Summary Card */}
          {customerDetails && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Customer Name</div>
                  <div className="font-semibold">{customerDetails.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Credit Limit</div>
                  <div className="font-semibold">₹{customerDetails.credit_limit?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Grace Period</div>
                  <div className="font-semibold">{customerDetails.grace_period} days</div>
                </div>
                <div>
                  <div className="text-gray-500">Account Status</div>
                  <div className={`font-semibold ${
                    customerDetails.account_status === 'active' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {customerDetails.account_status?.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                          {item.completed_date ? new Date(item.completed_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.product_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.vehicle_number || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-md text-white text-xs font-medium ${
                            item.trans_type === 'credit' ? 'bg-green-500' : 
                            item.trans_type === 'inward' ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}>
                            {item.trans_type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.quantity || '0'} Ltr
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{parseFloat(item.deal_price || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          ₹{parseFloat(item.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">
                          ₹{parseFloat(item.credit || 0).toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${
                          item.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ₹{parseFloat(item.outstanding_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{parseFloat(item.remaining_limit || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.pending_days || 0} days
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-md text-white text-xs font-medium ${
                            item.is_pending ? 'bg-red-500' : 'bg-green-500'
                          }`}>
                            {item.is_pending ? 'Pending' : 'Completed'}
                          </span>
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
                        {item.completed_date ? new Date(item.completed_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Product</span>
                      <span className="font-semibold">{item.product_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className={`px-2 py-1 rounded text-white text-xs ${
                        item.trans_type === 'credit' ? 'bg-green-500' : 
                        item.trans_type === 'inward' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}>
                        {item.trans_type || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Qty</span>
                      <span className="font-semibold">{item.quantity || '0'} Ltr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Deal Price</span>
                      <span className="font-semibold">₹{parseFloat(item.deal_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-semibold text-blue-600">
                        ₹{parseFloat(item.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Outstanding</span>
                      <span className={`font-semibold ${
                        item.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ₹{parseFloat(item.outstanding_amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className={`px-2 py-1 rounded text-white text-xs ${
                        item.is_pending ? 'bg-red-500' : 'bg-green-500'
                      }`}>
                        {item.is_pending ? 'Pending' : 'Completed'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pending Days</span>
                      <span className="font-semibold">{item.pending_days || 0} days</span>
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