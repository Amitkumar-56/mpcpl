"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";

function SetupDealPriceContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [prices, setPrices] = useState({});
  const [existingPrices, setExistingPrices] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduleTime, setScheduleTime] = useState(new Date().toTimeString().slice(0, 5));
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduledPricesList, setScheduledPricesList] = useState([]);
  const [viewMode, setViewMode] = useState("all"); // "all", "pending", "approved"
  const abortControllersRef = useRef([]);

  // Cleanup function to abort all pending requests
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => {
        if (controller && !controller.signal.aborted) {
          controller.abort();
        }
      });
      abortControllersRef.current = [];
    };
  }, []);

  const fetchExistingPrices = useCallback(async () => {
    try {
      if (!customerId || !scheduleDate) return;
      
      const controller = new AbortController();
      abortControllersRef.current.push(controller);
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const res = await fetch(`/api/customers/deal-price?customer_id=${customerId}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch existing prices: ${res.status}`);
        }
        
        const result = await res.json();
        const data = Array.isArray(result) ? result : [];

        // Limit data size to prevent memory issues (max 1000 records)
        const limitedData = data.slice(0, 1000);
        setExistingPrices(limitedData);

        // Pre-fill prices for selected date only
        const formatted = {};
        limitedData.forEach((item) => {
          if (item.Schedule_Date === scheduleDate) {
            if (!formatted[item.station_id]) formatted[item.station_id] = {};
            formatted[item.station_id][item.sub_product_id] = item.price;
          }
        });
        setPrices(formatted);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name !== 'AbortError') {
          throw fetchErr;
        }
      } finally {
        // Remove controller from ref
        abortControllersRef.current = abortControllersRef.current.filter(c => c !== controller);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching existing prices:", error);
      }
    }
  }, [customerId, scheduleDate]);

  const fetchScheduledPricesList = useCallback(async () => {
    try {
      if (!customerId || !scheduleDate) return;
      
      const controller = new AbortController();
      abortControllersRef.current.push(controller);
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const res = await fetch(`/api/schedule-price?customer_ids=${customerId}&date=${scheduleDate}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch scheduled prices: ${res.status}`);
        }
        
        let data = await res.json();
        if (!Array.isArray(data)) {
          data = [];
        }
        
        // Limit data size to prevent memory issues (max 500 records)
        let limitedData = data.slice(0, 500);
        
        // Filter based on view mode
        if (viewMode === "pending") {
          limitedData = limitedData.filter(item => !item.is_applied);
        } else if (viewMode === "approved") {
          limitedData = limitedData.filter(item => item.is_applied);
        }
        
        setScheduledPricesList(limitedData);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name !== 'AbortError') {
          throw fetchErr;
        }
      } finally {
        // Remove controller from ref
        abortControllersRef.current = abortControllersRef.current.filter(c => c !== controller);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching scheduled prices list:", error);
      }
      setScheduledPricesList([]);
    }
  }, [customerId, scheduleDate, viewMode]);

  useEffect(() => {
    if (customerId) {
      fetchSetupData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    if (customerId && scheduleDate) {
      const timeoutId = setTimeout(() => {
        fetchExistingPrices();
        fetchScheduledPricesList();
      }, 300); // Debounce to prevent rapid calls

      return () => {
        clearTimeout(timeoutId);
        // Abort any pending requests
        abortControllersRef.current.forEach(controller => {
          if (controller && !controller.signal.aborted) {
            controller.abort();
          }
        });
        abortControllersRef.current = [];
      };
    }
  }, [customerId, scheduleDate, viewMode, fetchExistingPrices, fetchScheduledPricesList]);

  const fetchSetupData = async () => {
    try {
      setPageLoading(true);
      setError(null);
      
      if (!customerId) {
        setError("Customer ID is missing");
        setPageLoading(false);
        return;
      }
      
      // ✅ NEW: Fetch customer data to get allowed stations and products with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      let customerRes;
      try {
        customerRes = await fetch(`/api/customers/edit?id=${customerId}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error("Request timeout. Please check your connection and try again.");
        }
        throw fetchErr;
      }
      
      if (!customerRes.ok) {
        throw new Error(`Failed to fetch customer data: ${customerRes.status}`);
      }
      
      const customerData = await customerRes.json();
      
      if (!customerData || customerData.error) {
        throw new Error(customerData.error || customerData.message || "Customer data not found");
      }
      
      const customer = customerData.data?.customer || customerData;
      
      if (!customer || (!customer.id && !customerData.success)) {
        throw new Error("Customer data not found or invalid");
      }
      
      // Get allowed stations (blocklocation) and products
      const allowedStationIds = customer.blocklocation 
        ? (Array.isArray(customer.blocklocation) 
            ? customer.blocklocation 
            : customer.blocklocation.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)))
        : [];
      
      const allowedProductIds = customer.products 
        ? (Array.isArray(customer.products) 
            ? customer.products 
            : customer.products.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)))
        : [];
      
      // Fetch all setup data with timeout
      const setupController = new AbortController();
      const setupTimeoutId = setTimeout(() => setupController.abort(), 10000);
      
      let res;
      try {
        res = await fetch("/api/customers/deal-price-setup", {
          signal: setupController.signal
        });
        clearTimeout(setupTimeoutId);
      } catch (setupFetchErr) {
        clearTimeout(setupTimeoutId);
        if (setupFetchErr.name === 'AbortError') {
          throw new Error("Setup data request timeout. Please check your connection and try again.");
        }
        throw setupFetchErr;
      }
      
      if (!res.ok) {
        throw new Error(`Failed to fetch setup data: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.success) {
        // ✅ Filter products: Only show sub-products of allowed products
        let filteredProducts = data.products || [];
        if (allowedProductIds.length > 0) {
          filteredProducts = filteredProducts.filter(p => allowedProductIds.includes(p.product_id));
        }
        
        // ✅ Filter stations: Only show allowed stations
        let filteredStations = data.stations || [];
        if (allowedStationIds.length > 0) {
          filteredStations = filteredStations.filter(s => allowedStationIds.includes(s.id));
        }
        
        setProducts(filteredProducts);
        setStations(filteredStations);
      } else {
        throw new Error(data.message || "Setup data missing");
      }
    } catch (error) {
      console.error("Error fetching setup data:", error);
      setError(error.message || "Failed to load deal price setup data");
      alert("Error: " + (error.message || "Failed to load data"));
    } finally {
      setPageLoading(false);
    }
  };

  const handleChange = (stationId, subProductId, value) => {
    setPrices((prev) => ({
      ...prev,
      [stationId]: { ...prev[stationId], [subProductId]: value },
    }));
  };

  const priceExists = (stationId, subProductId) =>
    existingPrices.find(
      (p) => p.station_id === stationId && p.sub_product_id === subProductId
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return alert("Customer ID missing in URL");

    setLoading(true);
    try {
      const priceUpdates = [];

      stations.forEach((station) =>
        products.forEach((prod) => {
          const value = prices[station.id]?.[prod.sub_product_id];
          if (value) {
            const exists = priceExists(station.id, prod.sub_product_id);
            const data = {
              com_id: customerId,
              station_id: station.id,
              product_id: prod.product_id,
              sub_product_id: prod.sub_product_id,
              price: parseFloat(value),
              Schedule_Date: scheduleDate,
              Schedule_Time: scheduleTime,
            };
            priceUpdates.push({
              type: exists ? "UPDATE" : "INSERT",
              data,
            });
          }
        })
      );

      const res = await fetch("/api/customers/deal-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceUpdates }),
      });
      const result = await res.json();

      alert(
        `✅ Done! Inserted: ${result.counts.inserted}, Updated: ${result.counts.updated}`
      );
      fetchExistingPrices();
      fetchScheduledPricesList();
    } catch (error) {
      console.error("Error saving prices:", error);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading deal price setup...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-red-500 text-xl mb-4">Error</div>
              <div className="text-gray-600 mb-6">{error}</div>
              <button 
                onClick={() => {
                  setError(null);
                  if (customerId) fetchSetupData();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-4">Missing Customer ID</div>
              <div className="text-gray-600">Please provide a customer ID in the URL</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
            <h1 className="text-xl font-bold text-gray-800 mb-4">Setup Deal Price</h1>
            <p className="text-sm text-gray-600 mb-4">
              Customer ID: <b>{customerId}</b>
            </p>
            
            {/* View Mode Tabs - Matching Schedule Price Design */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "all" 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All Prices
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pending")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "pending" 
                    ? "bg-yellow-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setViewMode("approved")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "approved" 
                    ? "bg-green-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Applied
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Station</th>
                  {products.map((prod) => (
                    <th key={prod.sub_product_id} className="px-4 py-3 border-b border-gray-200 text-center">
                      <div className="font-semibold text-gray-800">{prod.product_name}</div>
                      <div className="text-xs text-gray-500 mt-1">{prod.pcode}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stations.map((station, index) => (
                  <tr key={station.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-700">
                      {station.station_name}
                    </td>
                    {products.map((prod) => {
                      const exists = priceExists(station.id, prod.sub_product_id);
                      return (
                        <td key={prod.sub_product_id} className="px-4 py-3 border-b border-gray-200">
                          <input
                            type="number"
                            value={prices[station.id]?.[prod.sub_product_id] || ""}
                            onChange={(e) =>
                              handleChange(station.id, prod.sub_product_id, e.target.value)
                            }
                            placeholder="0.00"
                            step="0.01"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              exists
                                ? "border-green-400 bg-green-50 focus:ring-green-500"
                                : "border-gray-300 bg-white"
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md font-medium"
            >
              {loading ? "Processing..." : "💾 Save Prices"}
            </button>
          </div>

          {/* Scheduled Prices List */}
          {scheduledPricesList.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mt-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Scheduled Prices List ({scheduledPricesList.length} records)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Time</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Station</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-center font-semibold text-gray-700">Price</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledPricesList.map((item, index) => (
                      <tr key={item.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-4 py-3 border-b border-gray-200">{item.Schedule_Date || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200">{item.Schedule_Time || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200">{item.station_name || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200">
                          {item.product_name || 'N/A'} ({item.product_code || 'N/A'})
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200 text-center font-semibold">
                          ₹{parseFloat(item.price || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200 text-center">
                          {item.is_applied ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">Applied</span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function SetupDealPricePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetupDealPriceContent />
    </Suspense>
  );
}
