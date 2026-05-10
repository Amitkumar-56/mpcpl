'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaLeaf } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function FeedContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({
    type: 'cow', batch_id: '', feed_name: '', quantity: '', unit: 'kg',
    cost_per_unit: '', total_cost: '', feed_date: new Date().toISOString().split('T')[0], notes: ''
  });

  const FEEDS = {
    cow: ['Green Fodder', 'Dry Fodder', 'Concentrate Feed', 'Silage', 'Cotton Seed Cake', 'Mineral Mix', 'Jaggery', 'Salt'],
    goat: ['Green Fodder', 'Dry Fodder', 'Grain Mix', 'Tree Leaves', 'Mineral Mix'],
    chicken: ['Layer Feed', 'Broiler Feed', 'Grower Feed', 'Starter Feed', 'Corn', 'Soybean Meal', 'Calcium Shell'],
    fish: ['Floating Feed', 'Sinking Feed', 'Natural Feed', 'Supplementary Feed', 'Rice Bran', 'Mustard Cake'],
    honey: ['Sugar Syrup', 'Pollen Substitute', 'Fondant', 'Bee Candy'],
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let url = '/api/farming/feed';
      if (filterType) url += `?type=${filterType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      if (data.success) setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (e) { 
      console.error(e);
      toast.error('Could not load records'); 
      setRecords([]);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.feed_name) return toast.error('Feed name required');
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/feed', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(form) 
      });
      const data = await res.json();
      if (data.success) { 
        toast.success('Feed record saved!'); 
        setShowForm(false); 
        fetchRecords(); 
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (e) { 
      toast.error('Network error'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted) {
      fetchRecords();
      fetch('/api/farming/batches?status=active')
        .then(r => r.ok ? r.json() : { success: false })
        .then(d => { if (d.success) setBatches(Array.isArray(d.data) ? d.data : []); })
        .catch(err => console.error('Batch fetch error:', err));
    }
  }, [mounted, filterType]);
  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8"><div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div><h1 className="text-2xl font-black text-slate-900">🌿 Feed Management</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feed & Fodder Tracking</p></div>
              <div className="flex gap-2">
                <button onClick={fetchRecords} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"><FaPlus /> Add Feed</button>
                <Link href="/farming" className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">Dashboard</Link>
              </div>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">Record Feed</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Type *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, feed_name: '' })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option><option value="honey">🍯 Honey</option>
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Feed Name *</label>
                    <select required value={form.feed_name} onChange={e => setForm({ ...form, feed_name: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="">-- Select --</option>{(FEEDS[form.type] || []).map(f => <option key={f} value={f}>{f}</option>)}
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Batch</label>
                    <select value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="">-- All --</option>{batches.filter(b => b.type === form.type).map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Quantity</label>
                    <input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value, total_cost: String(Number(e.target.value) * Number(form.cost_per_unit || 0)) })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Unit</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="kg">KG</option><option value="quintal">Quintal</option><option value="ton">Ton</option><option value="litre">Litre</option><option value="pieces">Pieces</option>
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Cost/Unit (₹)</label>
                    <input type="number" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value, total_cost: String(Number(e.target.value) * Number(form.quantity || 0)) })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Total Cost (₹)</label>
                    <input type="number" value={form.total_cost} onChange={e => setForm({ ...form, total_cost: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold bg-emerald-50 font-black" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Date</label>
                    <input type="date" value={form.feed_date} onChange={e => setForm({ ...form, feed_date: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Notes</label>
                    <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                </div>
                <button type="submit" disabled={submitting} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Save Feed</>}
                </button>
              </form>
            )}

            <div className="flex gap-1 mb-4">
              {[{ k: '', l: 'All' }, { k: 'cow', l: '🐄' }, { k: 'goat', l: '🐐' }, { k: 'chicken', l: '🐔' }, { k: 'fish', l: '🐟' }, { k: 'honey', l: '🍯' }].map(t => (
                <button key={t.k} onClick={() => setFilterType(t.k)} className={`px-3 py-2 rounded-xl text-[10px] font-bold ${filterType === t.k ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{t.l}</button>
              ))}
            </div>

            {loading ? <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-emerald-600 text-4xl" /></div> : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full"><thead><tr className="bg-slate-50">
                    {['Date', 'Type', 'Feed', 'Batch', 'Qty', 'Unit', 'Cost/Unit', 'Total Cost'].map(h => <th key={h} className="text-[9px] font-black text-slate-400 uppercase px-3 py-3 text-left">{h}</th>)}
                  </tr></thead><tbody>
                      {records.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-xs text-slate-400">No feed records</td></tr> :
                        records.map(r => (
                          <tr key={r.id} className="border-t border-slate-50 hover:bg-emerald-50/30">
                            <td className="px-3 py-3 text-xs font-bold">{r.feed_date ? new Date(r.feed_date).toLocaleDateString('en-IN') : '-'}</td>
                            <td className="px-3 py-3 text-xs capitalize font-bold">{r.type}</td>
                            <td className="px-3 py-3 text-xs font-bold text-slate-800">{r.feed_name}</td>
                            <td className="px-3 py-3 text-xs">{r.batch_name || '-'}</td>
                            <td className="px-3 py-3 text-xs font-black">{Number(r.quantity).toFixed(1)}</td>
                            <td className="px-3 py-3 text-xs">{r.unit}</td>
                            <td className="px-3 py-3 text-xs">₹{Number(r.cost_per_unit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-3 text-xs font-black text-red-600">₹{Number(r.total_cost || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                    </tbody></table></div>
                <div className="px-4 py-3 bg-slate-50 flex justify-between text-[9px] font-bold text-slate-400">
                  <span>Total: {records.length} records</span>
                  <span className="font-black text-red-600">Total Cost: ₹{records.reduce((s, r) => s + Number(r.total_cost || 0), 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div></div>
        </main>
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]"><Footer /></div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
export default function FeedPage() { return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-emerald-600 text-4xl mx-auto" /></div>}><FeedContent /></Suspense>; }
