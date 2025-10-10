// src/app/stock/page.jsx
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import { Suspense } from "react";

// ⚡ Make this page dynamic (SSR on every request)
export const dynamic = "force-dynamic";

// ------------------------------
// 🧩 Data Fetching
// ------------------------------
async function getStockData() {
  try {
    const res = await fetch('/api/stock', {
      cache: 'no-store', // always fetch fresh data
    });

    if (!res.ok) {
      throw new Error('Failed to fetch stock data');
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return [];
  }
}

// ------------------------------
// 🧩 Group data by station
// ------------------------------
function groupDataByStation(data) {
  const grouped = {};

  data.forEach((item) => {
    if (!grouped[item.station_name]) {
      grouped[item.station_name] = [];
    }
    grouped[item.station_name].push({
      product_name: item.product_name,
      stock: item.stock,
    });
  });

  return grouped;
}

// ------------------------------
// 🧩 Stock Table (Server Component)
// ------------------------------
async function StockTable() {
  const stockData = await getStockData();
  const groupedData = groupDataByStation(stockData);

  return (
    <div className="overflow-x-auto shadow rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 table-auto">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Station Name
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Product
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Stock
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Object.keys(groupedData).length > 0 ? (
            Object.entries(groupedData).map(([station, products], idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 font-semibold whitespace-nowrap">
                  {station}
                </td>
                <td className="px-4 py-2">
                  {products.map((p, i) => (
                    <div key={i}>{p.product_name}</div>
                  ))}
                </td>
                <td className="px-4 py-2">
                  {products.map((p, i) => (
                    <div
                      key={i}
                      className={`font-semibold text-white rounded px-2 py-1 text-right mb-1 ${
                        Number(p.stock) < 50
                          ? "bg-red-600"
                          : Number(p.stock) < 200
                          ? "bg-yellow-500"
                          : "bg-green-600"
                      }`}
                    >
                      {Number(p.stock).toLocaleString()}
                    </div>
                  ))}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-4 py-2 text-center">
                No stock data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------
// 🧩 Loading Skeleton for Suspense
// ------------------------------
function LoadingSkeleton() {
  return (
    <div className="animate-pulse bg-white p-6 rounded-lg shadow">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      ))}
    </div>
  );
}

// ------------------------------
// 🧩 Main Stock Page
// ------------------------------
export default function StockAlertPage() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        <main className="p-4 md:p-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-2 md:space-y-0">
            <h1 className="text-2xl font-semibold">Stock Alert</h1>
            <div className="flex space-x-2">
              <Link
                href="/stock/stock-request"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Stock Requests
              </Link>
              <Link
                href="/stock/view-all"
                className="px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-500 transition"
              >
                View All
              </Link>
            </div>
          </div>

          {/* Stock Table wrapped with Suspense */}
          <Suspense fallback={<LoadingSkeleton />}>
            <StockTable />
          </Suspense>
        </main>

        <Footer />
      </div>
    </div>
  );
}
