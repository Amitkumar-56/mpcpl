// src/app/nb-stock/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";


// ✅ Component for displaying the table content
function StocksTable({ permissions = { can_view: true, can_edit: true, can_delete: true } }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

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

  // अगर data है तो table show करें
  if (stocks.length > 0) {
    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Station Name
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Product Name
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Stock
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Logs
                  </th>
                  <th className="p-4 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stocks.map((row) => (
                  <tr
                    key={`${row.station_id}-${row.product_id}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                      {row.station_name}
                    </td>
                    <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                      {row.pname}
                    </td>
                    <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {row.stock} units
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <div className="flex flex-col space-y-1">
                        {row.created_by_name && (
                          <div className="text-xs">
                            <span className="font-medium text-gray-700">Created:</span> {row.created_by_name}
                            {row.created_at && (
                              <span className="text-gray-500 ml-1">
                                ({new Date(row.created_at).toLocaleDateString('en-IN')})
                              </span>
                            )}
                          </div>
                        )}
                        {row.updated_by_name && (
                          <div className="text-xs">
                            <span className="font-medium text-gray-700">Updated:</span> {row.updated_by_name}
                            {row.updated_at && (
                              <span className="text-gray-500 ml-1">
                                ({new Date(row.updated_at).toLocaleDateString('en-IN')})
                              </span>
                            )}
                          </div>
                        )}
                        {!row.created_by_name && !row.updated_by_name && (
                          <span className="text-xs text-gray-400">No logs</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {permissions.can_edit && (
                          <Link
                            href={`/nb-stock/create-nb-expense?edit=true&station_id=${row.station_id}&product_id=${row.product_id}`}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                            title="Edit"
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
                        )}
                        <Link
                          href={`/nb-stock/history?station_id=${row.station_id}&product_id=${row.product_id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                          title="View History"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <div className="min-h-screen flex bg-gray-50 items-center justify-center">
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
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <Header />
          <main className="flex-1 overflow-auto flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to view NB Stock.</p>
              <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <Header />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:px-8 max-w-7xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  Non-Billing Stocks
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                  Manage and track non-billing stock inventory
                </p>
              </div>

              {/* Desktop Button */}
              {permissions.can_edit && (
                <Link
                  href="/nb-stock/create-nb-expense"
                  className="hidden sm:flex bg-purple-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow hover:bg-purple-800 transition-all items-center gap-2 text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden lg:inline">Add NB Stock</span>
                  <span className="lg:hidden">Add</span>
                </Link>
              )}
            </div>

            {/* Mobile Add Button */}
            {permissions.can_edit && (
              <div className="sm:hidden mb-4">
                <Link
                  href="/nb-stock/create-nb-expense"
                  className="w-full flex items-center justify-center gap-2 bg-purple-700 text-white px-4 py-3 rounded-lg shadow hover:bg-purple-800 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add NB Stock</span>
                </Link>
              </div>
            )}

            {/* ✅ Stocks Table */}
            <StocksTable permissions={permissions} />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}