"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft, FaPlus, FaTrash, FaSearch, FaWarehouse, FaClipboardList,
  FaExchangeAlt, FaHistory, FaFlask, FaBoxOpen, FaShieldAlt, FaCog,
  FaVial, FaCheckCircle, FaSpinner, FaTools
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
  const [newTankUnit, setNewTankUnit] = useState('KG');
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
        body: JSON.stringify({ name: newTankName, unit: newTankUnit }),
      });
      const data = await response.json();
      if (response.ok) { 
        toast.success('Tank created successfully!'); 
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
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-10 relative">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full -mr-48 -mt-48 blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50 rounded-full -ml-48 -mb-48 blur-3xl opacity-50"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
              <div>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-widest mb-2">
                  <FaTools className="animate-pulse" />
                  <span>Manufacturing Center</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  Tank Master <span className="text-blue-600">Hub</span>
                </h1>
                <p className="text-slate-500 mt-3 max-w-lg font-medium leading-relaxed">
                  Centrally manage manufacturing tanks, stock levels, and production workflows with automated lab verification.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-100 flex items-center gap-4 px-6 border border-slate-50">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Active Tanks</p>
                      <p className="text-2xl font-black text-slate-900">{tanks.length}</p>
                   </div>
                   <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <FaWarehouse size={20} />
                   </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}
                  className="group relative bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-200 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 rounded-full -mr-12 -mt-12 transition-opacity duration-500`}></div>
                  
                  <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-500`}>
                    {React.cloneElement(item.icon, { size: 24 })}
                  </div>
                  
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                    {item.label}
                  </h3>
                  
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Manage</span>
                    <div className="h-[2px] flex-1 bg-slate-100 group-hover:bg-blue-100 transition-colors"></div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
              {/* Left Column: Create Tank */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 p-8 sticky top-4">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                      <FaPlus />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">New Tank</h2>
                  </div>
                  
                  <form onSubmit={handleAddTank} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tank Name / Identifier</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Storage Tank A1"
                        className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                        value={newTankName}
                        onChange={(e) => setNewTankName(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Stock Tracking Unit</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['KG', 'Litre', 'Both'].map(unit => (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => setNewTankUnit(unit)}
                            className={`py-3 rounded-xl text-xs font-black transition-all ${
                              newTankUnit === unit 
                              ? 'bg-slate-900 text-white shadow-xl scale-105' 
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-3 text-blue-800 mb-2">
                        <FaVial className="text-blue-500" />
                        <span className="text-xs font-black uppercase tracking-widest">Lab Integration</span>
                      </div>
                      <p className="text-[10px] font-medium text-blue-600/80 leading-relaxed">
                        Lab will automatically assign branch codes (RM, FG, OTH) during production entry for this tank.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                      <span>Initialize Tank</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Tank List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Existing Tanks</h2>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Live Asset Management</p>
                    </div>
                    
                    <div className="relative group">
                      <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Quick search tanks..." 
                        className="pl-12 pr-6 py-3.5 rounded-2xl border border-slate-50 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all text-sm font-bold w-full sm:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full text-left min-w-[500px]">
                      <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <tr>
                           <th className="px-8 py-5">#</th>
                           <th className="px-8 py-5">Tank Identification</th>
                           <th className="px-8 py-5">Tracking Unit</th>
                           <th className="px-8 py-5">Onboarded On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr>
                            <td colSpan="4" className="px-8 py-20 text-center">
                              <FaSpinner className="animate-spin text-blue-600 mx-auto text-3xl mb-4" />
                              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Assets...</p>
                            </td>
                          </tr>
                        ) : filteredTanks.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-8 py-20 text-center">
                              <FaWarehouse className="text-slate-100 mx-auto text-6xl mb-4" />
                              <p className="font-black text-slate-300 uppercase tracking-widest text-xs">No active tanks detected</p>
                            </td>
                          </tr>
                        ) : filteredTanks.map((tank, index) => (
                          <tr key={tank.id} className="group hover:bg-blue-50/30 transition-colors">
                            <td className="px-8 py-6 text-slate-300 font-black text-xs">{index + 1}</td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 flex items-center justify-center font-black transition-colors shadow-inner">
                                  {tank.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="font-black text-slate-800 tracking-tight group-hover:text-blue-700 transition-colors">
                                  {tank.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                               <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-slate-200">
                                  {tank.unit || 'KG'}
                               </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                 <FaHistory className="text-[10px]" />
                                 {new Date(tank.created_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                 })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="bg-slate-50 p-6 flex items-center justify-center border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                       <FaShieldAlt /> Secured Asset Management System
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
           <Footer />
        </div>
      </div>
    </div>
  );
}

export default function TankMasterPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <TankMasterContent />
    </Suspense>
  );
}
