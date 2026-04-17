// src/app/manufacturing/finished-goods/page.js
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { FaEdit, FaIndustry, FaPlus, FaSearch, FaSpinner } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function FinishedGoodsContent() {
  const router = useRouter();
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_name: '', category: '', unit: 'kg', current_stock: 0, description: '' });

  useEffect(() => { fetchGoods(); }, [search]);

  const fetchGoods = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/manufacturing/finished-goods?${params}`);
      const data = await res.json();
      if (data.success) setGoods(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.product_name) return alert('Product name is required');
    setSaving(true);
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { ...form, id: editItem.id } : form;
      const res = await fetch('/api/manufacturing/finished-goods', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { setShowModal(false); setEditItem(null); setForm({ product_name: '', category: '', unit: 'kg', current_stock: 0, description: '' }); fetchGoods(); }
      else alert(data.error);
    } catch (err) { alert('Error saving'); }
    finally { setSaving(false); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ product_name: item.product_name, category: item.category || '', unit: item.unit, current_stock: item.current_stock, description: item.description || '' });
    setShowModal(true);
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <FaIndustry className="text-2xl" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Finished Goods</h1>
                    <p className="text-xs text-emerald-100 mt-0.5">Manage finished products inventory</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditItem(null); setForm({ product_name: '', category: '', unit: 'kg', current_stock: 0, description: '' }); setShowModal(true); }}
                  className="bg-white text-emerald-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2 text-sm shadow-md"
                >
                  <FaPlus /> Add Product
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            {/* Search */}
            <div className="relative max-w-md mb-6">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input 
                placeholder="Search finished goods..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full flex justify-center py-12">
                  <FaSpinner className="animate-spin text-emerald-500 text-3xl" />
                </div>
              ) : goods.length > 0 ? (
                goods.map((g) => (
                  <div key={g.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">{g.product_code}</span>
                        <h3 className="text-base font-bold text-gray-800 mt-2 mb-1">{g.product_name}</h3>
                        {g.category && <p className="text-xs text-gray-500">{g.category}</p>}
                      </div>
                      <button onClick={() => openEdit(g)} className="bg-emerald-50 text-emerald-600 p-2 rounded-lg hover:bg-emerald-100 transition">
                        <FaEdit />
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-bold text-gray-800">{parseFloat(g.current_stock).toFixed(2)}</div>
                        <div className="text-xs text-gray-500 uppercase">{g.unit} in stock</div>
                      </div>
                      {g.batch_code && (
                        <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-lg">Batch: {g.batch_code}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-white rounded-xl p-12 text-center text-gray-400 border">No finished goods found</div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editItem ? 'Edit Product' : 'Add Finished Good'}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Product Name *</label>
                <input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="kg">KG</option>
                    <option value="litre">Litre</option>
                    <option value="pcs">Pieces</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>
              {editItem && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Current Stock</label>
                  <input type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-semibold disabled:opacity-50">
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
      <FaSpinner className="animate-spin text-emerald-500 text-4xl" />
    </div>
  );
}

export default function FinishedGoodsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FinishedGoodsContent />
    </Suspense>
  );
}