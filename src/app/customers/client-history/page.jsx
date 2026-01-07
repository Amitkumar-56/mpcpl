// app/customers/client-history/page.jsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

// --- MOCK COMPONENTS ---
const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

function ClientHistoryContent() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Payment processing states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerBalanceInfo, setCustomerBalanceInfo] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [daysOpen, setDaysOpen] = useState(0);
  const [overdueDetails, setOverdueDetails] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const cid = searchParams.get("id");

  // Check customer types
  const isDayLimitCustomer = customerBalanceInfo?.day_limit > 0;
  const isAmountLimitCustomer = customerBalanceInfo?.amtlimit > 0;

  // Enhanced status calculation - ONLY for day_limit customers
  const getEnhancedTransactionStatus = (transaction) => {
    // ONLY show status for day_limit customers
    if (!isDayLimitCustomer) {
      return null;
    }

    // For inward transactions (recharges) - ALWAYS show "Recharge"
    if (transaction.trans_type === "inward") {
      return { 
        status: "recharge", 
        color: "green",
        display: "Recharge"
      };
    }

    // For outward transactions with payment_status = 1 (Paid)
    if (transaction.payment_status === 1 || transaction.request_payment_status === 1) {
      return { 
        status: "paid", 
        color: "green",
        display: "Paid"
      };
    }

    // Unpaid transactions - show overdue/pending status
    if (transaction.payment_status === 0 || transaction.request_payment_status === 0) {
      const dayLimit = customerBalanceInfo?.day_limit || 0;
      const transactionDate = new Date(transaction.completed_date || transaction.filling_date || transaction.created_at);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      transactionDate.setHours(0, 0, 0, 0);
      const daysDifference = Math.floor((currentDate - transactionDate) / (1000 * 60 * 60 * 24));
      
      if (dayLimit > 0 && daysDifference >= dayLimit) {
        return { 
          status: "overdue", 
          color: "red",
          display: "Overdue"
        };
      } else {
        return { 
          status: "pending", 
          color: "orange",
          display: "Pending"
        };
      }
    }

    return null;
  };

  // Filter transactions based on search
  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.station_name?.toLowerCase().includes(searchLower) ||
      transaction.pname?.toLowerCase().includes(searchLower) ||
      transaction.vehicle_number?.toLowerCase().includes(searchLower) ||
      transaction.trans_type?.toLowerCase().includes(searchLower) ||
      transaction.updated_by_name?.toLowerCase().includes(searchLower)
    );
  });

  // Get overdue and pending transactions for payment modal (only for day_limit customers)
  const getPayableTransactions = () => {
    if (!isDayLimitCustomer) return [];
    
    return transactions.filter(transaction => {
      const statusInfo = getEnhancedTransactionStatus(transaction);
      return statusInfo && (statusInfo.status === 'overdue' || statusInfo.status === 'pending');
    });
  };

  // Calculate total payable amount (overdue + pending)
  const payableTransactions = getPayableTransactions();
  const totalPayableAmount = payableTransactions.reduce(
    (sum, t) => sum + parseFloat(t.amount || 0),
    0
  );

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    if (cid) {
      fetchTransactions();
    }
  }, [cid, filter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ id: cid });
      if (filter) params.append("pname", filter);

      const response = await fetch(`/api/customers/client-history?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setTransactions(result.data.transactions || []);
        setProducts(result.data.products || []);
        setBalance(result.data.balance || 0);
        setPendingTransactions(result.data.pendingTransactions || []);
        setCustomerName(result.data.customerName || `Customer ${cid}`);
        setCustomerBalanceInfo(result.data.customerBalanceInfo || null);
        setPaymentStats(result.data.paymentStats || null);
        setDaysOpen(result.data.daysOpen || 0);
        setOverdueDetails(result.data.overdueDetails || null);
      } else {
        setError(result.error || "Failed to fetch data");
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError("Network error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate days used and remaining for day_limit customers
  const getDayLimitInfo = () => {
    if (!isDayLimitCustomer) return null;
    const dayLimit = customerBalanceInfo?.day_limit || 0;
    const daysElapsed = customerBalanceInfo?.days_elapsed || 0;
    const daysRemaining = customerBalanceInfo?.remaining_days || 0;
    
    return {
      dayLimit,
      daysUsed: daysElapsed,
      daysRemaining,
      lastResetDate: customerBalanceInfo?.last_reset_date
    };
  };

  // Payment Handlers - For all customers
  const handleRechargeClick = () => {
    setShowPaymentModal(true);
    setRechargeAmount("");
    setPaymentResult(null);
  };

  const handleProcessPayment = async () => {
    
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      setProcessingPayment(true);

      const response = await fetch("/api/customers/client-history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: cid,
          rechargeAmount: amount,
          payableTransactions: payableTransactions, // Send payable transactions to backend
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPaymentResult(result);
        fetchTransactions(); // Refresh data
        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentResult(null);
        }, 3000);
      } else {
        alert(result.error || "Payment processing failed.");
        setPaymentResult({
          success: false,
          message: result.error || "Payment failed",
        });
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      alert("Payment processing failed.");
      setPaymentResult({ success: false, message: "Network error." });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Export function
  const handleExport = async () => {
    try {
      setExportLoading(true);
      
      const params = new URLSearchParams();
      params.append('id', cid);
      if (filter) params.append('pname', filter);

      const response = await fetch('/api/customers/client-history', {
        method: 'POST',
        body: params
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `transaction_history_${cid}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN").format(amount || 0);
    
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Enhanced Payment Status Badge - Simple for day_limit customers
  const EnhancedPaymentStatusBadge = ({ statusInfo }) => {
    if (!statusInfo) return null;

    const styles = {
      paid: "bg-green-100 text-green-800 border-green-200",
      overdue: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-orange-100 text-orange-800 border-orange-200",
      recharge: "bg-blue-100 text-blue-800 border-blue-200"
    };

    const style = styles[statusInfo.status] || "bg-gray-100 text-gray-800 border-gray-200";

    return (
      <div className={`px-2 py-1 text-xs font-medium rounded border ${style}`}>
        <div className="font-semibold">{statusInfo.display}</div>
      </div>
    );
  };

  const TransactionTypeBadge = ({ type }) => {
    const styles = {
      outward: "bg-red-100 text-red-800 border-red-200",
      inward: "bg-green-100 text-green-800 border-green-200",
      edited: "bg-purple-100 text-purple-800 border-purple-200 font-bold",
    };

    const style =
      styles[type?.toLowerCase()] ||
      "bg-gray-100 text-gray-800 border-gray-200";
    const displayText =
      type?.toLowerCase() === "outward" ? "Outward" : 
      type?.toLowerCase() === "inward" ? "Inward" : 
      type?.toLowerCase() === "edited" ? "Edited ✏️" : 
      type;

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${style}`}
      >
        {displayText}
      </span>
    );
  };

  // Mobile Card View
  const TransactionCard = ({ transaction }) => {
    const statusInfo = getEnhancedTransactionStatus(transaction);
    const isEdited = transaction.trans_type?.toLowerCase() === 'edited';

    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 mb-3 hover:shadow-md transition-shadow ${isEdited ? 'border-l-4 border-purple-500 bg-purple-50' : ''}`}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs font-medium">ID</p>
            <p className="font-medium">{transaction.id}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Station</p>
            <p className="font-medium truncate">
              {transaction.station_name || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Completed Date</p>
            <p className="font-medium">
              {formatDateTime(transaction.completed_date || transaction.filling_date || transaction.credit_date)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Product</p>
            <p className="font-medium">{transaction.pname || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Vehicle #</p>
            <p className="font-medium">{transaction.vehicle_number || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Trans Type</p>
            <TransactionTypeBadge type={transaction.trans_type} />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Loading Qty</p>
            <p className="font-medium">{transaction.filling_qty || "0"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Amount</p>
            <p className="font-bold text-blue-600">
              ₹{formatCurrency(transaction.amount)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Credit</p>
            <p className="font-bold text-green-600">
              ₹{formatCurrency(transaction.credit)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Credit Date</p>
            <p className="font-medium">
              {formatDate(transaction.credit_date)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Balance</p>
            <p className="font-bold">
              ₹{formatCurrency(transaction.new_amount)}
            </p>
          </div>
          
          {/* Amount Limit Customers - Show Remaining Limit, in_amount, d_amount */}
          {isAmountLimitCustomer && (
            <>
              <div>
                <p className="text-gray-500 text-xs font-medium">Remaining Limit</p>
                <p className="font-medium">
                  {transaction.remaining_limit || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium">Increase Amount</p>
                <p className="font-bold text-green-600">
                  ₹{formatCurrency(transaction.in_amount)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium">Decrease Amount</p>
                <p className="font-bold text-red-600">
                  ₹{formatCurrency(transaction.d_amount)}
                </p>
              </div>
            </>
          )}
          
          {/* Day Limit Customers - Show Day Limit Fields */}
          {isDayLimitCustomer && (
            <>
              <div>
                <p className="text-gray-500 text-xs font-medium">Day Limit</p>
                <p className="font-medium">
                  {customerBalanceInfo?.day_limit || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium">Final Remaining</p>
                <p className="font-medium">
                  {transaction.remaining_day_limit || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium">Due Days</p>
                <p className="font-medium">
                  {(() => {
                    const transactionDate = new Date(transaction.completed_date || transaction.filling_date || transaction.created_at);
                    const currentDate = new Date();
                    currentDate.setHours(0, 0, 0, 0);
                    transactionDate.setHours(0, 0, 0, 0);
                    const daysDifference = Math.floor((currentDate - transactionDate) / (1000 * 60 * 60 * 24));
                    return daysDifference;
                  })()}
                </p>
              </div>
            </>
          )}
          
          {/* Status - Show only for day_limit customers */}
          {isDayLimitCustomer && statusInfo && (
            <div className="col-span-2">
              <p className="text-gray-500 text-xs font-medium">Status</p>
              <EnhancedPaymentStatusBadge statusInfo={statusInfo} />
            </div>
          )}
          
          <div className="col-span-2">
            <p className="text-gray-500 text-xs font-medium">Updated By</p>
            <p className="font-medium">
              {transaction.updated_by_name || "Unknown"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!cid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg">Customer ID is required</div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate total pending amount
  const totalPendingAmount = pendingTransactions.reduce(
    (sum, t) => sum + parseFloat(t.amount || 0),
    0
  );

  // Get day limit info
  const dayLimitInfo = getDayLimitInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Transaction History
                </h1>
                <p className="text-gray-500">
                  Customer: {customerName} (ID: {cid})
                </p>
                {customerBalanceInfo && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      Customer Type: {isDayLimitCustomer ? 'Day Limit Customer' : 'Amount Limit Customer'}
                    </p>
                    {isDayLimitCustomer && dayLimitInfo && (
                      <div className="flex space-x-4 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Day Limit: {dayLimitInfo.dayLimit} days
                        </span>
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          Days Used: {dayLimitInfo.daysUsed}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          Days Remaining: {dayLimitInfo.daysRemaining}
                        </span>
                      </div>
                    )}
                    {isAmountLimitCustomer && (
                      <div className="flex space-x-4 text-xs">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Amount Limit: ₹{formatCurrency(customerBalanceInfo.amtlimit)}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Balance: ₹{formatCurrency(balance)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Amount Limit Customers - Show Remaining Limit */}
              {isAmountLimitCustomer && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Remaining Limit</p>
                  <p className="text-lg font-bold text-indigo-600">
                    ₹{formatCurrency(customerBalanceInfo?.amtlimit)}
                  </p>
                </div>
              )}
              
              <div className="text-right">
                <p className="text-sm text-gray-500">Outstanding Balance</p>
                <p
                  className={`text-lg font-bold ${
                    balance < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  ₹{formatCurrency(balance)}
                </p>
              </div>

              {/* Process Payment button - Show for all customers */}
              {customerBalanceInfo && (
                <button
                  onClick={handleRechargeClick}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span>Recharge / Process Payment</span>
                </button>
              )}

              <Link
                href={`/customer-logs?customer_id=${cid}`}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>📋 Logs</span>
              </Link>

              <button
                onClick={handleExport}
                disabled={exportLoading || transactions.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Export CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Payment Statistics from filling_history - For All Customers */}
        {paymentStats && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">📊 Payment Statistics (from filling_history)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-gray-600 mb-1">Paid Requests</p>
                <p className="text-lg font-bold text-green-600">{paymentStats.paid_requests_count || 0}</p>
                <p className="text-xs text-gray-500">₹{formatCurrency(paymentStats.total_paid_amount || 0)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-gray-600 mb-1">Unpaid Requests</p>
                <p className="text-lg font-bold text-orange-600">{paymentStats.unpaid_requests_count || 0}</p>
                <p className="text-xs text-gray-500">₹{formatCurrency(paymentStats.total_unpaid_amount || 0)}</p>
              </div>
              {isDayLimitCustomer && (
                <>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-gray-600 mb-1">Days Open</p>
                    <p className="text-lg font-bold text-purple-600">{daysOpen}</p>
                    <p className="text-xs text-gray-500">Days with unpaid requests</p>
                  </div>
                  {overdueDetails && (
                    <div className="bg-red-100 rounded-lg p-3 border border-red-300">
                      <p className="text-xs text-red-700 mb-1 font-semibold">⚠️ Overdue Balance</p>
                      <p className="text-lg font-bold text-red-700">₹{formatCurrency(overdueDetails.overdue_amount || 0)}</p>
                      <p className="text-xs text-red-600">
                        {overdueDetails.days_overdue} days overdue
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Overdue Warning Banner - Only for Day Limit Customers */}
        {isDayLimitCustomer && overdueDetails && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
                <div>
                  <p className="font-medium text-red-800">
                    ⚠️ Day Limit Exceeded - Account Inactive
                  </p>
                  <div className="text-sm text-red-600 mt-1 space-y-1">
                    <p>
                      Days Elapsed: <span className="font-semibold">{overdueDetails.days_elapsed} days</span> | 
                      Day Limit: <span className="font-semibold">{overdueDetails.day_limit} days</span> | 
                      Days Overdue: <span className="font-semibold">{overdueDetails.days_overdue} days</span>
                    </p>
                    <p>
                      Overdue Balance: <span className="font-semibold">₹{formatCurrency(overdueDetails.overdue_amount || 0)}</span> | 
                      Unpaid Requests: <span className="font-semibold">{overdueDetails.total_unpaid_requests || 0}</span>
                    </p>
                    <p className="font-semibold mt-2">
                      ❌ Please clear the payment for previous {overdueDetails.day_limit} day(s) before completing new requests.
                    </p>
                  </div>
                </div>
              </div>
              {customerBalanceInfo?.is_active !== 0 && (
                <button 
                  onClick={handleRechargeClick}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors font-semibold whitespace-nowrap"
                >
                  Recharge Now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Product Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Product
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Products</option>
                {products.map((product, index) => (
                  <option key={index} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Transactions
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Items Per Page */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items per page
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Stats */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Stats
              </label>
              <div className="text-sm text-gray-600">
                <div>Total Records: {filteredTransactions.length}</div>
                {isDayLimitCustomer && (
                  <>
                    <div className="text-blue-600 font-semibold">
                      Day Limit: {customerBalanceInfo?.day_limit} days
                    </div>
                    <div className="text-orange-600 font-semibold">
                      Total Payment Due: ₹{formatCurrency(totalPayableAmount)}
                    </div>
                  </>
                )}
                {!isDayLimitCustomer && (
                  <div className="text-red-600 font-semibold">
                    Total Payment Due: ₹{formatCurrency(totalPayableAmount)}
                  </div>
                )}
                {isAmountLimitCustomer && (
                  <div className="text-purple-600 font-semibold">
                    Amount Limit: ₹{formatCurrency(customerBalanceInfo?.amtlimit)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 text-gray-600">Loading transactions...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-lg mb-4">Error: {error}</div>
              <button
                onClick={fetchTransactions}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden p-4">
                {displayTransactions.length > 0 ? (
                  displayTransactions.map((transaction) => (
                    <TransactionCard
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No transactions found</p>
                    <button
                      onClick={fetchTransactions}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Refresh Data
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Station
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trans Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loading Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credit Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      
                      {/* Amount Limit Customers - Show Remaining Limit, in_amount, d_amount */}
                      {isAmountLimitCustomer && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Remaining Limit
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Increase Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Decrease Amount
                          </th>
                        </>
                      )}
                      
                      {/* Day Limit Customers - Show Day Limit Fields */}
                      {isDayLimitCustomer && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Day Limit
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Final Remaining
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Days
                          </th>
                        </>
                      )}
                      
                      {/* Status Column - Show ONLY for day_limit customers */}
                      {isDayLimitCustomer && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      )}
                      
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Updated By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayTransactions.length > 0 ? (
                      displayTransactions.map((transaction) => {
                        const statusInfo = getEnhancedTransactionStatus(transaction);

                        const isEdited = transaction.trans_type?.toLowerCase() === 'edited';
                        return (
                          <tr
                            key={transaction.id}
                            className={`hover:bg-gray-50 transition-colors ${isEdited ? 'bg-purple-50 border-l-4 border-purple-500' : ''}`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {transaction.id}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.station_name || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(transaction.completed_date || transaction.filling_date || transaction.credit_date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.pname || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.vehicle_number || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <TransactionTypeBadge
                                type={transaction.trans_type}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.filling_qty || "0"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">
                              ₹{formatCurrency(transaction.amount)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                              ₹{formatCurrency(transaction.credit)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(transaction.credit_date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                              ₹{formatCurrency(transaction.new_amount)}
                            </td>
                            
                            {/* Amount Limit Data */}
                            {isAmountLimitCustomer && (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {transaction.remaining_limit || "N/A"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                                  ₹{formatCurrency(transaction.in_amount)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-red-600">
                                  ₹{formatCurrency(transaction.d_amount)}
                                </td>
                              </>
                            )}
                            
                            {/* Day Limit Data */}
                            {isDayLimitCustomer && (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {customerBalanceInfo?.day_limit || "N/A"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {transaction.remaining_day_limit || "N/A"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {(() => {
                                    const transactionDate = new Date(transaction.completed_date || transaction.filling_date || transaction.created_at);
                                    const currentDate = new Date();
                                    currentDate.setHours(0, 0, 0, 0);
                                    transactionDate.setHours(0, 0, 0, 0);
                                    const daysDifference = Math.floor((currentDate - transactionDate) / (1000 * 60 * 60 * 24));
                                    return daysDifference;
                                  })()}
                                </td>
                              </>
                            )}
                            
                            {/* Status - Show only for day_limit customers */}
                            {isDayLimitCustomer && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {statusInfo ? (
                                  <EnhancedPaymentStatusBadge statusInfo={statusInfo} />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            )}
                            
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.updated_by_name || "Unknown"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={
                          isDayLimitCustomer ? "16" : 
                          isAmountLimitCustomer ? "16" : "13"
                        } className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center text-gray-500">
                            <p className="text-lg font-medium">
                              No transactions found
                            </p>
                            <button
                              onClick={fetchTransactions}
                              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                              Refresh Data
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredTransactions.length > 0 && (
                <div className="px-6 py-4 flex justify-between items-center border-t">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(
                      startIndex + itemsPerPage,
                      filteredTransactions.length
                    )}{" "}
                    of {filteredTransactions.length} results
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
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

      {/* Payment Modal - ONLY for day_limit customers */}
      {isDayLimitCustomer && (
        <Modal
          show={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Process Payment - Day Limit Customer"
        >
          {paymentResult && (
            <div
              className={`p-3 mb-4 rounded-lg text-center ${
                paymentResult.success
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <p className="font-semibold">{paymentResult.message}</p>
            </div>
          )}

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              Total Outstanding Due:
            </p>
            <p className="text-xl font-bold text-red-600">
              ₹{formatCurrency(totalPayableAmount)}
            </p>
            <p className="text-xs text-blue-600 mt-1 font-semibold">
              Day Limit Customer - Payments clear oldest days first
            </p>
          </div>

          {/* Payable Transactions List */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Payable Transactions (Overdue + Pending):
            </p>
            {payableTransactions.length > 0 ? (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {payableTransactions.map((transaction, index) => {
                  const statusInfo = getEnhancedTransactionStatus(transaction);
                  return (
                    <div key={transaction.id} className="p-2 border-b last:border-b-0 text-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">ID: {transaction.id}</span>
                          <span className={`ml-2 px-1 text-xs rounded ${
                            statusInfo?.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {statusInfo?.display}
                          </span>
                        </div>
                        <span className="font-semibold">₹{formatCurrency(transaction.amount)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.pname} • {formatDate(transaction.completed_date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 p-2 border rounded-lg bg-gray-50">
                No payable transactions found
              </p>
            )}
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="flex justify-between font-semibold">
                <span>Total Payable Amount:</span>
                <span className="text-blue-700">₹{formatCurrency(totalPayableAmount)}</span>
              </div>
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Amount Paid (₹)
          </label>
          <input
            type="number"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            placeholder="e.g., 100000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            disabled={processingPayment || paymentResult?.success}
          />

          <button
            onClick={handleProcessPayment}
            disabled={
              processingPayment ||
              paymentResult?.success ||
              parseFloat(rechargeAmount) <= 0
            }
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {processingPayment ? "Processing Payment..." : "Confirm Payment"}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            Note: Payment will be applied to the oldest overdue transactions first, then pending transactions.
          </p>
        </Modal>
      )}
    </div>
  );
}

// Loading component
function ClientHistoryLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-3 text-gray-600">Loading client history...</p>
      </div>
    </div>
  );
}

// Main component
export default function ClientHistory() {
  return (
    <Suspense fallback={<ClientHistoryLoading />}>
      <ClientHistoryContent />
    </Suspense>
  );
}