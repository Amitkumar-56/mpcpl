'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSpinner, FaSave, FaArrowLeft, FaMars, FaVenus, FaIdCard, FaBaby, FaWeight, FaMoneyBillWave, FaClipboardList, FaTags, FaCheckCircle, FaInfoCircle, FaQrcode, FaBarcode } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';

const BREEDS = {
  cow: ['Holstein', 'Jersey', 'Gir', 'Sahiwal', 'Tharparkar', 'Murrah', 'Red Sindhi', 'Kankrej', 'Rathi', 'Other'],
  goat: ['Jamunapari', 'Barbari', 'Sirohi', 'Beetal', 'Black Bengal', 'Osmanabadi', 'Marwari', 'Other'],
  chicken: ['Broiler', 'Layer', 'Desi', 'Kadaknath', 'Rhode Island', 'White Leghorn', 'Aseel', 'Other'],
  fish: ['Rohu', 'Catla', 'Mrigal', 'Tilapia', 'Pangasius', 'Common Carp', 'Silver Carp', 'Other'],
  honey: ['Italian Bee', 'Indian Bee', 'Rock Bee', 'Little Bee', 'Stingless Bee', 'Other'],
};

const ANIMAL_TYPES = [
  { id: 'cow', label: 'Cow', icon: '🐄' },
  { id: 'goat', label: 'Goat', icon: '🐐' },
  { id: 'chicken', label: 'Chicken', icon: '🐔' },
  { id: 'fish', label: 'Fish', icon: '🐟' },
  { id: 'honey', label: 'Honey', icon: '🍯' },
];

