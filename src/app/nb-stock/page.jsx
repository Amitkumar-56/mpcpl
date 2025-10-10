// src/app/nb-stock/page.jsx

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import { Suspense } from "react";

async function getNonBillingStocks() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/nb-stock`, {
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Failed to fetch data");

    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return [];
  }
}

// ✅ Component for displaying the table content
async function StocksTable() {
  const stocks = await getNonBillingStocks();

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
            {stocks.length > 0 ? (
              stocks.map((row) => (
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
                      {row.stock}
                    </span>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <Link
                      href={`/nb-stock-history?station_id=${row.station_id}`}
                      className="inline-flex items-center justify-center w-10 h-10 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
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
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <svg
                      className="w-12 h-12 mb-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4"
                      />
                    </svg>
                    <p className="text-lg font-medium mb-1">No records found</p>
                    <p className="text-sm">No non-billing stock data available</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ✅ Loading Skeleton for Suspense
function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 bg-gray-200 rounded w-full"></div>
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
                  <span className="sr-only">Add NB Stock Expense</span>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </Link>
              </div>

              {/* Desktop Button */}
              <Link
                href="/nb-stock/create-nb-expense"
                className="hidden sm:flex bg-purple-700 text-white px-6 py-3 rounded-lg shadow hover:bg-purple-800 transition-all items-center gap-2"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                NB Stock Expense
              </Link>
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
