'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerHistoryContent() {
  const [historyData, setHistoryData] = useState({ transactions: [], pagination: {} });
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
  const [outstandings, setOutstandings] = useState({ yesterday: 0, today: 0, total: 0 });
  const [notifications, setNotifications] = useState({ lowBalance: false, balanceNotification: null, paymentOverdue: false, paymentNotification: null });
  const [alertMessage, setAlertMessage] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const cl_id = searchParams.get('cl_id');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = 10;

  // Get logged-in customer ID from localStorage/sessionStorage if cl_id not in URL
  const getCustomerId = () => {
    if (cl_id) {
      return cl_id;
    }
    // Try to get from localStorage or sessionStorage
    try {
      const savedCustomer = localStorage.getItem("customer") || sessionStorage.getItem("customer");
      if (savedCustomer) {
        const customerData = JSON.parse(savedCustomer);
        if (customerData.id) {
          // Use com_id if present (for sub-users), otherwise id
          return (customerData.com_id || customerData.id).toString();
        }
      }
    } catch (error) {
      console.error('Error getting customer ID from storage:', error);
    }
    return null;
  };

  const customerId = getCustomerId();
  const isDayLimitCustomer = dayLimitInfo.hasDayLimit;

  useEffect(() => {
    fetchData();
  }, [selectedProduct, cl_id, page]);

  // Check for overdue and show alert
  useEffect(() => {
    if (isDayLimitCustomer && transactions.length > 0) {
      checkOverdueTransactions();
    }
  }, [transactions, isDayLimitCustomer]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const cid = getCustomerId();
      
      const params = new URLSearchParams();
      
      if (cid) {
        params.append('cl_id', cid);
        console.log('🔍 Using customer ID:', cid);
      } else {
        console.warn('⚠️ No customer ID found in URL or storage');
      }
      
      if (selectedProduct) {
        params.append('pname', selectedProduct);
      }

      params.append('page', page.toString());
      params.append('limit', limit.toString());

      console.log('🔄 Fetching data with params:', params.toString());
      
      const response = await fetch(`/api/cst/customer-history?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 API Response Data:', data);

      if (data.success) {
        // Store full data for compatibility with helper functions
        setHistoryData(data.data || data); 
        
        setTransactions(data.transactions || []);
        setProducts(data.products || []);
        setBalance(data.balance || 0);
        setAmtLimit(data.amtLimit || 0);
        setOpeningBalance(data.openingBalance || 0);
        setCustomerInfo(data.customer || {});
        setSummary(data.summary || {});
        setDayLimitInfo(data.dayLimitInfo || { hasDayLimit: false });
        setOutstandings(data.outstandings || { yesterday: 0, today: 0, total: 0 });
        setNotifications(data.notifications || { lowBalance: false, balanceNotification: null, paymentOverdue: false, paymentNotification: null });
        
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

  // Helper functions from TransactionHistory.jsx
  
  // Calculate due days (current date - completed date)
  const calculateDueDays = (completedDate) => {
    if (!completedDate) return 0;
    const completed = new Date(completedDate);
    const today = new Date();
    const diffTime = today - completed;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check for overdue transactions and show alert
  const checkOverdueTransactions = () => {
    const overdueTransactions = transactions.filter(transaction => {
      if (transaction.trans_type === 'inward') return false;
      const dueDays = calculateDueDays(transaction.completed_date);
      return dueDays >= (dayLimitInfo.dayLimit || 0);
    });

    if (overdueTransactions.length > 0) {
      setAlertMessage(`🚨 Alert: ${overdueTransactions.length} transaction(s) have exceeded day limit. Service stopped due to payment pending.`);
    } else {
      setAlertMessage('');
    }
  };

  // Calculate day limit information
  const calculateDayLimitInfo = (transaction) => {
    if (!isDayLimitCustomer || !transaction.completed_date) {
      return {
        remaining_days: 0,
        total_days: dayLimitInfo.dayLimit || 0,
        used_days: 0,
        is_overdue: false
      };
    }

    const totalDays = dayLimitInfo.dayLimit || 0;
    const usedDays = calculateDueDays(transaction.completed_date);
    const remainingDays = Math.max(0, totalDays - usedDays);
    const isOverdue = usedDays >= totalDays;

    return {
      remaining_days: remainingDays,
      total_days: totalDays,
      used_days: usedDays,
      is_overdue: isOverdue
    };
  };

  // Get transaction status
  const getTransactionStatus = (transaction) => {
    if (transaction.trans_type === 'inward') {
      return { status: 'Recharge', color: 'green' };
    }

    if (transaction.payment_status === 1) {
      return { status: 'Paid', color: 'green' };
    }

    const dayLimitInfoVal = calculateDayLimitInfo(transaction);
    
    if (isDayLimitCustomer) {
      if (dayLimitInfoVal.is_overdue) {
        return { 
          status: `Overdue - Stopped (${dayLimitInfoVal.used_days} days)`, 
          color: 'red', 
          days: dayLimitInfoVal.used_days 
        };
      } else if (dayLimitInfoVal.used_days > 0) {
        return { 
          status: `Open (${dayLimitInfoVal.used_days} days)`, 
          color: 'blue', 
          days: dayLimitInfoVal.used_days 
        };
      }
      return { status: 'Open', color: 'blue', days: 0 };
    } else {
      const dueDays = calculateDueDays(transaction.completed_date);
      if (dueDays > 7) {
        return { status: `Overdue (${dueDays} days)`, color: 'red', days: dueDays };
      }
      return { status: 'Pending', color: 'orange', days: dueDays };
    }
  };

  // Calculate amount for one day
  const calculateOneDayAmount = () => {
    const recentTransactions = transactions
      .filter(t => t.trans_type !== 'inward')
      .slice(0, 7);
    
    const totalAmount = recentTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const averageAmount = recentTransactions.length > 0 ? totalAmount / recentTransactions.length : 1000;
    
    return Math.round(averageAmount);
  };

  // Process payment for one day
  const handleOneDayPayment = async () => {
    try {
      const oneDayAmount = calculateOneDayAmount();
      
      const response = await fetch('/api/cst/customer-history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
          rechargeAmount: oneDayAmount,
          payment_type: 'one_day'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Payment of ₹${oneDayAmount} processed successfully. Service resumed for one day.`);
        fetchData(); // Refresh data
        setAlertMessage('');
      } else {
        alert(result.error || 'Payment processing failed.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment processing failed.');
    }
  };

  const handleExportCSV = () => {
    if (transactions && transactions.length > 0) {
      let headers, csvData;

      if (isDayLimitCustomer) {
        // Day Limit Customers CSV Headers
        headers = [
          'Station', 'Completed Date', 'Product', 'Vehicle', 'Trans Type', 
          'Loading Qty', 'Amount', 'Days Limit', 'Outstanding', 'Remaining Days', 
          'Total Days', 'Recharge', 'Outstanding after Payment', 'Overdue', 'Status'
        ];
        
        csvData = transactions.map(item => {
          const statusInfo = getTransactionStatus(item);
          const dayLimitInfoVal = calculateDayLimitInfo(item);
          
          return [
            item.station_name || 'N/A',
            item.completed_date ? new Date(item.completed_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
            item.pname || 'N/A',
            item.vehicle_number || 'N/A',
            item.trans_type || 'N/A',
            `${item.filling_qty || '0'} Ltr`,
            `₹${parseFloat(item.amount || 0).toFixed(2)}`,
            dayLimitInfoVal.total_days.toString(),
            `₹${parseFloat(item.new_amount || 0).toFixed(2)}`,
            dayLimitInfoVal.remaining_days.toString(),
            dayLimitInfoVal.total_days.toString(),
            item.trans_type === 'inward' ? `₹${parseFloat(item.amount || 0).toFixed(2)}` : '0',
            item.payment_status === 1 ? '0' : `₹${parseFloat(item.new_amount || 0).toFixed(2)}`,
            dayLimitInfoVal.is_overdue ? 'Yes' : 'No',
            statusInfo.status
          ];
        });
      } else {
        // Prepaid/Postpaid Customers CSV Headers
        headers = [
          'Station', 'Completed Date', 'Product', 'Vehicle #', 'Trans Type', 
          'Loading Qty', 'Amount', 'Credit', 'Credit Date', 'Balance', 
          'Remaining Limit', 'Limit', 
          'Status', 'Due Days', 'Updated By'
        ];
        
        csvData = transactions.map(item => {
          const statusInfo = getTransactionStatus(item);
          const dueDays = calculateDueDays(item.completed_date);
          
          return [
            item.station_name || 'N/A',
            item.completed_date ? new Date(item.completed_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
            item.pname || 'N/A',
            item.vehicle_number || 'N/A',
            item.trans_type || 'N/A',
            `${item.filling_qty || '0'} Ltr`,
            `₹${parseFloat(item.amount || 0).toFixed(2)}`,
            `₹${parseFloat(item.credit || 0).toFixed(2)}`,
            item.credit_date ? new Date(item.credit_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
            `₹${parseFloat(item.balance || 0).toFixed(2)}`,
            `₹${parseFloat(item.remaining_limit || 0).toFixed(2)}`,
            item.limit_type || 'N/A',
            statusInfo.status,
            dueDays.toString(),
            item.updated_by_name || 'System'
          ];
        });
      }

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
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm"
              >
                <span>⬇</span>
                Export CSV
              </button>
            </div>
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

          {/* Alert Message */}
          {alertMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex justify-between items-center">
                <span>{alertMessage}</span>
                <button 
                  onClick={handleOneDayPayment}
                  className="ml-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Pay for One Day (₹{calculateOneDayAmount()})
                </button>
              </div>
            </div>
          )}

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {/* Balance Summary - 5 columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
                <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
                  <p className="text-sm text-gray-600">Yesterday Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600">₹{formatCurrency(outstandings.yesterday)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                  <p className="text-sm text-gray-600">Today Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">₹{formatCurrency(outstandings.today)}</p>
                </div>
              </div>

              {/* Notifications */}
              {notifications.balanceNotification && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-yellow-800 font-semibold">{notifications.balanceNotification}</p>
                  </div>
                </div>
              )}

              {notifications.paymentNotification && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-800 font-semibold">{notifications.paymentNotification}</p>
                  </div>
                </div>
              )}

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
                      <span className="ml-2 text-yellow-600">₹{formatCurrency(dayLimitInfo.totalDayAmount)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-yellow-700">Remaining Today:</span>
                      <span className="ml-2 text-yellow-600">
                        ₹{formatCurrency(dayLimitInfo.dayLimit - dayLimitInfo.totalDayAmount)}
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
                          {isDayLimitCustomer ? (
                            <>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Days Limit
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Outstanding
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Remaining Days
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Outstanding (₹)
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Remaining Limit (₹)
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((transaction) => {
                           const statusInfo = getTransactionStatus(transaction);
                           const dayLimitInfoVal = calculateDayLimitInfo(transaction);
                           
                           return (
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
                            
                            {isDayLimitCustomer ? (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                                  {dayLimitInfoVal.total_days}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                  ₹{formatCurrency(transaction.new_amount)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                                  {dayLimitInfoVal.remaining_days}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-${statusInfo.color}-800 bg-${statusInfo.color}-100`}>
                                    {statusInfo.status}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-right text-gray-900">
                                  ₹{formatCurrency(transaction.new_amount)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                                  {transaction.remaining_limit ? (
                                    <span className="text-blue-600">₹{formatCurrency(transaction.remaining_limit)}</span>
                                  ) : (
                                    <span className="text-gray-400">₹0</span>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No transactions found for this period</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {historyData.pagination && historyData.pagination.totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
              <div className="text-sm text-gray-600">
                Page {historyData.pagination.currentPage} of {historyData.pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', (page - 1).toString());
                    router.push(`?${params.toString()}`);
                  }}
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
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set('page', pageNum.toString());
                        router.push(`?${params.toString()}`);
                      }}
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
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', (page + 1).toString());
                    router.push(`?${params.toString()}`);
                  }}
                  disabled={!historyData.pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
