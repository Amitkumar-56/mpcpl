"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AddVehiclePage() {
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({
    com_id: "",
    vehicle_name: "",
    licence_plate: "",
    phone: "",
    status: "Active",
    driver_id: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch drivers from API
  useEffect(() => {
    async function fetchDrivers() {
      try {
        const res = await fetch("/api/drivers");
        const data = await res.json();
        setDrivers(data);
      } catch (err) {
        console.error("Error fetching drivers:", err);
      }
    }
    fetchDrivers();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Simple validation
    if (!formData.com_id || !formData.vehicle_name || !formData.phone || !formData.status || !formData.driver_id) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = "/vehicles";
      } else {
        setError(data.message || "Error adding vehicle.");
      }
    } catch (err) {
      console.error(err);
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>

      <div className="flex flex-1 pt-16"> {/* Add padding-top for header */}
        {/* Fixed Sidebar */}
        <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64">
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 ml-64 min-h-[calc(100vh-4rem)] flex flex-col">
          {/* Content area - No scrolling needed */}
          <main className="flex-1 overflow-hidden">
            <div className="p-6 h-full flex items-center justify-center min-h-[calc(100vh-8rem)]"> {/* Adjust height */}
              <div className="w-full max-w-4xl">
                {/* Breadcrumb */}
                <nav className="mb-6">
                  <ol className="flex items-center space-x-2 text-sm text-purple-600">
                    <li>
                      <Link href="/" className="hover:text-purple-800 transition-colors font-medium">Home</Link>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-purple-400">❯</span>
                      <Link href="/vehicles" className="hover:text-purple-800 transition-colors font-medium">Vehicles</Link>
                      <span className="text-purple-400">❯</span>
                      <span className="text-gradient bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">Add Vehicle</span>
                    </li>
                  </ol>
                </nav>

                {/* Header Section */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-2xl mb-4">
                    <span className="text-3xl text-white">🚗</span>
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                    Add New Vehicle
                  </h1>
                  <p className="text-purple-600 font-medium text-lg">Fill in the details to register a new vehicle in your fleet</p>
                </div>

                {/* Form Card */}
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1"></div>
                  
                  <div className="p-8">
                    {error && (
                      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 flex items-center shadow-lg">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-lg">⚠️</span>
                        </div>
                        <span className="font-semibold">{error}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Company ID */}
                        <div className="space-y-2">
                          <label className="block text-lg font-bold text-purple-700">
                            Company ID <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-purple-500 text-lg">🏢</span>
                            </div>
                            <input
                              type="text"
                              name="com_id"
                              value={formData.com_id}
                              onChange={handleChange}
                              className="w-full border-2 border-purple-100 rounded-xl px-12 py-4 text-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                              placeholder="Enter company ID"
                              required
                            />
                          </div>
                        </div>

                        {/* Vehicle Name */}
                        <div className="space-y-2">
                          <label className="block text-lg font-bold text-purple-700">
                            Vehicle Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-purple-500 text-lg">🚛</span>
                            </div>
                            <input
                              type="text"
                              name="vehicle_name"
                              value={formData.vehicle_name}
                              onChange={handleChange}
                              className="w-full border-2 border-purple-100 rounded-xl px-12 py-4 text-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                              placeholder="Enter vehicle name"
                              required
                            />
                          </div>
                        </div>

                        {/* Licence Plate */}
                        <div className="space-y-2">
                          <label className="block text-lg font-bold text-purple-700">
                            Licence Plate
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-purple-500 text-lg">🏷️</span>
                            </div>
                            <input
                              type="text"
                              name="licence_plate"
                              value={formData.licence_plate}
                              onChange={handleChange}
                              className="w-full border-2 border-purple-100 rounded-xl px-12 py-4 text-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                              placeholder="Enter licence plate"
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                          <label className="block text-lg font-bold text-purple-700">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-purple-500 text-lg">📞</span>
                            </div>
                            <input
                              type="text"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              className="w-full border-2 border-purple-100 rounded-xl px-12 py-4 text-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                              placeholder="Enter phone number"
                              required
                            />
                          </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                          <label className="block text-lg font-bold text-purple-700">
                            Status <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-purple-500 text-lg">⚡</span>
                            </div>
                            <select
                              name="status"
                              value={formData.status}
                              onChange={handleChange}
                              className="w-full border-2 border-purple-100 rounded-xl px-12 py-4 text-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 appearance-none transition-all duration-300 bg-white/50 backdrop-blur-sm"
                              required
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-purple-500 text-lg">▼</span>
                            </div>
                          </div>
                        </div>

                        {/* Driver */}
                        <div className="space-y-2">
                          <label className="block text-lg font-bold text-purple-700">
                            Driver <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-purple-500 text-lg">👤</span>
                            </div>
                            <select
                              name="driver_id"
                              value={formData.driver_id}
                              onChange={handleChange}
                              className="w-full border-2 border-purple-100 rounded-xl px-12 py-4 text-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 appearance-none transition-all duration-300 bg-white/50 backdrop-blur-sm"
                              required
                            >
                              <option value="">Select a Driver</option>
                              {drivers.map(driver => (
                                <option key={driver.id} value={driver.id}>{driver.name}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-purple-500 text-lg">▼</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-purple-200/50 gap-4">
                        <Link 
                          href="/vehicles" 
                          className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-purple-300 text-purple-700 font-bold hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 text-center shadow-lg"
                        >
                          ← Back to Vehicles
                        </Link>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-70 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 font-bold shadow-2xl text-lg"
                        >
                          {loading ? (
                            <>
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Adding Vehicle...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xl">+</span>
                              <span>Add Vehicle</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Fixed Footer */}
          <div className="fixed bottom-0 left-64 right-0 z-50">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}