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
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
         <Link href="/farming" className="bg-white/80 backdrop-blur-sm border border-white/20 p-4 rounded-2xl shadow-lg hover:bg-white transition-all hover:scale-105">
           <FaArrowLeft className="text-slate-600" />
         </Link>
         <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-right">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">🩺 Smart Diagnostic</h1>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-2">Powered by AI Analytics</p>
         </div>
      </div>

      {/* Main Tool Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden mb-10">
         <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <h2 className="text-xl font-bold uppercase tracking-tight">New Health Scan</h2>
            <p className="text-sm text-blue-100 mt-2">Select an animal and enter body temperature for instant analysis.</p>
         </div>
         
         <div className="p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
               <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 block flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>1. Select Animal Tag</label>
                  <select value={selectedAnimalId} onChange={(e) => {
                    setSelectedAnimalId(e.target.value);
                    const a = animals.find(x => x.id == e.target.value);
                    if (a) setAnimalType(a.type);
                  }} className="w-full bg-white/60 backdrop-blur-sm border-2 border-blue-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 hover:bg-white transition-all">
                    <option value="">-- Choose Tag --</option>
                    {animals.map(a => <option key={a.id} value={a.id}>{a.tag_id} ({a.type})</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 block flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span>2. Category</label>
                  <div className="flex gap-2">
                     {Object.entries(ANIMAL_VARS).map(([k, v]) => (
                        <button key={k} onClick={() => setAnimalType(k)} className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center hover:scale-105 ${animalType === k ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white shadow-lg' : 'bg-white/60 backdrop-blur-sm border-blue-100 text-slate-600 hover:bg-white'}`}>
                           <span className="text-xl">{v.icon}</span>
                           <span className="text-xs font-bold uppercase">{k}</span>
                        </button>
                     ))}
                  </div>
               </div>
               <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 block flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span>3. Temp (°F)</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} className="w-full bg-white/60 backdrop-blur-sm border-2 border-blue-100 rounded-2xl p-4 text-2xl font-bold outline-none focus:border-blue-500 hover:bg-white transition-all" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">°F</span>
                  </div>
               </div>
            </div>
            <button onClick={runDiagnosis} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 rounded-3xl font-bold text-sm uppercase tracking-wider shadow-xl hover:from-blue-700 hover:to-indigo-700 mt-10 flex items-center justify-center gap-3 hover:scale-105 transition-all"><FaLightbulb /> Analyze Health</button>
         </div>
      </div>

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
           <div className={`rounded-3xl p-10 border-4 shadow-2xl backdrop-blur-sm ${result.status === 'normal' ? 'bg-gradient-to-br from-emerald-50/80 to-green-50/80 border-emerald-200' : result.status === 'high' ? 'bg-gradient-to-br from-rose-50/80 to-red-50/80 border-rose-200' : 'bg-gradient-to-br from-amber-50/80 to-yellow-50/80 border-amber-200'}`}>
              <div className="flex flex-col md:flex-row gap-10 items-center">
                 <div className="relative">
                    <div className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border-8 shadow-inner backdrop-blur-sm ${result.status === 'normal' ? 'bg-white/90 border-emerald-500 text-emerald-600' : result.status === 'high' ? 'bg-white/90 border-rose-500 text-rose-600' : 'bg-white/90 border-amber-500 text-amber-600'}`}>
                       <span className="text-5xl font-bold">{result.val}</span>
                       <span className="text-xs font-bold uppercase">°F</span>
                    </div>
                    <div className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${result.status === 'normal' ? 'bg-emerald-500' : result.status === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`}><FaCheckCircle /></div>
                 </div>
                 <div className="flex-1">
                    <h3 className={`text-3xl font-bold uppercase mb-2 ${result.status === 'normal' ? 'text-emerald-900' : result.status === 'high' ? 'text-rose-900' : 'text-amber-900'}`}>{result.status === 'normal' ? 'Normal' : result.status === 'high' ? 'High Fever' : 'Low Temp'}</h3>
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-sm mt-4">
                       {result.diagnosis ? (
                          <>
                             <h4 className="text-xl font-bold text-slate-900 mb-2">{result.diagnosis.name}</h4>
                             <p className="text-sm font-bold text-slate-600 italic mb-4">Risk Level: <span className={`px-2 py-1 rounded-lg text-xs ${result.diagnosis.risk === 'critical' ? 'bg-red-100 text-red-700' : result.diagnosis.risk === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{result.diagnosis.risk.toUpperCase()}</span></p>
                             <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 mb-6">{result.diagnosis.action}</div>
                          </>
                       ) : <p className="text-sm font-bold text-slate-600 italic mb-6">Status: All good. No health concerns detected.</p>}
                       <button onClick={handleSaveHistory} disabled={isSaving} className="w-full bg-gradient-to-r from-slate-700 to-slate-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 hover:scale-105">
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 overflow-hidden">
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
