'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaVial, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaPlus, FaTrash, FaBoxOpen,
  FaSpinner, FaSync, FaTint, FaWeight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function BatchEntryContent() {
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [batchName, setBatchName] = useState('');
  const [destinationTankId, setDestinationTankId] = useState('');
  const [outputKg, setOutputKg] = useState('');
  const [outputLitre, setOutputLitre] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Single raw material input by default, can add more
  const [inputs, setInputs] = useState([{ raw_material_id: '', input_kg: '', input_litre: '' }]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tanksRes, rawMaterialsRes] = await Promise.all([
        fetch('/api/manufacturing/tanks'),
        fetch('/api/manufacturing/raw-materials-other')
      ]);
      
      const tanksData = await tanksRes.json();
      const rawMaterialsData = await rawMaterialsRes.json();
      
      setTanks(Array.isArray(tanksData) ? tanksData : []);
      setRawMaterials(Array.isArray(rawMaterialsData) ? rawMaterialsData : []);
    } catch (error) {
      toast.error('Failed to sync data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    setMounted(true);
    fetchData(); 
  }, [fetchData]);

  const addInputField = () => {
    setInputs([...inputs, { raw_material_id: '', input_kg: '', input_litre: '' }]);
  };

  const removeInputField = (index) => {
    if (inputs.length === 1) return;
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleInputChange = (index, field, value) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!batchName) return toast.error('Batch Name is required');
    if (!destinationTankId) return toast.error('Destination Tank is required');
    if (!outputKg && !outputLitre) return toast.error('Output Quantity is required');
    
    const validInputs = inputs.filter(inp => inp.raw_material_id && (inp.input_kg || inp.input_litre));
    if (validInputs.length === 0) return toast.error('Add at least one raw material input');

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/batch-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          batch_name: batchName,
          destination_tank_id: destinationTankId,
          output_kg: outputKg,
          output_litre: outputLitre,
          remarks,
          inputs: validInputs 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Batch created successfully');
        // Reset form
        setBatchName('');
        setDestinationTankId('');
        setOutputKg('');
        setOutputLitre('');
        setRemarks('');
        setInputs([{ raw_material_id: '', input_kg: '', input_litre: '' }]);
      } else {
        toast.error(data.error || 'Failed to create batch');
      }
    } catch (error) {
      toast.error('Network error while creating batch');
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-8 pb-48">
          <div className="max-w-5xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                     <FaVial className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Batch Creation</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Raw Material to Finished Good</p>
                  </div>
               </div>
               <div className="flex gap-3">
                 <button onClick={fetchData} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2 font-bold text-xs uppercase">
                    <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
                 </button>
               </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
               
               {/* Left Column: Raw Materials */}
               <div className="lg:col-span-7 space-y-6">
                  
                  {/* Batch Details */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                     <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                           <FaClipboardList size={18} />
                        </div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Batch Information</h2>
                     </div>
                     
                     <div className="space-y-5">
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Batch Name</label>
                           <input type="text" required value={batchName} onChange={(e) => setBatchName(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-sm" placeholder="e.g. Morning Batch A" />
                        </div>
                     </div>
                  </div>

                  {/* Raw Material Inputs */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                              <FaBoxOpen size={18} />
                           </div>
                           <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Raw Materials Used</h2>
                        </div>
                        <button type="button" onClick={addInputField} className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                           <FaPlus /> Add Material
                        </button>
                     </div>

                     <div className="space-y-4">
                        {inputs.map((inp, index) => (
                           <div key={index} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-end animate-in slide-in-from-top-2 shadow-sm relative group">
                              <div className="flex-1 w-full">
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Source Material</label>
                                 <select required value={inp.raw_material_id} onChange={(e) => handleInputChange(index, 'raw_material_id', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 outline-none focus:border-emerald-400 shadow-sm transition-all">
                                    <option value="">-- Select Material --</option>
                                    {rawMaterials.map(rm => (
                                      <option key={rm.id} value={rm.id}>
                                        {rm.name} (Stock: {rm.stock_kg} KG / {rm.stock_litre} LTR)
                                      </option>
                                    ))}
                                 </select>
                              </div>
                              <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                                 <div className="w-full sm:w-28">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1"><FaWeight className="text-slate-400" /> KG</label>
                                    <input type="number" step="0.01" value={inp.input_kg} onChange={(e) => handleInputChange(index, 'input_kg', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 font-black text-sm outline-none focus:border-emerald-400 shadow-sm transition-all" placeholder="0.00" />
                                 </div>
                                 <div className="w-full sm:w-28">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1"><FaTint className="text-slate-400" /> LTR</label>
                                    <input type="number" step="0.01" value={inp.input_litre} onChange={(e) => handleInputChange(index, 'input_litre', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 font-black text-sm outline-none focus:border-emerald-400 shadow-sm transition-all" placeholder="0.00" />
                                 </div>
                              </div>
                              <button type="button" onClick={() => removeInputField(index)} className="w-12 h-12 bg-white border border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center shadow-sm transition-all shrink-0">
                                 <FaTrash size={14} />
                              </button>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Right Column: Destination & Output */}
               <div className="lg:col-span-5 space-y-6">
                  
                  <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-100 sticky top-4">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                           <FaWarehouse size={18} />
                        </div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Finished Goods Output</h2>
                     </div>

                     <div className="space-y-6">
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Destination Tank / Tanker</label>
                           <select required value={destinationTankId} onChange={(e) => setDestinationTankId(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold text-sm shadow-sm text-slate-800">
                              <option value="">-- Select Destination --</option>
                              {tanks.map(t => (
                                 <option key={t.id} value={t.id}>
                                    {t.name}
                                 </option>
                              ))}
                           </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                           <div>
                              <label className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-2 block">Output Weight (KG)</label>
                              <input type="number" step="0.01" value={outputKg} onChange={(e) => setOutputKg(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border-none font-black text-lg text-blue-900 outline-none focus:ring-2 focus:ring-blue-300 shadow-sm" placeholder="0.00" />
                           </div>
                           <div>
                              <label className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-2 block">Output Volume (LTR)</label>
                              <input type="number" step="0.01" value={outputLitre} onChange={(e) => setOutputLitre(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border-none font-black text-lg text-blue-900 outline-none focus:ring-2 focus:ring-blue-300 shadow-sm" placeholder="0.00" />
                           </div>
                        </div>

                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Remarks / Notes</label>
                           <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 h-28 resize-none font-medium text-sm text-slate-700 outline-none focus:bg-white focus:border-blue-400 transition-all shadow-sm" placeholder="Any additional details..." />
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-4">
                           {isSubmitting ? <FaSpinner className="animate-spin text-xl" /> : <><FaCheckCircle className="text-xl" /> Complete Batch</>}
                        </button>
                     </div>
                  </div>
               </div>
            </form>
          </div>
        </main>
        
        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-t border-slate-100">
           <Footer />
        </div>
      </div>
    </div>
  );
}

export default function BatchEntryPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>}>
      <BatchEntryContent />
    </Suspense>
  );
}
