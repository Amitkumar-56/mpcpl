'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { 
  FaPlus, FaSearch, FaWarehouse, FaSync, FaChartLine, 
  FaWeightHanging, FaFillDrip, FaChevronRight, FaSpinner,
  FaChevronLeft, FaChevronRight as FaChevronRightIcon
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function AllTankStockContent() {
  const [mounted, setMounted] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => { setMounted(true); }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/all-tank-stock');
      const data = await response.json();
      setStocks(data);
    } catch (error) {
      toast.error('Failed to sync stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (mounted) fetchStocks(); }, [mounted]);

  const filteredStocks = stocks.filter(stock => 
    stock.tank_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

  const totalKg = stocks.reduce((acc, curr) => acc + parseFloat(curr.kg_qty || 0), 0);
  const totalLitre = stocks.reduce((acc, curr) => acc + parseFloat(curr.litre_qty || 0), 0);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-48">
          <div className="max-w-6xl mx-auto">
            {/* Metrics Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
               <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fleet Assets</p>
                  <h2 className="text-3xl font-black">{stocks.length}</h2>
                  <div className="mt-4 flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase">
                     <FaWarehouse /> Active Tanks
                  </div>
               </div>
               <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aggregate Weight</p>
                  <h2 className="text-2xl font-black text-slate-900">{totalKg.toLocaleString()} <span className="text-xs text-slate-400">KG</span></h2>
                  <div className="mt-4 flex items-center gap-2 text-blue-500 font-bold text-[10px] uppercase">
                     <FaWeightHanging /> Global Mass
                  </div>
               </div>
               <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aggregate Volume</p>
                  <h2 className="text-2xl font-black text-slate-900">{totalLitre.toLocaleString()} <span className="text-xs text-slate-400">LTR</span></h2>
                  <div className="mt-4 flex items-center gap-2 text-amber-500 font-bold text-[10px] uppercase">
                     <FaFillDrip /> Global Volume
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div className="flex-1 relative max-w-md">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    placeholder="Quick search assets..." 
                    value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                  />
               </div>
               <div className="flex gap-2">
                  <Link href="/manufacturing/add-tank-stock" className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 flex items-center gap-2 active:scale-95 transition-all">
                     <FaPlus /> Stock In/Out
                  </Link>
                  <button onClick={fetchStocks} className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 shadow-sm transition-all">
                     <FaSync size={12} className={loading ? 'animate-spin' : ''} />
                  </button>
               </div>
            </div>

            {/* High-Density List */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-8">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Name</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Net Weight</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Net Volume</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                           Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="4" className="px-8 py-8"></td></tr>)
                        ) : currentItems.length === 0 ? (
                           <tr><td colSpan="4" className="px-8 py-20 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No stock found</td></tr>
                        ) : currentItems.map((stock) => (
                           <tr key={stock.tank_id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-inner">
                                       {stock.tank_name?.charAt(0)}
                                    </div>
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{stock.tank_name}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <p className="text-sm font-black text-slate-800">{parseFloat(stock.kg_qty).toLocaleString()}</p>
                                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Kilograms</p>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <p className="text-sm font-black text-slate-800">{parseFloat(stock.litre_qty).toLocaleString()}</p>
                                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Litres</p>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <Link href={`/manufacturing/add-tank-stock?tankId=${stock.tank_id}`} className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                                    Adjust <FaChevronRight />
                                 </Link>
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
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"><FaChevronLeft size={10} /></button>
                  <div className="flex gap-1">
                     {Array.from({ length: totalPages }).map((_, i) => (
                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'}`}>{i + 1}</button>
                     ))}
                  </div>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"><FaChevronRightIcon size={10} /></button>
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

export default function AllTankStockPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-slate-900 text-4xl mx-auto" /></div>}>
      <AllTankStockContent />
    </Suspense>
  );
}
