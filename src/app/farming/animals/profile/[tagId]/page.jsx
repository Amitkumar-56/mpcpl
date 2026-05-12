'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaSpinner, FaHistory, FaBaby, FaStethoscope, FaMoneyBillWave, FaWeight, FaArrowLeft, FaQrcode, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

export default function AnimalProfilePage() {
  const { tagId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [animal, setAnimal] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (!tagId) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/farming/animals?tag_id=${tagId}`);
        const data = await res.json();
        if (data.success) {
          setAnimal(data.data);
        } else {
          setAnimal(null);
        }
      } catch (e) {
        console.error("Profile Fetch Error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [tagId]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
      <FaSpinner className="animate-spin text-4xl text-slate-900" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Animal Profile...</p>
    </div>
  );

  if (!animal) return (
    <div className="h-screen flex items-center justify-center bg-slate-50 flex-col gap-6 p-10 text-center">
      <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-3xl shadow-xl">
        <FaExclamationTriangle />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Animal Not Found</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">The Tag ID <span className="text-rose-600">#{tagId}</span> is not registered in our database</p>
      </div>
      <button onClick={() => router.push('/farming/animals')} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl">
        Back to Dashboard
      </button>
    </div>
  );

  const TABS = [
    { id: 'summary', label: 'History', icon: <FaHistory /> },
    { id: 'pedigree', label: 'Family', icon: <FaBaby /> },
    { id: 'medical', label: 'Medical', icon: <FaStethoscope /> },
    { id: 'financial', label: 'Profit', icon: <FaMoneyBillWave /> },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title={`Profile: ${tagId}`} />
        <main className="flex-1 overflow-y-auto pb-32">
          
          {/* Hero Section */}
          <div className="bg-slate-900 p-8 sm:p-12 text-white relative overflow-hidden mb-[-40px]">
             <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-8">
                   <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl animate-in zoom-in duration-700 ${animal.gender === 'female' ? 'bg-pink-600' : 'bg-blue-600'}`}>
                      {animal.type === 'cow' ? '🐄' : animal.type === 'goat' ? '🐐' : animal.type === 'chicken' ? '🐔' : animal.type === 'fish' ? '🐟' : '🐾'}
                   </div>
                   <div className="text-center md:text-left flex-1">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5">{animal.type}</span>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${animal.health_status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          ● {animal.health_status}
                        </span>
                      </div>
                      <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">{animal.name || animal.tag_id}</h1>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-4">Tag ID: <span className="text-emerald-400 font-mono tracking-normal">{animal.tag_id}</span></p>
                      
                      <div className="flex gap-4 items-center justify-center md:justify-start">
                         <div className="bg-white/5 p-3 px-5 rounded-2xl border border-white/5">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Breed</p>
                            <p className="text-xs font-black">{animal.breed || 'N/A'}</p>
                         </div>
                         <div className="bg-white/5 p-3 px-5 rounded-2xl border border-white/5">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Weight</p>
                            <p className="text-xs font-black">{animal.weight} kg</p>
                         </div>
                      </div>
                   </div>
                   <div className="hidden lg:block">
                      <div className="bg-white p-6 rounded-3xl shadow-2xl rotate-2">
                         <FaBarcode className="text-5xl text-slate-900 mb-2 opacity-80" />
                         <p className="text-[8px] font-mono font-black text-slate-900 text-center tracking-[0.4em]">{animal.tag_id}</p>
                         <p className="text-[6px] font-black text-slate-400 mt-2 text-center uppercase tracking-widest">Scanner Ready</p>
                      </div>
                   </div>
                </div>
             </div>
             {/* Background Decorations */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
             <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-4">
             {/* Content Area */}
             <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
                {/* Navigation */}
                <div className="flex p-4 gap-2 border-b border-slate-50 bg-white overflow-x-auto no-scrollbar">
                  {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-8">
                   {activeTab === 'summary' && (
                     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FaCheckCircle className="text-emerald-500" /> Life Status</p>
                              <p className="text-3xl font-black text-slate-900 capitalize">{animal.status}</p>
                              <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center justify-between text-[10px] font-bold">
                                 <span className="text-slate-500">Since: {new Date(animal.created_at).toLocaleDateString()}</span>
                              </div>
                           </div>
                           <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FaWeight className="text-blue-500" /> Growth Trend</p>
                              <p className="text-3xl font-black text-slate-900">{animal.weight} <span className="text-sm text-slate-400">kg</span></p>
                              <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center justify-between text-[10px] font-bold">
                                 <span className="text-blue-500">Stable Condition</span>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-3">
                              <div className="w-1 h-6 bg-slate-900 rounded-full" /> Growth Logs
                           </h3>
                           {animal.growth?.length > 0 ? animal.growth.map((g, i) => (
                              <div key={i} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                 <span className="text-xs font-bold text-slate-600">{new Date(g.recorded_date).toLocaleDateString()}</span>
                                 <div className="flex items-center gap-4">
                                    <span className="text-sm font-black text-slate-900">{g.weight} kg</span>
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center text-xs"><FaCheckCircle /></div>
                                 </div>
                              </div>
                           )) : <div className="text-center py-10 opacity-30 italic text-xs font-bold">No growth history recorded</div>}
                        </div>
                     </div>
                   )}

                   {activeTab === 'pedigree' && (
                     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Biological Mother ♀</p>
                              {animal.mother_tag ? (
                                <div className="cursor-pointer" onClick={() => router.push(`/farming/animals/profile/${animal.mother_tag}`)}>
                                  <p className="text-xl font-black text-slate-900">{animal.mother_name || animal.mother_tag}</p>
                                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">View Profile ➔</p>
                                </div>
                              ) : <p className="text-sm font-black text-slate-300">N/A (Market Entry)</p>}
                           </div>
                           <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Biological Father ♂</p>
                              {animal.father_tag ? (
                                <div className="cursor-pointer" onClick={() => router.push(`/farming/animals/profile/${animal.father_tag}`)}>
                                  <p className="text-xl font-black text-slate-900">{animal.father_name || animal.father_tag}</p>
                                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">View Profile ➔</p>
                                </div>
                              ) : <p className="text-sm font-black text-slate-300">N/A (Market Entry)</p>}
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Offspring ({animal.offspring_count})</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {animal.offspring?.map((child, i) => (
                                <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white hover:shadow-lg transition-all" onClick={() => router.push(`/farming/animals/profile/${child.tag_id}`)}>
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black ${child.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                                      {child.gender === 'female' ? '♀' : '♂'}
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-slate-900">{child.tag_id}</p>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase">{child.breed} • {new Date(child.date_of_birth).toLocaleDateString()}</p>
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>
                   )}

                   {activeTab === 'medical' && (
                     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                           {animal.health?.length > 0 ? animal.health.map((h, i) => (
                              <div key={i} className="relative pl-10 pb-10 border-l-2 border-emerald-100 last:pb-0 last:border-0">
                                 <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white shadow-lg" />
                                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(h.treatment_date).toLocaleDateString()}</span>
                                       <span className="text-[10px] font-black px-3 py-1 bg-rose-50 text-rose-600 rounded-full">₹{h.cost}</span>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900">{h.disease_name || 'Health Checkup'}</h4>
                                    <p className="text-[11px] text-slate-600 font-bold mt-2">Medicine: <span className="text-slate-900">{h.medicine_name || 'N/A'}</span></p>
                                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-[10px] font-medium text-slate-500 italic">
                                       "{h.notes || 'Routine examination completed successfully.'}"
                                    </div>
                                 </div>
                              </div>
                           )) : <div className="text-center py-20 opacity-30 italic text-xs font-bold">No medical records on file</div>}
                        </div>
                     </div>
                   )}

                   {activeTab === 'financial' && (
                     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-900 p-10 rounded-[3rem] text-white overflow-hidden relative shadow-2xl">
                           <div className="relative z-10 text-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Lifecycle Profitability</p>
                              <h4 className={`text-6xl font-black tracking-tighter ${animal.financials?.net_profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 ₹{animal.financials?.net_profit_loss?.toLocaleString() || '0'}
                              </h4>
                              <p className="text-[9px] font-bold text-slate-500 mt-4 uppercase">Calculated including Purchase, Feed, and Health costs</p>
                           </div>
                           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {[
                              { l: 'Purchase', v: animal.financials?.total_purchase_cost, c: 'slate-900' },
                              { l: 'Feeding', v: animal.financials?.total_feed_cost, c: 'slate-900' },
                              { l: 'Medical', v: animal.financials?.total_health_cost, c: 'slate-900' },
                              { l: 'Revenue', v: animal.financials?.total_outward_revenue, c: 'emerald-600' },
                           ].map((stat, i) => (
                              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 text-center">
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{stat.l}</p>
                                 <p className={`text-sm font-black text-${stat.c}`}>₹{stat.v?.toLocaleString()}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
