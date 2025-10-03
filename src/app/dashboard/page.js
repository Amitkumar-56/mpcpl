
//src/app/dashboard/page.js
"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BiBell,
  BiCalendar,
  BiChart,
  BiCog,
  BiDollar,
  BiGroup,
  BiShoppingBag,
  BiTrendingUp
} from "react-icons/bi";

export default function DashboardPage() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSales: 0,
    revenue: 0,
    growth: 0
  });
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(savedUser));

    // Fetch stats
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));

    // Fetch stock data
    fetch("/api/stocks")
      .then((res) => res.json())
      .then((data) => setStockData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header user={user} />

        {/* Scrollable main panel */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Welcome Section */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Welcome back, {user.name}!
                </h1>
                <p className="text-gray-600 mt-2">
                  Here's what's happening with your business today
                </p>
              </div>
              <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                <div className="hidden lg:flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                  <BiCalendar className="text-purple-600" />
                  <span className="text-gray-700">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </span>
                </div>
                <button className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <BiBell className="text-xl text-gray-600" />
                </button>
                <button className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <BiCog className="text-xl text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Total Customers */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 lg:p-6 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm lg:text-base">Total Vender Yesterday OutStanding</p>
                  <p className="text-2xl lg:text-3xl font-bold mt-2">
                    {stats.totalCustomers.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-400 rounded-xl">
                  <BiGroup className="text-2xl" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <BiTrendingUp className="text-green-300 mr-1" />
                <span className="text-blue-100 text-sm">+12% from last month</span>
              </div>
            </div>

            {/* Total Sales */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 lg:p-6 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm lg:text-base">Total Vender Today OutStanding</p>
                  <p className="text-2xl lg:text-3xl font-bold mt-2">
                    {stats.totalSales.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-400 rounded-xl">
                  <BiShoppingBag className="text-2xl" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <BiTrendingUp className="text-green-300 mr-1" />
                <span className="text-green-100 text-sm">+8% from last month</span>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 lg:p-6 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm lg:text-base">Total Yesterday Client OutStanding</p>
                  <p className="text-2xl lg:text-3xl font-bold mt-2">
                    ${stats.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-400 rounded-xl">
                  <BiDollar className="text-2xl" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <BiTrendingUp className="text-green-300 mr-1" />
                <span className="text-purple-100 text-sm">+15% from last month</span>
              </div>
            </div>

            {/* Growth */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 lg:p-6 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm lg:text-base">Total Today Client Outstanding</p>
                  <p className="text-2xl lg:text-3xl font-bold mt-2">+{stats.growth}%</p>
                </div>
                <div className="p-3 bg-orange-400 rounded-xl">
                  <BiChart className="text-2xl" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <BiTrendingUp className="text-green-300 mr-1" />
                <span className="text-orange-100 text-sm">+5% from last quarter</span>
              </div>
            </div>
          </div>

          {/* Stock Data Table */}
         
        </main>

        {/* Footer */}
        <Footer className="w-full" />
      </div>
    </div>
  );
}
