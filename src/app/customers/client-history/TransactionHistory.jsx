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
  const [alertMessage, setAlertMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const customerId = searchParams.get('id');
  const page = parseInt(searchParams.get('page')) || 1;
  const searchQuery = searchParams.get('search') || '';
  const productFilter = searchParams.get('product') || '';
  const limit = 10;

  // Check if customer has day limit
  const isDayLimitCustomer = customerDetails?.day_limit > 0;

  useEffect(() => {
    if (customerId) {
      fetchClientHistory();
      fetchProducts();
      fetchCustomerDetails();
    }
  }, [customerId, page, searchQuery, productFilter]);

  // Check for overdue and show alert
  useEffect(() => {
    if (isDayLimitCustomer && historyData.transactions?.length > 0) {
      checkOverdueTransactions();
    }
  }, [historyData.transactions, isDayLimitCustomer]);

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
    const overdueTransactions = historyData.transactions.filter(transaction => {
      if (transaction.trans_type === 'inward') return false;
      const dueDays = calculateDueDays(transaction.completed_date);
      return dueDays >= (customerDetails?.day_limit || 0);
    });

    if (overdueTransactions.length > 0) {
      setAlertMessage(`🚨 Alert: ${overdueTransactions.length} transaction(s) have exceeded day limit. Service stopped due to payment pending.`);
    } else {
      setAlertMessage('');
    }
  };

  // Calculate day limit information
  const calculateDayLimitInfo = (completedDate) => {
    if (!isDayLimitCustomer || !completedDate) {
      return {
        remaining_days: 0,
        total_days: customerDetails?.day_limit || 0,
        used_days: 0
      };
    }

    const totalDays = customerDetails?.day_limit || 0;
    const usedDays = calculateDueDays(completedDate);
    const remainingDays = Math.max(0, totalDays - usedDays);

    return {
      remaining_days: remainingDays,
      total_days: totalDays,
      used_days: usedDays
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

    const dueDays = calculateDueDays(transaction.completed_date);
    const dayLimit = customerDetails?.day_limit || 0;
    
    if (isDayLimitCustomer) {
      if (dueDays >= dayLimit) {
        return { status: 'Overdue - Stopped', color: 'red', days: dueDays };
      } else if (dueDays > 0) {
        return { status: 'Open', color: 'blue', days: dueDays };
      }
      return { status: 'Open', color: 'blue', days: 0 };
    } else {
      if (dueDays > 7) {
        return { status: 'Overdue', color: 'red', days: dueDays };
      }
      return { status: 'Pending', color: 'orange', days: dueDays };
    }
  };

  // Process payment for one day
  const handleOneDayPayment = async () => {
    try {
      const oneDayAmount = calculateOneDayAmount();
      
      const response = await fetch('/api/customers/client-history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
          rechargeAmount: oneDayAmount,
          paymentType: 'one_day'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Payment of ₹${oneDayAmount} processed successfully. Service resumed for one day.`);
        fetchClientHistory(); // Refresh data
        setAlertMessage('');
      } else {
        alert(result.error || 'Payment processing failed.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment processing failed.');
    }
  };

  // Calculate amount for one day
  const calculateOneDayAmount = () => {
    const recentTransactions = historyData.transactions
      .filter(t => t.trans_type !== 'inward')
      .slice(0, 7);
    
    const totalAmount = recentTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const averageAmount = recentTransactions.length > 0 ? totalAmount / recentTransactions.length : 1000;
    
    return Math.round(averageAmount);
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
    if (historyData.transactions && historyData.transactions.length > 0) {
      let headers, csvData;

      if (isDayLimitCustomer) {
        // Day Limit Customers CSV Headers
        headers = [
          'Station', 'Completed Date', 'Product', 'Vehicle', 'Trans Type', 
          'Loading Qty', 'Amount', 'Days Limit', 'Outstanding', 'Remaining Days', 
          'Total Days', 'Recharge', 'Outstanding after Payment', 'Overdue', 'Status'
        ];
        
        csvData = historyData.transactions.map(item => {
          const statusInfo = getTransactionStatus(item);
          const dayLimitInfo = calculateDayLimitInfo(item.completed_date);
          const isOverdue = (item.due_days || 0) >= (customerDetails?.day_limit || 0);
          
          return [
            item.station_name || 'N/A',
            item.completed_date ? new Date(item.completed_date).toLocaleDateString() : 'N/A',
            item.product_name || 'N/A',
            item.vehicle_number || 'N/A',
            item.trans_type || 'N/A',
            `${item.quantity || '0'} Ltr`,
            `₹${parseFloat(item.amount || 0).toFixed(2)}`,
            dayLimitInfo.total_days.toString(),
            `₹${parseFloat(item.outstanding_amount || 0).toFixed(2)}`,
            dayLimitInfo.remaining_days.toString(),
            dayLimitInfo.total_days.toString(),
            item.trans_type === 'inward' ? `₹${parseFloat(item.amount || 0).toFixed(2)}` : '0',
            item.payment_status === 1 ? '0' : `₹${parseFloat(item.outstanding_amount || 0).toFixed(2)}`,
            isOverdue ? 'Yes' : 'No',
            statusInfo.status
          ];
        });
      } else {
        // Prepaid/Postpaid Customers CSV Headers
        headers = [
          'Station', 'Completed Date', 'Product', 'Vehicle #', 'Trans Type', 
          'Loading Qty', 'Amount', 'Credit', 'Credit Date', 'Balance', 
          'Remaining Limit', 'Limit', 'Increase Amount', 'Decrease Amount', 
          'Status', 'Due Days', 'Updated By'
        ];
        
        csvData = historyData.transactions.map(item => {
          const statusInfo = getTransactionStatus(item);
          const dueDays = calculateDueDays(item.completed_date);
          
          return [
            item.station_name || 'N/A',
            item.completed_date ? new Date(item.completed_date).toLocaleDateString() : 'N/A',
            item.product_name || 'N/A',
            item.vehicle_number || 'N/A',
            item.trans_type || 'N/A',
            `${item.quantity || '0'} Ltr`,
            `₹${parseFloat(item.amount || 0).toFixed(2)}`,
            `₹${parseFloat(item.credit || 0).toFixed(2)}`,
            item.credit_date ? new Date(item.credit_date).toLocaleDateString() : 'N/A',
            `₹${parseFloat(item.balance || 0).toFixed(2)}`,
            `₹${parseFloat(item.remaining_limit || 0).toFixed(2)}`,
            item.limit_type || 'N/A',
            `₹${parseFloat(item.in_amount || 0).toFixed(2)}`,
            `₹${parseFloat(item.d_amount || 0).toFixed(2)}`,
            statusInfo.status,
            dueDays.toString(),
            item.employee_name || 'System'
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

  // Calculate outstanding balance
  const outstandingBalance = historyData.transactions?.reduce((total, item) => {
    return total + (parseFloat(item.outstanding_amount) || 0);
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

  // Define headers based on customer type
  const getHeaders = () => {
    if (isDayLimitCustomer) {
      return [
        '#', 'Station', 'Completed Date', 'Product', 'Vehicle', 
        'Trans Type', 'Loading Qty (Ltr)', 'Amount', 'Days Limit', 'Outstanding',
        'Remaining Days', 'Total Days', 'Recharge', 'Outstanding after Payment', 'Overdue', 'Status'
      ];
    } else {
      return [
        '#', 'Station', 'Completed Date', 'Product', 'Vehicle #', 
        'Trans Type', 'Loading Qty', 'Amount', 'Credit', 'Credit Date',
        'Balance', 'Remaining Limit', 'Limit', 'Increase Amount', 
        'Decrease Amount', 'Status', 'Due Days', 'Updated By'
      ];
    }
  };

  const headers = getHeaders();

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
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
              {/* Customer Type Badge */}
              <span className={`px-3 py-1 rounded-md font-medium text-sm ${
                isDayLimitCustomer ? 'bg-purple-500 text-white' : 'bg-gray-500 text-white'
              }`}>
                {isDayLimitCustomer ? 'Day Limit Customer' : (customerDetails?.account_type || 'Pre/Post Paid')}
              </span>
              
              {/* Outstanding Balance */}
              <span className="bg-orange-500 text-white px-3 py-1 rounded-md font-medium text-sm">
                Outstanding: ₹{outstandingBalance.toFixed(2)}
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
                  <div className="text-gray-500">Account Type</div>
                  <div className="font-semibold">{isDayLimitCustomer ? 'Day Limit' : (customerDetails.account_type || 'Pre/Post Paid')}</div>
                </div>
                <div>
                  <div className="text-gray-500">Account Status</div>
                  <div className={`font-semibold ${
                    customerDetails.account_status === 'active' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {customerDetails.account_status?.toUpperCase()}
                  </div>
                </div>
                
                {/* Additional info for day limit customers */}
                {isDayLimitCustomer && (
                  <>
                    <div>
                      <div className="text-gray-500">Day Limit</div>
                      <div className="font-semibold">{customerDetails.day_limit} days</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Days Used</div>
                      <div className="font-semibold">{customerDetails.day_amount} days</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Days Remaining</div>
                      <div className="font-semibold text-green-600">
                        {Math.max(0, customerDetails.day_limit - customerDetails.day_amount)} days
                      </div>
                    </div>
                  </>
                )}
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
                    historyData.transactions.map((item, index) => {
                      const statusInfo = getTransactionStatus(item);
                      const dueDays = calculateDueDays(item.completed_date);
                      const dayLimitInfo = calculateDayLimitInfo(item.completed_date);
                      const isOverdue = isDayLimitCustomer ? 
                        dueDays >= (customerDetails?.day_limit || 0) : 
                        dueDays > 7;
                      
                      return (
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
                          
                          {isDayLimitCustomer ? (
                            // Day Limit Customer Columns
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.quantity || '0'} Ltr
                              </td>
                              <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                                ₹{parseFloat(item.amount || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {dayLimitInfo.total_days} days
                              </td>
                              <td className={`px-4 py-3 text-sm font-semibold ${
                                item.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                ₹{parseFloat(item.outstanding_amount || 0).toFixed(2)}
                              </td>
                              <td className={`px-4 py-3 text-sm font-semibold ${
                                dayLimitInfo.remaining_days <= 3 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {dayLimitInfo.remaining_days} days
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {dayLimitInfo.total_days} days
                              </td>
                              <td className="px-4 py-3 text-sm text-green-600 font-medium">
                                {item.trans_type === 'inward' ? `₹${parseFloat(item.amount || 0).toFixed(2)}` : '0'}
                              </td>
                              <td className={`px-4 py-3 text-sm font-semibold ${
                                item.payment_status === 1 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {item.payment_status === 1 ? '0' : `₹${parseFloat(item.outstanding_amount || 0).toFixed(2)}`}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-md text-white text-xs font-medium ${
                                  isOverdue ? 'bg-red-500' : 'bg-green-500'
                                }`}>
                                  {isOverdue ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-md text-white text-xs font-medium ${
                                  statusInfo.color === 'green' ? 'bg-green-500' :
                                  statusInfo.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                                }`}>
                                  {statusInfo.status}
                                </span>
                              </td>
                            </>
                          ) : (
                            // Prepaid/Postpaid Customer Columns
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.quantity || '0'} Ltr
                              </td>
                              <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                                ₹{parseFloat(item.amount || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-600 font-medium">
                                ₹{parseFloat(item.credit || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.credit_date ? new Date(item.credit_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold">
                                ₹{parseFloat(item.balance || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                ₹{parseFloat(item.remaining_limit || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.limit_type || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-600 font-medium">
                                ₹{parseFloat(item.in_amount || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-red-600 font-medium">
                                ₹{parseFloat(item.d_amount || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-md text-white text-xs font-medium ${
                                  statusInfo.color === 'green' ? 'bg-green-500' :
                                  statusInfo.color === 'red' ? 'bg-red-500' :
                                  statusInfo.color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
                                }`}>
                                  {statusInfo.status}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-sm font-semibold ${
                                dueDays > 7 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {dueDays} days
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.employee_name || 'System'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
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
              historyData.transactions.map((item, index) => {
                const statusInfo = getTransactionStatus(item);
                const dueDays = calculateDueDays(item.completed_date);
                const dayLimitInfo = calculateDayLimitInfo(item.completed_date);
                
                return (
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
                      
                      {isDayLimitCustomer ? (
                        // Day Limit Mobile View
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Loading Qty</span>
                            <span className="font-semibold">{item.quantity || '0'} Ltr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Amount</span>
                            <span className="font-semibold text-blue-600">
                              ₹{parseFloat(item.amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Days Limit</span>
                            <span className="font-semibold">{dayLimitInfo.total_days} days</span>
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
                            <span className="text-gray-500">Remaining Days</span>
                            <span className={`font-semibold ${
                              dayLimitInfo.remaining_days <= 3 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {dayLimitInfo.remaining_days} days
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Days</span>
                            <span className="font-semibold">{dayLimitInfo.total_days} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Recharge</span>
                            <span className="font-semibold text-green-600">
                              {item.trans_type === 'inward' ? `₹${parseFloat(item.amount || 0).toFixed(2)}` : '0'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Outstanding After Pay</span>
                            <span className={`font-semibold ${
                              item.payment_status === 1 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.payment_status === 1 ? '0' : `₹${parseFloat(item.outstanding_amount || 0).toFixed(2)}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Overdue</span>
                            <span className={`font-semibold ${
                              dueDays >= (customerDetails?.day_limit || 0) ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {dueDays >= (customerDetails?.day_limit || 0) ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className={`px-2 py-1 rounded text-white text-xs ${
                              statusInfo.color === 'green' ? 'bg-green-500' :
                              statusInfo.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                            }`}>
                              {statusInfo.status}
                            </span>
                          </div>
                        </>
                      ) : (
                        // Prepaid/Postpaid Mobile View
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Loading Qty</span>
                            <span className="font-semibold">{item.quantity || '0'} Ltr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Amount</span>
                            <span className="font-semibold text-blue-600">
                              ₹{parseFloat(item.amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Credit</span>
                            <span className="font-semibold text-green-600">
                              ₹{parseFloat(item.credit || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Credit Date</span>
                            <span className="font-semibold">
                              {item.credit_date ? new Date(item.credit_date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Balance</span>
                            <span className="font-semibold">₹{parseFloat(item.balance || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Remaining Limit</span>
                            <span className="font-semibold">₹{parseFloat(item.remaining_limit || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Limit Type</span>
                            <span className="font-semibold">{item.limit_type || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Increase Amt</span>
                            <span className="font-semibold text-green-600">
                              ₹{parseFloat(item.in_amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Decrease Amt</span>
                            <span className="font-semibold text-red-600">
                              ₹{parseFloat(item.d_amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className={`px-2 py-1 rounded text-white text-xs ${
                              statusInfo.color === 'green' ? 'bg-green-500' :
                              statusInfo.color === 'red' ? 'bg-red-500' :
                              statusInfo.color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                              {statusInfo.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Due Days</span>
                            <span className={`font-semibold ${
                              dueDays > 7 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {dueDays} days
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Updated By</span>
                            <span className="font-semibold">{item.employee_name || 'System'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
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