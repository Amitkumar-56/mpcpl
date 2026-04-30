'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, FaCheck, FaTimes, FaWarehouse, FaClock,
  FaSearch, FaSync, FaCalendarAlt, FaExchangeAlt, FaArrowRight,
  FaSpinner, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TankTransferHistoryContent() {
  const [mounted, setMounted] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => { setMounted(true); }, []);

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/manufacturing/tank-transfers?status=${activeTab}`);
      const data = await response.json();
      if (data.success) setTransfers(data.data);
      else toast.error('Fetch failed');
    } catch (error) {
      toast.error('Sync error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { if (mounted) fetchTransfers(); }, [fetchTransfers, mounted]);

  const handleApproval = async (transferId, action) => {
    if (!window.confirm(`Confirm ${action}?`)) return;
    try {
      setIsProcessing(true);
      const response = await fetch('/api/manufacturing/tank-transfers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferId, action }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Success`);
        fetchTransfers();
      } else toast.error(data.error || 'Failed');
    } catch (error) {
      toast.error('Processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTransfers = transfers.filter(tr => 
    tr.source_tank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tr.dest_tank_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransfers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
               <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Transfer Records</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Movement Hub</p>
               </div>
               <div className="flex gap-2">
                  <Link href="/manufacturing/tank-transfer" className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all">
                     <FaPlus /> New Transfer
                  </Link>
                  <button onClick={fetchTransfers} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
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
                       placeholder="Search source or destination..." 
                       value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold outline-none focus:bg-white transition-all shadow-inner"
                     />
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                     {['Pending', 'Approved', 'Rejected'].map((status) => (
                       <button
                         key={status} onClick={() => { setActiveTab(status); setCurrentPage(1); }}
                         className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                           activeTab === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                         }`}
                       >
                         {status} {status === 'Pending' && transfers.length > 0 && `(${transfers.length})`}
                       </button>
                     ))}
                  </div>
               </div>
            </div>

            {/* High-Density Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transfer Route</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Quantities</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                           Array.from({ length: 6 }).map((_, i) => (
                              <tr key={i} className="animate-pulse">
                                 <td colSpan="5" className="px-6 py-8"></td>
                              </tr>
                           ))
                        ) : currentItems.length === 0 ? (
                           <tr>
                              <td colSpan="5" className="px-6 py-20 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No transfers recorded</td>
                           </tr>
                        ) : currentItems.map((tr) => (
                           <tr key={tr.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                                       <FaExchangeAlt size={12} />
                                    </div>
                                    <div className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-2">
                                       {tr.source_tank_name} <FaArrowRight size={8} className="text-slate-300" /> {tr.dest_tank_name}
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className="flex items-center justify-center gap-3">
                                    <div className="text-center">
                                       <p className="text-[10px] font-black text-emerald-600">{parseFloat(tr.kg_qty).toLocaleString()}</p>
                                       <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">KG</p>
                                    </div>
                                    <div className="text-center">
                                       <p className="text-[10px] font-black text-orange-600">{parseFloat(tr.litre_qty).toLocaleString()}</p>
                                       <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">LTR</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <p className="text-[10px] font-bold text-slate-700">{new Date(tr.created_at).toLocaleDateString()}</p>
                                 <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">{new Date(tr.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                                    tr.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    tr.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                 }`}>{tr.status}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 {activeTab === 'Pending' ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                       <button onClick={() => handleApproval(tr.id, 'Approved')} disabled={isProcessing} className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all"><FaCheck size={10} /></button>
                                       <button onClick={() => handleApproval(tr.id, 'Rejected')} disabled={isProcessing} className="w-8 h-8 bg-rose-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all"><FaTimes size={10} /></button>
                                    </div>
                                 ) : (
                                    <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                                       <FaChevronRight size={10} />
                                    </button>
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
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"
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
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"
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

export default function TankTransferHistoryPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-indigo-600 text-4xl mx-auto" /></div>}>
      <TankTransferHistoryContent />
    </Suspense>
  );
}
