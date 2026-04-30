'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { 
  FaPlus, FaCheck, FaTimes, FaTruck, FaClock, FaSearch, FaSync, 
  FaSignOutAlt, FaSignInAlt, FaArrowLeft, FaShieldAlt, FaUser,
  FaPhone, FaBox, FaCamera, FaMapMarkerAlt, FaEye, FaFlask,
  FaFilter, FaCalendarAlt, FaChevronRight, FaCheckCircle, FaSpinner, FaHistory,
  FaChevronLeft
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

// --- Compact Photo Modal for Dashboard ---
const QuickPhotoModal = ({ mode, onClose, onSubmit }) => {
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDone = async () => {
    if (!photo) return toast.error('Photo Required');
    setLoading(true);
    try {
      await onSubmit(photo);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden p-6 animate-in zoom-in-95">
        <h3 className="text-center font-bold text-slate-800 mb-4 uppercase text-[10px] tracking-widest">Capture {mode} Photo</h3>
        <label className="block w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden mb-4 cursor-pointer">
           <input type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
           {photo ? (
             <img src={photo} className="w-full h-full object-cover" />
           ) : (
             <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <FaCamera size={24} />
                <span className="text-[9px] font-bold uppercase">Open Camera</span>
             </div>
           )}
        </label>
        <div className="flex gap-2">
           <button onClick={onClose} className="flex-1 py-2 text-[9px] font-bold text-slate-400 uppercase">Cancel</button>
           <button onClick={handleDone} disabled={loading} className={`flex-1 ${mode === 'Exit' ? 'bg-rose-600' : 'bg-blue-600'} text-white py-2 rounded-lg font-bold text-[9px] uppercase shadow-lg`}>
              {loading ? '...' : `Confirm ${mode}`}
           </button>
        </div>
      </div>
    </div>
  );
};

function SecurityGateContent() {
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareData, setCompareData] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Photo Action State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/manufacturing/security-gate?status=${activeTab}`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
      else toast.error('Fetch failed');
    } catch { toast.error('Connection error'); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { if (mounted) fetchRequests(); setCurrentPage(1); }, [fetchRequests, mounted]);

  const handleAction = async (requestId, action, photo = null) => {
    if (action === 'reject' && !window.confirm("Reject this request?")) return;
    try {
      setIsProcessing(true);
      const res = await fetch('/api/manufacturing/security-gate/process', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, photo }),
      });
      const data = await res.json();
      if (data.success) { 
        toast.success(`${action} successful`); 
        setShowPhotoModal(false);
        fetchRequests(); 
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Error'); }
    finally { setIsProcessing(false); }
  };

  const handleCompareClick = async (req) => {
    try {
      const res = await fetch(`/api/manufacturing/security-gate?vehicle=${encodeURIComponent(req.vehicle_number)}&all=true`);
      const data = await res.json();
      if (data.success) { 
        setCompareData({ current: req, history: data.data }); 
        setShowCompareModal(true); 
      }
    } catch { toast.error('Failed to load history'); }
  };

  const filteredRequests = requests.filter(r =>
    r.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.request_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar pb-32">
          <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                 <h1 className="text-xl font-black text-slate-900">Gate Monitor</h1>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Tracking System</p>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/manufacturing/security-gate/create"
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-xs shadow-sm active:scale-95 transition-all">
                  <FaPlus /> New Entry
                </Link>
                <button onClick={fetchRequests} className="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm active:rotate-180 transition-all">
                  <FaSync className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Filter Hub */}
            <div className="sticky top-0 z-20 bg-[#F8FAFF] pb-4">
               <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-3">
                  <div className="flex-1 relative">
                     <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                     <input 
                       placeholder="Search Vehicle, Driver..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border-none focus:bg-white outline-none font-bold text-slate-700 text-sm transition-all shadow-inner"
                     />
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                     {['Pending', 'In-Plant', 'Completed', 'Rejected'].map((tab) => (
                       <button 
                         key={tab} 
                         onClick={() => setActiveTab(tab)}
                         className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                           activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                         }`}
                       >
                         {tab}
                       </button>
                     ))}
                  </div>
               </div>
            </div>

            {/* List View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle Details</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargo Info</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                           <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action Hub</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                           Array.from({ length: 5 }).map((_, i) => (
                              <tr key={i} className="animate-pulse">
                                 <td colSpan="5" className="px-6 py-8 bg-slate-50/20"></td>
                              </tr>
                           ))
                        ) : currentItems.length === 0 ? (
                           <tr>
                              <td colSpan="5" className="px-6 py-20 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active protocols</td>
                           </tr>
                        ) : currentItems.map((req) => (
                           <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <p className="text-sm font-black text-slate-900 tracking-tight">{req.vehicle_number}</p>
                                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{req.request_code}</p>
                              </td>
                              <td className="px-6 py-4">
                                 <p className="text-xs font-bold text-slate-700">{req.driver_name || 'N/A'}</p>
                                 <p className="text-[8px] font-bold text-slate-400">{req.driver_phone || ''}</p>
                              </td>
                              <td className="px-6 py-4">
                                 <p className="text-xs font-bold text-slate-800">{req.material_name || 'General'}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase">{req.purpose || 'Entry'}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <span className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest border ${
                                    req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    req.status === 'In-Plant' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' :
                                    req.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                 }`}>
                                    {req.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-1.5">
                                    <button 
                                       onClick={() => handleCompareClick(req)}
                                       className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                                       title="History"
                                    >
                                       <FaHistory size={12} />
                                    </button>
                                    
                                    {req.status === 'In-Plant' && (
                                       <button 
                                          onClick={() => { setSelectedReq(req); setShowPhotoModal(true); }}
                                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 text-white font-bold text-[9px] uppercase tracking-widest shadow-md shadow-rose-100 active:scale-95 transition-all"
                                       >
                                          <FaSignOutAlt /> Confirm Exit
                                       </button>
                                    )}

                                    {req.status === 'Pending' && (
                                       <button 
                                          onClick={() => handleAction(req.id, 'reject')}
                                          className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                          title="Reject"
                                       >
                                          <FaTimes size={12} />
                                       </button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
               <div className="flex items-center justify-center gap-2 mt-4">
                  <button 
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"
                  >
                     <FaChevronLeft size={10} />
                  </button>
                  <div className="flex gap-1">
                     {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => paginate(i + 1)}
                          className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all ${
                            currentPage === i + 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'
                          }`}
                        >
                           {i + 1}
                        </button>
                     ))}
                  </div>
                  <button 
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"
                  >
                     <FaChevronRight size={10} />
                  </button>
               </div>
            )}
          </div>
        </main>

        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
          <Footer />
        </div>
      </div>

      {/* Compare Modal */}
      {showCompareModal && compareData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCompareModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
               <h2 className="font-bold text-[10px] tracking-widest uppercase">Asset Traceability: {compareData.current.vehicle_number}</h2>
               <button onClick={() => setShowCompareModal(false)}><FaTimes /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-3">
               {compareData.history.map((h) => (
                 <div key={h.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{new Date(h.created_at).toLocaleDateString()}</p>
                       <p className="text-xs font-bold text-slate-800">{h.purpose || 'Entry'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                       h.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                    }`}>{h.status}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Photo Modal for Exit */}
      {showPhotoModal && selectedReq && (
         <QuickPhotoModal 
            mode="Exit" 
            onClose={() => setShowPhotoModal(false)} 
            onSubmit={(photo) => handleAction(selectedReq.id, 'exit', photo)} 
         />
      )}
    </div>
  );
}

export default function SecurityGateDashboard() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <SecurityGateContent />
    </Suspense>
  );
}
