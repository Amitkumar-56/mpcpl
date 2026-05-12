'use client';
import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPaw, FaDrumstickBite, FaFish, FaLeaf, FaArrowDown, FaArrowUp, FaArrowRight, FaChartBar, FaBoxOpen, FaPlus, FaCloudSun, FaCheckCircle, FaExclamationTriangle, FaUserMd, FaStethoscope, FaFileMedical, FaThermometerHalf } from 'react-icons/fa';
import { GiCow, GiGoat, GiChicken, GiHoneypot, GiFishingNet } from 'react-icons/gi';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

// Lazy load heavy components
const FinancialsCard = dynamic(() => import('./FinancialsCard'), { 
  ssr: false 
});

const ANIMAL_TYPES = [
  { key: 'cow', label: 'Cow', icon: '🐄', color: '#8B5CF6', bg: '#EDE9FE' },
  { key: 'goat', label: 'Goat', icon: '🐐', color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'chicken', label: 'Chicken', icon: '🐔', color: '#EF4444', bg: '#FEE2E2' },
  { key: 'fish', label: 'Fish', icon: '🐟', color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'honey', label: 'Honey', icon: '🍯', color: '#D97706', bg: '#FDE68A' },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-3" />
      <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
      <div className="h-8 bg-slate-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
    </div>
  );
}

