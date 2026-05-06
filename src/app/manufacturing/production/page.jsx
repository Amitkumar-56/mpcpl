'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaFlask, FaWarehouse, FaTrash, FaSync, FaHistory, FaSpinner, FaCheckCircle, FaBoxOpen
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function ProductionEntryContent() {
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [inputs, setInputs] = useState([{ from_tank_id: '', kg_input: '', litre_input: '' }]);
  const [outputs, setOutputs] = useState([
    { product_type: 'Biodiesel', to_tank_id: '', kg_output: '', litre_output: '' },
    { product_type: 'Glycerin', to_tank_id: '', kg_output: '', litre_output: '' },
    { product_type: 'Waste Material', to_tank_id: '', kg_output: '', litre_output: '' }
  ]);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('Process');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const router = useRouter();

  const fetchTanks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/tank-allocation?view=tanks');
      const data = await response.json();
      if (data.success) {
        setTanks(data.data);
      } else {
        toast.error('Failed to fetch tank allocations');
      }
    } catch (error) {
      toast.error('Sync error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    setMounted(true);
    fetchTanks(); 
  }, [fetchTanks]);

  const addInputField = () => setInputs([...inputs, { from_tank_id: '', kg_input: '', litre_input: '' }]);
  const removeInputField = (index) => {
    if (inputs.length > 1) setInputs(inputs.filter((_, i) => i !== index));
  };
  const handleInputChange = (index, field, value) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  const addOutputField = () => setOutputs([...outputs, { product_type: '', to_tank_id: '', kg_output: '', litre_output: '' }]);
  const removeOutputField = (index) => {
    if (outputs.length > 1) setOutputs(outputs.filter((_, i) => i !== index));
  };
  const handleOutputChange = (index, field, value) => {
    const newOutputs = [...outputs];
    newOutputs[index][field] = value;
    setOutputs(newOutputs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validInputs = inputs.filter(inp => inp.from_tank_id && (inp.kg_input || inp.litre_input));
    const validOutputs = outputs.filter(out => out.to_tank_id && (out.kg_output || out.litre_output));
    
    if (validInputs.length === 0 || validOutputs.length === 0) {
      return toast.error('Please complete both source and yield details');
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: validInputs, outputs: validOutputs, remarks, status })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Production Batch Completed');
        router.push('/manufacturing/production-history');
      } else {
        toast.error('Error: ' + data.error);
      }
    } catch (error) {
      toast.error('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Manufacturing" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">Production Entry</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Process Yield Control</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={fetchTanks} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:text-blue-600">
                    <FaSync className={loading ? 'animate-spin' : ''} />
                  </button>
                  <Link href="/manufacturing/production-history" className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">
                    History
                  </Link>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="pb-12">
                <div className="flex items-center justify-center mb-10 gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all ${step === 1 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>1</div>
                  <div className="w-12 h-1 bg-slate-100 rounded-full">
                    <div className={`h-full bg-blue-600 transition-all duration-500 ${step === 2 ? 'w-full' : 'w-0'}`}></div>
                  </div>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all ${step === 2 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>2</div>
                </div>

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <FaWarehouse className="text-blue-600" />
                          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Source Selection</h2>
                        </div>
                        <button type="button" onClick={addInputField} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-lg">Add Tank</button>
                      </div>
                      <div className="space-y-4">
                        {inputs.map((inp, index) => (
                          <div key={index} className="bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-end border border-slate-100">
                            <div className="flex-1 w-full">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Tank</label>
                              <select required value={inp.from_tank_id} onChange={(e) => handleInputChange(index, 'from_tank_id', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs outline-none focus:border-blue-400">
                                <option value="">-- Choose Tank --</option>
                                {tanks.filter(t => t.allocations?.some(a => a.allocation_type === 'raw_material')).map(t => (
                                  <option key={t.id} value={t.id}>{t.tank_name || t.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <input type="number" step="0.01" value={inp.kg_input} onChange={(e) => handleInputChange(index, 'kg_input', e.target.value)} className="w-24 p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="KG" />
                              <input type="number" step="0.01" value={inp.litre_input} onChange={(e) => handleInputChange(index, 'litre_input', e.target.value)} className="w-24 p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="LTR" />
                            </div>
                            <button type="button" onClick={() => removeInputField(index)} className="p-3 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-100"><FaTrash size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setStep(2)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100">Next: Output Details</button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <FaFlask className="text-emerald-600" />
                          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Yield Configuration</h2>
                        </div>
                        <button type="button" onClick={addOutputField} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-lg">Add Stream</button>
                      </div>
                      <div className="space-y-4">
                        {outputs.map((out, index) => (
                          <div key={index} className="bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-end border border-slate-100">
                            <div className="w-full sm:w-32">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Product</label>
                              <input type="text" value={out.product_type} onChange={(e) => handleOutputChange(index, 'product_type', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" />
                            </div>
                            <div className="flex-1 w-full">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Destination Tank</label>
                              <select required value={out.to_tank_id} onChange={(e) => handleOutputChange(index, 'to_tank_id', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs outline-none focus:border-emerald-400">
                                <option value="">-- Choose Tank --</option>
                                {tanks.filter(t => t.allocations?.some(a => a.allocation_type === 'finished_good')).map(t => (
                                  <option key={t.id} value={t.id}>{t.tank_name || t.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <input type="number" step="0.01" value={out.kg_output} onChange={(e) => handleOutputChange(index, 'kg_output', e.target.value)} className="w-24 p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="KG" />
                              <input type="number" step="0.01" value={out.litre_output} onChange={(e) => handleOutputChange(index, 'litre_output', e.target.value)} className="w-24 p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="LTR" />
                            </div>
                            <button type="button" onClick={() => removeOutputField(index)} className="p-3 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-100"><FaTrash size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Process Remarks</label>
                      <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 font-bold text-xs h-24 outline-none" placeholder="Notes..." />
                    </div>
                    <div className="flex justify-between gap-4">
                      <button type="button" onClick={() => setStep(1)} className="bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200">Back</button>
                      <button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3">
                        {isSubmitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle className="text-emerald-400" /> Complete Production</>}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </main>
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
          <Footer />
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function ProductionEntryPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <ProductionEntryContent />
    </Suspense>
  );
}
