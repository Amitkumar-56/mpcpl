"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BsClockHistory, BsEyeFill } from "react-icons/bs";

// A sub-component for data rendering inside Suspense
function StockTable({ stockRequests }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const getStatusBadge = (status) => {
    const colorMap = {
      1: "bg-blue-100 text-blue-800 border border-blue-200",
      2: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      3: "bg-green-100 text-green-800 border border-green-200",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          colorMap[status] ||
          "bg-gray-100 text-gray-800 border border-gray-200"
        }`}
      >
        {status === 1
          ? "Dispatched"
          : status === 2
          ? "Processing"
          : status === 3
          ? "Completed"
          : "Unknown"}
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
        item.invoice_number?.toLowerCase().includes(filterText.toLowerCase()) ||
        item.transporter_id?.toLowerCase().includes(filterText.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status?.toString() === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === "invoice_date") {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
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
      <div className="bg-white p-4 rounded shadow mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <input
          type="text"
          placeholder="Search..."
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value);
            setCurrentPage(1);
          }}
          className="border px-3 py-2 rounded w-full sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border px-3 py-2 rounded"
        >
          <option value="all">All Statuses</option>
          <option value="1">Dispatched</option>
          <option value="2">Processing</option>
          <option value="3">Completed</option>
        </select>
      </div>

      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "id",
                "product_name",
                "invoice_number",
                "invoice_date",
                "transporter_id",
                "tanker_no",
                "ltr",
                "DNCN",
                "payable",
                "status",
              ].map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  <div className="flex items-center space-x-1">
                    {col.replace("_", " ").toUpperCase()}{" "}
                    <span className="text-xs">{getSortIcon(col)}</span>
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length > 0 ? (
              paginatedData.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{request.id}</td>
                  <td className="px-6 py-4">
                    {request.product_name || `Product ID: ${request.product_id}`}
                  </td>
                  <td className="px-6 py-4">
                    {request.invoice_number || "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    {formatDate(request.invoice_date)}
                  </td>
                  <td className="px-6 py-4">{request.transporter_id || "N/A"}</td>
                  <td className="px-6 py-4">{request.tanker_no || "N/A"}</td>
                  <td className="px-6 py-4">
                    {request.ltr ? `${request.ltr}` : "-"}
                  </td>
                  <td className="px-6 py-4">{request.dncn || "-"}</td>
                  <td className="px-6 py-4 text-green-600">
                    {formatCurrency(request.payable)}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                  <td className="px-6 py-4 flex justify-center space-x-2">
                    <Link
                      href={`/stock/supply-details/${request.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <BsEyeFill size={18} />
                    </Link>
                    <Link
                      href={`/stock/dncn/${request.id}`}
                      className="text-red-600 hover:text-red-800"
                    >
                      <BsClockHistory size={18} />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="11"
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No stock requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 border rounded ${
                currentPage === i + 1 ? "bg-blue-600 text-white" : ""
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

// Parent component with Suspense
export default function StockRequest() {
  const [stockRequests, setStockRequests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStockRequests();
  }, []);

  const fetchStockRequests = async () => {
    try {
      const res = await fetch("/api/stock/stock-request");
      const result = await res.json();
      if (result.success) setStockRequests(result.data);
      else setError("Failed to fetch stock requests");
    } catch (err) {
      console.error(err);
      setError("Error fetching stock requests");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Stock Requests</h1>
            <Link
              href="/stock/add-supply"
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              Add Supply
            </Link>
          </div>

          <main className="max-w-7xl mx-auto px-4 py-8">
            {error && (
              <div className="text-red-600 text-center mb-4">{error}</div>
            )}
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              }
            >
              <StockTable stockRequests={stockRequests} />
            </Suspense>
          </main>
        </div>
        <Footer />
      </div>
    </div>
  );
}
