'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, FaCheck, FaTimes, FaWarehouse, FaClock,
  FaSearch, FaSync, FaCalendarAlt, FaFlask, FaArrowRight,
  FaSpinner, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TankStockRequestsContent() {
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    setMounted(true);
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/manufacturing/all-tank-stock/requests?status=${activeTab}`);
        const data = await response.json();
        if (data.success) {
          setRequests(data.data);
        }
      } catch (error) {
        toast.error('Sync failed');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [activeTab]);

  const handleApproval = async (requestId, action) => {
    if (!window.confirm(`Confirm ${action}?`)) return;
    try {
      setIsProcessing(true);
      const response = await fetch('/api/manufacturing/all-tank-stock/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Request ${action} successfully`);
        // Refresh list
        const refreshed = await fetch(`/api/manufacturing/all-tank-stock/requests?status=${activeTab}`);
        const refData = await refreshed.json();
        if (refData.success) setRequests(refData.data);
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Error processing request');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.tank_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

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

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-32">
          <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Stock Approvals</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Authorization Hub</p>
               </div>
               <div className="flex gap-2">
                  <Link href="/manufacturing/add-tank-stock" className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all">
                     <FaPlus /> New Entry
                  </Link>
                  <button onClick={() => setActiveTab(activeTab)} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
                     <FaSync size={12} className={loading ? 'animate-spin' : ''} />
                  </button>
               </div>
            </div>

            {/* Sticky Filters */}
            <div className="sticky top-0 z-20 bg-[#F8FAFF] pb-4">
               <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-3">
                  <div className="flex-1 relative">
                     <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                     <input 
                       placeholder="Search tanks..." 
                       value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold outline-none focus:bg-white transition-all shadow-inner"
                     />
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                     {['Pending', 'Approved', 'Rejected'].map((status) => (
                       <button
                         key={status} onClick={() => { setActiveTab(status); setCurrentPage(1); }}
                         className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                           activeTab === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                         }`}
                       >
                         {status} {status === 'Pending' && requests.length > 0 && `(${requests.length})`}
                       </button>
                     ))}
                  </div>
               </div>
            </div>

            {/* High-Density Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
               {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                     <div key={i} className="h-48 bg-white rounded-2xl border border-slate-50 animate-pulse"></div>
                  ))
               ) : currentItems.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                     <FaWarehouse className="text-slate-100 text-6xl mx-auto mb-4" />
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No requests found</p>
                  </div>
               ) : currentItems.map((req) => (
                  <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-all group">
                     <div className="flex justify-between items-start mb-4">
                        <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">ID: #{req.id}</div>
                        <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border ${
                           req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                           req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>{req.status}</span>
                     </div>
                     
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                           <FaFlask size={14} />
                        </div>
                        <div>
                           <h3 className="text-sm font-black text-slate-800 tracking-tight">{req.tank_name}</h3>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{req.type}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                        <div>
                           <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Weight</p>
                           <p className="text-xs font-black text-slate-800">{parseFloat(req.kg_qty).toLocaleString()} <span className="text-[8px] text-slate-400">KG</span></p>
                        </div>
                        <div>
                           <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Volume</p>
                           <p className="text-xs font-black text-slate-800">{parseFloat(req.litre_qty).toLocaleString()} <span className="text-[8px] text-slate-400">LTR</span></p>
                        </div>
                     </div>

                     {activeTab === 'Pending' ? (
                        <div className="flex gap-2 mt-auto">
                           <button 
                             onClick={() => handleApproval(req.id, 'Approved')}
                             disabled={isProcessing}
                             className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                           >
                              <FaCheck /> Approve
                           </button>
                           <button 
                             onClick={() => handleApproval(req.id, 'Rejected')}
                             disabled={isProcessing}
                             className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                           >
                              <FaTimes /> Reject
                           </button>
                        </div>
                     ) : (
                        <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
                           <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              <FaClock /> {new Date(req.created_at).toLocaleDateString()}
                           </div>
                           <p className="text-[8px] font-medium text-slate-400 italic truncate max-w-[120px]">{req.remarks || 'No remarks'}</p>
                        </div>
                     )}
                  </div>
               ))}
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

export default function TankStockRequestsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <TankStockRequestsContent />
    </Suspense>
  );
}
