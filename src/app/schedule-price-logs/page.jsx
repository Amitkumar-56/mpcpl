"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SchedulePriceLogsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(""); // Empty = show all
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      checkPermissions();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (hasPermission) {
      fetchLogs();
    }
  }, [filterDate, hasPermission]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;
    if (Number(user.role) === 5) {
      setHasPermission(true);
      return;
    }
    // Check permissions for Schedule Prices
    const moduleName = 'Schedule Prices';
    try {
      const res = await fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`);
      const data = await res.json();
      setHasPermission(data.allowed);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = filterDate 
        ? `/api/schedule-price-logs?date=${filterDate}`
        : `/api/schedule-price-logs`;
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.success) {
        setLogs(result.data || []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to view Schedule Price Logs.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
            <h1 className="text-xl font-bold text-gray-800 mb-4">Schedule Price Logs</h1>
            
            <div className="mb-4 flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Date (Leave empty to show all)
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                Total Records: <span className="font-semibold">{logs.length}</span>
              </div>
            </div>

            {logs.length === 0 ? (
              <p className="text-gray-500">
                {filterDate ? `No logs found for ${filterDate}.` : "No scheduled prices found."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Time</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Customer</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Station</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Code</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-center font-semibold text-gray-700">Price</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-3 border-b border-gray-200">{log.Schedule_Date || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200">{log.Schedule_Time || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200">{log.customer_name || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200">{log.station_name || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200">{log.product_name || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200">{log.product_code || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-gray-200 text-center font-semibold">₹{parseFloat(log.price || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 border-b border-gray-200">
                          {log.is_applied ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Applied</span>
                          ) : log.status === 'scheduled' ? (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Scheduled</span>
                          ) : log.status === 'active' ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Active</span>
                          ) : log.status === 'expired' ? (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Expired</span>
                          ) : (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function SchedulePriceLogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SchedulePriceLogsContent />
    </Suspense>
  );
}

