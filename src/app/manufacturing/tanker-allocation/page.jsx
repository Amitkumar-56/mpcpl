// src/app/manufacturing/tanker-allocation/page.js
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { FaPlus, FaSearch, FaSpinner, FaTruck } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function TankerAllocationContent() {
  const router = useRouter();
  const [allocations, setAllocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({
    tanker_type: 'type_a_raw', material_id: '', material_name: '', quantity: '', unit: 'kg',
    driver_name: '', vehicle_number: '', allocation_date: new Date().toISOString().split('T')[0], notes: ''
  });

  useEffect(() => { fetchAllocations(); fetchMaterials(); }, [search, filterType, filterStatus]);

  const fetchAllocations = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('tanker_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/manufacturing/tanker-allocation?${params}`);
      const data = await res.json();
      if (data.success) setAllocations(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/manufacturing/raw-materials');
      const data = await res.json();
      if (data.success) setMaterials(data.data);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!form.vehicle_number || !form.tanker_type) return alert('Vehicle number and tanker type required');
    setSaving(true);
    try {
      const res = await fetch('/api/manufacturing/tanker-allocation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm({ tanker_type: 'type_a_raw', material_id: '', material_name: '', quantity: '', unit: 'kg', driver_name: '', vehicle_number: '', allocation_date: new Date().toISOString().split('T')[0], notes: '' });
        fetchAllocations();
      } else alert(data.error);
    } catch (err) { alert('Error saving'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch('/api/manufacturing/tanker-allocation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      const data = await res.json();
      if (data.success) fetchAllocations();
      else alert(data.error);
    } catch (err) { alert('Error updating'); }
  };

  const getStatusBadge = (status) => {
    const colors = {
      allocated: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-blue-100 text-blue-800',
      arrived: 'bg-green-100 text-green-800',
      unloaded: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status?.replace('_', ' ').toUpperCase()}</span>;
  };

  const nextStatus = { allocated: 'in_transit', in_transit: 'arrived', arrived: 'unloaded', unloaded: 'completed' };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <FaTruck className="text-2xl" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Tanker Allocation</h1>
                    <p className="text-xs text-amber-100 mt-0.5">Allocate tankers for materials</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-white text-amber-600 px-4 py-2 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2 text-sm shadow-md">
                  <FaPlus /> Allocate Tanker
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Search tanker/vehicle..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm" />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm min-w-[150px]">
                <option value="">All Types</option>
                <option value="type_a_raw">Type-A (Raw)</option>
                <option value="other_raw">Other Raw</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm min-w-[150px]">
                <option value="">All Status</option>
                <option value="allocated">Allocated</option>
                <option value="in_transit">In Transit</option>
                <option value="arrived">Arrived</option>
                <option value="unloaded">Unloaded</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {loading ? (
                <div className="p-12 text-center"><FaSpinner className="animate-spin text-amber-500 text-3xl mx-auto" /></div>
              ) : allocations.length > 0 ? allocations.map(a => (
                <div key={a.id} className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-sm font-bold text-amber-600">{a.tanker_code}</span>
                      <h3 className="font-semibold text-gray-800 mt-1">{a.vehicle_number}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(a.status)}
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${a.tanker_type === 'type_a_raw' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {a.tanker_type === 'type_a_raw' ? 'Type-A' : 'Other'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                    <div><span className="font-medium text-gray-700">Driver:</span> {a.driver_name || '-'}</div>
                    <div><span className="font-medium text-gray-700">Material:</span> {a.material_name || a.raw_material_name || '-'}</div>
                    <div><span className="font-medium text-gray-700">Quantity:</span> {parseFloat(a.quantity || 0).toFixed(2)} {a.unit?.toUpperCase()}</div>
                    <div><span className="font-medium text-gray-700">Date:</span> {a.allocation_date ? new Date(a.allocation_date).toLocaleDateString('en-IN') : '-'}</div>
                  </div>
                  {a.status !== 'completed' && nextStatus[a.status] && (
                    <button onClick={() => updateStatus(a.id, nextStatus[a.status])}
                      className="w-full bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-amber-600 transition">
                      → {nextStatus[a.status].replace('_', ' ')}
                    </button>
                  )}
                </div>
              )) : (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">No tanker allocations found</div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
              {loading ? (
                <div className="p-12 text-center"><FaSpinner className="animate-spin text-amber-500 text-3xl mx-auto" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Tanker Code', 'Type', 'Vehicle', 'Driver', 'Material', 'Qty', 'Unit', 'Date', 'Status', 'Action'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allocations.length > 0 ? allocations.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-3 font-semibold text-amber-600 whitespace-nowrap">{a.tanker_code}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${a.tanker_type === 'type_a_raw' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {a.tanker_type === 'type_a_raw' ? 'Type-A' : 'Other'}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{a.vehicle_number}</td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{a.driver_name || '-'}</td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{a.material_name || a.raw_material_name || '-'}</td>
                          <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{parseFloat(a.quantity || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-gray-500 uppercase whitespace-nowrap">{a.unit}</td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{a.allocation_date ? new Date(a.allocation_date).toLocaleDateString('en-IN') : '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{getStatusBadge(a.status)}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {a.status !== 'completed' && nextStatus[a.status] && (
                              <button onClick={() => updateStatus(a.id, nextStatus[a.status])}
                                className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 transition whitespace-nowrap">
                                → {nextStatus[a.status].replace('_', ' ')}
                              </button>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={10} className="p-8 text-center text-gray-400">No tanker allocations found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Modal - Allocate Tanker */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Allocate Tanker</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanker Type *</label>
                  <select value={form.tanker_type} onChange={e => setForm({ ...form, tanker_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm">
                    <option value="type_a_raw">Type-A (Raw)</option>
                    <option value="other_raw">Other Raw</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number *</label>
                  <input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raw Material</label>
                <select value={form.material_id} onChange={e => {
                  const mat = materials.find(m => m.id == e.target.value);
                  setForm({ ...form, material_id: e.target.value, material_name: mat?.material_name || '', unit: mat?.unit || form.unit });
                }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm">
                  <option value="">Select Material</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.material_code} - {m.material_name} ({m.unit})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm">
                    <option value="kg">KG</option>
                    <option value="litre">Litre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={form.allocation_date} onChange={e => setForm({ ...form, allocation_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                <input value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50 text-sm">
                {saving ? 'Saving...' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <FaSpinner className="animate-spin text-amber-500 text-4xl" />
    </div>
  );
}

export default function TankerAllocationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TankerAllocationContent />
    </Suspense>
  );
}