"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// Create a component that uses useSearchParams
function AddDncnPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sup_id = Number(searchParams.get("id"));

  const [form, setForm] = useState({
    tors: "1",
    type: "1",
    amount: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stock/add-dncn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tors: Number(form.tors),
          type: Number(form.type),
          amount: Number(form.amount),
          sup_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      // Success message show karega aur redirect karega
      alert("DNCN added successfully!");
      router.push(`/stock/dncn?id=${sup_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center items-start">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-6">
          Add Debit / Credit (ID: {sup_id})
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Transporter / Supplier
            </label>
            <select
              name="tors"
              value={form.tors}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="1">Supplier</option>
              <option value="2">Transporter</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              DNCN Type
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="1">Debit</option>
              <option value="2">Credit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Amount
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 resize-none"
              rows={3}
              placeholder="Enter remarks (optional)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading ? "Saving..." : "Submit"}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/stock/dncn?id=${sup_id}`)}
              className="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>

            <button
              type="reset"
              onClick={() =>
                setForm({ tors: "1", type: "1", amount: "", remarks: "" })
              }
              className="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function AddDncnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 p-4 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    }>
      <AddDncnPageContent />
    </Suspense>
  );
}