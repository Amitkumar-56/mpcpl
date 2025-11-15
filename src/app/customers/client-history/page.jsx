// app/customers/client-history/page.jsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// --- MOCK COMPONENTS (Replace with your actual components) ---
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
// ----------------------------------------------------------

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

  // NEW STATES FOR PAYMENT PROCESSING AND BALANCE INFO
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerBalanceInfo, setCustomerBalanceInfo] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const cid = searchParams.get("id");

  // Check if customer is day_limit type
  const isDayLimitCustomer = customerBalanceInfo?.day_limit > 0;

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

  // Calculate transaction status - ONLY for day_limit customers
  const getTransactionStatus = (transaction) => {
    // For inward transactions (recharges), always show as "Recharge"
    if (transaction.trans_type === "inward") {
      return { status: "inward", color: "green" };
    }

    // For outward transactions, check payment_status
    if (transaction.payment_status === 1) {
      return { status: "Paid", color: "green" };
    }

    // If payment_status is 0 (Unpaid), check if it's overdue
    // BUT ONLY if customer has day_limit type
    if (transaction.payment_status === 0 && isDayLimitCustomer) {
      const transactionDate = new Date(transaction.completed_date || transaction.filling_date || transaction.created_at);
      const currentDate = new Date();
      const daysDifference = Math.floor((currentDate - transactionDate) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > 30) {
        return { status: "Overdue", color: "red" };
      } else {
        return { status: "Pending", color: "orange" };
      }
    }

    // For amt_limit customers OR non-day_limit, return null (no status)
    return null;
  };

  // Calculate days used and remaining for day_limit customers
  const getDayLimitInfo = () => {
    if (!isDayLimitCustomer) return null;
    const dayLimit = customerBalanceInfo?.day_limit || 0;
    const lastResetDate = customerBalanceInfo?.last_reset_date;
    // Days used are calculated from earliest pending transaction's completed_date
    let daysUsed = 0;
    const earliest = pendingTransactions && pendingTransactions[0]?.completed_date;
    if (earliest) {
      const diffMs = Date.now() - new Date(earliest).getTime();
      daysUsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
    const daysRemaining = Math.max(0, dayLimit - daysUsed);
    return {
      dayLimit,
      daysUsed,
      daysRemaining,
      lastResetDate
    };
  };

  // New Payment Handlers
  const handleRechargeClick = () => {
    setShowPaymentModal(true);
    setRechargeAmount("");
    setPaymentResult(null);
  };

  const handleProcessPayment = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid recharge amount.");
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
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPaymentResult(result);
        // Re-fetch data to update balance, transactions, and pending lists
        fetchTransactions();

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
    return new Date(dateString).toLocaleDateString('en-IN');
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const PaymentStatusBadge = ({ status, transactionType }) => {
    if (!status) return null; // Don't render anything if no status

    const styles = {
      paid: "bg-green-100 text-green-800 border-green-200",
      overdue: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-orange-100 text-orange-800 border-orange-200",
      recharge: "bg-blue-100 text-blue-800 border-blue-200",
    };

    const style =
      transactionType === "inward"
        ? styles.recharge
        : styles[status?.toLowerCase()] ||
          "bg-gray-100 text-gray-800 border-gray-200";

    const displayStatus = transactionType === "inward" ? "inward" : status;

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${style}`}
      >
        {displayStatus || "N/A"}
      </span>
    );
  };

  const TransactionTypeBadge = ({ type }) => {
    const styles = {
      outward: "bg-red-100 text-red-800 border-red-200",
      inward: "bg-green-100 text-green-800 border-green-200",
    };

    const style =
      styles[type?.toLowerCase()] ||
      "bg-gray-100 text-gray-800 border-gray-200";
    const displayText =
      type === "outward" ? "outward" : type === "inward" ? "inward" : type;

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${style}`}
      >
        {displayText}
      </span>
    );
  };

  // Mobile Card View - WITH ALL COLUMNS
  const TransactionCard = ({ transaction }) => {
    const statusInfo = getTransactionStatus(transaction);

    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-3 hover:shadow-md transition-shadow">
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
          <div>
            <p className="text-gray-500 text-xs font-medium">Remaining Limit</p>
            <p className="font-medium">
              {isDayLimitCustomer ? 
                (transaction.remaining_day_limit || "N/A") : 
                (transaction.remaining_limit || "N/A")}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Limit</p>
            <p className="font-medium">{transaction.limit_type || "N/A"}</p>
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
          {/* Conditionally render status only for day_limit customers */}
          {isDayLimitCustomer && (
            <div className="col-span-2">
              <p className="text-gray-500 text-xs font-medium">Status</p>
              <PaymentStatusBadge
                status={statusInfo?.status}
                transactionType={transaction.trans_type}
              />
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

  // Calculate total pending amount for display in modal/header
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
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
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
                      Limit Type: {isDayLimitCustomer ? 'Day Limit' : 'Amount Limit'} | 
                      {isDayLimitCustomer ? ` Day Limit: ${customerBalanceInfo.day_limit}` : ` Amount Limit: ₹${formatCurrency(customerBalanceInfo.amtlimit)}`}
                    </p>
                    {/* Day Limit Information - ONLY for day_limit customers */}
                    {isDayLimitCustomer && dayLimitInfo && (
                      <div className="flex space-x-4 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Days Used: {dayLimitInfo.daysUsed}/{dayLimitInfo.dayLimit}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          Days Remaining: {dayLimitInfo.daysRemaining}
                        </span>
                        {/* No expiry for Day Limit customers */}
                      </div>
                    )}
                  </div>
                )}
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {customerBalanceInfo && !isDayLimitCustomer && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Remaining Limit (amtlimit)</p>
                  <p className="text-lg font-bold text-indigo-600">
                    ₹{formatCurrency(customerBalanceInfo.amtlimit)}
                  </p>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm text-gray-500">Outstanding (balance)</p>
                <p
                  className={`text-lg font-bold ${
                    balance < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  ₹{formatCurrency(balance)}
                </p>
              </div>

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
                <span>Recharge/Pay</span>
              </button>

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
        {isDayLimitCustomer && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Day Limit Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trans Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loading Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Limit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recharge</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding after Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingTransactions && pendingTransactions.length > 0 ? (
                    pendingTransactions.map((t, index) => {
                      const dayLimit = t.days_limit || customerBalanceInfo?.day_limit || 0;
                      const completed = t.completed_date ? new Date(t.completed_date) : null;
                      
                      // Calculate remaining days: current date - completed date (days elapsed)
                      const currentDate = new Date();
                      currentDate.setHours(0, 0, 0, 0);
                      let remainingDays = 0;
                      if (completed) {
                        completed.setHours(0, 0, 0, 0);
                        const timeDiff = currentDate.getTime() - completed.getTime();
                        remainingDays = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
                      }
                      
                      const isPaid = Number(t.payment_status) === 1;
                      // Overdue if: not paid AND day limit > 0 AND remaining days (elapsed) >= day limit
                      const overdue = !isPaid && dayLimit > 0 && remainingDays >= dayLimit;
                      
                      // Get values from API response (already calculated in backend)
                      const recharge = t.recharge !== undefined ? t.recharge : (isPaid ? parseFloat(t.amount || 0) : 0);
                      const transactionOutstanding = t.outstanding_balance !== undefined 
                        ? t.outstanding_balance 
                        : (isPaid ? 0 : parseFloat(t.amount || 0));
                      const outstandingAfter = t.outstanding_after_payment !== undefined 
                        ? t.outstanding_after_payment 
                        : (isPaid ? 0 : parseFloat(t.amount || 0));
                      
                      // Status: Paid, Open, or Overdue
                      const status = t.overdue_status || (isPaid ? 'Paid' : overdue ? 'Overdue' : 'Open');
                      
                      return (
                        <tr key={t.id} className={overdue ? 'bg-red-50' : isPaid ? 'bg-green-50' : ''}>
                          <td className="px-4 py-2 text-sm">{t.station_name || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm">{formatDateTime(t.completed_date)}</td>
                          <td className="px-4 py-2 text-sm">{t.pname || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm">{t.vehicle_number || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm">{t.trans_type || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm">{t.loading_qty ?? t.aqty ?? 0}</td>
                          <td className="px-4 py-2 text-sm font-semibold">₹{formatCurrency(t.amount)}</td>
                          <td className="px-4 py-2 text-sm">{dayLimit}</td>
                          <td className="px-4 py-2 text-sm font-semibold">
                            <span className={transactionOutstanding > 0 ? 'text-red-600' : 'text-green-600'}>
                              ₹{formatCurrency(transactionOutstanding)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold">
                            <span className={remainingDays >= dayLimit ? 'text-red-600 font-bold' : remainingDays > dayLimit * 0.7 ? 'text-orange-600' : 'text-blue-600'}>
                              {remainingDays}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">{dayLimit}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={recharge > 0 ? 'text-green-600 font-semibold' : ''}>
                              ₹{formatCurrency(recharge)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold">
                            <span className={outstandingAfter > 0 ? 'text-red-600' : 'text-green-600'}>
                              ₹{formatCurrency(outstandingAfter)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              status === 'Paid' 
                                ? 'bg-green-100 text-green-800' 
                                : status === 'Overdue' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                    <tr>
                      <td className="px-4 py-3 text-center text-sm text-gray-500" colSpan={14}>No day limit transactions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                <div className="text-red-600 font-semibold">
                  Total Due: ₹{formatCurrency(totalPendingAmount)}
                </div>
                {isDayLimitCustomer && (
                  <div className="text-blue-600 font-semibold">
                    Day Limit Customer
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section - WITH ALL COLUMNS */}
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
              {/* Mobile View - WITH ALL FIELDS */}
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
                    <svg
                      className="w-16 h-16 mx-auto text-gray-400"
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
                    <p className="mt-4 text-gray-600">No transactions found</p>
                    <p className="text-sm text-gray-500">
                      Try adjusting your filters or search terms
                    </p>
                    <button
                      onClick={fetchTransactions}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Refresh Data
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop Table View - WITH ALL COLUMNS */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remaining Limit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Limit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Increase Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Decrease Amount
                      </th>
                      {/* Conditionally render Status column only for day_limit customers */}
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
                        const statusInfo = getTransactionStatus(transaction);

                        return (
                          <tr
                            key={transaction.id}
                            className="hover:bg-gray-50 transition-colors"
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
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {isDayLimitCustomer ? 
                                (transaction.remaining_day_limit || "N/A") : 
                                (transaction.remaining_limit || "N/A")}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {transaction.limit_type || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                              ₹{formatCurrency(transaction.in_amount)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-red-600">
                              ₹{formatCurrency(transaction.d_amount)}
                            </td>
                            {/* Conditionally render Status cell only for day_limit customers */}
                            {isDayLimitCustomer && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <PaymentStatusBadge
                                  status={statusInfo?.status}
                                  transactionType={transaction.trans_type}
                                />
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
                        <td colSpan={isDayLimitCustomer ? "17" : "16"} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center text-gray-500">
                            <svg
                              className="w-16 h-16 mb-4"
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
                            <p className="text-lg font-medium">
                              No transactions found
                            </p>
                            <p className="text-sm mb-4">
                              Try adjusting your filters or search terms
                            </p>
                            <button
                              onClick={fetchTransactions}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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

      {/* Payment Modal */}
      <Modal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Process Payment / Recharge"
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
            {paymentResult.success && (
              <p className="text-sm mt-1">
                Invoices Paid: {paymentResult.invoicesPaid}
              </p>
            )}
          </div>
        )}

        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800">
            Total Outstanding Due:
          </p>
          <p className="text-xl font-bold text-red-600">
            ₹{formatCurrency(totalPendingAmount)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Payment will deduct the total balance, reset Day Limit counter, and
            extend validity days.
          </p>
          {isDayLimitCustomer && (
            <p className="text-xs text-blue-600 mt-1 font-semibold">
              Day Limit Customer - Overdue rules apply after 30 days
            </p>
          )}
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
          {processingPayment ? "Processing..." : "Confirm Payment"}
        </button>

        <p className="text-xs text-gray-500 text-center mt-3">
          Payment will automatically cover the oldest outstanding invoices
          first.
        </p>
      </Modal>
    </div>
  );
}

// Loading component for Suspense fallback
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

// Main component wrapped with Suspense
export default function ClientHistory() {
  return (
    <Suspense fallback={<ClientHistoryLoading />}>
      <ClientHistoryContent />
    </Suspense>
  );
}