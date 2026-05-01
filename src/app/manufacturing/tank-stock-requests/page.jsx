'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, FaCheck, FaTimes, FaWarehouse, FaClock,
  FaSearch, FaSync, FaCalendarAlt, FaFlask, FaArrowRight,
  FaSpinner, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';
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

  const searchParams = useSearchParams();
  const urlTankId = searchParams.get('tankId');

  useEffect(() => {
    setMounted(true);
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('status', activeTab);
        if (urlTankId) params.set('tankId', urlTankId);
        
        const response = await fetch(`/api/manufacturing/all-tank-stock/requests?${params.toString()}`);
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
  }, [activeTab, urlTankId]);

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

  const filteredRequests = (requests || []).filter(req => 
    req?.tank_name?.toLowerCase()?.includes(searchTerm.toLowerCase())
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

             {/* Responsive View Switcher */}
             <div className="mb-12">
                {loading ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                         <div key={i} className="h-64 bg-white rounded-[2.5rem] border border-slate-50 animate-pulse shadow-sm"></div>
                      ))}
                   </div>
                ) : currentItems.length === 0 ? (
                   <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                         <FaWarehouse className="text-slate-200 text-3xl" />
                      </div>
                      <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">No active protocols detected</p>
                   </div>
                ) : (
                   <>
                      {/* Desktop List View (md and up) */}
                      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-slate-50/50 border-b border-slate-100">
                                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Inbound Identity</th>
                                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Logistics</th>
                                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Weight</th>
                                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Volume</th>
                                  <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {currentItems.map((req) => (
                                  <tr key={req.id} className="hover:bg-blue-50/30 transition-colors group">
                                     <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                           <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                              <FaFlask size={14} />
                                           </div>
                                           <div>
                                              <p className="text-sm font-black text-slate-800 tracking-tight">{req.tank_name}</p>
                                              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">ID: #{req.id}</p>
                                           </div>
                                        </div>
                                     </td>
                                     <td className="px-6 py-5">
                                        <div className="space-y-0.5">
                                           <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Inv: {req.invoice_no || 'N/A'}</p>
                                           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{req.tanker_no || 'No Tanker'}</p>
                                        </div>
                                     </td>
                                     <td className="px-6 py-5 text-right">
                                        <p className="text-sm font-black text-slate-800">{parseFloat(req.kg_qty).toLocaleString()} <span className="text-[8px] text-slate-400">KG</span></p>
                                     </td>
                                     <td className="px-6 py-5 text-right">
                                        <p className="text-sm font-black text-slate-800">{parseFloat(req.litre_qty).toLocaleString()} <span className="text-[8px] text-slate-400">LTR</span></p>
                                     </td>
                                     <td className="px-6 py-5 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                           req.status === 'Pending' ? 'bg-amber-500 text-white' :
                                           req.status === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                        }`}>{req.status}</span>
                                     </td>
                                     <td className="px-8 py-5">
                                        <div className="flex items-center justify-center gap-2">
                                           {activeTab === 'Pending' ? (
                                              <>
                                                 <button onClick={() => handleApproval(req.id, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"><FaCheck size={10} /></button>
                                                 <button onClick={() => handleApproval(req.id, 'Rejected')} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><FaTimes size={10} /></button>
                                              </>
                                           ) : (
                                              <p className="text-[8px] font-bold text-slate-300 italic">{new Date(req.created_at).toLocaleDateString()}</p>
                                           )}
                                        </div>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>

                      {/* Mobile Card View (hidden on md and up) */}
                      <div className="md:hidden grid grid-cols-1 gap-4">
                         {currentItems.map((req) => (
                            <div key={req.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg shadow-slate-200/40">
                               <div className="flex justify-between items-start mb-4">
                                  <div className="px-2 py-1 bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-md">#{req.id}</div>
                                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                     req.status === 'Pending' ? 'bg-amber-500 text-white' :
                                     req.status === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                  }`}>{req.status}</span>
                               </div>
                               <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 rounded-xl">
                                  <div className="space-y-1">
                                     <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Invoice Details</p>
                                     <p className="text-[10px] font-bold text-slate-800 tracking-tight">{req.invoice_no || 'N/A'}</p>
                                  </div>
                                  <div className="text-right space-y-1">
                                     <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Tanker Info</p>
                                     <p className="text-[10px] font-bold text-slate-800 tracking-tight">{req.tanker_no || 'N/A'}</p>
                                  </div>
                               </div>

                               <div className="grid grid-cols-2 gap-4 mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-50">
                                  <div>
                                     <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Weight</p>
                                     <p className="text-sm font-black text-slate-800">{parseFloat(req.kg_qty).toLocaleString()} KG</p>
                                  </div>
                                  <div>
                                     <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Volume</p>
                                     <p className="text-sm font-black text-slate-800">{parseFloat(req.litre_qty).toLocaleString()} LTR</p>
                                  </div>
                               </div>
                               {activeTab === 'Pending' && (
                                  <div className="flex gap-2">
                                     <button onClick={() => handleApproval(req.id, 'Approved')} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">Confirm</button>
                                     <button onClick={() => handleApproval(req.id, 'Rejected')} className="flex-1 bg-rose-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">Void</button>
                                  </div>
                               )}
                            </div>
                         ))}
                      </div>
                   </>
                )}
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
