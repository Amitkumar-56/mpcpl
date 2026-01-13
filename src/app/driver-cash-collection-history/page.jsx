"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter } from "next/navigation";
import { Fragment, Suspense, useEffect, useState } from "react";

function HistoryContent() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState({});
  const [logCache, setLogCache] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/driver-cash-history?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Load fail");
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleLogs = async (id) => {
    const next = { ...expanded, [id]: !expanded[id] };
    setExpanded(next);
    if (next[id] && !logCache[id]) {
      try {
        const res = await fetch(`/api/audit-logs?record_type=driver_cash&record_id=${id}&limit=20`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.success) {
          setLogCache(prev => ({ ...prev, [id]: data.data || [] }));
        } else {
          setLogCache(prev => ({ ...prev, [id]: [] }));
        }
      } catch {
        setLogCache(prev => ({ ...prev, [id]: [] }));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Driver Cash Collection History</h1>
              <p className="text-gray-600 mt-1">Recent collections</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/driver-cash-collection")}
                className="inline-flex items-center justify-center bg-gray-700 hover:bg-gray-800 text-white font-medium px-4 py-2 rounded-lg transition duration-200"
              >
                Driver Cash Collection
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search driver, customer, vehicle"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchData}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setSearch("");
                      setDateFrom("");
                      setDateTo("");
                      setTimeout(fetchData, 0);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
            )}

            {loading ? (
              <div className="p-6 text-center text-gray-600">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-center text-gray-600">No records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((r) => (
                      <Fragment key={r.id}>
                        <tr className="hover:bg-gray-50 transition duration-150">
                          <td className="px-6 py-3 text-sm text-gray-900">
                            {r.collected_date ? new Date(r.collected_date).toLocaleString("en-IN") : ""}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">
                            {r.driver_name}
                            {r.driver_phone ? <div className="text-xs text-gray-500">{r.driver_phone}</div> : null}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">{r.vehicle_number}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{r.customer_name}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">₹{parseFloat(r.amount || 0).toLocaleString("en-IN")}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{r.remarks || ""}</td>
                          <td className="px-6 py-3 text-sm">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => router.push(`/driver-cash-collection-history/edit?id=${r.id}`)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleLogs(r.id)}
                                className="text-gray-700 hover:text-gray-900"
                              >
                                Logs
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded[r.id] && (
                          <tr>
                            <td colSpan="7" className="px-6 py-3 bg-gray-50">
                              {Array.isArray(logCache[r.id]) && logCache[r.id].length > 0 ? (
                                <div className="space-y-2">
                                  {logCache[r.id].map((log, idx) => (
                                    <div key={idx} className="bg-white rounded border p-3 text-sm">
                                      <div className="flex justify-between">
                                        <div>
                                          <span className="font-medium text-gray-700">{log.action || 'Action'}:</span>
                                          <span className="ml-2 text-gray-900">{log.user_name || 'Unknown User'}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {log.created_at || `${log.action_date} ${log.action_time}`}
                                        </span>
                                      </div>
                                      {log.remarks && (
                                        <p className="text-xs text-gray-600 mt-1">{log.remarks}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">No logs found</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DriverCashCollectionHistoryPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0">
          <Suspense fallback={<div className="p-6">Loading...</div>}>
            <HistoryContent />
          </Suspense>
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
