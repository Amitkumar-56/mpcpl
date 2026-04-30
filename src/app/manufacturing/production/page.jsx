'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaFlask, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaPlus, FaTrash, FaBoxOpen,
  FaVial, FaHistory, FaSpinner, FaMicrochip, FaTools
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function ProductionEntryContent() {
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [fromTankId, setFromTankId] = useState('');
  const [kgInput, setKgInput] = useState('');
  const [litreInput, setLitreInput] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('Process');
  const [outputs, setOutputs] = useState([{ to_tank_id: '', kg_output: '', litre_output: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchTanks = async () => {
      try {
        const response = await fetch('/api/manufacturing/tanks');
        const data = await response.json();
        setTanks(data);
      } catch (error) {
        toast.error('Sync error');
      } finally {
        setLoading(false);
      }
    };
    if (mounted) fetchTanks();
  }, [mounted]);

  const addOutputField = () => {
    setOutputs([...outputs, { to_tank_id: '', kg_output: '', litre_output: '' }]);
  };

  const removeOutputField = (index) => {
    if (outputs.length === 1) return;
    setOutputs(outputs.filter((_, i) => i !== index));
  };

  const handleOutputChange = (index, field, value) => {
    const newOutputs = [...outputs];
    newOutputs[index][field] = value;
    setOutputs(newOutputs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromTankId || (!kgInput && !litreInput)) return toast.error('Source & Qty Required');
    const validOutputs = outputs.filter(out => out.to_tank_id && (out.kg_output || out.litre_output));
    if (validOutputs.length === 0) return toast.error('Add at least one output');

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_tank_id: fromTankId, kg_input: kgInput, litre_input: litreInput, outputs: validOutputs, remarks, status }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Batch ${status}`);
        router.push('/manufacturing/production-history');
      } else toast.error(data.error || 'Failed');
    } catch (error) {
      toast.error('Network error');
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
          <div className="max-w-4xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Production Entry</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conversion Protocol</p>
               </div>
               <Link href="/manufacturing/production-history" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
                  <FaHistory /> Batch Logs
               </Link>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
               {/* Left: Input & Outputs */}
               <div className="lg:col-span-8 space-y-6">
                  {/* Source Tank */}
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 sm:p-8">
                     <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                           <FaWarehouse size={14} />
                        </div>
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Source Integration</h2>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Origin Tank</label>
                           <select value={fromTankId} onChange={(e) => setFromTankId(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm appearance-none shadow-inner">
                              <option value="">-- Select Source Tank --</option>
                              {tanks.map(t => (
                                 <option key={t.id} value={t.id}>
                                    {t.name} {t.unit ? `(${t.unit})` : ''}
                                 </option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Input Weight (KG)</label>
                           <input type="number" step="0.01" value={kgInput} onChange={(e) => setKgInput(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black text-lg focus:bg-white focus:border-blue-400 outline-none transition-all shadow-inner" placeholder="0.00" />
                        </div>
                        <div>
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Input Volume (LTR)</label>
                           <input type="number" step="0.01" value={litreInput} onChange={(e) => setLitreInput(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black text-lg focus:bg-white focus:border-blue-400 outline-none transition-all shadow-inner" placeholder="0.00" />
                        </div>
                     </div>
                  </div>

                  {/* Outputs */}
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 sm:p-8">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                              <FaFlask size={14} />
                           </div>
                           <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Yield Diversification</h2>
                        </div>
                        <button type="button" onClick={addOutputField} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-100 hover:scale-105 transition-all">
                           Add Stream
                        </button>
                     </div>

                     <div className="space-y-4">
                        {outputs.map((out, index) => (
                           <div key={index} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-end animate-in slide-in-from-top-2">
                              <div className="flex-1 w-full">
                                 <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1 block">Destination</label>
                                 <select value={out.to_tank_id} onChange={(e) => handleOutputChange(index, 'to_tank_id', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-xs outline-none shadow-sm">
                                    <option value="">-- Choose Tank --</option>
                                    {tanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                 </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                                 <div className="w-full sm:w-24">
                                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1 block">KG</label>
                                    <input type="number" step="0.01" value={out.kg_output} onChange={(e) => handleOutputChange(index, 'kg_output', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 font-black text-xs outline-none shadow-sm" placeholder="0" />
                                 </div>
                                 <div className="w-full sm:w-24">
                                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1 block">LTR</label>
                                    <input type="number" step="0.01" value={out.litre_output} onChange={(e) => handleOutputChange(index, 'litre_output', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 font-black text-xs outline-none shadow-sm" placeholder="0" />
                                 </div>
                              </div>
                              <button type="button" onClick={() => removeOutputField(index)} className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-100 active:scale-90 transition-all shrink-0">
                                 <FaTrash size={12} />
                              </button>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Right: Controls */}
               <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 sticky top-4">
                     <div className="mb-6">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Batch Execution</label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-2xl">
                           <button type="button" onClick={() => setStatus('Draft')} className={`py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${status === 'Draft' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Draft</button>
                           <button type="button" onClick={() => setStatus('Process')} className={`py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${status === 'Process' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>Process</button>
                        </div>
                     </div>

                     <div className="mb-6">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block">Batch Remarks</label>
                        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 h-24 resize-none font-medium text-xs text-slate-700 outline-none focus:bg-white transition-all shadow-inner" placeholder="Conversion notes..." />
                     </div>

                     <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 mb-8">
                        <div className="flex items-center gap-2 text-blue-800 mb-1">
                           <FaVial size={12} />
                           <span className="text-[9px] font-black uppercase tracking-widest tracking-widest">Lab Integration</span>
                        </div>
                        <p className="text-[9px] font-medium text-blue-600 leading-relaxed">Branch codes will be auto-assigned by the Lab System during processing.</p>
                     </div>

                     <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                        {isSubmitting ? <FaSpinner className="animate-spin" /> : status === 'Process' ? <><FaCheckCircle className="text-emerald-400" /> Deploy Batch</> : <><FaBoxOpen className="text-blue-400" /> Save Draft</>}
                     </button>
                  </div>
               </div>
            </form>
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

export default function ProductionEntryPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <ProductionEntryContent />
    </Suspense>
  );
}
