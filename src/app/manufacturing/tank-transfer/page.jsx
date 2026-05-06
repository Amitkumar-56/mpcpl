'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaExchangeAlt, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaArrowRight, FaSpinner, FaTools, 
  FaSync, FaDatabase, FaShieldAlt, FaHistory, FaLongArrowAltRight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TankTransferContent() {
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [fromTankId, setFromTankId] = useState('');
  const [toTankId, setToTankId] = useState('');
  const [kgQty, setKgQty] = useState('');
  const [litreQty, setLitreQty] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchTanks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/tanks');
      const data = await response.json();
      setTanks(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    setMounted(true);
    fetchTanks(); 
  }, [fetchTanks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromTankId || !toTankId) return toast.error('Select both source and destination tanks');
    if (fromTankId === toTankId) return toast.error('Source and destination cannot be the same');
    if (!kgQty && !litreQty) return toast.error('Please enter either KG or Litre quantity');

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/tank-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_tank_id: fromTankId,
          to_tank_id: toTankId,
          kg_qty: kgQty || 0,
          litre_qty: litreQty || 0,
          remarks: remarks
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Transfer request submitted successfully!');
        setTimeout(() => router.push('/manufacturing/tank-transfer-history'), 1500);
      } else {
        toast.error(data.error || 'Failed to submit transfer');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return null; // Page shell handled by Suspense or higher level
  }

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8 pb-64 relative">
          {/* Background Decorative Elements */}
          <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

          <div className="max-w-4xl mx-auto">
            {/* Breadcrumbs / Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
              <div className="animate-in fade-in slide-in-from-left duration-700">
                <div className="flex items-center gap-3 text-blue-600 font-bold text-[10px] uppercase tracking-[0.3em] mb-3">
                  <div className="w-6 h-[2px] bg-blue-600"></div>
                  <span>Internal Logistics</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Tank <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Transfer</span>
                </h1>
                <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed max-w-md">
                  Execute secure inventory movements between storage assets with real-time validation and history tracking.
                </p>
              </div>

              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-700">
                <Link href="/manufacturing/tank-transfer-history" className="flex items-center justify-center gap-2 bg-white text-slate-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100 shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:translate-y-0">
                   <FaHistory className="text-blue-600" /> Transfer Log
                </Link>
                <button 
                  onClick={fetchTanks} 
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-xl shadow-slate-200/50 transition-all flex items-center justify-center group"
                >
                  <FaSync className={`group-hover:rotate-180 transition-transform duration-700 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
              <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-white overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="p-5 sm:p-8 lg:p-12">
                  <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Tank Selection Logic - Visualized Flow */}
                    <div className="relative">
                      <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4">
                        {/* Source Tank Selection */}
                        <div className="md:col-span-5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Source Origin</label>
                          <div className="relative group/select">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-focus-within/select:bg-blue-600 group-focus-within/select:text-white transition-all">
                              <FaWarehouse size={12} />
                            </div>
                            <select 
                              value={fromTankId} 
                              onChange={(e) => setFromTankId(e.target.value)} 
                              disabled={loading} 
                              className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all font-bold text-slate-700 appearance-none shadow-inner"
                            >
                              <option value="">Select Source Tank</option>
                              {tanks.map(t => (
                                <option key={t.id} value={t.id} disabled={t.id === toTankId}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Animated Transfer Arrow */}
                        <div className="md:col-span-1 flex justify-center py-4 md:py-0">
                          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shadow-inner group transition-transform hover:scale-110">
                            <FaLongArrowAltRight className="rotate-90 md:rotate-0" size={20} />
                          </div>
                        </div>

                        {/* Destination Tank Selection */}
                        <div className="md:col-span-5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Target Destination</label>
                          <div className="relative group/select">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-focus-within/select:bg-indigo-600 group-focus-within/select:text-white transition-all">
                              <FaDatabase size={12} />
                            </div>
                            <select 
                              value={toTankId} 
                              onChange={(e) => setToTankId(e.target.value)} 
                              disabled={loading} 
                              className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 outline-none transition-all font-bold text-slate-700 appearance-none shadow-inner"
                            >
                              <option value="">Select Target Tank</option>
                              {tanks.map(t => (
                                <option key={t.id} value={t.id} disabled={t.id === fromTankId}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="group/field">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Transfer Weight (KG)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={kgQty} 
                            onChange={(e) => setKgQty(e.target.value)} 
                            className="w-full px-6 py-5 rounded-2xl bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700" 
                            placeholder="0.00" 
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                             <div className="w-[1px] h-6 bg-slate-200 mr-2"></div>
                             <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">KG</span>
                          </div>
                        </div>
                      </div>
                      <div className="group/field">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Transfer Volume (LTR)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={litreQty} 
                            onChange={(e) => setLitreQty(e.target.value)} 
                            className="w-full px-6 py-5 rounded-2xl bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700" 
                            placeholder="0.00" 
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                             <div className="w-[1px] h-6 bg-slate-200 mr-2"></div>
                             <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">LTR</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Remarks Section */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Internal Remarks & Notes</label>
                      <textarea 
                        value={remarks} 
                        onChange={(e) => setRemarks(e.target.value)} 
                        className="w-full px-6 py-5 rounded-2xl bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all h-32 resize-none font-medium text-slate-600 shadow-inner" 
                        placeholder="Provide details about the reason for this inventory movement..." 
                      />
                    </div>

                    {/* Action Button */}
                    <button 
                      type="submit" 
                      disabled={isSubmitting || loading} 
                      className="group/btn w-full bg-slate-900 hover:bg-black text-white py-6 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-300 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
                    >
                      {isSubmitting ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <FaExchangeAlt className="group-hover/btn:rotate-180 transition-transform duration-700" />
                          <span>Initiate Transfer Sequence</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
                
                {/* Information Footer */}
                <div className="bg-blue-600 p-8 flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <FaShieldAlt size={20} className="animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-blue-100 uppercase tracking-[0.2em]">Compliance Protocol</p>
                    <p className="text-xs font-medium text-white/80 mt-1 leading-relaxed">This transfer will require administrative authorization. Inventory balances will be synchronized across source and destination nodes upon approval.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        {/* Footer Area */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
           <Footer />
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function TankTransferPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    }>
      <TankTransferContent />
    </Suspense>
  );
}
