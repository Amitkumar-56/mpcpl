'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerHistoryContent() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [amtLimit, setAmtLimit] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [summary, setSummary] = useState({});
  const [dayLimitInfo, setDayLimitInfo] = useState({ hasDayLimit: false });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const cl_id = searchParams.get('cl_id');

  useEffect(() => {
    fetchData();
  }, [selectedProduct, cl_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      
      if (cl_id) {
        params.append('cl_id', cl_id);
      }
      
      if (selectedProduct) {
        params.append('pname', selectedProduct);
      }

      console.log('🔄 Fetching data with params:', params.toString());
      
      const response = await fetch(`/api/cst/customer-history?${params}`);
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 API Response Data:', data);

      if (data.success) {
        setTransactions(data.transactions || []);
        setProducts(data.products || []);
        setBalance(data.balance || 0);
        setAmtLimit(data.amtLimit || 0);
        setOpeningBalance(data.openingBalance || 0);
        setCustomerInfo(data.customer || {});
        setSummary(data.summary || {});
        setDayLimitInfo(data.dayLimitInfo || { hasDayLimit: false });
        
        console.log('✅ Data loaded successfully:', {
          transactionsCount: data.transactions?.length,
          balance: data.balance,
          amtLimit: data.amtLimit
        });
        
        if (!data.transactions || data.transactions.length === 0) {
          setError('No transaction history found for this customer');
        } else {
          setError('');
        }
      } else {
        console.error('❌ API returned error:', data.message);
        setError(data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('❌ Fetch Error:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (e) => {
    setSelectedProduct(e.target.value);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleBack = () => {
    router.back();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getClientTypeText = (type) => {
    switch(type) {
      case 1: return 'Prepaid';
      case 2: return 'Postpaid';
      case 3: return 'Day Limit';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
                <p className="text-sm text-gray-600">
                  {customerInfo?.name ? `Customer: ${customerInfo.name}` : 'View transaction history'}
                  {customerInfo?.client_type && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {getClientTypeText(customerInfo.client_type)}
                    </span>
                  )}
                </p>
                {cl_id && (
                  <p className="text-xs text-gray-500 mt-1">Customer ID: {cl_id}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
              <button 
                onClick={handleRefresh}
                className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          )}

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {/* Balance Summary - 3 columns only */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className="text-2xl font-bold text-blue-600">₹{formatCurrency(balance)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                  <p className="text-sm text-gray-600">Opening Balance</p>
                  <p className="text-2xl font-bold text-green-600">₹{formatCurrency(openingBalance)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
                  <p className="text-sm text-gray-600">Amount Limit</p>
                  <p className="text-2xl font-bold text-purple-600">₹{formatCurrency(amtLimit)}</p>
                </div>
              </div>

              {/* Day Limit Details - Only show if customer has day limit */}
              {dayLimitInfo.hasDayLimit && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">Day Limit Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-yellow-700">Day Limit:</span>
                      <span className="ml-2 text-yellow-600">₹{formatCurrency(dayLimitInfo.dayLimit)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-yellow-700">Used Today:</span>
                      <span className="ml-2 text-yellow-600">₹{formatCurrency(dayLimitInfo.dayAmount)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-yellow-700">Remaining Today:</span>
                      <span className="ml-2 text-yellow-600">
                        ₹{formatCurrency(dayLimitInfo.dayLimit - dayLimitInfo.dayAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Filter */}
              {products.length > 0 && (
                <div className="mb-6">
                  <label htmlFor="product-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Product:
                  </label>
                  <select
                    id="product-filter"
                    value={selectedProduct}
                    onChange={handleProductChange}
                    className="block w-full max-w-xs pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">All Products</option>
                    {products.map((product) => (
                      <option key={product} value={product}>
                        {product}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Transactions Table */}
              {transactions.length > 0 ? (
                <>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Station
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vehicle
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount (₹)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Outstanding (₹)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Remaining Limit (₹)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((transaction) => (
                          <tr 
                            key={transaction.id} 
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(transaction.filling_date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.station_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.pname}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.vehicle_number}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.trans_type === 'credit' 
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : transaction.trans_type === 'Outward'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {transaction.trans_type?.toUpperCase() || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                              {transaction.filling_qty ? `${transaction.filling_qty}L` : '0L'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                              {transaction.amount ? (
                                <span className="text-green-600">₹{formatCurrency(transaction.amount)}</span>
                              ) : (
                                <span className="text-gray-400">₹0</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                              {transaction.new_amount ? (
                                <span className="text-orange-600">₹{formatCurrency(transaction.new_amount)}</span>
                              ) : (
                                <span className="text-gray-400">₹0</span>
                              )}
                            </td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-right ${
                              transaction.remaining_limit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ₹{formatCurrency(transaction.remaining_limit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="text-center">
                        <span className="font-semibold">Showing {transactions.length} transactions</span>
                        {selectedProduct && ` filtered by ${selectedProduct}`}
                      </div>
                      <div className="text-center">
                        <span className="font-semibold">Total Credit: </span>
                        ₹{formatCurrency(summary.totalCredit)}
                      </div>
                      <div className="text-center">
                        <span className="font-semibold">Total Debit: </span>
                        ₹{formatCurrency(summary.totalDebit)}
                      </div>
                      <div className="text-center">
                        <span className="font-semibold">Total Filling: </span>
                        {summary.totalFillingQty ? `${summary.totalFillingQty}L` : '0L'}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                !error && (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg">No transactions found</p>
                    <p className="text-gray-400 text-sm mt-2">No transaction history available for this customer</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}