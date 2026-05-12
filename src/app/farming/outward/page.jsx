'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaEnvelope, FaDownload, FaBarcode, FaQrcode, FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
      <div className="bg-slate-50 h-12 w-full" />
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="border-t border-slate-50 h-14 flex items-center px-6 gap-4">
          <div className="h-4 bg-slate-100 rounded w-4" />
          <div className="h-4 bg-slate-100 rounded w-24" />
          <div className="h-4 bg-slate-100 rounded w-20" />
          <div className="h-4 bg-slate-100 rounded w-16" />
          <div className="h-8 bg-slate-100 rounded-lg w-12 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function OutwardContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sel, setSel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [form, setForm] = useState({
    type: 'cow', animal_id: '', batch_id: '', outward_type: 'sale', product_type: '',
    quantity: '1', weight: '', unit_price: '', total_price: '', buyer_name: '',
    buyer_contact: '', vehicle_no: '', invoice_no: '', 
    outward_date: new Date().toISOString().split('T')[0], notes: '',
    recipient_email: ''
  });

  const fetchRecords = async () => {
    try {
      let url = `/api/farming/outward?page=${page}&limit=10`;
      if (filterType) url += `&type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecords(Array.isArray(data.data) ? data.data : []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      }
    } catch (e) { toast.error('Load Error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/outward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { toast.success('Outward entry created!'); setShowForm(false); fetchRecords(); }
      else toast.error(data.error);
    } catch (e) { toast.error('Failed'); } finally { setSubmitting(false); }
  };

  const generateMasterReport = async () => {
    try {
      toast.loading('Preparing professional report...', { id: 'report' });
      const loadScripts = () => new Promise((res, rej) => {
        if (window.jspdf?.jsPDF?.API?.autoTable) return res();
        const s1 = document.createElement('script');
        s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s1.onload = () => {
          const cdns = [
            'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.min.js',
            'https://unpkg.com/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
          ];
          let current = 0;
          const loadNext = () => {
            if (current >= cdns.length) return rej('Error');
            const s2 = document.createElement('script');
            s2.src = cdns[current];
            s2.onload = () => res();
            s2.onerror = () => { current++; loadNext(); };
            document.head.appendChild(s2);
          };
          loadNext();
        };
        s1.onerror = () => rej('Error');
        document.head.appendChild(s1);
      });
      await loadScripts();
      const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
      const doc = new jsPDF();
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("MPCPL FARMING CRM", 20, 20);
      doc.setFontSize(10);
      doc.text("MASTER OUTWARD REPORT - Digital Sale Ledger", 20, 30);
      doc.text("Generated: " + new Date().toLocaleString(), 20, 38);

      doc.setFillColor(255, 255, 255);
      doc.rect(150, 10, 45, 30, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text("SCAN TO SYNC SALE", 155, 15);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/farming/outward')}`;
      doc.addImage(qrUrl, 'PNG', 160, 18, 20, 20);
      doc.text("REF: OUT-" + Date.now(), 158, 42);

      const tableData = records.map(r => [
        new Date(r.outward_date).toLocaleDateString(),
        r.type.toUpperCase(),
        r.outward_type,
        r.product_type || '-',
        r.quantity,
        'Rs.' + Number(r.total_price || 0).toLocaleString()
      ]);
      doc.autoTable({
        startY: 60,
        head: [['Date', 'Type', 'Outward Type', 'Product', 'Qty', 'Total Price']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] }
      });
      doc.save(`Outward_Report_${Date.now()}.pdf`);
      toast.success('Scannable Sale Report Downloaded!', { id: 'report' });
    } catch (e) { toast.error('PDF Failed', { id: 'report' }); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted) {
      fetchRecords();
    }
  }, [mounted, filterType, page]);

  useEffect(() => {
    if (mounted) {
      fetch('/api/farming/batches?status=active&limit=50').then(r => r.json()).then(d => { if (d.success) setBatches(d.data); });
      fetch('/api/farming/animals?status=active&limit=100').then(r => r.json()).then(d => { if (d.success) setAnimals(d.data); });
    }
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-6"><div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">📤 Outward Register</h1>
                <p className="text-sm text-gray-600">Track stock and animal departures</p>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchRecords} className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"><FaSync /></button>
                <Link href="/farming" className="bg-gray-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <FaArrowLeft /> Back
                </Link>
                <button onClick={generateMasterReport} className="bg-gray-800 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-900 transition-colors flex items-center gap-2">
                  <FaFilePdf /> Report
                </button>
                <button onClick={() => setShowForm(!showForm)} className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors flex items-center gap-2">
                  <FaPlus /> New Entry
                </button>
              </div>
            </div>
            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6 animate-in slide-in-from-top duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">New Outward Entry</h2>
                    <p className="text-sm text-gray-600">Record stock and animal departures</p>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Category *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500">
                      <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option><option value="honey">🍯 Honey</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Sale Type *</label>
                    <select value={form.outward_type} onChange={e => setForm({ ...form, outward_type: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500">
                      <option value="sale">Direct Sale</option><option value="transfer">Internal Transfer</option><option value="deceased">Deceased</option><option value="return">Return to Supplier</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Product / Item *</label>
                    <input required value={form.product_type} onChange={e => setForm({ ...form, product_type: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="e.g. Milk, Meat, Eggs, etc." />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Quantity *</label>
                    <input required type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="0" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Total Weight (KG)</label>
                    <input type="number" step="0.01" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="0.00" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Revenue (₹) *</label>
                    <input required type="number" value={form.total_price} onChange={e => setForm({ ...form, total_price: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="0.00" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Buyer / Customer</label>
                    <input value={form.buyer_name} onChange={e => setForm({ ...form, buyer_name: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Name / Shop Name" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Outward Date</label>
                    <input type="date" value={form.outward_date} onChange={e => setForm({ ...form, outward_date: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                  </div>

                  <div className="lg:col-span-1">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Notes</label>
                    <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Add sale details..." />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Record Sale</>}
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2 overflow-x-auto">
                {[{ k: '', l: 'All' }, { k: 'cow', l: '🐄' }, { k: 'goat', l: '🐐' }, { k: 'chicken', l: '🐔' }, { k: 'fish', l: '🐟' }, { k: 'honey', l: '🍯' }].map(t => (
                  <button key={t.k} onClick={() => { setFilterType(t.k); setPage(1); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === t.k ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>{t.l}</button>
                ))}
              </div>
            </div>

            {loading ? <TableSkeleton /> : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-3 text-left w-10">
                          <input type="checkbox" className="w-4 h-4 rounded text-red-600 border-gray-300" />
                        </th>
                        {['Date', 'Type', 'Outward Details', 'Product', 'Qty / Weight', 'Revenue', 'Action'].map(h => <th key={h} className="text-xs font-semibold text-gray-700 uppercase px-4 py-3 text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? <tr><td colSpan={10} className="text-center py-12 text-sm text-gray-500">No records found</td></tr> :
                        records.map(r => (
                          <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3"><input type="checkbox" className="w-4 h-4 rounded text-red-600 border-gray-300" /></td>
                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(r.outward_date).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 uppercase">{r.type}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-1 rounded-full">{r.outward_type}</span>
                                <div className="flex items-center gap-2 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <FaBarcode className="text-xs text-gray-700" />
                                  <span className="text-xs font-mono text-gray-700">OUT-{String(r.id).padStart(5, '0')}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{r.product_type || '-'}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{r.quantity} Unit</p>
                              <p className="text-xs text-gray-500">{r.weight ? r.weight + ' KG Total' : '-'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-green-600">₹{Number(r.total_price || 0).toLocaleString()}</p>
                              <p className="text-xs text-gray-500">Buyer: {r.buyer_name || 'Direct Sale'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => setSel(r)} className="text-gray-400 hover:text-red-600 p-2 bg-gray-50 rounded-lg transition-colors"><FaQrcode /></button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                  <span>Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                  </div>
                </div>
              </div>
            )}
            {/* DETAIL MODAL */}
            {sel && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
                  <div className="bg-slate-800 p-8 text-white relative">
                    <button onClick={() => setSel(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold">×</button>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Digital Sale Record</p>
                    <h2 className="text-2xl font-black tracking-tighter">OUT-{String(sel.id).padStart(5, '0')}</h2>
                  </div>
                  <div className="p-10 space-y-8 text-left">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale Date</p>
                        <p className="font-bold text-slate-900">{new Date(sel.outward_date || sel.created_at).toLocaleDateString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Type / Category</p>
                        <p className="font-black text-slate-800 uppercase italic">{sel.type}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale Type</p>
                        <p className="font-bold text-slate-900 uppercase">{sel.outward_type}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</p>
                        <p className="font-bold text-slate-900">{sel.product_type || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Summary</p>
                        <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase italic">Settled</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Customer / Destination</p>
                          <p className="font-black text-slate-900">{sel.customer_name || 'Counter Sale'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-900">₹{Number(sel.total_price || 0).toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Qty: {sel.quantity}</p>
                        </div>
                      </div>
                    </div>

                    {sel.notes && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sale Notes</p>
                        <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 font-medium italic leading-relaxed">
                          "{sel.notes}"
                        </div>
                      </div>
                    )}

                    <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                      <FaDownload className="text-xs" /> Print Invoice
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div></div>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
export default function OutwardPage() { return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-red-600 text-4xl mx-auto" /></div>}><OutwardContent /></Suspense>; }
