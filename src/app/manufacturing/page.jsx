// src/app/manufacturing/page.js
"use client";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { FaBox, FaClipboardList, FaCog, FaFlask, FaIndustry, FaShieldAlt, FaTruck, FaArrowRight, FaChartLine, FaSpinner, FaLock, FaClipboardCheck } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function ManufacturingDashboardContent() {
  const { user } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recentBatches, setRecentBatches] = useState([]);
  const [recentGate, setRecentGate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      checkPermissions();
      fetchDashboard();
    }
  }, [user]);

  const checkPermissions = async () => {
    if (!user) return;
    if (Number(user.role) === 5) {
      setPermissions({
        'Raw Materials': true, 'Finished Goods': true, 'Tanker Allocation': true,
        'Lab Testing': true, 'Manufacturing Process': true, 'Security Gate': true, 'Manufacturing': true, 'Manufacturing Entry': true
      });
      return;
    }
    if (user.permissions && typeof user.permissions === 'object') {
      const perms = {};
      ['Manufacturing', 'Raw Materials', 'Finished Goods', 'Tanker Allocation', 'Lab Testing', 'Manufacturing Process', 'Security Gate', 'Manufacturing Entry'].forEach(mod => {
        perms[mod] = user.permissions[mod]?.can_view === true;
      });
      setPermissions(perms);
      return;
    }
    try {
      const modules = ['Manufacturing', 'Raw Materials', 'Finished Goods', 'Tanker Allocation', 'Lab Testing', 'Manufacturing Process', 'Security Gate', 'Manufacturing Entry'];
      const results = await Promise.all(modules.map(mod => fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(mod)}&action=can_view`).then(r => r.json()).then(d => ({ mod, allowed: d.allowed })).catch(() => ({ mod, allowed: false }))));
      const perms = {};
      results.forEach(r => { perms[r.mod] = r.allowed; });
      setPermissions(perms);
    } catch (err) { console.error(err); }
  };

  const hasPermission = (moduleName) => permissions[moduleName] === true;

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/manufacturing/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        setRecentBatches(data.data.recentBatches || []);
        setRecentGate(data.data.recentGateEntries || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const allModules = [
    { title: 'Raw Materials', desc: 'Manage raw material inventory', icon: <FaBox />, path: '/manufacturing/raw-materials', color: 'blue', permKey: 'Raw Materials' },
    { title: 'Finished Goods', desc: 'Track finished products', icon: <FaIndustry />, path: '/manufacturing/finished-goods', color: 'emerald', permKey: 'Finished Goods' },
    { title: 'Tanker Allocation', desc: 'Allocate tankers for materials', icon: <FaTruck />, path: '/manufacturing/tanker-allocation', color: 'amber', permKey: 'Tanker Allocation' },
    { title: 'Lab Testing', desc: 'Test batches & quality control', icon: <FaFlask />, path: '/manufacturing/lab-testing', color: 'purple', permKey: 'Lab Testing' },
    { title: 'Manufacturing Process', desc: 'Batch processing & production', icon: <FaCog />, path: '/manufacturing/process', color: 'red', permKey: 'Manufacturing Process' },
    { title: 'Security Gate', desc: 'Entry/Exit management', icon: <FaShieldAlt />, path: '/security-gate', color: 'cyan', permKey: 'Security Gate' },
    { title: 'Vehicle Entry', desc: 'Vehicle entry permission & processing', icon: <FaClipboardCheck />, path: '/manufacturing/entry-requests', color: 'teal', permKey: 'Manufacturing Entry' },
  ];

  const visibleModules = allModules.filter(mod => hasPermission(mod.permKey));

  const statCards = [
    { label: 'Raw Materials', value: stats?.rawMaterials || 0, icon: <FaBox />, color: 'blue', permKey: 'Raw Materials' },
    { label: 'Finished Goods', value: stats?.finishedGoods || 0, icon: <FaIndustry />, color: 'emerald', permKey: 'Finished Goods' },
    { label: 'Active Batches', value: stats?.activeBatches || 0, icon: <FaCog />, color: 'red', permKey: 'Manufacturing Process' },
    { label: 'Pending Tests', value: stats?.pendingTests || 0, icon: <FaFlask />, color: 'purple', permKey: 'Lab Testing' },
    { label: 'Tanker Allocations', value: stats?.tankerAllocations || 0, icon: <FaTruck />, color: 'amber', permKey: 'Tanker Allocation' },
    { label: 'Gate Entries', value: stats?.gateEntries || 0, icon: <FaShieldAlt />, color: 'cyan', permKey: 'Security Gate' },
    { label: 'Total Batches', value: stats?.totalBatches || 0, icon: <FaChartLine />, color: 'pink', permKey: 'Manufacturing Process' },
    { label: 'Completed', value: stats?.completedBatches || 0, icon: <FaClipboardList />, color: 'teal', permKey: 'Manufacturing Process' },
    { label: 'Entry Requests', value: stats?.entryRequests || 0, icon: <FaClipboardCheck />, color: 'indigo', permKey: 'Manufacturing Entry' },
  ];

  const visibleStats = statCards.filter(card => hasPermission(card.permKey));

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-800',
      in_process: 'bg-blue-100 text-blue-800',
      testing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      arrived: 'bg-green-100 text-green-800',
      under_processing: 'bg-blue-100 text-blue-800',
      ready_to_exit: 'bg-yellow-100 text-yellow-800',
      exited: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status?.replace('_', ' ').toUpperCase()}</span>;
  };

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    pink: 'bg-pink-100 text-pink-600',
    teal: 'bg-teal-100 text-teal-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  const gradientClasses = {
    blue: 'from-blue-600 to-blue-500',
    emerald: 'from-emerald-600 to-emerald-500',
    amber: 'from-amber-600 to-amber-500',
    purple: 'from-purple-600 to-purple-500',
    red: 'from-red-600 to-red-500',
    cyan: 'from-cyan-600 to-cyan-500',
    teal: 'from-teal-600 to-teal-500',
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col">
          <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FaSpinner className="animate-spin text-blue-500 text-4xl mx-auto" />
              <p className="mt-3 text-gray-500 font-medium">Loading Manufacturing Dashboard...</p>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 sm:px-6 md:px-8 py-6 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <FaIndustry className="text-blue-400 text-2xl" />
                <h1 className="text-xl sm:text-2xl font-bold">Manufacturing Dashboard</h1>
              </div>
              <p className="text-slate-300 text-sm">Complete manufacturing operations overview — {user?.name || 'Admin'}</p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 -mt-6 relative z-10">
            {/* Stats Grid */}
            {visibleStats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {visibleStats.map((card, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className={`w-9 h-9 rounded-lg ${colorClasses[card.color]} flex items-center justify-center text-base mb-3`}>
                      {card.icon}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-800">{card.value}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">{card.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Modules */}
            <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3">🏭 Manufacturing Modules</h2>
            {visibleModules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {visibleModules.map((mod, i) => (
                  <div key={i} onClick={() => router.push(mod.path)} className="bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${gradientClasses[mod.color]} opacity-10 rounded-bl-2xl`} />
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradientClasses[mod.color]} flex items-center justify-center text-white text-base shadow-sm`}>
                        {mod.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-800">{mod.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                      </div>
                      <FaArrowRight className="text-gray-300 text-sm group-hover:text-gray-500 transition" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center border mb-6">
                <FaLock className="text-3xl text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No modules assigned. Contact admin for access.</p>
              </div>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {hasPermission('Manufacturing Process') && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-800">📦 Recent Batches</h3>
                    <button onClick={() => router.push('/manufacturing/process')} className="text-xs text-blue-600 font-semibold hover:underline">View All →</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentBatches.length > 0 ? recentBatches.map((b, i) => (
                      <div key={i} className="px-4 py-3 border-b last:border-b-0 flex justify-between items-center hover:bg-gray-50 transition">
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{b.batch_code}</div>
                          <div className="text-xs text-gray-500">{b.product_name} • {b.actual_quantity || 0} {b.unit}</div>
                        </div>
                        {getStatusBadge(b.status)}
                      </div>
                    )) : (
                      <div className="p-8 text-center text-gray-400 text-sm">No batches yet</div>
                    )}
                  </div>
                </div>
              )}

              {hasPermission('Security Gate') && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-800">🚪 Recent Gate Activity</h3>
                    <button onClick={() => router.push('/security-gate')} className="text-xs text-blue-600 font-semibold hover:underline">View All →</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentGate.length > 0 ? recentGate.map((g, i) => (
                      <div key={i} className="px-4 py-3 border-b last:border-b-0 flex justify-between items-center hover:bg-gray-50 transition">
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{g.vehicle_number}</div>
                          <div className="text-xs text-gray-500">{g.driver_name || 'N/A'} • {g.direction === 'entry' ? '🟢 Entry' : '🔴 Exit'}</div>
                        </div>
                        {getStatusBadge(g.gate_status)}
                      </div>
                    )) : (
                      <div className="p-8 text-center text-gray-400 text-sm">No gate entries yet</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <FaSpinner className="animate-spin text-blue-500 text-4xl" />
    </div>
  );
}

export default function ManufacturingDashboard() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ManufacturingDashboardContent />
    </Suspense>
  );
}