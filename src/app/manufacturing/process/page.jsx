// src/app/manufacturing/process/page.js
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { FaCog, FaPlus, FaSearch, FaSpinner, FaLock, FaPlay, FaFlask, FaCheck, FaTimes } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function ManufacturingProcessContent() {
  const router = useRouter();
  const [batches, setBatches] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [batchMaterials, setBatchMaterials] = useState([{ material_id: '', material_name: '', quantity_used: '', unit: 'kg' }]);
  const [form, setForm] = useState({ product_name: '', batch_date: new Date().toISOString().split('T')[0], target_quantity: '', unit: 'kg', notes: '' });

  useEffect(() => { fetchBatches(); fetchMaterials(); }, [search, filterStatus]);

  const fetchBatches = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/manufacturing/process?${params}`);
      const data = await res.json();
      if (data.success) setBatches(data.data);
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
    if (!form.product_name) return alert('Product name is required');
    setSaving(true);
    try {
      const validMats = batchMaterials.filter(m => m.material_id && m.quantity_used > 0);
      const res = await fetch('/api/manufacturing/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, materials: validMats })
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm({ product_name: '', batch_date: new Date().toISOString().split('T')[0], target_quantity: '', unit: 'kg', notes: '' });
        setBatchMaterials([{ material_id: '', material_name: '', quantity_used: '', unit: 'kg' }]);
        fetchBatches();
      } else alert(data.error);
    } catch (err) { alert('Error saving'); }
    finally { setSaving(false); }
  };

  const updateBatchStatus = async (id, newStatus) => {
    const confirmMsg = { in_process: 'Start processing this batch?', testing: 'Send this batch for lab testing?', completed: 'Mark this batch as completed?', rejected: 'Reject this batch?' };
    if (!confirm(confirmMsg[newStatus] || `Change status to ${newStatus}?`)) return;
    try {
      const res = await fetch('/api/manufacturing/process', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) });
      const data = await res.json();
      if (data.success) fetchBatches();
      else alert(data.error);
    } catch (err) { alert('Error updating'); }
  };

  const addMaterialRow = () => setBatchMaterials([...batchMaterials, { material_id: '', material_name: '', quantity_used: '', unit: 'kg' }]);
  const removeMaterialRow = (i) => setBatchMaterials(batchMaterials.filter((_, idx) => idx !== i));
  const updateMaterialRow = (i, field, value) => {
    const updated = [...batchMaterials];
    updated[i][field] = value;
    if (field === 'material_id') {
      const mat = materials.find(m => m.id == value);
      if (mat) { updated[i].material_name = mat.material_name; updated[i].unit = mat.unit; }
    }
    setBatchMaterials(updated);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { bg: 'bg-yellow-100', color: 'text-yellow-800', label: '📝 Draft' },
      in_process: { bg: 'bg-blue-100', color: 'text-blue-800', label: '⚙️ In Process' },
      testing: { bg: 'bg-purple-100', color: 'text-purple-800', label: '🧪 Testing' },
      completed: { bg: 'bg-green-100', color: 'text-green-800', label: '✅ Completed', locked: true },
      rejected: { bg: 'bg-red-100', color: 'text-red-800', label: '❌ Rejected', locked: true },
    };
    const s = statusMap[status] || { bg: 'bg-gray-100', color: 'text-gray-800', label: status };
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${s.bg} ${s.color} w-max`}>{s.label}{s.locked && <FaLock className="text-[10px]" />}</span>;
  };

  const getCardBorder = (status) => {
    switch (status) {
      case 'completed': return 'border-l-4 border-l-green-500';
      case 'rejected': return 'border-l-4 border-l-red-500';
      case 'testing': return 'border-l-4 border-l-purple-500';
      case 'in_process': return 'border-l-4 border-l-blue-500';
      default: return 'border-l-4 border-l-yellow-500';
    }
  };

  const getActionButtons = (batch) => {
    if (batch.status === 'completed' || batch.status === 'rejected') {
      return <span className="text-xs text-gray-400 italic flex items-center gap-1"><FaLock /> Locked</span>;
    }
    const actions = {
      draft: [{ label: 'Start Process', status: 'in_process', icon: <FaPlay />, btnClass: 'bg-blue-600 hover:bg-blue-700' }],
      in_process: [{ label: 'Send to Lab', status: 'testing', icon: <FaFlask />, btnClass: 'bg-purple-600 hover:bg-purple-700' }],
      testing: [
        { label: 'Approve', status: 'completed', icon: <FaCheck />, btnClass: 'bg-green-600 hover:bg-green-700' },
        { label: 'Reject', status: 'rejected', icon: <FaTimes />, btnClass: 'bg-red-600 hover:bg-red-700' }
      ],
    };
    return (
      <div className="flex gap-2 flex-wrap">
        {(actions[batch.status] || []).map((a, i) => (
          <button key={i} onClick={() => updateBatchStatus(batch.id, a.status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm text-white ${a.btnClass}`}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-red-700 to-red-500 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <FaCog className="text-2xl" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Manufacturing Process</h1>
                    <p className="text-xs text-red-100 mt-0.5">Batch processing and production tracking</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-white text-red-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2 text-sm shadow-md">
                  <FaPlus /> Create Batch
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            {/* Filter Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
              {[
                { label: 'All', filter: '', count: batches.length },
                { label: 'Draft', filter: 'draft', count: batches.filter(b => b.status === 'draft').length },
                { label: 'In Process', filter: 'in_process', count: batches.filter(b => b.status === 'in_process').length },
                { label: 'Testing', filter: 'testing', count: batches.filter(b => b.status === 'testing').length },
                { label: 'Completed', filter: 'completed', count: batches.filter(b => b.status === 'completed').length },
                { label: 'Rejected', filter: 'rejected', count: batches.filter(b => b.status === 'rejected').length },
              ].map(c => (
                <button key={c.label} onClick={() => setFilterStatus(c.filter)}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center transition text-sm ${
                    filterStatus === c.filter ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span className="text-xl font-bold">{c.count}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold">{c.label}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md mb-6">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Search batch code, product..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm" />
            </div>

            {/* Batch Cards Grid */}
            {loading ? (
              <div className="flex justify-center py-12"><FaSpinner className="animate-spin text-red-500 text-4xl" /></div>
            ) : batches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {batches.map((b) => (
                  <div key={b.id} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-200 p-5 ${getCardBorder(b.status)}`}>
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div>
                        <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded">{b.batch_code}</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-2 mb-1">{b.product_name}</h3>
                        <p className="text-xs text-gray-500">{b.batch_date ? new Date(b.batch_date).toLocaleDateString('en-IN') : '-'} • {b.material_count || 0} mat • {b.test_count || 0} tests</p>
                      </div>
                      {getStatusBadge(b.status)}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 flex gap-6 mb-4 mt-2">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Target QTY</div>
                        <div className="text-gray-900 font-bold">{parseFloat(b.target_quantity || 0).toFixed(2)} <span className="text-xs font-normal text-gray-500 uppercase">{b.unit}</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Actual QTY</div>
                        <div className={`font-bold ${b.actual_quantity > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {parseFloat(b.actual_quantity || 0).toFixed(2)} <span className="text-xs font-normal text-gray-500 uppercase">{b.unit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                      {getActionButtons(b)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 text-center text-gray-400 rounded-xl border">No batches found matching the current criteria.</div>
            )}
          </div>
        </main>
        <Footer />
      </div>

      {/* Modal - Create Batch */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Create New Batch</h2>
            <p className="text-xs text-gray-500 mb-5">Batch code will be auto-generated</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Date</label>
                  <input type="date" value={form.batch_date} onChange={e => setForm({ ...form, batch_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Qty</label>
                  <input type="number" value={form.target_quantity} onChange={e => setForm({ ...form, target_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm">
                    <option value="kg">KG</option>
                    <option value="litre">Litre</option>
                  </select>
                </div>
              </div>

              {/* Raw Materials */}
              <div className="bg-gray-50 p-4 rounded-lg border mt-2">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-gray-700">Raw Materials Used</label>
                  <button onClick={addMaterialRow} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-xs font-bold transition">
                    + Add Row
                  </button>
                </div>
                <div className="space-y-2">
                  {batchMaterials.map((mat, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <select value={mat.material_id} onChange={e => updateMaterialRow(i, 'material_id', e.target.value)}
                        className="w-full sm:flex-[2] px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
                        <option value="">Select Material</option>
                        {materials.map(m => <option key={m.id} value={m.id}>{m.material_code} - {m.material_name}</option>)}
                      </select>
                      <div className="flex w-full sm:w-auto sm:flex-1 gap-2 items-center">
                        <input type="number" placeholder="Qty" value={mat.quantity_used} onChange={e => updateMaterialRow(i, 'quantity_used', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                        <span className="text-xs font-semibold text-gray-500 w-8">{mat.unit?.toUpperCase()}</span>
                      </div>
                      <div className="w-full sm:w-auto text-right">
                        {batchMaterials.length > 1 && (
                          <button onClick={() => removeMaterialRow(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition">
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-y text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 text-sm">
                {saving ? 'Creating...' : 'Create Batch'}
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
      <FaSpinner className="animate-spin text-red-500 text-4xl" />
    </div>
  );
}

export default function ManufacturingProcessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ManufacturingProcessContent />
    </Suspense>
  );
}