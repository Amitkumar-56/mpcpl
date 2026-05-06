'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaWarehouse, FaSpinner, FaCheckCircle, 
  FaPlus, FaGasPump, FaHistory, FaBoxOpen, FaShieldAlt
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
    if (!selectedTank) return toast.error('Please select a target tank');
    if (!kgQty && !litreQty) return toast.error('Please enter either KG or Litre quantity');

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/all-tank-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tank_id: selectedTank,
          kg_qty: kgQty || 0,
          litre_qty: litreQty || 0
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Stock entry submitted for approval');
        setTimeout(() => router.push('/manufacturing/tank-stock-requests'), 1500);
      } else {
        toast.error(data.error || 'Failed to add stock');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8 pb-64 relative">
          {/* Background Decorative Blurs */}
          <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
              <div className="animate-in fade-in slide-in-from-left duration-700">
                <div className="flex items-center gap-3 text-blue-600 font-bold text-[10px] uppercase tracking-[0.3em] mb-3">
                  <div className="w-6 h-[2px] bg-blue-600"></div>
                  <span>Stock Inbound Protocol</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Add Tank <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Inventory</span>
                </h1>
                <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed max-w-md">
                  Initialize fresh stock entries into manufacturing reservoirs with secure validation and approval workflows.
                </p>
              </div>

              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-700">
                <Link href="/manufacturing/all-tank-stock" className="flex items-center justify-center gap-2 bg-white text-slate-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100 shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:translate-y-0">
                   <FaWarehouse className="text-blue-600" /> All Stock
                </Link>
                <Link href="/manufacturing/tank-stock-requests" className="flex items-center justify-center gap-2 bg-white text-slate-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100 shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:translate-y-0">
                   <FaHistory className="text-emerald-600" /> Requests
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-white overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="p-6 sm:p-10 lg:p-12">
                  <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Tank Selection */}
                    <div className="group/field">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Target Reservoir / Storage Unit</label>
                      <div className="relative group/select">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-focus-within/select:bg-blue-600 group-focus-within/select:text-white transition-all">
                          <FaGasPump size={14} />
                        </div>
                        <select 
                          value={selectedTank} 
                          onChange={(e) => setSelectedTank(e.target.value)}
                          disabled={loading}
                          className="w-full pl-20 pr-6 py-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all font-bold text-slate-700 appearance-none shadow-inner text-base"
                        >
                          <option value="">Select Target Tank</option>
                          {tanks.map(tank => (
                            <option key={tank.id} value={tank.id}>
                              {tank.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quantity Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="group/field">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Stock Weight (KG)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={kgQty} 
                            onChange={(e) => setKgQty(e.target.value)}
                            className="w-full px-8 py-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700 text-lg"
                            placeholder="0.00"
                          />
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
                             <div className="w-[1px] h-8 bg-slate-200 mr-2"></div>
                             <span className="text-xs font-black text-slate-400 tracking-widest uppercase">KG</span>
                          </div>
                        </div>
                      </div>
                      <div className="group/field">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Stock Volume (LTR)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={litreQty} 
                            onChange={(e) => setLitreQty(e.target.value)}
                            className="w-full px-8 py-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700 text-lg"
                            placeholder="0.00"
                          />
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
                             <div className="w-[1px] h-8 bg-slate-200 mr-2"></div>
                             <span className="text-xs font-black text-slate-400 tracking-widest uppercase">LTR</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                      type="submit" 
                      disabled={isSubmitting || loading}
                      className="group/btn w-full bg-slate-900 hover:bg-black text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-300 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
                    >
                      {isSubmitting ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <FaBoxOpen className="group-hover/btn:scale-125 transition-transform" />
                          <span>Commit Stock Entry</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Footer Alert Block */}
                <div className="bg-emerald-600 p-10 flex flex-col md:flex-row md:items-center gap-8">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <FaShieldAlt size={28} className="animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-emerald-100 uppercase tracking-[0.3em]">Integrity Protocol Active</p>
                    <p className="text-sm font-medium text-white/80 mt-2 leading-relaxed">All inbound stock movements are logged and require supervisor verification. Stock balances will update immediately upon authorization.</p>
                  </div>
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

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
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
