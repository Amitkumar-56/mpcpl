'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSpinner, FaSave, FaArrowLeft, FaMars, FaVenus } from 'react-icons/fa';
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
    if (form.entry_type === 'birth' && !form.mother_id) return toast.error('Please select mother for birth entry!');

    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/animals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Registered! Tag: ${data.tag_id} | Barcode: ${data.barcode}`);
        router.push('/farming/animals?type=' + form.type);
      } else toast.error(data.error);
    } catch (e) { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  if (!mounted) return null;
  const isBirth = form.entry_type === 'birth';

  // Tag ID preview
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
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">
                    {isBirth ? '🐣 Register Child' : '➕ Register Animal'}
                  </h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isBirth ? 'Birth Entry' : 'Purchase / Existing Entry'}
                  </p>
                </div>
                <Link href="/farming/animals" className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                  <FaArrowLeft /> Back
                </Link>
              </div>

              {/* Auto Tag Preview */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-5 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Auto-Generated Tag ID</p>
                  <p className="text-2xl font-black tracking-wider mt-1">{tagPreview}</p>
                  <p className="text-[9px] text-slate-400 mt-1">Tag ID and Barcode will be generated automatically</p>
                </div>
                <div className="text-5xl">{form.type === 'cow' ? '🐄' : form.type === 'goat' ? '🐐' : form.type === 'chicken' ? '🐔' : form.type === 'fish' ? '🐟' : '🍯'}</div>
              </div>

              {/* Entry Type Toggle */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
                <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Entry Type</h2>
                <div className="flex gap-3">
                  <button type="button" onClick={() => h('entry_type', 'purchase')}
                    className={`flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${!isBirth ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500'}`}>
                    🛒 Purchase
                  </button>
                  <button type="button" onClick={() => h('entry_type', 'birth')}
                    className={`flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${isBirth ? 'bg-pink-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500'}`}>
                    🐣 Birth
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* PARENTS - Birth mode */}
                {isBirth && (
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl shadow-sm border border-pink-200 p-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-pink-800 mb-4">👨‍👩‍👧 Parents (Required)</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-pink-600 uppercase block mb-1"><FaVenus className="inline mr-1" />Mother *</label>
                        <select required value={form.mother_id} onChange={e => h('mother_id', e.target.value)}
                          className="w-full p-3 rounded-xl border-2 border-pink-300 bg-white font-bold text-xs focus:border-pink-500 outline-none">
                          <option value="">-- Select Mother --</option>
                          {mothers.map(m => (
                            <option key={m.id} value={m.id}>{m.name || m.tag_id} ({m.breed || form.type}) - {m.offspring_count || 0} children</option>
                          ))}
                        </select>
                        {mothers.length === 0 && <p className="text-[9px] text-red-500 mt-1 font-bold">⚠️ Please register a female {form.type} first!</p>}
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-blue-600 uppercase block mb-1"><FaMars className="inline mr-1" />Father</label>
                        <select value={form.father_id} onChange={e => h('father_id', e.target.value)}
                          className="w-full p-3 rounded-xl border-2 border-blue-300 bg-white font-bold text-xs focus:border-blue-500 outline-none">
                          <option value="">-- Select Father --</option>
                          {fathers.map(f => (
                            <option key={f.id} value={f.id}>{f.name || f.tag_id} ({f.breed || form.type}) - {f.offspring_count || 0} children</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">🏷️ Identity</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Type *</label>
                      <select required value={form.type} onChange={e => { h('type', e.target.value); h('mother_id', ''); h('father_id', ''); h('breed', ''); }}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs">
                        <option value="cow">🐄 Cow</option>
                        <option value="goat">🐐 Goat</option>
                        <option value="chicken">🐔 Chicken</option>
                        <option value="fish">🐟 Fish</option>
                        <option value="honey">🍯 Honey</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Gender *</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => h('gender', 'female')}
                          className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${form.gender === 'female' ? 'bg-pink-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                          <FaVenus /> Female
                        </button>
                        <button type="button" onClick={() => h('gender', 'male')}
                          className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${form.gender === 'male' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                          <FaMars /> Male
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Name</label>
                      <input value={form.name} onChange={e => h('name', e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="e.g. Lakshmi, Raja..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Breed</label>
                      <select value={form.breed} onChange={e => h('breed', e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs">
                        <option value="">Select Breed</option>
                        {(BREEDS[form.type] || []).map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">{isBirth ? 'Date of Birth' : 'Date'}</label>
                      <input type="date" value={form.date_of_birth} onChange={e => h('date_of_birth', e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Weight (kg)</label>
                      <input type="number" step="0.01" value={form.weight} onChange={e => h('weight', e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Color</label>
                      <input value={form.color} onChange={e => h('color', e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="Brown, Black, White..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Batch</label>
                      <select value={form.batch_id} onChange={e => h('batch_id', e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs">
                        <option value="">-- No Batch --</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Purchase Info */}
                {!isBirth && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">💰 Purchase Details & Lineage</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-pink-500 uppercase block mb-1"><FaVenus className="inline mr-1" />Mother (optional)</label>
                        <select value={form.mother_id} onChange={e => h('mother_id', e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs">
                          <option value="">-- N/A --</option>
                          {mothers.map(m => <option key={m.id} value={m.id}>{m.name || m.tag_id} ({m.breed || '-'})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-blue-500 uppercase block mb-1"><FaMars className="inline mr-1" />Father (optional)</label>
                        <select value={form.father_id} onChange={e => h('father_id', e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs">
                          <option value="">-- N/A --</option>
                          {fathers.map(f => <option key={f.id} value={f.id}>{f.name || f.tag_id} ({f.breed || '-'})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Purchase Price (₹)</label>
                        <input type="number" value={form.purchase_price} onChange={e => h('purchase_price', e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Source</label>
                        <input value={form.source} onChange={e => h('source', e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="Market, Farm..." />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => h('notes', e.target.value)} rows={2}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-xs" placeholder="Any notes..." />
                </div>

                <button type="submit" disabled={submitting}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 text-white ${isBirth ? 'bg-pink-600' : 'bg-emerald-600'}`}>
                  {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> {isBirth ? 'Register Child' : 'Register Animal'}</>}
                </button>
              </form>
            </div>
          </div>
        </main>
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]"><Footer /></div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function CreateAnimalPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><CreateAnimalContent /></Suspense>;
}
