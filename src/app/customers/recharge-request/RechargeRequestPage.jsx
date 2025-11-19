// src/app/customers/recharge-request/RechargeRequestPage.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function RechargeRequestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const customerId = searchParams.get("id");

  const [formData, setFormData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_type: "2",
    transaction_id: "",
    utr_no: "",
    comments: "",
  });

  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    } else {
      setError("Customer ID is required");
      setPageLoading(false);
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setPageLoading(true);
      setError("");
      
      console.log('Fetching customer data for ID:', customerId);
      const response = await fetch(`/api/customers/recharge-request?id=${customerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Customer data response:', data);
      
      if (data.success) {
        setCustomerData(data);
      } else {
        throw new Error(data.error || "Failed to fetch customer data");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Network error occurred");
    } finally {
      setPageLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate payment breakdown based on amount
  const calculatePaymentBreakdown = (amount) => {
    if (!customerData || customerData.customer.client_type !== "3") {
      return { 
        canPayRequests: 0, 
        amountUsed: 0,
        daysToAdd: 0,
        amountUsedForDays: 0,
        remainingChange: 0,
        hasPendingRequests: false
      };
    }

    const paymentAmount = parseFloat(amount) || 0;
    const pendingRequests = customerData.pending.request_count;
    const totalPendingAmount = customerData.pending.total_amount;
    const dayLimitAmount = 100000; // Fixed ₹1 lakh per day

    // Calculate how many pending requests can be paid
    let canPayRequests = 0;
    let amountUsedForPending = 0;
    let remainingAmount = paymentAmount;

    // First, calculate pending requests that can be paid
    if (pendingRequests > 0 && totalPendingAmount > 0) {
      // For preview, we'll use average calculation
      const avgAmount = totalPendingAmount / pendingRequests;
      
      for (let i = 0; i < pendingRequests; i++) {
        if (remainingAmount >= avgAmount) {
          canPayRequests++;
          amountUsedForPending += avgAmount;
          remainingAmount -= avgAmount;
        } else {
          break;
        }
      }
    }

    // Calculate days from payment amount
    let daysToAdd = 0;
    let amountUsedForDays = 0;
    let remainingChange = 0;
    
    if (paymentAmount > 0) {
      daysToAdd = Math.floor(paymentAmount / dayLimitAmount);
      amountUsedForDays = daysToAdd * dayLimitAmount;
      remainingChange = paymentAmount - amountUsedForDays;
    }

    // Balance से MINUS, Total Day Amount में ADD
    const newBalance = (customerData.balance.current_balance || 0) - paymentAmount;
    const newTotalDayAmount = (customerData.balance.total_day_amount || 0) + paymentAmount;
    
    // Day Limit में ADD
    const newDayLimit = (customerData.customer.day_limit || 0) + daysToAdd;

    return {
      canPayRequests,
      amountUsed: amountUsedForPending,
      daysToAdd,
      amountUsedForDays,
      remainingChange,
      newBalance,
      newTotalDayAmount,
      newDayLimit,
      totalPendingAmount,
      dayLimitAmount,
      hasPendingRequests: pendingRequests > 0
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        com_id: parseInt(customerId),
        amount: parseFloat(formData.amount),
      };

      console.log('Submitting payment request:', payload);

      const response = await fetch('/api/customers/recharge-request', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Payment response:', data);
      
      if (response.ok && data.success) {
        let message = data.message || "Payment processed successfully!";
        
        if (data.data) {
          if (data.data.old_balance !== undefined && data.data.new_balance !== undefined) {
            message += `\n\n💰 Balance: ₹${data.data.old_balance} → ₹${data.data.new_balance}`;
          }
          if (data.data.old_total_day_amount !== undefined && data.data.new_total_day_amount !== undefined) {
            message += `\n\n📊 Total Day Amount: ₹${data.data.old_total_day_amount} → ₹${data.data.new_total_day_amount}`;
          }
          if (data.data.old_day_limit !== undefined && data.data.new_day_limit !== undefined) {
            message += `\n\n📅 Day Limit: ${data.data.old_day_limit} → ${data.data.new_day_limit} days`;
          }
          if (data.data.paid_requests) {
            message += `\n\n✅ Cleared requests: ${data.data.paid_requests}`;
          }
          if (data.data.days_added) {
            message += `\n\n➕ Days added: ${data.data.days_added}`;
          }
        }
        
        setSuccessMessage(message);
        setShowModal(false);
        setFormData({
          amount: "",
          payment_date: new Date().toISOString().split("T")[0],
          payment_type: "2",
          transaction_id: "",
          utr_no: "",
          comments: "",
        });
        
        // Refresh customer data
        await fetchCustomerData();
        
        setTimeout(() => {
          setSuccessMessage("");
        }, 10000);
      } else {
        setError(data.error || "Failed to process payment");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const numValue = Number(value);
    return `₹${isNaN(numValue) ? "0.00" : numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getClientTypeText = (type) => {
    switch(type) {
      case '1': return 'Prepaid';
      case '2': return 'Postpaid';
      case '3': return 'Day Limit';
      default: return 'Unknown';
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (error && !customerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/customers")}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDayLimitCustomer = customerData?.customer.client_type === "3";
  const paymentBreakdown = calculatePaymentBreakdown(formData.amount);
  const hasPendingRequests = customerData?.pending.request_count > 0;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <button
              onClick={() => router.push("/customers")}
              className="mb-6 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Customers
            </button>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-green-800">Success!</h3>
                    <div className="mt-1 text-sm text-green-700 whitespace-pre-line">
                      {successMessage}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg font-semibold text-gray-900">Customer Summary</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-600 mb-1">Customer Name</div>
                  <div className="text-lg font-semibold text-gray-900">{customerData?.customer?.name}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-600 mb-1">Phone Number</div>
                  <div className="text-lg font-semibold text-gray-900">{customerData?.customer?.phone}</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-600 mb-1">Client Type</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {getClientTypeText(customerData?.customer.client_type)}
                  </div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm font-medium text-orange-600 mb-1">Current Balance</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(customerData?.balance?.current_balance)}
                  </div>
                </div>
              </div>

              {isDayLimitCustomer && (
                <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 pt-6">
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-sm font-medium text-yellow-600 mb-1">Day Limit</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {customerData?.customer.day_limit || 0} days
                    </div>
                  </div>
                  <div className="text-center p-4 bg-pink-50 rounded-lg">
                    <div className="text-sm font-medium text-pink-600 mb-1">Pending Requests</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {customerData?.pending.request_count} ({formatCurrency(customerData?.pending.total_amount)})
                    </div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 rounded-lg">
                    <div className="text-sm font-medium text-teal-600 mb-1">Total Recharged</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(customerData?.balance?.total_day_amount)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-1 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FIXED BUTTON */}
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => setShowModal(true)}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold text-base rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              {isDayLimitCustomer ? "Make Payment" : "Recharge Wallet"}
            </button>
          </div>
        </main>

        <Footer />
      </div>

      {/* PAYMENT MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-auto relative overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-700 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-white">
                {isDayLimitCustomer ? "Make Payment" : "Recharge Wallet"} - {customerData?.customer?.name}
              </h2>
              <button 
                onClick={() => setShowModal(false)} 
                disabled={loading}
                className="text-white hover:text-gray-200 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {isDayLimitCustomer && hasPendingRequests && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-orange-800">Pending Requests</p>
                  </div>
                  <p className="text-lg font-bold text-orange-600">
                    {customerData.pending.request_count} requests - {formatCurrency(customerData.pending.total_amount)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Will be automatically cleared from payment amount
                  </p>
                </div>
              )}

              {/* Payment Preview */}
              {isDayLimitCustomer && formData.amount && parseFloat(formData.amount) > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Payment Preview</p>
                  
                  {/* Balance Update */}
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700">💰 Balance Update</p>
                    <p className="text-xs text-gray-600">
                      Balance: {formatCurrency(customerData.balance.current_balance)} → {formatCurrency(paymentBreakdown.newBalance)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Total Day Amount: {formatCurrency(customerData.balance.total_day_amount)} → {formatCurrency(paymentBreakdown.newTotalDayAmount)}
                    </p>
                  </div>
                  
                  {/* Pending Requests Clearance */}
                  {paymentBreakdown.canPayRequests > 0 && (
                    <div className="mb-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-semibold text-green-700">
                        ✅ Will clear: {paymentBreakdown.canPayRequests} pending request(s)
                      </p>
                      <p className="text-xs text-green-600">
                        Amount used for pending: {formatCurrency(paymentBreakdown.amountUsed)}
                      </p>
                    </div>
                  )}

                  {/* Days Added */}
                  {paymentBreakdown.daysToAdd > 0 && (
                    <div className="mb-3 p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm font-semibold text-orange-700">
                        📅 Days Added: {paymentBreakdown.daysToAdd} day(s)
                      </p>
                      <p className="text-xs text-orange-600">
                        Amount used for days: {formatCurrency(paymentBreakdown.amountUsedForDays)}
                      </p>
                      <p className="text-xs text-orange-600">
                        New Day Limit: {customerData.customer.day_limit || 0} → {paymentBreakdown.newDayLimit} days
                      </p>
                    </div>
                  )}

                  {/* Remaining Change */}
                  {paymentBreakdown.remainingChange > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm font-semibold text-purple-700">
                        💰 Remaining Credit: {formatCurrency(paymentBreakdown.remainingChange)}
                      </p>
                      <p className="text-xs text-purple-600">
                        This amount will be kept as credit for future
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  min="0.01"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter Amount"
                  disabled={loading}
                />
                {isDayLimitCustomer && (
                  <p className="text-xs text-gray-500 mt-1">
                    ₹1,00,000 = 1 day. Amount will clear pending requests first, then add days to day limit.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type</label>
                <select
                  name="payment_type"
                  value={formData.payment_type}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="2">RTGS</option>
                  <option value="3">NEFT</option>
                  <option value="4">UPI</option>
                  <option value="5">CHEQUE</option>
                  <option value="1">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction/UTR Number</label>
                <input
                  type="text"
                  name="transaction_id"
                  value={formData.transaction_id}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                <input
                  type="text"
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end space-x-4 border-t pt-4 mt-4 sticky bottom-0 bg-white pb-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    isDayLimitCustomer ? "Make Payment" : "Recharge"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}