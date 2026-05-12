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

             <form onSubmit={handleSubmit} className="space-y-4 pb-10">
                {/* Single Simple Form */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                   <h2 className="text-lg font-semibold text-gray-800 mb-6">Gate Entry Form</h2>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number *</label>
                        <input 
                          name="vehicle_number" placeholder="MH12AB1234" value={form.vehicle_number} onChange={handleChange} required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Driver Name *</label>
                        <input 
                          name="driver_name" placeholder="Enter driver name" value={form.driver_name} onChange={handleChange} required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Driver Phone</label>
                        <input 
                          name="driver_phone" placeholder="9876543210" value={form.driver_phone} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                        <select name="purpose" value={form.purpose} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                           <option value="">Select purpose</option>
                           <option value="Raw Material Delivery">Raw Material Delivery</option>
                           <option value="Finished Goods Dispatch">Finished Goods Dispatch</option>
                           <option value="Maintenance">Maintenance</option>
                           <option value="Others">Others</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Material Description</label>
                        <input 
                          name="material_name" placeholder="Enter material name" value={form.material_name} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input 
                          type="number" name="quantity" placeholder="0.00" value={form.quantity} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                        <select name="unit" value={form.unit} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                           <option value="KG">KG</option>
                           <option value="LITRE">LITRE</option>
                           <option value="TON">TON</option>
                           <option value="NOS">PCS</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                        <textarea 
                          name="remarks" rows="3" placeholder="Enter additional notes..." value={form.remarks} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        ></textarea>
                      </div>
                   </div>

                   <div className="mt-6 pt-6 border-t border-gray-200">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Create Entry</>}
                      </button>
                   </div>
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
