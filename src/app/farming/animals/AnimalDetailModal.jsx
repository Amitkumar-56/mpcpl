'use client';
import React, { useState, Suspense } from 'react';
import { FaPrint, FaFileMedical, FaUserMd, FaStethoscope, FaArrowRight, FaBaby, FaHistory, FaWeight, FaMoneyBillWave, FaChartLine, FaQrcode, FaBarcode, FaSpinner } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';
import GrowthRecordModal from './GrowthRecordModal';

export default function AnimalDetailModal({ sel, onClose, refresh }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [showGrowthModal, setShowGrowthModal] = useState(false);
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

  const handleAddGrowthRecord = () => {
    setShowGrowthModal(true);
  };

  const handleGrowthSuccess = () => {
    refresh && refresh();
    setShowGrowthModal(false);
  };

  // Make the function available globally for the buttons
  React.useEffect(() => {
    window.addGrowthRecord = handleAddGrowthRecord;
    return () => {
      delete window.addGrowthRecord;
    };
  }, []);

  const TABS = [
    { id: 'summary', label: 'Summary', icon: <FaHistory /> },
    { id: 'pedigree', label: 'Family Tree', icon: <FaBaby /> },
    { id: 'medical', label: 'Medical', icon: <FaStethoscope /> },
    { id: 'financial', label: 'Profit/Loss', icon: <FaMoneyBillWave /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 transition-all" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col sm:flex-row" onClick={e => e.stopPropagation()}>
        
        {/* Left Sidebar (Profile) */}
        <div className="w-full sm:w-2/5 bg-slate-900 p-4 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black mb-4 ${sel.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'} shadow-lg`}>
                {sel.gender === 'female' ? '♀' : '♂'}
              </div>
              <h2 className="text-xl font-black tracking-tighter leading-none mb-1">{sel.name || sel.tag_id}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">{sel.type} • {sel.breed}</p>
              
              <div className="space-y-3">
                 <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Tag ID</p>
                    <p className="text-sm font-mono font-black text-emerald-400">{sel.tag_id}</p>
                 </div>
                 <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Health</p>
                    <p className={`text-xs font-black uppercase ${sel.health_status === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>● {sel.health_status}</p>
                 </div>
              </div>
           </div>

           <div className="mt-6 relative z-10">
              <button onClick={() => printCard(sel)} className="w-full bg-white text-slate-900 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 hover:text-white transition-all">
                <FaBarcode className="text-base" /> Print Tag
              </button>
           </div>

           {/* Decorative background circle */}
           <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col h-full bg-slate-50/50">
           {/* Navigation Tabs */}
           <div className="flex p-3 gap-2 border-b border-slate-100 bg-white">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                  {tab.icon} <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all ml-2">✕</button>
           </div>

           <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'summary' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                         <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FaWeight className="text-blue-500 text-xs" /> Weight</p>
                         <p className="text-xl font-bold text-gray-900">{sel.weight || '0'} <span className="text-xs text-gray-500">kg</span></p>
                         <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                            <span className="text-green-600">+12%</span>
                            <span className="text-gray-400">Stable</span>
                         </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                         <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FaFileMedical className="text-red-500 text-xs" /> Status</p>
                         <p className="text-xl font-bold text-gray-900 capitalize">{sel.status}</p>
                         <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                            <span className="text-blue-600">Born {sel.date_of_birth ? new Date(sel.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                         <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1"><FaChartLine className="text-xs" /> Growth</h3>
                         <button 
                            onClick={() => window.addGrowthRecord && window.addGrowthRecord(sel.id)}
                            className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors flex items-center gap-1"
                         >
                            <FaWeight className="text-xs" /> Add
                         </button>
                      </div>
                      <div className="space-y-1">
                         {sel.growth?.length > 0 ? sel.growth.map((g, i) => (
                           <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                              <div className="flex items-center gap-2">
                                 <span className="text-xs text-gray-600">{new Date(g.recorded_date).toLocaleDateString()}</span>
                                 {g.notes && <span className="text-xs text-gray-400">• {g.notes}</span>}
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{g.weight} kg</span>
                           </div>
                         )) : (
                           <div className="text-center py-6">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                 <FaChartLine className="text-lg text-gray-400" />
                              </div>
                              <p className="text-xs text-gray-600 mb-1">No growth records</p>
                              <button 
                                 onClick={() => window.addGrowthRecord && window.addGrowthRecord(sel.id)}
                                 className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
                              >
                                 Add First Record
                              </button>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'pedigree' && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                          <p className="text-xs text-gray-500 mb-1">Mother ♀</p>
                          <p className="text-sm font-semibold text-gray-900">{sel.mother_tag || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{sel.mother_breed || '-'}</p>
                       </div>
                       <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                          <p className="text-xs text-gray-500 mb-1">Father ♂</p>
                          <p className="text-sm font-semibold text-gray-900">{sel.father_tag || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{sel.father_breed || '-'}</p>
                       </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                       <h3 className="text-sm font-bold text-gray-900 mb-3">Offspring ({sel.offspring_count || 0})</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sel.offspring?.map((child, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                               <div className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs font-medium ${child.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                                 {child.gender === 'female' ? '♀' : '♂'}
                               </div>
                               <div>
                                 <p className="text-xs font-semibold text-gray-900">{child.tag_id}</p>
                                 <p className="text-xs text-gray-500">{child.breed} • {new Date(child.date_of_birth).toLocaleDateString()}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              )}

              {activeTab === 'medical' && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                       <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><FaStethoscope className="text-xs" /> Treatment</h3>
                       <div className="space-y-2">
                          {sel.health?.length > 0 ? sel.health.map((h, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                               <div className="flex justify-between items-start mb-1">
                                  <span className="text-xs text-gray-500">{new Date(h.treatment_date).toLocaleDateString()}</span>
                                  <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-600 rounded">₹{h.cost}</span>
                               </div>
                               <p className="text-sm font-semibold text-gray-900">{h.disease_name || 'Regular Checkup'}</p>
                               <p className="text-xs text-gray-600 mt-1">Medicine: {h.medicine_name || 'N/A'}</p>
                            </div>
                          )) : <p className="text-sm text-gray-400 text-center py-6">No medical records</p>}
                       </div>
                    </div>
                 </div>
              )}

              {activeTab === 'financial' && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                       <h3 className="text-sm font-bold text-gray-900 mb-3">Financial Summary</h3>
                       
                       <div className="text-center mb-4">
                          <p className="text-xs text-gray-500 mb-1">Net Profit/Loss</p>
                          <p className={`text-2xl font-bold ${sel.financials?.net_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                             ₹{sel.financials?.net_profit_loss?.toLocaleString() || '0'}
                          </p>
                       </div>

                       <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                             <p className="text-xs text-gray-500 mb-1">Expenses</p>
                             <p className="text-base font-semibold text-red-600">₹{sel.financials?.total_expenses?.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                             <p className="text-xs text-gray-500 mb-1">Revenue</p>
                             <p className="text-base font-semibold text-green-600">₹{sel.financials?.total_outward_revenue?.toLocaleString()}</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                             <p className="text-xs text-gray-500">Purchase</p>
                             <p className="text-sm font-semibold">₹{sel.financials?.total_purchase_cost}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                             <p className="text-xs text-gray-500">Feed</p>
                             <p className="text-sm font-semibold">₹{sel.financials?.total_feed_cost}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                             <p className="text-xs text-gray-500">Health</p>
                             <p className="text-sm font-semibold">₹{sel.financials?.total_health_cost}</p>
                          </div>
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
      
      {/* Growth Record Modal */}
      {showGrowthModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
              <FaSpinner className="animate-spin text-emerald-500 text-4xl mx-auto mb-4" />
              <p className="text-gray-600">Loading growth form...</p>
            </div>
          </div>
        }>
          <GrowthRecordModal
            animalId={sel.id}
            animalName={sel.name || sel.tag_id}
            onClose={() => setShowGrowthModal(false)}
            onSuccess={handleGrowthSuccess}
          />
        </Suspense>
      )}
    </div>
  );
}
