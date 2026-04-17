// src/app/manufacturing/entry-requests/page.jsx
"use client";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { FaPlus, FaSearch, FaSpinner, FaTruck, FaShieldAlt, FaKey, FaEye, FaBan, FaRedo, FaCamera, FaMapMarkerAlt, FaCheckCircle, FaClock, FaTimesCircle, FaCog, FaSignOutAlt } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

// OTP Modal Component
const OtpModal = ({ request, onClose, onVerify }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => { inputRefs.current = inputRefs.current.slice(0, 6); }, []);

  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    } else { setCanResend(true); }
  }, [timer]);

  useEffect(() => {
    if (inputRefs.current[0]) setTimeout(() => inputRefs.current[0].focus(), 100);
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1].focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, idx) => { if (idx < 6) newOtp[idx] = digit; });
      setOtp(newOtp);
      setTimeout(() => { if (inputRefs.current[5]) inputRefs.current[5].focus(); }, 10);
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) { setError("कृपया 6 अंकों का OTP दर्ज करें"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, action: 'verify_otp', otp_code: otpString })
      });
      const data = await res.json();
      if (data.success) { onVerify(request.id); }
      else { setError(data.error || "OTP verification failed"); }
    } catch (err) { setError("Error verifying OTP"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-5 py-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">🔐 OTP Verification</h3>
              <p className="text-cyan-100 text-sm mt-0.5">Request: {request.request_code}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition" disabled={loading}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Vehicle info */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <FaTruck className="text-cyan-600" />
            </div>
            <div>
              <p className="font-bold text-gray-800">{request.vehicle_number}</p>
              <p className="text-xs text-gray-500">{request.driver_name || 'N/A'} • {request.driver_phone || 'N/A'}</p>
            </div>
          </div>

          <p className="text-center text-gray-600 text-sm mb-4">6 अंकों का OTP दर्ज करें</p>

          {/* OTP Inputs */}
          <div className="flex justify-center gap-2 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-11 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition"
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
              Cancel
            </button>
            <button onClick={handleVerify} disabled={loading || otp.join("").length !== 6} className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><FaSpinner className="animate-spin" /> Verifying...</> : '✓ Verify OTP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Photo Capture + Location Component
const PhotoCaptureModal = ({ request, mode, onClose, onSubmit }) => {
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null, name: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Auto-detect location on open
  useEffect(() => {
    detectLocation();
  }, []);

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
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude })
          });
          const data = await res.json();
          if (data.success) { setLocation(prev => ({ ...prev, name: data.area_name })); }
          else { setLocation(prev => ({ ...prev, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` })); }
        } catch { setLocation(prev => ({ ...prev, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` })); }
        finally { setLocationLoading(false); }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED: setLocationError('Location permission denied'); break;
          case error.POSITION_UNAVAILABLE: setLocationError('Location unavailable'); break;
          case error.TIMEOUT: setLocationError('Location timeout'); break;
          default: setLocationError('Location error');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Camera access denied.');
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const handleSubmit = async () => {
    if (!capturedPhoto) { alert('कृपया पहले Photo लें!'); return; }
    if (!location.lat || !location.lng) { alert('Location capture हो रहा है, कृपया प्रतीक्षा करें'); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        photo: capturedPhoto,
        lat: location.lat,
        lng: location.lng,
        locationName: location.name
      });
    } finally { setSubmitting(false); }
  };

  // Cleanup camera on unmount
  useEffect(() => { return () => { stopCamera(); }; }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-auto shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className={`px-5 py-4 text-white ${mode === 'entry' ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-red-600 to-red-500'}`}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">{mode === 'entry' ? '📷 Entry Photo & Location' : '📷 Exit Photo & Location'}</h3>
              <p className="text-white/80 text-sm">{request.request_code} • {request.vehicle_number}</p>
            </div>
            <button onClick={() => { stopCamera(); onClose(); }} className="p-1.5 hover:bg-white/20 rounded-full transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Location Section */}
          <div className="bg-gray-50 rounded-xl p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <FaMapMarkerAlt className={`text-base ${location.lat ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm font-semibold text-gray-700">Location</span>
              {locationLoading && <FaSpinner className="animate-spin text-cyan-500 text-sm" />}
            </div>
            {location.lat ? (
              <div className="text-sm">
                <p className="font-medium text-green-700">{location.name || 'Location detected'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{location.lat?.toFixed(6)}, {location.lng?.toFixed(6)}</p>
              </div>
            ) : locationError ? (
              <div>
                <p className="text-red-500 text-sm">{locationError}</p>
                <button onClick={detectLocation} className="mt-1 text-cyan-600 text-xs font-semibold hover:underline flex items-center gap-1">
                  <FaRedo className="text-[10px]" /> Retry
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Detecting location...</p>
            )}
          </div>

          {/* Camera Section */}
          <div className="bg-gray-50 rounded-xl p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <FaCamera className={`text-base ${capturedPhoto ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm font-semibold text-gray-700">Vehicle Photo</span>
            </div>
            {cameraActive ? (
              <div>
                <video ref={videoRef} className="w-full rounded-xl max-h-60 object-cover bg-black" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2 mt-3">
                  <button onClick={captureImage} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition">
                    <FaCamera /> Capture
                  </button>
                  <button onClick={stopCamera} className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-600 transition">Cancel</button>
                </div>
              </div>
            ) : capturedPhoto ? (
              <div>
                <img src={capturedPhoto} alt="Captured" className="w-full rounded-xl max-h-48 object-cover border-2 border-green-300" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setCapturedPhoto(null); }} className="text-red-500 text-sm font-medium hover:underline">Remove</button>
                  <button onClick={startCamera} className="text-cyan-600 text-sm font-medium hover:underline">Retake</button>
                </div>
              </div>
            ) : (
              <button onClick={startCamera} className="w-full bg-cyan-500 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-cyan-600 transition">
                <FaCamera /> Open Camera
              </button>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { stopCamera(); onClose(); }} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !capturedPhoto || !location.lat}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition ${mode === 'entry' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {submitting ? <><FaSpinner className="animate-spin" /> Processing...</> : mode === 'entry' ? '✓ Submit Entry' : '✓ Submit Exit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function ManufacturingEntryRequestsContent() {
  const { user } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicle_number: '', driver_name: '', driver_phone: '',
    purpose: '', material_type: '', material_name: '',
    quantity: '', unit: 'kg', remarks: ''
  });
  const [createdOtp, setCreatedOtp] = useState(null);
  
  // Create Modal Camera
  const [capturedCreatePhoto, setCapturedCreatePhoto] = useState(null);
  const [createCameraActive, setCreateCameraActive] = useState(false);
  const createVideoRef = useRef(null);
  const createCanvasRef = useRef(null);

  const startCreateCamera = async () => {
    setCreateCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (createVideoRef.current) { createVideoRef.current.srcObject = stream; createVideoRef.current.play(); }
    } catch (err) { alert('Camera access denied'); setCreateCameraActive(false); }
  };

  const captureCreateImage = () => {
    if (!createVideoRef.current || !createCanvasRef.current) return;
    const canvas = createCanvasRef.current;
    const video = createVideoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCapturedCreatePhoto(canvas.toDataURL('image/jpeg', 0.7));
    stopCreateCamera();
  };

  const stopCreateCamera = () => {
    if (createVideoRef.current?.srcObject) {
      createVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCreateCameraActive(false);
  };

  // OTP Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Photo Modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoMode, setPhotoMode] = useState('entry');

  // View Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);

  // Permissions
  const [permissions, setPermissions] = useState({ can_view: false, can_edit: false, can_create: false });
  const isAdmin = user && Number(user.role) === 5;
  const isSecurityGuard = user && Number(user.role) === 8;

  useEffect(() => {
    if (user) {
      checkPermissions();
      fetchEntries();
    }
  }, [user, search, filterStatus]);

  const checkPermissions = async () => {
    if (!user) return;
    const roleNum = Number(user.role) || Number(user.roleid);
    
    // Admins (5) and Security Guards (8) can always create entry requests
    if (roleNum === 5 || roleNum === 8) {
      setPermissions({ can_view: true, can_edit: true, can_create: true });
      return;
    }

    if (user.permissions?.['Manufacturing Entry'] || user.permissions?.['Security Gate']) {
      const p = user.permissions['Manufacturing Entry'] || user.permissions['Security Gate'] || {};
      setPermissions({ can_view: !!p.can_view, can_edit: !!p.can_edit, can_create: !!p.can_create });
      return;
    }
  };

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/manufacturing/entry-requests?${params}`);
      const data = await res.json();
      if (data.success) setEntries(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Notification for new requests
  useEffect(() => {
    if (isAdmin && entries.length > 0) {
      const waiting = entries.filter(e => e.status === 'pending_approval');
      if (waiting.length > 0) {
        // Only notify if notification permission is granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          // Check if we already notified about the latest one
          const latestId = Math.max(...waiting.map(w => w.id));
          const lastNotified = localStorage.getItem('last_mfg_entry_notified');
          
          if (lastNotified !== String(latestId)) {
            new Notification('New Entry Request', {
              body: `${waiting.length} vehicles waiting for approval.`,
              icon: '/favicon.png'
            });
            localStorage.setItem('last_mfg_entry_notified', String(latestId));
          }
        }
      }
    }
  }, [entries, isAdmin]);

  const handleCreate = async () => {
    if (!form.vehicle_number) return alert('Vehicle number is required');
    if (form.vehicle_number.includes(' ')) return alert('❌ Vehicle number me spaces nahi hone chahiye!');
    setSaving(true);
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          created_by: user?.id,
          created_by_name: user?.name,
          role: user?.role,
          entry_photo: capturedCreatePhoto || null
        })
      });
      const data = await res.json();
      if (data.success) {
        if (Number(user?.role) === 8) {
           alert(`✅ Request created and sent to Admin for approval!\n\nCode: ${data.request_code}\nOnce approved, you will get the OTP.`);
        } else {
           alert(`✅ Request created!\n\nCode: ${data.request_code}\nOTP: ${data.otp_code}`);
        }
        setForm({ vehicle_number: '', driver_name: '', driver_phone: '', purpose: '', material_type: '', material_name: '', quantity: '', unit: 'kg', remarks: '' });
        setCapturedCreatePhoto(null);
        setShowCreateModal(false);
        fetchEntries();
      } else alert(data.error);
    } catch (err) { alert('Error creating request'); }
    finally { setSaving(false); }
  };

  const handleOtpVerified = (requestId) => {
    setShowOtpModal(false);
    // After OTP verified, open photo capture
    const req = entries.find(e => e.id === requestId);
    if (req) {
      setSelectedRequest({ ...req, status: 'approved' });
      setPhotoMode('entry');
      setShowPhotoModal(true);
    }
    fetchEntries();
  };

  const handleApprove = async (req) => {
    if (!confirm(`Approve karna hai ${req.vehicle_number} ki request?`)) return;
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, action: 'approve' })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Request approved!');
        fetchEntries();
      } else alert(data.error);
    } catch { alert('Error approving'); }
  };

  const handlePhotoSubmit = async (photoData) => {
    if (!selectedRequest) return;
    try {
      const action = photoMode === 'entry' ? 'process_entry' : 'process_exit';
      const body = {
        id: selectedRequest.id,
        action,
        processed_by: user?.id,
        processed_by_name: user?.name,
      };

      if (photoMode === 'entry') {
        body.entry_photo = photoData.photo;
        body.entry_location_lat = photoData.lat;
        body.entry_location_lng = photoData.lng;
        body.entry_location_name = photoData.locationName;
      } else {
        body.exit_photo = photoData.photo;
        body.exit_location_lat = photoData.lat;
        body.exit_location_lng = photoData.lng;
        body.exit_location_name = photoData.locationName;
      }

      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${photoMode === 'entry' ? 'Entry' : 'Exit'} processed successfully!`);
        setShowPhotoModal(false);
        setSelectedRequest(null);
        fetchEntries();
      } else alert(data.error);
    } catch (err) { alert('Error processing'); }
  };

  const handleRegenerateOtp = async (req) => {
    if (!confirm(`OTP regenerate karna hai ${req.request_code} ke liye?`)) return;
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, action: 'regenerate_otp' })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ New OTP: ${data.otp_code}`);
        fetchEntries();
      } else alert(data.error);
    } catch { alert('Error'); }
  };

  const handleCancel = async (req) => {
    if (!confirm(`Cancel karna hai ${req.request_code}?`)) return;
    try {
      const res = await fetch('/api/manufacturing/entry-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, action: 'cancel' })
      });
      const data = await res.json();
      if (data.success) { fetchEntries(); } else alert(data.error);
    } catch { alert('Error'); }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending_approval: 'bg-orange-100 text-orange-800 border-orange-200',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processing: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels = {
      pending_approval: '⏳ Waiting Approval',
      pending: '⏳ Pending OTP',
      approved: '✓ Approved',
      processing: '🔄 Inside',
      completed: '✅ Completed',
      cancelled: '❌ Cancelled',
    };
    return <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
  };

  const formatTime = (t) => t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-';

  const summaryStats = {
    total: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    waiting: entries.filter(e => e.status === 'pending_approval').length,
    inside: entries.filter(e => ['approved', 'processing'].includes(e.status)).length,
    completed: entries.filter(e => e.status === 'completed').length,
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">

          {/* Hero Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 sm:px-6 md:px-8 py-5 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                    <FaTruck className="text-cyan-400 text-lg" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold">Manufacturing - Vehicle Entry</h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {isAdmin ? 'Create entry requests & manage permissions' : 'Search vehicle & process entry/exit'}
                    </p>
                  </div>
                </div>
                {(isAdmin || permissions.can_create) && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-cyan-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-cyan-600 transition flex items-center gap-2 text-sm shadow-lg"
                  >
                    <FaPlus /> New Entry Request
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 -mt-4 relative z-10">

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total', value: summaryStats.total, icon: <FaClipboardList />, color: 'bg-blue-100 text-blue-600' },
                { label: 'Waiting Approval', value: summaryStats.waiting, icon: <FaShieldAlt />, color: 'bg-orange-100 text-orange-600' },
                { label: 'Pending OTP', value: summaryStats.pending, icon: <FaClock />, color: 'bg-yellow-100 text-yellow-600' },
                { label: 'Inside Facility', value: summaryStats.inside, icon: <FaTruck />, color: 'bg-green-100 text-green-600' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border shadow-sm flex items-center gap-3 hover:shadow-md transition">
                  <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center text-sm`}>{c.icon}</div>
                  <div>
                    <div className="text-xl font-bold text-gray-800">{c.value}</div>
                    <div className="text-[11px] text-gray-500 font-medium">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  placeholder="Search vehicle number, driver, code..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-sm"
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-sm min-w-[140px]"
              >
                <option value="">All Status</option>
                <option value="pending_approval">Waiting Approval</option>
                <option value="pending">Pending OTP</option>
                <option value="approved">Approved</option>
                <option value="processing">Inside</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {loading ? (
                <div className="p-12 text-center"><FaSpinner className="animate-spin text-cyan-500 text-3xl mx-auto" /></div>
              ) : entries.length > 0 ? entries.map(e => (
                <div key={e.id} className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-cyan-600 text-sm">{e.request_code}</p>
                      <p className="font-semibold text-gray-800 text-lg mt-0.5">{e.vehicle_number}</p>
                    </div>
                    {getStatusBadge(e.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                    <div><span className="font-medium text-gray-700">Driver:</span> {e.driver_name || '-'}</div>
                    <div><span className="font-medium text-gray-700">Phone:</span> {e.driver_phone || '-'}</div>
                    <div><span className="font-medium text-gray-700">Purpose:</span> {e.purpose || '-'}</div>
                    <div><span className="font-medium text-gray-700">Created:</span> {formatTime(e.created_at)}</div>
                  </div>
                  {e.entry_location_name && (
                    <div className="text-xs text-green-600 mb-2 flex items-center gap-1">
                      <FaMapMarkerAlt /> {e.entry_location_name}
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => { setDetailRequest(e); setShowDetailModal(true); }} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-200 transition flex items-center gap-1 flex-1 justify-center">
                        <FaEye /> View
                      </button>
                      {e.status === 'pending_approval' && isAdmin && (
                        <button onClick={() => handleApprove(e)} className="bg-orange-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-orange-600 transition flex items-center gap-1 flex-1 justify-center">
                          <FaCheckCircle /> Approve
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {e.status === 'pending' && (isSecurityGuard || isAdmin) && (
                        <button onClick={() => { setSelectedRequest(e); setShowOtpModal(true); }} className="bg-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-cyan-600 transition flex items-center gap-1 flex-1 justify-center">
                          <FaKey /> OTP Verify
                        </button>
                      )}
                      {e.status === 'approved' && (isSecurityGuard || isAdmin) && (
                        <button onClick={() => { setSelectedRequest(e); setPhotoMode('entry'); setShowPhotoModal(true); }} className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-green-600 transition flex items-center gap-1 flex-1 justify-center">
                          <FaCamera /> Entry Photo
                        </button>
                      )}
                      {e.status === 'processing' && (isSecurityGuard || isAdmin) && (
                        <button onClick={() => { setSelectedRequest(e); setPhotoMode('exit'); setShowPhotoModal(true); }} className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-600 transition flex items-center gap-1 flex-1 justify-center">
                          <FaSignOutAlt /> Exit
                        </button>
                      )}
                    </div>
                    {e.status === 'pending' && isAdmin && (
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => handleRegenerateOtp(e)} className="bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-amber-200 transition flex items-center gap-1 flex-1 justify-center">
                          <FaRedo /> Re-OTP
                        </button>
                        <button onClick={() => handleCancel(e)} className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-200 transition flex items-center gap-1 flex-1 justify-center">
                          <FaBan /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="bg-white rounded-xl p-8 text-center border">
                  <FaTruck className="text-3xl text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">No entry requests found</p>
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
              {loading ? (
                <div className="p-12 text-center"><FaSpinner className="animate-spin text-cyan-500 text-3xl mx-auto" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Code', 'Vehicle', 'Driver', 'Purpose', 'Material', 'Entry Time', 'Exit Time', 'Location', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {entries.length > 0 ? entries.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-3 font-semibold text-cyan-600 whitespace-nowrap">{e.request_code}</td>
                          <td className="px-3 py-3 font-bold text-gray-800 whitespace-nowrap">{e.vehicle_number}</td>
                          <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                            <div>{e.driver_name || '-'}</div>
                            {e.driver_phone && <div className="text-xs text-gray-400">{e.driver_phone}</div>}
                          </td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap max-w-[120px] truncate">{e.purpose || '-'}</td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{e.material_name || e.material_type || '-'}</td>
                          <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTime(e.entry_time)}</td>
                          <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTime(e.exit_time)}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {e.entry_location_name ? (
                              <span className="text-xs text-green-600 flex items-center gap-1"><FaMapMarkerAlt /> {e.entry_location_name?.substring(0, 20)}</span>
                            ) : <span className="text-gray-400 text-xs">-</span>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">{getStatusBadge(e.status)}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => { setDetailRequest(e); setShowDetailModal(true); }} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-200 transition" title="View Details">
                                <FaEye />
                              </button>
                              {e.status === 'pending_approval' && isAdmin && (
                                <button onClick={() => handleApprove(e)} className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-orange-600 transition" title="Approve Request">
                                  <FaCheckCircle />
                                </button>
                              )}
                              {e.status === 'pending' && (isSecurityGuard || isAdmin) && (
                                <button onClick={() => { setSelectedRequest(e); setShowOtpModal(true); }} className="bg-cyan-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-cyan-600 transition" title="Verify OTP">
                                  <FaKey />
                                </button>
                              )}
                              {e.status === 'approved' && (isSecurityGuard || isAdmin) && (
                                <button onClick={() => { setSelectedRequest(e); setPhotoMode('entry'); setShowPhotoModal(true); }} className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-green-600 transition" title="Capture Entry">
                                  <FaCamera />
                                </button>
                              )}
                              {e.status === 'processing' && (isSecurityGuard || isAdmin) && (
                                <button onClick={() => { setSelectedRequest(e); setPhotoMode('exit'); setShowPhotoModal(true); }} className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-600 transition" title="Process Exit">
                                  <FaSignOutAlt />
                                </button>
                              )}
                              {e.status === 'pending' && isAdmin && (
                                <>
                                  <button onClick={() => handleRegenerateOtp(e)} className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-semibold hover:bg-amber-200 transition" title="Regenerate OTP">
                                    <FaRedo />
                                  </button>
                                  <button onClick={() => handleCancel(e)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold hover:bg-red-200 transition" title="Cancel">
                                    <FaBan />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={10} className="p-8 text-center text-gray-400">No entry requests found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </main>
        <Footer />
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col">
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-5 py-4 text-white rounded-t-2xl">
              <h2 className="text-lg font-bold">🚛 New Entry Request</h2>
              <p className="text-cyan-100 text-xs mt-0.5">Vehicle ke liye entry permission create kare</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Vehicle Number *</label>
                  <input
                    value={form.vehicle_number}
                    onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="MH12AB1234"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Driver Name</label>
                  <input
                    value={form.driver_name}
                    onChange={e => setForm({ ...form, driver_name: e.target.value })}
                    placeholder="Driver name"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Driver Phone</label>
                  <input
                    value={form.driver_phone}
                    onChange={e => setForm({ ...form, driver_phone: e.target.value })}
                    placeholder="10-digit phone"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Purpose</label>
                  <select
                    value={form.purpose}
                    onChange={e => setForm({ ...form, purpose: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Select purpose</option>
                    <option value="Raw Material Delivery">Raw Material Delivery</option>
                    <option value="Finished Goods Pickup">Finished Goods Pickup</option>
                    <option value="Tanker Entry">Tanker Entry</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Material Type</label>
                  <input
                    value={form.material_type}
                    onChange={e => setForm({ ...form, material_type: e.target.value })}
                    placeholder="e.g. Industrial Oil"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Material Name</label>
                  <input
                    value={form.material_name}
                    onChange={e => setForm({ ...form, material_name: e.target.value })}
                    placeholder="Material name"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="kg">KG</option>
                    <option value="litre">Litre</option>
                    <option value="pcs">Pcs</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={e => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              {/* Camera Section for Create Modal */}
              <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-300">
                 <div className="flex items-center gap-2 mb-3">
                   <FaCamera className={capturedCreatePhoto ? 'text-green-500' : 'text-gray-400'} />
                   <span className="text-sm font-semibold text-gray-700">Vehicle/Driver Photo</span>
                 </div>
                 {createCameraActive ? (
                   <div>
                     <video ref={createVideoRef} className="w-full rounded-xl max-h-48 object-cover bg-black" autoPlay muted playsInline />
                     <canvas ref={createCanvasRef} className="hidden" />
                     <button onClick={captureCreateImage} className="w-full mt-3 bg-green-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2">
                       <FaCamera /> Capture Photo
                     </button>
                   </div>
                 ) : capturedCreatePhoto ? (
                   <div className="relative">
                     <img src={capturedCreatePhoto} className="w-full rounded-xl max-h-40 object-cover border-2 border-green-200" />
                     <button onClick={() => setCapturedCreatePhoto(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full text-xs">
                       <FaTimesCircle />
                     </button>
                   </div>
                 ) : (
                   <button onClick={startCreateCamera} className="w-full bg-cyan-100 text-cyan-700 border border-cyan-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-cyan-200 transition">
                     <FaCamera /> Open Camera
                   </button>
                 )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><FaSpinner className="animate-spin" /> Creating...</> : <><FaPlus /> Create Request</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && selectedRequest && (
        <OtpModal
          request={selectedRequest}
          onClose={() => { setShowOtpModal(false); setSelectedRequest(null); }}
          onVerify={handleOtpVerified}
        />
      )}

      {/* Photo Capture Modal */}
      {showPhotoModal && selectedRequest && (
        <PhotoCaptureModal
          request={selectedRequest}
          mode={photoMode}
          onClose={() => { setShowPhotoModal(false); setSelectedRequest(null); }}
          onSubmit={handlePhotoSubmit}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && detailRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-4 text-white rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">📋 Request Details</h3>
                <p className="text-slate-300 text-sm">{detailRequest.request_code}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 hover:bg-white/20 rounded-full transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Status</span>
                {getStatusBadge(detailRequest.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500 text-xs font-medium">Vehicle</p><p className="font-bold text-gray-800">{detailRequest.vehicle_number}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Driver</p><p className="font-semibold">{detailRequest.driver_name || '-'}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Phone</p><p>{detailRequest.driver_phone || '-'}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Purpose</p><p>{detailRequest.purpose || '-'}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Material</p><p>{detailRequest.material_name || detailRequest.material_type || '-'}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Quantity</p><p>{detailRequest.quantity > 0 ? `${parseFloat(detailRequest.quantity)} ${detailRequest.unit}` : '-'}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Created By</p><p>{detailRequest.created_by_name || '-'}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Processed By</p><p>{detailRequest.processed_by_name || '-'}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Entry Time</p><p>{formatTime(detailRequest.entry_time)}</p></div>
                <div><p className="text-gray-500 text-xs font-medium">Exit Time</p><p>{formatTime(detailRequest.exit_time)}</p></div>
              </div>
              {detailRequest.entry_location_name && (
                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-1">📍 Entry Location</p>
                  <p className="text-sm text-green-800">{detailRequest.entry_location_name}</p>
                  <p className="text-xs text-green-600 mt-0.5">{detailRequest.entry_location_lat}, {detailRequest.entry_location_lng}</p>
                </div>
              )}
              {detailRequest.exit_location_name && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                  <p className="text-xs font-semibold text-red-700 mb-1">📍 Exit Location</p>
                  <p className="text-sm text-red-800">{detailRequest.exit_location_name}</p>
                  <p className="text-xs text-red-600 mt-0.5">{detailRequest.exit_location_lat}, {detailRequest.exit_location_lng}</p>
                </div>
              )}
              {/* Photos */}
              <div className={`grid ${detailRequest.entry_photo && detailRequest.exit_photo ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {detailRequest.entry_photo && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 mb-1">🟢 Entry Photo</p>
                    <img src={detailRequest.entry_photo} alt="Entry" className="w-full rounded-xl border-2 border-green-200 max-h-40 object-cover" />
                  </div>
                )}
                {detailRequest.exit_photo && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1">🔴 Exit Photo</p>
                    <img src={detailRequest.exit_photo} alt="Exit" className="w-full rounded-xl border-2 border-red-200 max-h-40 object-cover" />
                  </div>
                )}
              </div>
              {detailRequest.remarks && (
                <div className="bg-gray-50 rounded-xl p-3 border">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Remarks</p>
                  <p className="text-sm text-gray-700">{detailRequest.remarks}</p>
                </div>
              )}
              {/* Show OTP for Admin */}
              {isAdmin && detailRequest.status === 'pending' && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-1">🔑 OTP</p>
                  <p className="text-xl font-mono font-bold text-blue-800">{detailRequest.otp_code}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Ye OTP Security Guard ko dijiye</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Missing icon import helper
const FaClipboardList = (props) => (
  <svg {...props} className={`${props.className || ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" width="1em" height="1em">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <FaSpinner className="animate-spin text-cyan-500 text-4xl" />
    </div>
  );
}

export default function ManufacturingEntryRequestsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ManufacturingEntryRequestsContent />
    </Suspense>
  );
}
