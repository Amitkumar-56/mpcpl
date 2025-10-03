"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BiChart, BiDollar, BiShoppingBag } from "react-icons/bi";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";

export default function RetailerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    outstanding: 0,
    growth: 0,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      router.push("/retailer/login");
      return;
    }
    const retailer = JSON.parse(savedUser);
    setUser(retailer);

    // Simulate stats fetch
    setStats({
      totalOrders: 25,
      revenue: 12000,
      outstanding: 3000,
      growth: 12,
    });

    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/retailer/login");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
          Welcome, {user.name}
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            title: "Total Orders",
            value: stats.totalOrders,
            icon: <BiShoppingBag className="text-3xl" />,
            bg: "from-blue-500 to-blue-600",
            trend: "+5%",
            trendColor: "text-green-200",
          },
          {
            title: "Revenue",
            value: `$${stats.revenue.toLocaleString()}`,
            icon: <BiDollar className="text-3xl" />,
            bg: "from-green-500 to-green-600",
            trend: "+12%",
            trendColor: "text-green-200",
          },
          {
            title: "Outstanding",
            value: `$${stats.outstanding.toLocaleString()}`,
            icon: <BiDollar className="text-3xl" />,
            bg: "from-purple-500 to-purple-600",
            trend: "-3%",
            trendColor: "text-red-200",
          },
          {
            title: "Growth",
            value: `${stats.growth}%`,
            icon: <BiChart className="text-3xl" />,
            bg: "from-orange-500 to-orange-600",
            trend: "+2%",
            trendColor: "text-green-200",
          },
        ].map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.bg} text-white p-5 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300`}
          >
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-semibold">{stat.title}</p>
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                {stat.icon}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{stat.value}</p>
              <span className={`${stat.trendColor} text-sm flex items-center`}>
                {stat.trend.includes("+") ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Retailer Info */}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
        <h2 className="text-xl font-bold mb-4">Your Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Name", value: user.name },
            { label: "Email", value: user.email },
            { label: "Phone", value: user.phone },
            { label: "Address", value: user.address },
            { label: "Bank Details", value: user.bankDetails },
          ].map((info, i) => (
            <div
              key={i}
              className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-gray-500 text-sm">{info.label}</p>
              <p className="text-gray-800 font-medium">{info.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder for Charts / Orders Table */}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
        <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
        <p className="text-gray-500">You can add a chart or table here to show recent order history.</p>
      </div>
    </div>
  );
}
