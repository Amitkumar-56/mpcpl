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
    <div className="space-y-4">
      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow animate-pulse">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-64"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
        </div>
      </div>

      {/* Table Skeleton - Desktop */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="block md:hidden space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border p-4 animate-pulse">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            </div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
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

    const numericMap = {
      '1': { text: "Dispatched", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800" },
      '2': { text: "Processing", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800" },
      '3': { text: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800" },
      '4': { text: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800" }
    };

    const stringMap = {
      'on_the_way': { text: "On The Way", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800" },
      'delivered': { text: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800" },
      'dispatched': { text: "Dispatched", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800" },
      'processing': { text: "Processing", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800" },
      'completed': { text: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800" },
      'cancelled': { text: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800" },
      'pending': { text: "Pending", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600" }
    };

    const statusInfo = numericMap[statusValue] || stringMap[statusValue] || {
      text: statusValue || "Pending",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
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
    <>
      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
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
              className="border dark:border-gray-600 px-3 py-2 rounded w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border dark:border-gray-600 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="on_the_way">On The Way</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {paginatedData.length} of {filteredAndSortedData.length} records
          </div>
        </div>
      </div>

      {/* Desktop Table Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
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
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort(col)}
                  >
                    <span className="flex items-center gap-1">
                      {col === "product_name" ? "Product" :
                        col === "supplier_name" ? "Supplier" :
                          col === "invoice_date" ? "Invoice Date" :
                            col === "invoice_number" ? "Invoice#" :
                              col === "station_name" ? "Filling Station" :
                                col === "tanker_no" ? "Tanker No." :
                                  col === "v_invoice_value" ? "Invoice Value" :
                                    col === "ltr" ? "Quantity (Ltr)" :
                                      col.toUpperCase().replace(/_/g, " ")}
                      <span className="text-gray-400">{getSortIcon(col)}</span>
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {request.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {request.product_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {request.supplier_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(request.invoice_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                      {request.invoice_number || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {request.station_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                      {request.tanker_no || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                      {request.ltr ? `${parseFloat(request.ltr).toLocaleString()} L` : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                      {formatCurrency(request.v_invoice_value)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {request.dncn || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400 text-right">
                      {formatCurrency(request.payable)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingStatus[request.id] !== undefined ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingStatus[request.id]}
                            onChange={(e) => handleStatusChange(request.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            disabled={updatingStatus[request.id]}
                          >
                            <option value="pending">Pending</option>
                            <option value="on_the_way">On The Way</option>
                            <option value="delivered">Delivered</option>
                          </select>
                          <button
                            onClick={() => handleStatusUpdate(request.id)}
                            disabled={updatingStatus[request.id]}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Update Status"
                          >
                            {updatingStatus[request.id] ? '...' : 'OK'}
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
                            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                            title="Cancel"
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
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                              title="Edit Status"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <Link
                          href={`/stock/supply-details/${request.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="View Details"
                        >
                          <BsEyeFill size={16} />
                        </Link>
                        <Link
                          href={`/stock/dncn?id=${request.id}`}
                          className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                          title="DN/CN History"
                        >
                          <BsClockHistory size={16} />
                        </Link>
                        {permissions.can_edit && (
                          <Link
                            href={`/stock/edit?id=${request.id}`}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className={`px-3 py-1 border text-sm font-medium rounded-md transition-colors ${currentPage === pageNum
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards View */}
      <div className="block md:hidden space-y-4">
        {paginatedData.length > 0 ? (
          paginatedData.map((request) => (
            <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">#{request.id}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{request.product_name || "N/A"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(request.status)}
                  {permissions.can_edit && (
                    <button
                      onClick={() => handleStatusChange(request.id, getStatusValue(request.status))}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                      title="Edit Status"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>

              {editingStatus[request.id] !== undefined ? (
                <div className="space-y-2 mb-3">
                  <select
                    value={editingStatus[request.id]}
                    onChange={(e) => handleStatusChange(request.id, e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={updatingStatus[request.id]}
                  >
                    <option value="pending">Pending</option>
                    <option value="on_the_way">On The Way</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(request.id)}
                      disabled={updatingStatus[request.id]}
                      className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updatingStatus[request.id] ? '...' : 'Update'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingStatus(prev => {
                          const updated = { ...prev };
                          delete updated[request.id];
                          return updated;
                        });
                      }}
                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Supplier</p>
                  <p className="font-medium dark:text-white">{request.supplier_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Station</p>
                  <p className="font-medium dark:text-white">{request.station_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Invoice Date</p>
                  <p className="font-medium dark:text-white">{formatDate(request.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Invoice #</p>
                  <p className="font-medium font-mono text-xs dark:text-white">{request.invoice_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Tanker No</p>
                  <p className="font-medium font-mono text-xs dark:text-white">{request.tanker_no || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Quantity</p>
                  <p className="font-medium dark:text-white">{request.ltr ? `${parseFloat(request.ltr).toLocaleString()} L` : "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Invoice Value</p>
                  <p className="font-medium dark:text-white">{formatCurrency(request.v_invoice_value)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Payable</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(request.payable)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t dark:border-gray-700">
                <Link
                  href={`/stock/supply-details/${request.id}`}
                  className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  View
                </Link>
                <Link
                  href={`/stock/dncn?id=${request.id}`}
                  className="flex-1 text-center px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                >
                  DN/CN
                </Link>
                {permissions.can_edit && (
                  <Link
                    href={`/stock/edit?id=${request.id}`}
                    className="flex-1 text-center px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <p className="text-base font-medium mb-2">No stock requests found</p>
              <p className="text-sm">
                {filterText || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No stock requests available"
                }
              </p>
            </div>
          </div>
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
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
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <div className="flex-1 flex items-center justify-center">
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
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <div className="flex-1 flex items-center justify-center p-4">
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => router.back()}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xl sm:text-2xl transition-colors"
                  title="Go Back"
                >
                  ←
                </button>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Requests</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
                  {(permissions.can_create === true || permissions.can_create === 1 || Number(user?.role) === 5) && (
                    <>
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
                    </>
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
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Quick Stats</h2>
                  {statsLoading ? (
                    <StatsSkeleton />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Link href="/all-stock" className="block">
                        <div className="border rounded-lg p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800 shadow-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Total Stock</p>
                              <p className="text-lg font-bold mt-1">{stats.totalStock}</p>
                            </div>
                            <BsBox className="text-2xl opacity-70" />
                          </div>
                        </div>
                      </Link>

                      <Link href="/stock-history" className="block">
                        <div className="border rounded-lg p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Stock History</p>
                              <p className="text-lg font-bold mt-1">{stats.totalStockHistory}</p>
                            </div>
                            <BiHistory className="text-2xl opacity-70" />
                          </div>
                        </div>
                      </Link>

                      <Link href="/stock?status=pending" className="block">
                        <div className="border rounded-lg p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800 shadow-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Pending</p>
                              <p className="text-lg font-bold mt-1">{stats.pendingStock}</p>
                            </div>
                            <BsClockHistory className="text-2xl opacity-70" />
                          </div>
                        </div>
                      </Link>

                      <Link href="/stock?status=delivered" className="block">
                        <div className="border rounded-lg p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800 shadow-sm hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Delivered</p>
                              <p className="text-lg font-bold mt-1">{stats.deliveredStock}</p>
                            </div>
                            <BsTruck className="text-2xl opacity-70" />
                          </div>
                        </div>
                      </Link>

                      <Link href="/stock-requests" className="block">
                        <div className="border rounded-lg p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800 shadow-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Stock Requests</p>
                              <p className="text-lg font-bold mt-1">{stats.totalStockRequests}</p>
                            </div>
                            <BiPackage className="text-2xl opacity-70" />
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
  );
}

// Main page component with Suspense
export default function StockRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <div className="flex-1 flex items-center justify-center">
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