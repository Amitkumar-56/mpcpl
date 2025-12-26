// src/app/supplier/dashboard/page.jsx
"use client";

import SupplierHeader from "@/components/supplierHeader";
import SupplierSidebar from "@/components/supplierSidebar";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBox, FaFileInvoice, FaHistory, FaMoneyBillWave, FaTruck } from "react-icons/fa";

export default function SupplierDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    pendingAmount: 0,
    totalStock: 0,
    recentOrders: 0,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("supplier");
    if (!savedUser) {
      router.push("/supplier/login");
      return;
    }
    
    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);
    setLoading(false);
    fetchStats(parsedUser.id);
  }, [router]);

  const fetchStats = async (supplierId) => {
    try {
      // Fetch supplier statistics
      // You can add API endpoints for these later
      const response = await fetch(`/api/suppliers/stats?id=${supplierId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block">
        <SupplierSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <SupplierHeader />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}</h1>
              <p className="text-gray-600 mt-1">Supplier Dashboard</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FaFileInvoice className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Amount</p>
                    <p className="text-2xl font-bold text-green-600">₹{stats.pendingAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <FaMoneyBillWave className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Stock</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalStock}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <FaBox className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Recent Orders</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.recentOrders}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full">
                    <FaTruck className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/supplier/invoices')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <FaFileInvoice className="w-6 h-6 text-green-600 mb-2" />
                  <p className="font-semibold">View Invoices</p>
                  <p className="text-sm text-gray-600">Check all your invoices</p>
                </button>

                <button
                  onClick={() => router.push('/supplier/stock')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <FaBox className="w-6 h-6 text-green-600 mb-2" />
                  <p className="font-semibold">Stock Management</p>
                  <p className="text-sm text-gray-600">Manage your stock</p>
                </button>

                <button
                  onClick={() => router.push('/supplier/history')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <FaHistory className="w-6 h-6 text-green-600 mb-2" />
                  <p className="font-semibold">History</p>
                  <p className="text-sm text-gray-600">View transaction history</p>
                </button>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Supplier Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{user.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">GSTIN</p>
                  <p className="font-semibold">{user.gstin || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">PAN</p>
                  <p className="font-semibold">{user.pan || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-semibold">{user.supplier_type || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

