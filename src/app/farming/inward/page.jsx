'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaArrowDown, FaEnvelope } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function InwardContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [form, setForm] = useState({
    type: 'cow', animal_id: '', batch_id: '', inward_type: 'purchase', quantity: '1',
    weight: '', unit_price: '', total_price: '', supplier_name: '', supplier_contact: '',
    vehicle_no: '', invoice_no: '', inward_date: new Date().toISOString().split('T')[0], notes: '',
    recipient_email: ''
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let url = `/api/farming/inward?page=${page}&limit=10`;
      if (filterType) url += `&type=${filterType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Inward fetch failed');
      const data = await res.json();
      if (data.success) {
        setRecords(Array.isArray(data.data) ? data.data : []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      }
    } catch (e) { 
      console.error(e);
      toast.error('Load Error'); 
      setRecords([]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/inward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { toast.success('Inward entry created!'); setShowForm(false); fetchRecords(); }
      else toast.error(data.error);
    } catch (e) { toast.error('Failed'); } finally { setSubmitting(false); }
  };
  const handleSendEmail = async (r) => {
    const email = prompt("Enter recipient email (Leave blank for Admin only):");
    if (email === null) return;

    try {
      toast.loading("Sending report...");
      const res = await fetch('/api/farming/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "Animal Inward Report",
          recipient_email: email || '',
          data: [
            { label: 'Date', value: new Date(r.inward_date).toLocaleDateString() },
            { label: 'Animal Type', value: r.type },
            { label: 'Inward Type', value: r.inward_type },
            { label: 'Batch', value: r.batch_name || r.batch_code },
            { label: 'Quantity', value: r.quantity },
            { label: 'Weight', value: r.weight ? r.weight + ' kg' : 'N/A' },
            { label: 'Total Price', value: '₹' + Number(r.total_price).toLocaleString() },
            { label: 'Supplier', value: r.supplier_name },
            { label: 'Vehicle No', value: r.vehicle_no },
            { label: 'Invoice No', value: r.invoice_no }
          ]
        })
      });
      const data = await res.json();
      toast.dismiss();
      if (data.success) toast.success("Report sent successfully!");
      else toast.error(data.error);
    } catch (e) { toast.dismiss(); toast.error("Failed to send email"); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted) {
      fetchRecords();
      fetch('/api/farming/batches?status=active&limit=50').then(r => r.json()).then(d => { if (d.success) setBatches(d.data); });
      fetch('/api/farming/animals?status=active&limit=100').then(r => r.json()).then(d => { if (d.success) setAnimals(d.data); });
    }
  }, [mounted, filterType, page]);
  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8"><div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div><h1 className="text-2xl font-black text-slate-900">⬇️ Inward Register</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock / Animal Incoming</p></div>
              <div className="flex gap-2">
                <button onClick={fetchRecords} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"><FaPlus /> New Inward</button>
                <Link href="/farming" className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">Dashboard</Link>
              </div>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">New Inward Entry</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Type *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option><option value="honey">🍯 Honey</option>
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Inward Type *</label>
                    <select value={form.inward_type} onChange={e => setForm({ ...form, inward_type: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="purchase">Purchase</option><option value="birth">Birth</option><option value="transfer_in">Transfer In</option><option value="return">Return</option><option value="gift">Gift</option>
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Batch</label>
                    <select value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold">
                      <option value="">-- Select --</option>{batches.filter(b => b.type === form.type).map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                    </select></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Quantity</label>
                    <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Weight (kg)</label>
                    <input type="number" step="0.01" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Unit Price (₹)</label>
                    <input type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value, total_price: String(Number(e.target.value) * Number(form.quantity || 1)) })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Total Price (₹)</label>
                    <input type="number" value={form.total_price} onChange={e => setForm({ ...form, total_price: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Supplier Name</label>
                    <input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Date</label>
                    <input type="date" value={form.inward_date} onChange={e => setForm({ ...form, inward_date: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Vehicle No</label>
                    <input value={form.vehicle_no} onChange={e => setForm({ ...form, vehicle_no: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Invoice No</label>
                    <input value={form.invoice_no} onChange={e => setForm({ ...form, invoice_no: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Notes</label>
                    <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-blue-600 uppercase block mb-1">Recipient Email (Auto-Report)</label>
                    <input type="email" value={form.recipient_email} onChange={e => setForm({ ...form, recipient_email: e.target.value })} className="w-full p-3 rounded-xl border-2 border-blue-50 bg-white text-xs font-bold" placeholder="owner@example.com" />
                    <p className="text-[8px] text-slate-400 mt-1 italic">Admin always gets a copy.</p>
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Save Inward</>}
                </button>
              </form>
            )}

             <div className="flex items-center justify-between mb-4">
               <div className="flex gap-1">
                 {[{ k: '', l: 'All' }, { k: 'cow', l: '🐄' }, { k: 'goat', l: '🐐' }, { k: 'chicken', l: '🐔' }, { k: 'fish', l: '🐟' }, { k: 'honey', l: '🍯' }].map(t => (
                   <button key={t.k} onClick={() => { setFilterType(t.k); setPage(1); }} className={`px-3 py-2 rounded-xl text-[10px] font-bold ${filterType === t.k ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{t.l}</button>
                 ))}
               </div>
               {selectedIds.length > 0 && (
                 <button 
                   onClick={async () => {
                     const toastId = toast.loading(`Sending ${selectedIds.length} inward reports...`);
                     try {
                       const selectedData = records.filter(r => selectedIds.includes(r.id));
                       const res = await fetch('/api/farming/send-report', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                           title: `Bulk Inward Report (${selectedIds.length} Items)`,
                           data: selectedData.map(r => ({
                             label: `${r.inward_type?.toUpperCase()} - ${r.animal_tag || 'Batch: '+r.batch_code}`,
                             value: `Qty: ${r.quantity} | Weight: ${r.weight}kg | Price: ₹${r.total_price}`
                           })),
                           footer_note: `Bulk inward summary for ${selectedIds.length} records.`
                         })
                       });
                       const d = await res.json();
                       if (d.success) {
                         toast.success('Inward bulk email sent!', { id: toastId });
                         setSelectedIds([]);
                       } else throw new Error(d.error);
                     } catch (e) {
                       toast.error(e.message || 'Failed to send report', { id: toastId });
                     }
                   }}
                   className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-100 hover:scale-105 transition-all"
                 >
                   <FaEnvelope /> Send {selectedIds.length} Selected
                 </button>
               )}
             </div>

            {loading ? <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div> : (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full"><thead><tr className="bg-slate-50">
                       <th className="px-3 py-3 text-left">
                         <input 
                           type="checkbox" 
                           checked={selectedIds.length === records.length && records.length > 0}
                           onChange={(e) => {
                             if (e.target.checked) setSelectedIds(records.map(r => r.id));
                             else setSelectedIds([]);
                           }}
                           className="w-3 h-3 rounded text-blue-600"
                         />
                       </th>
                       {['Date', 'Type', 'Inward Type', 'Batch', 'Qty', 'Weight', 'Price', 'Supplier', 'Vehicle', 'Action'].map(h => <th key={h} className="text-[9px] font-black text-slate-400 uppercase px-3 py-3 text-left">{h}</th>)}
                     </tr></thead><tbody>
                      {records.length === 0 ? <tr><td colSpan={10} className="text-center py-12 text-xs text-slate-400">No inward records</td></tr> :
                         records.map(r => (
                           <tr key={r.id} className={`border-t border-slate-50 hover:bg-blue-50/30 ${selectedIds.includes(r.id) ? 'bg-blue-50/50' : ''}`}>
                             <td className="px-3 py-3">
                               <input 
                                 type="checkbox" 
                                 checked={selectedIds.includes(r.id)}
                                 onChange={(e) => {
                                   if (e.target.checked) setSelectedIds(prev => [...prev, r.id]);
                                   else setSelectedIds(prev => prev.filter(id => id !== r.id));
                                 }}
                                 className="w-3 h-3 rounded text-blue-600"
                               />
                             </td>
                             <td className="px-3 py-3 text-xs font-bold">{r.inward_date ? new Date(r.inward_date).toLocaleDateString('en-IN') : '-'}</td>
                            <td className="px-3 py-3 text-xs capitalize font-bold">{r.type}</td>
                            <td className="px-3 py-3"><span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-1 rounded-lg">{r.inward_type}</span></td>
                            <td className="px-3 py-3 text-xs">{r.batch_name || r.batch_code || '-'}</td>
                            <td className="px-3 py-3 text-xs font-black text-blue-600">{r.quantity}</td>
                            <td className="px-3 py-3 text-xs">{r.weight ? r.weight + ' kg' : '-'}</td>
                            <td className="px-3 py-3 text-xs font-bold text-emerald-600">{r.total_price ? '₹' + Number(r.total_price).toLocaleString('en-IN') : '-'}</td>
                            <td className="px-3 py-3 text-xs">{r.supplier_name || '-'}</td>
                            <td className="px-3 py-3 text-xs">{r.vehicle_no || '-'}</td>
                            <td className="px-3 py-3">
                              <button onClick={() => handleSendEmail(r)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg transition-colors">
                                <FaEnvelope />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody></table></div>
                 <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                   <div className="text-[9px] font-bold text-slate-400">Page {page} of {totalPages} ({totalRecords} records)</div>
                   <div className="flex gap-2">
                     <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold disabled:opacity-50">Prev</button>
                     <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold disabled:opacity-50">Next</button>
                   </div>
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
export default function InwardPage() { return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><InwardContent /></Suspense>; }
