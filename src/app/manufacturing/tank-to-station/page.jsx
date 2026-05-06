'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaWarehouse, FaGasPump, FaSync, FaSpinner, FaCheckCircle, FaArrowRight, FaBoxOpen, 
  FaInfoCircle, FaHistory, FaArrowDown, FaCube, FaBalanceScale
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TankToStationContent() {
  const [mounted, setMounted] = useState(false);
  const [tankStocks, setTankStocks] = useState([]);
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selection state
  const [selectedTankId, setSelectedTankId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [quantityLitre, setQuantityLitre] = useState('');
  const [remarks, setRemarks] = useState('');

  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/tank-to-station');
      const data = await response.json();
      if (data.success) {
        setTankStocks(data.tankStocks);
        setStations(data.stations);
        setProducts(data.products);
        setRecentTransfers(data.recentTransfers || []);
      } else {
        toast.error('Failed to fetch data: ' + data.error);
      }
    } catch (error) {
      toast.error('Sync error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    setMounted(true);
    fetchData(); 
  }, [fetchData]);

  const selectedTank = tankStocks.find(t => t.tank_id.toString() === selectedTankId);
  const selectedStation = stations.find(s => s.id.toString() === selectedStationId);
  const selectedProduct = products.find(p => p.id.toString() === selectedProductId);

  // Preview calculations
  const afterKg = selectedTank ? (parseFloat(selectedTank.kg_stock) - (parseFloat(quantityKg) || 0)).toFixed(2) : 0;
  const afterLitre = selectedTank ? (parseFloat(selectedTank.litre_stock) - (parseFloat(quantityLitre) || 0)).toFixed(2) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTankId || !selectedStationId || !selectedProductId || (!quantityKg && !quantityLitre)) {
      return toast.error('Please fill in all required fields');
    }

    if (selectedTank) {
      if (quantityKg && parseFloat(quantityKg) > parseFloat(selectedTank.kg_stock)) {
        return toast.error('Quantity exceeds available KG stock');
      }
      if (quantityLitre && parseFloat(quantityLitre) > parseFloat(selectedTank.litre_stock)) {
        return toast.error('Quantity exceeds available Litre stock');
      }
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/tank-to-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tank_id: selectedTankId,
          station_id: selectedStationId,
          product_id: selectedProductId,
          quantity_kg: quantityKg,
          quantity_litre: quantityLitre,
          remarks
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Stock Transferred Successfully');
        setSelectedTankId('');
        setSelectedStationId('');
        setSelectedProductId('');
        setQuantityKg('');
        setQuantityLitre('');
        setRemarks('');
        fetchData(); 
      } else {
        toast.error('Error: ' + data.error);
      }
    } catch (error) {
      toast.error('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F0F4F8] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Manufacturing" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-10">
            <div className="max-w-6xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    <span className="bg-blue-600 w-2 h-10 rounded-full"></span>
                    Inventory Logistics
                  </h1>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-5">
                    Manufacturing Tank → Filling Station Transfer
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={fetchData} 
                    className="bg-white hover:bg-slate-50 text-slate-600 p-4 rounded-2xl shadow-xl shadow-slate-200/50 transition-all active:scale-95 border border-white"
                  >
                    <FaSync className={loading ? 'animate-spin' : ''} />
                  </button>
                  <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl shadow-slate-300 flex items-center gap-3 border border-slate-800">
                    <FaBoxOpen className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Active Operations</span>
                  </div>
                </div>
              </div>

              {loading && !tankStocks.length ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 animate-pulse"></div>
                    <FaSpinner className="text-6xl text-blue-600 animate-spin relative z-10" />
                  </div>
                  <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em] mt-8">Syncing Warehouse Data...</p>
                </div>
              ) : (
                <div className="space-y-10">
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Source & Destination Column */}
                    <div className="lg:col-span-8 space-y-8">
                      {/* Source Section */}
                      <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-white p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                          <FaWarehouse size={200} />
                        </div>
                        
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-blue-200">
                            <FaWarehouse className="text-white text-xl" />
                          </div>
                          <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Source Repository</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Select Tank & Product</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Manufacturing Tank</label>
                            <select 
                              required 
                              value={selectedTankId} 
                              onChange={(e) => setSelectedTankId(e.target.value)}
                              className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-sm outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                              <option value="">-- Choose Source Tank --</option>
                              {tankStocks.map(tank => (
                                <option key={tank.tank_id} value={tank.tank_id}>
                                  {tank.tank_name} ({tank.pname})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Availability</label>
                            {selectedTank ? (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                  <p className="text-[8px] font-black text-blue-400 uppercase mb-1">KG Stock</p>
                                  <p className="text-lg font-black text-blue-900">{selectedTank.kg_stock}</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                  <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">LTR Stock</p>
                                  <p className="text-lg font-black text-emerald-900">{selectedTank.litre_stock}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
                                <p className="text-[9px] font-black text-slate-300 uppercase">Awaiting Selection</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Destination Section */}
                      <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-white p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity text-emerald-600">
                          <FaGasPump size={180} />
                        </div>

                        <div className="flex items-center gap-4 mb-8 relative z-10">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-emerald-200">
                            <FaGasPump className="text-white text-xl" />
                          </div>
                          <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Retail Destination</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Station & Inventory Mapping</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filling Station</label>
                            <select 
                              required 
                              value={selectedStationId} 
                              onChange={(e) => setSelectedStationId(e.target.value)}
                              className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                              <option value="">-- Choose Target Station --</option>
                              {stations.map(station => (
                                <option key={station.id} value={station.id}>{station.station_name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Product Category</label>
                            <select 
                              required 
                              value={selectedProductId} 
                              onChange={(e) => setSelectedProductId(e.target.value)}
                              className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-sm outline-none focus:border-purple-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                              <option value="">-- Choose Product Type --</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.pname} {product.codes ? `(${product.codes})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* Right Column: Quantity & Action */}
                  <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-black rounded-[3rem] shadow-2xl p-10 text-white relative overflow-hidden h-full flex flex-col border border-white/5">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[100px]"></div>
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 blur-[100px]"></div>
                      
                      <div className="flex items-center gap-4 mb-10 relative z-10">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                          <FaArrowRight className="text-indigo-400 text-lg" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-indigo-100">Execution Panel</h2>
                      </div>

                      <div className="space-y-8 flex-1 relative z-10">
                        <div>
                          <label className="text-[9px] font-black text-indigo-300/50 uppercase tracking-[0.2em] mb-4 block">Transfer Quantities</label>
                          <div className="space-y-4">
                            <div className="relative group">
                              <input 
                                type="number" step="0.01" placeholder="Quantity in KG" value={quantityKg}
                                onChange={(e) => setQuantityKg(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-500 text-white"
                              />
                              <FaBalanceScale className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                            <div className="relative group">
                              <input 
                                type="number" step="0.01" placeholder="Quantity in LTR" value={quantityLitre}
                                onChange={(e) => setQuantityLitre(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-sm font-black outline-none focus:border-emerald-500 focus:bg-white/10 transition-all placeholder:text-slate-500 text-white"
                              />
                              <FaCube className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-400 transition-colors" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4 backdrop-blur-sm">
                          <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                            <FaHistory className="text-indigo-400" /> Transfer Simulation
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">KG Remainder</span>
                              <span className={`text-sm font-black ${afterKg < 0 ? 'text-rose-500' : 'text-indigo-400'}`}>{afterKg}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">LTR Remainder</span>
                              <span className={`text-sm font-black ${afterLitre < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>{afterLitre}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-indigo-300/50 uppercase tracking-widest ml-1">Process Remarks</label>
                          <textarea 
                            value={remarks} onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add operation logs..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-5 text-sm font-bold h-28 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-500 text-white resize-none"
                          />
                        </div>

                        <button 
                          type="submit" disabled={isSubmitting || loading}
                          className="w-full bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-900/50 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 disabled:active:scale-100 group border border-indigo-400/20"
                        >
                          {isSubmitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle className="group-hover:scale-125 transition-transform" /> Authorize & Move</>}
                        </button>
                      </div>
                    </div>
                  </div>
                  </form>

                  {/* History Section */}
                  <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-white p-10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-[1.2rem] flex items-center justify-center">
                          <FaHistory className="text-slate-600 text-lg" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Recent Logistics Logs</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Audit Trail of Tank Transfers</p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-50">
                            <th className="pb-5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                            <th className="pb-5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Source Tank</th>
                            <th className="pb-5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                            <th className="pb-5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                            <th className="pb-5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {recentTransfers.length > 0 ? recentTransfers.map((log) => (
                            <tr key={log.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-5 px-4">
                                <p className="text-xs font-black text-slate-800">{new Date(log.created_at).toLocaleDateString()}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(log.created_at).toLocaleTimeString()}</p>
                              </td>
                              <td className="py-5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-[10px]">T</div>
                                  <span className="text-xs font-black text-slate-700">{log.tank_name}</span>
                                </div>
                              </td>
                              <td className="py-5 px-4">
                                <div className="flex flex-col gap-1">
                                  {parseFloat(log.kg_qty) > 0 && <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black w-fit">{log.kg_qty} KG</span>}
                                  {parseFloat(log.litre_qty) > 0 && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black w-fit">{log.litre_qty} LTR</span>}
                                </div>
                              </td>
                              <td className="py-5 px-4">
                                <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic line-clamp-1">{log.remarks}</p>
                              </td>
                              <td className="py-5 px-4 text-right">
                                <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest">Completed</span>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="5" className="py-20 text-center">
                                <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.2em]">No Recent Activity Found</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F0F4F8]">
          <Footer />
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function TankToStationPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <TankToStationContent />
    </Suspense>
  );
}
