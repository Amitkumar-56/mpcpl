// src/app/cst/cstdashboard/page.jsx
"use client";

import Footer from "@/components/Footer";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("customer");
    if (!savedUser) {
      router.push("/cst/login");
      return;
    }
    
    const parsedUser = JSON.parse(savedUser);
    if (Number(parsedUser.roleid) !== 1) {
      router.push("/cst/login");
      return;
    }
    
    setUser(parsedUser);
    fetchPermissions(parsedUser.id);
  }, [router]);

  const fetchPermissions = async (customerId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cst/customer-permission?customer_id=${customerId}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        setPermissions(data.permissions || {});
        // Update user with permissions in localStorage
        const savedUser = localStorage.getItem("customer");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          userData.permissions = data.permissions || {};
          localStorage.setItem("customer", JSON.stringify(userData));
        }
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <CstHeader />

        <main className="flex-1 p-6 overflow-auto">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">{activePage}</h2>

          {activePage === "Dashboard" && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">Welcome back, {user.name}! 👋</h3>
                <p className="text-blue-100">Here's what's happening with your account today.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Station</h3>
                  <p className="text-2xl font-bold text-blue-600">{user.station || "Not assigned"}</p>
                </div>
                
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Client</h3>
                  <p className="text-2xl font-bold text-green-600">{user.client || "Not assigned"}</p>
                </div>
                
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Permissions</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {Object.keys(permissions).length} modules
                  </p>
                </div>
              </div>

              {/* Permissions Overview */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Module Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.keys(permissions).length > 0 ? (
                    Object.entries(permissions).map(([module, perms]) => (
                      <div key={module} className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 capitalize mb-2">
                          {module.replace('_', ' ')}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>View:</span>
                            <span className={perms.can_view ? "text-green-600" : "text-red-600"}>
                              {perms.can_view ? "✓ Allowed" : "✗ Denied"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Edit:</span>
                            <span className={perms.can_edit ? "text-green-600" : "text-red-600"}>
                              {perms.can_edit ? "✓ Allowed" : "✗ Denied"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delete:</span>
                            <span className={perms.can_delete ? "text-green-600" : "text-red-600"}>
                              {perms.can_delete ? "✓ Allowed" : "✗ Denied"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 col-span-full text-center py-4">
                      No permissions assigned yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}