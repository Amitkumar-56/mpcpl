'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, FaCheck, FaTimes, FaWarehouse, FaClock,
  FaSearch, FaSync, FaCalendarAlt, FaFlask, FaArrowRight,
  FaChevronDown, FaChevronUp, FaSpinner, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function ProductionHistoryContent() {
  const [mounted, setMounted] = useState(false);
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  useEffect(() => { setMounted(true); }, []);

  const fetchProductions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/manufacturing/production?status=${activeTab}`);
      const data = await response.json();
      if (data.success) setProductions(data.data);
    } catch (error) {
      toast.error('Sync error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { if (mounted) fetchProductions(); }, [fetchProductions, mounted]);

  const handleApproval = async (productionId, action) => {
    if (!window.confirm(`Confirm ${action}?`)) return;
    try {
      setIsProcessing(true);
      const response = await fetch('/api/manufacturing/production/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productionId, action }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Success`);
        fetchProductions();
      } else toast.error(data.error || 'Failed');
    } catch (error) {
      toast.error('Processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProductions = productions.filter(pr => 
    pr.source_tank_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProductions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProductions.length / itemsPerPage);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Sidebar activePage="Manufacturing" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-32">
          <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Production Logs</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Batch Audit History</p>
               </div>
               <div className="flex gap-2">
                  <Link href="/manufacturing/production" className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center gap-2">
                     <FaPlus size={10} /> New Batch
                  </Link>
                  <button onClick={fetchProductions} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-emerald-600 shadow-sm transition-all">
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
                       placeholder="Search source tank..." 
                       value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold outline-none focus:bg-white transition-all shadow-inner"
                     />
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                     {['Pending', 'Approved', 'Rejected'].map((status) => (
                       <button
                         key={status} onClick={() => { setActiveTab(status); setCurrentPage(1); }}
                         className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                           activeTab === status ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'
                         }`}
                       >
                         {status} {status === 'Pending' && productions.length > 0 && `(${productions.length})`}
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
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Source Integration</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Batch Yield</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {loading ? (
                        Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="4" className="px-6 py-10"></td></tr>)
                     ) : currentItems.length === 0 ? (
                        <tr><td colSpan="4" className="px-6 py-20 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No batches found</td></tr>
                     ) : currentItems.map((pr) => (
                        <React.Fragment key={pr.id}>
                           <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner shrink-0">
                                       <FaFlask size={16} />
                                    </div>
                                    <div>
                                       <p className="text-xs font-black text-slate-800">{pr.source_tank_name}</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(pr.created_at).toLocaleDateString()} • {parseFloat(pr.kg_input).toLocaleString()} KG</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => setExpandedId(expandedId === pr.id ? null : pr.id)} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 border border-slate-100">
                                       {pr.outputs?.length} Products {expandedId === pr.id ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                                    pr.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    pr.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                 }`}>{pr.status}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 {activeTab === 'Pending' && (
                                    <div className="flex items-center justify-end gap-1.5">
                                       <button onClick={() => handleApproval(pr.id, 'Approved')} disabled={isProcessing} className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all"><FaCheck size={10} /></button>
                                       <button onClick={() => handleApproval(pr.id, 'Rejected')} disabled={isProcessing} className="w-8 h-8 bg-rose-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all"><FaTimes size={10} /></button>
                                    </div>
                                 )}
                              </td>
                           </tr>
                           {expandedId === pr.id && (
                              <tr className="bg-slate-50/50">
                                 <td colSpan="4" className="px-10 py-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                       {pr.outputs?.map((out, i) => (
                                          <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                             <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">Target: {out.dest_tank_name}</p>
                                             <div className="flex justify-between items-end">
                                                <p className="text-[10px] font-black text-slate-800">{parseFloat(out.kg_output).toLocaleString()} <span className="text-[8px] text-slate-400">KG</span></p>
                                                <p className="text-[10px] font-black text-slate-800">{parseFloat(out.litre_output).toLocaleString()} <span className="text-[8px] text-slate-400">LTR</span></p>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                    {pr.remarks && <p className="mt-4 text-[10px] font-medium text-slate-400 italic">" {pr.remarks} "</p>}
                                 </td>
                              </tr>
                           )}
                        </React.Fragment>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* CARD VIEW (Mobile only) */}
            <div className="lg:hidden grid grid-cols-1 gap-4 mb-8">
               {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse"></div>)
               ) : currentItems.map((pr) => (
                  <div key={pr.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                     <div className="p-5 flex items-center gap-4 border-b border-slate-50">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                           <FaFlask size={20} />
                        </div>
                        <div className="flex-1">
                           <h3 className="text-lg font-black text-slate-800 tracking-tight">{pr.source_tank_name}</h3>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(pr.created_at).toLocaleDateString()} • {parseFloat(pr.kg_input).toLocaleString()} KG Input</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                           pr.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                           pr.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>{pr.status}</span>
                     </div>
                     <div className="p-5 bg-slate-50/30">
                        <div className="flex items-center justify-between mb-4">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{pr.outputs?.length} Output Streams</p>
                           <button onClick={() => setExpandedId(expandedId === pr.id ? null : pr.id)} className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-widest">
                              {expandedId === pr.id ? 'Hide Yield' : 'View Yield'} {expandedId === pr.id ? <FaChevronUp /> : <FaChevronDown />}
                           </button>
                        </div>
                        {expandedId === pr.id && (
                           <div className="space-y-2 animate-in slide-in-from-top-2">
                              {pr.outputs?.map((out, i) => (
                                 <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-700">{out.dest_tank_name}</span>
                                    <div className="flex gap-3">
                                       <span className="text-[10px] font-black text-slate-900">{parseFloat(out.kg_output).toLocaleString()} <span className="text-[7px] text-slate-300">KG</span></span>
                                       <span className="text-[10px] font-black text-slate-900">{parseFloat(out.litre_output).toLocaleString()} <span className="text-[7px] text-slate-300">LTR</span></span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                     {activeTab === 'Pending' && (
                        <div className="p-3 bg-white border-t border-slate-50 flex gap-2">
                           <button onClick={() => handleApproval(pr.id, 'Approved')} disabled={isProcessing} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md shadow-emerald-100">Approve</button>
                           <button onClick={() => handleApproval(pr.id, 'Rejected')} disabled={isProcessing} className="flex-1 bg-rose-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md shadow-rose-100">Reject</button>
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
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
           <Footer />
        </div>
      </div>
    </div>
  );
}

export default function ProductionHistoryPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-emerald-600 text-4xl mx-auto" /></div>}>
      <ProductionHistoryContent />
    </Suspense>
  );
}
