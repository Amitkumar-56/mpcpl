'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { 
  FaSpinner, FaSync, FaBiohazard, FaSearch, FaArrowLeft, 
  FaExclamationTriangle, FaShieldAlt, FaPlus, FaSave, FaUserMd, 
  FaStethoscope, FaThermometerHalf, FaVial, FaHistory
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

const TYPES = [
  { k: 'cow', l: 'Cow (गाय)', icon: '🐄', color: 'blue' },
  { k: 'goat', l: 'Goat (बकरी)', icon: '🐐', color: 'amber' },
  { k: 'chicken', l: 'Chicken (मुर्गी)', icon: '🐔', color: 'red' },
  { k: 'fish', l: 'Fish (मछली)', icon: '🐟', color: 'cyan' },
  { k: 'honey', l: 'Honey (शहद)', icon: '🍯', color: 'yellow' }
];

const COMMON_SYMPTOMS = [
  'Fever', 'Swelling (Sujan)', 'Not Eating', 'Cough', 'Loose Motion', 
  'Limping', 'Chhale (Blisters)', 'Weakness', 'Less Milk', 'Fast Breathing'
];

function DiseasesContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [diseases, setDiseases] = useState([]);
  const [filterType, setFilterType] = useState('cow');
  const [search, setSearch] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // Default to list view as requested
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'cow', disease_name: '', symptoms: '', treatment_info: '', danger_level: 'medium', is_contagious: false
  });

  const fetchDiseases = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/farming/diseases?type=${filterType}`);
      const data = await res.json();
      if (data.success) setDiseases(data.data);
    } catch (e) { toast.error('Failed to load diseases'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchDiseases(); }, [mounted, filterType]);

  const toggleSymptom = (s) => {
    setSelectedSymptoms(prev => 
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/diseases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Disease added to guide!');
        setForm({ type: filterType, disease_name: '', symptoms: '', treatment_info: '', danger_level: 'medium', is_contagious: false });
        setShowForm(false);
        fetchDiseases();
      } else toast.error(data.error);
    } catch (e) { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  if (!mounted) return null;

  const filtered = diseases.filter(d => {
    const matchesSearch = d.disease_name.toLowerCase().includes(search.toLowerCase()) || 
                         (d.symptoms && d.symptoms.toLowerCase().includes(search.toLowerCase()));
    
    const matchesSymptoms = selectedSymptoms.length === 0 || 
                           (d.symptoms && selectedSymptoms.some(s => d.symptoms.toLowerCase().includes(s.toLowerCase())));
    
    return matchesSearch && matchesSymptoms;
  });

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32 bg-slate-50/30">
          <div className="p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Premium Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">Disease Knowledge Base</h1>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                    <span className="w-8 h-[2px] bg-blue-600"></span> Master Health Surveillance Guide
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex gap-1 shadow-sm">
                    <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`} title="Grid View"><FaBiohazard /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`} title="Table List View"><FaHistory /></button>
                  </div>
                  <button onClick={fetchDiseases} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-600 hover:text-blue-600 active:scale-95">
                    <FaSync className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={() => setShowForm(!showForm)} className={`${showForm ? 'bg-slate-800' : 'bg-blue-600'} text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 active:scale-95`}>
                    {showForm ? '✕ Close Assistant' : <><FaPlus className="text-xs" /> New Disease Entry</>}
                  </button>
                </div>
              </div>

              {showForm && (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-blue-100 overflow-hidden mb-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className="bg-blue-600 p-8 text-white flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tighter">Disease Registration Portal</h2>
                      <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">Contribute to the farm bio-security database</p>
                    </div>
                    <FaBiohazard className="text-4xl text-blue-400 opacity-50" />
                  </div>
                  <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 text-blue-600">Animal Type *</label>
                      <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-blue-50 bg-slate-50 font-black text-xs outline-none focus:border-blue-500 transition-all">
                        {TYPES.map(t => <option key={t.k} value={t.k}>{t.l}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Disease Name *</label>
                      <input required value={form.disease_name} onChange={e => setForm({ ...form, disease_name: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-white font-bold text-xs outline-none focus:border-blue-500 transition-all" placeholder="e.g. Foot and Mouth Disease" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Risk Level</label>
                      <select value={form.danger_level} onChange={e => setForm({ ...form, danger_level: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-white font-bold text-xs outline-none focus:border-blue-500 transition-all">
                        <option value="low">Low Risk (Normal)</option>
                        <option value="medium">Medium Risk (Needs Attention)</option>
                        <option value="high">High Risk (Severe)</option>
                        <option value="critical">Critical (Bio-Hazard)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 group hover:border-red-200 transition-all">
                      <input type="checkbox" id="contagious" checked={form.is_contagious} onChange={e => setForm({ ...form, is_contagious: e.target.checked })} className="w-6 h-6 rounded-lg accent-red-600 cursor-pointer" />
                      <label htmlFor="contagious" className="text-[10px] font-black text-slate-700 uppercase tracking-wide cursor-pointer select-none">Is it Contagious? (Phailne wali)</label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Clinical Symptoms (Lakshan)</label>
                      <textarea required value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} rows={3} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-white font-bold text-xs outline-none focus:border-blue-500 transition-all" placeholder="Fever, cough, sujan, skin lesions etc..." />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Prevention & Immediate Action (Upay)</label>
                      <textarea value={form.treatment_info} onChange={e => setForm({ ...form, treatment_info: e.target.value })} rows={3} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-white font-bold text-xs outline-none focus:border-blue-500 transition-all" placeholder="Isolate immediately, provide clean water..." />
                    </div>
                    <div className="md:col-span-2 pt-4">
                      <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.3em] shadow-2xl hover:shadow-blue-300 flex items-center justify-center gap-4 transform active:scale-95 transition-all group">
                        {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave className="group-hover:rotate-12 transition-transform" /> Commit to Knowledge Base</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Navigation Tabs - Animal Selector */}
              {!showForm && (
                <div className="flex flex-wrap gap-4 mb-10">
                  {TYPES.map(t => (
                    <button 
                      key={t.k} 
                      onClick={() => { setFilterType(t.k); setSelectedSymptoms([]); }} 
                      className={`flex-1 min-w-[150px] group relative p-6 rounded-[2rem] border-2 transition-all duration-500 overflow-hidden ${
                        filterType === t.k 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.05]' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-400 hover:translate-y-[-5px]'
                      }`}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-3">
                        <span className={`text-3xl transition-transform duration-500 ${filterType === t.k ? 'scale-125' : 'group-hover:scale-110'}`}>{t.icon}</span>
                        <span className="text-[11px] font-black uppercase tracking-widest">{t.l}</span>
                      </div>
                      {filterType === t.k && <div className="absolute right-[-10%] top-[-20%] w-20 h-20 bg-blue-600/20 rounded-full blur-2xl"></div>}
                    </button>
                  ))}
                </div>
              )}

              {/* Advanced Search & Symptom Checker */}
              {!showForm && (
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 mb-10 overflow-hidden relative">
                  <div className="flex flex-col md:flex-row gap-6 items-center mb-8">
                    <div className="flex-1 relative w-full group">
                      <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search specific disease names or symptoms..."
                        className="w-full pl-16 pr-6 py-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 font-bold text-xs focus:bg-white focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FaStethoscope className="text-blue-600" /> Smart Symptom Checker
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SYMPTOMS.map(s => (
                        <button 
                          key={s} 
                          onClick={() => toggleSymptom(s)}
                          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            selectedSymptoms.includes(s)
                            ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                      {selectedSymptoms.length > 0 && (
                        <button onClick={() => setSelectedSymptoms([])} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 transition-all">✕ Clear All</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-32"><FaSpinner className="animate-spin text-blue-600 text-6xl" /></div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filtered.length === 0 ? (
                    <div className="col-span-full py-40 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 text-4xl mb-6"><FaVial /></div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">No Clinical Matches Found</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjust your filters to see results</p>
                    </div>
                  ) : (
                    filtered.map(d => (
                      <div key={d.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 hover:shadow-2xl transition-all duration-500 group relative flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                           <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                             d.danger_level === 'critical' ? 'bg-red-50 text-red-600 border-red-100' : 
                             d.danger_level === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                           }`}>
                             {d.danger_level} RISK
                           </div>
                           {d.is_contagious && (
                             <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
                                <FaBiohazard />
                             </div>
                           )}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-6 group-hover:text-blue-600 transition-colors leading-tight">{d.disease_name}</h3>
                        <div className="space-y-4 flex-1">
                           <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-50">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2 italic"><FaThermometerHalf className="text-amber-500" /> Symptoms</p>
                              <p className="text-xs font-bold text-slate-700 italic line-clamp-3">"{d.symptoms}"</p>
                           </div>
                           <div className="p-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><FaShieldAlt className="text-emerald-500" /> Action Protocol</p>
                              <p className="text-[11px] font-medium text-slate-600 line-clamp-4">{d.treatment_info || 'Consult specialized veterinary officer.'}</p>
                           </div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><FaUserMd className="text-blue-600" /> Vet Protocol</span>
                            <Link href="/farming/health" className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">Report Case</Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden mb-20">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 py-6 text-left border-b border-slate-100 w-1/4">Disease Name</th>
                                    <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 py-6 text-left border-b border-slate-100">Category</th>
                                    <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 py-6 text-left border-b border-slate-100 w-1/3">Symptoms (Lakshan)</th>
                                    <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 py-6 text-left border-b border-slate-100">Risk Level</th>
                                    <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 py-6 text-left border-b border-slate-100 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-20 text-xs text-slate-400 font-bold uppercase tracking-widest">No matching records found.</td></tr>
                                ) : (
                                    filtered.map(d => (
                                        <tr key={d.id} className="group border-b border-slate-50 hover:bg-blue-50/30 transition-all duration-200">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    {d.is_contagious && <FaBiohazard className="text-red-500 animate-pulse text-lg" />}
                                                    <span className="font-black text-[13px] text-slate-900">{d.disease_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="capitalize text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{d.type}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-[11px] font-medium text-slate-600 line-clamp-2 italic leading-relaxed">"{d.symptoms}"</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`text-[9px] font-black px-4 py-2 rounded-full border shadow-sm ${
                                                    d.danger_level === 'critical' ? 'bg-red-50 text-red-600 border-red-100' : 
                                                    d.danger_level === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                    {d.danger_level.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <Link href="/farming/health" className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md active:scale-95 inline-block">Report Case</Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function DiseasesPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><DiseasesContent /></Suspense>;
}
