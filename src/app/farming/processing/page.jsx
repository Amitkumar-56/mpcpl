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
  const [loading, setLoading] = useState(false);
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
      let url = '/api/farming/processing';
      if (filterType) url += `?type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRecords(data.data);
    } catch (e) {
      toast.error('Load Error');
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Product Processing</h1>
                  <p className="text-sm text-gray-600 font-medium">Transform raw materials into premium finished products</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchRecords} className="bg-white/80 backdrop-blur-sm border border-white/20 p-3 rounded-xl shadow-lg hover:bg-white transition-all hover:scale-105">
                    <FaSync className="text-blue-600" />
                  </button>
                  <button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2">
                    {showForm ? '✕ Close' : <><FaPlus /> New Processing</>}
                  </button>
                  <Link href="/farming" className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:from-gray-800 hover:to-black transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2">
                    <FaArrowLeft /> Dashboard
                  </Link>
                </div>
              </div>

              {showForm && (
                <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <FaPlus className="text-white text-lg" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Process New Product</h2>
                      <p className="text-sm text-gray-600">Convert raw materials into finished goods</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Species Type
                      </label>
                      <select 
                        value={form.type} 
                        onChange={e => setForm({ ...form, type: e.target.value, source_product: '', derivative_product: '' })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all"
                      >
                        <option value="cow">🐄 Cow</option>
                        <option value="goat">🐐 Goat</option>
                        <option value="chicken">🐔 Chicken</option>
                        <option value="honey">🍯 Honey</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Source Product (Raw)
                      </label>
                      <select 
                        required
                        value={form.source_product} 
                        onChange={e => setForm({ ...form, source_product: e.target.value, derivative_product: '' })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all"
                      >
                        <option value="">-- Select Source --</option>
                        {sources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Source Quantity
                      </label>
                      <input 
                        required
                        type="number" 
                        step="0.01" 
                        value={form.source_quantity} 
                        onChange={e => setForm({ ...form, source_quantity: e.target.value })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all" 
                        placeholder="0.00" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        Source Unit
                      </label>
                      <select 
                        value={form.source_unit} 
                        onChange={e => setForm({ ...form, source_unit: e.target.value })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all"
                      >
                        <option value="litre">Litre</option>
                        <option value="kg">KG</option>
                        <option value="pieces">Pieces</option>
                        <option value="grams">Grams</option>
                        <option value="ml">ML</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        Derivative Product (Processed)
                      </label>
                      <select 
                        required
                        value={form.derivative_product} 
                        onChange={e => setForm({ ...form, derivative_product: e.target.value })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all"
                      >
                        <option value="">-- Select Derivative --</option>
                        {derivatives.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Derivative Quantity
                      </label>
                      <input 
                        required
                        type="number" 
                        step="0.01" 
                        value={form.derivative_quantity} 
                        onChange={e => setForm({ ...form, derivative_quantity: e.target.value })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all" 
                        placeholder="0.00" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        Derivative Unit
                      </label>
                      <select 
                        value={form.derivative_unit} 
                        onChange={e => setForm({ ...form, derivative_unit: e.target.value })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all"
                      >
                        <option value="litre">Litre</option>
                        <option value="kg">KG</option>
                        <option value="pieces">Pieces</option>
                        <option value="grams">Grams</option>
                        <option value="ml">ML</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        Processing Date
                      </label>
                      <input 
                        type="date" 
                        value={form.processing_date} 
                        onChange={e => setForm({ ...form, processing_date: e.target.value })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                        Notes
                      </label>
                      <input 
                        value={form.notes} 
                        onChange={e => setForm({ ...form, notes: e.target.value })} 
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm hover:bg-white transition-all" 
                        placeholder="Add processing notes..." 
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-3.5 bg-white/60 backdrop-blur-sm border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-white transition-all hover:scale-105 shadow-md">Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2">
                      {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Process Now</>}
                    </button>
                  </div>
                </form>
              )}
              <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {[{ k: '', l: 'All' }, { k: 'cow', l: '🐄 Cow' }, { k: 'goat', l: '🐐 Goat' }, { k: 'chicken', l: '🐔 Chicken' }, { k: 'honey', l: '🍯 Honey' }].map(t => (
                  <button key={t.k} onClick={() => setFilterType(t.k)} className={`px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shadow-lg hover:scale-105 ${filterType === t.k ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl' : 'bg-white/80 backdrop-blur-sm text-slate-700 border border-white/20 hover:bg-white'}`}>{t.l}</button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
                    <FaSpinner className="animate-spin text-blue-600 text-5xl" />
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] shadow-xl border border-white/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-white/20">
                          {['Date', 'Type', 'Conversion', 'Output', 'Input', 'Efficiency', 'Notes'].map(h => (
                            <th key={h} className="text-xs font-bold text-slate-600 uppercase tracking-wider px-6 py-6 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-20">
                              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">No processing records found</div>
                                <div className="text-xs text-slate-400 mt-2">Start by adding your first processing batch</div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          records.map(r => (
                            <tr key={r.id} className="border-b border-white/10 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all group">
                              <td className="px-6 py-6">
                                <div className="text-xs font-bold text-slate-600">{new Date(r.processing_date).toLocaleDateString('en-IN')}</div>
                              </td>
                              <td className="px-6 py-6">
                                <span className="text-xs font-bold uppercase bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-xl text-blue-700">{r.type}</span>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-slate-600">{r.source_product}</span>
                                  <FaArrowRight className="text-xs text-blue-400" />
                                  <span className="text-xs font-bold text-blue-600 uppercase">{r.derivative_product}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <span className="text-sm font-bold text-emerald-600">{Number(r.derivative_quantity).toFixed(2)} <span className="text-xs uppercase text-emerald-500">{r.derivative_unit}</span></span>
                              </td>
                              <td className="px-6 py-6">
                                <span className="text-xs font-semibold text-slate-500">{Number(r.source_quantity).toFixed(2)} {r.source_unit}</span>
                              </td>
                              <td className="px-6 py-6">
                                <span className="text-xs font-bold text-indigo-600 bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-1.5 rounded-full border border-indigo-100">
                                  {((r.derivative_quantity / (r.source_quantity || 1)) * 100).toFixed(1)}% Yield
                                </span>
                              </td>
                              <td className="px-6 py-6">
                                <div className="text-xs text-slate-500 font-medium max-w-xs truncate">{r.notes || '-'}</div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 text-xs font-bold text-slate-600 uppercase tracking-wider border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <span>Showing {records.length} processing batches</span>
                      <span className="text-slate-400">Last updated: {new Date().toLocaleTimeString('en-IN')}</span>
                    </div>
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
