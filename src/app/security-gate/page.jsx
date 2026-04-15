// src/app/security-gate/page.jsx
"use client";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { 
  FaArrowLeft, FaCamera, FaShieldAlt, FaSearch, FaSpinner, FaTruck, 
  FaSignInAlt, FaSignOutAlt, FaEye, FaKey, FaMapMarkerAlt, 
  FaCheckCircle, FaTimesCircle, FaRedo, FaPlusCircle, FaClock, FaCheck, FaUser, FaPhone, FaInfoCircle, FaClipboardList, FaHistory
} from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

// --- NEW COMPONENT: MFG REQUEST TERMINAL ---
function MfgRequestTerminal() {
  const { user } = useSession();
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchDone, setSearchDone] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ vehicle_number: '', driver_name: '', driver_phone: '', purpose: '', material_name: '', quantity: '', unit: 'kg' });
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef([]);
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [photoMode, setPhotoMode] = useState('entry');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null, name: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => { fetchRecent(); }, []);

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/manufacturing/entry-requests');
      const data = await res.json();
      if (data.success) setRecentRequests(data.data.slice(0, 5));
    } catch {}
  };

  const handleSearch = async () => {
    if (!vehicleSearch.trim()) return alert('Vehicle number daliye!');
    setSearching(true); setSearchResult(null); setSearchDone(false); setShowOtpSection(false); setShowPhotoSection(false); setShowCreateForm(false);
    try {
      const res = await fetch(`/api/manufacturing/entry-requests?vehicle=${encodeURIComponent(vehicleSearch.trim())}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const activeRequest = data.data.find(r => ['pending_approval', 'pending', 'approved', 'processing'].includes(r.status));
        setSearchResult(activeRequest || data.data[0]);
      } else {
        setSearchResult(null);
        setForm(prev => ({ ...prev, vehicle_number: vehicleSearch.trim().toUpperCase() }));
      }
      setSearchDone(true);
    } catch { alert('Search fail ho gaya'); }
    finally { setSearching(false); }
  };

  const handleCreateRequest = async () => {
    if (!form.vehicle_number || !form.driver_name) return alert('Pehle details bhariye!');
    setCreating(true);
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, created_by: user?.id, created_by_name: user?.name, role: user?.role })
      });
      const data = await res.json();
      if (data.success) { alert('✅ Request Admin ko bhej di gayi hai approval ke liye.'); setShowCreateForm(false); handleSearch(); }
      else alert(data.error);
    } catch { alert('Error'); } finally { setCreating(false); }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setLocation(p => ({ ...p, lat: latitude, lng: longitude }));
      try {
        const res = await fetch('/api/get-area', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: latitude, lng: longitude }) });
        const data = await res.json();
        setLocation(p => ({ ...p, name: data.success ? data.area_name : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
      } catch { setLocation(p => ({ ...p, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` })); }
      finally { setLocationLoading(false); }
    }, () => setLocationLoading(false), { timeout: 10000 });
  };

  const handleOtpChange = (i, v) => { if (!/^\d?$/.test(v)) return; const n = [...otp]; n[i] = v; setOtp(n); setOtpError(''); if (v && i < 5) otpRefs.current[i+1]?.focus(); };
  const verifyOtp = async () => {
    const s = otp.join(""); if (s.length !== 6) return; setOtpLoading(true);
    try {
      const res = await fetch('/api/manufacturing/entry-requests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: searchResult.id, action: 'verify_otp', otp_code: s }) });
      const data = await res.json();
      if (data.success) { setSearchResult(p => ({ ...p, status: 'approved' })); setShowOtpSection(false); setPhotoMode('entry'); setShowPhotoSection(true); detectLocation(); }
      else setOtpError(data.error || 'Invalid OTP');
    } catch { setOtpError('Error'); } finally { setOtpLoading(false); }
  };

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch { setCameraActive(false); }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current; const video = videoRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.7));
    if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  };

  const handleSubmit = async () => {
    if (!capturedPhoto || !location.lat) return alert('Photo and Location mandatory!');
    setSubmitting(true);
    try {
      const action = photoMode === 'entry' ? 'process_entry' : 'process_exit';
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: searchResult.id, action, entry_photo: photoMode === 'entry' ? capturedPhoto : undefined, exit_photo: photoMode === 'exit' ? capturedPhoto : undefined, entry_location_lat: location.lat, entry_location_lng: location.lng, entry_location_name: location.name, processed_by: user?.id, processed_by_name: user?.name })
      });
      const data = await res.json();
      if (data.success) { alert('✅ Successful!'); setShowPhotoSection(false); setSearchResult(null); setVehicleSearch(''); }
      else alert(data.error);
    } catch { alert('Error'); } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-6 mb-6">
        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3 ml-1">MFG Vehicle Verification</label>
        <div className="relative group">
          <input value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="MH12AB1234" className="w-full pl-14 pr-4 py-5 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-2xl font-black focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all text-gray-800 tracking-[0.2em]" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 text-xl" />
        </div>
        <button onClick={handleSearch} disabled={searching} className="w-full mt-4 bg-cyan-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-cyan-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {searching ? <FaSpinner className="animate-spin" /> : 'Search Vehicle'}
        </button>
      </div>

      {searchDone && !searchResult && !showCreateForm && (
        <div className="bg-white rounded-[2rem] p-8 text-center border-2 border-dashed border-red-100 shadow-lg">
          <FaTimesCircle className="text-red-400 text-4xl mb-4 mx-auto" />
          <h3 className="font-black text-gray-800 text-xl">Not Found</h3>
          <p className="text-gray-500 text-sm mb-6">mfg_entry_requests me koi record nahi mila. Naya request banaye?</p>
          <button onClick={() => setShowCreateForm(true)} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><FaPlusCircle /> Nayi Request Banaye</button>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-[2rem] shadow-2xl p-6 border animate-in zoom-in duration-300">
          <h3 className="font-black text-gray-800 text-xl mb-6">Driver & Vehicle Details</h3>
          <div className="space-y-4">
            <input disabled value={form.vehicle_number} className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-gray-400" />
            <input placeholder="Driver Name *" value={form.driver_name} onChange={e => setForm({...form, driver_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl font-bold" />
            <input placeholder="Phone" value={form.driver_phone} onChange={e => setForm({...form, driver_phone: e.target.value})} className="w-full px-4 py-3 border rounded-xl font-bold" />
            <input placeholder="Purpose" value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="w-full px-4 py-3 border rounded-xl font-bold" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreateForm(false)} className="flex-1 py-4 font-bold text-gray-500">Cancel</button>
              <button onClick={handleCreateRequest} disabled={creating} className="flex-1 bg-cyan-600 text-white py-4 rounded-xl font-bold shadow-lg">Submit</button>
            </div>
          </div>
        </div>
      )}

      {searchResult && (
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border">
          <div className={`px-6 py-4 flex justify-between items-center ${searchResult.status === 'pending_approval' ? 'bg-orange-100 text-orange-800' : 'bg-cyan-100 text-cyan-800'}`}>
            <span className="font-black text-xs uppercase">{searchResult.status}</span>
            <span className="text-[10px] font-mono font-bold">{searchResult.request_code}</span>
          </div>
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-gray-800">{searchResult.vehicle_number}</h2>
              <p className="text-gray-500 font-medium">{searchResult.driver_name || 'No Name'}</p>
            </div>
            {searchResult.status === 'pending_approval' && <div className="bg-orange-50 p-4 rounded-xl text-xs font-bold text-orange-800 mb-4">Admin approval ka wait kare.</div>}
            {searchResult.status === 'pending' && !showOtpSection && <button onClick={() => { setShowOtpSection(true); setTimeout(() => otpRefs.current[0].focus(), 100); }} className="w-full bg-cyan-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl uppercase"><FaKey className="inline mr-2"/> Enter OTP</button>}
            {searchResult.status === 'approved' && !showPhotoSection && <button onClick={() => { setPhotoMode('entry'); setShowPhotoSection(true); detectLocation(); }} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl uppercase"><FaCamera className="inline mr-2"/> Start Entry</button>}
            {searchResult.status === 'processing' && !showPhotoSection && <button onClick={() => { setPhotoMode('exit'); setShowPhotoSection(true); detectLocation(); }} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl uppercase"><FaSignOutAlt className="inline mr-2"/> Start Exit</button>}
          </div>
        </div>
      )}

      {showOtpSection && (
        <div className="bg-white rounded-[2rem] shadow-2xl p-6 border-2 border-cyan-100 mt-6">
          <h3 className="font-black mb-4 flex justify-between">Verify OTP <button onClick={() => setShowOtpSection(false)}><FaTimesCircle/></button></h3>
          <div className="flex gap-2 mb-6">
            {otp.map((d, i) => <input key={i} ref={el => otpRefs.current[i] = el} value={d} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i-1]?.focus(); }} className="w-full h-14 text-center text-2xl font-black border-2 rounded-xl focus:border-cyan-500 outline-none" />)}
          </div>
          {otpError && <p className="text-red-500 text-xs font-bold mb-4 text-center">{otpError}</p>}
          <button onClick={verifyOtp} disabled={otpLoading} className="w-full bg-black text-white py-4 rounded-xl font-black uppercase">{otpLoading ? <FaSpinner className="animate-spin" /> : 'Confirm'}</button>
        </div>
      )}

      {showPhotoSection && (
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border mt-6">
          <div className={`px-6 py-4 flex justify-between items-center text-white ${photoMode === 'entry' ? 'bg-green-600' : 'bg-red-600'}`}>
            <h3 className="font-black text-sm uppercase">Verification Step</h3>
            <button onClick={() => { setShowPhotoSection(false); }}><FaTimesCircle/></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 p-3 rounded-xl border text-xs font-bold">
               <span className="text-cyan-600"><FaMapMarkerAlt className="inline"/> GPS:</span> {location.name || 'Detecting...'}
            </div>
            <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative shadow-inner">
               {cameraActive ? (
                 <>
                   <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                   <button onClick={captureImage} className="absolute inset-x-0 bottom-4 w-16 h-16 bg-white rounded-full mx-auto shadow-xl flex items-center justify-center"><div className="w-12 h-12 bg-cyan-500 rounded-full"></div></button>
                   <canvas ref={createCanvasRef} className="hidden" />
                 </>
               ) : capturedPhoto ? (
                 <div className="relative h-full"><img src={capturedPhoto} className="w-full h-full object-cover" /><button onClick={() => setCapturedPhoto(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><FaTimesCircle/></button></div>
               ) : (
                 <button onClick={startCamera} className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <FaCamera size={40} className="text-gray-300"/>
                    <p className="text-[10px] font-black uppercase text-gray-400">Open Camera</p>
                 </button>
               )}
            </div>
            <button onClick={handleSubmit} disabled={submitting || !capturedPhoto} className={`w-full py-4 rounded-xl text-white font-black shadow-lg ${photoMode === 'entry' ? 'bg-green-600' : 'bg-red-600'}`}>
               {submitting ? <FaSpinner className="animate-spin mx-auto"/> : 'Complete Step'}
            </button>
          </div>
        </div>
      )}

      {/* RECENT MFG LOGS SECTION */}
      <div className="mt-10 mb-10">
         <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-widest"><FaHistory className="text-cyan-600"/> Recent Mfg Logs</h3>
            <button onClick={() => window.location.href='/manufacturing/entry-requests'} className="text-[10px] font-bold text-cyan-600 hover:underline px-3 py-1 bg-cyan-50 rounded-full">VIEW ALL</button>
         </div>
         <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-[10px]">
               <thead className="bg-gray-50 border-b">
                  <tr>
                     <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Code</th>
                     <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Vehicle</th>
                     <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Driver</th>
                     <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y">
                  {recentRequests.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => { setVehicleSearch(r.vehicle_number); handleSearch(); }}>
                       <td className="px-3 py-3 font-semibold text-cyan-600">{r.request_code}</td>
                       <td className="px-3 py-3 font-black text-gray-700">{r.vehicle_number}</td>
                       <td className="px-3 py-3 font-medium text-gray-500">{r.driver_name || '-'}</td>
                       <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.status}</span>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

// --- OLD COMPONENT: TANKER GATE ---
function TankerGateTerminal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [exitPhoto, setExitPhoto] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitEntry, setExitEntry] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState('entry');
  const [form, setForm] = useState({ 
    vehicle_number: '', 
    driver_name: '', 
    driver_phone: '', 
    material_type: '', 
    material_name: '', 
    quantity: '', 
    unit: 'kg', 
    direction: 'entry', 
    purpose: '', 
    remarks: '', 
    tanker_code: '' 
  });

  useEffect(() => { fetchEntries(); }, [search, filterDirection, filterStatus]);

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterDirection) params.set('direction', filterDirection);
      if (filterStatus) params.set('gate_status', filterStatus);
      const res = await fetch(`/api/manufacturing/security-gate?${params}`);
      const data = await res.json();
      if (data.success) setEntries(data.data);
    } catch { } finally { setLoading(false); }
  };

  const startCamera = async (m) => {
    setCameraMode(m); setCameraActive(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
    } catch { setCameraActive(false); }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current; const video = videoRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const d = canvas.toDataURL('image/jpeg', 0.7);
    if (cameraMode === 'entry') setCapturedPhoto(d); else setExitPhoto(d);
    if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  };

  const handleSave = async () => {
    if (!form.vehicle_number) return alert('Vehicle number required');
    setSaving(true);
    try {
      const res = await fetch('/api/manufacturing/security-gate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, entry_photo: capturedPhoto || null }) });
      if ((await res.json()).success) { setShowModal(false); setCapturedPhoto(null); fetchEntries(); }
    } finally { setSaving(false); }
  };

  const handleExit = async () => {
    if (!exitEntry) return;
    try {
      const res = await fetch('/api/manufacturing/security-gate', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: exitEntry.id, gate_status: 'exited', exit_photo: exitPhoto || null }) });
      if ((await res.json()).success) { setShowExitModal(false); setExitEntry(null); setExitPhoto(null); fetchEntries(); }
    } catch { }
  };

  const updateGateStatus = async (id, s) => {
    const res = await fetch('/api/manufacturing/security-gate', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, gate_status: s }) });
    if ((await res.json()).success) fetchEntries();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
         <h2 className="font-bold text-gray-800 flex items-center gap-2"><FaTruck className="text-cyan-600"/> TANKER GATE LOGS</h2>
         <div className="flex gap-2">
            <button onClick={() => { setForm({ ...form, direction: 'entry' }); setShowModal(true); }} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><FaSignInAlt/> Entry</button>
            <button onClick={() => { setForm({ ...form, direction: 'exit' }); setShowModal(true); }} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><FaSignOutAlt/> Exit</button>
         </div>
      </div>

      <div className="flex gap-2">
         <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search tankers..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
         </div>
         <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border text-sm outline-none">
            <option value="">All Status</option>
            <option value="arrived">Arrived</option>
            <option value="under_processing">Processing</option>
            <option value="ready_to_exit">Ready</option>
            <option value="exited">Exited</option>
         </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-xs">
               <thead className="bg-gray-50 border-b">
                  <tr>{['Code', 'Vehicle', 'Driver', 'Material', 'Direction', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left font-semibold text-gray-600 uppercase">{h}</th>)}</tr>
               </thead>
               <tbody className="divide-y">
                  {entries.length > 0 ? entries.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-semibold text-cyan-600">{e.entry_code}</td>
                      <td className="px-3 py-3 font-bold">{e.vehicle_number}</td>
                      <td className="px-3 py-3">{e.driver_name || '-'}</td>
                      <td className="px-3 py-3">{e.material_name || '-'}</td>
                      <td className="px-3 py-3">{e.direction === 'entry' ? '↓ IN' : '↑ OUT'}</td>
                      <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full bg-gray-100 font-bold">{e.gate_status}</span></td>
                      <td className="px-3 py-3 flex gap-1">
                         <button onClick={() => { setViewEntry(e); setShowPhotoModal(true); }} className="p-1.5 bg-gray-100 rounded hover:bg-gray-200"><FaEye/></button>
                         {e.gate_status === 'arrived' && <button onClick={() => updateGateStatus(e.id, 'under_processing')} className="bg-blue-500 text-white px-2 py-0.5 rounded">Processing</button>}
                         {e.gate_status === 'under_processing' && <button onClick={() => updateGateStatus(e.id, 'ready_to_exit')} className="bg-yellow-500 text-white px-2 py-0.5 rounded">Ready</button>}
                         {e.gate_status === 'ready_to_exit' && <button onClick={() => { setExitEntry(e); setShowExitModal(true); }} className="bg-red-500 text-white px-2 py-0.5 rounded">Exit</button>}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={7} className="p-8 text-center text-gray-400">No logs found</td></tr>}
               </tbody>
            </table>
         </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{form.direction === 'entry' ? 'Gate Entry' : 'Gate Exit'}</h2>
            <div className="space-y-3">
              <input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })} placeholder="Vehicle Number *" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })} placeholder="Driver Name" className="w-full px-3 py-2 border rounded-lg text-sm" />
                <input value={form.driver_phone} onChange={e => setForm({ ...form, driver_phone: e.target.value })} placeholder="Driver Phone" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.material_name} onChange={e => setForm({ ...form, material_name: e.target.value })} placeholder="Material Name" className="w-full px-3 py-2 border rounded-lg text-sm" />
                <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="Purpose (e.g. Delivery)" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="Quantity" className="w-full px-3 py-2 border rounded-lg text-sm" />
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                  <option value="kg">KG</option>
                  <option value="litre">Litre</option>
                  <option value="pcs">Pcs</option>
                </select>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border">
                {cameraActive ? (
                  <div><video ref={videoRef} className="w-full rounded-lg max-h-60 object-cover" autoPlay muted playsInline /><div className="flex gap-2 mt-2"><button onClick={captureImage} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold"><FaCamera/> Capture</button></div></div>
                ) : capturedPhoto ? (
                  <div><img src={capturedPhoto} className="w-full rounded-lg max-h-48 object-cover" /><button onClick={() => setCapturedPhoto(null)} className="mt-2 text-red-500">Remove</button></div>
                ) : (
                  <button onClick={() => startCamera('entry')} className="bg-cyan-500 text-white py-2 px-4 rounded-lg font-bold">Open Camera</button>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => { setShowModal(false); }} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 bg-cyan-500 text-white rounded-lg font-bold">{saving ? '...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}

      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Exit Capture</h2>
            {cameraActive ? (
              <div><video ref={videoRef} className="w-full rounded-lg max-h-60 object-cover" autoPlay muted playsInline /><button onClick={captureImage} className="w-full bg-green-500 text-white py-3 rounded-xl mt-3 font-bold">Capture</button></div>
            ) : exitPhoto ? (
              <div><img src={exitPhoto} className="w-full rounded-lg max-h-48 object-cover" /><button onClick={() => setExitPhoto(null)} className="mt-2 text-red-500">Retake</button></div>
            ) : (
              <button onClick={() => startCamera('exit')} className="w-full bg-red-500 text-white py-4 rounded-xl font-bold">Open Camera</button>
            )}
            <div className="flex justify-end gap-2 mt-5 pt-3 border-t">
              <button onClick={() => setShowExitModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleExit} className="px-5 py-2 bg-red-500 text-white rounded-lg font-bold">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showPhotoModal && viewEntry && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowPhotoModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Photos - {viewEntry.vehicle_number}</h3>
            <div className="grid grid-cols-2 gap-4">
               {viewEntry.entry_photo && <div><p className="text-xs font-bold mb-1">Entry Photo</p><img src={viewEntry.entry_photo} className="w-full rounded border-2 border-green-500"/></div>}
               {viewEntry.exit_photo && <div><p className="text-xs font-bold mb-1">Exit Photo</p><img src={viewEntry.exit_photo} className="w-full rounded border-2 border-red-500"/></div>}
            </div>
            <button onClick={() => setShowPhotoModal(false)} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg w-full font-bold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN PAGE WRAPPER ---
export default function SecurityGatePage() {
  const [activeTab, setActiveTab] = useState('mfg'); // 'mfg' or 'tanker'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-[#f8fafc] flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          {/* Top Level Hero Header */}
          <div className="bg-gradient-to-br from-cyan-900 via-cyan-800 to-cyan-600 px-4 sm:px-6 py-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="max-w-7xl mx-auto relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                  <FaShieldAlt className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight uppercase">Security Gateway Control</h1>
                  <p className="text-cyan-200 text-[10px] font-bold tracking-widest opacity-80 uppercase">Select Terminal below</p>
                </div>
              </div>

              {/* TAB SWITCHER */}
              <div className="bg-black/20 p-1 rounded-2xl flex items-center gap-1 backdrop-blur-lg border border-white/10">
                <button 
                  onClick={() => setActiveTab('mfg')} 
                  className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest flex items-center gap-2 ${activeTab === 'mfg' ? 'bg-cyan-500 text-white shadow-lg' : 'hover:bg-white/5 text-cyan-100/60'}`}
                >
                  <FaClipboardList/> Mfg Entry
                </button>
                <button 
                  onClick={() => setActiveTab('tanker')} 
                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest flex items-center gap-2 ${activeTab === 'tanker' ? 'bg-cyan-500 text-white shadow-lg' : 'hover:bg-white/5 text-cyan-100/60'}`}
                >
                  <FaTruck/> Tanker Gate
                </button>
              </div>
            </div>
          </div>

          <div className="pb-20">
             <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-cyan-500 text-4xl mx-auto"/></div>}>
                {activeTab === 'mfg' ? <MfgRequestTerminal /> : <TankerGateTerminal />}
             </Suspense>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}