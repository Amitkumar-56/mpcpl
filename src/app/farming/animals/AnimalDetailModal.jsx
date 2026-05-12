'use client';
import React, { useState } from 'react';
import { FaPrint, FaFileMedical, FaUserMd, FaStethoscope, FaArrowRight, FaBaby, FaHistory, FaWeight, FaMoneyBillWave, FaChartLine, FaQrcode, FaBarcode } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

export default function AnimalDetailModal({ sel, onClose, refresh }) {
  const [activeTab, setActiveTab] = useState('summary');
  if (!sel) return null;

  const printCard = async (animal) => {
    const card = document.getElementById(`animal-card-${animal.id}`);
    if (!card) return toast.error('Template missing');
    try {
      toast.loading('Generating PDF...', { id: 'print-toast' });
      const canvas = await html2canvas(card, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', (pdf.internal.pageSize.getWidth() - 80) / 2, 30, 80, (canvas.height * 80) / canvas.width);
      pdf.save(`${animal.tag_id}_ID_Card.pdf`);
      toast.success('ID Card generated!', { id: 'print-toast' });
    } catch (e) { toast.error('Print error: ' + e.message, { id: 'print-toast' }); }
  };

  const TABS = [
    { id: 'summary', label: 'Summary', icon: <FaHistory /> },
    { id: 'pedigree', label: 'Family Tree', icon: <FaBaby /> },
    { id: 'medical', label: 'Medical', icon: <FaStethoscope /> },
    { id: 'financial', label: 'Profit/Loss', icon: <FaMoneyBillWave /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 transition-all" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col sm:flex-row" onClick={e => e.stopPropagation()}>
        
        {/* Left Sidebar (Profile) */}
        <div className="w-full sm:w-1/3 bg-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black mb-6 ${sel.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'} shadow-2xl animate-pulse`}>
                {sel.gender === 'female' ? '♀' : '♂'}
              </div>
              <h2 className="text-2xl font-black tracking-tighter leading-none mb-1">{sel.name || sel.tag_id}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">{sel.type} • {sel.breed}</p>
              
              <div className="space-y-4">
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Tag Identifier</p>
                    <p className="text-sm font-mono font-black text-emerald-400">{sel.tag_id}</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Health Status</p>
                    <p className={`text-xs font-black uppercase ${sel.health_status === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>● {sel.health_status}</p>
                 </div>
              </div>
           </div>

           <div className="mt-8 relative z-10">
              <button onClick={() => printCard(sel)} className="w-full bg-white text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-400 hover:text-white transition-all">
                <FaBarcode className="text-lg" /> Print Identity Tag
              </button>
           </div>

           {/* Decorative background circle */}
           <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col h-full bg-slate-50/50">
           {/* Navigation Tabs */}
           <div className="flex p-4 gap-2 border-b border-slate-100 bg-white">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                  {tab.icon} <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all ml-2">✕</button>
           </div>

           <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'summary' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><FaWeight className="text-blue-500" /> Current Weight</p>
                         <p className="text-4xl font-black text-slate-900">{sel.weight || '0'} <span className="text-lg text-slate-400">kg</span></p>
                         <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold">
                            <span className="text-emerald-500">+12% from birth</span>
                            <span className="text-slate-400">Stable</span>
                         </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><FaFileMedical className="text-rose-500" /> Lifecycle Status</p>
                         <p className="text-4xl font-black text-slate-900 capitalize">{sel.status}</p>
                         <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold">
                            <span className="text-blue-500">Born {sel.date_of_birth ? new Date(sel.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2"><FaChartLine /> Weight Growth History</h3>
                      <div className="space-y-3">
                         {sel.growth?.length > 0 ? sel.growth.map((g, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                              <span className="text-xs font-bold text-slate-600">{new Date(g.recorded_date).toLocaleDateString()}</span>
                              <span className="text-sm font-black text-slate-900">{g.weight} kg</span>
                           </div>
                         )) : <p className="text-xs text-slate-400 font-bold uppercase text-center py-10 italic">No growth records found</p>}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'pedigree' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Mother ♀</p>
                          <p className="text-sm font-black text-slate-900">{sel.mother_tag || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-500">{sel.mother_breed || '-'}</p>
                       </div>
                       <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Father ♂</p>
                          <p className="text-sm font-black text-slate-900">{sel.father_tag || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-500">{sel.father_breed || '-'}</p>
                       </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                       <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Offspring ({sel.offspring_count || 0})</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {sel.offspring?.map((child, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black ${child.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                                 {child.gender === 'female' ? '♀' : '♂'}
                               </div>
                               <div>
                                 <p className="text-xs font-black text-slate-900">{child.tag_id}</p>
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
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                       <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2"><FaStethoscope /> Treatment History</h3>
                       <div className="space-y-4">
                          {sel.health?.length > 0 ? sel.health.map((h, i) => (
                            <div key={i} className="relative pl-8 pb-8 border-l-2 border-emerald-100 last:pb-0 last:border-0">
                               <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                               <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(h.treatment_date).toLocaleDateString()}</span>
                                  <span className="text-[9px] font-black px-2 py-1 bg-rose-50 text-rose-600 rounded-lg">₹{h.cost}</span>
                               </div>
                               <p className="text-sm font-black text-slate-900">{h.disease_name || 'Regular Checkup'}</p>
                               <p className="text-[11px] text-slate-600 font-medium mt-1">Medicine: {h.medicine_name || 'N/A'}</p>
                            </div>
                          )) : <p className="text-xs text-slate-400 font-bold uppercase text-center py-10 italic">No medical records found</p>}
                       </div>
                    </div>
                 </div>
              )}

              {activeTab === 'financial' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-slate-900 p-8 rounded-[2rem] text-white overflow-hidden relative shadow-2xl">
                       <div className="relative z-10">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Net Profit/Loss Analysis</p>
                          <h4 className={`text-4xl font-black ${sel.financials?.net_profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                             ₹{sel.financials?.net_profit_loss?.toLocaleString() || '0'}
                          </h4>
                          <div className="mt-8 grid grid-cols-2 gap-4">
                             <div className="bg-white/5 p-4 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Expenses</p>
                                <p className="text-sm font-black text-rose-300">₹{sel.financials?.total_expenses?.toLocaleString()}</p>
                             </div>
                             <div className="bg-white/5 p-4 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Revenue</p>
                                <p className="text-sm font-black text-emerald-300">₹{sel.financials?.total_outward_revenue?.toLocaleString()}</p>
                             </div>
                          </div>
                       </div>
                       <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                       <div className="bg-white p-5 rounded-3xl border border-slate-100 text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Purchase</p>
                          <p className="text-xs font-black text-slate-900">₹{sel.financials?.total_purchase_cost}</p>
                       </div>
                       <div className="bg-white p-5 rounded-3xl border border-slate-100 text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Feed</p>
                          <p className="text-xs font-black text-slate-900">₹{sel.financials?.total_feed_cost}</p>
                       </div>
                       <div className="bg-white p-5 rounded-3xl border border-slate-100 text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Health</p>
                          <p className="text-xs font-black text-slate-900">₹{sel.financials?.total_health_cost}</p>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        </div>

        {/* Hidden Print Template */}
        <div className="absolute left-[-9999px]">
          <div id={`animal-card-${sel.id}`} className="p-10 bg-white border-4 border-slate-900 rounded-[2rem] w-[350px]">
             <div className="text-center mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MPCPL FARMING CRM</p>
                <h1 className="text-3xl font-black text-slate-900 mt-2">{sel.tag_id}</h1>
             </div>
             <div className="bg-slate-50 p-6 rounded-2xl mb-8 border-2 border-slate-100">
                <div className="flex justify-between mb-4 border-b border-slate-200 pb-2">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Breed</span>
                   <span className="text-xs font-black text-slate-900 uppercase">{sel.breed}</span>
                </div>
                <div className="flex justify-between mb-4 border-b border-slate-200 pb-2">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Gender</span>
                   <span className="text-xs font-black text-slate-900 uppercase">{sel.gender}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">DOB</span>
                   <span className="text-xs font-black text-slate-900">{new Date(sel.date_of_birth).toLocaleDateString()}</span>
                </div>
             </div>
             <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-8 mt-4 px-4">
                <div className="flex-1 flex flex-col items-center border-r border-slate-50 pr-4">
                   <FaBarcode className="text-5xl text-slate-900 mb-2" />
                   <p className="text-[8px] font-mono font-black text-slate-900 tracking-[0.2em]">{sel.tag_id}</p>
                </div>
                <div className="text-center">
                   <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/farming/animals/profile/' + sel.tag_id : '')}`}
                      alt="QR"
                      className="w-14 h-14 mix-blend-multiply"
                   />
                   <p className="text-[6px] font-black text-slate-400 mt-1 uppercase">Scan for History</p>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
