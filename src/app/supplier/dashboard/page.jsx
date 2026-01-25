// src/app/supplier/dashboard/page.jsx
"use client";

import Footer from "@/components/Footer";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import SupplierHeader from "@/components/supplierHeader";
import SupplierSidebar from "@/components/supplierSidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBox, FaFileInvoice, FaMoneyBillWave, FaTruck } from "react-icons/fa";

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
      const res = await fetch(`/api/supplierinvoice?id=${supplierId}`);
      if (!res.ok) return;
      const json = await res.json();
      const invoices = Array.isArray(json.invoices) ? json.invoices : [];

      const totalInvoices = invoices.length;
      const pendingAmount = invoices.reduce((sum, inv) => {
        const payable = parseFloat(inv.payable || 0);
        return sum + (isNaN(payable) ? 0 : payable);
      }, 0);

      const totalStockCalc = (() => {
        const byLtr = invoices.reduce((sum, inv) => {
          const q = parseFloat(inv.quantityInLtr || inv.qty_in_ltr || 0);
          return sum + (isNaN(q) ? 0 : q);
        }, 0);
        if (byLtr > 0) return byLtr;
        const byKg = invoices.reduce((sum, inv) => {
          const q = parseFloat(inv.quantityInKg || inv.qty_in_kg || 0);
          return sum + (isNaN(q) ? 0 : q);
        }, 0);
        if (byKg > 0) return byKg;
        return totalInvoices;
      })();

      const now = new Date();
      const recentOrders = invoices.filter(inv => {
        const d = inv.invoice_date ? new Date(inv.invoice_date) : null;
        if (!d || isNaN(d.getTime())) return false;
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }).length;

      setStats({
        totalInvoices,
        pendingAmount,
        totalStock: totalStockCalc,
        recentOrders
      });
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
      <div className="flex-shrink-0">
        <SupplierSidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <SupplierHeader />
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Welcome, {user.name}</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Supplier Dashboard</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Total Invoices</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
                  </div>
                  <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
                    <FaFileInvoice className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Pending Amount</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">₹{stats.pendingAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-green-100 p-2 sm:p-3 rounded-full">
                    <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Total Stock</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.totalStock}</p>
                  </div>
                  <div className="bg-purple-100 p-2 sm:p-3 rounded-full">
                    <FaBox className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Recent Orders</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.recentOrders}</p>
                  </div>
                  <div className="bg-orange-100 p-2 sm:p-3 rounded-full">
                    <FaTruck className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

          {/* Quick Actions removed */}

            {/* Supplier Info */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Supplier Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
        <div className="flex-shrink-0">
          <Footer />
        </div>
        <PWAInstallBanner />
      </div>
    </div>
  );
}

