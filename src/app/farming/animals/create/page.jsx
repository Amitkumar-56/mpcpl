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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
              
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-6">
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Animal Registration</h1>
                  <p className="text-sm text-gray-600 mt-1">Create comprehensive digital livestock records</p>
                </div>
                <Link href="/farming/animals" className="bg-white border border-gray-900 text-gray-900 px-6 py-3 rounded-lg font-medium text-sm hover:bg-gray-900 hover:text-white transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                  <FaArrowLeft /> <span className="sm:inline">Back to List</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Form Area */}
                <div className="lg:col-span-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* TYPE SELECTION */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center"><FaTags className="text-lg" /></div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Livestock Category</h3>
                          <p className="text-sm text-gray-600">Select type of animal to register</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                        {ANIMAL_TYPES.map(t => (
                          <button key={t.id} type="button" onClick={() => h('type', t.id)} className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${form.type === t.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}>
                            <span className="text-4xl mb-3">{t.icon}</span>
                            <span className="text-sm font-medium">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* IDENTITY & BASIC INFO */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center"><FaIdCard className="text-lg" /></div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Basic Identity</h3>
                          <p className="text-sm text-gray-600">Primary identification details</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Biological Gender</label>
                          <div className="flex gap-3">
                             <button type="button" onClick={() => h('gender', 'female')} className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${form.gender === 'female' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
                               <FaVenus /> Female
                             </button>
                             <button type="button" onClick={() => h('gender', 'male')} className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${form.gender === 'male' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
                               <FaMars /> Male
                             </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Assigned Name</label>
                          <input value={form.name} onChange={e => h('name', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Lakshmi" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Breed / Variety</label>
                          <select value={form.breed} onChange={e => h('breed', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                            <option value="">Select Breed</option>
                            {(BREEDS[form.type] || []).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Primary Color</label>
                          <input value={form.color} onChange={e => h('color', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Black & White" />
                        </div>
                      </div>
                    </div>

                    {/* PHYSICAL & LINEAGE */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center"><FaBaby className="text-lg" /></div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Lineage & Growth</h3>
                          <p className="text-sm text-gray-600">Historical and parentage records</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Genetic Mother ♀</label>
                          <select value={form.mother_id} onChange={e => h('mother_id', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                            <option value="">-- Unknown / Market Purchase --</option>
                            {mothers.map(m => <option key={m.id} value={m.id}>{m.tag_id} ({m.name || m.breed})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Genetic Father ♂</label>
                          <select value={form.father_id} onChange={e => h('father_id', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                            <option value="">-- Unknown / Market Purchase --</option>
                            {fathers.map(f => <option key={f.id} value={f.id}>{f.tag_id} ({f.name || f.breed})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Initial Weight (kg)</label>
                          <div className="relative">
                            <input type="number" step="0.01" value={form.weight} onChange={e => h('weight', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="0.00" />
                            <FaWeight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Date of Birth / Arrival</label>
                          <input type="date" value={form.date_of_birth} onChange={e => h('date_of_birth', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                      </div>
                    </div>

                    {/* COMMERCIALS */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><FaMoneyBillWave className="text-lg" /></div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Commercial & Batch</h3>
                          <p className="text-sm text-gray-600">Financial and operational tracking</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Purchase Price (₹)</label>
                          <input type="number" value={form.purchase_price} onChange={e => h('purchase_price', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="0" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Assigned Logistics Batch</label>
                          <select value={form.batch_id} onChange={e => h('batch_id', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                            <option value="">-- Direct Individual Entry --</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}
                          </select>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-sm font-medium text-gray-700 block mb-2">Procurement Source</label>
                          <input value={form.source} onChange={e => h('source', e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Vendor, Market Name, or Parent Farm" />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-sm font-medium text-gray-700 block mb-2">Special Remarks</label>
                          <textarea value={form.notes} onChange={e => h('notes', e.target.value)} rows={4} className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Any distinctive marks or behavioral notes..." />
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white py-4 rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Register To Database</>}
                    </button>
                  </form>
                </div>

                {/* Sidebar Preview */}
                <div className="lg:col-span-4">
                  <div className="sticky top-8 space-y-6">
                    
                    {/* Live Digital Card */}
                    <div className="bg-gray-900 rounded-lg p-6 text-white shadow relative overflow-hidden border border-gray-800">
                       <div className="relative z-10">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                              <FaInfoCircle className="text-gray-400" />
                              <span className="text-xs font-medium text-gray-500">Live Identity Draft</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><FaQrcode className="text-gray-600 text-xs" /></div>
                          </div>

                          <div className="flex items-center gap-4 mb-6">
                             <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${form.gender === 'female' ? 'bg-pink-600' : 'bg-blue-600'}`}>
                               {ANIMAL_TYPES.find(t => t.id === form.type)?.icon || '🐾'}
                             </div>
                             <div>
                                <h4 className="text-xl font-bold leading-none mb-1 truncate max-w-[150px]">{form.name || 'Animal Name'}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-white/10 rounded-full text-xs font-medium">{form.type}</span>
                                  <span className="text-xs text-gray-400 truncate max-w-[80px]">{form.breed || 'Unknown Breed'}</span>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-xs font-medium text-gray-600 mb-1">Automated Tag ID</p>
                                <p className="text-sm font-mono font-bold text-green-400">{tagPreview}</p>
                             </div>
                             <div className="bg-white p-4 rounded-lg border border-white/5 flex items-center justify-between gap-4">
                                <div className="flex-1 flex flex-col items-center">
                                    <p className="text-xs font-medium text-gray-600 mb-2">Machine Barcode</p>
                                    <FaBarcode className="text-white text-4xl mb-2" />
                                    <p className="text-xs font-mono font-bold text-white">{tagPreview.replace('XXXX', '0001')}</p>
                                 </div>
                                 <div className="w-px h-16 bg-white/10" />
                                 <div className="text-center">
                                    <p className="text-xs font-medium text-gray-600 mb-2">Mobile Link</p>
                                    <div className="bg-white p-2 rounded-lg">
                                      <img 
                                         src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/farming/animals/profile/' + tagPreview : '')}`}
                                         alt="QR"
                                         className="w-12 h-12"
                                      />
                                    </div>
                                   <p className="text-xs font-bold text-green-500 mt-1">Scan for Profile</p>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                   <p className="text-xs font-medium text-gray-600 mb-1">Weight</p>
                                   <p className="text-sm font-bold">{form.weight || '0'} kg</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                   <p className="text-xs font-medium text-gray-600 mb-1">Purchase</p>
                                   <p className="text-sm font-bold text-green-400">₹{form.purchase_price || '0'}</p>
                                </div>
                              </div>
                          </div>
                       </div>
                    </div>

                    {/* Data Quality Check */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
                       <h5 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2"><FaClipboardList className="text-gray-400" /> Data Health Check</h5>
                       <div className="space-y-3">
                          {[
                            { l: 'Animal Type Selected', v: !!form.type },
                            { l: 'Gender Assigned', v: !!form.gender },
                            { l: 'Initial Weight Logged', v: !!form.weight },
                            { l: 'Origin Source Defined', v: !!form.source },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className={`text-sm transition-colors ${item.v ? 'text-gray-600' : 'text-gray-300'}`}>{item.l}</span>
                              {item.v ? <FaCheckCircle className="text-green-500 text-sm" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="p-6 rounded-lg bg-blue-50 border border-blue-100">
                       <p className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-2"><FaInfoCircle /> Smart Tip</p>
                       <p className="text-sm text-blue-900">Proper weight logging helps in calculating accurate Feed-to-Weight ratios for better ROI.</p>
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
  return <Suspense fallback={<div className="p-20 text-center text-gray-500">Loading...</div>}><CreateAnimalContent /></Suspense>;
}
