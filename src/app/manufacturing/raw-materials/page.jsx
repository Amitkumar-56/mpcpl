// src/app/manufacturing/raw-materials/page.js
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { FaBox, FaEdit, FaPlus, FaSearch, FaSpinner, FaTrash } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function RawMaterialsContent() {
  const router = useRouter();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({ material_name: '', category: 'type_a_raw', unit: 'kg', min_stock_level: 0, current_stock: 0, description: '' });

  useEffect(() => { fetchMaterials(); }, [search, filterCategory]);

  const fetchMaterials = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCategory) params.set('category', filterCategory);
      const res = await fetch(`/api/manufacturing/raw-materials?${params}`);
      const data = await res.json();
      if (data.success) setMaterials(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.material_name || !form.category) return alert('Material name and category required');
    setSaving(true);
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { ...form, id: editItem.id } : form;
      const res = await fetch('/api/manufacturing/raw-materials', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { setShowModal(false); setEditItem(null); setForm({ material_name: '', category: 'type_a_raw', unit: 'kg', min_stock_level: 0, current_stock: 0, description: '' }); fetchMaterials(); }
      else alert(data.error);
    } catch (err) { alert('Error saving'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this material?')) return;
    try {
      const res = await fetch(`/api/manufacturing/raw-materials?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchMaterials();
    } catch (err) { alert('Error deleting'); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ material_name: item.material_name, category: item.category, unit: item.unit, min_stock_level: item.min_stock_level, current_stock: item.current_stock, description: item.description || '' });
    setShowModal(true);
  };

  const getCategoryLabel = (cat) => cat === 'type_a_raw' ? 'Type-A (Raw)' : 'Other Raw';
  const getCategoryColor = (cat) => cat === 'type_a_raw' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <FaBox className="text-2xl" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Raw Materials</h1>
                    <p className="text-xs text-blue-100 mt-0.5">Manage raw material inventory</p>
                  </div>
                </div>
                <button onClick={() => { setEditItem(null); setForm({ material_name: '', category: 'type_a_raw', unit: 'kg', min_stock_level: 0, current_stock: 0, description: '' }); setShowModal(true); }}
                  className="bg-white text-blue-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2 text-sm shadow-md">
                  <FaPlus /> Add Material
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm min-w-[160px]">
                <option value="">All Categories</option>
                <option value="type_a_raw">Type-A (Raw)</option>
                <option value="other_raw">Other Raw</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {loading ? (
                <div className="p-12 text-center"><FaSpinner className="animate-spin text-blue-500 text-3xl mx-auto" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Code', 'Name', 'Category', 'Unit', 'Stock', 'Min Level', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {materials.length > 0 ? materials.map((m) => {
                        const isLow = m.current_stock <= m.min_stock_level && m.min_stock_level > 0;
                        return (
                          <tr key={m.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 font-semibold text-blue-600 whitespace-nowrap">{m.material_code}</td>
                            <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{m.material_name}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getCategoryColor(m.category)}`}>{getCategoryLabel(m.category)}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 uppercase whitespace-nowrap">{m.unit}</td>
                            <td className={`px-4 py-3 font-semibold whitespace-nowrap ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                              {parseFloat(m.current_stock).toFixed(2)} {isLow && <span className="text-xs text-red-500 ml-1">⚠ LOW</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{parseFloat(m.min_stock_level).toFixed(2)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {m.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button onClick={() => openEdit(m)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition"><FaEdit /></button>
                                <button onClick={() => handleDelete(m.id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition"><FaTrash /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={8} className="p-8 text-center text-gray-400">No raw materials found. Click "Add Material" to create one.</td></tr>
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

      {/* Modal - Add/Edit Material */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{editItem ? 'Edit Material' : 'Add New Material'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                <input value={form.material_name} onChange={e => setForm({ ...form, material_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                    <option value="type_a_raw">Type-A (Raw)</option>
                    <option value="other_raw">Other Raw</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                    <option value="kg">KG</option>
                    <option value="litre">Litre</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                  <input type="number" value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm">
                {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
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
      <FaSpinner className="animate-spin text-blue-500 text-4xl" />
    </div>
  );
}

export default function RawMaterialsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RawMaterialsContent />
    </Suspense>
  );
}