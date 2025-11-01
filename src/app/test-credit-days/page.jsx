"use client";

import { useState } from "react";

export default function TestCreditDays() {
  const [customerId, setCustomerId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkEligibility = async () => {
    if (!customerId) {
      alert("Please enter a customer ID");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/customers/check-eligibility?customerId=${customerId}`
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
      setResult({ error: "Failed to check eligibility" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">
          Test Credit Days Functionality
        </h1>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer ID
          </label>
          <input
            type="number"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter customer ID"
          />
        </div>

        <button
          onClick={checkEligibility}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check Eligibility"}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold mb-3">Result:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>

            {result.customerType === "credit_days" && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <h4 className="font-semibold text-blue-800">
                  Credit Days Customer
                </h4>
                <p className="text-blue-700">
                  ✅ Can make unlimited requests within {result.creditDays} day
                  credit period
                </p>
                {result.isOverdue && (
                  <p className="text-red-600 font-semibold">
                    ⚠️ Credit period expired {result.daysOverdue} days ago
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
