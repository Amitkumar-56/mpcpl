'use client';

import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useEffect, useState } from "react";
import { FaArrowLeft, FaHistory, FaMapMarkerAlt, FaRoute, FaTruck } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function RentalRouteHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, currentPage: 1 });
  const router = useRouter();

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rental/trips/all-route-history?page=${page}&limit=20`);
      const result = await res.json();
      if (result.success) {
        setHistory(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.back()} 
                  className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400 hover:text-blue-600 transition-all"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <FaRoute className="text-blue-600" /> Route Diversion History
                  </h1>
                  <p className="text-gray-500 text-sm font-medium">Tracking all vehicle route changes across rental trips.</p>
                </div>
              </div>
              <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Diversions: {pagination.total}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-bold">Fetching history logs...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <FaHistory size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No History Found</h3>
                <p className="text-gray-500">No route diversions have been recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {history.map((item) => (
                  <div key={item.id} className="group relative bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all hover:shadow-xl hover:shadow-blue-500/5">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Trip Info Sidebar */}
                      <div className="md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                            <FaTruck size={14} />
                          </div>
                          <span className="text-sm font-black text-gray-900">{item.vehicle_no}</span>
                        </div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Trip ID</div>
                        <div className="text-sm font-bold text-blue-600 mb-2">TRP-{item.trip_id}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer</div>
                        <div className="text-xs font-bold text-gray-700 truncate">{item.customer_name}</div>
                      </div>

                      {/* Route Timeline */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Diversion Details</div>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-gray-500 line-through">{item.old_destination}</span>
                              </div>
                              <div className="flex-1 h-px bg-gradient-to-r from-gray-200 via-blue-400 to-gray-200 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                  <FaRoute className="text-blue-500" size={12} />
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-lg font-black text-blue-700">{item.new_destination}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full sm:w-48 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remarks</div>
                            <p className="text-xs text-gray-600 font-medium italic">"{item.remarks}"</p>
                          </div>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="md:w-32 shrink-0 text-right">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Modified On</div>
                        <div className="text-sm font-black text-gray-900">{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase">{new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10">
                <button 
                  disabled={pagination.currentPage === 1}
                  onClick={() => fetchHistory(pagination.currentPage - 1)}
                  className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 font-bold text-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-all"
                >
                  Previous
                </button>
                <span className="text-sm font-black text-gray-900">Page {pagination.currentPage} of {pagination.pages}</span>
                <button 
                  disabled={pagination.currentPage === pagination.pages}
                  onClick={() => fetchHistory(pagination.currentPage + 1)}
                  className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 font-bold text-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
