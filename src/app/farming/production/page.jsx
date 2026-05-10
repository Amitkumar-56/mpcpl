'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

const PRODUCTS_BY_TYPE = {
  cow: ['Milk', 'Dung', 'Ghee', 'Curd', 'Buttermilk', 'Urine'],
  goat: ['Milk', 'Meat', 'Skin'],
  chicken: ['Eggs', 'Meat', 'Feathers'],
  fish: ['Fresh Fish', 'Dried Fish', 'Fish Eggs', 'Fish Oil'],
  honey: ['Raw Honey', 'Beeswax', 'Royal Jelly', 'Propolis', 'Pollen'],
};

function ProductionContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({
    type: 'cow', animal_id: '', batch_id: '', product_name: '', quantity: '',
    unit: 'litre', quality_grade: '', production_date: new Date().toISOString().split('T')[0],
    shift: 'morning', notes: ''
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let url = '/api/farming/production';
      if (filterType) url += `?type=${filterType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Production fetch failed');
      const data = await res.json();
      if (data.success) {
        setRecords(Array.isArray(data.data) ? data.data : []);
        setSummary(Array.isArray(data.summary) ? data.summary : []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Load Error');
      setRecords([]);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_name || !form.quantity) return toast.error('Product & Quantity required');
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { toast.success('Production recorded!'); setShowForm(false); fetchRecords(); setForm({ ...form, quantity: '', notes: '' }); }
      else toast.error(data.error);
    } catch (e) { toast.error('Failed'); } finally { setSubmitting(false); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted) {
      fetchRecords();
      fetch('/api/farming/batches?status=active').then(r => r.json()).then(d => { if (d.success) setBatches(d.data); });
      fetch('/api/farming/animals?status=active').then(r => r.json()).then(d => { if (d.success) setAnimals(d.data); });
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
              <div><h1 className="text-2xl font-black text-slate-900">📊 Daily Production</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Milk, Eggs, Honey, Dung & More</p></div>
              <div className="flex gap-2">
                <button onClick={fetchRecords} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={() => setShowForm(!showForm)} className="bg-amber-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"><FaPlus /> Add Production</button>
                <Link href="/farming" className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">Dashboard</Link>
              </div>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">Record Production</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Type *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, product_name: '' })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option><option value="honey">🍯 Honey</option>
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Product *</label>
                    <select required value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="">-- Select --</option>{(PRODUCTS_BY_TYPE[form.type] || []).map(p => <option key={p} value={p}>{p}</option>)}
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Animal (Optional)</label>
                    <select value={form.animal_id} onChange={e => setForm({ ...form, animal_id: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="">-- All / Batch --</option>{animals.filter(a => a.type === form.type).map(a => <option key={a.id} value={a.id}>{a.name || a.tag_id}</option>)}
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Quantity *</label>
                    <input required type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" placeholder="0.00" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Unit</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="litre">Litre</option><option value="kg">KG</option><option value="pieces">Pieces</option><option value="grams">Grams</option><option value="ml">ML</option>
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Shift</label>
                    <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="morning">Morning</option><option value="evening">Evening</option><option value="full_day">Full Day</option>
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Date</label>
                    <input type="date" value={form.production_date} onChange={e => setForm({ ...form, production_date: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Quality</label>
                    <select value={form.quality_grade} onChange={e => setForm({ ...form, quality_grade: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="">-- Grade --</option><option value="A">A Grade</option><option value="B">B Grade</option><option value="C">C Grade</option>
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Notes</label>
                    <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                </div>
                <button type="submit" disabled={submitting} className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Save Production</>}
                </button>
              </form>
            )}

            {/* Summary Cards */}
            {summary.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {summary.map((s, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{s.product_name}</p>
                    <p className="text-xl font-black text-amber-600">{Number(s.total_qty).toFixed(1)} <span className="text-xs text-slate-400">{s.unit}</span></p>
                    <p className="text-[9px] text-slate-400">{s.entries} entries</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-1 mb-4">
              {[{ k: '', l: 'All' }, { k: 'cow', l: '🐄' }, { k: 'goat', l: '🐐' }, { k: 'chicken', l: '🐔' }, { k: 'fish', l: '🐟' }, { k: 'honey', l: '🍯' }].map(t => (
                <button key={t.k} onClick={() => setFilterType(t.k)} className={`px-3 py-2 rounded-xl text-[10px] font-bold ${filterType === t.k ? 'bg-amber-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{t.l}</button>
              ))}
            </div>

            {loading ? <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-amber-600 text-4xl" /></div> : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full"><thead><tr className="bg-slate-50">
                    {['Date', 'Type', 'Product', 'Animal', 'Qty', 'Unit', 'Shift', 'Quality'].map(h => <th key={h} className="text-[9px] font-black text-slate-400 uppercase px-3 py-3 text-left">{h}</th>)}
                  </tr></thead><tbody>
                      {records.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-xs text-slate-400">No production records</td></tr> :
                        records.map(r => (
                          <tr key={r.id} className="border-t border-slate-50 hover:bg-amber-50/30">
                            <td className="px-3 py-3 text-xs font-bold">{r.production_date ? new Date(r.production_date).toLocaleDateString('en-IN') : '-'}</td>
                            <td className="px-3 py-3 text-xs capitalize font-bold">{r.type}</td>
                            <td className="px-3 py-3 text-xs font-bold text-slate-800">{r.product_name}</td>
                            <td className="px-3 py-3 text-xs">{r.animal_name || r.animal_tag || '-'}</td>
                            <td className="px-3 py-3 text-xs font-black text-amber-600">{Number(r.quantity).toFixed(1)}</td>
                            <td className="px-3 py-3 text-xs">{r.unit}</td>
                            <td className="px-3 py-3"><span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-1 rounded-lg">{r.shift}</span></td>
                            <td className="px-3 py-3 text-xs">{r.quality_grade || '-'}</td>
                          </tr>
                        ))}
                    </tbody></table></div>
                <div className="px-4 py-3 bg-slate-50 text-[9px] font-bold text-slate-400">Total: {records.length} records</div>
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
export default function ProductionPage() { return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-amber-600 text-4xl mx-auto" /></div>}><ProductionContent /></Suspense>; }
