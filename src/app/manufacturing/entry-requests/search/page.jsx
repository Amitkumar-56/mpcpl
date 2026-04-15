// src/app/manufacturing/entry-requests/search/page.jsx
// Security Guard - Vehicle Search & Process Page
"use client";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { FaSearch, FaSpinner, FaTruck, FaKey, FaCamera, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaRedo, FaSignOutAlt, FaShieldAlt, FaArrowLeft } from 'react-icons/fa';
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
    try {
      const res = await fetch(`/api/manufacturing/entry-requests?vehicle=${encodeURIComponent(vehicleSearch.trim())}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        // Get the latest active request for this vehicle
        const activeRequest = data.data.find(r => ['pending', 'approved', 'processing'].includes(r.status));
        setSearchResult(activeRequest || data.data[0]);
      } else {
        setSearchResult(null);
      }
      setSearchDone(true);
    } catch (err) { 
      console.error(err); 
      alert('Search me error aaya');
    }
    finally { setSearching(false); }
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
      pending: { label: '⏳ OTP Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', desc: 'OTP verify kare' },
      approved: { label: '✓ OTP Verified', color: 'bg-blue-100 text-blue-800 border-blue-300', desc: 'Photo le aur entry kare' },
      processing: { label: '🔄 Inside Facility', color: 'bg-green-100 text-green-800 border-green-300', desc: 'Exit ke liye photo le' },
      completed: { label: '✅ Completed', color: 'bg-gray-100 text-gray-700 border-gray-300', desc: 'Ye request complete ho chuki hai' },
      cancelled: { label: '❌ Cancelled', color: 'bg-red-100 text-red-700 border-red-300', desc: 'Ye request cancel ho chuki hai' },
    };
    return map[status] || { label: status, color: 'bg-gray-100', desc: '' };
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-700 to-cyan-500 px-4 sm:px-6 py-5 text-white">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/manufacturing/entry-requests')} className="p-2 hover:bg-white/20 rounded-full transition">
                  <FaArrowLeft />
                </button>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FaShieldAlt className="text-lg" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Security Guard - Vehicle Search</h1>
                  <p className="text-cyan-100 text-xs">Gadi ka number search kare aur process kare</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-xl mx-auto px-4 py-6">

            {/* Search Box */}
            <div className="bg-white rounded-2xl shadow-lg border p-5 mb-6">
              <label className="text-sm font-bold text-gray-700 block mb-2">🔍 Vehicle Number Search</label>
              <div className="flex gap-2">
                <input
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="e.g. MH12AB1234"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center tracking-wider"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-cyan-500 text-white px-5 py-3 rounded-xl font-semibold hover:bg-cyan-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {searching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                </button>
              </div>
            </div>

            {/* Search Result */}
            {searchDone && !searchResult && (
              <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 text-center mb-6">
                <FaTimesCircle className="text-red-400 text-4xl mx-auto mb-3" />
                <h3 className="font-bold text-red-800 text-lg">Vehicle Nahi Mila!</h3>
                <p className="text-red-600 text-sm mt-1">
                  <span className="font-mono font-bold">{vehicleSearch}</span> ke liye koi active request nahi hai
                </p>
                <p className="text-red-500 text-xs mt-2">Admin se request create karwaye</p>
              </div>
            )}

            {searchResult && (
              <div className="space-y-4">
                {/* Vehicle Card */}
                <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
                  <div className={`px-5 py-3 border-b ${getStatusInfo(searchResult.status).color}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">{getStatusInfo(searchResult.status).label}</span>
                      <span className="text-xs font-mono">{searchResult.request_code}</span>
                    </div>
                    <p className="text-xs mt-0.5 opacity-80">{getStatusInfo(searchResult.status).desc}</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center">
                        <FaTruck className="text-cyan-600 text-2xl" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-gray-800 tracking-wider">{searchResult.vehicle_number}</p>
                        <p className="text-sm text-gray-500">{searchResult.driver_name || 'Driver N/A'} • {searchResult.driver_phone || '-'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[11px] text-gray-500 font-medium">Purpose</p>
                        <p className="font-semibold text-gray-800">{searchResult.purpose || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[11px] text-gray-500 font-medium">Material</p>
                        <p className="font-semibold text-gray-800">{searchResult.material_name || searchResult.material_type || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[11px] text-gray-500 font-medium">Quantity</p>
                        <p className="font-semibold text-gray-800">{searchResult.quantity > 0 ? `${parseFloat(searchResult.quantity)} ${searchResult.unit}` : '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[11px] text-gray-500 font-medium">Created By</p>
                        <p className="font-semibold text-gray-800">{searchResult.created_by_name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-5 pb-5">
                    {searchResult.status === 'pending' && !showOtpSection && (
                      <button
                        onClick={() => { setShowOtpSection(true); setOtp(["","","","","",""]); setTimeout(() => otpRefs.current[0]?.focus(), 200); }}
                        className="w-full bg-cyan-500 text-white py-4 rounded-xl font-bold text-base hover:bg-cyan-600 transition flex items-center justify-center gap-3 shadow-lg"
                      >
                        <FaKey className="text-lg" /> OTP Verify Kare
                      </button>
                    )}
                    {searchResult.status === 'approved' && !showPhotoSection && (
                      <button
                        onClick={() => { setPhotoMode('entry'); setShowPhotoSection(true); detectLocation(); }}
                        className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-base hover:bg-green-600 transition flex items-center justify-center gap-3 shadow-lg"
                      >
                        <FaCamera className="text-lg" /> Entry Photo & Location
                      </button>
                    )}
                    {searchResult.status === 'processing' && !showPhotoSection && (
                      <button
                        onClick={() => { setPhotoMode('exit'); setShowPhotoSection(true); setCapturedPhoto(null); detectLocation(); }}
                        className="w-full bg-red-500 text-white py-4 rounded-xl font-bold text-base hover:bg-red-600 transition flex items-center justify-center gap-3 shadow-lg"
                      >
                        <FaSignOutAlt className="text-lg" /> Exit kare - Photo & Location
                      </button>
                    )}
                    {(searchResult.status === 'completed' || searchResult.status === 'cancelled') && (
                      <div className="text-center py-3 text-gray-400 text-sm">
                        Ye request {searchResult.status === 'completed' ? 'complete' : 'cancel'} ho chuki hai
                      </div>
                    )}
                  </div>
                </div>

                {/* OTP Section */}
                {showOtpSection && searchResult.status === 'pending' && (
                  <div className="bg-white rounded-2xl shadow-lg border p-5">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <FaKey className="text-cyan-500" /> OTP Daliye
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">Admin se OTP lekar yaha daliye</p>
                    
                    <div className="flex justify-center gap-2 mb-4">
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
                          className="w-12 h-14 text-center text-2xl font-black border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition"
                          disabled={otpLoading}
                        />
                      ))}
                    </div>

                    {otpError && (
                      <p className="text-red-500 text-sm text-center mb-3">{otpError}</p>
                    )}

                    <button
                      onClick={verifyOtp}
                      disabled={otpLoading || otp.join("").length !== 6}
                      className="w-full bg-cyan-500 text-white py-3 rounded-xl font-bold hover:bg-cyan-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {otpLoading ? <><FaSpinner className="animate-spin" /> Verifying...</> : '✓ Verify OTP'}
                    </button>
                  </div>
                )}

                {/* Photo & Location Section */}
                {showPhotoSection && (
                  <div className="bg-white rounded-2xl shadow-lg border p-5 space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <FaCamera className={photoMode === 'entry' ? 'text-green-500' : 'text-red-500'} />
                      {photoMode === 'entry' ? 'Entry Photo & Location' : 'Exit Photo & Location'}
                    </h3>

                    {/* Location */}
                    <div className="bg-gray-50 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-2">
                        <FaMapMarkerAlt className={location.lat ? 'text-green-500' : 'text-gray-400'} />
                        <span className="text-sm font-semibold text-gray-700">Location</span>
                        {locationLoading && <FaSpinner className="animate-spin text-cyan-500 text-sm" />}
                      </div>
                      {location.lat ? (
                        <div>
                          <p className="font-medium text-green-700 text-sm">{location.name}</p>
                          <p className="text-xs text-gray-500">{location.lat?.toFixed(6)}, {location.lng?.toFixed(6)}</p>
                        </div>
                      ) : locationError ? (
                        <div>
                          <p className="text-red-500 text-sm">{locationError}</p>
                          <button onClick={detectLocation} className="text-cyan-600 text-xs font-semibold hover:underline flex items-center gap-1 mt-1">
                            <FaRedo className="text-[10px]" /> Retry
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Detecting...</p>
                      )}
                    </div>

                    {/* Camera */}
                    <div className="bg-gray-50 rounded-xl p-4 border">
                      {cameraActive ? (
                        <div>
                          <video ref={videoRef} className="w-full rounded-xl max-h-64 object-cover bg-black" autoPlay muted playsInline />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="flex gap-2 mt-3">
                            <button onClick={captureImage} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition">
                              <FaCamera /> Capture
                            </button>
                            <button onClick={stopCamera} className="bg-gray-400 text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-500 transition">Cancel</button>
                          </div>
                        </div>
                      ) : capturedPhoto ? (
                        <div>
                          <img src={capturedPhoto} alt="Captured" className="w-full rounded-xl border-2 border-green-300 max-h-48 object-cover" />
                          <div className="flex gap-3 mt-2">
                            <button onClick={() => setCapturedPhoto(null)} className="text-red-500 text-sm font-semibold">Remove</button>
                            <button onClick={startCamera} className="text-cyan-600 text-sm font-semibold">Retake</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={startCamera} className="w-full bg-cyan-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-cyan-600 transition">
                          <FaCamera className="text-lg" /> Camera Open Kare
                        </button>
                      )}
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !capturedPhoto || !location.lat}
                      className={`w-full py-4 rounded-xl font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg
                        ${photoMode === 'entry' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                      {submitting ? <><FaSpinner className="animate-spin" /> Processing...</>
                        : photoMode === 'entry' ? <><FaCheckCircle /> Entry Submit Kare</>
                        : <><FaSignOutAlt /> Exit Submit Kare</>
                      }
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function SecuritySearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-cyan-500 text-4xl" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
