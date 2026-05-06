'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
   FaPlus, FaCheck, FaTimes, FaWarehouse, FaClock,
   FaSearch, FaSync, FaCalendarAlt, FaMicrochip, FaArrowRight,
   FaSpinner, FaChevronLeft, FaChevronRight, FaVial
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function ProductionHistoryContent() {
   const [mounted, setMounted] = useState(false);
   const [batches, setBatches] = useState([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState('All');
   const [searchTerm, setSearchTerm] = useState('');

   // Pagination State
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage] = useState(12);

   const fetchBatches = useCallback(async () => {
      try {
         setLoading(true);
         const response = await fetch(`/api/manufacturing/production?status=${activeTab}`);
         const data = await response.json();
         if (data.success) setBatches(data.data);
         else toast.error('Fetch failed');
      } catch (error) {
         toast.error('Sync error');
      } finally {
         setLoading(false);
      }
   }, [activeTab]);

   useEffect(() => {
      setMounted(true);
      fetchBatches();
   }, [fetchBatches]);

   // Flatten batches for the specific movement-based format
   const flattenedBatches = (batches || []).flatMap(batch => {
      const rows = [];
      
      // Inputs (Outward - Raw Materials)
      batch.inputs?.forEach((inp, idx) => {
         rows.push({
            id: `batch-${batch.id}-in-${idx}`,
            batch_code: batch.batch_code,
            tank_name: inp.source_tank_name || 'Unknown Tank',
            type: 'Outward', // Raw material going out
            kg: inp.kg_input,
            litre: inp.litre_input,
            status: batch.status,
            created_at: batch.created_at
         });
      });

      // Outputs (Inward - Finished Goods)
      batch.outputs?.forEach((out, idx) => {
         rows.push({
            id: `batch-${batch.id}-out-${idx}`,
            batch_code: batch.batch_code,
            tank_name: out.dest_tank_name || 'Unknown Tank',
            type: 'Inward', // Finished good coming in
            kg: out.kg_output,
            litre: out.litre_output,
            status: batch.status,
            created_at: batch.created_at
         });
      });

      return rows;
   });

   const [activeType, setActiveType] = useState('All');

   const filteredBatches = flattenedBatches.filter(row => {
      const matchesSearch = row.batch_code?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                            row.tank_name?.toLowerCase()?.includes(searchTerm.toLowerCase());
      const matchesType = activeType === 'All' || row.type === activeType;
      return matchesSearch && matchesType;
   });

   const [selectedBatch, setSelectedBatch] = useState(null);

   const handleView = (batchCode) => {
      const batch = batches.find(b => b.batch_code === batchCode);
      if (batch) setSelectedBatch(batch);
   };

   // Pagination Logic
   const indexOfLastItem = currentPage * itemsPerPage;
   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
   const currentItems = filteredBatches.slice(indexOfFirstItem, indexOfLastItem);
   const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);

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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                     <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">Batch History</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manufacturing Intelligence</p>
                     </div>
                     <div className="flex gap-2">
                        <Link href="/manufacturing/production" className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 flex items-center gap-2 active:scale-95 transition-all">
                           <FaPlus /> New Batch
                        </Link>
                        <button onClick={fetchBatches} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
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
                              placeholder="Search batch code or tank..."
                              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold outline-none focus:bg-white transition-all shadow-inner"
                           />
                        </div>
                        <div className="flex bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                           {[
                              { label: 'All', value: 'All' },
                              { label: 'Outward (RM)', value: 'Outward' },
                              { label: 'Inward (FG)', value: 'Inward' }
                           ].map((type) => (
                              <button
                                 key={type.value} onClick={() => { setActiveType(type.value); setCurrentPage(1); }}
                                 className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeType === type.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                                    }`}
                              >
                                 {type.label}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Responsive Display */}
                  <div className="mb-8">
                     {loading ? (
                        <div className="space-y-4">
                           {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse"></div>)}
                        </div>
                     ) : currentItems.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                           <FaVial className="text-slate-100 text-6xl mx-auto mb-4" />
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No entries found</p>
                        </div>
                     ) : (
                        <>
                           {/* Desktop Table View */}
                           <div className="hidden md:block overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                       <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Batch ID</th>
                                       <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Source Tank</th>
                                       <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                       <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">KG</th>
                                       <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Litre</th>
                                       <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                       <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {currentItems.map((row) => (
                                       <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                          <td className="px-6 py-4">
                                             <div className="text-[10px] font-black text-slate-900">{row.batch_code}</div>
                                             <div className="text-[8px] font-bold text-slate-400">{new Date(row.created_at).toLocaleDateString()}</div>
                                          </td>
                                          <td className="px-6 py-4">
                                             <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[9px] font-black border border-blue-100 uppercase">
                                                {row.tank_name}
                                             </span>
                                          </td>
                                          <td className="px-6 py-4">
                                             <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight border ${row.type === 'Outward' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                {row.type}
                                             </span>
                                          </td>
                                          <td className="px-6 py-4 text-[10px] font-black text-slate-700">
                                             {parseFloat(row.kg || 0).toLocaleString()}
                                          </td>
                                          <td className="px-6 py-4 text-[10px] font-black text-slate-700">
                                             {parseFloat(row.litre || 0).toLocaleString()}
                                          </td>
                                          <td className="px-6 py-4">
                                             <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border ${row.status === 'Process' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                row.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}>{row.status}</span>
                                          </td>
                                          <td className="px-6 py-4">
                                             <button 
                                                onClick={() => handleView(row.batch_code)}
                                                className="text-[9px] font-black text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-100 transition-all uppercase tracking-widest"
                                             >
                                                View
                                             </button>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>

                           {/* Mobile Card View */}
                           <div className="md:hidden space-y-4">
                              {currentItems.map((row) => (
                                 <div key={row.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                       <span className="text-[10px] font-black text-slate-900">{row.batch_code}</span>
                                       <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase border ${row.type === 'Outward' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{row.type}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <p className="text-[7px] font-black text-slate-300 uppercase">Tank</p>
                                          <p className="text-[9px] font-black text-slate-700">{row.tank_name}</p>
                                       </div>
                                       <div>
                                          <p className="text-[7px] font-black text-slate-300 uppercase">Status</p>
                                          <p className={`text-[9px] font-black ${row.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>{row.status}</p>
                                       </div>
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-slate-50">
                                       <button 
                                          onClick={() => handleView(row.batch_code)}
                                          className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest"
                                       >
                                          View Details
                                       </button>
                                    </div>
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
                                 className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'
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

            {/* Batch Details Modal */}
            {selectedBatch && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                           <h2 className="text-lg font-black text-slate-900 leading-tight">{selectedBatch.batch_code}</h2>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detailed Batch Report</p>
                        </div>
                        <button 
                           onClick={() => setSelectedBatch(null)}
                           className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                        >
                           <FaTimes />
                        </button>
                     </div>
                     
                     <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                        <div className="grid grid-cols-2 gap-4 mb-8">
                           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status</p>
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                                 selectedBatch.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>{selectedBatch.status}</span>
                           </div>
                           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Created At</p>
                              <p className="text-[10px] font-black text-slate-700">{new Date(selectedBatch.created_at).toLocaleString()}</p>
                           </div>
                        </div>

                        {selectedBatch.remarks && (
                           <div className="mb-8 p-4 bg-blue-50/30 rounded-2xl border border-blue-50">
                              <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Remarks</p>
                              <p className="text-[11px] font-medium text-slate-600">{selectedBatch.remarks}</p>
                           </div>
                        )}

                        <div className="space-y-6">
                           <div>
                              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Raw Material Inputs (Outward)
                              </h3>
                              <div className="space-y-2">
                                 {selectedBatch.inputs?.map((inp, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                       <div>
                                          <p className="text-[10px] font-black text-slate-700">{inp.source_tank_name}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase">Source Tank</p>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[10px] font-black text-slate-900">{parseFloat(inp.kg_input).toLocaleString()} KG</p>
                                          <p className="text-[8px] font-bold text-slate-400">{parseFloat(inp.litre_input).toLocaleString()} LTR</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           <div>
                              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Finished Good Outputs (Inward)
                              </h3>
                              <div className="space-y-2">
                                 {selectedBatch.outputs?.map((out, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                       <div>
                                          <p className="text-[10px] font-black text-slate-700">{out.dest_tank_name}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase">{out.product_type || 'Finished Good'}</p>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[10px] font-black text-emerald-600">{parseFloat(out.kg_output).toLocaleString()} KG</p>
                                          <p className="text-[8px] font-bold text-slate-400">{parseFloat(out.litre_output).toLocaleString()} LTR</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
                        <button 
                           onClick={() => setSelectedBatch(null)}
                           className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                           Close Report
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {/* Fixed Footer */}
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
               <Footer />
            </div>
         </div>
      </div>
   );
}

export default function ProductionHistoryPage() {
   return (
      <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
         <ProductionHistoryContent />
      </Suspense>
   );
}
