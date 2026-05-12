// src/app/farming/processing/page.jsx
'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

const PROCESSING_MAP = {
  cow: {
    'Milk': ['Ghee', 'Curd', 'Paneer', 'Buttermilk', 'Cheese', 'Butter', 'Khoya'],
    'Dung': ['Fertilizer', 'Gobar Gas', 'Dried Cakes'],
    'Urine': ['Pesticide', 'Medicine']
  },
  goat: {
    'Milk': ['Curd', 'Cheese', 'Soap'],
    'Meat': ['Minced Meat', 'Cuts']
  },
  chicken: {
    'Eggs': ['Powder', 'Liquid Egg'],
    'Feathers': ['Decorative Items', 'Fertilizer']
  },
  honey: {
    'Raw Honey': ['Processed Honey', 'Candies'],
    'Beeswax': ['Candles', 'Polish', 'Cosmetics']
  }
};

function ProcessingContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('');
  
  const [form, setForm] = useState({
    type: 'cow',
    source_product: '',
    source_quantity: '',
    source_unit: 'litre',
    derivative_product: '',
    derivative_quantity: '',
    derivative_unit: 'kg',
    processing_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let url = '/api/farming/processing';
      if (filterType) url += `?type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRecords(data.data);
    } catch (e) {
      toast.error('Load Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.source_product || !form.derivative_product) return toast.error('Products required');
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Processing recorded!');
        setShowForm(false);
        fetchRecords();
      } else toast.error(data.error);
    } catch (e) {
      toast.error('Failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchRecords(); }, [mounted, filterType]);

  if (!mounted) return null;

  const sources = Object.keys(PROCESSING_MAP[form.type] || {});
  const derivatives = PROCESSING_MAP[form.type]?.[form.source_product] || [];

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Product Processing</h1>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Value Addition & Conversion</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={fetchRecords} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                  <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3">
                    {showForm ? '✕ Close' : <><FaPlus /> New Processing</>}
                  </button>
                  <Link href="/farming" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                    <FaArrowLeft /> Dashboard
                  </Link>
                </div>
              </div>

              {showForm && (
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden mb-12 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                    <h2 className="text-xl font-black uppercase tracking-widest">Process New Product</h2>
                    <p className="text-[10px] font-bold text-blue-100 opacity-80 uppercase tracking-[0.2em]">Convert raw materials into derivative products</p>
                  </div>
                  <form onSubmit={handleSubmit} className="p-8 sm:p-10 bg-slate-50/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Species Type</label>
                        <select 
                          value={form.type} 
                          onChange={e => setForm({ ...form, type: e.target.value, source_product: '', derivative_product: '' })} 
                          className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white font-black text-xs focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="cow">🐄 Cow</option>
                          <option value="goat">🐐 Goat</option>
                          <option value="chicken">🐔 Chicken</option>
                          <option value="honey">🍯 Honey</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Source Product (Raw)</label>
                        <select 
                          required
                          value={form.source_product} 
                          onChange={e => setForm({ ...form, source_product: e.target.value, derivative_product: '' })} 
                          className="w-full p-4 rounded-2xl border-2 border-blue-50 bg-white font-black text-xs focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="">-- Select Source --</option>
                          {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Derivative Product (Final)</label>
                        <select 
                          required
                          value={form.derivative_product} 
                          onChange={e => setForm({ ...form, derivative_product: e.target.value })} 
                          className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-black text-xs focus:border-emerald-500 outline-none transition-all"
                        >
                          <option value="">-- Select Final --</option>
                          {derivatives.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>

                      <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Source Quantity Used</label>
                        <div className="flex">
                          <input 
                            required type="number" step="0.01" 
                            value={form.source_quantity} 
                            onChange={e => setForm({ ...form, source_quantity: e.target.value })} 
                            className="flex-1 p-4 rounded-l-2xl border-2 border-r-0 border-slate-100 bg-white font-black text-xs focus:border-blue-500 outline-none"
                            placeholder="0.00"
                          />
                          <select 
                            value={form.source_unit} 
                            onChange={e => setForm({ ...form, source_unit: e.target.value })}
                            className="p-4 rounded-r-2xl border-2 border-slate-100 bg-slate-50 font-black text-[10px] uppercase outline-none"
                          >
                            <option value="litre">Litre</option>
                            <option value="kg">KG</option>
                            <option value="pieces">Pieces</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-center hidden lg:flex">
                        <FaArrowRight className="text-slate-300 text-2xl" />
                      </div>

                      <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Final Quantity Produced</label>
                        <div className="flex">
                          <input 
                            required type="number" step="0.01" 
                            value={form.derivative_quantity} 
                            onChange={e => setForm({ ...form, derivative_quantity: e.target.value })} 
                            className="flex-1 p-4 rounded-l-2xl border-2 border-r-0 border-emerald-50 bg-white font-black text-xs focus:border-emerald-500 outline-none"
                            placeholder="0.00"
                          />
                          <select 
                            value={form.derivative_unit} 
                            onChange={e => setForm({ ...form, derivative_unit: e.target.value })}
                            className="p-4 rounded-r-2xl border-2 border-emerald-50 bg-emerald-50 font-black text-[10px] uppercase outline-none"
                          >
                            <option value="kg">KG</option>
                            <option value="litre">Litre</option>
                            <option value="grams">Grams</option>
                            <option value="pieces">Pieces</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Processing Date</label>
                        <input 
                          type="date" 
                          value={form.processing_date} 
                          onChange={e => setForm({ ...form, processing_date: e.target.value })} 
                          className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white font-black text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Process Notes</label>
                        <textarea 
                          value={form.notes} 
                          onChange={e => setForm({ ...form, notes: e.target.value })} 
                          className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white font-black text-xs h-24"
                          placeholder="Special instructions or quality details..."
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={submitting} 
                      className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Record Processing</>}
                    </button>
                  </form>
                </div>
              )}

              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {[{ k: '', l: 'All' }, { k: 'cow', l: '🐄 Cow' }, { k: 'goat', l: '🐐 Goat' }, { k: 'chicken', l: '🐔 Chicken' }, { k: 'honey', l: '🍯 Honey' }].map(t => (
                  <button key={t.k} onClick={() => setFilterType(t.k)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === t.k ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-100'}`}>{t.l}</button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-600 text-5xl" /></div>
              ) : (
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          {['Date', 'Type', 'Conversion', 'Output', 'Input', 'Efficiency', 'Notes'].map(h => (
                            <th key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-6 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-20 text-xs text-slate-400 font-bold uppercase tracking-widest italic">No processing records found</td></tr>
                        ) : (
                          records.map(r => (
                            <tr key={r.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-all group">
                              <td className="px-6 py-6 text-xs font-black text-slate-400">{new Date(r.processing_date).toLocaleDateString('en-IN')}</td>
                              <td className="px-6 py-6">
                                <span className="text-[10px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">{r.type}</span>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-500">{r.source_product}</span>
                                  <FaArrowRight className="text-[10px] text-slate-300" />
                                  <span className="text-xs font-black text-blue-600 uppercase">{r.derivative_product}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <span className="text-sm font-black text-emerald-600">{Number(r.derivative_quantity).toFixed(2)} <span className="text-[9px] uppercase">{r.derivative_unit}</span></span>
                              </td>
                              <td className="px-6 py-6">
                                <span className="text-xs font-bold text-slate-400">{Number(r.source_quantity).toFixed(2)} {r.source_unit}</span>
                              </td>
                              <td className="px-6 py-6">
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                  {((r.derivative_quantity / (r.source_quantity || 1)) * 100).toFixed(1)}% Yield
                                </span>
                              </td>
                              <td className="px-6 py-6 text-[10px] text-slate-400 font-medium italic max-w-xs truncate">{r.notes || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-6 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100">
                    Showing {records.length} processing batches
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function ProcessingPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><ProcessingContent /></Suspense>;
}
