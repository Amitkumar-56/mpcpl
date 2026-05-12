'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaStethoscope, FaUserMd, FaArrowLeft, FaSave, FaHistory, FaThermometerHalf, FaFileMedical, FaDownload, FaBiohazard, FaTint, FaEnvelope, FaBarcode, FaCheckCircle } from 'react-icons/fa';
import { useSession } from '@/context/SessionContext';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function HealthSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 h-24" />
        ))}
      </div>
      {/* Table Skeleton */}
      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 h-16 w-full" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className="border-t border-slate-50 h-20 flex items-center px-10 gap-8">
            <div className="h-4 bg-slate-100 rounded w-4" />
            <div className="h-6 bg-slate-100 rounded-xl w-32" />
            <div className="h-4 bg-slate-100 rounded w-20" />
            <div className="h-4 bg-slate-100 rounded w-24" />
            <div className="h-8 bg-slate-100 rounded-full w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthContent() {
  const { user } = useSession();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [form, setForm] = useState({
    animal_id: '', type: 'cow', doctor_id: '', treatment_type: 'checkup',
    disease_name: '', medicine_name: '', dosage: '', cost: '',
    treatment_date: new Date().toISOString().split('T')[0],
    next_followup: '', symptoms: '', notes: '',
    temperature: '', blood_report: '', recipient_email: ''
  });

  const fetchData = async () => {
    try {
      const [resH, resD, resA] = await Promise.all([
        fetch(`/api/farming/health?page=${page}&limit=10`),
        fetch('/api/farming/doctors'),
        fetch('/api/farming/animals?status=active&limit=100')
      ]);

      const [dataH, dataD, dataA] = await Promise.all([resH.json(), resD.json(), resA.json()]);

      if (dataH.success) {
        setRecords(dataH.data || []);
        setTotalPages(dataH.pagination?.totalPages || 1);
        setTotalRecords(dataH.pagination?.total || 0);
      }
      if (dataD.success) setDoctors(dataD.data || []);
      if (dataA.success) setAnimals(dataA.data || []);
    } catch (e) { toast.error('Failed to load data'); }
  };

  const fetchDiseases = async (type) => {
    try {
      const res = await fetch(`/api/farming/diseases?type=${type}`);
      const data = await res.json();
      if (data.success) setDiseases(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchData(); }, [mounted, page]);
  useEffect(() => { if (mounted && form.type) fetchDiseases(form.type); }, [mounted, form.type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/health', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Medical record saved!');
        setShowForm(false);
        setForm({ ...form, animal_id: '', disease_name: '', medicine_name: '', cost: '', symptoms: '', notes: '', temperature: '', blood_report: '' });
        fetchData();
      } else toast.error(data.error);
    } catch (e) { toast.error('Error saving report'); }
    finally { setSubmitting(false); }
  };

  const handleDownloadPDF = async (r) => {
    // Dynamic import to keep main bundle light
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("MPCPL HEALTH REPORT", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Animal: ${r.animal_tag}`, 20, 40);
    doc.text(`Diagnosis: ${r.disease_name || 'Healthy'}`, 20, 50);
    doc.text(`Doctor: ${r.doctor_name}`, 20, 60);
    doc.save(`Health_${r.animal_tag}.pdf`);
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-emerald-50 via-teal-50/30 to-green-50/20 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Health & Veterinary</h1>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-2">Live Diagnostics & Records</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 w-full sm:w-auto">
                  <button onClick={fetchData} className="bg-white/80 backdrop-blur-sm border border-white/20 p-4 rounded-2xl shadow-lg hover:bg-white transition-all hover:scale-105"><FaSync className="text-emerald-600" /></button>
                  <button onClick={() => setShowForm(!showForm)} className={`${showForm ? 'bg-gradient-to-r from-slate-700 to-slate-900' : 'bg-gradient-to-r from-emerald-600 to-teal-600'} text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-xl flex items-center gap-3 hover:scale-105 transition-all`}>
                    {showForm ? '✕ Close' : <><FaPlus /> New Entry</>}
                  </button>
                  <Link href="/farming" className="bg-white/80 backdrop-blur-sm border border-white/20 text-slate-700 px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg flex items-center gap-2 hover:bg-white hover:scale-105 transition-all">
                    <FaArrowLeft /> Dashboard
                  </Link>
                </div>
              </div>

              {!showForm && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[
                    { label: 'Reports', value: totalRecords, icon: FaFileMedical, color: 'blue' },
                    { label: 'Sick', value: records.filter(r => r.disease_name).length, icon: FaThermometerHalf, color: 'red' },
                    { label: 'Fees', value: `₹${records.reduce((acc, r) => acc + Number(r.cost), 0).toLocaleString('en-IN')}`, icon: FaSave, color: 'emerald' },
                    { label: 'Doctors', value: doctors.length, icon: FaUserMd, color: 'indigo' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 flex items-center gap-5 hover:scale-105 transition-all">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-${stat.color}-100 to-${stat.color}-50 flex items-center justify-center text-xl`}>
                        <stat.icon className={`text-${stat.color}-600`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

                  {!showForm && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden mb-20">
                      <div className="p-8 border-b border-white/20 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-3"><FaHistory /> Examination History</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-white">
                              <th className="px-8 py-6 text-left border-b border-white/20"><input type="checkbox" className="w-4 h-4 rounded border-emerald-200" /></th>
                              {['Animal', 'Vet', 'Temp', 'Diagnosis', 'Fees', 'Date', 'Action'].map((h, i) => (
                                <th key={i} className="text-xs font-bold text-slate-600 uppercase tracking-wider px-8 py-6 text-left border-b border-white/20">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {records.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-20">
                                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">No records found</div>
                                    <div className="text-xs text-slate-400 mt-2">Start adding health examinations</div>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              records.map(r => (
                                <tr key={r.id} className="border-b border-white/10 hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/30 transition-all">
                                  <td className="px-8 py-6"><input type="checkbox" className="w-4 h-4 rounded border-emerald-200" /></td>
                                  <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">{r.animal_tag || '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                         <FaBarcode className="text-xs" />
                                         <span className="text-xs font-mono font-bold tracking-wider text-slate-500">{r.barcode || 'NO-BARCODE'}</span>
                                      </div>
                                      <span className="text-xs font-bold uppercase bg-gradient-to-r from-emerald-100 to-teal-100 px-2 py-1 rounded-lg text-emerald-700">{r.type}</span>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6 text-sm font-semibold text-slate-700">{r.doctor_name || '-'}</td>
                                  <td className="px-8 py-6"><span className={`text-sm font-bold ${parseFloat(r.temperature) > 102 ? 'text-red-600' : 'text-slate-600'}`}>{r.temperature}°F</span></td>
                                  <td className="px-8 py-6"><span className={`text-xs font-bold px-3 py-2 rounded-lg ${r.disease_name ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{r.disease_name || 'HEALTHY'}</span></td>
                                  <td className="px-8 py-6 text-sm font-bold text-slate-900">₹{Number(r.cost).toLocaleString('en-IN')}</td>
                                  <td className="px-8 py-6 text-sm font-bold text-slate-500">{new Date(r.treatment_date).toLocaleDateString('en-IN')}</td>
                                  <td className="px-8 py-6 flex gap-2">
                                    <button onClick={() => handleDownloadPDF(r)} className="p-2 bg-white/60 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-emerald-50 text-slate-600 transition-all hover:scale-105"><FaDownload /></button>
                                    <button className="p-2 bg-white/60 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-blue-50 text-slate-600 transition-all hover:scale-105"><FaEnvelope /></button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-8 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border-t border-white/20 flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <span>Page {page} of {totalPages}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400">Last updated: {new Date().toLocaleTimeString('en-IN')}</span>
                          <div className="flex gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-6 py-2 bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl disabled:opacity-30 hover:bg-white transition-all hover:scale-105">Prev</button>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl disabled:opacity-30 hover:scale-105 transition-all">Next</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

               {showForm && (
                <div className="bg-white rounded-2xl sm:rounded-[3rem] shadow-2xl border border-emerald-100 overflow-hidden mb-12">
                   <div className="bg-emerald-600 p-6 sm:p-8 text-white flex justify-between items-center">
                      <div>
                        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tighter">Medical Examination Portal</h2>
                        <p className="text-[9px] sm:text-[10px] font-bold text-emerald-100 uppercase tracking-widest opacity-80">Capture real-time health diagnostics</p>
                      </div>
                      <button type="button" onClick={() => setShowForm(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold">✕</button>
                   </div>
                   <form onSubmit={handleSubmit} className="p-5 sm:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {/* BARCODE SCANNER INPUT */}
                      <div className="lg:col-span-3 bg-slate-900 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-800 shadow-2xl mb-4">
                        <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
                           <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400 text-2xl sm:text-3xl shadow-inner border border-white/5">
                              <FaBarcode />
                           </div>
                           <div className="flex-1 w-full">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block">Rapid Animal Scanner</label>
                              <input 
                                autoFocus
                                placeholder="Scan Barcode or Type Tag ID..."
                                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-5 text-white font-black text-lg focus:border-emerald-500 outline-none transition-all placeholder:text-slate-700"
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  const found = animals.find(a => a.tag_id === val || a.barcode === val);
                                  if (found) {
                                    setForm({ ...form, animal_id: found.id, type: found.type });
                                    toast.success(`Scanned: ${found.name || found.tag_id}`, { icon: '🔍' });
                                  }
                                }}
                              />
                           </div>
                           {form.animal_id && (
                             <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 animate-in zoom-in duration-300">
                                <FaCheckCircle className="text-emerald-500 text-2xl" />
                                <div>
                                   <p className="text-[8px] font-black text-emerald-600 uppercase">Selected</p>
                                   <p className="text-sm font-black text-white">{animals.find(a => a.id == form.animal_id)?.tag_id}</p>
                                </div>
                             </div>
                           )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Select Animal *</label>
                        <select required value={form.animal_id} onChange={e => {
                           const found = animals.find(a => a.id == e.target.value);
                           setForm({ ...form, animal_id: e.target.value, type: found?.type || form.type });
                        }} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs">
                          <option value="">-- Choose Animal --</option>
                          {animals.map(a => <option key={a.id} value={a.id}>{a.tag_id} ({a.type})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Vet Doctor *</label>
                        <select required value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs">
                          <option value="">-- Select Doctor --</option>
                          {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Diagnosis</label>
                        <input value={form.disease_name} onChange={e => setForm({ ...form, disease_name: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs" placeholder="e.g. Fever, Infection..." />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Cost (₹)</label>
                        <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs" placeholder="0" />
                      </div>

                      {/* DYNAMIC CHECKLIST */}
                      <div className="md:col-span-3 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
                           🔍 Vital Points Diagnostics (Dynamic)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                           {[
                             { id: 'eyes', label: 'Eyes (Clear)', icon: '👁️' },
                             { id: 'ears', label: 'Ears (Clean)', icon: '👂' },
                             { id: 'hoof', label: 'Hoof/Feet', icon: '🦶' },
                             { id: 'coat', label: 'Coat/Skin', icon: '🐕' },
                             { id: 'breathing', label: 'Breathing', icon: '🫁' },
                             { id: 'appetite', label: 'Appetite', icon: '🍽️' },
                             { id: 'activity', label: 'Activity', icon: '🏃' },
                             { id: 'tail', label: 'Tail/Movement', icon: '🐕' },
                           ].map((point) => (
                             <label key={point.id} className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded-lg border-2 border-emerald-200 text-emerald-600 focus:ring-emerald-500" />
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{point.icon} {point.id}</span>
                                  <span className="text-[11px] font-black text-slate-700 group-hover:text-emerald-600 transition-colors">{point.label}</span>
                                </div>
                             </label>
                           ))}
                        </div>
                        <div className="mt-8">
                           <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Additional Symptoms / Observations</label>
                           <textarea value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs h-24" placeholder="Describe any irregularities..." />
                        </div>
                      </div>

                      <div className="md:col-span-3">
                         <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white py-6 rounded-[2.5rem] font-black text-[13px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                           {submitting ? <FaSpinner className="animate-spin" /> : 'Finalize & Save Report'}
                         </button>
                      </div>
                   </form>
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

export default function HealthPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><HealthContent /></Suspense>;
}
