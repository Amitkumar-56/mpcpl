// src/app/stock/stock-request/page.jsx
'use client';

import Link from "next/link";
import { Suspense, useEffect, useState } from 'react';
import { BiRupee } from "react-icons/bi";
import { BsChatLeftTextFill, BsEyeFill } from "react-icons/bs";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";

// Client component for the stock table
function StockTableClient() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStockData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Error fetching stock data (${res.status})`);
        }

        const data = await res.json();
        setStocks(data);
      } catch (err) {
        console.error("Error fetching stock:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStockData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center animate-pulse">
        <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 text-red-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg font-medium text-red-600">Error loading stock data</p>
        <p className="text-sm mt-1 text-gray-500">{error}</p>
      </div>
    );
  }

  if (!stocks || stocks.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-lg font-medium">No stock requests found</p>
        <p className="text-sm mt-1 text-gray-500">
          Get started by adding your first supply request
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2">Supplier</th>
            <th className="px-4 py-2">Invoice Date</th>
            <th className="px-4 py-2">Invoice#</th>
            <th className="px-4 py-2">Transporter</th>
            <th className="px-4 py-2">Transporter Bill#</th>
            <th className="px-4 py-2">Station</th>
            <th className="px-4 py-2">Tanker No</th>
            <th className="px-4 py-2">Ltr</th>
            <th className="px-4 py-2">Sup Invoice</th>
            <th className="px-4 py-2">DNCN</th>
            <th className="px-4 py-2">Payable</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((row, idx) => (
            <tr key={row.id || idx} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{idx + 1}</td>
              <td className="px-4 py-2">{row.product_name || "-"}</td>
              <td className="px-4 py-2 text-blue-600">
                <Link href={`/supplierinvoice?id=${row.supplier_id}`}>
                  {row.supplier_name || "No Supplier"}
                </Link>
              </td>
              <td className="px-4 py-2">
                {row.invoice_date
                  ? new Date(row.invoice_date).toLocaleDateString()
                  : "-"}
              </td>
              <td className="px-4 py-2">{row.invoice_number || "-"}</td>
              <td className="px-4 py-2 text-blue-600">
                <Link href={`/transportersinvoice?id=${row.transporter_id}`}>
                  {row.transporter_name || "No Transporter"}
                </Link>
              </td>
              <td className="px-4 py-2">{row.transport_number || "-"}</td>
              <td className="px-4 py-2">{row.station_name || "-"}</td>
              <td className="px-4 py-2">{row.tanker_no || "-"}</td>
              <td className="px-4 py-2">{row.ltr || "-"}</td>
              <td className="px-4 py-2">{row.v_invoice_value || "-"}</td>
              <td className="px-4 py-2">{row.dncn || "-"}</td>
              <td className="px-4 py-2">{row.payable || "-"}</td>
              <td
                className={`px-4 py-2 font-medium ${
                  row.status === 1
                    ? "text-yellow-600"
                    : row.status === 2
                    ? "text-blue-600"
                    : row.status === 3
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {row.status === 1
                  ? "Dispatched"
                  : row.status === 2
                  ? "Processing"
                  : row.status === 3
                  ? "Completed"
                  : "Unknown"}
              </td>
              <td className="px-4 py-2 flex justify-center gap-3">
                <Link href={`/supply-details?id=${row.id}`}>
                  <BsEyeFill
                    className="text-blue-600 hover:scale-110 transition"
                    size={18}
                  />
                </Link>
                <button>
                  <BsChatLeftTextFill
                    className="text-green-600 hover:scale-110 transition"
                    size={18}
                  />
                </button>
                <Link href={`/dncn?id=${row.id}`}>
                  <BiRupee
                    className="text-red-600 hover:scale-110 transition"
                    size={20}
                  />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main page component
function StockRequest() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="min-h-screen bg-gray-50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Stock Requests
              </h1>
              <nav className="text-sm text-gray-500 mt-1">
                <Link href="/" className="hover:underline">
                  Home
                </Link>{" "}
                / <span className="mx-1">Stock</span> /{" "}
                <span className="font-semibold text-gray-700">Requests</span>
              </nav>
            </div>
            <Link
              href="/outstanding_history"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
            >
              Outstanding History
            </Link>
          </div>

          {/* Use the client component */}
          <StockTableClient />

          {/* Floating Add Supply Button */}
          <Link
            href="/stock/add-supply"
            className="fixed bottom-6 right-6 bg-purple-700 text-white px-5 py-3 rounded-full shadow-lg hover:bg-purple-800 transition-all flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Supply
          </Link>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Export with Suspense boundary
export default function StockRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <StockRequest />
    </Suspense>
  );
}