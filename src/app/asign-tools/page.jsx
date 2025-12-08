//src/app/asign-tools/page.jsx
"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function AssignToolsContent() {
  const searchParams = useSearchParams();
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverId, setDriverId] = useState(null);
  const [driverMobile, setDriverMobile] = useState("");
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchingDriver, setFetchingDriver] = useState(false);

  // Get vehicle_no from URL if present
  useEffect(() => {
    const urlVehicleNo = searchParams.get("vehicle_no");
    if (urlVehicleNo) {
      setVehicleNo(urlVehicleNo);
    }
  }, [searchParams]);

  // Fetch items only
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch items
        const itemsRes = await fetch("/api/get-items");
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch driver name when vehicle number changes
  useEffect(() => {
    const fetchDriverByVehicle = async () => {
      if (!vehicleNo || vehicleNo.trim() === "") {
        setDriverName("");
        setDriverId(null);
        setDriverMobile("");
        return;
      }

      setFetchingDriver(true);
      try {
        console.log("🚗 Fetching vehicle using /api/vehicles:", vehicleNo);
        // Use same API as vehicles page
        const res = await fetch(`/api/vehicles?vehicle_no=${encodeURIComponent(vehicleNo.trim())}`);
        const data = await res.json();

        console.log("📦 API Response:", data);

        if (data.vehicles && data.vehicles.length > 0) {
          const vehicle = data.vehicles[0];
          // Show driver name same as vehicles page (shows "N/A" if null)
          setDriverName(vehicle.driver_name || "N/A");
          setDriverId(vehicle.driver_id);
          setDriverMobile(vehicle.phone || "");
          console.log("✅ Vehicle Plate:", vehicle.licence_plate);
          console.log("✅ Driver Name:", vehicle.driver_name || "N/A");
          
          if (!vehicle.driver_name) {
            console.log("⚠️ No driver assigned to this vehicle");
          }
        } else {
          setDriverName("");
          setDriverId(null);
          setDriverMobile("");
          if (data.error) {
            console.error("❌ Error:", data.error);
            if (data.error === "Vehicle not found") {
              alert(`Vehicle "${vehicleNo}" not found. Please check the vehicle number.`);
            }
          } else {
            alert(`Vehicle "${vehicleNo}" not found. Please check the vehicle number.`);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching driver:", error);
        setDriverName("");
        setDriverId(null);
        setDriverMobile("");
        alert("Error fetching driver information. Please try again.");
      } finally {
        setFetchingDriver(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchDriverByVehicle();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [vehicleNo]);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!vehicleNo) {
      alert("Please enter vehicle number");
      return;
    }
    
    if (!driverName || driverName === "N/A") {
      alert("Please assign a driver to this vehicle first before assigning tools");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/asign-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_no: vehicleNo,
          driver_name: driverName,
          items: formData,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert("Items assigned successfully");
        window.location.href = "/vehicles";
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("Error submitting form");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 mt-10">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white shadow-lg rounded-lg mt-4 md:mt-10">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-gray-800">
        Assign Toolbox Items
      </h2>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Number - Input Field */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">
            Vehicle Number
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            placeholder="Enter Vehicle Number"
            required
          />
          {fetchingDriver && (
            <p className="text-sm text-gray-500 mt-1">Fetching driver information...</p>
          )}
          {vehicleNo && !fetchingDriver && !driverName && (
            <p className="text-sm text-yellow-600 mt-1">
              Vehicle found but no driver assigned. Please assign a driver first.
            </p>
          )}
        </div>

        {/* Driver Name - Auto-fetched Display */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">
            Driver Name
          </label>
          <input
            type="text"
            className={`w-full border border-gray-300 p-3 rounded-lg bg-gray-50 ${
              driverName === "N/A" ? "text-red-600 font-semibold" : ""
            }`}
            value={driverName || ""}
            readOnly
            placeholder={fetchingDriver ? "Loading..." : "Enter Vehicle Number to fetch Driver Name"}
          />
        </div>

        {/* Driver Info Display - Same as vehicles page */}
        {vehicleNo && driverName && (
          <div className={`p-4 rounded-lg ${
            driverName === "N/A" ? "bg-red-50 border border-red-200" : "bg-blue-50"
          }`}>
            <h3 className={`font-semibold mb-2 ${
              driverName === "N/A" ? "text-red-700" : "text-blue-700"
            }`}>
              Vehicle & Driver Details:
            </h3>
            <p className="text-sm">
              <span className="font-medium">Vehicle Plate:</span> {vehicleNo}
            </p>
            <p className="text-sm">
              <span className="font-medium">Driver Name:</span>{" "}
              <span className={driverName === "N/A" ? "text-red-600 font-semibold" : ""}>
                {driverName}
              </span>
            </p>
            {driverMobile && driverName !== "N/A" && (
              <p className="text-sm">
                <span className="font-medium">Phone:</span> {driverMobile}
              </p>
            )}
            {driverName === "N/A" && (
              <p className="text-sm text-red-600 mt-2 font-medium">
                ⚠️ No driver assigned to this vehicle
              </p>
            )}
          </div>
        )}

        {/* Items List */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Toolbox Items
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <label className="font-bold text-gray-800">
                  {item.item_name}
                </label>

                {/* Yes / No */}
                <div className="mt-3 flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`item_${item.id}`}
                      value="Yes"
                      className="mr-2 h-4 w-4 text-blue-600"
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: "Yes",
                            name: item.item_name,
                          },
                        }))
                      }
                    />
                    <span className="text-gray-700">Yes</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`item_${item.id}`}
                      value="No"
                      className="mr-2 h-4 w-4 text-blue-600"
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: "No",
                            name: item.item_name,
                          },
                        }))
                      }
                    />
                    <span className="text-gray-700">No</span>
                  </label>
                </div>

                {/* Qty */}
                <input
                  type="number"
                  placeholder="Quantity"
                  min="0"
                  className="w-full border border-gray-300 p-2 rounded mt-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        qty: Number(e.target.value) || 0,
                        name: item.item_name,
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center mt-8">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "Submitting..." : "Assign Items"}
          </button>
        </div>
      </form>
    </div>
  );
}
// Main component with Suspense wrapper
export default function AssignTools() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto p-6 mt-10">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    }>
      <AssignToolsContent />
    </Suspense>
  );
}