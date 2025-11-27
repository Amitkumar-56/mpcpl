"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Create a separate component that contains the main logic
function StockTransfersContent() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      console.log("🔄 Fetching stock transfers...");
      const response = await fetch("/api/stock-transfers");
      const data = await response.json();
      
      console.log("📥 Transfers response:", data);
      
      if (response.ok) {
        setTransfers(data.transfers || []);
        console.log("✅ Transfers loaded:", data.transfers?.length);
      } else {
        setError(data.error || "Failed to fetch transfers");
      }
    } catch (err) {
      console.error("❌ Error fetching transfers:", err);
      setError("Failed to fetch stock transfers");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      1: { class: "bg-yellow-100 text-yellow-800", text: "Dispatch" },
      2: { class: "bg-blue-100 text-blue-800", text: "Pending" },
      3: { class: "bg-green-100 text-green-800", text: "Completed" },
    };

    const config = statusConfig[status] || { class: "bg-gray-100 text-gray-800", text: "Unknown" };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <h1 className="text-3xl font-bold text-gray-900">Stock Transfer</h1>
                <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
                  <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                  <span>/</span>
                  <span className="text-gray-900">Stock Transfer</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Floating Action Button */}
        <Link
          href="/stock-transfers/create"
          className="fixed bottom-8 right-8 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2 z-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Stock Transfer</span>
        </Link>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Stock Transfer Details</h2>
              <button 
                onClick={fetchTransfers}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transfers.length > 0 ? (
                    transfers.map((transfer, index) => (
                      <tr key={transfer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.station_from_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.station_to_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.driver_name || transfer.driver_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.vehicle_no || transfer.vehicle_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{transfer.transfer_quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.product_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(transfer.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(transfer.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/stock-transfers/${transfer.id}`}
                            className="text-blue-600 hover:text-blue-900 transition-colors inline-flex items-center"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-lg font-medium">No stock transfer records found</p>
                          <p className="mt-2">Create your first stock transfer to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Loading component for Suspense fallback
function StockTransfersLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="mr-4 p-2 rounded-lg bg-gray-200 animate-pulse">
                <div className="w-6 h-6"></div>
              </div>
              <div>
                <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Floating Action Button Skeleton */}
        <div className="fixed bottom-8 right-8 bg-gray-200 text-gray-200 px-6 py-3 rounded-full shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
          </div>
        </div>

        {/* Content Card Skeleton */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Table Skeleton */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[...Array(10)].map((_, index) => (
                      <th key={index} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {[...Array(10)].map((_, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Alternative simpler loading component
function StockTransfersSimpleLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading stock transfers...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function StockTransfers() {
  return (
    <Suspense fallback={<StockTransfersLoading />}>
      <StockTransfersContent />
    </Suspense>
  );
}