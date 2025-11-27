// src/app/nb-stock/page.jsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import { Suspense } from "react";


// ✅ Component for displaying the table content
async function StocksTable() {
  const apiResponse = await getNonBillingStocks();
  const stocks = apiResponse.success ? apiResponse.data : [];
  const isEmpty = apiResponse.isEmpty || stocks.length === 0;

  console.log('📋 Stocks data for rendering:', {
    stocksCount: stocks.length,
    isEmpty: isEmpty,
    stocks: stocks
  });

  // अगर data है तो table show करें
  if (stocks.length > 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                  <td className="p-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
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
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
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
                        <span className="hidden sm:inline">History</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <Header />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Non-Billing Stocks
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  Manage and track non-billing stock inventory
                </p>
              </div>

              {/* Floating Action Button (Mobile) */}
              <div className="sm:hidden fixed bottom-6 right-6 z-10">
                <Link
                  href="/nb-stock/create-nb-expense"
                  className="bg-purple-700 text-white p-4 rounded-full shadow-lg hover:bg-purple-800 transition-all flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
              </div>

              {/* Desktop Button */}
              <Link
                href="/nb-stock/create-nb-expense"
                className="hidden sm:flex bg-purple-700 text-white px-6 py-3 rounded-lg shadow hover:bg-purple-800 transition-all items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add NB Stock
              </Link>
            </div>

            {/* Debug Info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Debug:</strong> Check browser console for API response details
              </p>
            </div>

            {/* ✅ Suspense Wrap for Data Loading */}
            <Suspense fallback={<LoadingSkeleton />}>
              <StocksTable />
            </Suspense>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}