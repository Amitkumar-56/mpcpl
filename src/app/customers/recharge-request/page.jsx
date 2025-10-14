"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function RechargeRequestContent() {
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
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const apiUrl = `${baseUrl}/api/customers/recharge-request?id=${customerId}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.customer && data.balance) {
        setCustomerData({
          customer: {
            name: data.customer.name || "No name found",
            phone: data.customer.phone || "No phone found",
          },
          balance: {
            current_balance: Number(data.balance.current_balance) || 0,
            current_limit: Number(data.balance.current_limit) || 0,
          },
        });
      } else {
        setError(data.error || "Failed to fetch customer data");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Network error occurred while fetching customer data");
    } finally {
      setPageLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(
        `${baseUrl}/api/customers/recharge-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            com_id: parseInt(customerId),
            amount: parseFloat(formData.amount),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Recharge added successfully!");
        setShowModal(false);
        setFormData({
          amount: "",
          payment_date: new Date().toISOString().split("T")[0],
          payment_type: "2",
          transaction_id: "",
          utr_no: "",
          comments: "",
        });
        fetchCustomerData();
      } else {
        setError(data.error || "Failed to process recharge");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Network error occurred while processing recharge");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const numValue = Number(value);
    return `₹${isNaN(numValue) ? "0.00" : numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Customer</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-y-3">
              <button
                onClick={fetchCustomerData}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/customers")}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Customers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header with Back Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Back to Customers Button - Top Left */}
              <button
                onClick={() => router.push("/customers")}
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Customers
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Recharge Request</h1>
                <p className="text-gray-600">Manage customer wallet recharge</p>
              </div>
            </div>

            {/* Recharge Button - Top Right */}
            <button
              onClick={() => setShowModal(true)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Recharge Wallet
            </button>
          </div>

          {/* Customer Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-lg font-semibold text-gray-900">Customer Summary</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-sm font-medium text-blue-600 mb-1">Customer Name</div>
                <div className="text-lg font-semibold text-gray-900 truncate">{customerData?.customer?.name}</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="text-sm font-medium text-green-600 mb-1">Phone Number</div>
                <div className="text-lg font-semibold text-gray-900">{customerData?.customer?.phone}</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="text-sm font-medium text-purple-600 mb-1">Current Balance</div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(customerData?.balance?.current_balance)}</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="text-sm font-medium text-orange-600 mb-1">Current Limit</div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(customerData?.balance?.current_limit)}</div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-600 font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">How to recharge</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Click the "Recharge Wallet" button to add funds. The amount will be added to the customer's limit and deducted from their balance.
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />

        {/* Recharge Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Recharge Wallet
                </h2>
                <button 
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4">
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Customer:</strong> {customerData?.customer?.name}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Phone:</strong> {customerData?.customer?.phone}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="payment_date"
                      value={formData.payment_date}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="payment_type"
                      value={formData.payment_type}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    >
                      <option value="2">RTGS</option>
                      <option value="3">NEFT</option>
                      <option value="4">UPI</option>
                      <option value="5">CHEQUE</option>
                      <option value="1">Cash</option>
                    </select>
                  </div>


                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={loading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        'Recharge'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes scaleIn {
            from {
              transform: scale(0.95);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          .animate-scaleIn {
            animation: scaleIn 0.15s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}

export default function RechargeRequestPage() {
  return <RechargeRequestContent />;
}