// src/app/security-gate/page.js
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { FaArrowLeft, FaCamera, FaShieldAlt, FaSearch, FaSpinner, FaTruck, FaSignInAlt, FaSignOutAlt, FaEye } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function SecurityGateContent() {
  const router = useRouter();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState('entry');
  const [form, setForm] = useState({
    vehicle_number: '', driver_name: '', driver_phone: '', material_type: '',
    material_name: '', quantity: '', unit: 'kg', direction: 'entry', purpose: '', remarks: '', tanker_code: ''
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const startCamera = async (mode) => {
    setCameraMode(mode);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Camera access denied. Please allow camera permissions.');
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
    if (cameraMode === 'entry') setCapturedPhoto(dataUrl);
    else setExitPhoto(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const handleSave = async () => {
    if (!form.vehicle_number || !form.direction) return alert('Vehicle number and direction required');
    setSaving(true);
    try {
      const res = await fetch('/api/manufacturing/security-gate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, entry_photo: capturedPhoto || null })
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false); setCapturedPhoto(null);
        setForm({ vehicle_number: '', driver_name: '', driver_phone: '', material_type: '', material_name: '', quantity: '', unit: 'kg', direction: 'entry', purpose: '', remarks: '', tanker_code: '' });
        fetchEntries();
      } else alert(data.error);
    } catch (err) { alert('Error saving'); }
    finally { setSaving(false); }
  };

  const handleExit = async () => {
    if (!exitEntry) return;
    try {
      const res = await fetch('/api/manufacturing/security-gate', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: exitEntry.id, gate_status: 'exited', exit_photo: exitPhoto || null })
      });
      const data = await res.json();
      if (data.success) { setShowExitModal(false); setExitEntry(null); setExitPhoto(null); fetchEntries(); }
      else alert(data.error);
    } catch (err) { alert('Error updating'); }
  };

  const updateGateStatus = async (id, gate_status) => {
    try {
      const res = await fetch('/api/manufacturing/security-gate', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, gate_status }) });
      const data = await res.json();
      if (data.success) fetchEntries();
      else alert(data.error);
    } catch (err) { alert('Error updating'); }
  };

  const getStatusBadge = (status) => {
    const colors = {
      arrived: 'bg-green-100 text-green-800',
      under_processing: 'bg-blue-100 text-blue-800',
      ready_to_exit: 'bg-yellow-100 text-yellow-800',
      exited: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status?.replace('_', ' ').toUpperCase()}</span>;
  };

  const formatTime = (t) => t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-';

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-cyan-700 to-cyan-500 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <FaShieldAlt className="text-2xl" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Security Gate - Entry / Exit</h1>
                    <p className="text-xs text-cyan-100 mt-0.5">Tanker entry & exit with photo capture</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setForm({ ...form, direction: 'entry' }); setShowModal(true); }}
                    className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transition flex items-center gap-2 text-sm shadow-md">
                    <FaSignInAlt /> New Entry
                  </button>
                  <button onClick={() => { setForm({ ...form, direction: 'exit' }); setShowModal(true); }}
                    className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-red-600 transition flex items-center gap-2 text-sm shadow-md">
                    <FaSignOutAlt /> New Exit
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Entries', value: entries.length, color: 'bg-cyan-100 text-cyan-600', icon: <FaTruck /> },
                { label: 'Inside Facility', value: entries.filter(e => ['arrived', 'under_processing'].includes(e.gate_status)).length, color: 'bg-green-100 text-green-600', icon: <FaSignInAlt /> },
                { label: 'Ready to Exit', value: entries.filter(e => e.gate_status === 'ready_to_exit').length, color: 'bg-yellow-100 text-yellow-600', icon: <FaSignOutAlt /> },
                { label: 'Exited', value: entries.filter(e => e.gate_status === 'exited').length, color: 'bg-gray-100 text-gray-600', icon: <FaShieldAlt /> },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border shadow-sm flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center text-base`}>{c.icon}</div>
                  <div>
                    <div className="text-xl font-bold text-gray-800">{c.value}</div>
                    <div className="text-[11px] text-gray-500 font-medium">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input placeholder="Search vehicle, driver, code..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-sm" />
              </div>
              <select value={filterDirection} onChange={e => setFilterDirection(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-sm min-w-[130px]">
                <option value="">All Directions</option>
                <option value="entry">Entry</option>
                <option value="exit">Exit</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-sm min-w-[140px]">
                <option value="">All Status</option>
                <option value="arrived">Arrived</option>
                <option value="under_processing">Processing</option>
                <option value="ready_to_exit">Ready to Exit</option>
                <option value="exited">Exited</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {loading ? (
                <div className="p-12 text-center"><FaSpinner className="animate-spin text-cyan-500 text-3xl mx-auto" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Code', 'Vehicle', 'Driver', 'Material', 'Qty', 'Direction', 'Entry Time', 'Exit Time', 'Status', 'Photo', 'Actions'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {entries.length > 0 ? entries.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-3 font-semibold text-cyan-600 whitespace-nowrap">{e.entry_code}</td>
                          <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{e.vehicle_number}</td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                            <div>{e.driver_name || '-'}</div>
                            {e.driver_phone && <div className="text-xs">{e.driver_phone}</div>}
                          </td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{e.material_name || e.material_type || '-'}</td>
                          <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{e.quantity > 0 ? `${parseFloat(e.quantity).toFixed(2)} ${e.unit}` : '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${e.direction === 'entry' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {e.direction === 'entry' ? '↓ IN' : '↑ OUT'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTime(e.entry_time)}</td>
                          <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTime(e.exit_time)}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{getStatusBadge(e.gate_status)}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {(e.entry_photo || e.exit_photo) ? (
                              <button onClick={() => { setViewEntry(e); setShowPhotoModal(true); }}
                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1">
                                <FaEye className="text-xs" /> View
                              </button>
                            ) : <span className="text-gray-400 text-xs">No photo</span>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex gap-1 flex-wrap">
                              {e.gate_status === 'arrived' && (
                                <button onClick={() => updateGateStatus(e.id, 'under_processing')}
                                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-600 transition">Processing</button>
                              )}
                              {e.gate_status === 'under_processing' && (
                                <button onClick={() => updateGateStatus(e.id, 'ready_to_exit')}
                                  className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-yellow-600 transition">Ready</button>
                              )}
                              {e.gate_status === 'ready_to_exit' && (
                                <button onClick={() => { setExitEntry(e); setShowExitModal(true); }}
                                  className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-600 transition">Exit + Photo</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={11} className="p-8 text-center text-gray-400">No gate entries found</td></tr>
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

      {/* Modal components remain similar but with Tailwind classes */}
      {/* Entry Modal, Exit Modal, View Photo Modal - keeping them concise */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); stopCamera(); } }}>
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{form.direction === 'entry' ? '🟢 Gate Entry' : '🔴 Gate Exit'}</h2>
            <div className="space-y-3">
              {/* Form fields similar to previous implementation with Tailwind */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })} placeholder="Vehicle Number *"
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <input value={form.tanker_code} onChange={e => setForm({ ...form, tanker_code: e.target.value })} placeholder="Tanker Code"
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })} placeholder="Driver Name"
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <input value={form.driver_phone} onChange={e => setForm({ ...form, driver_phone: e.target.value })} placeholder="Driver Phone"
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              {/* Camera Section */}
              <div className="bg-gray-50 rounded-lg p-3 border">
                <label className="text-sm font-semibold text-gray-700 block mb-2">📷 Photo</label>
                {cameraActive ? (
                  <div>
                    <video ref={videoRef} className="w-full rounded-lg max-h-60 object-cover" autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={captureImage} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"><FaCamera /> Capture</button>
                      <button onClick={stopCamera} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">Cancel</button>
                    </div>
                  </div>
                ) : capturedPhoto ? (
                  <div>
                    <img src={capturedPhoto} alt="Captured" className="w-full rounded-lg max-h-48 object-cover" />
                    <button onClick={() => setCapturedPhoto(null)} className="mt-2 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm">Remove</button>
                  </div>
                ) : (
                  <button onClick={() => startCamera('entry')} className="bg-cyan-500 text-white py-2 px-4 rounded-lg font-semibold text-sm flex items-center gap-2"><FaCamera /> Open Camera</button>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3 pt-3 border-t">
              <button onClick={() => { setShowModal(false); stopCamera(); }} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {showExitModal && exitEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) { setShowExitModal(false); stopCamera(); } }}>
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">🔴 Exit - Capture Photo</h2>
            <p className="text-sm text-gray-500 mb-4">Vehicle: {exitEntry.vehicle_number}</p>
            {cameraActive ? (
              <div>
                <video ref={videoRef} className="w-full rounded-lg max-h-64 object-cover" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2 mt-3">
                  <button onClick={captureImage} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><FaCamera /> Capture</button>
                  <button onClick={stopCamera} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">Cancel</button>
                </div>
              </div>
            ) : exitPhoto ? (
              <div>
                <img src={exitPhoto} alt="Exit" className="w-full rounded-lg max-h-48 object-cover" />
                <button onClick={() => setExitPhoto(null)} className="mt-2 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-sm">Retake</button>
              </div>
            ) : (
              <button onClick={() => startCamera('exit')} className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"><FaCamera /> Capture Exit Photo</button>
            )}
            <div className="flex justify-end gap-3 mt-5 pt-3 border-t">
              <button onClick={() => { setShowExitModal(false); stopCamera(); }} className="px-4 py-2 border rounded-lg text-gray-600">Cancel</button>
              <button onClick={handleExit} className="px-5 py-2 bg-red-500 text-white rounded-lg font-semibold">Confirm Exit</button>
            </div>
          </div>
        </div>
      )}

      {/* View Photo Modal */}
      {showPhotoModal && viewEntry && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowPhotoModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Photos - {viewEntry.entry_code}</h2>
            <div className={`grid ${viewEntry.entry_photo && viewEntry.exit_photo ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4`}>
              {viewEntry.entry_photo && (
                <div>
                  <h4 className="text-sm font-semibold text-green-600 mb-2">🟢 Entry Photo</h4>
                  <img src={viewEntry.entry_photo} alt="Entry" className="w-full rounded-lg border-2 border-green-200" />
                </div>
              )}
              {viewEntry.exit_photo && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2">🔴 Exit Photo</h4>
                  <img src={viewEntry.exit_photo} alt="Exit" className="w-full rounded-lg border-2 border-red-200" />
                </div>
              )}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowPhotoModal(false)} className="px-4 py-2 border rounded-lg text-gray-600">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <FaSpinner className="animate-spin text-cyan-500 text-4xl" />
    </div>
  );
}

export default function SecurityGatePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SecurityGateContent />
    </Suspense>
  );
}