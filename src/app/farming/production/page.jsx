'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaBarcode, FaQrcode, FaFilePdf, FaArrowLeft, FaDownload } from 'react-icons/fa';
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

  const generateMasterReport = async () => {
    try {
      toast.loading('Preparing professional yield report...', { id: 'report' });
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
      doc.setFillColor(217, 119, 6);
      doc.rect(0, 0, 210, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("MPCPL FARMING CRM", 20, 20);
      doc.setFontSize(10);
      doc.text("MASTER PRODUCTION REPORT - Yield Tracking", 20, 30);
      doc.text("Generated: " + new Date().toLocaleString(), 20, 38);

      doc.setFillColor(255, 255, 255);
      doc.rect(150, 10, 45, 30, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text("SCAN FOR YIELD DATA", 155, 15);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/farming/production')}`;
      doc.addImage(qrUrl, 'PNG', 160, 18, 20, 20);
      doc.text("REF: PRD-" + Date.now(), 158, 42);

      const tableData = records.map(r => [
        new Date(r.production_date).toLocaleDateString(),
        r.type.toUpperCase(),
        r.product_name,
        r.animal_tag || '-',
        `${r.quantity} ${r.unit}`,
        r.shift.toUpperCase()
      ]);
      doc.autoTable({
        startY: 60,
        head: [['Date', 'Type', 'Product', 'Animal Tag', 'Yield', 'Shift']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [217, 119, 6] }
      });
      doc.save(`Production_Report_${Date.now()}.pdf`);
      toast.success('Production Report with Barcode Downloaded!', { id: 'report' });
    } catch (e) { toast.error('PDF Failed', { id: 'report' }); }
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
            <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">📊 Daily Production</h1>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.3em] mt-1">Yield & Resource Tracking</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={fetchRecords} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <Link href="/farming" className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3">
                  <FaArrowLeft /> Back
                </Link>
                <button onClick={generateMasterReport} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3">
                  <FaFilePdf /> Master Report
                </button>
                <button onClick={() => setShowForm(!showForm)} className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3">
                  <FaPlus /> Add Production
                </button>
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
                    {['Date', 'Type', 'Product Details', 'Source', 'Yield', 'Shift / Quality', 'Action'].map(h => <th key={h} className="text-[9px] font-black text-slate-400 uppercase px-6 py-5 text-left tracking-widest">{h}</th>)}
                  </tr></thead><tbody>
                      {records.length === 0 ? <tr><td colSpan={8} className="text-center py-20 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No yield recorded today</td></tr> :
                        records.map(r => (
                          <tr key={r.id} className="border-t border-slate-50 hover:bg-amber-50/20 transition-all group">
                            <td className="px-6 py-6 text-xs font-bold text-slate-400">{new Date(r.production_date).toLocaleDateString('en-IN')}</td>
                            <td className="px-6 py-6 text-xs font-black uppercase text-slate-900">{r.type}</td>
                            <td className="px-6 py-6">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-black text-slate-900">{r.product_name}</span>
                                <div className="flex items-center gap-2 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                  <FaBarcode className="text-[12px] text-slate-900" />
                                  <span className="text-[8px] font-mono font-black tracking-widest">PRD-{String(r.id).padStart(5, '0')}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6 text-xs font-bold text-slate-500">{r.animal_name || r.animal_tag || 'Bulk / Batch'}</td>
                            <td className="px-6 py-6">
                              <p className="text-sm font-black text-amber-600">{Number(r.quantity).toFixed(1)} {r.unit}</p>
                            </td>
                            <td className="px-6 py-6">
                              <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 px-3 py-1 rounded-full">{r.shift}</span>
                              <p className="text-[8px] text-slate-400 font-bold mt-2 uppercase">Grade: {r.quality_grade || 'Standard'}</p>
                            </td>
                            <td className="px-6 py-6">
                              <button className="text-slate-400 hover:text-amber-600 p-3 bg-slate-50 rounded-xl transition-all shadow-sm"><FaQrcode /></button>
                            </td>
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
