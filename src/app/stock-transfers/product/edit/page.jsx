"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/sidebar";

function EditProductTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [formData, setFormData] = useState({
    station_from: "",
    station_to: "",
    product_id: "",
    product_to: "", // For same station transfer
    transfer_quantity: "",
    remarks: "",
    status: "pending"
  });
  const [originalData, setOriginalData] = useState(null);
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (id) {
      fetchTransferData();
      fetchFormData();
    } else {
      setError("No transfer ID provided");
      setLoading(false);
    }
  }, [id]);

  const fetchFormData = async () => {
    try {
      const response = await fetch("/api/stock-transfers-product/create");
      const data = await response.json();
      
      if (response.ok) {
        setStations(data.stations || []);
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Error fetching form data:", err);
    }
  };

  const fetchTransferData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stock-transfers-product/edit?id=${id}`);
      const data = await response.json();
      
      if (response.ok && data.transfer) {
        const transfer = data.transfer;
        setFormData({
          station_from: transfer.station_from?.toString() || "",
          station_to: transfer.station_to?.toString() || "",
          product_id: transfer.product_id?.toString() || "",
          product_to: transfer.product_to?.toString() || "",
          transfer_quantity: transfer.transfer_quantity?.toString() || "",
          remarks: transfer.remarks || "",
          status: transfer.status || "pending"
        });
        setOriginalData(transfer);
      } else {
        setError(data.error || "Failed to fetch transfer data");
      }
    } catch (err) {
      console.error("Error fetching transfer:", err);
      setError("Failed to fetch transfer data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/stock-transfers-product/edit", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...formData }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess("Product transfer updated successfully!");
        setTimeout(() => {
          router.push("/stock-transfers/product");
        }, 2000);
      } else {
        setError(result.error || "Failed to update product transfer");
      }
    } catch (err) {
      console.error("Update error:", err);
      setError("An error occurred while updating the product transfer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transfer data...</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-3xl font-bold text-gray-900">Edit Product Transfer</h1>
                <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
                  <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                  <span>/</span>
                  <Link href="/stock-transfers" className="hover:text-blue-600 transition-colors">Stock Transfers</Link>
                  <span>/</span>
                  <Link href="/stock-transfers/product" className="hover:text-blue-600 transition-colors">Product Transfers</Link>
                  <span>/</span>
                  <span className="text-gray-900">Edit</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Edit Product Transfer</h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Station From *
                  </label>
                  <select
                    name="station_from"
                    value={formData.station_from}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.station_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Station To *
                  </label>
                  <select
                    name="station_to"
                    value={formData.station_to}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.station_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product From *
                  </label>
                  <select
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.pname}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product To - For same station transfer */}
                {formData.station_from === formData.station_to && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product To (Same Station) *
                    </label>
                    <select
                      name="product_to"
                      value={formData.product_to || ''}
                      onChange={handleInputChange}
                      required={formData.station_from === formData.station_to}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Product To</option>
                      {products.filter(p => p.id === 2 || p.id === 3).map(product => (
                        <option key={product.id} value={product.id}>
                          {product.pname}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Same station transfer: Industrial Oil 40 ↔ Industrial Oil 60
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Quantity *
                  </label>
                  <input
                    type="number"
                    name="transfer_quantity"
                    value={formData.transfer_quantity}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Update Product Transfer</span>
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

export default function EditProductTransfer() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activePage="Stock Transfers" />
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>
        <main className="pt-16 lg:pt-20 flex-1 overflow-y-auto">
          <Suspense fallback={<div className="p-6">Loading...</div>}>
            <EditProductTransferContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}

