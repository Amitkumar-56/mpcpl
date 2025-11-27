"use client";

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
      console.log("🔄 Fetching form data...");
      const response = await fetch("/api/stock-transfers/create");
      const data = await response.json();
      
      console.log("📥 Form data response:", data);
      
      if (response.ok) {
        setStations(data.stations);
        setProducts(data.products);
        
        if (data.stations.length > 0) {
          setFormData(prev => ({
            ...prev,
            station_from: data.stations[0].id.toString(),
            station_to: data.stations[0].id.toString()
          }));
        }
        if (data.products.length > 0) {
          setFormData(prev => ({
            ...prev,
            product: data.products[0].id.toString()
          }));
        }
        
        console.log("✅ Form data loaded successfully");
      } else {
        setError(data.error || "Failed to fetch form data");
      }
    } catch (err) {
      console.error("❌ Error fetching form data:", err);
      setError("Failed to fetch form data");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      
      // Add all form data to FormData
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

      console.log("📤 Submitting form data...", {
        station_from: formData.station_from,
        station_to: formData.station_to,
        driver_id: formData.driver_id,
        vehicle_id: formData.vehicle_id,
        transfer_quantity: formData.transfer_quantity,
        product: formData.product,
        status: formData.status
      });

      const response = await fetch("/api/stock-transfers/create", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();
      console.log("📥 API Response:", response.status, result);

      if (response.ok) {
        setSuccess("Stock transfer created successfully!");
        setTimeout(() => {
          router.push("/stock-transfers");
        }, 2000);
      } else {
        setError(result.error || "Failed to create stock transfer");
      }
    } catch (err) {
      console.error("❌ Submission error:", err);
      setError("An error occurred while creating the stock transfer");
    } finally {
      setLoading(false);
    }
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
                <h1 className="text-3xl font-bold text-gray-900">Create Stock Transfer</h1>
                <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
                  <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                  <span>/</span>
                  <Link href="/stock-transfers" className="hover:text-blue-600 transition-colors">Stock Transfer</Link>
                  <span>/</span>
                  <span className="text-gray-900">Create Stock Transfer</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
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

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Stock Transfer Information</h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Station From */}
                <div>
                  <label htmlFor="station_from" className="block text-sm font-medium text-gray-700 mb-2">
                    Station From *
                  </label>
                  <select
                    id="station_from"
                    name="station_from"
                    value={formData.station_from}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.station_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Station To */}
                <div>
                  <label htmlFor="station_to" className="block text-sm font-medium text-gray-700 mb-2">
                    Station To *
                  </label>
                  <select
                    id="station_to"
                    name="station_to"
                    value={formData.station_to}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.station_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product */}
                <div>
                  <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-2">
                    Product *
                  </label>
                  <select
                    id="product"
                    name="product"
                    value={formData.product}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.pname}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Driver Name */}
                <div>
                  <label htmlFor="driver_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    id="driver_id"
                    name="driver_id"
                    value={formData.driver_id}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter driver name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Vehicle Number */}
                <div>
                  <label htmlFor="vehicle_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    id="vehicle_id"
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter vehicle number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Transfer Quantity */}
                <div>
                  <label htmlFor="transfer_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Quantity *
                  </label>
                  <input
                    type="number"
                    id="transfer_quantity"
                    name="transfer_quantity"
                    value={formData.transfer_quantity}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0.01"
                    placeholder="Enter quantity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="1">Dispatch</option>
                    <option value="2">Pending</option>
                    <option value="3">Completed</option>
                  </select>
                </div>

                {/* Transfer Slip */}
                <div className="md:col-span-2">
                  <label htmlFor="slip" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Transfer Slip
                  </label>
                  <input
                    type="file"
                    id="slip"
                    name="slip"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Maximum file size: 1MB. Supported formats: JPG, PNG, PDF, DOC
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create Stock Transfer</span>
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

// Loading component for Suspense fallback
function CreateStockTransferLoading() {
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form Card Skeleton */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form field skeletons */}
              {[...Array(6)].map((_, index) => (
                <div key={index}>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
              {/* File input skeleton */}
              <div className="md:col-span-2">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* Submit button skeleton */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <div className="h-12 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Main component with Suspense boundary
export default function CreateStockTransfer() {
  return (
    <Suspense fallback={<CreateStockTransferLoading />}>
      <CreateStockTransferContent />
    </Suspense>
  );
}