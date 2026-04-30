'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaPlus, FaHistory, FaWarehouse, FaSync, 
  FaClipboardList, FaSpinner, FaCheckCircle, FaTools, FaFileAlt, FaBalanceScale
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function AddTankStockContent() {
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [selectedTank, setSelectedTank] = useState('');
  const [kgQty, setKgQty] = useState('');
  const [litreQty, setLitreQty] = useState('');
  const [type, setType] = useState('Purchase');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const fetchTanks = async () => {
      try {
        const response = await fetch('/api/manufacturing/tanks');
        const data = await response.json();
        setTanks(data);
      } catch (error) {
        toast.error('Sync failed');
      } finally {
        setLoading(false);
      }
    };
    fetchTanks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTank) return toast.error('Please select a tank');
    if (!kgQty && !litreQty) return toast.error('Please enter quantity');

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/all-tank-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tank_id: selectedTank,
          kg_qty: kgQty,
          litre_qty: litreQty,
          type: type,
          remarks: remarks
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Stock request submitted for approval');
        router.push('/manufacturing/tank-stock-requests');
      } else {
        toast.error(data.error || 'Failed to add stock');
      }
    } catch (error) {
      toast.error('Network error');
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
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-8 pb-48">
          <div className="max-w-2xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div className="flex items-center gap-4">
                  <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                     <FaArrowLeft size={14} />
                  </button>
                  <div>
                     <h1 className="text-xl font-black text-slate-900 tracking-tight">Add Inventory</h1>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Inbound Protocol</p>
                  </div>
               </div>
               <Link href="/manufacturing/all-tank-stock" className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-blue-100 shadow-sm">
                  <FaWarehouse /> View Stock
               </Link>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-6 sm:p-10">
                  <form onSubmit={handleSubmit} className="space-y-8">
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Target Tank / Reservoir</label>
                        <select 
                           value={selectedTank} 
                           onChange={(e) => setSelectedTank(e.target.value)}
                           className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm appearance-none shadow-inner"
                        >
                           <option value="">-- Select Active Tank --</option>
                           {tanks.map(tank => (
                              <option key={tank.id} value={tank.id}>{tank.name} ({tank.unit || 'KG/LTR'})</option>
                           ))}
                        </select>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Stock Weight (KG)</label>
                           <div className="relative">
                              <input 
                                 type="number" step="0.01" value={kgQty} onChange={(e) => setKgQty(e.target.value)}
                                 className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm shadow-inner"
                                 placeholder="0.00"
                              />
                              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">KG</span>
                           </div>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Stock Volume (LTR)</label>
                           <div className="relative">
                              <input 
                                 type="number" step="0.01" value={litreQty} onChange={(e) => setLitreQty(e.target.value)}
                                 className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm shadow-inner"
                                 placeholder="0.00"
                              />
                              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">LTR</span>
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Transaction Category</label>
                        <div className="grid grid-cols-3 gap-3">
                           {['Purchase', 'Internal', 'Adjustment'].map(cat => (
                              <button 
                                 key={cat} type="button" onClick={() => setType(cat)}
                                 className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    type === cat ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                 }`}
                              >
                                 {cat}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Batch Remarks / Notes</label>
                        <textarea 
                           value={remarks} onChange={(e) => setRemarks(e.target.value)}
                           className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all h-28 resize-none font-medium text-sm shadow-inner"
                           placeholder="Enter procurement details or adjustment reason..."
                        />
                     </div>

                     <button 
                        type="submit" disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                     >
                        {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-blue-300" />}
                        Commit Stock Entry
                     </button>
                  </form>
               </div>

               <div className="bg-slate-50 p-6 flex items-center gap-4 border-t border-slate-100">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                     <FaBalanceScale size={18} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Protocol</p>
                     <p className="text-[11px] font-bold text-slate-600 mt-0.5">Entries require Lab/Admin approval before updating inventory levels.</p>
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
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    }>
      <AddTankStockContent />
    </Suspense>
  );
}
