'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaArrowDown, FaEnvelope, FaBarcode, FaQrcode, FaFilePdf, FaDownload, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
      <div className="bg-slate-50 h-12 w-full" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="border-t border-slate-50 h-14 flex items-center px-6 gap-4">
          <div className="h-4 bg-slate-100 rounded w-4" />
          <div className="h-4 bg-slate-100 rounded w-24" />
          <div className="h-4 bg-slate-100 rounded w-16" />
          <div className="h-4 bg-slate-100 rounded w-20" />
          <div className="h-4 bg-slate-100 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

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
  const [sel, setSel] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let url = `/api/farming/inward?page=${page}&limit=10`;
      if (filterType) url += `&type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Inward fetch failed');
      if (data.success) {
        setRecords(Array.isArray(data.data) ? data.data : []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Load Error');
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

  const generateMasterReport = async () => {
    try {
      toast.loading('Preparing professional report...', { id: 'report' });

      const loadScripts = () => new Promise((res, rej) => {
        if (window.jspdf?.jsPDF?.API?.autoTable) return res();

        const s1 = document.createElement('script');
        s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s1.onload = () => {
          // Fallback chain for AutoTable
          const cdns = [
            'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.min.js',
            'https://unpkg.com/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
          ];

          let current = 0;
          const loadNext = () => {
            if (current >= cdns.length) return rej('All PDF engines failed to load. Check internet.');
            const s2 = document.createElement('script');
            s2.src = cdns[current];
            s2.onload = () => res();
            s2.onerror = () => { current++; loadNext(); };
            document.head.appendChild(s2);
          };
          loadNext();
        };
        s1.onerror = () => rej('Main PDF engine failed');
        document.head.appendChild(s1);
      });

      await loadScripts();
      const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
      const doc = new jsPDF();

      // Header Section
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("MPCPL FARMING CRM", 20, 20);
      doc.setFontSize(10);
      doc.text("MASTER INWARD REPORT - Digital Ledger", 20, 30);
      doc.text("Generated: " + new Date().toLocaleString(), 20, 38);

      // ADDING BARCODE TO PDF
      doc.setFillColor(255, 255, 255);
      doc.rect(150, 10, 45, 30, 'F'); // White box for barcode
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text("SCAN FOR DIGITAL SYNC", 152, 15);

      // Using QR code for PDF (more reliable for mobile scan)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/farming/inward')}`;
      doc.addImage(qrUrl, 'PNG', 160, 18, 20, 20);
      doc.text("REF: INW-" + Date.now(), 158, 42);

      const tableData = records.map(r => [
        new Date(r.inward_date).toLocaleDateString(),
        r.type.toUpperCase(),
        r.inward_type,
        r.batch_name || '-',
        r.quantity,
        'Rs.' + Number(r.total_price || 0).toLocaleString()
      ]);

      doc.autoTable({
        startY: 60,
        head: [['Date', 'Type', 'Inward Type', 'Batch', 'Qty', 'Total Price']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });

      doc.save(`Inward_Report_${Date.now()}.pdf`);
      toast.success('Professional Report with Scannable Barcode Downloaded!', { id: 'report' });
    } catch (e) {
      console.error(e);
      toast.error('PDF Generation Failed', { id: 'report' });
    }
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
            <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">⬇️ Inward Register</h1>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em] mt-1">Stock & Animal Influx</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={fetchRecords} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <Link href="/farming" className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3">
                  <FaArrowLeft /> Back
                </Link>
                <button onClick={generateMasterReport} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3">
                  <FaFilePdf /> Master Report
                </button>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3">
                  <FaPlus /> New Entry
                </button>
              </div>
            </div>
            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-xl border border-blue-100 p-5 sm:p-10 mb-8 animate-in slide-in-from-top duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">New Inward Entry</h2>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Stock & Animal Reception</p>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8 mb-8">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Category *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-all">
                      <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option><option value="honey">🍯 Honey</option><option value="feed">🌿 Feed</option><option value="medicine">💊 Medicine</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Entry Type *</label>
                    <select value={form.inward_type} onChange={e => setForm({ ...form, inward_type: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-all">
                      <option value="purchase">Purchase</option><option value="transfer">Internal Transfer</option><option value="return">Return</option><option value="donation">Donation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Quantity *</label>
                    <input required type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-all" placeholder="0" />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total Weight (KG)</label>
                    <input type="number" step="0.01" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-all" placeholder="0.00" />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total Cost (₹) *</label>
                    <input required type="number" value={form.total_price} onChange={e => setForm({ ...form, total_price: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-all" placeholder="0.00" />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Supplier Name</label>
                    <input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-all" placeholder="Vendor / Source Name" />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Inward Date</label>
                    <input type="date" value={form.inward_date} onChange={e => setForm({ ...form, inward_date: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-all" />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Notes</label>
                    <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-all" placeholder="Additional details..." />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-4 rounded-xl sm:rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Save Inward Record</>}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-10 py-4 rounded-xl sm:rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 overflow-x-auto pb-2 sm:pb-0">
                {[{ k: '', l: 'All' }, { k: 'cow', l: '🐄' }, { k: 'goat', l: '🐐' }, { k: 'chicken', l: '🐔' }, { k: 'fish', l: '🐟' }, { k: 'honey', l: '🍯' }].map(t => (
                  <button key={t.k} onClick={() => { setFilterType(t.k); setPage(1); }} className={`px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap ${filterType === t.k ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{t.l}</button>
                ))}
              </div>
            </div>

            {loading ? <TableSkeleton /> : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full"><thead><tr className="bg-slate-50">
                    <th className="px-3 py-3 text-left w-10">
                      <input type="checkbox" className="w-3 h-3 rounded text-blue-600" />
                    </th>
                    {['Date', 'Type', 'Inward Details', 'Batch', 'Qty / Weight', 'Financials', 'Action'].map(h => <th key={h} className="text-[9px] font-black text-slate-400 uppercase px-6 py-5 text-left tracking-widest">{h}</th>)}
                  </tr></thead><tbody>
                      {records.length === 0 ? <tr><td colSpan={10} className="text-center py-20 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Inventory stream empty</td></tr> :
                        records.map(r => (
                          <tr key={r.id} className="border-t border-slate-50 hover:bg-blue-50/20 transition-all group">
                            <td className="px-6 py-6"><input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-200" /></td>
                            <td className="px-6 py-6 text-xs font-bold text-slate-400">{new Date(r.inward_date || r.created_at).toLocaleDateString('en-IN')}</td>
                            <td className="px-6 py-6 text-xs font-black uppercase text-slate-900">{r.type}</td>
                            <td className="px-6 py-6">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 px-3 py-1 rounded-full w-fit">{r.inward_type}</span>
                                <div className="flex items-center gap-2 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                  <FaBarcode className="text-[12px] text-slate-900" />
                                  <span className="text-[8px] font-mono font-black tracking-widest">INW-{String(r.id).padStart(5, '0')}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6 text-xs font-bold text-slate-500">{r.batch_name || r.batch_code || '-'}</td>
                            <td className="px-6 py-6">
                              <p className="text-xs font-black text-slate-900">{r.quantity} Unit</p>
                              <p className="text-[9px] text-slate-400 font-bold">{r.weight ? r.weight + ' KG Total' : '-'}</p>
                            </td>
                            <td className="px-6 py-6">
                              <p className="text-xs font-black text-emerald-600">₹{Number(r.total_price || 0).toLocaleString()}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Supplier: {r.supplier_name || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-6">
                              <button onClick={() => setSel(r)} className="text-slate-400 hover:text-blue-600 p-3 bg-slate-50 rounded-xl transition-all shadow-sm"><FaQrcode /></button>
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
            {/* DETAIL MODAL */}
            {sel && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
                  <div className="bg-blue-600 p-8 text-white relative">
                    <button onClick={() => setSel(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold">×</button>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Digital Record Entry</p>
                    <h2 className="text-2xl font-black tracking-tighter">INW-{String(sel.id).padStart(5, '0')}</h2>
                  </div>
                  <div className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-8 text-left">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inward Date</p>
                        <p className="font-bold text-slate-900">{new Date(sel.inward_date || sel.created_at).toLocaleDateString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Type / Category</p>
                        <p className="font-black text-blue-600 uppercase italic">{sel.type}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice No</p>
                        <p className="font-bold text-slate-900">{sel.invoice_no || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle No</p>
                        <p className="font-bold text-slate-900">{sel.vehicle_no || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Financial Summary</p>
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase italic">Complete</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-left">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Supplier Details</p>
                          <p className="font-black text-slate-900">{sel.supplier_name || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{sel.supplier_contact || ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-900">₹{Number(sel.total_price || 0).toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Qty: {sel.quantity}</p>
                        </div>
                      </div>
                    </div>

                    {sel.notes && (
                      <div className="text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Internal Notes</p>
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-xs text-slate-600 font-medium italic leading-relaxed">
                          "{sel.notes}"
                        </div>
                      </div>
                    )}

                    <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                      <FaDownload className="text-xs" /> Print Voucher
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
export default function InwardPage() { return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><InwardContent /></Suspense>; }
