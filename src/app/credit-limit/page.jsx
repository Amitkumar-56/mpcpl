"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CreditLimitContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [customer, setCustomer] = useState({});
  const [balance, setBalance] = useState({});
  const [inAmount, setInAmount] = useState("");
  const [dAmount, setDAmount] = useState("");
  const [validityDays, setValidityDays] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 4000);
  };

  const fetchData = async () => {
    if (!id) {
      showNotification("No customer ID provided", "error");
      return;
    }
    
    try {
      setLoading(true);
      console.log("🟡 Fetching data for customer ID:", id);
      
      const res = await axios.get(`/api/credit-limit?id=${id}`);
      console.log("🟢 Data fetched:", res.data);
      
      setCustomer(res.data.customer || {});
      setBalance(res.data.balance || {});
    } catch (err) {
      console.error("🔴 Error fetching data:", err);
      showNotification("Error loading customer data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  // Check if limit is expired
  const isLimitExpired = () => {
    if (!balance.limit_expiry) return false;
    const expiryDate = new Date(balance.limit_expiry);
    const now = new Date();
    return expiryDate < now;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!inAmount && !dAmount) {
      showNotification("Please enter either increase or decrease amount", "error");
      return;
    }
    
    if (inAmount && dAmount) {
      showNotification("Please enter only one amount (increase OR decrease)", "error");
      return;
    }

    const amount = inAmount ? parseFloat(inAmount) : parseFloat(dAmount);
    if (amount <= 0) {
      showNotification("Amount must be greater than 0", "error");
      return;
    }

    // For increase, validity days required
    if (inAmount && (!validityDays || validityDays <= 0)) {
      showNotification("Please enter validity days for credit limit increase", "error");
      return;
    }

    // For decrease, check if limit is expired
    if (dAmount && isLimitExpired()) {
      showNotification("Cannot decrease credit limit. Current limit has expired. Please set a new credit limit first.", "error");
      return;
    }

    // For decrease, check sufficient limit (only if not expired)
    if (dAmount && !isLimitExpired() && (getDisplayCreditLimit() < amount)) {
      showNotification(`Insufficient credit limit. Current: ₹${getDisplayCreditLimit()}`, "error");
      return;
    }

    setSubmitting(true);
    try {
      const user_id = 1;

      console.log("🟡 Submitting credit limit update:", {
        com_id: parseInt(id),
        in_amount: inAmount ? parseFloat(inAmount) : 0,
        d_amount: dAmount ? parseFloat(dAmount) : 0,
        validity_days: inAmount ? parseInt(validityDays) : 0,
        user_id,
      });

      const res = await axios.post("/api/credit-limit", {
        com_id: parseInt(id),
        in_amount: inAmount ? parseFloat(inAmount) : 0,
        d_amount: dAmount ? parseFloat(dAmount) : 0,
        validity_days: inAmount ? parseInt(validityDays) : 0,
        user_id,
      });

      console.log("🟢 API Response:", res.data);

      if (res.data.success) {
        showNotification(res.data.message || "Credit limit updated successfully! ✅");
        await fetchData();
        setInAmount("");
        setDAmount("");
        setValidityDays("");
        setModalOpen(false);
      } else {
        showNotification(res.data.error || "Update failed", "error");
      }
    } catch (err) {
      console.error("🔴 API Error:", err);
      
      if (err.response?.data) {
        console.error("Error response:", err.response.data);
        showNotification(err.response.data.error || "Server error occurred", "error");
      } else if (err.request) {
        console.error("No response received");
        showNotification("No response from server", "error");
      } else {
        console.error("Request error:", err.message);
        showNotification("Request failed: " + err.message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setInAmount("");
    setDAmount("");
    setValidityDays("");
    setModalOpen(false);
  };

  // Get display credit limit (0 if expired)
  const getDisplayCreditLimit = () => {
    return isLimitExpired() ? 0 : (balance.cst_limit || 0);
  };

  // Get display amount limit (adjusted if expired)
  const getDisplayAmountLimit = () => {
    if (isLimitExpired()) {
      // When expired: amount_limit = current_amtlimit - expired_credit_limit
      return (balance.amtlimit || 0) - (balance.cst_limit || 0);
    }
    return balance.amtlimit || 0;
  };

  // Get available limit (adjusted if expired)
  const getAvailableLimit = () => {
    const displayAmountLimit = getDisplayAmountLimit();
    const currentBalance = balance.balance || 0;
    return displayAmountLimit - currentBalance;
  };

  const calculateNewLimits = () => {
    const currentCstLimit = parseFloat(balance.cst_limit) || 0;
    const currentAmtLimit = parseFloat(balance.amtlimit) || 0;
    const currentBalanceAmt = parseFloat(balance.balance) || 0;

    if (inAmount && parseFloat(inAmount) > 0) {
      const val = parseFloat(inAmount);
      
      if (isLimitExpired()) {
        // If expired, start fresh - credit limit = new value, amount limit = new value - current balance
        return { 
          cst_limit: val, 
          amtlimit: val - currentBalanceAmt 
        };
      } else {
        // Normal increase
        return { 
          cst_limit: currentCstLimit + val, 
          amtlimit: currentAmtLimit + val 
        };
      }
    }
    
    if (dAmount && parseFloat(dAmount) > 0) {
      const val = parseFloat(dAmount);
      return { 
        cst_limit: currentCstLimit - val, 
        amtlimit: currentAmtLimit - val 
      };
    }

    return { 
      cst_limit: currentCstLimit, 
      amtlimit: currentAmtLimit 
    };
  };

  const calculateExpiryDate = () => {
    if (validityDays && parseInt(validityDays) > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(validityDays));
      return expiryDate.toLocaleDateString('en-IN');
    }
    return null;
  };

  const newLimits = calculateNewLimits();
  const expiryDate = calculateExpiryDate();
  const expired = isLimitExpired();

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
              <p className="text-gray-600">Loading customer data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        {notification.show && (
          <div
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg ${
              notification.type === "error" ? "bg-red-500" : "bg-green-500"
            } text-white transition-all duration-300`}
          >
            <div className="flex items-center">
              {notification.type === "error" ? "❌" : "✅"}
              <span className="ml-2">{notification.message}</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Credit Limit Management</h1>
            <p className="text-gray-600 mb-6">Manage and adjust customer credit limits with validity period.</p>

            {/* Customer Info */}
            <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="text-sm text-gray-500">Customer Name</label>
                  <p className="text-lg font-semibold">{customer.name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone Number</label>
                  <p className="text-lg font-semibold">{customer.phone || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Credit Limit</label>
                  <p className={`text-lg font-semibold ${expired ? 'text-red-600' : 'text-gray-800'}`}>
                    ₹{getDisplayCreditLimit().toLocaleString()}
                    {expired && <span className="text-xs text-red-500 ml-2">(Expired)</span>}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Limit Expiry</label>
                  <p className={`text-lg font-semibold ${expired ? 'text-red-600' : 'text-gray-800'}`}>
                    {balance.limit_expiry ? new Date(balance.limit_expiry).toLocaleDateString('en-IN') : "No expiry"}
                    {expired && <span className="text-xs text-red-500 ml-2">(Expired)</span>}
                  </p>
                </div>
              </div>
              
              {/* Additional Balance Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="text-sm text-gray-500">Amount Limit</label>
                  <p className="text-lg font-semibold text-blue-600">
                    ₹{getDisplayAmountLimit().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Alert */}
            {expired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <span className="text-red-500 text-lg mr-2">⚠️</span>
                  <div>
                    <p className="text-red-700 font-medium">Credit Limit Expired</p>
                    <p className="text-red-600 text-sm">
                      This customer's credit limit has expired. Current credit limit shows as 0. Please set a new credit limit to enable purchases.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Update Button */}
            <div className="text-center mb-6">
              <button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:translate-y-[-1px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setModalOpen(true)}
                disabled={!id}
              >
                Update Credit Limits
              </button>
              {!id && (
                <p className="text-red-500 text-sm mt-2">No customer ID provided</p>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Modal - FIXED WITH TAILWIND CSS */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg">
            
            {/* Header - Sticky for better visibility */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Update Credit Limits</h2>
                <button
                  className="text-2xl hover:text-blue-200 transition-colors disabled:opacity-50"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Credit Limit: ₹{getDisplayCreditLimit().toLocaleString()}</span>
                <span>Amount Limit: ₹{getDisplayAmountLimit().toLocaleString()}</span>
              </div>
              {expired && (
                <div className="mt-2 bg-red-500 bg-opacity-20 rounded px-2 py-1 text-xs">
                  ⚠️ Current limit has expired - Showing as 0
                </div>
              )}
            </div>

            {/* New Limits Preview */}
            {(inAmount || dAmount) && (
              <div className="bg-green-50 border-b border-green-200 p-4 transition-all duration-300">
                <p className="text-green-800 font-medium text-sm">New Limits Preview:</p>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-green-700">
                    Credit Limit: ₹{newLimits.cst_limit.toLocaleString()}
                  </span>
                  <span className="text-green-700">
                    Amount Limit: ₹{newLimits.amtlimit.toLocaleString()}
                  </span>
                </div>
                {expiryDate && (
                  <div className="mt-2 text-green-700 text-sm">
                    <span className="font-medium">Valid until:</span> {expiryDate}
                  </div>
                )}
                {expired && inAmount && (
                  <div className="mt-1 text-green-700 text-sm">
                    <span className="font-medium">Note:</span> Starting fresh with new limit
                  </div>
                )}
              </div>
            )}

            {/* Form Container - Added min-height and flex column */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 min-h-[300px] flex flex-col">
              
              {/* Increase Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 transition-all duration-200">
                <label className="text-green-700 font-medium text-sm mb-1 block">
                  Increase Limits
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-medium">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2 border rounded-lg border-green-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={inAmount}
                      onChange={(e) => { 
                        setInAmount(e.target.value); 
                        if(e.target.value) setDAmount(""); 
                      }}
                      disabled={submitting}
                    />
                  </div>
                  
                  {/* Validity Days - Only show for increase */}
                  {inAmount && (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-medium">📅</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        placeholder="Validity in days (1-365)"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg border-green-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        value={validityDays}
                        onChange={(e) => setValidityDays(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* OR Divider */}
              <div className="flex items-center px-2">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-gray-500 text-sm font-medium">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Decrease Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 transition-all duration-200">
                <label className="text-red-700 font-medium text-sm mb-1 block">
                  Decrease Limits
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-600 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                    value={dAmount}
                    onChange={(e) => { 
                      setDAmount(e.target.value); 
                      if(e.target.value) {
                        setInAmount(""); 
                        setValidityDays("");
                      }
                    }}
                    disabled={submitting || expired}
                  />
                </div>
                {expired && (
                  <p className="text-red-600 text-xs mt-2">
                    Cannot decrease expired limit. Please set a new limit first.
                  </p>
                )}
              </div>

              {/* Action Buttons - Push to bottom with margin-top-auto */}
              <div className="flex space-x-3 mt-auto pt-4">
                <button
                  type="button"
                  className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  disabled={submitting || (!inAmount && !dAmount) || (inAmount && !validityDays)}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </span>
                  ) : (
                    "Update Limits"
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

function CreditLimitLoading() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-600">Loading page...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreditLimitPage() {
  return (
    <Suspense fallback={<CreditLimitLoading />}>
      <CreditLimitContent />
    </Suspense>
  );
}