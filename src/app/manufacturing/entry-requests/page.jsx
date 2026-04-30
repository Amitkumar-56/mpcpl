'use client';

import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, Suspense, useCallback } from 'react';
import { 
  FaPlus, FaSearch, FaSpinner, FaTruck, FaShieldAlt, FaKey, FaEye, 
  FaBan, FaRedo, FaCamera, FaMapMarkerAlt, FaCheckCircle, FaClock, 
  FaTimesCircle, FaCog, FaSignOutAlt, FaUser, FaHistory, FaCheck, FaInfoCircle, FaBox,
  FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

// --- Simple OTP Modal ---
const OtpModal = ({ request, onClose, onVerify }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) setTimeout(() => inputRefs.current[0].focus(), 100);
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, action: 'verify_otp', otp_code: otpString })
      });
      const data = await res.json();
      if (data.success) { 
        toast.success('Verified');
        onVerify(request.id); 
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden p-6 animate-in zoom-in-95">
        <h3 className="text-center font-bold text-slate-800 mb-4 uppercase text-[10px] tracking-widest">Verify 6-Digit OTP</h3>
        <div className="flex justify-center gap-1 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              className="w-10 h-12 text-center text-xl font-bold bg-slate-50 border rounded-lg focus:border-blue-500 outline-none transition-all"
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
          <button onClick={handleVerify} disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
            {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Simple Photo Capture Modal ---
const PhotoCaptureModal = ({ request, mode, onClose, onSubmit }) => {
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCapturedPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!capturedPhoto) return toast.error('Capture photo');
    setSubmitting(true);
    try {
      await onSubmit({ photo: capturedPhoto });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden p-6 animate-in zoom-in-95">
        <h3 className="text-center font-bold text-slate-800 mb-4 uppercase text-[10px] tracking-widest">Capture {mode.toUpperCase()} Photo</h3>
        
        <label className="block w-full h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden mb-6 cursor-pointer hover:border-blue-400 transition-all">
           <input type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
           {capturedPhoto ? (
             <img src={capturedPhoto} className="w-full h-full object-cover" />
           ) : (
             <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <FaCamera size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Tap to Open Camera</span>
             </div>
           )}
        </label>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !capturedPhoto} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">
            {submitting ? <FaSpinner className="animate-spin mx-auto" /> : `Finish ${mode}`}
          </button>
        </div>
      </div>
    </div>
  );
};

