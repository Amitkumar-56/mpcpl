//src/app/transporters/page.jsx
"use client";
import { Suspense, useEffect, useState } from "react";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";

// Loading component for Suspense fallback
function TransportersLoading() {
  return (
    <div className="flex justify-center items-center min-h-screen text-lg font-semibold">
      Loading transporters...
    </div>
  );
}

// Main transporters content component
function TransportersContent() {
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/transporters")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTransporters(data.data);
        else setError("Failed to load transporters");
      })
      .catch(() => setError("Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  // You can still keep a loading state here for the initial load
  if (loading) {
    return <TransportersLoading />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Transporters List</h1>
          <a
            href="/transporters/add-transporter"
            className="bg-purple-700 text-white px-4 py-2 rounded-full shadow hover:bg-purple-800 transition"
          >
            Add Transporter
          </a>
        </div>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {transporters.length === 0 ? (
            <p className="text-center text-gray-600">No transporters found.</p>
          ) : (
            transporters.map((t) => (
              <div
                key={t.id}
                className="border border-gray-300 rounded-lg p-4 shadow-sm bg-white"
              >
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <th className="w-1/3 text-left text-gray-700">CID</th>
                      <td>{t.id}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Name</th>
                      <td>{t.transporter_name}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Email</th>
                      <td>{t.email}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Phone</th>
                      <td>{t.phone}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Payable</th>
                      <td>₹{Number(t.total_payable).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Actions</th>
                      <td className="space-x-2">
                        <a
                          href={`/view-transporter?id=${t.id}`}
                          className="text-blue-600"
                          aria-label="View Transporter"
                        >
                          <i className="bi bi-eye-fill"></i>
                        </a>
                        <a
                          href={`/edit-transporter?id=${t.id}`}
                          className="text-green-600"
                          aria-label="Edit Transporter"
                        >
                          <i className="bi bi-pencil-square"></i>
                        </a>
                        <a
                          href={`/transportersinvoice?id=${t.id}`}
                          className="text-red-600"
                          aria-label="View Invoice"
                        >
                          <i className="bi bi-receipt"></i>
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-white rounded-lg shadow p-4 overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 text-gray-800 text-left">
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Phone</th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Payable</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transporters.length > 0 ? (
                transporters.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{t.transporter_name}</td>
                    <td className="p-3 border">{t.phone}</td>
                    <td className="p-3 border">{t.email}</td>
                    <td className="p-3 border">
                      ₹{Number(t.total_payable).toLocaleString()}
                    </td>
                    <td className="p-3 border space-x-3">
                      <a
                        href={`/view-transporter?id=${t.id}`}
                        className="text-blue-600"
                        aria-label="View Transporter"
                      >
                        <i className="bi bi-eye-fill"></i>
                      </a>
                      <a
                        href={`/edit-transporter?id=${t.id}`}
                        className="text-green-600"
                        aria-label="Edit Transporter"
                      >
                        <i className="bi bi-pencil-square"></i>
                      </a>
                      <a
                        href={`/transportersinvoice?id=${t.id}`}
                        className="text-red-600"
                        aria-label="View Invoice"
                      >
                        <i className="bi bi-receipt"></i>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-gray-600 p-4">
                    No transporters found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Sticky Footer */}
      <Footer />
    </div>
  );
}

// Main page component with Suspense
export default function TransportersPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content with Suspense */}
      <Suspense fallback={<TransportersLoading />}>
        <TransportersContent />
      </Suspense>
    </div>
  );
}