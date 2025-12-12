// src/app/stock/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BsClockHistory, BsEyeFill, BsPencil, BsPlusCircle, BsTrash } from "react-icons/bs";

// A sub-component for data rendering inside Suspense
function StockTable({ stockRequests }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const getStatusBadge = (status) => {
    // ✅ FIX: Handle both numeric and string status values
    const statusValue = status?.toString().toLowerCase();
    
    // Map numeric values
    const numericMap = {
      '1': { text: "Dispatched", color: "bg-blue-100 text-blue-800 border border-blue-200" },
      '2': { text: "Processing", color: "bg-yellow-100 text-yellow-800 border border-yellow-200" },
      '3': { text: "Completed", color: "bg-green-100 text-green-800 border border-green-200" },
      '4': { text: "Cancelled", color: "bg-red-100 text-red-800 border border-red-200" }
    };
    
    // Map string values
    const stringMap = {
      'on_the_way': { text: "On The Way", color: "bg-blue-100 text-blue-800 border border-blue-200" },
      'dispatched': { text: "Dispatched", color: "bg-blue-100 text-blue-800 border border-blue-200" },
      'processing': { text: "Processing", color: "bg-yellow-100 text-yellow-800 border border-yellow-200" },
      'completed': { text: "Completed", color: "bg-green-100 text-green-800 border border-green-200" },
      'cancelled': { text: "Cancelled", color: "bg-red-100 text-red-800 border border-red-200" },
      'pending': { text: "Pending", color: "bg-gray-100 text-gray-800 border border-gray-200" }
    };
    
    // Check numeric first, then string, then default
    const statusInfo = numericMap[statusValue] || stringMap[statusValue] || {
      text: statusValue || "Pending",
      color: "bg-gray-100 text-gray-800 border border-gray-200"
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB") : "N/A";

  const formatCurrency = (amount) =>
    amount ? `₹${parseFloat(amount).toLocaleString("en-IN")}` : "₹0";

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "↕️";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const filteredAndSortedData = useMemo(() => {
    let data = stockRequests.filter((item) => {
      const matchesSearch =
        item.product_name?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.supplier_name?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.invoice_number?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.station_name?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.tanker_no?.toLowerCase().includes(filterText.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status?.toString() === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle date sorting
        if (sortConfig.key === "invoice_date" || sortConfig.key === "created_at") {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        
        // Handle numeric sorting
        if (sortConfig.key === "ltr" || sortConfig.key === "payable" || sortConfig.key === "v_invoice_value") {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        }
        
        // Handle string sorting
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [stockRequests, filterText, statusFilter, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(start, start + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  return (
    <>
      {/* Filters Section */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by product, supplier, station..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="1">Dispatched</option>
              <option value="2">Processing</option>
              <option value="3">Completed</option>
              <option value="4">Cancelled</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {paginatedData.length} of {filteredAndSortedData.length} records
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "id",
                  "product_name",
                  "supplier_name", 
                  "invoice_date",
                  "invoice_number",
                  "station_name",
                  "tanker_no",
                  "ltr",
                  "v_invoice_value",
                  "dncn",
                  "payable",
                  "status"
                ].map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>
                        {col === "product_name" ? "Product" :
                         col === "supplier_name" ? "Supplier" :
                         col === "invoice_date" ? "Invoice Date" :
                         col === "invoice_number" ? "Invoice#" :
                         col === "station_name" ? "Filling Station" :
                         col === "tanker_no" ? "Tanker No." :
                         col === "v_invoice_value" ? "Invoice Value" :
                         col === "ltr" ? "Quantity (Ltr)" :
                         col.toUpperCase().replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-400">{getSortIcon(col)}</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                         {request.product_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {request.supplier_name || "N/A"}
                     
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.invoice_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {request.invoice_number || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {request.station_name || "N/A"}
                     
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {request.tanker_no || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {request.ltr ? `${parseFloat(request.ltr).toLocaleString()} ` : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    
                      {request.v_invoice_value || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {request.dncn || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                      {formatCurrency(request.payable)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <Link
                          href={`/stock/supply-details/${request.id}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Details"
                        >
                          <BsEyeFill size={16} />
                        </Link>
                        <Link
                          href={`/stock/dncn?id=${request.id}`}
                          className="text-orange-600 hover:text-orange-800 transition-colors"
                          title="DN/CN History"
                        >
                          <BsClockHistory size={16} />
                        </Link>
                        <Link
                          href={`/stock/edit?id=${request.id}`}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Edit"
                        >
                          <BsPencil size={16} />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this stock request?')) {
                              // Add delete logic here
                              console.log('Delete:', request.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                        >
                          <BsTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-lg font-medium text-gray-400 mb-2">
                        No stock requests found
                      </div>
                      <div className="text-sm text-gray-500">
                        {filterText || statusFilter !== "all" 
                          ? "Try adjusting your search or filters" 
                          : "No stock requests available"
                        }
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border text-sm font-medium rounded-md transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Parent component with Suspense
export default function StockRequest() {
  const [stockRequests, setStockRequests] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockRequests();
  }, []);

  const fetchStockRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching stock data...");
      const res = await fetch("/api/stock", {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API response not OK:", res.status, errorText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const result = await res.json();
      console.log("API response:", result);
      
      if (result.success) {
        setStockRequests(result.data || []);
        if (result.message) {
          console.info("API message:", result.message);
        }
      } else {
        setError(result.error || "Failed to fetch stock requests");
        setStockRequests([]);
      }
    } catch (err) {
      console.error("Fetch error details:", err);
      setError("Error fetching stock requests: " + err.message);
      setStockRequests([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Header Section */}
          <div className="bg-white shadow-sm border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Stock Requests</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage and track all stock requests and purchases
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/stock/activity-logs"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <BsClockHistory size={16} />
                    Activity Logs
                  </Link>
                  <Link
                    href="/stock/purchase-for-use-history"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <BsPlusCircle size={16} />
                    Purchase for Use
                  </Link>
                  <Link
                    href="/stock/purchase"
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <BsPlusCircle size={16} />
                    Purchase for Sale
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-red-600 text-sm font-medium">
                        {error}
                      </div>
                    </div>
                    <button 
                      onClick={fetchStockRequests}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
              
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  }
                >
                  <StockTable stockRequests={stockRequests} />
                </Suspense>
              )}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}