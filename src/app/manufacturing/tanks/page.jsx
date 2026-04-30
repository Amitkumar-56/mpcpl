'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { 
  FaPlus, FaEdit, FaTrash, FaSearch, FaSync, 
  FaWarehouse, FaArrowRight, FaSpinner, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TankMasterContent() {
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentTank, setCurrentTank] = useState({ name: '', unit: 'KG' });
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => { setMounted(true); }, []);

  const fetchTanks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/tanks');
      const data = await response.json();
      setTanks(data);
    } catch (error) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (mounted) fetchTanks(); }, [mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentTank.name) return toast.error('Name is required');

    try {
      setIsSubmitting(true);
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch('/api/manufacturing/tanks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTank),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(isEditing ? 'Updated' : 'Created');
        setShowModal(false);
        setCurrentTank({ name: '', unit: 'KG' });
        setIsEditing(false);
        fetchTanks();
      } else toast.error(data.error || 'Operation failed');
    } catch (error) {
      toast.error('Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      const response = await fetch(`/api/manufacturing/tanks?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success('Deleted');
        fetchTanks();
      } else toast.error(data.error || 'Failed');
    } catch (error) {
      toast.error('Error');
    }
  };

  const filteredTanks = tanks.filter(tank => 
    tank.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTanks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTanks.length / itemsPerPage);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-48">
          <div className="max-w-5xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight text-center sm:text-left">Tank Master</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">Asset Registry Control</p>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => { setIsEditing(false); setCurrentTank({ name: '', unit: 'KG' }); setShowModal(true); }} className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 flex items-center gap-2 active:scale-95 transition-all">
                     <FaPlus /> Add New Asset
                  </button>
                  <button onClick={fetchTanks} className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 shadow-sm transition-all">
                     <FaSync size={12} className={loading ? 'animate-spin' : ''} />
                  </button>
               </div>
            </div>

            {/* Search Hub */}
            <div className="mb-8 relative max-w-md mx-auto sm:mx-0">
               <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
               <input 
                 placeholder="Search registry..." 
                 value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
               />
            </div>

            {/* High-Density List */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-8">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Name</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Base Unit</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                           Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="3" className="px-8 py-8"></td></tr>)
                        ) : currentItems.length === 0 ? (
                           <tr><td colSpan="3" className="px-8 py-20 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No assets registered</td></tr>
                        ) : currentItems.map((tank) => (
                           <tr key={tank.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-inner">
                                       <FaWarehouse size={14} />
                                    </div>
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{tank.name}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">{tank.unit}</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => { setIsEditing(true); setCurrentTank(tank); setShowModal(true); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                       <FaEdit size={12} />
                                    </button>
                                    <button onClick={() => handleDelete(tank.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                                       <FaTrash size={12} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
               <div className="flex items-center justify-center gap-2 pb-10">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"><FaChevronLeft size={10} /></button>
                  <div className="flex gap-1">
                     {Array.from({ length: totalPages }).map((_, i) => (
                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'}`}>{i + 1}</button>
                     ))}
                  </div>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition-all"><FaChevronRight size={10} /></button>
               </div>
            )}
          </div>
        </main>
        
        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
           <Footer />
        </div>
      </div>

      {/* Modal - Modern & Simple */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-white">
              <h2 className="text-xl font-black text-slate-900 mb-6">{isEditing ? 'Refine Asset' : 'Register Asset'}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Asset Nomenclature</label>
                    <input 
                      value={currentTank.name} onChange={(e) => setCurrentTank({...currentTank, name: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm focus:ring-4 focus:ring-blue-50 transition-all"
                      placeholder="e.g. Tank Alpha"
                    />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Primary Metric</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button type="button" onClick={() => setCurrentTank({...currentTank, unit: 'KG'})} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${currentTank.unit === 'KG' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>KG</button>
                       <button type="button" onClick={() => setCurrentTank({...currentTank, unit: 'LTR'})} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${currentTank.unit === 'LTR' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>Litre</button>
                    </div>
                 </div>
                 <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-[2] bg-slate-900 text-white py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
                       {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaArrowRight />} {isEditing ? 'Save Changes' : 'Confirm Registry'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

export default function TankMasterPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-slate-900 text-4xl mx-auto" /></div>}>
      <TankMasterContent />
    </Suspense>
  );
}
