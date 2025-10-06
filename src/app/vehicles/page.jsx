"use client";

import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from "next/link";
import { useEffect, useState } from "react";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchVehicles = async (page = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/vehicles?page=${page}&limit=10`);
      const data = await res.json();
      
      if (res.ok) {
        setVehicles(data.vehicles || []);
        setCurrentPage(data.currentPage || 1);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      } else {
        console.error('Error fetching vehicles:', data.error);
        setVehicles([]);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles(currentPage);
  }, [currentPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate pagination buttons with ellipsis
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="px-3 py-2 bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-lg hover:from-blue-500 hover:to-purple-600 transition-all duration-300 shadow-md text-sm"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(<span key="ellipsis1" className="px-1 text-purple-600 font-bold">•••</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 rounded-lg font-semibold transition-all duration-300 shadow-md text-sm min-w-[40px] ${
            currentPage === i 
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white scale-105" 
              : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-600 hover:scale-105"
          }`}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="ellipsis2" className="px-1 text-purple-600 font-bold">•••</span>);
      }
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-2 bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-lg hover:from-green-500 hover:to-teal-600 transition-all duration-300 shadow-md text-sm"
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  // Calculate showing range
  const getShowingRange = () => {
    const startItem = (currentPage - 1) * 10 + 1;
    const endItem = Math.min(currentPage * 10, totalCount);
    return { startItem, endItem };
  };

  const { startItem, endItem } = getShowingRange();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex flex-1 flex-col sm:flex-row">
        {/* Sidebar */}
        <div className="w-full sm:w-64 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header />

          {/* Content area - This will grow and push footer down */}
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {/* Breadcrumb and Header */}
            <div className="mb-6">
              <nav className="mb-3 text-sm">
                <Link href="/" className="hover:underline text-purple-600 font-medium">Home</Link> 
                <span className="mx-2 text-purple-400">❯</span>
                <span className="text-gradient bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">Vehicles List</span>
              </nav>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                    Vehicles Management
                  </h1>
                  <p className="text-purple-500 font-medium">Manage your fleet efficiently</p>
                </div>
                <Link
                  href="/vehicles/add_vehicle"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 font-semibold text-sm sm:text-base whitespace-nowrap"
                >
                  <span className="text-lg">+</span>
                  <span>Add New Vehicle</span>
                </Link>
              </div>
            </div>

            {/* Vehicle list container */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Table container with proper scrolling */}
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="min-w-full divide-y divide-purple-100/50">
                  <thead className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm sticky top-0">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wider">
                        📊 S.No
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wider">
                        🚗 Vehicle
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wider">
                        🏷️ Plate
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wider">
                        📞 Phone
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wider">
                        ⚡ Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wider">
                        👤 Driver
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wider">
                        🛠️ Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-purple-100/30">
                    {loading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gradient-to-r from-pink-200 to-purple-200 rounded-full w-3/4"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gradient-to-r from-blue-200 to-cyan-200 rounded-full w-1/2"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gradient-to-r from-green-200 to-teal-200 rounded-full w-2/3"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-6 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-full w-16"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full w-3/4"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-20"></div>
                          </td>
                        </tr>
                      ))
                    ) : vehicles.length === 0 ? (
                      // Empty state
                      <tr>
                        <td colSpan="7" className="px-4 sm:px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-4 shadow-xl">
                              <span className="text-4xl">🚗</span>
                            </div>
                            <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                              No vehicles found
                            </p>
                            <p className="text-purple-600 font-medium mb-4 max-w-md text-sm">
                              Start building your fleet by adding your first vehicle
                            </p>
                            <Link
                              href="/vehicles/add_vehicle"
                              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-xl shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 font-semibold text-sm"
                            >
                              🚀 Add First Vehicle
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // Data rows
                      vehicles.map((v, index) => (
                        <tr key={v.id} className="group hover:bg-gradient-to-r from-purple-50/80 to-blue-50/80 transition-all duration-300 border-l-4 border-l-transparent hover:border-l-purple-400">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-bold text-xs">
                              {startItem + index}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm">🚛</span>
                              </div>
                              <span className="font-bold text-purple-900 group-hover:text-purple-700 transition-colors duration-300 text-sm">
                                {v.vehicle_name || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-2 py-1 rounded-full font-mono font-bold text-xs">
                              {v.licence_plate || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <span className="text-green-600 text-sm">📞</span>
                              <span className="font-semibold text-gray-700 text-sm">{v.phone || "N/A"}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                              v.status === 'Active' 
                                ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                                : v.status === 'Inactive'
                                ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white'
                                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                            }`}>
                              <span className="w-1.5 h-1.5 bg-white rounded-full mr-1"></span>
                              {v.status || "Unknown"}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">👤</span>
                              </div>
                              <span className="font-semibold text-gray-700 text-sm">{v.driver_name || "N/A"}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <Link 
                                href={`/vehicles/edit/${v.id}`} 
                                className="bg-gradient-to-r from-blue-400 to-cyan-500 text-white px-3 py-1 rounded-lg hover:from-blue-500 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-md flex items-center space-x-1 font-semibold text-xs"
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </Link>
                              <Link 
                                href={`/vehicles/view/${v.id}`} 
                                className="bg-gradient-to-r from-green-400 to-teal-500 text-white px-3 py-1 rounded-lg hover:from-green-500 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 shadow-md flex items-center space-x-1 font-semibold text-xs"
                              >
                                <span>👁️</span>
                                <span>View</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {vehicles.length > 0 && !loading && (
                <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 px-4 sm:px-6 py-4 border-t border-purple-200/50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Showing <span className="text-purple-700">{startItem}</span> to{" "}
                      <span className="text-purple-700">{endItem}</span> of{" "}
                      <span className="text-purple-700">{totalCount}</span> vehicles
                    </div>
                    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="bg-gradient-to-r from-purple-400 to-blue-400 text-white px-3 py-1 rounded-xl hover:from-purple-500 hover:to-blue-500 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-1 font-semibold text-xs sm:text-sm"
                      >
                        <span>⬅️</span>
                        <span>Previous</span>
                      </button>
                      
                      <div className="flex space-x-1 bg-white/50 backdrop-blur-sm rounded-xl p-1 shadow-inner flex-wrap justify-center">
                        {renderPaginationButtons()}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-3 py-1 rounded-xl hover:from-pink-500 hover:to-purple-500 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-1 font-semibold text-xs sm:text-sm"
                      >
                        <span>Next</span>
                        <span>➡️</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Footer - This will now stick to the bottom */}
          <Footer />
        </div>
      </div>
    </div>
  );
}