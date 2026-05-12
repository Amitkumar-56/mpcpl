'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { 
  FaThermometerHalf, FaCheckCircle, FaExclamationTriangle, 
  FaStethoscope, FaArrowLeft, FaInfoCircle, FaVial,
  FaShieldAlt, FaUserMd, FaLightbulb, FaHistory, FaSpinner
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

const ANIMAL_VARS = {
  cow: {
    name: 'Cow (गाय)',
    normalMin: 100.4,
    normalMax: 102.8,
    icon: '🐄',
    diseases: [
      { min: 103.5, max: 107.0, name: 'Anthrax / Black Quarter', risk: 'critical', action: 'Isolate immediately and call a vet.' },
      { min: 103.0, max: 105.0, name: 'Haemorrhagic Septicaemia (HS)', risk: 'high', action: 'Antibiotics treatment required.' },
      { min: 95.0, max: 99.5, name: 'Milk Fever (Hypocalcemia)', risk: 'high', action: 'Calcium gluconate injection needed.' }
    ]
  },
  goat: {
    name: 'Goat (बकरी)',
    normalMin: 101.3,
    normalMax: 103.5,
    icon: '🐐',
    diseases: [
      { min: 104.5, max: 108.0, name: 'PPR (Peste des Petits Ruminants)', risk: 'critical', action: 'Highly contagious. Quarantine immediately.' },
      { min: 104.0, max: 106.0, name: 'Pneumonia / CCPP', risk: 'high', action: 'Antibiotics and warm shelter needed.' }
    ]
  },
  chicken: {
    name: 'Chicken (मुर्गी)',
    normalMin: 105.0,
    normalMax: 107.0,
    icon: '🐔',
    diseases: [
      { min: 108.0, max: 110.0, name: 'Ranikhet (Newcastle Disease)', risk: 'critical', action: 'Immediate vaccination and flock isolation.' }
    ]
  }
};

function DiagnosticContent() {
  const [animalType, setAnimalType] = useState('cow');
  const [animals, setAnimals] = useState([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [temp, setTemp] = useState('');
  const [result, setResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchAnimals(); }, []);

  const fetchAnimals = async () => {
    try {
      const res = await fetch('/api/farming/animals?status=active');
      const data = await res.json();
      if (data.success) setAnimals(data.data);
    } catch (e) { console.error(e); }
  };

  const runDiagnosis = () => {
    if (!temp) return toast.error("Enter temperature");
    const t = parseFloat(temp);
    const config = ANIMAL_VARS[animalType];
    let status = t > config.normalMax ? 'high' : t < config.normalMin ? 'low' : 'normal';
    let diagnosis = config.diseases.find(d => t >= d.min && t <= d.max);
    setResult({ status, val: t, config, diagnosis });
  };

  const handleSaveHistory = async () => {
    if (!selectedAnimalId) return toast.error("Select an animal first");
    try {
      setIsSaving(true);
      const res = await fetch('/api/farming/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animal_id: selectedAnimalId,
          type: animalType,
          disease_name: result.diagnosis?.name || (result.status !== 'normal' ? 'Abnormal Temp' : 'Routine Check'),
          temperature: result.val,
          treatment_date: new Date().toISOString().split('T')[0],
          notes: result.diagnosis?.action || 'Manual entry via AI Tool.'
        })
      });
      if ((await res.json()).success) toast.success("History Updated!");
    } catch (e) { toast.error("Error saving"); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
         <Link href="/farming" className="bg-white p-3 rounded-xl border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm"><FaArrowLeft /></Link>
         <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900">🩺 Smart Diagnostic</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Powered by AI Analytics</p>
         </div>
      </div>

      {/* Main Tool Card */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden mb-10">
         <div className="bg-slate-900 p-8 text-white">
            <h2 className="text-lg font-black uppercase tracking-tight">New Health Scan</h2>
            <p className="text-xs text-slate-400">Select an animal and enter body temperature for instant analysis.</p>
         </div>
         
         <div className="p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">1. Select Animal Tag</label>
                  <select value={selectedAnimalId} onChange={(e) => {
                    setSelectedAnimalId(e.target.value);
                    const a = animals.find(x => x.id == e.target.value);
                    if (a) setAnimalType(a.type);
                  }} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-xs font-black outline-none focus:border-blue-500">
                    <option value="">-- Choose Tag --</option>
                    {animals.map(a => <option key={a.id} value={a.id}>{a.tag_id} ({a.type})</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">2. Category</label>
                  <div className="flex gap-2">
                     {Object.entries(ANIMAL_VARS).map(([k, v]) => (
                        <button key={k} onClick={() => setAnimalType(k)} className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center ${animalType === k ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-400'}`}>
                           <span className="text-xl">{v.icon}</span>
                           <span className="text-[8px] font-black uppercase">{k}</span>
                        </button>
                     ))}
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">3. Temp (°F)</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-2xl font-black outline-none focus:border-blue-500" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">°F</span>
                  </div>
               </div>
            </div>
            <button onClick={runDiagnosis} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-blue-700 mt-10 flex items-center justify-center gap-3"><FaLightbulb /> Analyze Health</button>
         </div>
      </div>

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
           <div className={`rounded-[3rem] p-10 border-4 shadow-2xl ${result.status === 'normal' ? 'bg-emerald-50 border-emerald-100' : result.status === 'high' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex flex-col md:flex-row gap-10 items-center">
                 <div className="relative">
                    <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border-8 shadow-inner ${result.status === 'normal' ? 'bg-white border-emerald-500 text-emerald-500' : result.status === 'high' ? 'bg-white border-rose-500 text-rose-500' : 'bg-white border-amber-500 text-amber-500'}`}>
                       <span className="text-4xl font-black">{result.val}</span>
                       <span className="text-[10px] font-black uppercase">°F</span>
                    </div>
                    <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${result.status === 'normal' ? 'bg-emerald-500' : result.status === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`}><FaCheckCircle /></div>
                 </div>
                 <div className="flex-1">
                    <h3 className={`text-2xl font-black uppercase mb-1 ${result.status === 'normal' ? 'text-emerald-900' : result.status === 'high' ? 'text-rose-900' : 'text-amber-900'}`}>{result.status === 'normal' ? 'Normal' : result.status === 'high' ? 'High Fever' : 'Low Temp'}</h3>
                    <div className="bg-white/80 p-6 rounded-3xl border border-white shadow-sm mt-4">
                       {result.diagnosis ? (
                          <>
                             <h4 className="text-lg font-black text-slate-900 mb-1">{result.diagnosis.name}</h4>
                             <p className="text-xs font-bold text-slate-500 italic mb-4">Risk: {result.diagnosis.risk}</p>
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-600 mb-6">{result.diagnosis.action}</div>
                          </>
                       ) : <p className="text-xs font-bold text-slate-500 italic mb-6">Status: All good.</p>}
                       <button onClick={handleSaveHistory} disabled={isSaving} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                          {isSaving ? <FaSpinner className="animate-spin" /> : <FaHistory />} Save to {selectedAnimalId ? animals.find(a => a.id == selectedAnimalId)?.tag_id : 'Animal'} History
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default function SmartDiagnosticPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Smart Diagnostic" />
        <main className="flex-1 overflow-y-auto pb-32">
          <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /><p className="mt-4 font-bold text-slate-400 animate-pulse">Initializing AI Diagnostic...</p></div>}>
            <DiagnosticContent />
          </Suspense>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
