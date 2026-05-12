"use client";

import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { 
  FaPlus, FaSearch, FaSpinner, FaTruck, FaShieldAlt, FaKey, FaEye, 
  FaBan, FaRedo, FaCamera, FaMapMarkerAlt, FaCheckCircle, FaClock, 
  FaTimesCircle, FaCog, FaSignOutAlt, FaUser, FaHistory, FaCheck, FaInfoCircle,
  FaChevronLeft, FaChevronRight, FaSync, FaQrcode, FaMobileAlt, FaExclamationTriangle, FaTimes
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function SecurityGateContent() {
  const router = useRouter();
  const { user } = useSession();
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [otpModal, setOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [entryPhoto, setEntryPhoto] = useState(null);
  const [locationData, setLocationData] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      
      const res = await fetch(`/api/manufacturing/security-gate?${params}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
      }
    } catch (error) {
      toast.error("Failed to sync data");
    }
  }, [search, filterStatus]);

  useEffect(() => {
    if (mounted) {
      fetchEntries();
    }
  }, [fetchEntries, mounted]);

  const handleExit = async (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    
    setSelectedEntry(entry);
    setShowExitModal(true);
  };

  const handleVehicleSearch = async () => {
    if (!vehicleSearch.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/manufacturing/security-gate?vehicle=${vehicleSearch}&all=true`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleEntryWithOTP = async (entry) => {
    setSelectedEntry(entry);
    setOtpModal(true);
    setOtpVerified(false);
  };

  const regenerateOTP = async () => {
    if (!selectedEntry) return;
    
    try {
      const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await fetch('/api/manufacturing/security-gate/regenerate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          newOTP: newOTP
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedEntry(prev => ({ ...prev, otp_code: newOTP }));
        toast.success("New OTP generated!");
      } else {
        toast.error("Failed to regenerate OTP");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const verifyOTP = async () => {
    if (!otpCode || !selectedEntry) return;
    
    try {
      const res = await fetch('/api/manufacturing/security-gate/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          otp: otpCode,
          type: 'entry'
        })
      });
      const data = await res.json();
      if (data.success) {
        console.log("OTP verification response:", data);
        setOtpVerified(true);
        toast.success(`OTP Verified! Status updated to: ${data.newStatus || 'In-Plant'}`);
        
        // Update the local entry status immediately
        setEntries(prev => prev.map(entry => 
          entry.id === selectedEntry.id 
            ? { ...entry, status: 'In-Plant', otp_verified: true }
            : entry
        ));
        
        // Also refresh search results if active
        if (vehicleSearch) {
          handleVehicleSearch();
        }
        
        setTimeout(() => {
          setOtpModal(false);
          setOtpCode('');
          fetchEntries(); // Final refresh to ensure sync
        }, 2000);
      } else {
        toast.error(data.error || "Invalid OTP");
      }
    } catch (error) {
      toast.error("Verification failed");
    }
  };

  const processExit = async () => {
    if (!otpCode || !selectedEntry) return;
    
    try {
      const res = await fetch('/api/manufacturing/security-gate/process-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          otp: otpCode
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Exit processed successfully!");
        setShowExitModal(false);
        setOtpCode('');
        fetchEntries();
      } else {
        toast.error(data.error || "Exit processing failed");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const capturePhoto = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Photo capture logic would go here
        toast.success("Camera ready for photo capture");
      } catch (error) {
        toast.error("Camera access denied");
      }
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationData({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast.success("Location captured");
        },
        (error) => {
          toast.error("Location access denied");
        }
      );
    }
  };

  const checkEntryStatus = async (id) => {
    try {
      const res = await fetch(`/api/manufacturing/security-gate/check-status?id=${id}`);
      const data = await res.json();
      if (data.success) {
        toast.success(`Current status: ${data.entry.status}`);
        console.log("Entry details:", data.entry);
      } else {
        toast.error("Failed to check status");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const filteredEntries = entries; // Server-side search handled via fetchEntries
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

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
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h1 className="text-xl font-bold text-gray-800">Security Gate</h1>
                  <p className="text-sm text-gray-500">Manage vehicle entries and exits</p>
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={fetchEntries} className="p-2 bg-white border rounded-lg hover:bg-gray-50">
                     <FaSync />
                  </button>
                  <Link href="/manufacturing/security-gate/create" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                     <FaPlus /> New Entry
                  </Link>
               </div>
            </div>

            {/* Vehicle Search Section */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
               <h2 className="text-lg font-semibold mb-3">Vehicle Search</h2>
               <div className="flex gap-3">
                  <div className="flex-1 relative">
                     <FaTruck className="absolute left-3 top-3 text-gray-400" />
                     <input 
                       placeholder="Enter vehicle number..." 
                       value={vehicleSearch} 
                       onChange={e => setVehicleSearch(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                       onKeyPress={(e) => e.key === 'Enter' && handleVehicleSearch()}
                       className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     />
                  </div>
                  <button 
                    onClick={handleVehicleSearch}
                    disabled={searchLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                     {searchLoading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                  </button>
               </div>

               {/* Search Results */}
               {searchResults.length > 0 && (
                  <div className="mt-4">
                     <h3 className="text-sm font-medium mb-2">Search Results</h3>
                     <div className="space-y-2">
                        {searchResults.map((result) => (
                           <div key={result.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <FaTruck className="text-blue-600" />
                                 <div>
                                    <div className="font-medium">{result.vehicle_number}</div>
                                    <div className="text-sm text-gray-500">{result.driver_name} • {result.status}</div>
                                 </div>
                              </div>
                              <div className="flex gap-2">
                                 {result.status === 'Pending' && (
                                    <button 
                                      onClick={() => handleEntryWithOTP(result)}
                                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                    >
                                       Allow Entry
                                    </button>
                                 )}
                                 {result.status === 'In-Plant' && (
                                    <button 
                                      onClick={() => handleExit(result.id)}
                                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                    >
                                       Process Exit
                                    </button>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
               <div className="flex gap-3">
                  <div className="flex-1 relative">
                     <FaSearch className="absolute left-3 top-3 text-gray-400" />
                     <input 
                       placeholder="Search entries..." 
                       value={search} 
                       onChange={e => setSearch(e.target.value)}
                       className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     />
                  </div>
                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                     <option value="">All Status</option>
                     <option value="Pending">Pending Entry</option>
                     <option value="In-Plant">Inside Plant</option>
                     <option value="Exited">Exited</option>
                  </select>
               </div>
            </div>

            {/* Entries Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full">
                     <thead className="bg-gray-50 border-b">
                        <tr>
                           <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                           <th className="px-4 py-3 text-left text-sm font-medium">Vehicle</th>
                           <th className="px-4 py-3 text-left text-sm font-medium">Cargo</th>
                           <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                           <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y">
                        {currentItems.length === 0 ? (
                           <tr>
                              <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
                                 <FaTruck className="text-4xl text-gray-300 mx-auto mb-2" />
                                 <p>No entries found</p>
                              </td>
                           </tr>
                        ) : currentItems.map((entry) => (
                           <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                 <div className="text-sm font-medium">#{entry?.id?.toString()?.padStart(5, '0') || '00000'}</div>
                                 <div className="text-xs text-gray-500">{entry?.entry_time ? new Date(entry.entry_time).toLocaleDateString() : 'N/A'}</div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                       <FaTruck size={12} />
                                    </div>
                                    <div>
                                       <div className="font-medium text-sm">{entry.vehicle_number}</div>
                                       <div className="text-xs text-gray-500">{entry.driver_name}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="text-sm">{entry.material_name || 'No Cargo'}</div>
                                 <div className="text-xs text-gray-500">{entry.quantity} {entry.unit} • {entry.purpose}</div>
                                 {entry.otp_code && (
                                    <div className="text-xs text-green-600 font-medium">
                                       OTP: {entry.otp_code}
                                    </div>
                                 )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    entry.status === 'In-Plant' 
                                    ? 'bg-green-100 text-green-700' 
                                    : entry.status === 'Pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-600'
                                 }`}>
                                    {entry.status === 'In-Plant' ? 'Inside Plant' : entry.status === 'Pending' ? 'Pending Entry' : 'Exited'}
                                 </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                 {entry.status === 'In-Plant' ? (
                                    <button 
                                      onClick={() => handleExit(entry.id)}
                                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                    >
                                       Process Exit
                                    </button>
                                 ) : entry.status === 'Pending' ? (
                                    <button 
                                      onClick={() => handleEntryWithOTP(entry)}
                                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                    >
                                       Allow Entry
                                    </button>
                                 ) : (
                                     <div className="text-xs text-gray-400">
                                        Exited {entry?.exit_time ? new Date(entry.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                     </div>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
               <div className="flex items-center justify-center gap-2 mt-6">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                     Previous
                  </button>
                  <div className="flex gap-1">
                     {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            currentPage === i + 1 ? 'bg-blue-600 text-white' : 'border'
                          }`}
                        >
                           {i + 1}
                        </button>
                     ))}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                     Next
                  </button>
               </div>
            )}
          </div>
        </main>
        <Footer />
      </div>

      {/* OTP Verification Modal */}
      {otpModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                       <FaKey size={20} />
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-slate-900">OTP Verification</h3>
                       <p className="text-xs text-slate-500">Vehicle: {selectedEntry.vehicle_number}</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setOtpModal(false)}
                   className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                 >
                    <FaTimes size={14} />
                 </button>
              </div>

              {!otpVerified ? (
                <>
                  <div className="mb-6">
                     {selectedEntry.otp_code && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-center">
                           <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Testing OTP</p>
                           <p className="text-2xl font-black text-blue-800">{selectedEntry.otp_code}</p>
                        </div>
                     )}
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Enter OTP Code</label>
                     <input 
                       type="text" 
                       placeholder="6-digit OTP"
                       value={otpCode}
                       onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                       className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-xl font-bold outline-none focus:bg-white focus:border-blue-400 transition-all"
                       maxLength={6}
                     />
                     <p className="text-xs text-slate-500 mt-2 text-center">
                        OTP sent to driver: {selectedEntry.driver_phone || 'N/A'}
                     </p>
                  </div>

                  <div className="flex gap-3">
                     <button 
                       onClick={regenerateOTP}
                       className="px-6 py-4 bg-amber-500 text-white rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg hover:bg-amber-600 active:scale-95 transition-all"
                     >
                        <FaSync className="inline mr-2" />
                        New OTP
                     </button>
                     <button 
                       onClick={verifyOTP}
                       disabled={otpCode.length !== 6}
                       className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <FaKey className="inline mr-2" />
                        Verify OTP
                     </button>
                     <button 
                       onClick={() => setOtpModal(false)}
                       className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-slate-200 active:scale-95 transition-all"
                     >
                        Cancel
                     </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                   <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaCheckCircle size={32} />
                   </div>
                   <h4 className="text-lg font-bold text-slate-900 mb-2">OTP Verified!</h4>
                   <p className="text-sm text-slate-600">Vehicle {selectedEntry.vehicle_number} can now enter the premises.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Exit Processing Modal */}
      {showExitModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                       <FaSignOutAlt size={20} />
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-slate-900">Process Exit</h3>
                       <p className="text-xs text-slate-500">Vehicle: {selectedEntry.vehicle_number}</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setShowExitModal(false)}
                   className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                 >
                    <FaTimes size={14} />
                 </button>
              </div>

              <div className="mb-6">
                 <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Driver</span>
                          <p className="font-bold text-slate-800">{selectedEntry.driver_name}</p>
                       </div>
                       <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entry Time</span>
                          <p className="font-bold text-slate-800">{selectedEntry.entry_time ? new Date(selectedEntry.entry_time).toLocaleString() : 'N/A'}</p>
                       </div>
                       <div className="col-span-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Material</span>
                          <p className="font-bold text-slate-800">{selectedEntry.material_name || 'N/A'} ({selectedEntry.quantity || 0} {selectedEntry.unit || 'KG'})</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-3 mb-4">
                    <button 
                      onClick={capturePhoto}
                      className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       <FaCamera size={14} /> Capture Photo
                    </button>
                    <button 
                      onClick={getLocation}
                      className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       <FaMapMarkerAlt size={14} /> Get Location
                    </button>
                 </div>

                 <div>
                    {selectedEntry.otp_code && (
                       <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4 text-center">
                          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Testing Exit OTP</p>
                          <p className="text-2xl font-black text-rose-800">{selectedEntry.otp_code}</p>
                       </div>
                    )}
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Exit OTP Code</label>
                    <input 
                      type="text" 
                      placeholder="6-digit OTP"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-xl font-bold outline-none focus:bg-white focus:border-rose-400 transition-all"
                      maxLength={6}
                    />
                 </div>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={processExit}
                   disabled={otpCode.length !== 6}
                   className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <FaSignOutAlt className="inline mr-2" />
                    Process Exit
                 </button>
                 <button 
                   onClick={() => setShowExitModal(false)}
                   className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-slate-200 active:scale-95 transition-all"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default function SecurityGatePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <SecurityGateContent />
    </Suspense>
  );
}
