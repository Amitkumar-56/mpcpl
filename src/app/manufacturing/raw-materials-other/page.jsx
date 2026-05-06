'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaFlask, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaPlus, FaTrash, FaBoxOpen,
  FaVial, FaHistory, FaSpinner, FaMicrochip, FaTools, FaSync,
  FaFilter, FaSearch, FaEdit, FaEye, FaChartBar
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';

function RawMaterialsOtherContent() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    material_name: '',
    category: 'methanol',
    quantity_kg: '',
    quantity_litre: '',
    tank_id: '',
    supplier_name: '',
    storage_location: '',
    batch_number: '',
    expiry_date: '',
    remarks: ''
  });

  const categories = [
    { value: 'methanol', label: 'Methanol', color: 'blue' },
    { value: 'chemical', label: 'Chemical', color: 'purple' },
    { value: 'additive', label: 'Additive', color: 'green' },
    { value: 'catalyst', label: 'Catalyst', color: 'orange' },
    { value: 'other', label: 'Other', color: 'gray' }
  ];

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/raw-materials-other');
      const data = await response.json();
      setMaterials(Array.isArray(data) ? data : []);
      setFilteredMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch materials');
      setMaterials([]);
      setFilteredMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTanks = useCallback(async () => {
    try {
      const response = await fetch('/api/manufacturing/tanks');
      const data = await response.json();
      setTanks(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch tanks');
      setTanks([]);
    }
  }, []);

  useEffect(() => { 
    setMounted(true);
    fetchMaterials();
    fetchTanks();
  }, [fetchMaterials, fetchTanks]);

  useEffect(() => {
    let filtered = materials;
    
    if (searchTerm) {
      filtered = filtered.filter(material => 
        material.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(material => material.category === filterCategory);
    }
    
    setFilteredMaterials(filtered);
  }, [materials, searchTerm, filterCategory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.material_name || (!formData.quantity_kg && !formData.quantity_litre) || !formData.tank_id) {
      return toast.error('Material name, quantity, and tank are required');
    }

    try {
      setIsSubmitting(true);
      const url = editingMaterial ? '/api/manufacturing/raw-materials-other' : '/api/manufacturing/raw-materials-other';
      const method = editingMaterial ? 'PUT' : 'POST';
      const payload = editingMaterial ? { ...formData, id: editingMaterial.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingMaterial ? 'Material updated successfully!' : 'Material added successfully!');
        resetForm();
        fetchMaterials();
      } else {
        toast.error(data.error || 'Failed to save material');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      material_name: '',
      category: 'methanol',
      quantity_kg: '',
      quantity_litre: '',
      tank_id: '',
      supplier_name: '',
      storage_location: '',
      batch_number: '',
      expiry_date: '',
      remarks: ''
    });
    setEditingMaterial(null);
    setShowAddForm(false);
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      material_name: material.material_name || '',
      category: material.category || 'methanol',
      quantity_kg: material.quantity_kg || '',
      quantity_litre: material.quantity_litre || '',
      tank_id: material.tank_id || '',
      supplier_name: material.supplier_name || '',
      storage_location: material.storage_location || '',
      batch_number: material.batch_number || '',
      expiry_date: material.expiry_date || '',
      remarks: material.remarks || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    try {
      const response = await fetch('/api/manufacturing/raw-materials-other', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Material deleted successfully!');
        fetchMaterials();
      } else {
        toast.error(data.error || 'Failed to delete material');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getCategoryColor = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.color : 'gray';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-48">
          <div className="max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Raw Materials - Other</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Methanol & Chemical Inventory</p>
               </div>
               <div className="flex gap-2">
                 <Link href="/manufacturing/all-stock" className="flex items-center justify-center gap-2 bg-slate-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-100">
                    <FaChartBar /> All Stock
                 </Link>
                 <button onClick={() => setShowAddForm(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
                    <FaPlus /> Add Material
                 </button>
                 <button onClick={fetchMaterials} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
                    <FaSync size={12} className={loading ? 'animate-spin' : ''} />
                 </button>
               </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4 sm:p-6 mb-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                     <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                     <input
                        type="text"
                        placeholder="Search materials..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                     />
                  </div>
                  <div className="relative">
                     <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                     <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                     >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                           <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                     </select>
                  </div>
                  <div className="flex items-center justify-center bg-slate-50 rounded-xl px-4">
                     <span className="text-sm font-bold text-slate-600">Total: {filteredMaterials.length} items</span>
                  </div>
               </div>
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {loading ? (
                  <div className="col-span-full flex justify-center py-12">
                     <FaSpinner className="animate-spin text-blue-600 text-2xl" />
                  </div>
               ) : filteredMaterials.length > 0 ? (
                  filteredMaterials.map((material) => (
                     <div key={material.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 hover:shadow-lg transition-all">
                        <div className="flex items-start justify-between mb-4">
                           <div className="flex-1">
                              <h3 className="font-bold text-slate-900 text-lg mb-1">{material.material_name}</h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-${getCategoryColor(material.category)}-100 text-${getCategoryColor(material.category)}-800 border border-${getCategoryColor(material.category)}-200`}>
                                 {categories.find(c => c.value === material.category)?.label || 'Other'}
                              </span>
                           </div>
                           <div className="flex gap-2">
                              <button onClick={() => handleEdit(material)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                 <FaEdit size={12} />
                              </button>
                              <button onClick={() => handleDelete(material.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                                 <FaTrash size={12} />
                              </button>
                           </div>
                        </div>
                        
                        <div className="space-y-3">
                           <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-50 rounded-xl p-3">
                                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weight (KG)</div>
                                 <div className="font-bold text-slate-900">{material.quantity_kg || '0'}</div>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3">
                                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume (LTR)</div>
                                 <div className="font-bold text-slate-900">{material.quantity_litre || '0'}</div>
                              </div>
                           </div>
                           
                           {material.tank_id && (
                              <div className="bg-blue-50 rounded-xl p-3">
                                 <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Storage Tank</div>
                                 <div className="font-bold text-blue-900">{tanks.find(t => t.id === material.tank_id)?.name || 'Unknown'}</div>
                              </div>
                           )}
                           
                           {material.supplier_name && (
                              <div className="bg-green-50 rounded-xl p-3">
                                 <div className="text-[9px] font-bold text-green-400 uppercase tracking-widest mb-1">Supplier</div>
                                 <div className="font-bold text-green-900">{material.supplier_name}</div>
                              </div>
                           )}
                           
                           {material.batch_number && (
                              <div className="bg-purple-50 rounded-xl p-3">
                                 <div className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1">Batch Number</div>
                                 <div className="font-bold text-purple-900">{material.batch_number}</div>
                              </div>
                           )}
                           
                           {material.expiry_date && (
                              <div className="bg-orange-50 rounded-xl p-3">
                                 <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Expiry Date</div>
                                 <div className="font-bold text-orange-900">{formatDate(material.expiry_date)}</div>
                              </div>
                           )}
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="col-span-full text-center py-12">
                     <div className="text-slate-400 text-4xl mb-4">📦</div>
                     <div className="text-slate-600 font-medium mb-2">No materials found</div>
                     <div className="text-slate-400 text-sm mb-4">Add your first raw material to get started</div>
                     <button onClick={() => setShowAddForm(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm">
                        Add Material
                     </button>
                  </div>
               )}
            </div>
          </div>
        </main>
        
        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
           <Footer />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Material Name *</label>
                  <input
                    type="text"
                    name="material_name"
                    value={formData.material_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Quantity (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="quantity_kg"
                    value={formData.quantity_kg}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Quantity (LTR)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="quantity_litre"
                    value={formData.quantity_litre}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Storage Tank *</label>
                  <select
                    name="tank_id"
                    value={formData.tank_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                    required
                  >
                    <option value="">-- Select Tank --</option>
                    {tanks.map(tank => (
                      <option key={tank.id} value={tank.id}>{tank.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Supplier Name</label>
                  <input
                    type="text"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Batch Number</label>
                  <input
                    type="text"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Expiry Date</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Storage Location</label>
                  <input
                    type="text"
                    name="storage_location"
                    value={formData.storage_location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all resize-none"
                    rows="3"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <FaSpinner className="animate-spin" /> : null}
                  {editingMaterial ? 'Update Material' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RawMaterialsOtherPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <RawMaterialsOtherContent />
    </Suspense>
  );
}
