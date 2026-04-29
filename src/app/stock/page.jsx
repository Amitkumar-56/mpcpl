// src/app/stock/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BiHistory, BiPackage } from "react-icons/bi";
import { BsBox, BsClockHistory, BsEyeFill, BsPencil, BsPlusCircle, BsTruck } from "react-icons/bs";

// Loading component for Suspense fallback
function StockTableSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Filters Skeleton */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-xl w-full sm:w-64"></div>
          <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-xl w-40"></div>
        </div>
      </div>

      {/* Table Skeleton - Desktop */}
      <div className="hidden md:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 overflow-hidden">
        <div className="p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex space-x-6 items-center">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="block md:hidden space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/30 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-24"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-36"></div>
              </div>
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Skeleton Component
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl p-5 border border-white/20 dark:border-gray-700/30 shadow-sm animate-pulse">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-12"></div>
            </div>
            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Stock Table Component with Suspense boundary
function StockTable({ stockRequests, permissions = { can_view: true, can_edit: true, can_delete: true }, onStatusUpdate, onRefresh, initialStatusFilter = "all" }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editingStatus, setEditingStatus] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState({});

  const getStatusBadge = (status) => {
    const statusValue = status?.toString().toLowerCase();

    const config = {
      '1': { text: "Dispatched", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800" },
      '2': { text: "Processing", className: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-100 dark:border-yellow-800" },
      '3': { text: "Delivered", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800" },
      '4': { text: "Cancelled", className: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-100 dark:border-rose-800" },
      'on_the_way': { text: "On The Way", className: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-100 dark:border-sky-800" },
      'delivered': { text: "Delivered", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800" },
      'dispatched': { text: "Dispatched", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800" },
      'processing': { text: "Processing", className: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-100 dark:border-yellow-800" },
      'completed': { text: "Completed", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800" },
      'cancelled': { text: "Cancelled", className: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-100 dark:border-rose-800" },
      'pending': { text: "Pending", className: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" }
    };

    const info = config[statusValue] || config['pending'];

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${info.className} transition-all duration-300`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${info.className.split(' ')[1].replace('text-', 'bg-')}`}></span>
        {info.text}
      </span>
    );
  };

  const handleStatusChange = (stockId, newStatus) => {
    setEditingStatus(prev => ({
      ...prev,
      [stockId]: newStatus
    }));
  };

  const handleStatusUpdate = async (stockId) => {
    const newStatus = editingStatus[stockId];
    if (!newStatus) return;

    setUpdatingStatus(prev => ({ ...prev, [stockId]: true }));

    try {
      const response = await fetch(`/api/stock/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: stockId, status: newStatus }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (onStatusUpdate) {
          onStatusUpdate(stockId, newStatus);
        }
        setEditingStatus(prev => {
          const updated = { ...prev };
          delete updated[stockId];
          return updated;
        });
        if (onRefresh) {
          onRefresh();
        }
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    } finally {
      setUpdatingStatus(prev => {
        const updated = { ...prev };
        delete updated[stockId];
        return updated;
      });
    }
  };

  const getStatusValue = (status) => {
    const statusValue = status?.toString().toLowerCase();
    if (statusValue === 'pending' || statusValue === '0' || !statusValue) return 'pending';
    if (statusValue === 'on_the_way' || statusValue === '1') return 'on_the_way';
    if (statusValue === 'delivered' || statusValue === '3') return 'delivered';
    return statusValue || 'pending';
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
        statusFilter === "all" ||
        getStatusValue(item.status) === statusFilter ||
        item.status?.toString() === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === "invoice_date" || sortConfig.key === "created_at") {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }

        if (sortConfig.key === "ltr" || sortConfig.key === "payable" || sortConfig.key === "v_invoice_value") {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        }

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
    <div className="w-full">
      {/* Filters Section */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 mb-8">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search products, suppliers..."
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 pl-4 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all shadow-sm cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="on_the_way">On The Way</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
            Showing {paginatedData.length} of {filteredAndSortedData.length} records
          </div>
        </div>
      </div>

      {/* Desktop Table Section */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md shadow-xl rounded-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden hidden md:block transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
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
                    className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center gap-2">
                      {col === "product_name" ? "Product" :
                        col === "supplier_name" ? "Supplier" :
                          col === "invoice_date" ? "Date" :
                            col === "invoice_number" ? "Inv #" :
                              col === "station_name" ? "Station" :
                                col === "tanker_no" ? "Tanker" :
                                  col === "v_invoice_value" ? "Value" :
                                    col === "ltr" ? "Qty (L)" :
                                      col.toUpperCase().replace(/_/g, " ")}
                      <span className="text-[10px] opacity-50">{getSortIcon(col)}</span>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {paginatedData.length > 0 ? (
                paginatedData.map((request) => (
                  <tr key={request.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group text-gray-700 dark:text-gray-300">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      #{request.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {request.product_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden">
                          {request.supplier_name?.charAt(0) || "?"}
                        </div>
                        {request.supplier_name || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm opacity-80">
                      {formatDate(request.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono opacity-80">
                      {request.invoice_number || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm opacity-80">
                      {request.station_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono opacity-80">
                      {request.tanker_no || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {request.ltr ? `${parseFloat(request.ltr).toLocaleString()}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatCurrency(request.v_invoice_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm opacity-80">
                      {request.dncn || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      {formatCurrency(request.payable)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingStatus[request.id] !== undefined ? (
                        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700 shadow-sm">
                          <select
                            value={editingStatus[request.id]}
                            onChange={(e) => handleStatusChange(request.id, e.target.value)}
                            className="text-xs bg-transparent focus:outline-none dark:text-white px-1"
                            disabled={updatingStatus[request.id]}
                          >
                            <option value="pending">Pending</option>
                            <option value="on_the_way">On Way</option>
                            <option value="delivered">Delivered</option>
                          </select>
                          <button
                            onClick={() => handleStatusUpdate(request.id)}
                            disabled={updatingStatus[request.id]}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors disabled:opacity-50"
                          >
                            {updatingStatus[request.id] ? '...' : '✓'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingStatus(prev => {
                                const updated = { ...prev };
                                delete updated[request.id];
                                return updated;
                              });
                            }}
                            disabled={updatingStatus[request.id]}
                            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                          {permissions.can_edit && (
                            <button
                              onClick={() => handleStatusChange(request.id, getStatusValue(request.status))}
                              className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                              title="Edit Status"
                            >
                              <BsPencil size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center items-center gap-2">
                        <Link
                          href={`/stock/supply-details/${request.id}`}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-all duration-300 shadow-sm"
                          title="View Details"
                        >
                          <BsEyeFill size={16} />
                        </Link>
                        <Link
                          href={`/stock/dncn?id=${request.id}`}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-500 transition-all duration-300 shadow-sm"
                          title="DN/CN History"
                        >
                          <BsClockHistory size={16} />
                        </Link>
                        {permissions.can_edit && (
                          <Link
                            href={`/stock/edit?id=${request.id}`}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 transition-all duration-300 shadow-sm"
                            title="Edit"
                          >
                            <BsPencil size={16} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-lg font-medium mb-2">
                        No stock requests found
                      </div>
                      <div className="text-sm">
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

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-5 bg-white/40 dark:bg-gray-800/20 border-t border-white/20 dark:border-gray-700/30 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
              Showing <span className="text-gray-900 dark:text-white font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900 dark:text-white font-bold">{Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)}</span> of <span className="text-gray-900 dark:text-white font-bold">{filteredAndSortedData.length}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                ←
              </button>
              
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-sm font-bold transition-all shadow-sm ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white shadow-blue-500/20"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards View */}
      <div className="block md:hidden space-y-4">
        {paginatedData.length > 0 ? (
          paginatedData.map((request) => (
            <div key={request.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30 p-5 shadow-lg group transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20">
                    #{request.id}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{request.product_name || "N/A"}</h3>
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(request.invoice_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(request.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5 p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/30">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supplier</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{request.supplier_name || "N/A"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Station</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{request.station_name || "N/A"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice #</p>
                  <p className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-400">{request.invoice_number || "N/A"}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payable</p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(request.payable)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/stock/supply-details/${request.id}`}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  <BsEyeFill size={14} />
                  View
                </Link>
                <Link
                  href={`/stock/dncn?id=${request.id}`}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  <BsClockHistory size={14} />
                  DN/CN
                </Link>
                {permissions.can_edit && (
                  <Link
                    href={`/stock/edit?id=${request.id}`}
                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <BsPencil size={14} />
                    Edit
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/30 p-10 text-center shadow-lg">
            <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
               <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-2xl">📦</div>
               <p className="text-sm font-bold mb-1">No Stock Requests</p>
               <p className="text-xs opacity-70">
                {filterText || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No stock records available yet"
                }
               </p>
            </div>
          </div>
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-lg">
             <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl disabled:opacity-30"
              >
                ←
              </button>
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl disabled:opacity-30"
              >
                →
              </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component that handles data fetching
function StockRequestContent() {
  const [stockRequests, setStockRequests] = useState([]);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false,
    can_create: false
  });
  const [stats, setStats] = useState({
    totalStock: 0,
    totalStockHistory: 0,
    pendingStock: 0,
    deliveredStock: 0,
    totalStockRequests: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [initialStatusFilter, setInitialStatusFilter] = useState("all");
  const searchParams = useSearchParams();
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  // Read URL parameters for status filter
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setInitialStatusFilter(status);
    }
  }, [searchParams]);

  // Check permissions and fetch data
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    setDataLoading(true);
    checkPermissions().finally(() => {
      setDataLoading(false);
    });
  }, [user, sessionLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true, can_create: true });
      await fetchStockRequests();
      return;
    }

    // Check cached permissions
    const cacheKey = `perms_${user.id}_Stock`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedPerms = JSON.parse(cached);
        if (cachedPerms.can_view) {
          setHasPermission(true);
          setPermissions(cachedPerms);
          await fetchStockRequests();
          return;
        }
      } catch (e) {
        // Invalid cache, continue with API call
      }
    }

    try {
      const moduleName = 'Stock';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const [viewRes, editRes, deleteRes, createRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`, {
          signal: controller.signal
        }),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`, {
          signal: controller.signal
        }),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`, {
          signal: controller.signal
        }),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`, {
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      const [viewData, editData, deleteData, createData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        deleteRes.json(),
        createRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed || false,
        can_edit: editData.allowed || false,
        can_delete: deleteData.allowed || false,
        can_create: createData.allowed || false
      };

      sessionStorage.setItem(cacheKey, JSON.stringify(perms));

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        await fetchStockRequests();
      } else {
        setHasPermission(false);
        setError('You do not have permission to view stock.');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      if (error.name === 'AbortError') {
        // Try to use cached permissions on timeout
        const cacheKey = `perms_${user.id}_Stock`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedPerms = JSON.parse(cached);
            if (cachedPerms.can_view) {
              setHasPermission(true);
              setPermissions(cachedPerms);
              await fetchStockRequests();
              return;
            }
          } catch (e) {
            // Invalid cache
          }
        }
      }
      setHasPermission(false);
      setError('Failed to check permissions.');
    }
  };

  const fetchStockRequests = async () => {
    try {
      setError(null);
      setStatsLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/stock", {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();

      if (result.success) {
        const stockData = result.data || [];
        setStockRequests(stockData);

        const totalStock = stockData.length;
        const pendingStock = stockData.filter(s =>
          s.status === 'pending' || s.status === '1' ||
          s.status === 'on_the_way' || s.status === '2'
        ).length;
        const deliveredStock = stockData.filter(s =>
          s.status === 'delivered' || s.status === '3'
        ).length;

        setStats({
          totalStock: totalStock,
          totalStockHistory: result.total_stock_history || 0,
          pendingStock: pendingStock,
          deliveredStock: deliveredStock,
          totalStockRequests: result.total_stock_requests || totalStock
        });
      } else {
        setError(result.error || "Failed to fetch stock requests");
        setStockRequests([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.name === 'AbortError') {
        setError("Request timeout. Please check your connection.");
      } else {
        setError("Error fetching stock requests: " + err.message);
      }
      setStockRequests([]);
    } finally {
      setStatsLoading(false);
    }
  };

  // Show loading state
  if (sessionLoading) {
    return (
      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied
  if (user && !hasPermission) {
    return (
      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center max-w-md">
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-2">Access Denied</h2>
              <p className="text-red-600 dark:text-red-300">{error || 'You do not have permission to view stock.'}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen bg-gray-100 dark:bg-gray-900 lg:overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 min-w-0 lg:overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-gray-950 relative scroll-smooth">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
          <div className="absolute top-20 right-[-10%] w-[40%] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="relative z-10">
          {/* Header Section */}
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 sticky top-0 lg:sticky z-20">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-8 lg:px-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => router.back()}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xl shadow-gray-200/20 dark:shadow-none hover:scale-105 transition-all text-xl"
                    title="Go Back"
                  >
                    ←
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                      Stock Management
                    </h1>
                    <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                       Track and organize your inventory efficiently
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <Link
                    href="/stock/activity-logs"
                    className="flex-1 sm:flex-none h-11 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl flex items-center justify-center gap-2 border border-white/20 dark:border-gray-700/30 shadow-sm hover:-translate-y-0.5 transition-all text-xs font-bold"
                  >
                    <BsClockHistory size={16} className="text-blue-600" />
                    History
                  </Link>
                  {(permissions.can_create === true || permissions.can_create === 1 || Number(user?.role) === 5) && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Link
                        href="/stock/purchase-for-use-history"
                        className="flex-1 sm:flex-none h-11 px-4 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all text-xs font-bold"
                      >
                        <BsPlusCircle size={16} />
                        Purchase
                      </Link>
                      <Link
                        href="/stock/purchase"
                        className="flex-1 sm:flex-none h-11 px-4 bg-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all text-xs font-bold"
                      >
                        <BsPlusCircle size={16} />
                        Stock
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-red-600 dark:text-red-400 text-sm font-medium">
                      {error}
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

              {/* Quick Stats Section (Hidden for Staff/Incharge) */}
              {!(user?.role === 1 || user?.role === 2) && (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                       Overview Stats
                    </h2>
                  </div>
                  {statsLoading ? (
                    <StatsSkeleton />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                      <Link href="/all-stock" className="block group">
                        <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-xl shadow-blue-500/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10">
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                          <div className="flex items-start justify-between relative z-10">
                            <div>
                              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Total Stock</p>
                              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.totalStock}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 transform group-hover:rotate-6 transition-all duration-500">
                              <BsBox size={20} />
                            </div>
                          </div>
                        </div>
                      </Link>

                      <Link href="/stock-history" className="block group">
                        <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-xl shadow-indigo-500/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10">
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                          <div className="flex items-start justify-between relative z-10">
                            <div>
                              <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">History</p>
                              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.totalStockHistory}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transform group-hover:rotate-6 transition-all duration-500">
                              <BiHistory size={20} />
                            </div>
                          </div>
                        </div>
                      </Link>

                      <Link href="/stock?status=pending" className="block group">
                        <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-xl shadow-amber-500/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10">
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
                          <div className="flex items-start justify-between relative z-10">
                            <div>
                              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Pending</p>
                              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.pendingStock}</p>
                            </div>
                            <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 transform group-hover:rotate-6 transition-all duration-500">
                              <BsClockHistory size={20} />
                            </div>
                          </div>
                        </div>
                      </Link>

                      <Link href="/stock?status=delivered" className="block group">
                        <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-xl shadow-emerald-500/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10">
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                          <div className="flex items-start justify-between relative z-10">
                            <div>
                              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Delivered</p>
                              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.deliveredStock}</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform group-hover:rotate-6 transition-all duration-500">
                              <BsTruck size={20} />
                            </div>
                          </div>
                        </div>
                      </Link>

                      <Link href="/stock-requests" className="block group">
                        <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-5 rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-xl shadow-purple-500/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10">
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                          <div className="flex items-start justify-between relative z-10">
                            <div>
                              <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Requests</p>
                              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.totalStockRequests}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 transform group-hover:rotate-6 transition-all duration-500">
                              <BiPackage size={20} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Stock Table with Suspense boundary */}
              <Suspense fallback={<StockTableSkeleton />}>
                {dataLoading ? (
                  <StockTableSkeleton />
                ) : (
                  <StockTable
                    stockRequests={stockRequests}
                    permissions={permissions}
                    initialStatusFilter={initialStatusFilter}
                    onStatusUpdate={(stockId, newStatus) => {
                      setStockRequests(prev =>
                        prev.map(item =>
                          item.id === stockId ? { ...item, status: newStatus } : item
                        )
                      );
                    }}
                    onRefresh={fetchStockRequests}
                  />
                )}
              </Suspense>
            </div>
          </main>
          <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function StockRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading page...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <StockRequestContent />
    </Suspense>
  );
}