'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FaArrowLeft, FaPlus, FaMinus, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaSpinner, FaInfoCircle
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function AddTankStockContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [selectedTankId, setSelectedTankId] = useState(searchParams.get('tankId') || '');
  const [kgQty, setKgQty] = useState('');
  const [litreQty, setLitreQty] = useState('');
  const [remarks, setRemarks] = useState('');
  const [operationType, setOperationType] = useState(searchParams.get('type') || 'plus');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const tid = searchParams.get('tankId');
    const otype = searchParams.get('type');
    if (tid) setSelectedTankId(tid);
    if (otype) setOperationType(otype);
  }, [searchParams]);

  useEffect(() => {
    const fetchTanks = async () => {
      try {
        const response = await fetch('/api/manufacturing/tanks');
        const data = await response.json();
        setTanks(data);
      } catch (error) {
        toast.error('Failed to load tanks');
      } finally {
        setLoading(false);
      }
    };
    if (mounted) fetchTanks();
  }, [mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTankId) return toast.error('Select a tank');
    if (!kgQty && !litreQty) return toast.error('Enter quantity');

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/stock-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tank_id: selectedTankId,
          kg_qty: kgQty,
          litre_qty: litreQty,
          operation_type: operationType,
          remarks: remarks
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Submitted');
        setTimeout(() => router.push('/manufacturing/tank-stock-requests'), 1500);
      } else toast.error(data.error || 'Failed');
    } catch (error) {
      toast.error('Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

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
                  <button onClick={() => router.back()} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 shadow-sm active:scale-95 transition-all">
                     <FaArrowLeft size={12} />
                  </button>
                  <div>
                     <h1 className="text-xl font-black text-slate-900 tracking-tight">Stock Request</h1>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjustment Protocol</p>
                  </div>
               </div>
               <Link href="/manufacturing/tank-stock-requests" className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-blue-100 shadow-sm">
                  <FaClipboardList /> History
               </Link>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-6 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                     <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Select Asset</label>
                        <select
                          value={selectedTankId}
                          onChange={(e) => setSelectedTankId(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm shadow-inner appearance-none"
                        >
                          <option value="">-- Choose Tank --</option>
                          {tanks.map(tank => (
                            <option key={tank.id} value={tank.id}>{tank.name}</option>
                          ))}
                        </select>
                     </div>

                     <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Adjustment Type</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button
                             type="button" onClick={() => setOperationType('plus')}
                             className={`py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                               operationType === 'plus' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                             }`}
                           >
                             <FaPlus /> Stock In
                           </button>
                           <button
                             type="button" onClick={() => setOperationType('minus')}
                             className={`py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                               operationType === 'minus' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                             }`}
                           >
                             <FaMinus /> Stock Out
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Weight (KG)</label>
                           <div className="relative">
                              <input
                                type="number" step="0.01" value={kgQty} onChange={(e) => setKgQty(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm"
                                placeholder="0.00"
                              />
                              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 tracking-tighter">KG</span>
                           </div>
                        </div>
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Volume (LTR)</label>
                           <div className="relative">
                              <input
                                type="number" step="0.01" value={litreQty} onChange={(e) => setLitreQty(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm"
                                placeholder="0.00"
                              />
                              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 tracking-tighter">LTR</span>
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Internal Notes</label>
                        <textarea
                          value={remarks} onChange={(e) => setRemarks(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all h-24 resize-none font-medium text-sm"
                          placeholder="Purpose of adjustment..."
                        />
                     </div>

                     <button
                       type="submit" disabled={isSubmitting}
                       className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                     >
                       {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-emerald-400" />}
                       Submit Request
                     </button>
                  </form>
               </div>
               
               <div className="bg-blue-50/50 p-6 flex items-center gap-4 border-t border-blue-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                     <FaClock size={16} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Protocol Notice</p>
                     <p className="text-[9px] font-medium text-blue-700 mt-1 leading-relaxed">Inventory will only update after Admin approval in Stock Requests.</p>
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

export default function AddTankStockPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <AddTankStockContent />
    </Suspense>
  );
}
