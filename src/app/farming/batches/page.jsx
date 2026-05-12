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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-6"><div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">📦 Batch Management</h1>
                <p className="text-sm text-gray-600">Manage animal batches efficiently</p>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchBatches} className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"><FaPlus /> New Batch</button>
                <Link href="/farming" className="bg-gray-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors">Dashboard</Link>
              </div>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Batch</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Type *</label>
                    <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option><option value="honey">🍯 Honey</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Batch Name *</label>
                    <input required value={form.batch_name} onChange={e => setForm({...form, batch_name: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Cow Batch March 2026" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Initial Count</label>
                    <input type="number" value={form.total_count} onChange={e => setForm({...form, total_count: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Notes</label>
                    <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Add notes..." />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Create Batch</>}
                  </button>
                </div>
              </form>
            )}

            {/* Filter */}
            <div className="flex gap-2 mb-6">
              {[{k:'',l:'All'},{k:'cow',l:'🐄 Cow'},{k:'goat',l:'🐐 Goat'},{k:'chicken',l:'🐔 Chicken'},{k:'fish',l:'🐟 Fish'},{k:'honey',l:'🍯 Honey'}].map(t => (
                <button key={t.k} onClick={() => setFilterType(t.k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === t.k ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>{t.l}</button>
              ))}
            </div>

            {loading ? <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div> : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['Batch Code','Name','Type','Count','Current','Start Date','Status'].map(h => <th key={h} className="text-xs font-semibold text-gray-700 uppercase px-4 py-3 text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {batches.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-500">No batches found</td></tr> :
                      batches.map(b => (
                        <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.batch_code}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700">{b.batch_name}</td>
                          <td className="px-4 py-3 text-sm capitalize">{b.type}</td>
                          <td className="px-4 py-3 text-sm font-medium">{b.total_count}</td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">{b.current_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{b.start_date ? new Date(b.start_date).toLocaleDateString('en-IN') : '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.status==='active'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-600'}`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

export default function BatchesPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-purple-600 text-4xl mx-auto" /></div>}><BatchesContent /></Suspense>;
}
