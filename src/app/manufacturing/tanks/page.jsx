"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft, FaPlus, FaSearch, FaWarehouse, FaClipboardList,
  FaExchangeAlt, FaHistory, FaFlask, FaBoxOpen, FaShieldAlt, FaCog,
  FaVial, FaCheckCircle, FaSpinner, FaTools, FaGasPump, FaEdit
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TankMasterContent() {
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTankName, setNewTankName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const fetchTanks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/tanks');
      if (response.ok) {
        const data = await response.json();
        setTanks(data);
      } else {
        toast.error('Failed to fetch tanks');
      }
    } catch (error) {
      console.error('Error fetching tanks:', error);
      toast.error('An error occurred while fetching tanks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchTanks();
  }, [fetchTanks]);

  const handleAddTank = async (e) => {
    e.preventDefault();
    if (!newTankName.trim()) { toast.error('Please enter a tank name'); return; }
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/tanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newTankName
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Tank initialized successfully!');
        setNewTankName('');
        fetchTanks();
      } else {
        toast.error(data.error || 'Failed to create tank');
      }
    } catch (error) {
      toast.error('Error creating tank');
    } finally { setIsSubmitting(false); }
  };

  const filteredTanks = (tanks || []).filter(t =>
    t?.name?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  const navItems = [
    { href: '/manufacturing/all-tank-stock', label: 'All Stock', icon: <FaWarehouse />, color: 'from-blue-600 to-indigo-600' },
    { href: '/manufacturing/add-tank-stock', label: 'Add Stock', icon: <FaPlus />, color: 'from-emerald-500 to-teal-600' },
    { href: '/manufacturing/tank-stock-requests', label: 'Stock Requests', icon: <FaClipboardList />, color: 'from-violet-500 to-purple-600' },
    { href: '/manufacturing/production', label: 'Production', icon: <FaFlask />, color: 'from-rose-500 to-pink-600' },
    { href: '/manufacturing/production-history', label: 'Production Log', icon: <FaBoxOpen />, color: 'from-slate-600 to-slate-800' },
    { href: '/manufacturing/tank-transfer', label: 'Internal Transfer', icon: <FaExchangeAlt />, color: 'from-orange-500 to-amber-600' },
    { href: '/manufacturing/tank-transfer-history', label: 'Transfer Log', icon: <FaHistory />, color: 'from-cyan-500 to-blue-600' },
    { href: '/manufacturing/security-gate', label: 'Security Gate', icon: <FaShieldAlt />, color: 'from-slate-800 to-black' },
  ];


  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-6 relative">
          {/* Background Blurs */}
          <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
          <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-6">
              <div className="animate-in fade-in slide-in-from-left duration-700">
                <div className="flex items-center gap-3 text-blue-600 font-bold text-[10px] uppercase tracking-[0.3em] mb-2">
                  <div className="w-6 h-[2px] bg-blue-600"></div>
                  <span>Asset Control Center</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Tank Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Hub</span>
                </h1>
                <p className="text-slate-500 mt-2 max-w-xl text-sm font-medium leading-relaxed">
                  Enterprise-grade tank management system. Initialize and track your manufacturing storage assets.
                </p>
              </div>

              <div className="flex gap-4 animate-in fade-in slide-in-from-right duration-700">
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-xl shadow-slate-200/50 flex items-center gap-4 border border-white/20">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <FaWarehouse size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Active Assets</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">{tanks.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
              {navItems.map((item, idx) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className="group flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm p-4 rounded-3xl border border-white hover:bg-white hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-500 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom duration-500"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-white shadow-lg mb-3 group-hover:scale-110 transition-transform`}>
                    {React.cloneElement(item.icon, { size: 18 })}
                  </div>
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-tighter text-center">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
              {/* Creation Form */}
              <div className="lg:col-span-5 lg:sticky lg:top-10 h-fit">
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-100 transition-colors"></div>
                  
                  <div className="flex items-center gap-4 mb-10 relative">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <FaPlus />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Asset</h2>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Registration Module</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddTank} className="space-y-8 relative">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Tank Identifier</label>
                      <div className="relative group/input">
                        <FaGasPump className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="e.g. Storage Tank ALPHA-01"
                          className="w-full pl-14 pr-6 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                          value={newTankName}
                          onChange={(e) => setNewTankName(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>


                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group/btn w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <FaCheckCircle className="group-hover/btn:scale-125 transition-transform" />
                          <span>Initialize Tank Asset</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Tank List Table */}
              <div className="lg:col-span-7">
                <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Inventory</h2>
                      <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        Live Asset Synchronization
                      </div>
                    </div>

                    <div className="relative group/search flex-1 max-w-sm">
                      <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search by name or category..."
                        className="w-full pl-14 pr-6 py-4 rounded-[1.5rem] border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto no-scrollbar px-6 pb-6">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-6 w-2/3">Tank Identity</th>
                          <th className="px-6 py-6 text-right w-1/3">Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr>
                            <td colSpan="2" className="px-6 py-12 text-center">
                              <div className="relative w-12 h-12 mx-auto mb-4">
                                <div className="absolute inset-0 border-2 border-blue-50 rounded-full"></div>
                                <div className="absolute inset-0 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                              </div>
                              <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Syncing Assets...</p>
                            </td>
                          </tr>
                        ) : filteredTanks.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-10 py-32 text-center">
                              <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-100 shadow-inner">
                                <FaWarehouse size={40} />
                              </div>
                              <p className="font-black text-slate-300 uppercase tracking-[0.3em] text-xs">No active assets found</p>
                            </td>
                          </tr>
                        ) : filteredTanks.map((tank) => (
                          <tr key={tank.id} className="group hover:bg-blue-50/40 transition-all duration-300">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white flex items-center justify-center font-black text-lg transition-all duration-500 shadow-inner group-hover:shadow-lg group-hover:-rotate-3">
                                  {tank.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-black text-slate-900 text-sm tracking-tight group-hover:text-blue-700 transition-colors mb-0.5">
                                    {tank.name}
                                  </div>
                                  <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-blue-400">ID: TNK-{tank.id.toString().padStart(3, '0')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end gap-2">
                                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                  <FaHistory size={8} />
                                  {new Date(tank.created_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform">
                                  <button className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                    <FaEdit size={12} />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50/50 p-6 flex items-center justify-center border-t border-slate-100/50 backdrop-blur-md">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                      <FaShieldAlt className="text-blue-500 animate-pulse" /> Protected Asset Intelligence System
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/60 backdrop-blur-lg border-t border-white/20">
          <Footer />
        </div>
      </div>
      
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function TankMasterPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    }>
      <TankMasterContent />
    </Suspense>
  );
}
