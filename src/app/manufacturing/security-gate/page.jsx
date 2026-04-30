"use client";

import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { 
  FaPlus, FaSearch, FaSpinner, FaTruck, FaShieldAlt, FaKey, FaEye, 
  FaBan, FaRedo, FaCamera, FaMapMarkerAlt, FaCheckCircle, FaClock, 
  FaTimesCircle, FaCog, FaSignOutAlt, FaUser, FaHistory, FaCheck, FaInfoCircle,
  FaChevronLeft, FaChevronRight, FaSync
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function SecurityGateContent() {
  const router = useRouter();
  const { user } = useSession();
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      
      const res = await fetch(`/api/manufacturing/security-gate?${params}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
      }
    } catch (error) {
      toast.error("Failed to sync data");
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    if (mounted) {
      fetchEntries();
    }
  }, [fetchEntries, mounted]);

  const handleExit = async (id) => {
    if (!confirm("Are you sure this vehicle is exiting?")) return;
    try {
      const res = await fetch(`/api/manufacturing/security-gate?id=${id}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        toast.success("Exit marked successfully");
        fetchEntries();
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const filteredEntries = entries; // Server-side search handled via fetchEntries
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-48">
          <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security Gate</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Transit Monitor</p>
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={fetchEntries} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                     <FaSync className={loading ? 'animate-spin' : ''} />
                  </button>
                  <Link href="/manufacturing/security-gate/create" className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                     <FaPlus /> New Gate Entry
                  </Link>
               </div>
            </div>

            {/* Sticky Search & Filter */}
            <div className="sticky top-0 z-20 bg-[#F8FAFF] pb-4">
               <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                     <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                     <input 
                       placeholder="Search Vehicle No, Driver..." 
                       value={search} onChange={e => setSearch(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none font-bold transition-all focus:bg-white shadow-inner"
                     />
                  </div>
                  <select 
                    value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="bg-slate-50 px-4 py-3 rounded-xl text-[10px] font-bold outline-none border-none cursor-pointer"
                  >
                     <option value="">All Traffic</option>
                     <option value="Active">Currently Inside</option>
                     <option value="Exited">Recently Exited</option>
                  </select>
               </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-6">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[900px]">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry ID</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle & Driver</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Logistics Details</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                               <td colSpan="5" className="px-6 py-8"><div className="h-4 bg-slate-50 rounded w-full"></div></td>
                            </tr>
                          ))
                        ) : currentItems.length === 0 ? (
                           <tr>
                              <td colSpan="5" className="px-6 py-20 text-center">
                                 <FaTruck className="text-slate-100 text-6xl mx-auto mb-4" />
                                 <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No entries found for this criteria</p>
                              </td>
                           </tr>
                        ) : currentItems.map((entry) => (
                           <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors group">
                              <td className="px-6 py-6">
                                 <div className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">#{entry.id.toString().padStart(5, '0')}</div>
                                 <div className="text-[8px] font-bold text-slate-400 mt-1">{new Date(entry.entry_time).toLocaleDateString()}</div>
                              </td>
                              <td className="px-6 py-6">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                                       <FaTruck size={14} />
                                    </div>
                                    <div>
                                       <div className="text-xs font-black text-slate-800 tracking-tight">{entry.vehicle_number}</div>
                                       <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{entry.driver_name}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-6">
                                 <div className="text-[10px] font-bold text-slate-700">{entry.material_name || 'No Cargo'}</div>
                                 <div className="text-[9px] font-medium text-slate-400 mt-1">{entry.quantity} {entry.unit} • {entry.purpose}</div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                 <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                    entry.status === 'Active' 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' 
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                 }`}>
                                    {entry.status === 'Active' ? 'Inside Plant' : 'Exited'}
                                 </span>
                              </td>
                              <td className="px-6 py-6 text-right">
                                 {entry.status === 'Active' ? (
                                    <button 
                                      onClick={() => handleExit(entry.id)}
                                      className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-90 transition-all"
                                    >
                                       Mark Exit
                                    </button>
                                 ) : (
                                    <div className="text-[9px] font-bold text-slate-300 italic">
                                       Exited at {new Date(entry.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
               <div className="flex items-center justify-center gap-2 pb-10">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all shadow-sm"
                  >
                     <FaChevronLeft size={10} />
                  </button>
                  <div className="flex gap-1">
                     {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all ${
                            currentPage === i + 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'
                          }`}
                        >
                           {i + 1}
                        </button>
                     ))}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all shadow-sm"
                  >
                     <FaChevronRight size={10} />
                  </button>
               </div>
            )}
          </div>
        </main>
        
        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
           <Footer />
        </div>
      </div>
    </div>
  );
}

export default function SecurityGatePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <SecurityGateContent />
    </Suspense>
  );
}
