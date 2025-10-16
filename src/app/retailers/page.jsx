"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
    BiEdit,
    BiHistory,
    BiSearch,
    BiShow,
    BiTrash
} from "react-icons/bi";

export default function RetailersPage() {
  const [retailers, setRetailers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/retailers");
        const data = await res.json();
        setRetailers(data);
      } catch (err) {
        console.error("Error fetching retailers:", err);
      }
    }
    fetchData();
  }, []);

  const filteredRetailers = retailers.filter((r) =>
    `${r.name} ${r.email} ${r.phone} ${r.address} ${r.region}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentRetailers = filteredRetailers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredRetailers.length / itemsPerPage);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this retailer?")) return;
    try {
      const res = await fetch("/api/retailers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.text();
      if (data === "success") {
        setRetailers(retailers.filter((r) => r.id !== id));
        alert("Retailer deleted successfully");
      } else {
        alert("Error deleting retailer");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  // Action buttons - Only few for Retailers
  const actionButtons = [
    {
      key: "view",
      icon: BiShow,
      label: "View Details",
      href: (id) => `/retailers/details/${id}`,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      key: "edit",
      icon: BiEdit,
      label: "Edit Retailer",
      href: (id) => `/retailers/edit/${id}`,
      color: "bg-yellow-500 hover:bg-yellow-600",
    },
    {
      key: "history",
      icon: BiHistory,
      label: "History",
      href: (id) => `/retailers/history/${id}`,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      key: "delete",
      icon: BiTrash,
      label: "Delete Retailer",
      onClick: (id) => handleDelete(id),
      color: "bg-red-500 hover:bg-red-600",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-cyan-50">
      {/* Sidebar */}
      <div
        className={`fixed lg:static z-40 h-full transition-transform duration-300 ease-in-out ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar activePage="Retailers" onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Title */}
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Retailers
                </h1>
                <p className="text-blue-500 font-medium text-sm lg:text-base">
                  Manage retailer accounts and history
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BiSearch className="text-blue-500 text-lg" />
                </div>
                <input
                  type="text"
                  placeholder="Search retailers..."
                  className="w-full lg:w-64 border-2 border-blue-100 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all duration-300 bg-white/50 text-sm lg:text-base"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Retailers Table */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 p-1"></div>
              <div className="p-4 lg:p-6 overflow-auto max-h-[70vh]">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-50 to-blue-50">
                      <th className="text-left p-4 font-bold text-blue-700">ID</th>
                      <th className="text-left p-4 font-bold text-blue-700">Retailer</th>
                      <th className="text-left p-4 font-bold text-blue-700">Contact</th>
                      <th className="text-left p-4 font-bold text-blue-700">Region</th>
                      <th className="text-left p-4 font-bold text-blue-700">Financials</th>
                      <th className="text-left p-4 font-bold text-blue-700 w-64">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRetailers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-8 text-center text-gray-700 font-semibold"
                        >
                          No retailers found
                        </td>
                      </tr>
                    ) : (
                      currentRetailers.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-blue-100 hover:bg-blue-50 transition-colors"
                        >
                          <td className="p-4 font-mono text-blue-600 font-bold">
                            #{r.id}
                          </td>
                          <td className="p-4 font-bold">{r.name}</td>
                          <td className="p-4">
                            <div>{r.email}</div>
                            <div className="text-sm text-gray-600">{r.phone}</div>
                          </td>
                          <td className="p-4">{r.region}</td>
                          <td className="p-4">
                            <div className="text-sm">
                              Limit: <strong>{r.cst_limit}</strong>
                            </div>
                            <div className="text-sm">
                              Balance: <strong>{r.balance}</strong>
                            </div>
                            <div className="text-sm">
                              Remaining: <strong>{r.amtlimit}</strong>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {actionButtons.map((action) =>
                                action.key === "delete" ? (
                                  <button
                                    key={action.key}
                                    onClick={() => action.onClick(r.id)}
                                    className={`p-2 ${action.color} text-white rounded-lg`}
                                    title={action.label}
                                  >
                                    <action.icon className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <Link
                                    key={action.key}
                                    href={action.href(r.id)}
                                    className={`p-2 ${action.color} text-white rounded-lg`}
                                    title={action.label}
                                  >
                                    <action.icon className="w-4 h-4" />
                                  </Link>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {currentRetailers.length > 0 && (
                  <div className="border-t border-blue-200 pt-4 mt-4">
                    <div className="flex justify-between">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 text-sm"
                      >
                        Previous
                      </button>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 text-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
