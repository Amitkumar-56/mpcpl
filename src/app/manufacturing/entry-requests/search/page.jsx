// src/app/manufacturing/entry-requests/search/page.jsx
// Security Guard - Vehicle Search & Process Page
"use client";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { FaSearch, FaSpinner, FaTruck, FaKey, FaCamera, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaRedo, FaSignOutAlt, FaShieldAlt, FaArrowLeft, FaPlusCircle, FaClock, FaCheck, FaUser, FaPhone, FaInfoCircle } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function SearchContent() {
  const { user } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchDone, setSearchDone] = useState(false);
  
  // Creation Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    purpose: '',
    material_name: '',
    quantity: '',
    unit: 'kg'
  });

  // OTP
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef([]);
  
  // Photo & Location
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [photoMode, setPhotoMode] = useState('entry'); // entry or exit
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null, name: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Search vehicle
  const handleSearch = async () => {
    if (!vehicleSearch.trim()) return alert('Vehicle number daliye!');
    setSearching(true);
    setSearchResult(null);
    setSearchDone(false);
    setShowOtpSection(false);
    setShowPhotoSection(false);
    setShowCreateForm(false);
    try {
      const res = await fetch(`/api/manufacturing/entry-requests?vehicle=${encodeURIComponent(vehicleSearch.trim())}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        // Get the latest active request for this vehicle
        const activeRequest = data.data.find(r => ['pending_approval', 'pending', 'approved', 'processing'].includes(r.status));
        setSearchResult(activeRequest || data.data[0]);
      } else {
        setSearchResult(null);
        setForm(prev => ({ ...prev, vehicle_number: vehicleSearch.trim().toUpperCase() }));
      }
      setSearchDone(true);
    } catch (err) { 
      console.error(err); 
      alert('Search me error aaya');
    }
    finally { setSearching(false); }
  };

  // Create Request
  const handleCreateRequest = async () => {
    if (!form.vehicle_number || !form.driver_name) return alert('Pehle details bhariye!');
    setCreating(true);
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          created_by: user?.id,
          created_by_name: user?.name,
          role: user?.role
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Request Admin/TL ko bhej di gayi hai approval ke liye.');
        setShowCreateForm(false);
        // Refresh search to show the info
        handleSearch();
      } else alert(data.error);
    } catch { alert('Error creating request'); }
    finally { setCreating(false); }
  };

  // Detect location
  const detectLocation = () => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return; }
    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(prev => ({ ...prev, lat: latitude, lng: longitude }));
        try {
          const res = await fetch('/api/get-area', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude })
          });
          const data = await res.json();
          if (data.success) setLocation(prev => ({ ...prev, name: data.area_name }));
          else setLocation(prev => ({ ...prev, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        } catch { setLocation(prev => ({ ...prev, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` })); }
        finally { setLocationLoading(false); }
      },
      (err) => {
        setLocationLoading(false);
        setLocationError(err.code === 1 ? 'Location permission denied' : 'Location unavailable');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // OTP handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      setTimeout(() => otpRefs.current[5]?.focus(), 10);
    }
  };

  const verifyOtp = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) { setOtpError("6 digit OTP daliye"); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: searchResult.id, action: 'verify_otp', otp_code: otpString })
      });
      const data = await res.json();
      if (data.success) {
        setSearchResult(prev => ({ ...prev, status: 'approved' }));
        setShowOtpSection(false);
        // Now show photo section
        setPhotoMode('entry');
        setShowPhotoSection(true);
        detectLocation();
      } else { setOtpError(data.error || 'Invalid OTP'); }
    } catch { setOtpError('Error verifying OTP'); }
    finally { setOtpLoading(false); }
  };

  // Camera
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch (err) {
      alert('Camera access denied');
      setCameraActive(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.7));
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  // Submit entry/exit
  const handleSubmit = async () => {
    if (!capturedPhoto) { alert('Pehle Photo lo!'); return; }
    if (!location.lat) { alert('Location detect ho raha hai...'); return; }
    setSubmitting(true);
    try {
      const action = photoMode === 'entry' ? 'process_entry' : 'process_exit';
      const body = {
        id: searchResult.id,
        action,
        processed_by: user?.id,
        processed_by_name: user?.name,
      };
      if (photoMode === 'entry') {
        body.entry_photo = capturedPhoto;
        body.entry_location_lat = location.lat;
        body.entry_location_lng = location.lng;
        body.entry_location_name = location.name;
      } else {
        body.exit_photo = capturedPhoto;
        body.exit_location_lat = location.lat;
        body.exit_location_lng = location.lng;
        body.exit_location_name = location.name;
      }
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${photoMode === 'entry' ? 'Entry' : 'Exit'} successful!`);
        // Reset
        setShowPhotoSection(false);
        setCapturedPhoto(null);
        setVehicleSearch('');
        setSearchResult(null);
        setSearchDone(false);
        setLocation({ lat: null, lng: null, name: '' });
      } else alert(data.error);
    } catch { alert('Error processing'); }
    finally { setSubmitting(false); }
  };

  // Cleanup camera
  useEffect(() => { return () => stopCamera(); }, []);

  const getStatusInfo = (status) => {
    const map = {
      pending_approval: { label: '⏳ Pending Approval', color: 'bg-orange-100 text-orange-800 border-orange-300', desc: 'Admin/TL se approve karwaye' },
      pending: { label: '⏳ OTP Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', desc: 'Admin se OTP lekar verify kare' },
      approved: { label: '✓ OTP Verified', color: 'bg-blue-100 text-blue-800 border-blue-300', desc: 'Photo le aur entry kare' },
      processing: { label: '🔄 Inside Facility', color: 'bg-green-100 text-green-800 border-green-300', desc: 'Exit ke liye photo le' },
      completed: { label: '✅ Completed', color: 'bg-gray-100 text-gray-700 border-gray-300', desc: 'Ye request complete ho chuki hai' },
      cancelled: { label: '❌ Cancelled', color: 'bg-red-100 text-red-700 border-red-300', desc: 'Ye request cancel ho chuki hai' },
    };
    return map[status] || { label: status, color: 'bg-gray-100', desc: '' };
  };

  return (
    <div className="h-screen bg-[#f8fafc] flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto pb-20">
          
          {/* Hero Header */}
          <div className="bg-gradient-to-br from-cyan-800 via-cyan-700 to-cyan-500 px-4 sm:px-6 py-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-400/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
            
            <div className="max-w-xl mx-auto relative z-10 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/30 transform transition hover:rotate-6">
                  <FaShieldAlt className="text-3xl text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">SECURITY GATEWAY</h1>
                  <p className="text-cyan-100 text-sm font-medium opacity-90">Vehicle Entry & Exit Management System</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-xl mx-auto px-4 -mt-8 relative z-20">

            {/* Search Box - Premium Glass Look */}
            <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 p-6 mb-6">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3 ml-1">Vehicle Verification</label>
              <div className="relative group">
                <input
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="MH12AB1234"
                  className="w-full pl-14 pr-4 py-5 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-2xl font-black focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all text-gray-800 placeholder:text-gray-300 tracking-[0.2em]"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <FaTruck className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 text-2xl group-focus-within:text-cyan-500 transition-colors" />
              </div>
              
              <button
                onClick={handleSearch}
                disabled={searching}
                className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white py-4 rounded-2xl font-black text-lg shadow-[0_10px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_15px_30px_rgba(6,182,212,0.4)] hover:-translate-y-1 transition active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-tighter"
              >
                {searching ? <FaSpinner className="animate-spin" /> : <><FaSearch /> Search Vehicle</>}
              </button>
            </div>

            {/* Results / Multi-step UI */}
            <div className="space-y-6">
              
              {/* Not Found View */}
              {searchDone && !searchResult && !showCreateForm && (
                <div className="bg-white rounded-[2rem] shadow-xl border-2 border-dashed border-red-100 p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaTimesCircle className="text-red-400 text-4xl" />
                  </div>
                  <h3 className="font-black text-gray-800 text-xl mb-2">Record Nahi Mila!</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    <span className="font-mono font-black text-red-500 bg-red-50 px-2 py-1 rounded">{vehicleSearch}</span> ke liye koi active entry permission nahi hai.
                  </p>
                  
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-900 transition shadow-lg"
                  >
                    <FaPlusCircle /> Nayi Request Banaiye
                  </button>
                  <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">Admin/TeamLeader se approval chahiye hoga</p>
                </div>
              )}

              {/* Create Request Form */}
              {showCreateForm && (
                <div className="bg-white rounded-[2rem] shadow-2xl border border-cyan-50 p-6 animate-in zoom-in duration-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-16 -mt-16"></div>
                  
                  <h3 className="font-black text-gray-800 text-xl mb-6 flex items-center gap-3">
                    <FaPlusCircle className="text-cyan-500" /> Nayi Entry Request
                  </h3>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">Vehicle Number</label>
                        <div className="relative">
                          <input 
                            value={form.vehicle_number} 
                            disabled 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-500" 
                          />
                          <FaCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">Driver Name</label>
                        <div className="relative">
                          <input 
                            placeholder="Naam" 
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition"
                            value={form.driver_name}
                            onChange={e => setForm({...form, driver_name: e.target.value})}
                          />
                          <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">Phone Number</label>
                        <div className="relative">
                          <input 
                            placeholder="Mobile No" 
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition"
                            value={form.driver_phone}
                            onChange={e => setForm({...form, driver_phone: e.target.value})}
                          />
                          <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">Purpose / Kaam</label>
                      <input 
                        placeholder="e.g. Material Delivery, Pickup" 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-cyan-500 outline-none transition"
                        value={form.purpose}
                        onChange={e => setForm({...form, purpose: e.target.value})}
                      />
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button onClick={() => setShowCreateForm(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition">Cancel</button>
                      <button 
                        onClick={handleCreateRequest}
                        disabled={creating || !form.driver_name}
                        className="flex-[2] bg-gradient-to-r from-cyan-600 to-cyan-500 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-cyan-200 transition-all disabled:opacity-50"
                      >
                        {creating ? <FaSpinner className="animate-spin mx-auto" /> : '✓ Request Bheje'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Found Result Card */}
              {searchResult && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  
                  {/* Status Banner */}
                  <div className={`rounded-t-[2rem] px-6 py-4 border-t border-x flex justify-between items-center ${getStatusInfo(searchResult.status).color}`}>
                    <div className="flex items-center gap-2">
                       {searchResult.status === 'pending_approval' ? <FaClock className="animate-pulse" /> : <FaCheckCircle />}
                       <span className="font-black text-sm uppercase tracking-wider">{getStatusInfo(searchResult.status).label}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-black/10 px-2 py-1 rounded-full">{searchResult.request_code}</span>
                  </div>

                  <div className="bg-white rounded-b-[2rem] shadow-2xl border overflow-hidden">
                    <div className="p-6">
                      <div className="flex flex-col items-center mb-6">
                        <div className="w-20 h-20 bg-cyan-50 rounded-3xl flex items-center justify-center mb-3 shadow-inner">
                          <FaTruck className="text-cyan-600 text-3xl" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 tracking-widest">{searchResult.vehicle_number}</h2>
                        <p className="text-gray-400 text-sm font-medium mt-1">{searchResult.driver_name || 'No Name'} • {searchResult.driver_phone || '-'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Matlab / Purpose', value: searchResult.purpose, icon: <FaInfoCircle /> },
                          { label: 'Material', value: searchResult.material_name || searchResult.material_type || 'N/A', icon: <FaTruck /> },
                          { label: 'Log', value: searchResult.created_by_name, icon: <FaUser /> },
                          { label: 'Date', value: new Date(searchResult.created_at).toLocaleDateString(), icon: <FaClock /> }
                        ].map((item, i) => (
                          <div key={i} className="bg-gray-50/50 p-4 rounded-[1.5rem] border border-gray-100 hover:bg-white hover:shadow-md transition cursor-default group">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-cyan-500 transition-colors">{item.label}</p>
                            <p className="font-bold text-gray-700 truncate">{item.value || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Approval Message */}
                    {searchResult.status === 'pending_approval' && (
                       <div className="px-6 pb-6 pt-2">
                          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3 text-orange-800">
                             <FaClock className="mt-1 flex-shrink-0" />
                             <div>
                               <p className="font-bold text-sm">Approval ka Intezar kare</p>
                               <p className="text-xs opacity-80">Admin/TeamLeader ko request bhej di gayi hai. Approve hone par hi process kar payenge.</p>
                             </div>
                          </div>
                          <button onClick={handleSearch} className="w-full mt-4 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition">
                            <FaRedo className="text-xs" /> Refresh Status
                          </button>
                       </div>
                    )}

                    {/* Action Bar */}
                    <div className="p-6 pt-0">
                      {searchResult.status === 'pending' && !showOtpSection && (
                        <button
                          onClick={() => { setShowOtpSection(true); setOtp(["","","","","",""]); setTimeout(() => otpRefs.current[0]?.focus(), 200); }}
                          className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:-translate-y-1 transition active:translate-y-0 flex items-center justify-center gap-3 uppercase"
                        >
                          <FaKey className="text-xl" /> Enter Gateway OTP
                        </button>
                      )}
                      
                      {searchResult.status === 'approved' && !showPhotoSection && (
                        <button
                          onClick={() => { setPhotoMode('entry'); setShowPhotoSection(true); detectLocation(); }}
                          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:-translate-y-1 transition active:translate-y-0 flex items-center justify-center gap-3 uppercase"
                        >
                          <FaCamera className="text-xl" /> Start Entry Process
                        </button>
                      )}

                      {searchResult.status === 'processing' && !showPhotoSection && (
                        <button
                          onClick={() => { setPhotoMode('exit'); setShowPhotoSection(true); setCapturedPhoto(null); detectLocation(); }}
                          className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:-translate-y-1 transition active:translate-y-0 flex items-center justify-center gap-3 uppercase"
                        >
                          <FaSignOutAlt className="text-xl" /> Process Vehicle Exit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* OTP Glass Section */}
              {showOtpSection && searchResult.status === 'pending' && (
                <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white p-6 animate-in slide-in-from-bottom-5 duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-black text-gray-800 text-xl flex items-center gap-3">
                        <FaKey className="text-cyan-500" /> Verification OTP
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Gadi verify karne ke liye 6-digit code dale</p>
                    </div>
                    <button onClick={() => setShowOtpSection(false)} className="text-gray-400 hover:text-red-500"><FaTimesCircle size={24} /></button>
                  </div>
                  
                  <div className="flex justify-between gap-2 sm:gap-4 mb-8">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => otpRefs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="w-full max-w-[3.5rem] h-16 text-center text-3xl font-black border-2 border-gray-100 rounded-2xl focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white outline-none transition-all shadow-inner"
                        disabled={otpLoading}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center mb-6 animate-pulse">
                      {otpError}
                    </div>
                  )}

                  <button
                    onClick={verifyOtp}
                    disabled={otpLoading || otp.join("").length !== 6}
                    className="w-full bg-gray-800 text-white py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-gray-900 transition flex items-center justify-center gap-3"
                  >
                    {otpLoading ? <FaSpinner className="animate-spin" /> : <>✓ Confirm & Continue</>}
                  </button>
                </div>
              )}

              {/* Photo & Location Section - Premium Mobile Capture UI */}
              {showPhotoSection && (
                <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                  <div className={`px-6 py-4 flex justify-between items-center ${photoMode === 'entry' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                    <h3 className="font-black flex items-center gap-2">
                       <FaCamera /> {photoMode === 'entry' ? 'ENTRY VALIDATION' : 'EXIT VALIDATION'}
                    </h3>
                    <button onClick={() => { setShowPhotoSection(false); stopCamera(); }} className="hover:rotate-90 transition"><FaTimesCircle size={20} /></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Location Card */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 relative group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${location.lat ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                          <FaMapMarkerAlt className={locationLoading ? 'animate-bounce' : ''} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Live Location</span>
                        {locationLoading && <div className="h-1 w-12 bg-cyan-100 rounded-full overflow-hidden ml-auto"><div className="h-full bg-cyan-500 w-1/2 animate-[shimmer_1s_infinite]"></div></div>}
                      </div>

                      {location.lat ? (
                        <div className="pl-1">
                          <p className="font-black text-gray-800 text-sm leading-tight mb-1">{location.name}</p>
                          <p className="text-[10px] font-mono text-gray-400 font-bold">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                           <p className="text-sm font-bold text-gray-400">{locationError || 'Locating vehicle...'}</p>
                           <button onClick={detectLocation} className="text-cyan-500 p-2 hover:bg-cyan-50 rounded-lg transition"><FaRedo /></button>
                        </div>
                      )}
                    </div>

                    {/* Camera Feed / Photo Preview */}
                    <div className="bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-square sm:aspect-video border-4 border-gray-100">
                      {cameraActive ? (
                        <>
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                          <div className="absolute inset-x-0 bottom-6 px-6 flex justify-center gap-4">
                            <button onClick={captureImage} className="w-20 h-20 bg-white rounded-full p-1 shadow-2xl transform active:scale-95 transition">
                               <div className="w-full h-full rounded-full border-4 border-gray-200 flex items-center justify-center">
                                  <div className="w-14 h-14 bg-cyan-500 rounded-full"></div>
                               </div>
                            </button>
                            <canvas ref={canvasRef} className="hidden" />
                          </div>
                          {/* Guideline Overlay */}
                          <div className="absolute inset-10 border-2 border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
                              <p className="text-white/30 text-[10px] uppercase font-black tracking-[0.3em] -rotate-12">Fit Vehicle here</p>
                          </div>
                        </>
                      ) : capturedPhoto ? (
                        <div className="relative h-full">
                          <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                          <div className="absolute top-4 right-4 flex gap-2">
                             <button onClick={() => setCapturedPhoto(null)} className="bg-red-500/80 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg">RESET</button>
                             <button onClick={startCamera} className="bg-white/80 backdrop-blur-md text-gray-800 px-4 py-2 rounded-xl text-xs font-black shadow-lg">RETAKE</button>
                          </div>
                          <div className="absolute inset-0 border-8 border-green-500/30 pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-gray-900 group">
                           <button 
                            onClick={startCamera} 
                            className="bg-white/10 backdrop-blur-md text-white p-8 rounded-full mb-4 border border-white/20 group-hover:bg-white/20 transition-all duration-300 transform group-hover:scale-110 shadow-2xl"
                           >
                             <FaCamera size={40} />
                           </button>
                           <p className="text-white/50 font-black text-xs uppercase tracking-[0.2em]">Open Camera for Validation</p>
                        </div>
                      )}
                    </div>

                    {/* Final Submission */}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !capturedPhoto || !location.lat}
                      className={`w-full py-5 rounded-[1.5rem] font-black text-lg text-white transition shadow-2xl disabled:opacity-30 disabled:translate-y-0 hover:-translate-y-1 active:translate-y-0
                        ${photoMode === 'entry' ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-red-600 to-red-500'}`}
                    >
                      {submitting ? <FaSpinner className="animate-spin mx-auto" /> : photoMode === 'entry' ? 'CONFIRM ENTRY & OPEN GATE' : 'CONFIRM EXIT & CLOSE LOG'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
        <Footer />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

export default function SecuritySearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-cyan-600 font-black text-xs uppercase tracking-widest animate-pulse">Loading Security Terminal...</p>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
