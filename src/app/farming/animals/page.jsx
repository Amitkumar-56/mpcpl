'use client';
import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaSpinner, FaSync, FaPlus, FaEye, FaSearch, FaBaby, FaArrowLeft } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

// Lazy load detail modal content
const AnimalDetailModal = dynamic(() => import('./AnimalDetailModal'), {
  ssr: false
});

const TYPES = [{ k: '', l: 'All' }, { k: 'cow', l: '🐄 Cow' }, { k: 'goat', l: '🐐 Goat' }, { k: 'chicken', l: '🐔 Chicken' }, { k: 'fish', l: '🐟 Fish' }, { k: 'honey', l: '🍯 Honey' }];
const HC = { healthy: '#DCFCE7/#166534', sick: '#FEE2E2/#991B1B', treatment: '#FEF3C7/#92400E', quarantine: '#FCE7F3/#9D174D', deceased: '#F3F4F6/#374151' };
const SC = { active: '#DCFCE7/#166534', sold: '#DBEAFE/#1E40AF', deceased: '#FEE2E2/#991B1B', transferred: '#FEF3C7/#92400E' };

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
      <div className="bg-slate-50 h-12 w-full" />
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="border-t border-slate-50 h-16 flex items-center px-6 gap-4">
          <div className="h-8 bg-slate-100 rounded-lg w-8" />
          <div className="h-4 bg-slate-100 rounded w-24" />
          <div className="h-4 bg-slate-100 rounded w-20" />
          <div className="h-4 bg-slate-100 rounded w-16" />
          <div className="h-6 bg-slate-100 rounded-lg w-12 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function AnimalsContent() {
  const { user, loading: authLoading } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [filterType, setFilterType] = useState(sp.get('type') || '');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterGender, setFilterGender] = useState('');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    }
  }, [user, authLoading, router]);

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      let url = '/api/farming/animals?';
      if (filterType) url += `type=${filterType}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterGender) url += `gender=${filterGender}&`;
      if (search) url += `search=${search}&`;
      const res = await fetch(url); const data = await res.json();
      if (data.success) setAnimals(data.data);
    } catch (e) { toast.error('Error'); } finally { setLoading(false); }
  };

  const viewAnimal = async (id) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/farming/animals?id=${id}`);
      const data = await res.json();
      if (data.success) setSel(data.data);
      else toast.error(data.error || 'Animal not found');
    } catch (e) { toast.error('Error loading detail'); } finally { setDetailLoading(false); }
  };

  useEffect(() => { if (mounted) fetchAnimals(); }, [mounted, filterType, filterStatus, filterGender]);

  if (!mounted) return null;
  const badge = (val, map) => { const c = (map[val] || '#F3F4F6/#374151').split('/'); return { background: c[0], color: c[1] }; };

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter',sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8"><div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-between mb-8 gap-6 sm:flex-row">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">🐾 Animals Registry</h1>
                <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-[0.3em] mt-1">Live Stock Management</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 w-full sm:w-auto">
                <button onClick={fetchAnimals} className="bg-white border border-slate-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none flex justify-center items-center"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <Link href="/farming" className="bg-slate-800 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 flex-1 sm:flex-none">
                   <FaArrowLeft /> <span className="hidden sm:inline">Back</span>
                </Link>
                <Link href={`/farming/animals/create?type=${filterType || 'cow'}&entry=purchase`} className="bg-blue-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 flex-1 sm:flex-none">
                   <FaPlus /> Parent
                </Link>
                <Link href={`/farming/animals/create?type=${filterType || 'cow'}&entry=birth`} className="bg-pink-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 flex-1 sm:flex-none">
                   <FaBaby /> Child
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex gap-1 flex-wrap">{TYPES.map(t => (
                  <button key={t.k} onClick={() => setFilterType(t.k)} className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${filterType === t.k ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>{t.l}</button>
                ))}</div>
                <div className="flex-1 min-w-[180px]"><div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAnimals()} placeholder="Search tag, name, breed..." className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
                </div></div>
              </div>
            </div>

            {sel && (
              <Suspense fallback={<div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"><FaSpinner className="animate-spin text-blue-600 text-5xl" /></div>}>
                <AnimalDetailModal sel={sel} onClose={() => setSel(null)} refresh={() => viewAnimal(sel.id)} />
              </Suspense>
            )}

            {loading ? <TableSkeleton /> : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50">
                  {['', 'Tag ID', 'Name', 'Type', 'Breed', 'Gender', 'Status', ''].map((h, i) => (
                    <th key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-3 text-left">{h}</th>
                  ))}
                </tr></thead><tbody>
                    {animals.length === 0 ? <tr><td colSpan={10} className="text-center py-12 text-xs text-slate-400">No animals found.</td></tr> :
                      animals.map(a => (
                        <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                          <td className="px-3 py-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black ${a.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}>{a.gender === 'female' ? '♀' : '♂'}</div></td>
                          <td className="px-3 py-3 text-xs font-black text-slate-900">{a.tag_id}</td>
                          <td className="px-3 py-3 text-xs font-bold text-slate-700">{a.name || '-'}</td>
                          <td className="px-3 py-3"><span className="text-[10px] font-bold capitalize bg-slate-100 px-2 py-1 rounded-lg">{a.type}</span></td>
                          <td className="px-3 py-3 text-xs text-slate-600">{a.breed || '-'}</td>
                          <td className="px-3 py-3 text-xs font-bold capitalize">{a.gender}</td>
                          <td className="px-3 py-3"><span className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg" style={badge(a.status, SC)}>{a.status}</span></td>
                          <td className="px-3 py-3"><button onClick={() => viewAnimal(a.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase hover:bg-blue-700 flex items-center gap-1"><FaEye /> Detail</button></td>
                        </tr>
                      ))}
                  </tbody></table></div>
              </div>
            )}
          </div></div>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
export default function AnimalsPage() { return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><AnimalsContent /></Suspense>; }
