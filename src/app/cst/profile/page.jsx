"use client";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";

export default function CstProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("customer");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-2">Not authenticated</div>
          <a href="/cst/login" className="bg-blue-600 text-white px-4 py-2 rounded">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <CstHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">My Profile</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <div className="font-medium text-gray-900">{user.name || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <div className="font-medium text-gray-900">{user.email || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <div className="font-medium text-gray-900">{user.phone || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Company ID</label>
                <div className="font-medium text-gray-900">{user.com_id || "-"}</div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
