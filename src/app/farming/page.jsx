'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPaw, FaDrumstickBite, FaFish, FaLeaf, FaArrowDown, FaArrowUp, FaChartBar, FaBoxOpen, FaPlus, FaCloudSun, FaCheckCircle, FaExclamationTriangle, FaUserMd, FaStethoscope, FaFileMedical, FaThermometerHalf } from 'react-icons/fa';
import { GiCow, GiGoat, GiChicken, GiHoneypot, GiFishingNet } from 'react-icons/gi';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

const ANIMAL_TYPES = [
  { key: 'cow', label: 'Cow', icon: '🐄', color: '#8B5CF6', bg: '#EDE9FE' },
  { key: 'goat', label: 'Goat', icon: '🐐', color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'chicken', label: 'Chicken', icon: '🐔', color: '#EF4444', bg: '#FEE2E2' },
  { key: 'fish', label: 'Fish', icon: '🐟', color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'honey', label: 'Honey', icon: '🍯', color: '#D97706', bg: '#FDE68A' },
];

function FarmingDashboardContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/farming?view=dashboard');
      if (!res.ok) throw new Error('Dashboard fetch failed');
      const data = await res.json();
      if (data.success) setDashData(data.data);
      else toast.error(data.error || 'Failed to load dashboard');
    } catch (e) {
      console.error(e);
      toast.error('Network error - Dashboard');
    } finally { setLoading(false); }
  };

  useEffect(() => { setMounted(true); fetchDashboard(); }, []);
  if (!mounted) return null;

  const getCount = (type) => {
    if (!dashData?.animalCounts) return { total: 0, active: 0 };
    const c = dashData.animalCounts.find(a => a.type === type);
    return c || { total: 0, active: 0, sold: 0, deceased: 0 };
  };

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">🌾 Farming Dashboard</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete Farm Management CRM</p>
                </div>
                <div className="flex gap-2">
                  {/* Smart Weather Widget */}
                  <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-2xl px-4 py-2 flex items-center gap-3 shadow-lg border border-blue-300">
                    <FaCloudSun className="text-2xl animate-pulse" />
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-80 leading-none">Smart Weather</p>
                      <p className="text-sm font-black leading-tight">32°C | Sunny</p>
                      <p className="text-[8px] font-bold opacity-70">Best for Grazing</p>
                    </div>
                  </div>
                  <button onClick={fetchDashboard} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:text-blue-600">
                    <FaSync className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* DAILY CHECKLIST / ALERTS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">✅ Daily Checklist <span className="text-[8px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full">ACTIVE</span></div>
                      <Link href="/farming/health" className="text-[8px] text-blue-600 hover:underline">View Medical Records</Link>
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { t: 'Morning Feed Check', s: 'done', i: <FaCheckCircle className="text-green-500" /> },
                      { t: 'Milk Production Entry', s: 'pending', i: <div className="w-4 h-4 border-2 border-slate-200 rounded-full" /> },
                      { t: 'High Temperature Alert', s: 'alert', i: <FaThermometerHalf className="text-red-500" /> },
                      { t: 'Vaccination Follow-up', s: 'pending', i: <div className="w-4 h-4 border-2 border-slate-200 rounded-full" /> },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          {item.i}
                          <span className={`text-[11px] font-bold ${item.s === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.t}</span>
                        </div>
                        {item.s === 'alert' && <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black">FEVER DETECTED</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Master Bulk Reporting Section */}
                <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden mb-12 border border-slate-800">
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left">
                      <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                          <FaFileMedical className="text-2xl" />
                        </div>
                        <div>
                          <h2 className="text-white font-black text-lg uppercase tracking-widest">Master Reporter</h2>
                          <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Full History Analysis</p>
                        </div>
                      </div>
                      <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-md">
                        Get your complete data history (up to 500 records) delivered to <span className="text-white">amitk73262@gmail.com</span> in one consolidated report.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:w-auto">
                      {['Health', 'Inward', 'Outward'].map(module => (
                        <button 
                          key={module}
                          onClick={async () => {
                            const toastId = toast.loading(`Generating Master ${module} Report...`);
                            try {
                              const res = await fetch(`/api/farming/${module.toLowerCase()}?limit=500`);
                              const d = await res.json();
                              if (d.success) {
                                const sendRes = await fetch('/api/farming/send-report', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    title: `MASTER ${module.toUpperCase()} REPORT`,
                                    data: d.data.map((item, idx) => ({
                                      label: `#${idx + 1} - ${item.animal_tag || item.inward_type || item.outward_type || 'Record'}`,
                                      value: `${item.type || 'N/A'} | ${new Date(item.treatment_date || item.inward_date || item.outward_date || item.created_at).toLocaleDateString()}`
                                    })),
                                    footer_note: `Master archive containing ${d.data.length} records. Generated on ${new Date().toLocaleString()}`
                                  })
                                });
                                const sd = await sendRes.json();
                                if (sd.success) toast.success(`Full ${module} report sent!`, { id: toastId });
                                else throw new Error(sd.error);
                              }
                            } catch (e) {
                              toast.error(e.message || 'Report generation failed', { id: toastId });
                            }
                          }}
                          className="flex items-center justify-between gap-6 px-8 py-5 rounded-[1.5rem] bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:border-emerald-500 transition-all active:scale-95 group shadow-lg"
                        >
                          {module}
                          <FaArrowUp className="rotate-45 text-emerald-500 group-hover:text-white" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-4">Stock Alerts</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold mb-1"><span>Cattle Feed</span><span className="text-red-400">12% Left</span></div>
                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="w-[12%] h-full bg-red-500"></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold mb-1"><span>Medicine Stock</span><span>85%</span></div>
                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="w-[85%] h-full bg-emerald-500"></div></div>
                      </div>
                    </div>
                    <button className="w-full mt-6 bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors border border-white/10">Order Supplies</button>
                  </div>
                  <FaBoxOpen className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12" />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <FaSpinner className="animate-spin text-blue-600 text-4xl" />
                </div>
              ) : (
                <>
                  {/* Animal Type Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {ANIMAL_TYPES.map(t => {
                      const c = getCount(t.key);
                      return (
                        <Link key={t.key} href={`/farming/animals?type=${t.key}`}
                          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: t.bg }}>
                              {t.icon}
                            </div>
                          </div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">{t.label}</h3>
                          <div className="flex items-end gap-2 mt-2">
                            <span className="text-3xl font-black" style={{ color: t.color }}>{Number(c.active || 0)}</span>
                            <span className="text-[9px] text-slate-400 font-bold mb-1">ACTIVE</span>
                          </div>
                          <div className="flex gap-3 mt-2 text-[9px] font-bold text-slate-400">
                            <span>Total: {Number(c.total || 0)}</span>
                            <span>Sold: {Number(c.sold || 0)}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Healthcare & Medical Center */}
                  <div className="mb-8">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs">🩺</span>
                      Healthcare & Medical Center
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Link href="/farming/health" className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="relative z-10">
                          <h3 className="text-lg font-black mb-1">Medical Reports</h3>
                          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Health Checkups & Vaccination</p>
                          <div className="mt-6 flex items-center gap-2 bg-white/20 w-fit px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">Manage Reports →</div>
                        </div>
                        <FaFileMedical className="absolute -right-4 -bottom-4 text-7xl opacity-20 group-hover:scale-110 transition-transform duration-500" />
                      </Link>

                      <Link href="/farming/doctors" className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="relative z-10">
                          <h3 className="text-lg font-black mb-1">Vet Doctors</h3>
                          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Professional Veterinary Hub</p>
                          <div className="mt-6 flex items-center gap-2 bg-white/20 w-fit px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">Find A Doctor →</div>
                        </div>
                        <FaUserMd className="absolute -right-4 -bottom-4 text-7xl opacity-20 group-hover:scale-110 transition-transform duration-500" />
                      </Link>

                      <Link href="/farming/diseases" className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="relative z-10">
                          <h3 className="text-lg font-black mb-1">Disease Guide</h3>
                          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Identification & Prevention</p>
                          <div className="mt-6 flex items-center gap-2 bg-white/20 w-fit px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">Learn Symptoms →</div>
                        </div>
                        <FaStethoscope className="absolute -right-4 -bottom-4 text-7xl opacity-20 group-hover:scale-110 transition-transform duration-500" />
                      </Link>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                    {[
                      { label: 'Add Animal', href: '/farming/animals/create', icon: <FaPlus />, color: '#10B981' },
                      { label: 'New Batch', href: '/farming/batches', icon: <FaBoxOpen />, color: '#8B5CF6' },
                      { label: 'Inward Entry', href: '/farming/inward', icon: <FaArrowDown />, color: '#3B82F6' },
                      { label: 'Outward Entry', href: '/farming/outward', icon: <FaArrowUp />, color: '#EF4444' },
                      { label: 'Production', href: '/farming/production', icon: <FaChartBar />, color: '#F59E0B' },
                      { label: 'Feed', href: '/farming/feed', icon: <FaLeaf />, color: '#059669' },
                    ].map((a, i) => (
                      <Link key={i} href={a.href}
                        className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm" style={{ background: a.color }}>
                          {a.icon}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{a.label}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Profit & Loss Summary */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">💰 Profit & Loss Summary</h2>
                      <span className="text-[10px] font-bold text-slate-400">TOTAL LIFETIME</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                        <p className="text-[9px] font-black uppercase text-emerald-600 mb-1">Total Revenue</p>
                        <p className="text-2xl font-black text-emerald-700">₹{Number(dashData?.financials?.totalRevenue || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[8px] text-emerald-500 mt-1 font-bold">Sales & Production income</p>
                      </div>
                      <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                        <p className="text-[9px] font-black uppercase text-red-600 mb-1">Total Expenses</p>
                        <p className="text-2xl font-black text-red-700">₹{Number(dashData?.financials?.totalExpenses || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[8px] text-red-400 mt-1 font-bold">Feed + Health + Purchase + General</p>
                      </div>
                      <div className={`p-5 rounded-2xl border ${dashData?.financials?.netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                        <p className={`text-[9px] font-black uppercase mb-1 ${dashData?.financials?.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net Profit/Loss</p>
                        <p className={`text-2xl font-black ${dashData?.financials?.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                          {dashData?.financials?.netProfit < 0 ? '-' : ''}₹{Math.abs(Number(dashData?.financials?.netProfit || 0)).toLocaleString('en-IN')}
                        </p>
                        <p className={`text-[8px] mt-1 font-bold ${dashData?.financials?.netProfit >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                          {dashData?.financials?.netProfit >= 0 ? 'Excellent performance' : 'Loss - review expenses'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                      <div className="text-center p-2 bg-slate-50 rounded-xl">
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Feed Cost</p>
                        <p className="text-xs font-black text-slate-700">₹{Number(dashData?.financials?.totalFeedCost || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl">
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Health Cost</p>
                        <p className="text-xs font-black text-slate-700">₹{Number(dashData?.financials?.totalHealthCost || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl">
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Purchase Cost</p>
                        <p className="text-xs font-black text-slate-700">₹{Number(dashData?.financials?.totalPurchaseCost || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-[8px] text-red-500 uppercase font-bold">Death Loss</p>
                        <p className="text-xs font-black text-red-700">₹{Number(dashData?.financials?.totalDeathLoss || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl col-span-2 md:col-span-1">
                        <p className="text-[8px] text-slate-400 uppercase font-bold">General Exp</p>
                        <p className="text-xs font-black text-slate-700">₹{Number(dashData?.financials?.totalGeneralExpense || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Today's Production */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">📊 Today's Production</h2>
                      {dashData?.todayProduction?.length > 0 ? (
                        <div className="space-y-3">
                          {dashData.todayProduction.map((p, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                              <div>
                                <span className="text-xs font-bold text-slate-700">{p.product_name}</span>
                                <span className="text-[9px] text-slate-400 ml-2">({p.type})</span>
                              </div>
                              <span className="text-sm font-black text-emerald-600">{Number(p.total_qty).toFixed(1)} {p.unit}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-8">No production recorded today</p>
                      )}
                    </div>

                    {/* Active Batches */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">📦 Active Batches</h2>
                      {dashData?.activeBatches?.length > 0 ? (
                        <div className="space-y-3">
                          {dashData.activeBatches.map((b, i) => {
                            const t = ANIMAL_TYPES.find(x => x.key === b.type);
                            return (
                              <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{t?.icon || '📦'}</span>
                                  <span className="text-xs font-bold text-slate-700 capitalize">{b.type}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-black text-purple-600">{Number(b.count)}</span>
                                  <span className="text-[9px] text-slate-400 ml-1">batches</span>
                                  <span className="text-[9px] text-slate-400 ml-2">({Number(b.total_animals)} animals)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-8">No active batches</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Inward & Outward */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">⬇️ Recent Inward</h2>
                        <Link href="/farming/inward" className="text-[9px] font-bold text-blue-600 uppercase">View All →</Link>
                      </div>
                      {dashData?.recentInward?.length > 0 ? (
                        <div className="space-y-2">
                          {dashData.recentInward.slice(0, 5).map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-blue-50 p-3 rounded-xl">
                              <div>
                                <span className="font-bold text-slate-700 capitalize">{r.type}</span>
                                <span className="text-slate-400 ml-2">{r.inward_type}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-blue-600">Qty: {r.quantity}</span>
                                {r.inward_date && <span className="text-[9px] text-slate-400 ml-2">{new Date(r.inward_date).toLocaleDateString('en-IN')}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-400 text-center py-6">No inward records</p>}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">⬆️ Recent Outward</h2>
                        <Link href="/farming/outward" className="text-[9px] font-bold text-red-600 uppercase">View All →</Link>
                      </div>
                      {dashData?.recentOutward?.length > 0 ? (
                        <div className="space-y-2">
                          {dashData.recentOutward.slice(0, 5).map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-red-50 p-3 rounded-xl">
                              <div>
                                <span className="font-bold text-slate-700 capitalize">{r.type}</span>
                                <span className="text-slate-400 ml-2">{r.outward_type}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-red-600">Qty: {r.quantity}</span>
                                {r.outward_date && <span className="text-[9px] text-slate-400 ml-2">{new Date(r.outward_date).toLocaleDateString('en-IN')}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-400 text-center py-6">No outward records</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]"><Footer /></div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function FarmingDashboardPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <FarmingDashboardContent />
    </Suspense>
  );
}
