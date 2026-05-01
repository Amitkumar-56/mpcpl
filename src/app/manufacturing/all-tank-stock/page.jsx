'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, FaSearch, FaHistory, FaWarehouse, FaSync, 
  FaClipboardList, FaSpinner, FaChevronLeft, FaChevronRight,
  FaShieldAlt, FaFlask, FaExchangeAlt, FaBox
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
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    setMounted(true);
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/manufacturing/all-tank-stock');
        const data = await response.json();
        setStocks(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Failed to sync stock data');
      } finally {
        setLoading(false);
      }
    };
    fetchStocks();
  }, []);

  const filteredStocks = (stocks || []).filter(stock => 
    stock?.tank_name?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

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
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-8 pb-48">
          <div className="max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tank Inventory</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Stock Monitor</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                  <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="Search tanks..." 
                      className="pl-10 pr-4 py-2.5 rounded-xl border-none bg-transparent outline-none text-xs font-bold w-48 sm:w-64"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                </div>
                <Link href="/manufacturing/add-tank-stock" className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all">
                  <FaPlus size={10} /> Add Stock
                </Link>
              </div>
            </div>

            {/* Live Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
               {[
                 { label: 'Total Tanks', value: stocks.length, icon: <FaWarehouse />, color: 'bg-blue-500' },
                 { label: 'Raw Materials', value: stocks.filter(s => s?.tank_name?.toLowerCase()?.includes('raw')).length, icon: <FaBox />, color: 'bg-amber-500' },
                 { label: 'Finished Goods', value: stocks.filter(s => s?.tank_name?.toLowerCase()?.includes('fg')).length, icon: <FaFlask />, color: 'bg-emerald-500' },
                 { label: 'Alerts', value: stocks.filter(s => parseFloat(s?.total_kg || 0) < 100).length, icon: <FaShieldAlt />, color: 'bg-rose-500' },
               ].map((stat, i) => (
                 <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                       {stat.icon}
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{stat.label}</p>
                       <p className="text-lg font-black text-slate-800">{stat.value}</p>
                    </div>
                 </div>
               ))}
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 bg-white rounded-[2.5rem] animate-pulse border border-slate-50"></div>
                ))
              ) : currentItems.length === 0 ? (
                <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <FaWarehouse className="text-slate-100 text-6xl mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active stock records detected</p>
                </div>
              ) : currentItems.map((stock) => (
                <div key={stock.tank_id} className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-200 transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col">
                  <div className="p-8 pb-4">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                           {stock.tank_name.charAt(0)}
                        </div>
                        <div className="text-right">
                           <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[8px] font-black tracking-widest uppercase shadow-lg">
                              {stock?.unit || 'KG'}
                           </span>
                        </div>
                     </div>
                     <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{stock?.tank_name || 'Unnamed Tank'}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Storage</p>
                  </div>

                  <div className="px-8 pb-8 pt-4 bg-slate-50/50 mt-auto">
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Weight</p>
                           <p className="text-xl font-black text-slate-800">{parseFloat(stock?.total_kg || 0).toLocaleString()} <span className="text-[10px] text-slate-400">KG</span></p>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume</p>
                           <p className="text-xl font-black text-slate-800">{parseFloat(stock?.total_litre || 0).toLocaleString()} <span className="text-[10px] text-slate-400">LTR</span></p>
                        </div>
                     </div>
                     
                     <div className="flex gap-2">
                        <Link href={`/manufacturing/tank-stock-requests?tankId=${stock?.tank_id}`} className="flex-1 bg-white border border-slate-100 text-slate-600 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center shadow-sm hover:bg-slate-900 hover:text-white transition-all">
                           History
                        </Link>
                        <Link href="/manufacturing/tank-transfer" className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                           <FaExchangeAlt size={12} />
                        </Link>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-12 pb-10">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-95 transition-all shadow-sm"
                >
                  <FaChevronLeft size={12} />
                </button>
                <div className="flex gap-2">
                   {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-12 h-12 rounded-2xl font-black text-xs transition-all ${
                          currentPage === i + 1 
                          ? 'bg-slate-900 text-white shadow-xl scale-110' 
                          : 'bg-white border border-slate-100 text-slate-400'
                        }`}
                      >
                         {i + 1}
                      </button>
                   ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-95 transition-all shadow-sm"
                >
                  <FaChevronRight size={12} />
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

export default function AllTankStockPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    }>
      <AllTankStockContent />
    </Suspense>
  );
}
