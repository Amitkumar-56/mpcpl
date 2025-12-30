"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/sidebar";

function ProductTransfersContent() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stock-transfers-product");
      const data = await response.json();
      
      if (response.ok) {
        setTransfers(data.transfers || []);
      } else {
        setError(data.error || "Failed to fetch transfers");
      }
    } catch (err) {
      console.error("Error fetching transfers:", err);
      setError("Failed to fetch product transfers");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { color: "bg-yellow-100 text-yellow-800", text: "Pending" },
      in_transit: { color: "bg-blue-100 text-blue-800", text: "In Transit" },
      completed: { color: "bg-green-100 text-green-800", text: "Completed" }
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product transfers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar activePage="Stock Transfers" />
      </div>
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Link
            href="/stock-transfers-product/create"
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:px-6 sm:py-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2 z-50 text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Create Product Transfer</span>
            <span className="sm:hidden">Create</span>
          </Link>

          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Product Transfers</h2>
                <button 
                  onClick={fetchTransfers}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                  {error}
                </div>
              )}

              {transfers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No product transfers found
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Station</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Station</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transfers.length > 0 ? (
                      transfers.map((transfer, index) => (
                        <tr key={transfer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.station_from_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.station_to_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.product_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transfer.transfer_quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(transfer.status)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(transfer.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/stock-transfers-product/edit?id=${transfer.id}`}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                          No product transfers found
                        </td>
                      </tr>
                    )}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-4">
                    {transfers.map((transfer, index) => (
                      <div key={transfer.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">#{index + 1}</h3>
                            <p className="text-sm text-gray-600">{transfer.product_name}</p>
                          </div>
                          {getStatusBadge(transfer.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">From Station:</span>
                            <p className="text-gray-900 font-medium">{transfer.station_from_name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">To Station:</span>
                            <p className="text-gray-900 font-medium">{transfer.station_to_name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <p className="text-gray-900 font-semibold">{transfer.transfer_quantity}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <p className="text-gray-900">{new Date(transfer.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-200">
                          <Link
                            href={`/stock-transfers-product/edit?id=${transfer.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Edit →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function ProductTransfers() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductTransfersContent />
    </Suspense>
  );
}