function CreateAnimalContent() {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [mothers, setMothers] = useState([]);
  const [fathers, setFathers] = useState([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const preType = searchParams.get('type') || 'cow';
  const preEntry = searchParams.get('entry') || 'purchase';

  const [form, setForm] = useState({
    name: '', type: preType, breed: '', gender: 'female',
    date_of_birth: '', weight: '', color: '', mother_id: '', father_id: '',
    batch_id: '', purchase_price: '', source: '', notes: '', entry_type: preEntry
  });

  const h = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    fetch(`/api/farming/batches?status=active&type=${form.type}`).then(r => r.json()).then(d => { if (d.success) setBatches(d.data); });
    fetch(`/api/farming/animals?type=${form.type}&gender=female&status=active`).then(r => r.json()).then(d => { if (d.success) setMothers(d.data); });
    fetch(`/api/farming/animals?type=${form.type}&gender=male&status=active`).then(r => r.json()).then(d => { if (d.success) setFathers(d.data); });
  }, [mounted, form.type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.gender) return toast.error('Please select gender!');
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/animals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Registered! Tag: ${data.tag_id}`);
        router.push('/farming/animals?type=' + form.type);
      } else toast.error(data.error);
    } catch (e) { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  if (!mounted) return null;
  const isBirth = form.entry_type === 'birth';

  const prefix = form.type.toUpperCase().slice(0, 3);
  const genderCode = form.gender === 'female' ? 'F' : 'M';
  const tagPreview = `${prefix}-${genderCode}-XXXX`;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
              
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-6">
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter">Animal Registration</h1>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Create comprehensive digital livestock records</p>
                </div>
                <Link href="/farming/animals" className="bg-white border-2 border-slate-900 text-slate-900 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-3xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
                  <FaArrowLeft /> <span className="sm:inline">Back to List</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Form Area */}
                <div className="lg:col-span-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* TYPE SELECTION */}
                    <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-sm border border-slate-100">
                      <div className="flex items-center gap-4 mb-6 sm:mb-8">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-2xl"><FaTags className="text-lg sm:text-xl" /></div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">Livestock Category</h3>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold">Select the type of animal to register</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                        {ANIMAL_TYPES.map(t => (
                          <button key={t.id} type="button" onClick={() => h('type', t.id)} className={`flex flex-col items-center p-6 rounded-[2rem] border-2 transition-all duration-300 ${form.type === t.id ? 'border-slate-900 bg-slate-900 text-white shadow-2xl -translate-y-2' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 text-slate-600'}`}>
                            <span className="text-4xl mb-3">{t.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* IDENTITY & BASIC INFO */}
                    <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-sm border border-slate-100">
                      <div className="flex items-center gap-4 mb-6 sm:mb-8">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl"><FaIdCard className="text-lg sm:text-xl" /></div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">Basic Identity</h3>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold">Primary identification details</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Biological Gender</label>
                          <div className="flex gap-3">
                             <button type="button" onClick={() => h('gender', 'female')} className={`flex-1 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${form.gender === 'female' ? 'bg-pink-600 text-white shadow-2xl ring-4 ring-pink-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                               <FaVenus /> Female
                             </button>
                             <button type="button" onClick={() => h('gender', 'male')} className={`flex-1 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${form.gender === 'male' ? 'bg-blue-600 text-white shadow-2xl ring-4 ring-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                               <FaMars /> Male
                             </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Assigned Name</label>
                          <input value={form.name} onChange={e => h('name', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-indigo-200 outline-none font-black text-sm transition-all shadow-inner" placeholder="e.g. Lakshmi" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Breed / Variety</label>
                          <select value={form.breed} onChange={e => h('breed', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-indigo-200 outline-none font-black text-sm transition-all shadow-inner appearance-none">
                            <option value="">Select Breed</option>
                            {(BREEDS[form.type] || []).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Primary Color</label>
                          <input value={form.color} onChange={e => h('color', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-indigo-200 outline-none font-black text-sm transition-all shadow-inner" placeholder="e.g. Black & White" />
                        </div>
                      </div>
                    </div>

                    {/* PHYSICAL & LINEAGE */}
                    <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-sm border border-slate-100">
                      <div className="flex items-center gap-4 mb-6 sm:mb-8">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-2xl"><FaBaby className="text-lg sm:text-xl" /></div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">Lineage & Growth</h3>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold">Historical and parentage records</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Genetic Mother ♀</label>
                          <select value={form.mother_id} onChange={e => h('mother_id', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-black text-sm outline-none shadow-inner appearance-none">
                            <option value="">-- Unknown / Market Purchase --</option>
                            {mothers.map(m => <option key={m.id} value={m.id}>{m.tag_id} ({m.name || m.breed})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Genetic Father ♂</label>
                          <select value={form.father_id} onChange={e => h('father_id', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-black text-sm outline-none shadow-inner appearance-none">
                            <option value="">-- Unknown / Market Purchase --</option>
                            {fathers.map(f => <option key={f.id} value={f.id}>{f.tag_id} ({f.name || f.breed})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Initial Weight (kg)</label>
                          <div className="relative">
                            <input type="number" step="0.01" value={form.weight} onChange={e => h('weight', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-black text-sm outline-none shadow-inner" placeholder="0.00" />
                            <FaWeight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Date of Birth / Arrival</label>
                          <input type="date" value={form.date_of_birth} onChange={e => h('date_of_birth', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-black text-sm outline-none shadow-inner" />
                        </div>
                      </div>
                    </div>

                    {/* COMMERCIALS */}
                    <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] shadow-sm border border-slate-100">
                      <div className="flex items-center gap-4 mb-6 sm:mb-8">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-2xl"><FaMoneyBillWave className="text-lg sm:text-xl" /></div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">Commercial & Batch</h3>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold">Financial and operational tracking</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Purchase Price (₹)</label>
                          <input type="number" value={form.purchase_price} onChange={e => h('purchase_price', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-black text-sm outline-none shadow-inner" placeholder="0" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Assigned Logistics Batch</label>
                          <select value={form.batch_id} onChange={e => h('batch_id', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-black text-sm outline-none shadow-inner appearance-none">
                            <option value="">-- Direct Individual Entry --</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}
                          </select>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Procurement Source</label>
                          <input value={form.source} onChange={e => h('source', e.target.value)} className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-black text-sm outline-none shadow-inner" placeholder="Vendor, Market Name, or Parent Farm" />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Special Remarks</label>
                          <textarea value={form.notes} onChange={e => h('notes', e.target.value)} rows={4} className="w-full p-6 rounded-[2rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-black text-sm outline-none shadow-inner" placeholder="Any distinctive marks or behavioral notes..." />
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 group">
                      {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave className="text-xl group-hover:scale-125 transition-transform" /> Register To Database</>}
                    </button>
                  </form>
                </div>

                {/* Sidebar Preview */}
                <div className="lg:col-span-4">
                  <div className="sticky top-8 space-y-8">
                    
                    {/* Live Digital Card */}
                    <div className="bg-slate-900 rounded-2xl sm:rounded-[3rem] p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                       <div className="relative z-10">
                          <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-2">
                              <FaInfoCircle className="text-slate-600" />
                              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Live Identity Draft</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><FaQrcode className="text-slate-600 text-xs" /></div>
                          </div>

                          <div className="flex items-center gap-5 mb-10">
                             <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl transition-all duration-500 ${form.gender === 'female' ? 'bg-pink-600 rotate-3' : 'bg-blue-600 -rotate-3'}`}>
                               {ANIMAL_TYPES.find(t => t.id === form.type)?.icon || '🐾'}
                             </div>
                             <div>
                                <h4 className="text-2xl font-black tracking-tighter leading-none mb-2 truncate max-w-[150px]">{form.name || 'Animal Name'}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-white/10 rounded-full text-[7px] font-black uppercase tracking-widest">{form.type}</span>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase truncate max-w-[80px]">{form.breed || 'Unknown Breed'}</span>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-5">
                             <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-2">Automated Tag ID</p>
                                <p className="text-sm font-mono font-black text-emerald-400 tracking-[0.2em]">{tagPreview}</p>
                             </div>
                             <div className="bg-white p-6 rounded-[2rem] border border-white/5 flex items-center justify-between gap-6">
                                <div className="flex-1 flex flex-col items-center">
                                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-3">Machine Barcode</p>
                                    <FaBarcode className="text-white text-4xl sm:text-6xl mb-2" />
                                    <p className="text-[8px] sm:text-[9px] font-mono font-black text-white tracking-[0.4em]">{tagPreview.replace('XXXX', '0001')}</p>
                                 </div>
                                 <div className="w-px h-16 sm:h-24 bg-white/10" />
                                 <div className="text-center">
                                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-3">Mobile Link</p>
                                    <div className="bg-white p-2 rounded-xl">
                                      <img 
                                         src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/farming/animals/profile/' + tagPreview : '')}`}
                                         alt="QR"
                                         className="w-12 h-12 sm:w-16 sm:h-16"
                                      />
                                    </div>
                                   <p className="text-[6px] font-black text-emerald-500 mt-2 uppercase">Scan for Profile</p>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                   <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1">Weight</p>
                                   <p className="text-xs font-black">{form.weight || '0'} kg</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                   <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1">Purchase</p>
                                   <p className="text-xs font-black text-emerald-400">₹{form.purchase_price || '0'}</p>
                                </div>
                              </div>
                          </div>
                       </div>
                       {/* Background Decorations */}
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                       <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                    </div>

                    {/* Data Quality Check */}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                       <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3"><FaClipboardList className="text-slate-400" /> Data Health Check</h5>
                       <div className="space-y-4">
                          {[
                            { l: 'Animal Type Selected', v: !!form.type },
                            { l: 'Gender Assigned', v: !!form.gender },
                            { l: 'Initial Weight Logged', v: !!form.weight },
                            { l: 'Origin Source Defined', v: !!form.source },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group">
                              <span className={`text-[10px] font-bold transition-colors ${item.v ? 'text-slate-600' : 'text-slate-300'}`}>{item.l}</span>
                              {item.v ? <FaCheckCircle className="text-emerald-500 text-sm" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-100 group-hover:border-slate-200" />}
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="p-8 rounded-[3rem] bg-indigo-50 border border-indigo-100">
                       <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><FaInfoCircle /> Smart Tip</p>
                       <p className="text-[10px] font-bold text-indigo-900 leading-relaxed">Proper weight logging helps in calculating accurate Feed-to-Weight ratios for better ROI.</p>
                    </div>

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

export default function CreateAnimalPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><CreateAnimalContent /></Suspense>;
}
