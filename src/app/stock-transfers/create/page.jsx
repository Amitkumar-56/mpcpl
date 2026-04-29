// src/app/stock-transfers/create/page.jsx
"use client";

import Header from "components/Header";
import Sidebar from "components/sidebar";
import Footer from "components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Create a separate component that contains the main logic
function CreateStockTransferContent() {
  const [formData, setFormData] = useState({
    station_from: "",
    station_to: "",
    driver_id: "",
    vehicle_id: "",
    transfer_quantity: "",
    status: "1",
    product: "",
    slip: null
  });
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const response = await fetch("/api/stock-transfers/create");
      const data = await response.json();
      
      if (response.ok) {
        setStations(data.stations);
        setProducts(data.products);
        
        if (data.stations.length > 0) {
          setFormData(prev => ({
            ...prev,
            station_from: data.stations[0].id.toString(),
            station_to: ""
          }));
        }
        if (data.products.length > 0) {
          setFormData(prev => ({
            ...prev,
            product: data.products[0].id.toString()
          }));
        }
      } else {
        setError(data.error || "Failed to fetch form data");
      }
    } catch (err) {
      setError("Failed to fetch form data");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === "station_from" ? { station_to: "" } : {})
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      slip: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const submitData = new FormData();
      submitData.append('station_from', formData.station_from);
      submitData.append('station_to', formData.station_to);
      submitData.append('driver_id', formData.driver_id);
      submitData.append('vehicle_id', formData.vehicle_id);
      submitData.append('transfer_quantity', formData.transfer_quantity);
      submitData.append('status', formData.status);
      submitData.append('product', formData.product);
      
      if (formData.slip) {
        submitData.append('slip', formData.slip);
      }

      const response = await fetch("/api/stock-transfers/create", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess("Stock transfer created successfully!");
        setTimeout(() => {
          router.push("/stock-transfers");
        }, 2000);
      } else {
        setError(result.error || "Failed to create stock transfer");
      }
    } catch (err) {
      setError("An error occurred while creating the stock transfer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0 z-50 lg:relative">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full w-full overflow-hidden relative">
        {/* Header */}
        <div className="flex-shrink-0 z-40 shadow-sm sticky top-0">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-gray-50 scroll-smooth">
          <div className="max-w-4xl mx-auto">
            {/* Header / Title area */}
            <div className="mb-6 flex items-center gap-3">
              <button 
                onClick={() => router.back()}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Stock Transfer</h1>
                <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-1">
                  <Link href="/" className="hover:text-blue-600">Home</Link>
                  <span>/</span>
                  <Link href="/stock-transfers" className="hover:text-blue-600">Stock Transfer</Link>
                </nav>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3">
                <span className="text-xl">✅</span>
                <span className="text-sm font-medium">{success}</span>
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg text-sm">📦</span>
                  Transfer Information
                </h2>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Station From */}
                    <div className="space-y-1.5">
                      <label htmlFor="station_from" className="block text-sm font-bold text-gray-700">Station From *</label>
                      <select
                        id="station_from"
                        name="station_from"
                        value={formData.station_from}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      >
                        {stations.map(station => (
                          <option key={station.id} value={station.id}>{station.station_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Station To */}
                    <div className="space-y-1.5">
                      <label htmlFor="station_to" className="block text-sm font-bold text-gray-700">Station To *</label>
                      <select
                        id="station_to"
                        name="station_to"
                        value={formData.station_to}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      >
                        <option value="">Select Destination</option>
                        {stations.map(station => (
                          <option key={station.id} value={station.id}>{station.station_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Product */}
                    <div className="space-y-1.5">
                      <label htmlFor="product" className="block text-sm font-bold text-gray-700">Product *</label>
                      <select
                        id="product"
                        name="product"
                        value={formData.product}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      >
                        {products.map(product => (
                          <option key={product.id} value={product.id}>{product.pname}</option>
                        ))}
                      </select>
                    </div>

                    {/* Driver Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="driver_id" className="block text-sm font-bold text-gray-700">Driver Name *</label>
                      <input
                        type="text"
                        id="driver_id"
                        name="driver_id"
                        value={formData.driver_id}
                        onChange={handleInputChange}
                        required
                        placeholder="Driver Name"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      />
                    </div>

                    {/* Vehicle Number */}
                    <div className="space-y-1.5">
                      <label htmlFor="vehicle_id" className="block text-sm font-bold text-gray-700">Vehicle Number *</label>
                      <input
                        type="text"
                        id="vehicle_id"
                        name="vehicle_id"
                        value={formData.vehicle_id}
                        onChange={handleInputChange}
                        required
                        placeholder="Vehicle Number"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <label htmlFor="transfer_quantity" className="block text-sm font-bold text-gray-700">Quantity *</label>
                      <input
                        type="number"
                        id="transfer_quantity"
                        name="transfer_quantity"
                        value={formData.transfer_quantity}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <label htmlFor="status" className="block text-sm font-bold text-gray-700">Status *</label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      >
                        <option value="1">Dispatch</option>
                        <option value="2">Pending</option>
                        <option value="3">Completed</option>
                      </select>
                    </div>

                    {/* Slip */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label htmlFor="slip" className="block text-sm font-bold text-gray-700">Upload Transfer Slip</label>
                      <input
                        type="file"
                        id="slip"
                        name="slip"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                      <p className="text-[10px] text-gray-400 font-medium px-1">Max: 5MB (JPG, PNG, PDF)</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="px-6 py-3 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all text-sm border border-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-all text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        "Create Transfer"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <div className="flex-shrink-0 z-40 bg-white border-t border-gray-200">
          <Footer />
        </div>
      </div>
    </div>
  );
}

function CreateStockTransferLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function CreateStockTransfer() {
  return (
    <Suspense fallback={<CreateStockTransferLoading />}>
      <CreateStockTransferContent />
    </Suspense>
  );
}
