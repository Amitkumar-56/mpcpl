'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaPlus, FaTrash, FaBoxOpen,
  FaHistory, FaSpinner, FaSync, FaFilter, FaSearch, FaEdit, FaEye,
  FaChartBar, FaTruck, FaExchangeAlt, FaBarcode, FaMapMarkerAlt,
  FaUser, FaGasPump, FaLevelUpAlt, FaTint, FaWeight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';

function TankAllocationContent() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [filteredAllocations, setFilteredAllocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    tank_id: '',
    allocation_type: 'raw_material',
    allocated_to_type: 'branch',
    allocated_to_id: '',
    current_quantity_kg: '',
    current_quantity_litre: '',
    allocated_quantity_kg: '',
    allocated_quantity_litre: '',
    status: 'active',
    allocation_date: '',
    expiry_date: '',
    authorized_by: '',
    remarks: ''
  });

  const allocationTypes = [
    { value: 'raw_material', label: 'Raw Material', color: 'blue' },
    { value: 'finished_good', label: 'Finished Good', color: 'green' }
  ];

  const allocatedToTypes = [
    { value: 'branch', label: 'Branch', color: 'purple' },
    { value: 'production', label: 'Production Unit', color: 'blue' },
    { value: 'processing', label: 'Processing Unit', color: 'green' },
    { value: 'storage', label: 'Storage Facility', color: 'orange' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'red' },
    { value: 'maintenance', label: 'Under Maintenance', color: 'orange' },
    { value: 'reserved', label: 'Reserved', color: 'blue' },
    { value: 'empty', label: 'Empty', color: 'gray' }
  ];

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/tank-allocation');
      const data = await response.json();
      console.log('Allocations API response:', data);

      if (data.success) {
        const allocationsList = Array.isArray(data.data) ? data.data : [];
        setAllocations(allocationsList);
        setFilteredAllocations(allocationsList);
      } else {
        toast.error(data.error || 'Failed to fetch allocations');
        setAllocations([]);
        setFilteredAllocations([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Network error while fetching allocations');
      setAllocations([]);
      setFilteredAllocations([]);
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
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchAllocations();
    fetchTanks();
  }, [fetchAllocations, fetchTanks]);


  useEffect(() => {
    let filtered = allocations;

    if (searchTerm) {
      filtered = filtered.filter(allocation =>
        allocation.tank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allocation.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allocation.allocated_to_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allocation.authorized_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(allocation => allocation.status === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(allocation => allocation.allocation_type === filterType);
    }

    setFilteredAllocations(filtered);
  }, [allocations, searchTerm, filterStatus, filterType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tank_id || !formData.allocation_type) {
      return toast.error('Tank and allocation type are required');
    }

    try {
      setIsSubmitting(true);
      const selectedTank = tanks.find(t => t.id == formData.tank_id);

      const payload = {
        ...formData,
        allocated_to_type: 'production', // Default to internal production
        allocated_to_id: 1, // Default ID
        current_quantity_kg: selectedTank?.current_kg_stock || 0,
        current_quantity_litre: selectedTank?.current_litre_stock || 0,
        allocated_quantity_kg: selectedTank?.current_kg_stock || 0,
        allocated_quantity_litre: selectedTank?.current_litre_stock || 0,
        authorized_by: user?.name || 'System'
      };

      if (editingAllocation) {
        payload.id = editingAllocation.id;
      }

      const response = await fetch('/api/manufacturing/tank-allocation', {
        method: editingAllocation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingAllocation ? 'Allocation updated!' : 'Tank allocated successfully!');
        resetForm();
        fetchAllocations();
        fetchTanks();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tank_id: '',
      allocation_type: 'raw_material',
      status: 'active',
      remarks: ''
    });
    setEditingAllocation(null);
    setShowAddForm(false);
  };

  const handleEdit = (allocation) => {
    setEditingAllocation(allocation);
    setFormData({
      tank_id: allocation.tank_id || '',
      allocation_type: allocation.allocation_type || 'raw_material',
      status: allocation.status || 'active',
      remarks: allocation.remarks || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this allocation?')) return;

    try {
      const response = await fetch('/api/manufacturing/tank-allocation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Allocation deleted successfully!');
        fetchAllocations();
      } else {
        toast.error(data.error || 'Failed to delete allocation');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(s => s.value === status);
    return option ? option.color : 'gray';
  };

  const getTypeColor = (type) => {
    const option = allocationTypes.find(t => t.value === type);
    return option ? option.color : 'gray';
  };

  const getAllocatedToColor = (type) => {
    const option = allocatedToTypes.find(t => t.value === type);
    return option ? option.color : 'gray';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getTankInfo = (tankId) => {
    return tanks.find(t => t.id === tankId);
  };

  const getBranchInfo = (branchId) => {
    return branches.find(b => b.id === branchId);
  };

  const getTankUtilization = (currentKg, allocatedKg) => {
    if (!allocatedKg || allocatedKg === 0) return 0;
    return ((currentKg / allocatedKg) * 100).toFixed(1);
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans text-slate-900">
      <Toaster position="top-right" />

      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold">
                ← Home
              </Link>
              <div className="border-l border-slate-200 h-8"></div>
              <h1 className="text-xl font-bold text-slate-900">Tank Allocation</h1>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={fetchAllocations} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                <FaSync size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-700">{user?.name || 'User'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Header Area */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tank Allocation</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Material Flow & Tank Management</p>
            </div>
            <div className="flex gap-2">
              <Link href="/manufacturing/tank-transfer-history" className="flex items-center justify-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100">
                <FaHistory /> Transfer History
              </Link>
              <Link href="/manufacturing/all-stock" className="flex items-center justify-center gap-2 bg-slate-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-100">
                <FaChartBar /> All Stock
              </Link>
              <button onClick={() => setShowAddForm(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
                <FaPlus /> New Allocation
              </button>
              <button onClick={fetchAllocations} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
                <FaSync size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div
              onClick={() => setFilterType('all')}
              className={`cursor-pointer bg-white rounded-[2rem] p-6 border-2 transition-all ${filterType === 'all' ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-transparent shadow-sm hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <FaWarehouse size={20} />
                </div>
                <span className="text-2xl font-black text-slate-900">{allocations.length}</span>
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Allocations</div>
              <div className="text-xs font-bold text-blue-600 mt-1">View All Tanks</div>
            </div>

            <div
              onClick={() => setFilterType('raw_material')}
              className={`cursor-pointer bg-white rounded-[2rem] p-6 border-2 transition-all ${filterType === 'raw_material' ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-transparent shadow-sm hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <FaGasPump size={20} />
                </div>
                <span className="text-2xl font-black text-slate-900">
                  {allocations.filter(a => a.allocation_type === 'raw_material').length}
                </span>
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raw Materials</div>
              <div className="text-xs font-bold text-indigo-600 mt-1">Input Tanks</div>
            </div>

            <div
              onClick={() => setFilterType('finished_good')}
              className={`cursor-pointer bg-white rounded-[2rem] p-6 border-2 transition-all ${filterType === 'finished_good' ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-transparent shadow-sm hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                  <FaBoxOpen size={20} />
                </div>
                <span className="text-2xl font-black text-slate-900">
                  {allocations.filter(a => a.allocation_type === 'finished_good').length}
                </span>
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finished Goods</div>
              <div className="text-xs font-bold text-green-600 mt-1">Output Tanks</div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                  <FaChartBar size={20} />
                </div>
                <span className="text-2xl font-black text-slate-900">
                  {tanks.length - allocations.filter(a => a.status === 'active').length}
                </span>
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Tanks</div>
              <div className="text-xs font-bold text-orange-600 mt-1">Ready to Allocate</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4 sm:p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search allocations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                >
                  <option value="all">All Types</option>
                  {allocationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
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
                <span className="text-sm font-bold text-slate-600">Total: {filteredAllocations.length} allocations</span>
              </div>
            </div>
          </div>

          {/* Professional Allocations Table */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tank Info</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Physical Stock</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilization</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <FaSpinner className="animate-spin text-blue-600 text-2xl mx-auto" />
                      </td>
                    </tr>
                  ) : filteredAllocations.length > 0 ? (
                    filteredAllocations.map((allocation) => {
                      const tank = getTankInfo(allocation.tank_id) || { name: allocation.tank_name || 'Unknown Tank' };
                      const utilization = getTankUtilization(allocation.physical_kg_stock || allocation.current_quantity_kg, tank.capacity_kg);

                      return (
                        <tr key={allocation.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <FaGasPump size={18} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{tank.name || allocation.tank_name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: T-{allocation.tank_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-${getTypeColor(allocation.allocation_type)}-100 text-${getTypeColor(allocation.allocation_type)}-700 border border-${getTypeColor(allocation.allocation_type)}-200`}>
                                {allocationTypes.find(t => t.value === allocation.allocation_type)?.label || 'Other'}
                              </span>

                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <FaWeight size={10} className="text-slate-400" />
                                <span className="text-sm font-bold text-slate-700">{(allocation.physical_kg_stock ?? allocation.current_quantity_kg) || 0}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">KG</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FaTint size={10} className="text-slate-400" />
                                <span className="text-sm font-bold text-slate-700">{(allocation.physical_litre_stock ?? allocation.current_quantity_litre) || 0}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">LTR</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-32">
                              <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Usage</span>
                                <span className="text-[9px] font-bold text-slate-700">{utilization}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-${parseFloat(utilization) > 80 ? 'red' : 'blue'}-500`}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-${getStatusColor(allocation.status)}-100 text-${getStatusColor(allocation.status)}-700 border border-${getStatusColor(allocation.status)}-200`}>
                              {allocation.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setShowHistoryModal(allocation)} title="View Logs" className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                <FaHistory size={14} />
                              </button>
                              <button onClick={() => handleEdit(allocation)} title="Edit" className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                <FaEdit size={14} />
                              </button>
                              <button onClick={() => handleDelete(allocation.id)} title="Delete" className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-20 text-center">
                        <div className="text-slate-300 text-5xl mb-4">📭</div>
                        <div className="text-slate-500 font-bold">No Allocations Found</div>
                        <div className="text-slate-400 text-xs mt-1">Start by creating a new tank allocation</div>
                        <button onClick={() => setShowAddForm(true)} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                          Create Allocation
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAllocation ? 'Edit Allocation' : 'Create New Allocation'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>

            {/* Selected Tank Physical Stock Info */}
            {formData.tank_id && (
              <div className="mb-6 bg-blue-50/50 rounded-3xl p-6 border border-blue-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Current Physical Stock</div>
                  <div className="flex gap-4">
                    {(() => {
                      const selectedTank = tanks.find(t => t.id == formData.tank_id);
                      return (
                        <>
                          <div>
                            <span className="text-xl font-black text-slate-900">{selectedTank?.current_kg_stock || 0}</span>
                            <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">KG</span>
                          </div>
                          <div className="border-l border-blue-100 h-8 mx-2"></div>
                          <div>
                            <span className="text-xl font-black text-slate-900">{selectedTank?.current_litre_stock || 0}</span>
                            <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">LTR</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
                  <FaWarehouse size={20} />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Tank *</label>
                  <select
                    name="tank_id"
                    value={formData.tank_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                    required
                  >
                    <option value="">-- Select Tank --</option>
                    {tanks.map(tank => (
                      <option key={tank.id} value={tank.id}>
                        {tank.name || tank.tank_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Allocation Type *</label>
                  <select
                    name="allocation_type"
                    value={formData.allocation_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                    required
                  >
                    {allocationTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>




                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
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
                  {editingAllocation ? 'Commit Update' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Allocation History</h2>
              <button onClick={() => setShowHistoryModal(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="font-bold text-slate-900">{getTankInfo(showHistoryModal.tank_id)?.name || showHistoryModal.tank_name || 'Unknown Tank'}</div>
              <div className="text-sm text-slate-600">{showHistoryModal.material_name || 'No material'}</div>
            </div>

            <div className="text-center py-8">
              <div className="text-slate-400 text-4xl mb-4">📋</div>
              <div className="text-slate-600 font-medium mb-2">No history available</div>
              <div className="text-slate-400 text-sm">Transfer history will be shown here</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TankAllocationPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}>
      <TankAllocationContent />
    </Suspense>
  );
}