function EntryRequestsContent() {
  const { user } = useSession();
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ vehicle_number: '', driver_name: '', purpose: '', material_name: '', quantity: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoMode, setPhotoMode] = useState('entry');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  useEffect(() => { setMounted(true); }, []);

  const isAdmin = user && [1, 2, 3, 4, 5, 7].includes(Number(user.role));
  const isSecurity = user && Number(user.role) === 8;

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/manufacturing/entry-requests?${params}`);
      const data = await res.json();
      if (data.success) setEntries(data.data);
    } catch { toast.error('Sync failed'); }
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { if (mounted) fetchEntries(); setCurrentPage(1); }, [fetchEntries, mounted]);

  const handleCreate = async () => {
    if (!form.vehicle_number) return toast.error('Vehicle No. required');
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, created_by: user?.id, created_by_name: user?.name, role: user?.role })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Request Created');
        setShowCreateModal(false);
        setForm({ vehicle_number: '', driver_name: '', purpose: '', material_name: '', quantity: '' });
        fetchEntries();
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Error'); }
  };

  const handleApprove = async (req) => {
    if (!confirm('Approve this entry?')) return;
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, action: 'approve' })
      });
      const data = await res.json();
      if (data.success) { toast.success('Approved'); fetchEntries(); }
    } catch { }
  };

  const handlePhotoSubmit = async (photoData) => {
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          action: photoMode === 'entry' ? 'process_entry' : 'process_exit',
          processed_by: user?.id,
          processed_by_name: user?.name,
          entry_photo: photoMode === 'entry' ? photoData.photo : undefined,
          exit_photo: photoMode === 'exit' ? photoData.photo : undefined,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${photoMode === 'entry' ? 'Inside' : 'Completed'}`);
        setShowPhotoModal(false);
        fetchEntries();
      } else toast.error(data.error || 'Failed');
    } catch { }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = entries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(entries.length / itemsPerPage);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar pb-32">
           <div className="max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                 <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Entry Requests</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Monitor</p>
                 </div>
                 <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all">
                    <FaPlus /> New Request
                 </button>
              </div>

              <div className="sticky top-0 z-20 bg-[#F8FAFF] pb-4">
                 <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                       <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                       <input 
                         placeholder="Search Vehicle, Driver..." 
                         value={search} onChange={e => setSearch(e.target.value)}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm outline-none font-bold transition-all focus:bg-white shadow-inner"
                       />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-50 px-4 py-2.5 rounded-xl text-[10px] font-bold outline-none border-none">
                       <option value="">All Status</option>
                       <option value="pending_approval">Waiting Approval</option>
                       <option value="pending">Waiting OTP</option>
                       <option value="approved">Ready for Entry</option>
                       <option value="processing">Inside Plant</option>
                       <option value="completed">Completed</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                 {loading ? (
                   Array.from({ length: 6 }).map((_, i) => (
                     <div key={i} className="bg-white h-48 rounded-2xl border border-slate-50 animate-pulse"></div>
                   ))
                 ) : currentItems.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                       <FaTruck className="text-slate-100 text-6xl mx-auto mb-4" />
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active protocols</p>
                    </div>
                 ) : currentItems.map(e => (
                    <div key={e.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-all">
                       <div className="flex justify-between items-start mb-4">
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">{e.request_code}</div>
                          <span className={`text-[8px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${
                            e.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                            e.status === 'processing' ? 'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse' : 
                            'bg-amber-50 text-amber-600'
                          }`}>{e.status.replace('_', ' ')}</span>
                       </div>
                       
                       <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">{e.vehicle_number}</h3>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                          <FaUser size={8} className="text-slate-300" /> {e.driver_name || 'Anonymous'}
                       </div>

                       <div className="space-y-2 mb-6 text-[9px] font-bold">
                          <div className="flex justify-between border-b border-slate-50 pb-1">
                             <span className="text-slate-300 uppercase">Material</span>
                             <span className="text-slate-700 truncate max-w-[120px]">{e.material_name || 'N/A'}</span>
                          </div>
                       </div>
                       
                       <div className="flex gap-2 mt-auto">
                          {e.status === 'pending_approval' && isAdmin && (
                            <button onClick={() => handleApprove(req)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-md shadow-blue-100 active:scale-95 transition-all">Approve</button>
                          )}
                          {e.status === 'pending' && (isSecurity || isAdmin) && (
                            <button onClick={() => { setSelectedRequest(e); setShowOtpModal(true); }} className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-md shadow-amber-100 active:scale-95 transition-all">Verify OTP</button>
                          )}
                          {e.status === 'approved' && (isSecurity || isAdmin) && (
                            <button onClick={() => { setSelectedRequest(e); setPhotoMode('entry'); setShowPhotoModal(true); }} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-md shadow-emerald-100 active:scale-95 transition-all">Confirm Entry</button>
                          )}
                          {e.status === 'processing' && (isSecurity || isAdmin) && (
                            <button onClick={() => { setSelectedRequest(e); setPhotoMode('exit'); setShowPhotoModal(true); }} className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-md shadow-rose-100 active:scale-95 transition-all">Confirm Exit</button>
                          )}
                          <button onClick={() => { setSelectedRequest(e); }} className="bg-slate-50 p-2.5 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
                             <FaEye size={14} />
                          </button>
                       </div>
                    </div>
                 ))}
              </div>

              {totalPages > 1 && (
                 <div className="flex items-center justify-center gap-2 pb-10">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30"><FaChevronLeft size={10} /></button>
                    <div className="flex gap-1">
                       {Array.from({ length: totalPages }).map((_, i) => (
                          <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'}`}>{i + 1}</button>
                       ))}
                    </div>
                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30"><FaChevronRight size={10} /></button>
                 </div>
              )}
           </div>
        </main>
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
          <Footer />
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowCreateModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                 <FaPlus className="text-blue-600" />
                 <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">New Request</h3>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Vehicle No.</label>
                    <input placeholder="MH12AB..." value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value.toUpperCase().replace(/\s+/g, '')})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-400" />
                 </div>
                 <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Driver Name</label>
                    <input placeholder="Name" value={form.driver_name} onChange={e => setForm({...form, driver_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-400" />
                 </div>
                 <button onClick={handleCreate} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-2">Generate Request</button>
              </div>
           </div>
        </div>
      )}

      {showOtpModal && selectedRequest && <OtpModal request={selectedRequest} onClose={() => setShowOtpModal(false)} onVerify={() => { setShowOtpModal(false); fetchEntries(); }} />}
      {showPhotoModal && selectedRequest && <PhotoCaptureModal request={selectedRequest} mode={photoMode} onClose={() => setShowPhotoModal(false)} onSubmit={handlePhotoSubmit} />}
    </div>
  );
}

export default function EntryRequestsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <EntryRequestsContent />
    </Suspense>
  );
}
