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
    payment_type: "1", // Default to Cash
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
  const [rechargeResult, setRechargeResult] = useState(null); // Store recharge result with paid/pending requests

  useEffect(() => {
    if (customerId) {
      // Validate customer ID
      const customerIdNum = parseInt(customerId);
      if (isNaN(customerIdNum) || customerIdNum <= 0) {
        setError("Invalid Customer ID");
        setPageLoading(false);
        return;
      }
      
      console.log('✅ Valid Customer ID:', customerIdNum);
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
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`/api/customers/recharge-request?id=${customerId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Customer data response:', data);
      
      if (data.success) {
        setCustomerData(data);
        // For non-billing customers, set payment_type to Cash (1) by default
        if (data.customer?.billing_type === 2) {
          setFormData(prev => ({ ...prev, payment_type: "1" }));
        }
      } else {
        throw new Error(data.error || "Failed to fetch customer data");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.name === 'AbortError') {
        setError("Request timeout. Please check your connection and try again.");
      } else {
        setError(err.message || "Network error occurred");
      }
    } finally {
      setPageLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate payment breakdown based on amount - WITH DAY-WISE BREAKDOWN
  const calculatePaymentBreakdown = (amount) => {
    const clientType = customerData?.customer?.client_type;
    
    // Prepaid: Recharge = Balance se MINUS
    if (clientType === "1") {
      const paymentAmount = parseFloat(amount) || 0;
      const currentBalance = customerData?.balance?.current_balance || 0;
      const newBalance = currentBalance - paymentAmount; // ✅ Balance se MINUS
      
      return {
        customerType: 'prepaid',
        canPayRequests: 0,
        amountUsed: 0,
        daysToAdd: 0,
        amountUsedForDays: 0,
        remainingChange: 0,
        newBalance,
        hasPendingRequests: false,
        daysCleared: 0,
        dayWiseBreakdown: []
      };
    }
    
    // Postpaid: Recharge = Balance se MINUS, Outstanding invoices se pay
    if (clientType === "2") {
      const paymentAmount = parseFloat(amount) || 0;
      const currentBalance = customerData?.balance?.current_balance || 0;
      const newBalance = currentBalance - paymentAmount; // ✅ Balance se MINUS
      
      return {
        customerType: 'postpaid',
        canPayRequests: 0,
        amountUsed: 0,
        daysToAdd: 0,
        amountUsedForDays: 0,
        remainingChange: 0,
        newBalance,
        hasPendingRequests: false,
        daysCleared: 0,
        dayWiseBreakdown: []
      };
    }
    
    // Day Limit: Day-wise breakdown
    if (clientType !== "3") {
      return { 
        customerType: 'unknown',
        canPayRequests: 0, 
        amountUsed: 0,
        daysToAdd: 0,
        amountUsedForDays: 0,
        remainingChange: 0,
        hasPendingRequests: false,
        daysCleared: 0,
        dayWiseBreakdown: []
      };
    }

    const paymentAmount = parseFloat(amount) || 0;
    const dayWiseBreakdown = customerData.pending?.day_wise_breakdown || [];
    const totalPendingAmount = customerData.pending?.total_amount || 0;

    // Calculate how many days can be paid
    let daysCleared = 0;
    let amountUsedForDays = 0;
    let remainingAmount = paymentAmount;
    const daysToPay = [];

    // Process day-by-day
    for (const dayData of dayWiseBreakdown) {
      if (remainingAmount <= 0) break;

      const dayTotal = parseFloat(dayData.day_total) || 0;
      const dayRequests = dayData.requests || []; // Get individual requests for this day

      if (remainingAmount >= dayTotal) {
        // Can pay for this entire day
        daysCleared++;
        amountUsedForDays += dayTotal;
        remainingAmount -= dayTotal;
        daysToPay.push({
          day_date: dayData.day_date,
          day_total: dayTotal,
          transaction_count: dayData.transaction_count,
          can_pay: true,
          requests: dayRequests // Include individual requests
        });
      } else {
        // Cannot pay for this day (insufficient amount)
        daysToPay.push({
          day_date: dayData.day_date,
          day_total: dayTotal,
          transaction_count: dayData.transaction_count,
          can_pay: false,
          required_amount: dayTotal,
          available_amount: remainingAmount,
          requests: dayRequests // Include individual requests even if not paid
        });
        break;
      }
    }

      const remainingChange = remainingAmount;
    
    // ✅ Recharge = Balance se MINUS, Total Day Amount me ADD
    // ✅ Outstanding invoices pay honge from payment amount
    const currentBalance = customerData?.balance?.current_balance || 0;
    const totalDayAmount = customerData?.balance?.total_day_amount || 0;
    const newBalance = currentBalance - paymentAmount; // ✅ Balance se MINUS (recharge)
    const newTotalDayAmount = totalDayAmount + paymentAmount; // Track total recharged
    
    // DAY LIMIT NO CHANGE
    const newDayLimit = customerData.customer.day_limit || 0;

    return {
      customerType: 'day_limit',
      canPayRequests: daysCleared > 0 ? dayWiseBreakdown.slice(0, daysCleared).reduce((sum, d) => sum + (d.transaction_count || 0), 0) : 0,
      amountUsed: amountUsedForDays,
      daysToAdd: 0, // Always 0 now
      amountUsedForDays: amountUsedForDays,
      remainingChange,
      newBalance,
      newTotalDayAmount,
      newDayLimit,
      totalPendingAmount,
      hasPendingRequests: dayWiseBreakdown.length > 0,
      daysCleared, // ✅ Days that will be cleared
      dayWiseBreakdown: daysToPay // ✅ Day-wise breakdown for display
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

      // ✅ FIX: Use client-history PATCH route for payment processing (same as day_limit recharge)
      const response = await fetch('/api/customers/client-history', {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: parseInt(customerId),
          rechargeAmount: parseFloat(formData.amount)
        }),
      });

      const data = await response.json();
      console.log('Payment response:', data);
      
      if (response.ok && data.success) {
        // Store response data for showing request list
        setRechargeResult(data);
        
        let message = data.message || "Recharge processed successfully!";
        
        // ✅ Enhanced message format for all customer types
        if (data.newBalance !== undefined) {
          message += `\n\n💰 New Balance: ₹${data.newBalance.toFixed(2)}`;
        }
        if (data.newTotalDayAmount !== undefined && data.newTotalDayAmount > 0) {
          message += `\n\n📊 Total Day Amount: ₹${data.newTotalDayAmount.toFixed(2)}`;
        }
        if (data.dayRemainingAmount !== undefined && data.dayRemainingAmount > 0) {
          message += `\n\n💵 Extra Payment Stored: ₹${data.dayRemainingAmount.toFixed(2)} (will be used for future requests)`;
        }
        if (data.daysCleared !== undefined && data.daysCleared > 0) {
          message += `\n\n📅 Days Cleared: ${data.daysCleared}`;
        }
        if (data.invoicesPaid !== undefined && data.invoicesPaid > 0) {
          message += `\n\n✅ Paid Requests: ${data.invoicesPaid}`;
        }
        if (data.amountPaid !== undefined && data.amountPaid > 0) {
          message += `\n\n💳 Amount Paid: ₹${data.amountPaid.toFixed(2)}`;
        }
        if (data.remainingBalance !== undefined && data.remainingBalance > 0) {
          message += `\n\n💵 Remaining Credit: ₹${data.remainingBalance.toFixed(2)}`;
        }
        
        setSuccessMessage(message);
        setShowModal(false);
        // ✅ For non-billing customers, keep payment_type as Cash (1), for others use RTGS (2)
        const defaultPaymentType = customerData?.customer?.billing_type === 2 ? "1" : "2";
        setFormData({
          amount: "",
          payment_date: new Date().toISOString().split("T")[0],
          payment_type: defaultPaymentType,
          transaction_id: "",
          utr_no: "",
          comments: "",
        });
        
        // Refresh customer data
        await fetchCustomerData();
        
        setTimeout(() => {
          setSuccessMessage("");
        }, 30000); // Increased timeout to 30 seconds to see request list
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
  const isPrepaid = customerData?.customer.client_type === "1";
  const isPostpaid = customerData?.customer.client_type === "2";
  const paymentBreakdown = calculatePaymentBreakdown(formData.amount);
  const hasPendingRequests = customerData?.pending?.request_count > 0;

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
            
            {/* Success Message with Request List */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-green-400 mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-green-800">Success!</h3>
                        <div className="mt-1 text-sm text-green-700 whitespace-pre-line">
                          {successMessage}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSuccessMessage("");
                          setRechargeResult(null);
                        }}
                        className="ml-4 text-green-600 hover:text-green-800 text-lg"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* ✅ Show Paid and Pending Requests List */}
                    {rechargeResult && (rechargeResult.paidRequests?.length > 0 || rechargeResult.pendingRequests?.length > 0) && (
                      <div className="mt-4 space-y-4">
                        {/* Paid Requests */}
                        {rechargeResult.paidRequests && rechargeResult.paidRequests.length > 0 && (
                          <div className="bg-white rounded-lg border border-green-300 p-4">
                            <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                              <span className="mr-2">✅</span>
                              Paid Requests ({rechargeResult.paidRequests.length}) - Total: {formatCurrency(
                                rechargeResult.paidRequests.reduce((sum, req) => sum + (req.amount || 0), 0)
                              )}
                            </h4>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {rechargeResult.paidRequests.map((req, index) => (
                                <div key={index} className="p-2 bg-green-50 rounded border border-green-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-gray-800">
                                        Request #{req.rid || req.id}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Vehicle: {req.vehicle_number || 'N/A'} | {req.product_name || 'N/A'}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Completed: {req.completed_date ? new Date(req.completed_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                                      </p>
                                      {req.station_name && (
                                        <p className="text-xs text-gray-600">
                                          Station: {req.station_name}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right ml-3">
                                      <p className="text-xs font-semibold text-green-700">
                                        {formatCurrency(req.amount || 0)}
                                      </p>
                                      <p className="text-xs text-green-600 font-semibold">✅ Paid</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Pending Requests */}
                        {rechargeResult.pendingRequests && rechargeResult.pendingRequests.length > 0 && (
                          <div className="bg-white rounded-lg border border-orange-300 p-4">
                            <h4 className="text-sm font-semibold text-orange-800 mb-3 flex items-center">
                              <span className="mr-2">⏳</span>
                              Pending Requests ({rechargeResult.pendingRequests.length}) - Total: {formatCurrency(
                                rechargeResult.pendingRequests.reduce((sum, req) => sum + (req.amount || 0), 0)
                              )}
                            </h4>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {rechargeResult.pendingRequests.map((req, index) => (
                                <div key={index} className="p-2 bg-orange-50 rounded border border-orange-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-gray-800">
                                        Request #{req.rid || req.id}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Vehicle: {req.vehicle_number || 'N/A'} | {req.product_name || 'N/A'}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Completed: {req.completed_date ? new Date(req.completed_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                                      </p>
                                      {req.station_name && (
                                        <p className="text-xs text-gray-600">
                                          Station: {req.station_name}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right ml-3">
                                      <p className="text-xs font-semibold text-orange-700">
                                        {formatCurrency(req.amount || 0)}
                                      </p>
                                      <p className="text-xs text-orange-600 font-semibold">⏳ Pending</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Extra Payment Info */}
                        {rechargeResult.dayRemainingAmount && rechargeResult.dayRemainingAmount > 0 && (
                          <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-800">
                              💵 Extra Payment Stored: {formatCurrency(rechargeResult.dayRemainingAmount)}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              This amount is stored and will be used for future pending requests automatically
                            </p>
                          </div>
                        )}
                      </div>
                    )}
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
                <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-gray-200 pt-6">
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
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-sm font-medium text-red-600 mb-1">Payment Days Pending</div>
                    <div className="text-lg font-semibold text-red-700">
                      {customerData?.pending.payment_days_pending || 0} days
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {customerData?.pending.payment_days_pending > 0 
                        ? `Oldest unpaid transaction is ${customerData?.pending.payment_days_pending} days old`
                        : 'No pending payments'}
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
              {isDayLimitCustomer ? "Make Payment" : (isPrepaid ? "Recharge Wallet" : (isPostpaid ? "Recharge & Pay Invoices" : "Recharge"))}
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
                {isDayLimitCustomer ? "Make Payment" : (isPrepaid ? "Recharge Wallet" : (isPostpaid ? "Recharge & Pay Invoices" : "Recharge"))} - {customerData?.customer?.name}
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
              {(isDayLimitCustomer && hasPendingRequests) && (
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

              {/* Payment Preview - Show for all customer types */}
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Payment Preview</p>
                  
                  {/* Balance Update */}
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700">💰 Balance Update</p>
                    <p className="text-xs text-gray-600">
                      Balance: {formatCurrency(customerData?.balance?.current_balance || 0)} → {formatCurrency(paymentBreakdown.newBalance)}
                    </p>
                    {isDayLimitCustomer && (
                      <p className="text-xs text-gray-600">
                        Total Day Amount: {formatCurrency(customerData?.balance?.total_day_amount || 0)} → {formatCurrency(paymentBreakdown.newTotalDayAmount || 0)}
                      </p>
                    )}
                    {(isPrepaid || isPostpaid) && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Amount will be added to wallet balance
                      </p>
                    )}
                  </div>
                  
                  {/* Day-wise Breakdown - Only for Day Limit */}
                  {isDayLimitCustomer && paymentBreakdown.dayWiseBreakdown && paymentBreakdown.dayWiseBreakdown.length > 0 && (
                    <div className="mb-3 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">📅 Day-wise Payment Breakdown</p>
                      
                      {/* Summary */}
                      <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs font-semibold text-blue-800">
                          📊 Total Days with Pending Requests: {paymentBreakdown.dayWiseBreakdown.length}
                        </p>
                        <p className="text-xs text-blue-700">
                          Total Requests: {customerData?.pending?.request_count || 0} | Total Amount: {formatCurrency(customerData?.pending?.total_amount || 0)}
                        </p>
                        {paymentBreakdown.daysCleared > 0 && (
                          <p className="text-xs text-green-700 mt-1 font-semibold">
                            ✅ {paymentBreakdown.daysCleared} day(s) payment will be made ({paymentBreakdown.canPayRequests} requests)
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {paymentBreakdown.dayWiseBreakdown.map((day, dayIndex) => {
                          // Calculate days elapsed since completion date (for this day)
                          const completedDate = day.day_date ? new Date(day.day_date) : null;
                          const currentDate = new Date();
                          currentDate.setHours(0, 0, 0, 0);
                          let daysElapsed = 0;
                          if (completedDate) {
                            completedDate.setHours(0, 0, 0, 0);
                            const timeDiff = currentDate.getTime() - completedDate.getTime();
                            daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
                          }
                          
                          const dayLimit = customerData?.customer?.day_limit || 0;
                          const isOverdue = dayLimit > 0 && daysElapsed >= dayLimit;
                          
                          return (
                            <div 
                              key={dayIndex} 
                              className={`p-3 rounded border ${
                                day.can_pay 
                                  ? 'bg-green-100 border-green-300' 
                                  : 'bg-red-100 border-red-300'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-gray-800">
                                      {day.can_pay ? '✅' : '❌'} Day {dayIndex + 1}
                                    </span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                      isOverdue ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'
                                    }`}>
                                      {daysElapsed} day{daysElapsed !== 1 ? 's' : ''} ago {isOverdue ? '(OVERDUE)' : ''}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-gray-700 mb-1">
                                    Completion Date: {completedDate ? completedDate.toLocaleDateString('en-IN', {
                                      timeZone: 'Asia/Kolkata', 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric' 
                                    }) : 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    📦 {day.transaction_count} request{day.transaction_count !== 1 ? 's' : ''} completed on this day
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    💰 Day Total Amount: {formatCurrency(day.day_total)}
                                  </p>
                                </div>
                                <div className="text-right ml-3">
                                  <p className={`text-sm font-bold ${
                                    day.can_pay ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {formatCurrency(day.day_total)}
                                  </p>
                                  {day.can_pay ? (
                                    <p className="text-xs text-green-600 font-semibold mt-1">✅ Will Pay</p>
                                  ) : (
                                    <div>
                                      <p className="text-xs text-red-600 font-semibold mt-1">❌ Pending</p>
                                      {day.required_amount && (
                                        <p className="text-xs text-red-600 mt-0.5">
                                          Need: {formatCurrency(day.required_amount)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {paymentBreakdown.daysCleared > 0 && (
                        <div className="mt-2 p-2 bg-green-200 rounded border border-green-300">
                          <p className="text-sm font-semibold text-green-800">
                            ✅ {paymentBreakdown.daysCleared === 1 ? '1 day payment' : `${paymentBreakdown.daysCleared} days payment`} will be made
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            {paymentBreakdown.canPayRequests} request(s) will be paid | Amount: {formatCurrency(paymentBreakdown.amountUsed)}
                          </p>
                        </div>
                      )}
                      
                      {/* Remaining Requests */}
                      {paymentBreakdown.totalPendingAmount > paymentBreakdown.amountUsed && (
                        <div className="mt-2 p-2 bg-orange-100 rounded border border-orange-300">
                          <p className="text-xs font-semibold text-orange-800">
                            ⚠️ Remaining: {formatCurrency(paymentBreakdown.totalPendingAmount - paymentBreakdown.amountUsed)}
                          </p>
                          <p className="text-xs text-orange-700">
                            More payment needed to clear all pending requests
                          </p>
                        </div>
                      )}
                    </div>
                  )}

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
                    Amount will clear pending requests first. Remaining amount will be kept as credit.
                  </p>
                )}
                {isPrepaid && (
                  <p className="text-xs text-blue-500 mt-1">
                    💰 Recharge amount will be deducted from balance (payment made).
                  </p>
                )}
                {isPostpaid && (
                  <p className="text-xs text-purple-500 mt-1">
                    💳 Recharge amount will be deducted from balance. Outstanding invoices will be automatically paid from this payment.
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
                  {/* For non-billing customers (billing_type = 2), only show Cash */}
                  {customerData?.customer?.billing_type === 2 ? (
                    <option value="1">Cash</option>
                  ) : (
                    <>
                      <option value="2">RTGS</option>
                      <option value="3">NEFT</option>
                      <option value="4">UPI</option>
                      <option value="5">CHEQUE</option>
                      <option value="1">Cash</option>
                    </>
                  )}
                </select>
              </div>

              {/* Transaction/UTR Number - Hidden for non-billing customers (cash only) */}
              {customerData?.customer?.billing_type !== 2 && (
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
              )}

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
                    isDayLimitCustomer ? "Make Payment" : (isPrepaid ? "Recharge" : (isPostpaid ? "Recharge & Pay" : "Recharge"))
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