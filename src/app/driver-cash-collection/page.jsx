"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DriverCashCollectionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    driver_name: "",
    driver_phone: "",
    vehicle_number: "",
    customer_name: "",
    amount: "",
    collected_date: "",
    remarks: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload = {
        driver_name: form.driver_name?.trim(),
        driver_phone: form.driver_phone?.trim(),
        vehicle_number: form.vehicle_number?.trim(),
        customer_name: form.customer_name?.trim(),
        amount: form.amount ? parseFloat(form.amount) : 0,
        collected_date: form.collected_date?.trim() || null,
        remarks: form.remarks?.trim() || null
      };

      if (!payload.driver_name || !payload.vehicle_number || !payload.customer_name || !payload.amount || payload.amount <= 0) {
        setError("Driver name, vehicle number, customer name aur amount zaroori hain.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/driver-cash-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Save fail hua");
        setLoading(false);
        return;
      }
      setSuccess("Cash collection save ho gaya!");
      setTimeout(() => {
        router.push("/driver-cash-collection-history");
      }, 1200);
    } catch (err) {
      setError("Koi error aa gaya, baad me try karein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Driver Cash Collection</h1>
                <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
                  <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                  <span>/</span>
                  <span className="text-gray-900">Driver Cash Collection</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Manual Entry</h2>
          </div>
          <div className="p-6">
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driver Name *</label>
                  <input name="driver_name" value={form.driver_name} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Driver name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driver Phone</label>
                  <input name="driver_phone" value={form.driver_phone} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mobile number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number *</label>
                  <input name="vehicle_number" value={form.vehicle_number} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. MH12-AB-1234" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                  <input name="customer_name" value={form.customer_name} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Client name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹) *</label>
                  <input type="number" step="0.01" min="0.01" name="amount" value={form.amount} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Amount collected" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Collected Date/Time</label>
                  <input type="datetime-local" name="collected_date" value={form.collected_date} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <textarea name="remarks" value={form.remarks} onChange={onChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
