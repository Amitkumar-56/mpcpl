'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaFlask, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaPlus, FaTrash, FaBoxOpen,
  FaVial, FaHistory, FaSpinner, FaMicrochip, FaTools, FaSync,
  FaFilter, FaSearch, FaEdit, FaEye, FaChartBar, FaTruck,
  FaExchangeAlt, FaBarcode, FaMapMarkerAlt, FaUser,
  FaRecycle, FaOilCan, FaLeaf
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function FinishedGoodsContent() {
  const [mounted, setMounted] = useState(false);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [filteredFinishedGoods, setFilteredFinishedGoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(null);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    product_name: '',
    category: 'waste_material',
    quantity_kg: '',
    quantity_litre: '',
    tank_id: '',
    batch_number: '',
    production_date: '',
    expiry_date: '',
    quality_grade: 'A',
    source_raw_materials: [],
    processing_method: '',
    storage_location: '',
    remarks: ''
  });

  // Transfer form state
  const [transferData, setTransferData] = useState({
    from_tank_id: '',
    to_tank_id: '',
    quantity_kg: '',
    quantity_litre: '',
    transfer_reason: '',
    authorized_by: ''
  });

  const categories = [
    { value: 'waste_material', label: 'Waste Material', color: 'red', icon: FaRecycle },
    { value: 'grease', label: 'Grease', color: 'orange', icon: FaOilCan },
    { value: 'bio_diesel', label: 'Bio-Diesel', color: 'green', icon: FaLeaf },
    { value: 'by_product', label: 'By-Product', color: 'purple', icon: FaFlask },
    { value: 'recycled_product', label: 'Recycled Product', color: 'blue', icon: FaRecycle }
  ];

  const qualityGrades = [
    { value: 'A', label: 'Grade A (Premium)', color: 'green' },
    { value: 'B', label: 'Grade B (Standard)', color: 'blue' },
    { value: 'C', label: 'Grade C (Economy)', color: 'orange' },
    { value: 'D', label: 'Grade D (Reject)', color: 'red' }
  ];

  const statusOptions = [
    { value: 'available', label: 'Available', color: 'green' },
    { value: 'allocated', label: 'Allocated', color: 'blue' },
    { value: 'reserved', label: 'Reserved', color: 'orange' },
    { value: 'disposed', label: 'Disposed', color: 'red' },
    { value: 'processing', label: 'Processing', color: 'purple' }
  ];

  const fetchFinishedGoods = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/finished-goods');
      const data = await response.json();
      setFinishedGoods(Array.isArray(data) ? data : []);
      setFilteredFinishedGoods(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch finished goods');
      setFinishedGoods([]);
      setFilteredFinishedGoods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTanks = useCallback(async () => {
    try {
      const response = await fetch('/api/manufacturing/tank-allocation?view=tanks');
      const data = await response.json();
      if (data.success) {
        setTanks(data.data);
      } else {
        toast.error('Failed to fetch tank allocations');
      }
    } catch (error) {
      toast.error('Failed to fetch tanks');
      setTanks([]);
    }
  }, []);

  useEffect(() => { 
    setMounted(true);
    fetchFinishedGoods();
    fetchTanks();
  }, [fetchFinishedGoods, fetchTanks]);

  useEffect(() => {
    let filtered = finishedGoods;
    
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.storage_location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(product => product.category === filterCategory);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(product => product.status === filterStatus);
    }
    
    setFilteredFinishedGoods(filtered);
  }, [finishedGoods, searchTerm, filterCategory, filterStatus]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTransferInputChange = (e) => {
    const { name, value } = e.target;
    setTransferData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name || (!formData.quantity_kg && !formData.quantity_litre) || !formData.tank_id) {
      return toast.error('Product name, quantity, and tank are required');
    }

    try {
      setIsSubmitting(true);
      const url = editingProduct ? '/api/manufacturing/finished-goods' : '/api/manufacturing/finished-goods';
      const method = editingProduct ? 'PUT' : 'POST';
      const payload = editingProduct ? { ...formData, id: editingProduct.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
        resetForm();
        fetchFinishedGoods();
      } else {
        toast.error(data.error || 'Failed to save product');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.from_tank_id || !transferData.to_tank_id || (!transferData.quantity_kg && !transferData.quantity_litre)) {
      return toast.error('Source tank, destination tank, and quantity are required');
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/finished-goods-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transferData, product_id: showTransferModal.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Transfer completed successfully!');
        setShowTransferModal(null);
        setTransferData({
          from_tank_id: '',
          to_tank_id: '',
          quantity_kg: '',
          quantity_litre: '',
          transfer_reason: '',
          authorized_by: ''
        });
        fetchFinishedGoods();
      } else {
        toast.error(data.error || 'Transfer failed');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      category: 'waste_material',
      quantity_kg: '',
      quantity_litre: '',
      tank_id: '',
      batch_number: '',
      production_date: '',
      expiry_date: '',
      quality_grade: 'A',
      source_raw_materials: [],
      processing_method: '',
      storage_location: '',
      remarks: ''
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name || '',
      category: product.category || 'waste_material',
      quantity_kg: product.quantity_kg || '',
      quantity_litre: product.quantity_litre || '',
      tank_id: product.tank_id || '',
      batch_number: product.batch_number || '',
      production_date: product.production_date || '',
      expiry_date: product.expiry_date || '',
      quality_grade: product.quality_grade || 'A',
      source_raw_materials: product.source_raw_materials || [],
      processing_method: product.processing_method || '',
      storage_location: product.storage_location || '',
      remarks: product.remarks || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch('/api/manufacturing/finished-goods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Product deleted successfully!');
        fetchFinishedGoods();
      } else {
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getCategoryColor = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.color : 'gray';
  };

  const getQualityColor = (grade) => {
    const quality = qualityGrades.find(g => g.value === grade);
    return quality ? quality.color : 'gray';
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(s => s.value === status);
    return option ? option.color : 'gray';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    const Icon = cat ? cat.icon : FaBoxOpen;
    return <Icon size={16} />;
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
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Finished Goods</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waste Materials, Grease & Bio-Diesel</p>
               </div>
               <div className="flex gap-2">
                 <Link href="/manufacturing/all-stock" className="flex items-center justify-center gap-2 bg-slate-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-100">
                    <FaChartBar /> All Stock
                 </Link>
                 <Link href="/manufacturing/production-history" className="flex items-center justify-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100">
                    <FaHistory /> Production Log
                 </Link>
                 <button onClick={() => setShowAddForm(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
                    <FaPlus /> Add Product
                 </button>
                 <button onClick={fetchFinishedGoods} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
                    <FaSync size={12} className={loading ? 'animate-spin' : ''} />
                 </button>
               </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4 sm:p-6 mb-6">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                     <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                     <input
                        type="text"
                        placeholder="Search products..."
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
                  <div className="relative">
                     <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                     <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                     >
                        <option value="all">All Status</option>
                        {statusOptions.map(status => (
                           <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                     </select>
                  </div>
                  <div className="flex items-center justify-center bg-slate-50 rounded-xl px-4">
                     <span className="text-sm font-bold text-slate-600">Total: {filteredFinishedGoods.length} products</span>
                  </div>
               </div>
            </div>

            {/* Products List (Table) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-8">
               {loading ? (
                  <div className="py-24 text-center">
                     <FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto mb-4" />
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fetching products...</p>
                  </div>
               ) : filteredFinishedGoods.length > 0 ? (
                  <div className="overflow-x-auto no-scrollbar">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-slate-50/50 border-b border-slate-100">
                              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Details</th>
                              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category & Grade</th>
                              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock Level</th>
                              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Storage & Status</th>
                              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {filteredFinishedGoods.map((product) => {
                              const categoryObj = categories.find(c => c.value === product.category);
                              const qualityObj = qualityGrades.find(g => g.value === product.quality_grade);
                              const statusObj = statusOptions.find(s => s.value === product.status);

                              return (
                                 <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${categoryObj?.color || 'slate'}-50 text-${categoryObj?.color || 'slate'}-600 shadow-sm`}>
                                             {getCategoryIcon(product.category)}
                                          </div>
                                          <div>
                                             <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{product.product_name}</div>
                                             <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                <FaBarcode size={8} /> {product.batch_number || 'NO-BATCH'}
                                             </div>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col gap-1">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-${categoryObj?.color || 'slate'}-50 text-${categoryObj?.color || 'slate'}-600 border border-${categoryObj?.color || 'slate'}-100 w-fit`}>
                                             {categoryObj?.label || 'Other'}
                                          </span>
                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                             Quality: <span className={`text-${qualityObj?.color || 'slate'}-600`}>{qualityObj?.label || 'Standard'}</span>
                                          </span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col gap-1">
                                          <div className="text-[10px] font-black text-slate-900">{parseFloat(product.quantity_kg).toLocaleString()} KG</div>
                                          <div className="text-[8px] font-bold text-slate-400">{parseFloat(product.quantity_litre).toLocaleString()} LTR</div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
                                             <FaWarehouse size={10} className="text-blue-500" />
                                             {tanks.find(t => t.id === product.tank_id)?.name || 'Unknown'}
                                          </div>
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-${statusObj?.color || 'slate'}-50 text-${statusObj?.color || 'slate'}-600 border border-${statusObj?.color || 'slate'}-100 w-fit`}>
                                             {statusObj?.label || 'Unknown'}
                                          </span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center justify-center gap-2">
                                          <button 
                                             onClick={() => setShowTransferModal(product)} 
                                             title="Transfer Stock"
                                             className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                          >
                                             <FaExchangeAlt size={12} />
                                          </button>
                                          <button 
                                             onClick={() => handleEdit(product)} 
                                             title="Edit Product"
                                             className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                          >
                                             <FaEdit size={12} />
                                          </button>
                                          <button 
                                             onClick={() => handleDelete(product.id)} 
                                             title="Delete Product"
                                             className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                          >
                                             <FaTrash size={12} />
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               ) : (
                  <div className="py-24 text-center">
                     <div className="text-slate-100 text-7xl mb-6 flex justify-center"><FaBoxOpen /></div>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">No finished goods found</p>
                     <button onClick={() => setShowAddForm(true)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                        Add Your First Product
                     </button>
                  </div>
               )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <div className="bg-[#F8FAFF] py-6 border-t border-slate-100">
           <Footer />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Product Name *</label>
                  <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
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
                    <option value="">-- Select Storage Tank --</option>
                    {tanks.filter(t => t.allocations?.some(a => a.allocation_type === 'finished_good' || a.allocation_type === 'by_product')).map(t => {
                       const activeAlloc = t.allocations?.find(a => a.allocation_type === 'finished_good' || a.allocation_type === 'by_product');
                       return (
                          <option key={t.id} value={t.id}>
                             {t.tank_name} - {activeAlloc?.finished_good_name || 'Allocated for FG'} ({t.current_kg_stock || 0} KG)
                          </option>
                       );
                    })}
                    <option disabled>──────────</option>
                    <option value="other">-- Other Tank (Not Allocated) --</option>
                    {tanks.filter(t => !t.allocations || t.allocations.length === 0).map(t => (
                       <option key={t.id} value={t.id}>{t.tank_name} (Free)</option>
                    ))}
                  </select>
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
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Production Date</label>
                  <input
                    type="date"
                    name="production_date"
                    value={formData.production_date}
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
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Quality Grade</label>
                  <select
                    name="quality_grade"
                    value={formData.quality_grade}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                  >
                    {qualityGrades.map(grade => (
                      <option key={grade.value} value={grade.value}>{grade.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Processing Method</label>
                  <input
                    type="text"
                    name="processing_method"
                    value={formData.processing_method}
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
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Transfer Product</h2>
              <button onClick={() => setShowTransferModal(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="font-bold text-slate-900">{showTransferModal.product_name}</div>
              <div className="text-sm text-slate-600">Current: {tanks.find(t => t.id === showTransferModal.tank_id)?.name || 'Unknown'}</div>
            </div>
            
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">From Tank *</label>
                  <select
                    name="from_tank_id"
                    value={transferData.from_tank_id}
                    onChange={handleTransferInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                    required
                  >
                    <option value="">-- Select Source Tank --</option>
                    {tanks.filter(t => t.id === showTransferModal.tank_id).map(tank => (
                      <option key={tank.id} value={tank.id}>{tank.name} (Current)</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">To Tank *</label>
                  <select
                    name="to_tank_id"
                    value={transferData.to_tank_id}
                    onChange={handleTransferInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                    required
                  >
                    <option value="">-- Select Destination Tank --</option>
                    {tanks.filter(t => t.id !== showTransferModal.tank_id).map(tank => (
                      <option key={tank.id} value={tank.id}>{tank.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Quantity (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="quantity_kg"
                    value={transferData.quantity_kg}
                    onChange={handleTransferInputChange}
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
                    value={transferData.quantity_litre}
                    onChange={handleTransferInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Transfer Reason</label>
                  <input
                    type="text"
                    name="transfer_reason"
                    value={transferData.transfer_reason}
                    onChange={handleTransferInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                    placeholder="Reason for transfer..."
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Authorized By</label>
                  <input
                    type="text"
                    name="authorized_by"
                    value={transferData.authorized_by}
                    onChange={handleTransferInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                    placeholder="Authorizing person..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTransferModal(null)} className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <FaSpinner className="animate-spin" /> : null}
                  Transfer Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinishedGoodsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <FinishedGoodsContent />
    </Suspense>
  );
}
