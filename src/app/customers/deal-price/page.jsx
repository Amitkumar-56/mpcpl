"use client";

import { useEffect, useState } from "react";

export default function SetupDealPricePage() {
  const locations = [
    { id: 1, name: "Nellore" },
    { id: 2, name: "Agra" },
    { id: 3, name: "Kanpur" },
    { id: 4, name: "Krishnagiri" },
    { id: 5, name: "Baharagora" }
  ];

  const products = [
    { id: 1, label: "Industrial Oil 40 (R)", code: "IO40R" },
    { id: 2, label: "Industrial Oil 40 (B)", code: "IO40B" },
    { id: 3, label: "Industrial Oil 60 (R)", code: "IO60R" },
    { id: 4, label: "Industrial Oil 60 (B)", code: "IO60B" },
    { id: 5, label: "DEF Lose (R)", code: "DEFLR" },
    { id: 6, label: "DEF Lose (B)", code: "DEFLB" },
    { id: 7, label: "DEF Bucket (R)", code: "DEFBR" },
    { id: 8, label: "DEF Bucket (B)", code: "DEFBB" },
  ];

  const [prices, setPrices] = useState({});
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [customerId, setCustomerId] = useState("cust_12345");
  const [loading, setLoading] = useState(false);
  const [existingPrices, setExistingPrices] = useState([]);

  useEffect(() => {
    const now = new Date();
    setScheduleDate(now.toISOString().split('T')[0]);
    setScheduleTime(now.toTimeString().slice(0, 5));
    
    // Load existing prices
    fetchExistingPrices();
  }, [customerId]);

  const handleChange = (locationId, productId, value) => {
    setPrices((prev) => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        [productId]: value,
      },
    }));
  };

  // Fetch existing prices from API
  const fetchExistingPrices = async () => {
    try {
      const response = await fetch(`/api/deal-prices?customer_id=${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setExistingPrices(data);
        
        // Transform to prices state format
        const transformedPrices = {};
        data.forEach(item => {
          if (!transformedPrices[item.station_id]) {
            transformedPrices[item.station_id] = {};
          }
          transformedPrices[item.station_id][item.product_id] = item.price;
        });
        setPrices(transformedPrices);
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  // Check if price already exists
  const checkIfPriceExists = (stationId, productId) => {
    return existingPrices.find(
      price => price.station_id === stationId && price.product_id === productId
    );
  };

  // Check if schedule time is valid for update
  const canUpdatePrice = (existingPrice) => {
    if (!existingPrice) return true; // New entry - always allow
    
    const existingSchedule = new Date(`${existingPrice.Schedule_Date}T${existingPrice.Schedule_Time}`);
    const newSchedule = new Date(`${scheduleDate}T${scheduleTime}`);
    
    // Allow update only if new schedule is after existing schedule
    return newSchedule > existingSchedule;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerId) {
      alert("Customer ID is required");
      return;
    }

    setLoading(true);

    try {
      const operations = [];
      const newPrices = [];
      const updatedPrices = [];
      const skippedPrices = [];

      // Prepare data for API
      locations.forEach(location => {
        products.forEach(product => {
          const priceValue = prices[location.id]?.[product.id];
          if (priceValue && priceValue !== "") {
            const existingPrice = checkIfPriceExists(location.id, product.id);
            
            if (!existingPrice) {
              // INSERT operation - new price
              newPrices.push({
                com_id: customerId,
                station_id: location.id,
                product_id: product.id,
                price: parseFloat(priceValue),
                Schedule_Date: scheduleDate,
                Schedule_Time: scheduleTime,
                updated_date: new Date().toISOString().split('T')[0]
              });
              operations.push('INSERT');
            } else {
              // UPDATE operation - check schedule
              if (canUpdatePrice(existingPrice)) {
                updatedPrices.push({
                  id: existingPrice.id,
                  com_id: customerId,
                  station_id: location.id,
                  product_id: product.id,
                  price: parseFloat(priceValue),
                  Schedule_Date: scheduleDate,
                  Schedule_Time: scheduleTime,
                  updated_date: new Date().toISOString().split('T')[0]
                });
                operations.push('UPDATE');
              } else {
                skippedPrices.push({
                  location: location.name,
                  product: product.label,
                  reason: "Schedule time not valid for update"
                });
                operations.push('SKIP');
              }
            }
          }
        });
      });

      if (newPrices.length === 0 && updatedPrices.length === 0) {
        alert("Please enter at least one price");
        return;
      }

      // Send to API
      const result = await saveDealPrices({
        newPrices,
        updatedPrices,
        operations
      });

      console.log("Save result:", result);
      
      let message = "Prices processed:\n";
      if (newPrices.length > 0) message += `✅ New: ${newPrices.length}\n`;
      if (updatedPrices.length > 0) message += `✏️ Updated: ${updatedPrices.length}\n`;
      if (skippedPrices.length > 0) message += `⏸️ Skipped: ${skippedPrices.length}`;
      
      alert(message);

      // Refresh prices
      await fetchExistingPrices();
      
    } catch (error) {
      console.error("Error submitting prices:", error);
      alert("Error saving prices. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveDealPrices = async (priceData) => {
    try {
      const response = await fetch('/api/deal-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(priceData),
      });

      if (!response.ok) {
        throw new Error('Failed to save prices');
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving deal prices:", error);
      throw error;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-blue-900 mb-2">
          Setup Deal Price for: <span className="capitalize">shuabm</span>
        </h2>
        <a href="/" className="text-blue-600 underline hover:text-blue-800 transition-colors">
          ← Back to Home
        </a>
      </div>

      {/* Schedule Settings */}
      <div className="bg-white p-4 rounded-lg border border-gray-300 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Schedule Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer ID
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter customer ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Date
            </label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Time
            </label>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          💡 New prices will be inserted. Existing prices will be updated only if schedule time is future date.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border border-gray-300 bg-white rounded-lg shadow-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left border font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">
                  Location
                </th>
                {products.map((p) => (
                  <th key={p.id} className="px-4 py-3 border text-left font-semibold text-gray-700 min-w-40">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, index) => (
                <tr key={loc.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 border font-medium text-gray-900 sticky left-0 bg-white z-10">
                    {loc.name}
                  </td>
                  {products.map((p) => {
                    const existingPrice = checkIfPriceExists(loc.id, p.id);
                    const canUpdate = canUpdatePrice(existingPrice);
                    
                    return (
                      <td key={p.id} className="px-4 py-3 border relative">
                        <input
                          type="number"
                          placeholder="Enter Price"
                          value={prices[loc.id]?.[p.id] || ""}
                          onChange={(e) => handleChange(loc.id, p.id, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                            existingPrice 
                              ? canUpdate 
                                ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-500' 
                                : 'border-gray-300 bg-gray-100 focus:ring-gray-500'
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
                          min="0"
                          step="0.01"
                        />
                        {existingPrice && (
                          <div className="absolute -top-1 -right-1">
                            {canUpdate ? (
                              <span className="bg-yellow-500 text-white text-xs px-1 rounded">Update</span>
                            ) : (
                              <span className="bg-gray-500 text-white text-xs px-1 rounded">Locked</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white border border-gray-300 rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 pb-2 border-b">
                {loc.name}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {products.map((p) => {
                  const existingPrice = checkIfPriceExists(loc.id, p.id);
                  const canUpdate = canUpdatePrice(existingPrice);
                  
                  return (
                    <div key={p.id} className="flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-gray-700">
                          {p.label}
                        </label>
                        {existingPrice && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            canUpdate 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {canUpdate ? 'Update' : 'Locked'}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        placeholder="Enter Price"
                        value={prices[loc.id]?.[p.id] || ""}
                        onChange={(e) => handleChange(loc.id, p.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                          existingPrice 
                            ? canUpdate 
                              ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-500' 
                              : 'border-gray-300 bg-gray-100 focus:ring-gray-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center md:justify-start">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Save Prices"}
          </button>
        </div>
      </form>
    </div>
  );
}