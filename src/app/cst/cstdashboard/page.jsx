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
  const [customerBalance, setCustomerBalance] = useState(null);
  const [showExpiryAlert, setShowExpiryAlert] = useState(false);
  const [expiryMessage, setExpiryMessage] = useState("");

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
    fetchCustomerBalance(parsedUser.id);
    fetchPermissions(parsedUser.id);
  }, [router]);

  const fetchCustomerBalance = async (customerId) => {
    try {
      const res = await fetch(`/api/cst/customer-balance?customer_id=${customerId}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        setCustomerBalance(data.balanceData || {});
        checkExpiryDate(data.balanceData);
      }
    } catch (err) {
      console.error("Error fetching customer balance:", err);
      setCustomerBalance({});
    }
  };

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

  const checkExpiryDate = (balanceData) => {
    if (!balanceData || !balanceData.limit_expiry) return;

    const today = new Date();
    const expiryDate = new Date(balanceData.limit_expiry);

    const timeDiff = expiryDate.getTime() - today.getTime();
    const remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Check if expired or about to expire
    if (remainingDays < 0) {
      setExpiryMessage("Your plan has expired! Please recharge immediately to continue services.");
      setShowExpiryAlert(true);
    } else if (remainingDays <= 3) {
      setExpiryMessage(`Your plan will expire in ${remainingDays} day(s). Please recharge soon.`);
      setShowExpiryAlert(true);
    } else if (remainingDays <= 7) {
      setExpiryMessage(`Your plan will expire in ${remainingDays} days. Consider recharging.`);
      setShowExpiryAlert(true);
    }
  };

  const closeAlert = () => {
    setShowExpiryAlert(false);
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

        {/* Expiry Alert Modal */}
        {showExpiryAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-red-600">Plan Expiry Alert</h3>
                  <button 
                    onClick={closeAlert}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-700 mb-4">{expiryMessage}</p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeAlert}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Remind Me Later
                  </button>
                  <button
                    onClick={() => {
                      closeAlert();
                      setActivePage("Recharge");
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Recharge Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 overflow-auto">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">{activePage}</h2>

          {activePage === "Dashboard" && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">Welcome back, {user.name}! 👋</h3>
                <p className="text-blue-100">Here's what's happening with your account today.</p>
              </div>

              {/* Expiry Status Card */}
              {customerBalance && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-500">Validity Days</h4>
                        <p className="text-2xl font-bold text-gray-900">{customerBalance.validity_days || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className={`p-3 rounded-full ${
                        customerBalance.limit_expiry && new Date(customerBalance.limit_expiry) < new Date() 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-500">Expiry Date</h4>
                        <p className="text-lg font-bold text-gray-900">
                          {customerBalance.limit_expiry 
                            ? new Date(customerBalance.limit_expiry).toLocaleDateString()
                            : 'N/A'
                          }
                        </p>
                        {customerBalance.limit_expiry && (
                          <p className={`text-xs ${
                            new Date(customerBalance.limit_expiry) < new Date() 
                              ? 'text-red-600 font-bold'
                              : 'text-gray-500'
                          }`}>
                            {new Date(customerBalance.limit_expiry) < new Date() 
                              ? 'EXPIRED' 
                              : `${Math.ceil((new Date(customerBalance.limit_expiry) - new Date()) / (1000 * 3600 * 24))} days remaining`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                 
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActivePage("Recharge")}
                    className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                  >
                    <div className="text-blue-600 font-bold">Recharge</div>
                    <div className="text-sm text-gray-600">Add balance to your account</div>
                  </button>
                  
                  <button
                    onClick={() => setActivePage("History")}
                    className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                  >
                    <div className="text-green-600 font-bold">Usage History</div>
                    <div className="text-sm text-gray-600">View your usage details</div>
                  </button>
                  
                  <button
                    onClick={() => setActivePage("Profile")}
                    className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
                  >
                    <div className="text-purple-600 font-bold">Profile</div>
                    <div className="text-sm text-gray-600">Update your information</div>
                  </button>
                  
                  <button
                    onClick={() => setActivePage("Support")}
                    className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
                  >
                    <div className="text-orange-600 font-bold">Support</div>
                    <div className="text-sm text-gray-600">Get help & support</div>
                  </button>
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