"use client";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { Suspense, useEffect, useState } from "react";

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading Expense Form...</p>
      </div>
    </div>
  );
}

// Main Content Component
function CreateExpenseContent() {
  const [form, setForm] = useState({
    payment_date: "",
    title: "",
    details: "",
    paid_to: "",
    reason: "",
    amount: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState(false);

  // Fetch current balance
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      const res = await fetch("/api/nb-balance/balance");
      if (!res.ok) throw new Error("Failed to fetch balance");
      
      const data = await res.json();
      if (data.success) {
        setCurrentBalance(data.balance || 0);
      } else {
        throw new Error(data.message || "Failed to fetch balance");
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      alert("Balance लोड करने में समस्या आई। बाद में पुनः प्रयास करें।");
    } finally {
      setBalanceLoading(false);
      setContentLoaded(true);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.payment_date) newErrors.payment_date = "Payment date is required";

    if (!form.title?.trim()) {
      newErrors.title = "Expense title is required";
    } else if (form.title.trim().length < 2) {
      newErrors.title = "Title must be at least 2 characters";
    }

    if (!form.paid_to?.trim()) {
      newErrors.paid_to = "Paid to is required";
    } else if (form.paid_to.trim().length < 2) {
      newErrors.paid_to = "Paid to must be at least 2 characters";
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      newErrors.amount = "Valid amount is required";
    } else if (parseFloat(form.amount) > currentBalance) {
      newErrors.amount = "Amount exceeds available balance";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert("Please fix the form errors before submitting.");
      return;
    }

    if (!confirm("Are you sure you want to create this expense?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/nb-balance/create-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || `HTTP error! status: ${res.status}`);
      }
      
      if (data.success) {
        alert("Expense added successfully!");
        setForm({
          payment_date: "",
          title: "",
          details: "",
          paid_to: "",
          reason: "",
          amount: "",
        });
        setErrors({});
        await fetchBalance(); // Refresh balance
      } else {
        throw new Error(data.message || "Error adding expense");
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setForm({
      payment_date: "",
      title: "",
      details: "",
      paid_to: "",
      reason: "",
      amount: "",
    });
    setErrors({});
  };

  const formatIndianCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Balance loading state
  if (balanceLoading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-blue-200">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading balance...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            {/* Balance Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-blue-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Current Balance</h3>
                <p className="text-3xl font-bold text-green-600">
                  ₹{formatIndianCurrency(currentBalance)}
                </p>
              </div>
            </div>

            {/* Expense Form */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
                <h2 className="text-2xl font-bold text-white">Add New Expense</h2>
                <p className="text-blue-100 text-sm mt-1">Record your business expenses</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={form.payment_date}
                    onChange={handleChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                      errors.payment_date
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  {errors.payment_date && (
                    <p className="text-red-500 text-xs mt-1">{errors.payment_date}</p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g., Office Supplies, Client Meeting"
                    required
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                      errors.title
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                  )}
                </div>

                {/* Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Details
                  </label>
                  <input
                    type="text"
                    name="details"
                    value={form.details}
                    onChange={handleChange}
                    placeholder="Additional details (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Paid To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="paid_to"
                    value={form.paid_to}
                    onChange={handleChange}
                    placeholder="e.g., Vendor, Supplier, Service Provider"
                    required
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                      errors.paid_to
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  {errors.paid_to && (
                    <p className="text-red-500 text-xs mt-1">{errors.paid_to}</p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason/Description
                  </label>
                  <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    placeholder="Optional description or notes..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      max={currentBalance}
                      required
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                        errors.amount
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Available Balance: ₹{formatIndianCurrency(currentBalance)}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-4 rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-800 transition-all disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Add Expense"}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-semibold shadow-md hover:bg-gray-600 transition-all disabled:opacity-50"
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        
        {/* Footer - Only show when content is loaded */}
        {contentLoaded && <Footer />}
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function CreateExpense() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CreateExpenseContent />
    </Suspense>
  );
}