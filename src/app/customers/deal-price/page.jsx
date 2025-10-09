"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SetupDealPriceContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [prices, setPrices] = useState({});
  const [existingPrices, setExistingPrices] = useState([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSetupData();
  }, []);

  useEffect(() => {
    const now = new Date();
    setScheduleDate(now.toISOString().split("T")[0]);
    setScheduleTime(now.toTimeString().slice(0, 5));
    if (customerId) fetchExistingPrices();
  }, [customerId]);

  const fetchSetupData = async () => {
    try {
      const res = await fetch("/api/customers/deal-price-setup");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setStations(data.stations);
      } else {
        alert(data.message || "Setup data missing");
      }
    } catch (error) {
      console.error("Error fetching setup data:", error);
    }
  };

  const fetchExistingPrices = async () => {
    try {
      const res = await fetch(`/api/customers/deal-price?customer_id=${customerId}`);
      const result = await res.json();

      const data = Array.isArray(result) ? result : [];

      setExistingPrices(data);

      const formatted = {};
      data.forEach((item) => {
        if (!formatted[item.station_id]) formatted[item.station_id] = {};
        formatted[item.station_id][item.sub_product_id] = item.price;
      });
      setPrices(formatted);
    } catch (error) {
      console.error("Error fetching existing prices:", error);
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
    } catch (error) {
      console.error("Error saving prices:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h1 className="text-xl font-bold text-gray-800">Setup Deal Price</h1>
            <p className="text-sm text-gray-600">
              Customer ID: <b>{customerId}</b>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border text-left">Station</th>
                  {products.map((prod) => (
                    <th key={prod.sub_product_id} className="px-4 py-2 border text-center">
                      <div className="font-semibold">{prod.product_name}</div>
                      <div className="text-xs text-gray-500">{prod.pcode}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stations.map((station) => (
                  <tr key={station.id}>
                    <td className="px-4 py-2 border font-semibold text-gray-700">
                      {station.station_name}
                    </td>
                    {products.map((prod) => {
                      const exists = priceExists(station.id, prod.sub_product_id);
                      return (
                        <td key={prod.sub_product_id} className="px-4 py-2 border">
                          <input
                            type="number"
                            value={prices[station.id]?.[prod.sub_product_id] || ""}
                            onChange={(e) =>
                              handleChange(station.id, prod.sub_product_id, e.target.value)
                            }
                            placeholder="0.00"
                            className={`w-full px-2 py-1 border rounded text-sm ${
                              exists
                                ? "border-green-400 bg-green-50"
                                : "border-gray-300"
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
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Processing..." : "💾 Save Prices"}
            </button>
          </div>
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
