"use client";

import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedVehicles, setExpandedVehicles] = useState({});
  
  const toggleVehicleLogs = (vehicleId) => {
    setExpandedVehicles(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };

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
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(<span key="ellipsis1" className="px-1 text-gray-400">•••</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            currentPage === i 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="ellipsis2" className="px-1 text-gray-400">•••</span>);
      }
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
              {/* Breadcrumb and Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => router.back()}
                  className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                  title="Go Back"
                >
                  ←
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Vehicles Management
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <p className="text-gray-600">Manage your fleet efficiently</p>
                <Link
                  href="/vehicles/add_vehicle"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium text-sm whitespace-nowrap"
                >
                  <span>+</span>
                  <span>Add New Vehicle</span>
                </Link>
              </div>
            </div>

            {/* Vehicle list container */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-auto">
                <table className="min-w-full divide-y divide-purple-100/50">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        S.No
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Plate
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Logs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="h-8 bg-gray-200 rounded w-20"></div>
                          </td>
                        </tr>
                      ))
                    ) : vehicles.length === 0 ? (
                      // Empty state
                      <tr>
                        <td colSpan="8" className="px-4 sm:px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <span className="text-3xl">🚗</span>
                            </div>
                            <p className="text-lg font-semibold text-gray-700 mb-2">
                              No vehicles found
                            </p>
                            <p className="text-gray-600 mb-4 max-w-md text-sm">
                              Start building your fleet by adding your first vehicle
                            </p>
                            <Link
                              href="/vehicles/add_vehicle"
                              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                            >
                              Add First Vehicle
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // Data rows
                      vehicles.map((v, index) => (
                        <React.Fragment key={v.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {startItem + index}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">🚛</span>
                              <span className="font-medium text-gray-900 text-sm">
                                {v.vehicle_name || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono text-xs">
                              {v.licence_plate || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {v.phone || "N/A"}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              v.status === 'Active' 
                                ? 'bg-green-100 text-green-800'
                                : v.status === 'Inactive'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                v.status === 'Active' ? 'bg-green-600' : v.status === 'Inactive' ? 'bg-red-600' : 'bg-gray-600'
                              }`}></span>
                              {v.status || "Unknown"}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {v.driver_name || "N/A"}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <Link 
                                href={`/vehicles/edit/${v.id}`} 
                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-xs font-medium"
                              >
                                Edit
                              </Link>
                              <Link 
                                href={`/vehicles/view/${v.id}`} 
                                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors text-xs font-medium"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleVehicleLogs(v.id)}
                              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                              title="View Activity Logs"
                            >
                              {expandedVehicles[v.id] ? (
                                <>
                                  <BiChevronUp size={18} />
                                  <span className="ml-1 text-xs">Hide</span>
                                </>
                              ) : (
                                <>
                                  <BiChevronDown size={18} />
                                  <span className="ml-1 text-xs">Logs</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                        {/* Expandable Logs Row */}
                        {expandedVehicles[v.id] && (
                          <tr className="bg-gray-50">
                            <td colSpan="8" className="px-4 sm:px-6 py-4">
                              <div className="max-w-4xl">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Logs for {v.vehicle_name || `Vehicle #${v.id}`}</h3>
                                <EntityLogs entityType="vehicle" entityId={v.id} />
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden p-4 space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">🚗</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-700 mb-2">No vehicles found</p>
                    <Link
                      href="/vehicles/add_vehicle"
                      className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Add First Vehicle
                    </Link>
                  </div>
                ) : (
                  vehicles.map((v, index) => (
                    <div key={v.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xl">🚛</span>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-base">{v.vehicle_name || "N/A"}</h3>
                              <p className="text-xs text-gray-500">#{startItem + index}</p>
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          v.status === 'Active' 
                            ? 'bg-green-100 text-green-800'
                            : v.status === 'Inactive'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {v.status || "Unknown"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Plate:</span>
                          <p className="font-medium text-gray-900">{v.licence_plate || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <p className="font-medium text-gray-900">{v.phone || "N/A"}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Driver:</span>
                          <p className="font-medium text-gray-900">{v.driver_name || "N/A"}</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 pt-3 border-t border-gray-100">
                        <Link 
                          href={`/vehicles/edit/${v.id}`} 
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors text-center font-medium text-xs"
                        >
                          Edit
                        </Link>
                        <Link 
                          href={`/vehicles/view/${v.id}`} 
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors text-center font-medium text-xs"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {vehicles.length > 0 && !loading && (
                <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-medium">{startItem}</span> to{" "}
                      <span className="font-medium">{endItem}</span> of{" "}
                      <span className="font-medium">{totalCount}</span> vehicles
                    </div>
                    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Previous
                      </button>
                      
                      <div className="flex space-x-1 flex-wrap justify-center">
                        {renderPaginationButtons()}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}