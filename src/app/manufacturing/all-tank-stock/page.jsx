'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, FaSearch, FaWarehouse, FaSync, 
  FaSpinner, FaMinus, FaVial, FaArrowRight,
  FaCheck, FaTimes
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

  useEffect(() => {
    setMounted(true);
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/manufacturing/all-tank-stock');
        const data = await response.json();
        setStocks(data.success ? data.data : []);
      } catch (error) {
        toast.error('Failed to sync stock data');
      } finally {
        setLoading(false);
      }
    };
    fetchStocks();
  }, []);

  const [adjusting, setAdjusting] = useState(null); // { tank_id, unit, type }
  const [adjustValue, setAdjustValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [historyTank, setHistoryTank] = useState(null);
  const [tankHistory, setTankHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleAdjust = async () => {
    if (!adjustValue || isNaN(adjustValue)) return toast.error('Enter valid amount');
    try {
      setSubmitting(true);
      const response = await fetch('/api/manufacturing/all-tank-stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tank_id: adjusting.tank_id,
          type: adjusting.type,
          [adjusting.unit === 'KG' ? 'kg_qty' : 'litre_qty']: adjustValue,
          remarks: `Manual ${adjusting.type} via Dashboard`
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setAdjusting(null);
        setAdjustValue('');
        // Refresh stocks
        const res = await fetch('/api/manufacturing/all-tank-stock');
        const d = await res.json();
        setStocks(d.success ? d.data : []);
      } else toast.error(data.error);
    } catch (error) {
      toast.error('Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = async (tank) => {
    try {
      setHistoryTank(tank);
      setLoadingHistory(true);
      const res = await fetch(`/api/manufacturing/all-tank-stock/adjust?tank_id=${tank.tank_id}`);
      const data = await res.json();
      setTankHistory(data.success ? data.data : []);
    } catch (error) {
      toast.error('History load failed');
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredStocks = (stocks || []).filter(stock => 
    stock?.tank_name?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    );
  }

  const AdjustForm = ({ tankId, unit, type }) => (
    <div className="flex items-center gap-1 bg-white border border-blue-100 rounded-lg p-0.5 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200">
      <input
        autoFocus
        type="number"
        placeholder="Qty"
        value={adjustValue}
        onChange={(e) => setAdjustValue(e.target.value)}
        className="w-16 px-2 py-1 text-[10px] font-bold outline-none border-none bg-transparent"
      />
      <button
        disabled={submitting}
        onClick={handleAdjust}
        className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? <FaSpinner className="animate-spin" size={8} /> : <FaCheck size={8} />}
      </button>
      <button
        onClick={() => { setAdjusting(null); setAdjustValue(''); }}
        className="p-1.5 bg-slate-100 text-slate-400 rounded-md hover:bg-slate-200"
      >
        <FaTimes size={8} />
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-8 pb-32">
          <div className="max-w-6xl mx-auto">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tank Inventory</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Stock Intelligence</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search tanks..." 
                    className="pl-11 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all w-full md:w-64 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Link 
                  href="/manufacturing/add-tank-stock" 
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 flex items-center gap-2 active:scale-95 transition-all whitespace-nowrap"
                >
                  <FaPlus /> Add Stock
                </Link>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
               {[
                  { label: 'Total Tanks', value: stocks.length, icon: FaWarehouse, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Low Stock', value: stocks.filter(s => parseFloat(s.kg_stock) < 1000).length, icon: FaMinus, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Operational', value: stocks.filter(s => s.tank_type !== 'Static').length, icon: FaSync, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Critical', value: stocks.filter(s => parseFloat(s.kg_stock) === 0).length, icon: FaVial, color: 'text-orange-600', bg: 'bg-orange-50' },
               ].map((stat, i) => (
                  <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                     <div className={`w-8 h-8 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                        <stat.icon size={12} />
                     </div>
                     <p className="text-[18px] font-black text-slate-900">{stat.value}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  </div>
               ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-slate-50 shadow-sm"></div>
                ))}
              </div>
            ) : filteredStocks.length === 0 ? (
               <div className="py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                  <FaWarehouse className="text-slate-100 text-7xl mx-auto mb-6" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No tank stock found</p>
               </div>
            ) : (
              <div className="overflow-hidden bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tank Identity</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock Weight (KG)</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock Volume (LTR)</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                          {filteredStocks.map((stock) => {
                            const kgStock = parseFloat(stock.kg_stock || 0);
                            const litreStock = parseFloat(stock.litre_stock || 0);

                            return (
                              <tr key={stock.tank_id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg shadow-slate-200">
                                         {stock.tank_name?.[0]}
                                      </div>
                                      <div>
                                         <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{stock.tank_name}</div>
                                         <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: #{stock.tank_id}</div>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <span className="text-[11px] font-black text-slate-900 min-w-[60px]">{kgStock.toLocaleString()} KG</span>
                                      {adjusting?.tank_id === stock.tank_id && adjusting?.unit === 'KG' ? (
                                         <AdjustForm tankId={stock.tank_id} unit="KG" type={adjusting.type} />
                                      ) : (
                                         <div className="flex items-center gap-1.5">
                                            <button 
                                               onClick={() => setAdjusting({ tank_id: stock.tank_id, unit: 'KG', type: 'Addition' })}
                                               className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                                            >
                                               <FaPlus size={9} />
                                            </button>
                                            <button 
                                               onClick={() => setAdjusting({ tank_id: stock.tank_id, unit: 'KG', type: 'Deduction' })}
                                               className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90"
                                            >
                                               <FaMinus size={9} />
                                            </button>
                                         </div>
                                      )}
                                   </div>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <span className="text-[11px] font-black text-slate-900 min-w-[70px]">{litreStock.toLocaleString()} LTR</span>
                                      {adjusting?.tank_id === stock.tank_id && adjusting?.unit === 'LTR' ? (
                                         <AdjustForm tankId={stock.tank_id} unit="LTR" type={adjusting.type} />
                                      ) : (
                                         <div className="flex items-center gap-1.5">
                                            <button 
                                               onClick={() => setAdjusting({ tank_id: stock.tank_id, unit: 'LTR', type: 'Addition' })}
                                               className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                                            >
                                               <FaPlus size={9} />
                                            </button>
                                            <button 
                                               onClick={() => setAdjusting({ tank_id: stock.tank_id, unit: 'LTR', type: 'Deduction' })}
                                               className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90"
                                            >
                                               <FaMinus size={9} />
                                            </button>
                                         </div>
                                      )}
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-center space-x-2">
                                   <button 
                                      onClick={() => fetchHistory(stock)}
                                      className="text-[9px] font-black text-slate-400 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-100 transition-all uppercase tracking-widest"
                                   >
                                      History
                                   </button>
                                   <Link 
                                      href={`/manufacturing/tank-allocation?tankId=${stock.tank_id}`}
                                      className="text-[9px] font-black text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-100 transition-all uppercase tracking-widest"
                                   >
                                      Details
                                   </Link>
                                </td>
                              </tr>
                            );
                          })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* History Modal */}
          {historyTank && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">{historyTank.tank_name} - Activity Log</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete Stock Audit History</p>
                  </div>
                  <button 
                    onClick={() => setHistoryTank(null)}
                    className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                  {loadingHistory ? (
                    <div className="py-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>
                  ) : tankHistory.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No activity recorded yet</div>
                  ) : (
                    <div className="space-y-3">
                      {tankHistory.map((log) => (
                        <div key={log.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            log.type === 'Addition' ? 'bg-emerald-50 text-emerald-600' : 
                            log.type === 'Deduction' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {log.type === 'Addition' ? <FaPlus /> : log.type === 'Deduction' ? <FaMinus /> : <FaSync />}
                          </div>
                          <div className="flex-1 grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-[8px] font-black text-slate-300 uppercase">Movement</p>
                              <p className="text-[10px] font-black text-slate-700">{log.type}</p>
                              <p className="text-[8px] font-bold text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-300 uppercase">Amount</p>
                              <p className="text-[10px] font-black text-slate-900">
                                {parseFloat(log.kg_qty) > 0 ? `${log.kg_qty} KG` : `${log.litre_qty} LTR`}
                              </p>
                              <p className="text-[8px] font-medium text-slate-400 italic">"{log.remarks}"</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-black text-slate-300 uppercase">Balance Flow</p>
                              <div className="flex items-center justify-end gap-2 text-[10px] font-black">
                                <span className="text-slate-400">{parseFloat(log.kg_qty) > 0 ? log.kg_before : log.litre_before}</span>
                                <FaArrowRight size={8} className="text-slate-300" />
                                <span className="text-slate-900">{parseFloat(log.kg_qty) > 0 ? log.kg_after : log.litre_after}</span>
                              </div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{parseFloat(log.kg_qty) > 0 ? 'KG' : 'LTR'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                  <button 
                    onClick={() => setHistoryTank(null)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
        
            {/* Footer */}
            <div className="bg-[#F8FAFF] py-6 border-t border-slate-100">
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
