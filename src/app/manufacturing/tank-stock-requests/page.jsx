'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, FaCheck, FaTimes, FaWarehouse, FaClock,
  FaSearch, FaSync, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaSpinner
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
  const [itemsPerPage] = useState(10);

  useEffect(() => { setMounted(true); }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/manufacturing/stock-requests?status=${activeTab}`);
      const data = await response.json();
      if (data.success) setRequests(data.data);
      else toast.error('Fetch failed');
    } catch (error) {
      toast.error('Sync error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (mounted) fetchRequests();
  }, [fetchRequests, mounted]);

  const handleApproval = async (requestId, action) => {
    if (!window.confirm(`Confirm ${action}?`)) return;
    try {
      setIsProcessing(true);
      const response = await fetch('/api/manufacturing/stock-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Success`);
        fetchRequests();
      } else toast.error(data.error || 'Failed');
    } catch (error) {
      toast.error('Processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.tank_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  if (!mounted) return null;

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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Management Protocol</p>
               </div>
               <div className="flex gap-2">
                  <Link href="/manufacturing/add-tank-stock" className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all">
                     <FaPlus size={10} /> New Request
                  </Link>
                  <button onClick={fetchRequests} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
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
                       placeholder="Search tank name..." 
                       value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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

            {/* LIST VIEW (Desktop only) */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tank Identifier</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Quantities</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {loading ? (
                        Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="5" className="px-6 py-8"></td></tr>)
                     ) : currentItems.length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-20 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No requests found</td></tr>
                     ) : currentItems.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${req.operation_type === 'plus' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {req.tank_name?.charAt(0)}
                                 </div>
                                 <span className="text-xs font-black text-slate-800">{req.tank_name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${req.operation_type === 'plus' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                 {req.operation_type === 'plus' ? 'Addition' : 'Deduction'}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-4">
                                 <div className="text-center">
                                    <p className={`text-[10px] font-black ${req.operation_type === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>{req.operation_type === 'plus' ? '+' : '-'}{parseFloat(req.kg_qty).toLocaleString()}</p>
                                    <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">KG</p>
                                 </div>
                                 <div className="text-center">
                                    <p className={`text-[10px] font-black ${req.operation_type === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>{req.operation_type === 'plus' ? '+' : '-'}{parseFloat(req.litre_qty).toLocaleString()}</p>
                                    <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">LTR</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                                 req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                 req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>{req.status}</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              {activeTab === 'Pending' && (
                                 <div className="flex items-center justify-end gap-1.5">
                                    <button onClick={() => handleApproval(req.id, 'Approved')} disabled={isProcessing} className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all"><FaCheck size={10} /></button>
                                    <button onClick={() => handleApproval(req.id, 'Rejected')} disabled={isProcessing} className="w-8 h-8 bg-rose-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all"><FaTimes size={10} /></button>
                                 </div>
                              )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* CARD VIEW (Mobile only) */}
            <div className="lg:hidden grid grid-cols-1 gap-4 mb-8">
               {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse shadow-sm"></div>)
               ) : currentItems.map((req) => (
                  <div key={req.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                     <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest text-white ${req.operation_type === 'plus' ? 'bg-blue-600' : 'bg-rose-600'}`}>
                        {req.operation_type === 'plus' ? 'Addition' : 'Deduction'}
                     </div>
                     <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center shadow-inner">
                           <FaWarehouse size={20} />
                        </div>
                        <div>
                           <h3 className="text-lg font-black text-slate-800 tracking-tight">{req.tank_name}</h3>
                           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(req.created_at).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                           <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-1">KG Stock</p>
                           <p className={`text-sm font-black ${req.operation_type === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {req.operation_type === 'plus' ? '+' : '-'}{parseFloat(req.kg_qty).toLocaleString()}
                           </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                           <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-1">LTR Stock</p>
                           <p className={`text-sm font-black ${req.operation_type === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {req.operation_type === 'plus' ? '+' : '-'}{parseFloat(req.litre_qty).toLocaleString()}
                           </p>
                        </div>
                     </div>
                     {activeTab === 'Pending' && (
                        <div className="flex gap-2">
                           <button onClick={() => handleApproval(req.id, 'Approved')} disabled={isProcessing} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md">Approve</button>
                           <button onClick={() => handleApproval(req.id, 'Rejected')} disabled={isProcessing} className="flex-1 bg-rose-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md">Reject</button>
                        </div>
                     )}
                  </div>
               ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
               <div className="flex items-center justify-center gap-2 pb-10">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"><FaChevronLeft size={10} /></button>
                  <div className="flex gap-1">
                     {Array.from({ length: totalPages }).map((_, i) => (
                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'}`}>{i + 1}</button>
                     ))}
                  </div>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"><FaChevronRight size={10} /></button>
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
