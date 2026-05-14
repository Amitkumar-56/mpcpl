'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaArrowLeft, FaUserAlt, FaUtensils, FaClock, FaHistory } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function LaborPageContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [form, setForm] = useState({
    worker_name: '',
    food_inward_qty: '0',
    late_arrival: 'no',
    late_fine: '0',
    outside_food_qty: '0',
    outside_food_cost: '0',
    log_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/farming/labor?page=${page}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.total);
      }
    } catch (e) {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/labor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Labor log saved!');
        setShowForm(false);
        fetchRecords();
        setForm({
          worker_name: '',
          food_inward_qty: '0',
          late_arrival: 'no',
          late_fine: '0',
          outside_food_qty: '0',
          outside_food_cost: '0',
          log_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error('Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchRecords(); }, [mounted, page]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">👷 Labor & Staff Log</h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Track food inward, late arrival & expenses</p>
                </div>
                <div className="flex gap-2">
                  <Link href="/farming" className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                    <FaArrowLeft /> BACK
                  </Link>
                  <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200">
                    <FaPlus /> {showForm ? 'CLOSE FORM' : 'NEW LOG ENTRY'}
                  </button>
                </div>
              </div>

              {showForm && (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 mb-8 animate-in slide-in-from-top duration-500">
                  <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-sm"><FaPlus /></div>
                    Create New Log
                  </h2>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Worker Name (e.g. Anil)</label>
                      <input required value={form.worker_name} onChange={e => setForm({...form, worker_name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter name..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Log Date</label>
                      <input type="date" value={form.log_date} onChange={e => setForm({...form, log_date: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Food Inward Qty</label>
                      <input type="number" step="0.01" value={form.food_inward_qty} onChange={e => setForm({...form, food_inward_qty: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                    
                    <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                      <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 block flex items-center gap-2"><FaClock /> Late Arrival?</label>
                      <div className="flex gap-4">
                        {['no', 'yes'].map(opt => (
                          <button key={opt} type="button" onClick={() => setForm({...form, late_arrival: opt})} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${form.late_arrival === opt ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-orange-600'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                      {form.late_arrival === 'yes' && (
                        <div className="mt-4">
                          <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1 block">Fine Amount (₹)</label>
                          <input type="number" value={form.late_fine} onChange={e => setForm({...form, late_fine: e.target.value})} className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-slate-900" placeholder="0" />
                        </div>
                      )}
                    </div>

                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 lg:col-span-2">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 block flex items-center gap-2"><FaUtensils /> Outside Food</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 block">Quantity</label>
                          <input type="number" value={form.outside_food_qty} onChange={e => setForm({...form, outside_food_qty: e.target.value})} className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-slate-900" placeholder="0" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 block">Cost (₹)</label>
                          <input type="number" value={form.outside_food_cost} onChange={e => setForm({...form, outside_food_cost: e.target.value})} className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-slate-900" placeholder="0" />
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Notes</label>
                      <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 h-[100px]" placeholder="Extra details..." />
                    </div>

                    <div className="lg:col-span-4 flex justify-end">
                      <button type="submit" disabled={submitting} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl">
                        {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Save Entry</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        {['Date', 'Worker', 'Food Inward', 'Arrival Status', 'Outside Food', 'Notes', 'Total Cost'].map(h => (
                          <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr><td colSpan={7} className="text-center py-20"><FaSpinner className="animate-spin text-blue-600 text-2xl mx-auto" /></td></tr>
                      ) : records.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-20 text-slate-400 font-bold uppercase text-[10px] tracking-widest">No records found</td></tr>
                      ) : records.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-6 py-5">
                            <p className="text-xs font-black text-slate-900">{new Date(r.log_date).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">{r.worker_name.charAt(0)}</div>
                              <span className="text-xs font-bold text-slate-700">{r.worker_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-xs font-black text-blue-600">{r.food_inward_qty} Units</span>
                          </td>
                          <td className="px-6 py-5">
                            {r.late_arrival === 'yes' ? (
                              <div className="flex flex-col">
                                <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-[9px] font-black uppercase w-fit">LATE</span>
                                {r.late_fine > 0 && <span className="text-[9px] font-bold text-orange-400 mt-1">Fine: ₹{r.late_fine}</span>}
                              </div>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[9px] font-black uppercase w-fit">ON TIME</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{r.outside_food_qty} Units</span>
                              {r.outside_food_cost > 0 && <span className="text-[9px] font-bold text-slate-400">₹{r.outside_food_cost}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-xs text-slate-400 italic max-w-[200px] truncate">{r.notes || '-'}</td>
                          <td className="px-6 py-5">
                            <span className="text-sm font-black text-slate-900">₹{(Number(r.late_fine) + Number(r.outside_food_cost)).toLocaleString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {page} of {totalPages} ({totalRecords} total)</p>
                   <div className="flex gap-2">
                     <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase disabled:opacity-50">Prev</button>
                     <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase disabled:opacity-50">Next</button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function LaborPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <LaborPageContent />
    </Suspense>
  );
}
