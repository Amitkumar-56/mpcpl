'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaExchangeAlt, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaArrowRight, FaSpinner, FaTools, FaSync
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
    if (!fromTankId || !toTankId) return toast.error('Select both tanks');
    if (fromTankId === toTankId) return toast.error('Same source and destination');
    if (!kgQty && !litreQty) return toast.error('Enter quantity');

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/tank-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_tank_id: fromTankId,
          to_tank_id: toTankId,
          kg_qty: kgQty,
          litre_qty: litreQty,
          remarks: remarks
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Submitted');
        setTimeout(() => router.push('/manufacturing/tank-transfer-history'), 1500);
      } else toast.error(data.error || 'Failed');
    } catch (error) {
      toast.error('Error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-48">
          <div className="max-w-xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div className="flex items-center gap-4">
                  <button onClick={() => router.back()} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 shadow-sm transition-all">
                     <FaArrowLeft size={12} />
                  </button>
                  <div>
                     <h1 className="text-xl font-black text-slate-900 tracking-tight">Tank Transfer</h1>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Logistics</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <Link href="/manufacturing/tank-transfer-history" className="flex items-center justify-center gap-2 bg-amber-50 text-amber-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-amber-100 shadow-sm">
                    <FaClipboardList /> History
                 </Link>
                 <button onClick={fetchTanks} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
                    <FaSync size={12} className={loading ? 'animate-spin' : ''} />
                 </button>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-6 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                     <div className="grid grid-cols-1 gap-6">
                        {/* Source Tank */}
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Source Tank</label>
                           <select value={fromTankId} onChange={(e) => setFromTankId(e.target.value)} disabled={loading} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm appearance-none shadow-inner">
                              <option value="">-- Select Origin --</option>
                              {tanks.map(t => <option key={t.id} value={t.id} disabled={t.id === toTankId}>{t.name} {t.unit ? `(${t.unit})` : ''}</option>)}
                           </select>
                        </div>

                        {/* Transfer Icon for mobile stacking */}
                        <div className="flex justify-center -my-2 text-slate-200">
                           <FaArrowRight className="rotate-90 sm:rotate-0" />
                        </div>

                        {/* Destination Tank */}
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Destination Tank</label>
                           <select value={toTankId} onChange={(e) => setToTankId(e.target.value)} disabled={loading} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm appearance-none shadow-inner">
                              <option value="">-- Select Destination --</option>
                              {tanks.map(t => <option key={t.id} value={t.id} disabled={t.id === fromTankId}>{t.name} {t.unit ? `(${t.unit})` : ''}</option>)}
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Weight (KG)</label>
                           <div className="relative">
                              <input type="number" step="0.01" value={kgQty} onChange={(e) => setKgQty(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm" placeholder="0.00" />
                              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 tracking-tighter">KG</span>
                           </div>
                        </div>
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Volume (LTR)</label>
                           <div className="relative">
                              <input type="number" step="0.01" value={litreQty} onChange={(e) => setLitreQty(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm" placeholder="0.00" />
                              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 tracking-tighter">LTR</span>
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Transfer Remarks</label>
                        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all h-24 resize-none font-medium text-sm shadow-inner" placeholder="Reason for transfer..." />
                     </div>

                     <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                        {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-emerald-400" />}
                        Submit Transfer Request
                     </button>
                  </form>
               </div>
               
               <div className="bg-amber-50/50 p-6 flex items-center gap-4 border-t border-amber-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                     <FaClock size={16} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Adjustment Protocol</p>
                     <p className="text-[9px] font-medium text-amber-700 mt-1 leading-relaxed">Inventory will update in both tanks after admin approval in Transfer History.</p>
                  </div>
               </div>
            </div>
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

export default function TankTransferPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <TankTransferContent />
    </Suspense>
  );
}