function FarmingDashboardContent() {
  const { user, loading: authLoading } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      const hasPermission = user.role === 5 || (user.permissions && user.permissions['Farming CRM']?.can_view);
      if (!hasPermission) {
        toast.error("Access Denied: Farming CRM");
        router.push('/dashboard');
        return;
      }
      
      setMounted(true);
      fetchDashboard();
    }
  }, [user, authLoading, router]);

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
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">🌾 Farming Dashboard</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete Farm Management CRM</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-2xl px-4 py-2 flex items-center gap-3 shadow-lg border border-blue-300 flex-1 md:flex-none">
                    <FaCloudSun className="text-2xl animate-pulse" />
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-80 leading-none">Smart Weather</p>
                      <p className="text-sm font-black leading-tight">32°C | Sunny</p>
                    </div>
                  </div>
                  <button onClick={fetchDashboard} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:text-blue-600">
                    <FaSync className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* DATA COMPLIANCE & MISSING REPORTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                        🚨 Data Compliance Alerts
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time gap analysis</p>
                    </div>
                    <div className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                      Action Required
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading ? (
                       [1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl" />)
                    ) : (
                      <>
                        <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                          <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <FaThermometerHalf /> Overdue Health Check ({dashData?.compliance?.missingHealth?.length || 0})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {dashData?.compliance?.missingHealth?.map((a, i) => (
                              <span key={i} className="bg-white px-2 py-1 rounded-lg text-[9px] font-bold text-slate-700 shadow-sm border border-orange-100">{a.tag_id}</span>
                            ))}
                            {(!dashData?.compliance?.missingHealth || dashData?.compliance?.missingHealth.length === 0) && <span className="text-[9px] font-bold text-emerald-600 uppercase">All healthy!</span>}
                          </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <FaChartBar /> Weight Log Missing ({dashData?.compliance?.missingWeight?.length || 0})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {dashData?.compliance?.missingWeight?.map((a, i) => (
                              <span key={i} className="bg-white px-2 py-1 rounded-lg text-[9px] font-bold text-slate-700 shadow-sm border border-blue-100">{a.tag_id}</span>
                            ))}
                            {(!dashData?.compliance?.missingWeight || dashData?.compliance?.missingWeight.length === 0) && <span className="text-[9px] font-bold text-emerald-600 uppercase">Up to date!</span>}
                          </div>
                        </div>

                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <FaLeaf /> Feed Logs Today ({dashData?.compliance?.missingFeed?.length || 0} Batches)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {dashData?.compliance?.missingFeed?.map((b, i) => (
                              <span key={i} className="bg-white px-2 py-1 rounded-lg text-[9px] font-bold text-slate-700 shadow-sm border border-emerald-100">{b.batch_code}</span>
                            ))}
                            {(!dashData?.compliance?.missingFeed || dashData?.compliance?.missingFeed.length === 0) && <span className="text-[9px] font-bold text-emerald-600 uppercase">Fully Fed!</span>}
                          </div>
                        </div>

                        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                          <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <FaExclamationTriangle /> Incomplete Profiles ({dashData?.compliance?.incompleteProfiles?.length || 0})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {dashData?.compliance?.incompleteProfiles?.map((a, i) => (
                              <span key={i} className="bg-white px-2 py-1 rounded-lg text-[9px] font-bold text-slate-700 shadow-sm border border-rose-100">{a.tag_id}</span>
                            ))}
                            {(!dashData?.compliance?.incompleteProfiles || dashData?.compliance?.incompleteProfiles.length === 0) && <span className="text-[9px] font-bold text-emerald-600 uppercase">Perfect Data!</span>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group border-4 border-slate-800">
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <h2 className="text-white text-xl font-black leading-tight mb-2">Master Reporting Center</h2>
                      <p className="text-slate-400 text-xs font-medium">Generate professional audit reports for every section in one click.</p>
                    </div>
                    <div className="space-y-3 mt-6">
                       <button className="w-full bg-emerald-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                         <FaFileMedical /> Download Health Report
                       </button>
                       <button className="w-full bg-blue-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                         <FaChartBar /> Export Production Data
                       </button>
                    </div>
                  </div>
                  {/* Decorative background element */}
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl group-hover:bg-emerald-600/20 transition-all" />
                </div>
              </div>

              {/* Animal Type Cards - Lazy Loaded with Skeletons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                {loading ? (
                  Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  ANIMAL_TYPES.map(t => {
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
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Financials Card - Lazy Loaded with Suspense */}
              {!loading && dashData && (
                <Suspense fallback={<div className="h-64 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-center animate-pulse text-slate-300 font-bold">Loading Financials...</div>}>
                  <FinancialsCard financials={dashData.financials} />
                </Suspense>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                {[
                  { label: 'Add Animal', href: '/farming/animals/create', icon: <FaPlus />, color: '#10B981' },
                  { label: 'New Batch', href: '/farming/batches', icon: <FaBoxOpen />, color: '#8B5CF6' },
                  { label: 'Inward Entry', href: '/farming/inward', icon: <FaArrowDown />, color: '#3B82F6' },
                  { label: 'Outward Entry', href: '/farming/outward', icon: <FaArrowUp />, color: '#EF4444' },
                  { label: 'Production', href: '/farming/production', icon: <FaChartBar />, color: '#F59E0B' },
                  { label: 'Processing', href: '/farming/processing', icon: <FaSync />, color: '#6366F1' },
                  { label: 'Feed', href: '/farming/feed', icon: <FaLeaf />, color: '#059669' },
                  { label: 'Health', href: '/farming/health', icon: <FaStethoscope />, color: '#EC4899' },
                  { label: 'AI Diagnostic', href: '/farming/health/diagnostic', icon: <FaThermometerHalf />, color: '#F43F5E' },
                ].map((a, i) => (
                  <Link key={i} href={a.href}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm" style={{ background: a.color }}>{a.icon}</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{a.label}</span>
                  </Link>
                ))}
              </div>

              {/* Recent Activity Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {loading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="h-64 bg-white animate-pulse rounded-2xl border border-slate-100" />)
                ) : (
                  <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">⬇️ Recent Inward</h2>
                      <div className="space-y-2">
                        {dashData?.recentInward?.map((r, i) => (
                          <div key={i} className="flex justify-between text-xs bg-blue-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-700">{r.type}</span>
                            <span className="font-bold text-blue-600">Qty: {r.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">⬆️ Recent Outward</h2>
                      <div className="space-y-2">
                        {dashData?.recentOutward?.map((r, i) => (
                          <div key={i} className="flex justify-between text-xs bg-red-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-700">{r.type}</span>
                            <span className="font-bold text-red-600">Qty: {r.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">🔄 Recent Processing</h2>
                      <div className="space-y-2">
                        {dashData?.recentProcessing?.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs bg-indigo-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-700">{p.source_product}</span>
                            <span className="font-black text-indigo-600">→ {p.derivative_product}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
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
