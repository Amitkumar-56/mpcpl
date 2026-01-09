// src/app/nb-stock/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState, useMemo } from "react";
import React from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";


// ✅ Component for displaying the table content
function StocksTable({ permissions = { can_view: true, can_edit: true, can_delete: true } }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedStocks, setExpandedStocks] = useState({});
  
  const toggleStockLogs = (stationId, productId) => {
    const key = `${stationId}-${productId}`;
    setExpandedStocks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/nb-stock');
        const apiResponse = await response.json();
        
        const stocksData = apiResponse.success ? apiResponse.data : [];
        setStocks(stocksData);
        setIsEmpty(apiResponse.isEmpty || stocksData.length === 0);

        console.log('📋 Stocks data for rendering:', {
          stocksCount: stocksData.length,
          isEmpty: apiResponse.isEmpty || stocksData.length === 0,
          stocks: stocksData
        });
      } catch (error) {
        console.error('Error fetching stocks:', error);
        setStocks([]);
        setIsEmpty(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  // Filter stocks based on search term
  const filteredStocks = useMemo(() => {
    if (!searchTerm.trim()) return stocks;
    const search = searchTerm.toLowerCase();
    return stocks.filter((stock) => 
      stock.station_name?.toLowerCase().includes(search) ||
      stock.pname?.toLowerCase().includes(search) ||
      stock.stock?.toString().includes(search)
    );
  }, [stocks, searchTerm]);

  // Paginate stocks
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStocks.slice(start, start + itemsPerPage);
  }, [filteredStocks, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Show loading skeleton while fetching data
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // अगर data है तो table show करें
  if (stocks.length > 0) {
    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Controls: Pagination and Search */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Show</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <label className="text-sm text-gray-700">entries</label>
            </div>
            <div className="w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                    Station Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                    Product Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                    Non-Billing Customers
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">
                    Action
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">
                    Logs
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedStocks.map((row) => (
                  <React.Fragment key={`${row.station_id}-${row.product_id}`}>
                  <tr
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
                      {row.station_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
                      {row.pname}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
                      <span className="font-semibold">{parseFloat(row.stock || 0).toFixed(2)} Ltr</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
                      <Link
                        href={`/nb-stock/history?station_id=${row.station_id}&product_id=${row.product_id}`}
                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                        title="View Non-Billing Customers"
                      >
                        View Customers ({row.customer_count || 0})
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center border-b border-gray-200">
                      <Link
                        href={`/nb-stock/history?station_id=${row.station_id}&product_id=${row.product_id}`}
                        className="inline-flex items-center justify-center text-orange-600 hover:text-orange-700 mr-2"
                        title="View History"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </Link>
                      <button
                        onClick={() => toggleStockLogs(row.station_id, row.product_id)}
                        className="ml-2 inline-flex items-center justify-center text-blue-600 hover:text-blue-800 transition-colors"
                        title="View Activity Logs"
                      >
                        {expandedStocks[`${row.station_id}-${row.product_id}`] ? (
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
                  {expandedStocks[`${row.station_id}-${row.product_id}`] && (
                    <tr className="bg-gray-50">
                      <td colSpan="6" className="px-4 py-4">
                        <div className="max-w-4xl">
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Logs for {row.station_name} - {row.pname}</h3>
                          <div className="text-sm text-gray-600 p-4 bg-white rounded border">
                            <p>Stock activity logs for this station-product combination are available in the history section.</p>
                            <Link
                              href={`/nb-stock/history?station_id=${row.station_id}&product_id=${row.product_id}`}
                              className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                            >
                              View Complete History →
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStocks.length)} of {filteredStocks.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
          {/* Print Screen and Nb-Stock-Expense Buttons */}
          <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Print Screen
            </button>
            <Link
              href="/nb-stock/create-nb-expense"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Nb-Stock-Expense
            </Link>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {stocks.map((row) => (
            <div
              key={`${row.station_id}-${row.product_id}-mobile`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Station</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {row.station_name}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {row.stock} units
                  </span>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-500">Product</p>
                  <p className="text-sm text-gray-900 mt-1">{row.pname}</p>
                </div>

                {/* Logs Section */}
                {(row.created_by_name || row.updated_by_name) && (
                  <div className="col-span-2 pt-2 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-1">Activity Logs</p>
                    <div className="space-y-1">
                      {row.created_by_name && (
                        <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
                          <p className="text-xs text-blue-700">
                            <span className="font-medium">Created:</span> {row.created_by_name}
                            {row.created_at && (
                              <span className="text-blue-600 ml-1">
                                ({new Date(row.created_at).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })})
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {row.updated_by_name && (
                        <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
                          <p className="text-xs text-green-700">
                            <span className="font-medium">Updated:</span> {row.updated_by_name}
                            {row.updated_at && (
                              <span className="text-green-600 ml-1">
                                ({new Date(row.updated_at).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })})
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Link
                    href={`/nb-stock/create-nb-expense?edit=true&station_id=${row.station_id}&product_id=${row.product_id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span>Edit</span>
                  </Link>
                  <Link
                    href={`/nb-stock/history?station_id=${row.station_id}&product_id=${row.product_id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>History</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // अगर कोई data नहीं है तो empty state show करें
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-8 text-center">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <svg
            className="w-20 h-20 mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-xl font-semibold mb-2">No Stock Records Found</p>
          <p className="text-sm mb-6 max-w-md text-center">
            No stock data available to display.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/nb-stock/create-nb-expense"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add First Stock Entry
            </Link>
            <Link
              href="/nb-stock"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Refresh Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between animate-pulse">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NonBillingStocksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false
  });

  // Check authentication and permissions
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      checkPermissions();
    }
  }, [user, authLoading, router]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true });
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['NB Stock']) {
      const nbStockPerms = user.permissions['NB Stock'];
      if (nbStockPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: nbStockPerms.can_view,
          can_edit: nbStockPerms.can_edit,
          can_delete: nbStockPerms.can_delete
        });
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_NB Stock`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        return;
      }
    }

    try {
      const moduleName = 'NB Stock';
      const [viewRes, editRes, deleteRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`)
      ]);

      const [viewData, editData, deleteData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        deleteRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed
      };

      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
      } else {
        setHasPermission(false);
        setPermissions(perms);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (!user) {
    return null;
  }

  // Check if user has view permission
  if (!hasPermission) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to view NB Stock.</p>
              <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:px-8 max-w-7xl">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
            </div>
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Non-Billing Stocks
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                Manage and track non-billing stock inventory
              </p>
            </div>

            {/* ✅ Stocks Table */}
            <StocksTable permissions={permissions} />
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}