"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreditLimitPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // ✅ Get query param correctly in Next.js 13

  const [customer, setCustomer] = useState({});
  const [balance, setBalance] = useState({});
  const [inAmount, setInAmount] = useState("");
  const [dAmount, setDAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/credit-limit?id=${id}`);
      setCustomer(res.data.customer || {});
      setBalance(res.data.balance || {});
    } catch (err) {
      console.error("Error fetching data:", err);
      showNotification("Error fetching customer data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inAmount && !dAmount) {
      showNotification("Please enter either increase or decrease amount", "error");
      return;
    }
    if (inAmount && dAmount) {
      showNotification("Please enter only one amount (increase OR decrease)", "error");
      return;
    }

    if (inAmount && parseFloat(inAmount) <= 0) {
      showNotification("Increase amount must be greater than 0", "error");
      return;
    }
    if (dAmount && parseFloat(dAmount) <= 0) {
      showNotification("Decrease amount must be greater than 0", "error");
      return;
    }

    setSubmitting(true);
    try {
      const user_id = 1; // Replace with actual logged-in user ID

      const res = await axios.post("/api/credit-limit", {
        com_id: parseInt(id),
        in_amount: inAmount ? parseFloat(inAmount) : 0,
        d_amount: dAmount ? parseFloat(dAmount) : 0,
        user_id,
      });

      if (res.data.success) {
        showNotification(res.data.message || "Credit limit updated successfully");
        await fetchData();
        setInAmount("");
        setDAmount("");
        setModalOpen(false);
      } else {
        showNotification(res.data.error || "Update failed", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error updating credit limit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setInAmount("");
    setDAmount("");
    setModalOpen(false);
  };

  const calculateNewLimits = () => {
    const currentCstLimit = parseFloat(balance.cst_limit) || 0;
    const currentAmtLimit = parseFloat(balance.amtlimit) || 0;

    if (inAmount && parseFloat(inAmount) > 0) {
      const val = parseFloat(inAmount);
      return { cst_limit: currentCstLimit + val, amtlimit: currentAmtLimit + val };
    }
    if (dAmount && parseFloat(dAmount) > 0) {
      const val = parseFloat(dAmount);
      return { cst_limit: currentCstLimit - val, amtlimit: currentAmtLimit - val };
    }

    return { cst_limit: currentCstLimit, amtlimit: currentAmtLimit };
  };

  const newLimits = calculateNewLimits();

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

        {/* Notification */}
        {notification.show && (
          <div
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg ${
              notification.type === "error" ? "bg-red-500" : "bg-green-500"
            } text-white`}
          >
            {notification.message}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Credit Limit Management</h1>
            <p className="text-gray-600 mb-6">Manage and adjust customer credit limits.</p>

            {/* Customer Info */}
            <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <p className="text-lg font-semibold text-gray-800">
                    ₹{balance.cst_limit?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Update Button */}
            <div className="text-center mb-6">
              <button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:translate-y-[-1px] transition"
                onClick={() => setModalOpen(true)}
              >
                Update Credit Limits
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Update Credit Limits</h2>
                <button
                  className="text-2xl hover:text-blue-200"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Current Credit Limit: ₹{balance.cst_limit?.toLocaleString()}</span>
                <span>Current Amount Limit: ₹{balance.amtlimit?.toLocaleString()}</span>
              </div>
            </div>

            {/* New Limits Preview */}
            {(inAmount || dAmount) && (
              <div className="bg-green-50 border-b border-green-200 p-4">
                <p className="text-green-800 font-medium text-sm">New Limits Preview:</p>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-green-700">
                    Credit Limit: ₹{newLimits.cst_limit.toLocaleString()}
                  </span>
                  <span className="text-green-700">
                    Amount Limit: ₹{newLimits.amtlimit.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Increase */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <label className="text-green-700 font-medium text-sm mb-1 block">Increase Limits</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg border-green-300 focus:ring-2 focus:ring-green-500"
                    value={inAmount}
                    onChange={(e) => { setInAmount(e.target.value); if(e.target.value) setDAmount(""); }}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* OR Divider */}
              <div className="flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Decrease */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <label className="text-red-700 font-medium text-sm mb-1 block">Decrease Limits</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-600 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg border-red-300 focus:ring-2 focus:ring-red-500"
                    value={dAmount}
                    onChange={(e) => { setDAmount(e.target.value); if(e.target.value) setInAmount(""); }}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-4">
                <button
                  type="button"
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={submitting || (!inAmount && !dAmount)}
                >
                  {submitting ? "Updating..." : "Update Limits"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
