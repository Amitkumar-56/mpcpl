'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function BatchesContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ type: 'cow', batch_name: '', total_count: '', start_date: '', notes: '' });

  const fetchBatches = async () => {
    try {
      setLoading(true);
      let url = '/api/farming/batches?status=all';
      if (filterType) url += `&type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setBatches(data.data);
    } catch (e) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.batch_name || !form.type) return toast.error('Name & Type required');
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/batches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) { toast.success('Batch created: ' + data.batch_code); setShowForm(false); setForm({ type: 'cow', batch_name: '', total_count: '', start_date: '', notes: '' }); fetchBatches(); }
      else toast.error(data.error);
    } catch (e) { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchBatches(); }, [mounted, filterType]);
  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8"><div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900">📦 Batch Management</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Animal Batches</p>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchBatches} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:text-blue-600"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={() => setShowForm(!showForm)} className="bg-purple-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"><FaPlus /> New Batch</button>
                <Link href="/farming" className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">Dashboard</Link>
              </div>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">Create New Batch</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Type *</label>
                    <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option><option value="honey">🍯 Honey</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Batch Name *</label>
                    <input required value={form.batch_name} onChange={e => setForm({...form, batch_name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" placeholder="e.g. Cow Batch March 2026" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Initial Count</label>
                    <input type="number" value={form.total_count} onChange={e => setForm({...form, total_count: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Notes</label>
                    <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" placeholder="Notes..." />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Create Batch</>}
                </button>
              </form>
            )}

            {/* Filter */}
            <div className="flex gap-1 mb-4">
              {[{k:'',l:'All'},{k:'cow',l:'🐄 Cow'},{k:'goat',l:'🐐 Goat'},{k:'chicken',l:'🐔 Chicken'},{k:'fish',l:'🐟 Fish'},{k:'honey',l:'🍯 Honey'}].map(t => (
                <button key={t.k} onClick={() => setFilterType(t.k)} className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase ${filterType === t.k ? 'bg-purple-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{t.l}</button>
              ))}
            </div>

            {loading ? <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-purple-600 text-4xl" /></div> : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-slate-50">
                    {['Batch Code','Name','Type','Count','Current','Start Date','Status'].map(h => <th key={h} className="text-[9px] font-black text-slate-400 uppercase px-4 py-3 text-left">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {batches.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-xs text-slate-400">No batches found</td></tr> :
                    batches.map(b => (
                      <tr key={b.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-xs font-black text-slate-900">{b.batch_code}</td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">{b.batch_name}</td>
                        <td className="px-4 py-3 text-xs capitalize">{b.type}</td>
                        <td className="px-4 py-3 text-xs font-bold">{b.total_count}</td>
                        <td className="px-4 py-3 text-xs font-black text-blue-600">{b.current_count || 0}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{b.start_date ? new Date(b.start_date).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="px-4 py-3"><span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg ${b.status==='active'?'bg-green-100 text-green-800':'bg-slate-100 text-slate-600'}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

export default function BatchesPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-purple-600 text-4xl mx-auto" /></div>}><BatchesContent /></Suspense>;
}
