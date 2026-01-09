"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CreateProductTransferContent() {
  const [formData, setFormData] = useState({
    station_from: "",
    station_to: "",
    product_id: "",
    product_to: "",
    transfer_quantity: "",
    remarks: "",
    status: "pending"
  });
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      setFetching(true);
      const response = await fetch("/api/stock-transfers-product/create");
      const data = await response.json();
      
      if (response.ok) {
        setStations(data.stations || []);
        setProducts(data.products || []);
        
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
            product_id: data.products[0].id.toString()
          }));
        }
      } else {
        setError(data.error || "Failed to fetch form data");
      }
    } catch (err) {
      console.error("Error fetching form data:", err);
      setError("Failed to fetch form data");
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Reset product_to when station_from or station_to changes
    if (name === 'station_from' || name === 'station_to') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        product_to: "" // Reset product_to when stations change
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const isSameStation = formData.station_from === formData.station_to;
      
      // Prepare data based on transfer type
      const requestData = {
        station_from: formData.station_from,
        station_to: formData.station_to,
        transfer_quantity: formData.transfer_quantity,
        remarks: formData.remarks,
        status: formData.status
      };

      // Add product fields based on transfer type
      if (isSameStation) {
        // Same station transfer requires BOTH products
        if (!formData.product_id || !formData.product_to) {
          setError("Both Product From and Product To are required for same station transfer");
          setLoading(false);
          return;
        }
        requestData.product_id = formData.product_id;
        requestData.product_to = formData.product_to;
      } else {
        // Different station transfer requires only product_id
        if (!formData.product_id) {
          setError("Product is required for transfer between different stations");
          setLoading(false);
          return;
        }
        requestData.product_id = formData.product_id;
      }

      console.log("📤 Submitting data:", requestData);

      const response = await fetch("/api/stock-transfers-product/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess("Product transfer created successfully!");
        setTimeout(() => {
          router.push("/stock-transfers-product");
        }, 2000);
      } else {
        setError(result.error || "Failed to create product transfer");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError("An error occurred while creating the product transfer");
    } finally {
      setLoading(false);
    }
  };

  // Check if same station transfer
  const isSameStationTransfer = formData.station_from === formData.station_to;

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
                <h1 className="text-3xl font-bold text-gray-900">Create Product Transfer</h1>
                <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
                  <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                  <span>/</span>
                  <Link href="/stock-transfers-product" className="hover:text-blue-600 transition-colors">Product Transfers</Link>
                  <span>/</span>
                  <span className="text-gray-900">Create</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {fetching ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Product Transfer Information
                {isSameStationTransfer && (
                  <span className="ml-2 text-sm text-blue-600 font-normal">
                    (Same Station Transfer)
                  </span>
                )}
              </h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <label htmlFor="station_to" className="block text-sm font-medium text-gray-700 mb-2">
                      Station To *
                    </label>
                    <select
                      id="station_to"
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
                    <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-2">
                      {isSameStationTransfer ? "Product From *" : "Product *"}
                    </label>
                    <select
                      id="product_id"
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

                  {/* Product To - Only shown for same station transfer */}
                  {isSameStationTransfer && (
                    <div>
                      <label htmlFor="product_to" className="block text-sm font-medium text-gray-700 mb-2">
                        Product To *
                      </label>
                      <select
                        id="product_to"
                        name="product_to"
                        value={formData.product_to}
                        onChange={handleInputChange}
                        required={isSameStationTransfer}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Product To</option>
                        {products
                          .filter(product => product.id.toString() !== formData.product_id) // Exclude selected product_from
                          .map(product => (
                            <option key={product.id} value={product.id}>
                              {product.pname}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Same station transfer: Transfer between different products
                      </p>
                    </div>
                  )}

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_transit">In Transit</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Enter remarks (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="mr-4 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
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
                        <span>Create Product Transfer</span>
                      </>
                    )}
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

function CreateProductTransferLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function CreateProductTransfer() {
  return (
    <Suspense fallback={<CreateProductTransferLoading />}>
      <CreateProductTransferContent />
    </Suspense>
  );
}