"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function EditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [form, setForm] = useState({
    driver_name: "",
    driver_phone: "",
    vehicle_number: "",
    customer_name: "",
    amount: "",
    collected_date: "",
    remarks: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRecord = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/driver-cash-collection/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Load fail");
      }
      const r = data.record;
      setForm({
        driver_name: r.driver_name || "",
        driver_phone: r.driver_phone || "",
        vehicle_number: r.vehicle_number || "",
        customer_name: r.customer_name || "",
        amount: r.amount != null ? String(r.amount) : "",
        collected_date: r.collected_date ? new Date(r.collected_date).toISOString().slice(0,16) : "",
        remarks: r.remarks || ""
      });
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadRecord();
  }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = {
        driver_name: form.driver_name?.trim(),
        driver_phone: form.driver_phone?.trim(),
        vehicle_number: form.vehicle_number?.trim(),
        customer_name: form.customer_name?.trim(),
        amount: form.amount ? parseFloat(form.amount) : null,
        collected_date: form.collected_date || null,
        remarks: form.remarks?.trim() || null
      };
      const res = await fetch(`/api/driver-cash-collection/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Save fail");
      }
      setSuccess("Record update ho gaya");
      setTimeout(() => {
        router.push("/driver-cash-collection-history");
      }, 1000);
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Driver Cash Record</h1>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>}

        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Driver Name *</label>
                    <input name="driver_name" value={form.driver_name} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Driver Phone</label>
                    <input name="driver_phone" value={form.driver_phone} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number *</label>
                    <input name="vehicle_number" value={form.vehicle_number} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                    <input name="customer_name" value={form.customer_name} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                    <input type="number" step="0.01" name="amount" value={form.amount} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Collected Date/Time</label>
                    <input type="datetime-local" name="collected_date" value={form.collected_date} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <textarea name="remarks" value={form.remarks} onChange={onChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg transition-colors duration-200">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DriverCashEditPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0">
          <Suspense fallback={<div className="p-6">Loading...</div>}>
            <EditContent />
          </Suspense>
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
