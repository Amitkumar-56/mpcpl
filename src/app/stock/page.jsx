"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation"; // Import router
import { useState } from "react";
import { BiChevronDown, BiPackage, BiPlus } from "react-icons/bi";

export default function StockAlertPage() {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter(); // Initialize router

  const stockData = [
    { station_name: "Station A", product: "Product X", stock: 1200 },
    { station_name: "Station B", product: "Product Y", stock: 700 },
    { station_name: "Station C", product: "Product Z", stock: 300 },
    { station_name: "Station D", product: "Product W", stock: 1500 },
    { station_name: "Station E", product: "Product V", stock: 900 },
  ];

  const displayedData = showAll ? stockData : stockData.slice(0, 3);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-20">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col ml-64">
        <div className="fixed top-0 left-64 right-0 z-10 bg-white shadow p-4">
          <Header />
        </div>

        <main className="flex-1 mt-20 p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1"></div>
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                  <BiPackage className="text-purple-600 mr-2" />
                  Stock Alert
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center"
                  >
                    {showAll ? "Collapse" : "View All"}
                    <BiChevronDown className="ml-1" />
                  </button>
                  <button
                    onClick={() => router.push("/stock/stock-request")}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded-lg flex items-center text-sm font-medium"
                  >
                    <BiPlus className="mr-1" />
                    Stock Request
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                      <th className="text-left p-3 font-semibold text-purple-700">
                        Station Name
                      </th>
                      <th className="text-left p-3 font-semibold text-purple-700">
                        Product
                      </th>
                      <th className="text-left p-3 font-semibold text-purple-700">
                        Stock Level
                      </th>
                      <th className="text-left p-3 font-semibold text-purple-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedData.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-purple-50 transition-colors"
                      >
                        <td className="p-3 font-medium text-gray-900">
                          {item.station_name}
                        </td>
                        <td className="p-3 text-gray-700">{item.product}</td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                              <div
                                className={`h-2 rounded-full ${
                                  item.stock > 1000
                                    ? "bg-green-500"
                                    : item.stock > 500
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Math.min((item.stock / 2000) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className={`font-semibold ${
                                item.stock > 1000
                                  ? "text-green-700"
                                  : item.stock > 500
                                  ? "text-yellow-700"
                                  : "text-red-700"
                              }`}
                            >
                              {item.stock.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              item.stock > 1000
                                ? "bg-green-100 text-green-800"
                                : item.stock > 500
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.stock > 1000
                              ? "High"
                              : item.stock > 500
                              ? "Medium"
                              : "Low"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}
