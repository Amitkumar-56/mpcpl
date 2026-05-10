'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaSpinner, FaSync, FaPlus, FaEye, FaSearch, FaMars, FaVenus, FaBaby, FaArrowLeft, FaPrint, FaHistory, FaWeight } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

const TYPES = [{ k: '', l: 'All' }, { k: 'cow', l: '🐄 Cow' }, { k: 'goat', l: '🐐 Goat' }, { k: 'chicken', l: '🐔 Chicken' }, { k: 'fish', l: '🐟 Fish' }, { k: 'honey', l: '🍯 Honey' }];
const HC = { healthy: '#DCFCE7/#166534', sick: '#FEE2E2/#991B1B', treatment: '#FEF3C7/#92400E', quarantine: '#FCE7F3/#9D174D', deceased: '#F3F4F6/#374151' };
const SC = { active: '#DCFCE7/#166534', sold: '#DBEAFE/#1E40AF', deceased: '#FEE2E2/#991B1B', transferred: '#FEF3C7/#92400E' };

function AnimalsContent() {
  const sp = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [filterType, setFilterType] = useState(sp.get('type') || '');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterGender, setFilterGender] = useState('');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      let url = '/api/farming/animals?';
      if (filterType) url += `type=${filterType}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterGender) url += `gender=${filterGender}&`;
      if (search) url += `search=${search}&`;
      const res = await fetch(url); const data = await res.json();
      if (data.success) setAnimals(data.data);
    } catch (e) { toast.error('Error'); } finally { setLoading(false); }
  };

  const viewAnimal = async (id) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/farming/animals?id=${id}`);
      if (!res.ok) throw new Error('Detail fetch failed');
      const data = await res.json();
      if (data.success) setSel(data.data);
      else toast.error(data.error || 'Animal not found');
    } catch (e) {
      console.error(e);
      toast.error('Error loading detail');
    } finally { setDetailLoading(false); }
  };

  const printCard = async (animal) => {
    const card = document.getElementById(`animal-card-${animal.id}`);
    if (!card) {
      console.error('Print card template not found');
      return toast.error('Template missing');
    }
    try {
      toast.loading('Generating PDF...', { id: 'print-toast' });
      const canvas = await html2canvas(card, {
        scale: 3, // Higher scale for better print quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', (pdfWidth - imgWidth) / 2, 30, imgWidth, imgHeight);
      pdf.save(`${animal.tag_id}_ID_Card.pdf`);
      toast.success('ID Card generated!', { id: 'print-toast' });
    } catch (e) {
      console.error('Print PDF Error:', e);
      toast.error('Print error: ' + e.message, { id: 'print-toast' });
    }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchAnimals(); }, [mounted, filterType, filterStatus, filterGender]);

  if (!mounted) return null;

  const badge = (val, map) => { const c = (map[val] || '#F3F4F6/#374151').split('/'); return { background: c[0], color: c[1] }; };

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter',sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8"><div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div><h1 className="text-2xl font-black text-slate-900">🐾 Animals Registry</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parent & Child Records</p></div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={fetchAnimals} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:text-blue-600"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <Link href={`/farming/animals/create?type=${filterType || 'cow'}&entry=purchase`} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"><FaPlus /> Add Parent</Link>
                <Link href={`/farming/animals/create?type=${filterType || 'cow'}&entry=birth`} className="bg-pink-600 text-white px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"><FaBaby /> Add Child</Link>
                <Link href="/farming" className="bg-slate-800 text-white px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg"><FaArrowLeft className="inline mr-1" />Dashboard</Link>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex gap-1 flex-wrap">{TYPES.map(t => (
                  <button key={t.k} onClick={() => setFilterType(t.k)} className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${filterType === t.k ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>{t.l}</button>
                ))}</div>
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                  <option value="">All Gender</option><option value="female">♀ Female</option><option value="male">♂ Male</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                  <option value="">All Status</option><option value="active">Active</option><option value="sold">Sold</option><option value="deceased">Deceased</option>
                </select>
                <div className="flex-1 min-w-[180px]"><div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAnimals()} placeholder="Search tag, name, breed..." className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
                </div></div>
              </div>
            </div>

            {/* DETAIL MODAL */}
            {sel && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
                <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black ${sel.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                        {sel.gender === 'female' ? '♀' : '♂'}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900">{sel.name || sel.tag_id}</h2>
                        <p className="text-[10px] text-slate-400 font-bold">Tag: {sel.tag_id} | {sel.type.toUpperCase()} | {sel.breed || '-'} | {sel.gender}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => printCard(sel)} className="bg-slate-100 text-slate-700 p-2.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-[10px] font-black uppercase">
                        <FaPrint /> Print Card
                      </button>
                      <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-700 text-xl font-black">✕</button>
                    </div>
                  </div>

                  {/* PRINT CARD TEMPLATE (Off-screen for capture) */}
                  <div className="absolute left-[-9999px] top-0">
                    <div id={`animal-card-${sel.id}`} style={{ width: '300px', background: '#ffffff', border: '2px solid #000000', padding: '16px', borderRadius: '12px', fontFamily: 'sans-serif', color: '#000000' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Animal ID Card</span>
                        <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>{sel.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#ffffff', fontSize: '30px', fontWeight: '900', background: sel.gender === 'female' ? '#ec4899' : '#3b82f6' }}>
                          <span style={{ margin: 'auto' }}>{sel.gender === 'female' ? '♀' : '♂'}</span>
                        </div>
                        <div style={{ flex: '1', textAlign: 'left' }}>
                          <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0' }}>Tag ID</p>
                          <p style={{ fontSize: '18px', fontWeight: '900', margin: '0', lineHeight: '1' }}>{sel.tag_id}</p>
                          <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '4px 0 0 0' }}>Name</p>
                          <p style={{ fontSize: '14px', fontWeight: '900', margin: '0', lineHeight: '1' }}>{sel.name || 'No Name'}</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', textAlign: 'left' }}>
                        <div><p style={{ fontSize: '6px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0' }}>Breed</p><p style={{ fontSize: '9px', fontWeight: '900', margin: '0' }}>{sel.breed || '-'}</p></div>
                        <div><p style={{ fontSize: '6px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0' }}>Gender</p><p style={{ fontSize: '9px', fontWeight: '900', margin: '0', textTransform: 'uppercase' }}>{sel.gender}</p></div>
                        <div><p style={{ fontSize: '6px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0' }}>DOB</p><p style={{ fontSize: '9px', fontWeight: '900', margin: '0' }}>{sel.date_of_birth ? new Date(sel.date_of_birth).toLocaleDateString('en-IN') : '-'}</p></div>
                        <div><p style={{ fontSize: '6px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0' }}>Status</p><p style={{ fontSize: '9px', fontWeight: '900', margin: '0', textTransform: 'uppercase' }}>{sel.status}</p></div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: '900', margin: '0 0 4px 0' }}>{sel.barcode}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5px' }}>
                          {sel.barcode?.split('').map((c, i) => (<div key={i} style={{ width: (c.charCodeAt(0) % 2) + 0.5 + 'px', height: '15px', background: i % 2 === 0 ? '#000000' : '#ffffff' }} />))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className="bg-slate-50 p-3 rounded-xl mb-4 text-center">
                    <div className="font-mono text-lg font-black tracking-[6px] text-slate-800">{sel.barcode}</div>
                    <div className="flex justify-center mt-1 gap-[1px]">
                      {sel.barcode?.split('').map((c, i) => (<div key={i} style={{ width: (c.charCodeAt(0) % 3) + 1 + 'px', height: '30px', background: i % 2 === 0 ? '#000' : '#fff' }} />))}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {[['Type', sel.type], ['Gender', sel.gender], ['Breed', sel.breed || '-'], ['DOB', sel.date_of_birth ? new Date(sel.date_of_birth).toLocaleDateString('en-IN') : '-'], ['Weight', sel.weight ? sel.weight + ' kg' : '-'], ['Color', sel.color || '-'], ['Health', sel.health_status], ['Status', sel.status], ['Source', sel.source || '-']].map(([k, v], i) => (
                      <div key={i} className="bg-slate-50 p-2 rounded-xl"><span className="text-[8px] font-bold text-slate-400 uppercase block">{k}</span><span className="text-[11px] font-bold text-slate-800 capitalize">{v}</span></div>
                    ))}
                  </div>

                  {/* FINANCIAL LIFECYCLE */}
                  {sel.financials && (
                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 mb-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-2">
                        💰 Financial Lifecycle <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">LIFETIME</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Purchase Cost</p>
                          <p className="text-xs font-black text-slate-800">₹{Number(sel.financials.total_purchase_cost).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Feed Cost</p>
                          <p className="text-xs font-black text-slate-800">₹{Number(sel.financials.total_feed_cost).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Health Cost</p>
                          <p className="text-xs font-black text-slate-800">₹{Number(sel.financials.total_health_cost).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <p className="text-[8px] font-bold text-emerald-600 uppercase mb-1">Total Revenue</p>
                          <p className="text-xs font-black text-emerald-700">₹{Number(sel.financials.total_outward_revenue).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl flex items-center justify-between ${sel.financials.net_profit_loss >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">Net Profit / Loss</span>
                        <span className={`text-sm font-black ${sel.financials.net_profit_loss >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {sel.financials.net_profit_loss < 0 ? '-' : '+'} ₹{Math.abs(Number(sel.financials.net_profit_loss)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PARENTS & MATES */}
                  <div className="bg-gradient-to-r from-pink-50 to-blue-50 p-4 rounded-xl mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Parents</h3>
                        <div className="space-y-2">
                          <div className="bg-white p-2.5 rounded-xl border border-pink-200">
                            <span className="text-[8px] font-bold text-pink-500 uppercase block">♀ Mother</span>
                            {sel.mother_name || sel.mother_tag ? (
                              <><span className="text-xs font-black text-pink-700">{sel.mother_name || sel.mother_tag}</span>
                                {sel.mother_breed && <span className="text-[9px] text-slate-400 ml-1">({sel.mother_breed})</span>}</>
                            ) : <span className="text-xs text-slate-400">Not assigned</span>}
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                            <span className="text-[8px] font-bold text-blue-500 uppercase block">♂ Father</span>
                            {sel.father_name || sel.father_tag ? (
                              <><span className="text-xs font-black text-blue-700">{sel.father_name || sel.father_tag}</span>
                                {sel.father_breed && <span className="text-[9px] text-slate-400 ml-1">({sel.father_breed})</span>}</>
                            ) : <span className="text-xs text-slate-400">Not assigned</span>}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Mates / Partners</h3>
                        <div className="space-y-2">
                          {sel.mates?.length > 0 ? sel.mates.map((m, i) => (
                            <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="text-[8px] font-bold text-slate-400 uppercase block">{sel.gender === 'female' ? '♂ Husband' : '♀ Wife'}</span>
                              <span className="text-xs font-black text-slate-700">{m.name || m.tag_id}</span>
                              <span className="text-[9px] text-slate-400 ml-1">({m.breed || '-'})</span>
                            </div>
                          )) : <div className="bg-white p-3 rounded-xl border border-dashed border-slate-300 text-center text-[10px] text-slate-400">No mates recorded</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OFFSPRING */}
                  <div className="bg-emerald-50 p-4 rounded-xl mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-2">Offspring ({sel.offspring_count || 0})</h3>
                    {sel.offspring?.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">{sel.offspring.map((o, i) => (
                        <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-200">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black ${o.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}>{o.gender === 'female' ? '♀' : '♂'}</span>
                            <div><span className="text-xs font-black text-slate-800">{o.name || o.tag_id}</span>
                              <span className="text-[9px] text-slate-400 ml-1">({o.breed || '-'})</span>
                              {o.other_parent_name && <span className="text-[9px] text-purple-500 ml-1">× {o.other_parent_name}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${o.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{o.status}</span>
                            {o.date_of_birth && <span className="text-[9px] text-slate-400 ml-1">{new Date(o.date_of_birth).toLocaleDateString('en-IN')}</span>}
                          </div>
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-emerald-600 font-bold text-center py-2">No offspring recorded yet</p>}
                  </div>

                  {/* SIBLINGS */}
                  {sel.siblings?.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-xl mb-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-800 mb-2">Siblings ({sel.siblings.length})</h3>
                      <div className="flex flex-wrap gap-2">{sel.siblings.map((s, i) => (
                        <span key={i} className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-200">
                          {s.gender === 'female' ? '♀' : '♂'} {s.name || s.tag_id}
                        </span>
                      ))}</div>
                    </div>
                  )}

                  {/* PRODUCTION SUMMARY */}
                  {sel.productionSummary?.length > 0 && (
                    <div className="bg-amber-50 p-4 rounded-xl mb-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-2">Production Summary</h3>
                      <div className="grid grid-cols-2 gap-2">{sel.productionSummary.map((p, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-amber-200">
                          <span className="text-[9px] font-bold text-slate-400 block">{p.product_name}</span>
                          <span className="text-lg font-black text-amber-700">{Number(p.total_qty).toFixed(1)}</span>
                          <span className="text-[9px] text-slate-400 ml-1">{p.unit} ({p.total_entries} entries)</span>
                        </div>
                      ))}</div>
                    </div>
                  )}

                  {/* HEALTH HISTORY TIMELINE */}
                  <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-6 flex items-center gap-2">
                      💉 Health History & Vaccination <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{sel.health?.length || 0} RECORDS</span>
                    </h3>
                    {sel.health?.length > 0 ? (
                      <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {sel.health.map((h, i) => (
                          <div key={i} className="relative pl-10">
                            <div className={`absolute left-0 top-0 w-7 h-7 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-black
                              ${h.treatment_type === 'vaccination' ? 'bg-blue-500' : h.treatment_type === 'medication' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                              {i + 1}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{h.treatment_date ? new Date(h.treatment_date).toLocaleDateString('en-IN') : '-'}</span>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${h.treatment_type === 'vaccination' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{h.treatment_type}</span>
                              </div>
                              <h4 className="text-xs font-black text-slate-800">{h.disease_name || 'Regular Checkup'}</h4>
                              <p className="text-[10px] text-slate-500 mt-1">{h.medicine_name && `Med: ${h.medicine_name}`} {h.dosage && `| Dose: ${h.dosage}`}</p>
                              <div className="mt-2 flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-400">Dr. {h.doctor_name || 'N/A'}</span>
                                <span className="text-[10px] font-black text-slate-800">₹{Number(h.cost).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-center py-8 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">No health records yet</div>}
                  </div>

                  {/* PRODUCTION TREND (Last entries) */}
                  {sel.production?.length > 0 && (
                    <div className="bg-amber-50 rounded-3xl p-6 mb-4 border border-amber-100">
                      <h3 className="text-xs font-black uppercase tracking-widest text-amber-900 mb-4">📈 Recent Production Trend</h3>
                      <div className="flex items-end gap-1.5 h-32">
                        {sel.production.slice(0, 10).reverse().map((p, i) => {
                          const maxQty = Math.max(...sel.production.map(x => Number(x.quantity))) || 1;
                          const h = (Number(p.quantity) / maxQty) * 100;
                          return (
                            <div key={i} className="group relative flex-1">
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {Number(p.quantity).toFixed(1)}
                              </div>
                              <div className="bg-amber-400 rounded-t-lg transition-all hover:bg-amber-600" style={{ height: `${h}%` }}></div>
                              <div className="text-[6px] font-bold text-amber-800 text-center mt-1 rotate-45 origin-left">{new Date(p.production_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TABLE */}
            {loading ? <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div> : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50">
                  {['', 'Tag ID', 'Name', 'Type', 'Breed', 'Gender', 'Mother', 'Father', 'Children', 'Health', 'Status', ''].map((h, i) => (
                    <th key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-3 text-left">{h}</th>
                  ))}
                </tr></thead><tbody>
                    {animals.length === 0 ? <tr><td colSpan={12} className="text-center py-12 text-xs text-slate-400">No animals found. Please register a parent first.</td></tr> :
                      animals.map(a => (
                        <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black ${a.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}>{a.gender === 'female' ? '♀' : '♂'}</div></td>
                          <td className="px-3 py-3 text-xs font-black text-slate-900">{a.tag_id}</td>
                          <td className="px-3 py-3 text-xs font-bold text-slate-700">{a.name || '-'}</td>
                          <td className="px-3 py-3"><span className="text-[10px] font-bold capitalize bg-slate-100 px-2 py-1 rounded-lg">{a.type}</span></td>
                          <td className="px-3 py-3 text-xs text-slate-600">{a.breed || '-'}</td>
                          <td className="px-3 py-3 text-xs font-bold capitalize">{a.gender === 'female' ? <span className="text-pink-600">♀ Female</span> : <span className="text-blue-600">♂ Male</span>}</td>
                          <td className="px-3 py-3 text-xs text-pink-600 font-bold">{a.mother_name || a.mother_tag || '-'}</td>
                          <td className="px-3 py-3 text-xs text-blue-600 font-bold">{a.father_name || a.father_tag || '-'}</td>
                          <td className="px-3 py-3"><span className={`text-xs font-black ${Number(a.offspring_count) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{a.offspring_count || 0} 🐣</span></td>
                          <td className="px-3 py-3"><span className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg" style={badge(a.health_status, HC)}>{a.health_status}</span></td>
                          <td className="px-3 py-3"><span className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg" style={badge(a.status, SC)}>{a.status}</span></td>
                          <td className="px-3 py-3"><button onClick={() => viewAnimal(a.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase hover:bg-blue-700 flex items-center gap-1"><FaEye /> Detail</button></td>
                        </tr>
                      ))}
                  </tbody></table></div>
                <div className="px-4 py-3 bg-slate-50 flex justify-between text-[9px] font-bold text-slate-400">
                  <span>Total: {animals.length} | Female: {animals.filter(a => a.gender === 'female').length} | Male: {animals.filter(a => a.gender === 'male').length}</span>
                  <span>Total Offspring: {animals.reduce((s, a) => s + Number(a.offspring_count || 0), 0)}</span>
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
export default function AnimalsPage() { return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><AnimalsContent /></Suspense>; }
