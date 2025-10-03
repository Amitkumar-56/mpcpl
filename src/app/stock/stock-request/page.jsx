// app/stock/stock-request/page.jsx
"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BiChat, BiChevronLeft, BiChevronRight, BiFilter, BiRupee, BiSearch, BiShow } from "react-icons/bi";

// Debounce function for search optimization
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function StockRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [error, setError] = useState(null);
  const router = useRouter();

  const statusText = useCallback((status) => {
    switch (status) {
      case 1:
        return { text: "Dispatched", color: "bg-blue-100 text-blue-800" };
      case 2:
        return { text: "Processing", color: "bg-yellow-100 text-yellow-800" };
      case 3:
        return { text: "Completed", color: "bg-green-100 text-green-800" };
      default:
        return { text: "Unknown", color: "bg-gray-100 text-gray-800" };
    }
  }, []);

  const fetchStockRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/stock-requests", {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error("Error fetching stock requests:", err);
      setError(err.name === "AbortError" ? "Request timeout" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFilter = useMemo(
    () =>
      debounce((search, status, requestsData) => {
        let filtered = requestsData.filter((request) => {
          const matchesSearch =
            request.product_name?.toLowerCase().includes(search.toLowerCase()) ||
            request.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
            request.station_name?.toLowerCase().includes(search.toLowerCase()) ||
            request.invoice_number?.toLowerCase().includes(search.toLowerCase());

          const matchesStatus = status === "all" || request.status?.toString() === status;
          return matchesSearch && matchesStatus;
        });
        setFilteredRequests(filtered);
        setCurrentPage(1);
      }, 300),
    []
  );

  useEffect(() => {
    if (requests.length > 0) {
      debouncedFilter(searchTerm, statusFilter, requests);
    }
  }, [searchTerm, statusFilter, requests, debouncedFilter]);

  useEffect(() => {
    fetchStockRequests();
  }, [fetchStockRequests]);

  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    return { currentItems, totalPages };
  }, [filteredRequests, currentPage, itemsPerPage]);

  const paginate = useCallback((pageNumber) => setCurrentPage(pageNumber), []);

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {[...Array(10)].map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 bg-gray-200 rounded"></div>
        </td>
      ))}
    </tr>
  );

  if (loading && requests.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="hidden lg:block w-64 bg-white shadow-lg flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <Header />
          <div className="flex-1 flex flex-col min-h-0 p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="overflow-auto flex-1">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                    <tr>{[...Array(10)].map((_, i) => <th key={i} className="p-4"><div className="h-4 bg-gray-300 rounded"></div></th>)}</tr>
                  </thead>
                  <tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
                </table>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden lg:block w-64 bg-white shadow-lg flex-shrink-0"><Sidebar /></div>
      <div className="flex-1 flex flex-col min-h-0">
        <Header />

        <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-6">
          {/* Page Header */}
          <div className="flex-shrink-0 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/stock")}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg shadow-sm transition"
                >
                  <BiChevronLeft size={20} />
                  <span className="hidden sm:inline">Back</span>
                </button>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Stock Requests</h1>
                  <p className="text-gray-600 text-sm mt-1">Manage and track all stock requests</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/stock/add-supply")}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md font-medium"
                >
                  Add Supply
                </button>
                <button
                  onClick={() => router.push("/stock/outstanding-history")}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md font-medium"
                >
                  Outstanding History
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex-shrink-0">
              <strong>Error: </strong> {error}
              <button onClick={fetchStockRequests} className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Retry</button>
            </div>
          )}

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 mb-6 flex-shrink-0">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by product, supplier, station, or invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <BiFilter className="text-gray-600" size={20} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="1">Dispatched</option>
                  <option value="2">Processing</option>
                  <option value="3">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <p className="text-gray-600">Showing {currentItems.length} of {filteredRequests.length} requests</p>
            <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">#</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Product</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Supplier</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Invoice Date</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Invoice#</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Station</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Ltr</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Payable</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Status</th>
                    <th className="p-4 text-left font-semibold text-gray-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    [...Array(3)].map((_, index) => <SkeletonRow key={index} />)
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-gray-400 text-6xl mb-4">📦</div>
                          <p className="text-gray-500 text-lg font-medium">No stock requests found</p>
                          <p className="text-gray-400 mt-2">
                            {searchTerm || statusFilter !== "all" ? "Try adjusting your search or filters" : "No stock requests available"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((req) => {
                      const status = statusText(req.status);
                      return (
                        <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-sm font-medium text-gray-900">{req.id}</td>
                          <td className="p-4 text-sm text-gray-700">{req.product_name || "N/A"}</td>
                          <td className="p-4 text-sm">
                            <a href={`/supplier-invoice/${req.supplier_id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                              {req.supplier_name || "No Supplier"}
                            </a>
                          </td>
                          <td className="p-4 text-sm text-gray-700">{new Date(req.invoice_date).toLocaleDateString()}</td>
                          <td className="p-4 text-sm font-mono text-gray-900">{req.invoice_number}</td>
                          <td className="p-4 text-sm text-gray-700">{req.station_name}</td>
                          <td className="p-4 text-sm font-medium text-gray-900">{req.ltr}</td>
                          <td className="p-4 text-sm font-bold text-green-600">₹{req.payable}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => router.push(`/stock/supply-details/${req.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><BiShow size={18} /></button>
                              <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Chat"><BiChat size={18} /></button>
                              <button onClick={() => router.push(`/stock/dncn/${req.id}`)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="DN/CN"><BiRupee size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-4 lg:px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}>
                    <BiChevronLeft size={20} /> Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button key={page} onClick={() => paginate(page)} className={`w-10 h-10 rounded-lg font-medium ${currentPage === page ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{page}</button>
                    ))}
                  </div>
                  <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}>
                    Next <BiChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
