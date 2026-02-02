// src/app/stock/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BsClockHistory, BsEyeFill, BsPencil, BsPlusCircle, BsTrash, BsBox, BsBoxSeam, BsTruck } from "react-icons/bs";
import { BiPackage, BiHistory, BiTrendingUp } from "react-icons/bi";

// A sub-component for data rendering inside Suspense
function StockTable({ stockRequests, permissions = { can_view: true, can_edit: true, can_delete: true }, onStatusUpdate, onRefresh }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editingStatus, setEditingStatus] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState({});

  const getStatusBadge = (status) => {
    // ✅ FIX: Handle both numeric and string status values
    const statusValue = status?.toString().toLowerCase();

    // Map numeric values
    const numericMap = {
      '1': { text: "Dispatched", color: "bg-blue-100 text-blue-800 border border-blue-200" },
      '2': { text: "Processing", color: "bg-yellow-100 text-yellow-800 border border-yellow-200" },
      '3': { text: "Delivered", color: "bg-green-100 text-green-800 border border-green-200" },
      '4': { text: "Cancelled", color: "bg-red-100 text-red-800 border border-red-200" }
    };

    // Map string values
    const stringMap = {
      'on_the_way': { text: "On The Way", color: "bg-blue-100 text-blue-800 border border-blue-200" },
      'delivered': { text: "Delivered", color: "bg-green-100 text-green-800 border border-green-200" },
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
      // ✅ FIX: Send id in body, not query parameter
      const response = await fetch(`/api/stock/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: stockId, status: newStatus }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update local state
        if (onStatusUpdate) {
          onStatusUpdate(stockId, newStatus);
        }
        // Clear editing state
        setEditingStatus(prev => {
          const updated = { ...prev };
          delete updated[stockId];
          return updated;
        });
        // ✅ Refresh stock data without page reload (prevents logout)
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
    // Normalize status values
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
              <option value="pending">Pending</option>
              <option value="on_the_way">On The Way</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {paginatedData.length} of {filteredAndSortedData.length} records
          </div>
        </div>
      </div>

      {/* Desktop Table Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden hidden md:block">
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
                      {editingStatus[request.id] !== undefined ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingStatus[request.id]}
                            onChange={(e) => handleStatusChange(request.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="text-blue-600 hover:text-blue-800 text-xs"
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
                        {permissions.can_edit && (
                          <Link
                            href={`/stock/edit?id=${request.id}`}
                            className="text-green-600 hover:text-green-800 transition-colors"
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
                      className={`px-3 py-1 border text-sm font-medium rounded-md transition-colors ${currentPage === pageNum
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

      {/* Mobile Cards View */}
      <div className="block md:hidden space-y-4">
        {paginatedData.length > 0 ? (
          paginatedData.map((request) => (
            <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">#{request.id}</h3>
                  <p className="text-sm text-gray-600">{request.product_name || "N/A"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(request.status)}
                  {permissions.can_edit && (
                    <button
                      onClick={() => handleStatusChange(request.id, getStatusValue(request.status))}
                      className="text-blue-600 hover:text-blue-800 text-xs"
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
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <p className="text-gray-500 text-xs">Supplier</p>
                  <p className="font-medium">{request.supplier_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Station</p>
                  <p className="font-medium">{request.station_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Invoice Date</p>
                  <p className="font-medium">{formatDate(request.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Invoice #</p>
                  <p className="font-medium font-mono text-xs">{request.invoice_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Tanker No</p>
                  <p className="font-medium font-mono text-xs">{request.tanker_no || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Quantity</p>
                  <p className="font-medium">{request.ltr ? `${parseFloat(request.ltr).toLocaleString()} L` : "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Invoice Value</p>
                  <p className="font-medium">{request.v_invoice_value || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Payable</p>
                  <p className="font-semibold text-green-600">{formatCurrency(request.payable)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
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
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-500">
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
          <div className="bg-white px-4 py-3 border-t border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

// Parent component with Suspense
export default function StockRequest() {
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
    deliveredStock: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  // Check permissions first - wait for loading to complete
  useEffect(() => {
    // Don't redirect if session is still loading
    if (sessionLoading) {
      return;
    }
    // Only redirect if loading is complete and no user
    if (!sessionLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      setDataLoading(true);
      checkPermissions().finally(() => {
        setDataLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true, can_create: true });

      fetchStockRequests();
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['Stock']) {
      const stockPerms = user.permissions['Stock'];
      if (stockPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: stockPerms.can_view,
          can_edit: stockPerms.can_edit,
          can_delete: stockPerms.can_delete,
          can_create: stockPerms.can_create || false
        });

        fetchStockRequests();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Stock`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);

        fetchStockRequests();
        return;
      }
    }

    try {
      const moduleName = 'Stock';

      // Add timeout to permission checks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

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
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed,
        can_create: createData.allowed || false
      };

      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);

        fetchStockRequests();
      } else {
        setHasPermission(false);
        setError('You do not have permission to view stock.');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      if (error.name === 'AbortError') {
        console.warn('Permission check timeout, using cached permissions if available');
        // Try to use cached permissions on timeout
        const cacheKey = `perms_${user.id}_Stock`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedPerms = JSON.parse(cached);
            if (cachedPerms.can_view) {
              setHasPermission(true);
              setPermissions(cachedPerms);

              fetchStockRequests();
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
      setDataLoading(true);
      setStatsLoading(true);

      console.log("Fetching stock data...");

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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

        // Update stats
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
          deliveredStock: deliveredStock
        });
      } else {
        setError(result.error || "Failed to fetch stock requests");
        setStockRequests([]);
      }
    } catch (err) {
      console.error("Fetch error details:", err);
      if (err.name === 'AbortError') {
        setError("Request timeout. Please check your connection.");
      } else {
        setError("Error fetching stock requests: " + err.message);
      }
      setStockRequests([]);
    } finally {
      setDataLoading(false);
      setStatsLoading(false);
    }
  };

  // Show loading state - only when session is loading OR data is loading with user
  if (sessionLoading || (dataLoading && user)) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Header />
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading stock data...</p>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (user && !hasPermission) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Header />
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600">{error || 'You do not have permission to view stock.'}</p>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Header Section */}
          <div className="bg-white shadow-sm border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => router.back()}
                  className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                  title="Go Back"
                >
                  ←
                </button>
              </div>
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

              {/* Loading State */}
              {dataLoading && stockRequests.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading stock data...</p>
                  </div>
                </div>
              )}

              {/* Quick Stats Section (Hidden for Staff/Incharge) */}
              {!(user?.role === 1 || user?.role === 2) && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Stats</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border rounded-lg p-4 bg-blue-100 text-blue-800 border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Total Stock</p>
                          <p className="text-lg font-bold mt-1">
                            {statsLoading ? '...' : stats.totalStock}
                          </p>
                        </div>
                        <BsBox className="text-2xl opacity-70" />
                      </div>
                    </div>

                    <Link href="/stock-history" className="block">
                      <div className="border rounded-lg p-4 bg-indigo-100 text-indigo-800 border-indigo-200 shadow-sm hover:bg-indigo-200 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Stock History</p>
                            <p className="text-lg font-bold mt-1">
                              {statsLoading ? '...' : stats.totalStockHistory}
                            </p>
                          </div>
                          <BiHistory className="text-2xl opacity-70" />
                        </div>
                      </div>
                    </Link>

                    <div className="border rounded-lg p-4 bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Pending</p>
                          <p className="text-lg font-bold mt-1">
                            {statsLoading ? '...' : stats.pendingStock}
                          </p>
                        </div>
                        <BsClockHistory className="text-2xl opacity-70" />
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-green-100 text-green-800 border-green-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Delivered</p>
                          <p className="text-lg font-bold mt-1">
                            {statsLoading ? '...' : stats.deliveredStock}
                          </p>
                        </div>
                        <BsTruck className="text-2xl opacity-70" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <StockTable
                stockRequests={stockRequests}
                permissions={permissions}
                onStatusUpdate={(stockId, newStatus) => {
                  setStockRequests(prev =>
                    prev.map(item =>
                      item.id === stockId ? { ...item, status: newStatus } : item
                    )
                  );
                }}
                onRefresh={fetchStockRequests}
              />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
