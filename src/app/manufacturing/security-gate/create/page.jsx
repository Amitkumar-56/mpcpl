"use client";

import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { 
  FaArrowLeft, FaShieldAlt, FaTruck, FaUser, FaPhone, FaInfoCircle, 
  FaClipboardList, FaCheckCircle, FaSpinner, FaBox, FaMapMarkerAlt, FaFileAlt
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function CreateGateEntryContent() {
  const router = useRouter();
  const { user } = useSession();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    purpose: '',
    material_type: '',
    material_name: '',
    quantity: '',
    unit: 'KG',
    remarks: ''
  });

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: name === 'vehicle_number' ? value.toUpperCase().replace(/\s+/g, '') : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle_number || !form.driver_name) {
      return toast.error("Vehicle No. and Driver Name required");
    }

    setLoading(true);
    try {
      const res = await fetch('/api/manufacturing/security-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, created_by: user?.id, created_by_name: user?.name }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Entry Created Successfully!");
        setTimeout(() => router.push('/manufacturing/security-gate'), 1500);
      } else {
        toast.error(data.error || "Failed to create entry");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-8 pb-48">
          <div className="max-w-2xl mx-auto min-h-full flex flex-col">
             {/* Back Button & Title */}
             <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                   <FaArrowLeft size={14} />
                </button>
                <div>
                   <h1 className="text-xl font-bold">New Gate Entry</h1>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Registration</p>
                </div>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6 pb-10">
                {/* Vehicle & Driver Section */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                      <FaTruck className="text-blue-600" />
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Basic Information</h2>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Vehicle Number</label>
                        <input 
                          name="vehicle_number" placeholder="MH12AB1234" value={form.vehicle_number} onChange={handleChange} required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Driver Name</label>
                        <input 
                          name="driver_name" placeholder="John Doe" value={form.driver_name} onChange={handleChange} required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Driver Phone</label>
                        <input 
                          name="driver_phone" placeholder="9876543210" value={form.driver_phone} onChange={handleChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Purpose of Entry</label>
                        <select name="purpose" value={form.purpose} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none appearance-none focus:bg-white focus:border-blue-400">
                           <option value="">-- Select Purpose --</option>
                           <option value="Raw Material Delivery">Raw Material Delivery</option>
                           <option value="Finished Goods Dispatch">Finished Goods Dispatch</option>
                           <option value="Maintenance / Service">Maintenance / Service</option>
                           <option value="Others">Others</option>
                        </select>
                      </div>
                   </div>
                </div>

                {/* Material Section */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                      <FaBox className="text-emerald-600" />
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cargo & Logistics</h2>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Material Description</label>
                        <input 
                          name="material_name" placeholder="Item name, chemical type, etc." value={form.material_name} onChange={handleChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Quantity</label>
                        <input 
                          type="number" name="quantity" placeholder="0.00" value={form.quantity} onChange={handleChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Unit</label>
                        <select name="unit" value={form.unit} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none appearance-none focus:bg-white focus:border-blue-400">
                           <option value="KG">KG</option>
                           <option value="LITRE">LITRE</option>
                           <option value="TON">TON</option>
                           <option value="NOS">NOS</option>
                        </select>
                      </div>
                   </div>
                </div>

                {/* Remarks */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Additional Remarks</label>
                   <textarea 
                     name="remarks" rows="3" placeholder="Any additional notes..." value={form.remarks} onChange={handleChange}
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
                   ></textarea>
                </div>

                {/* Final Submit Button */}
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 mb-12"
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Authorize & Create Entry</>}
                  </button>
                </div>
             </form>
          </div>
        </main>

        <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#F8FAFF]">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function CreateGateEntry() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <CreateGateEntryContent />
    </Suspense>
  );
}
