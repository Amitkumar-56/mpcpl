'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import React from 'react';
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

export default function SuppliersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false,
    can_create: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  
  const toggleSupplierLogs = (supplierId) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId]
    }));
  };

  // Check permissions first
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true, can_create: true });
      fetchSuppliers();
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['Suppliers']) {
      const supplierPerms = user.permissions['Suppliers'];
      if (supplierPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: supplierPerms.can_view,
          can_edit: supplierPerms.can_edit,
          can_delete: supplierPerms.can_delete,
          can_create: supplierPerms.can_create || false
        });
        fetchSuppliers();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Suppliers`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchSuppliers();
        return;
      }
    }

    try {
      const moduleName = 'Suppliers';
      const [viewRes, editRes, deleteRes, createRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`)
      ]);

      const [viewData, editData, deleteData, createData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        deleteRes.json(),
        createRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed,
        can_create: createData.allowed || false
      };

      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        fetchSuppliers();
      } else {
        setHasPermission(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setLoading(false);
    }
  };

  // Form data aligned with API
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    postbox: '',
    email: '',
    picture: '',
    gstin: '',
    pan: '',
    supplier_type: '',
    status: 'active',
    password: ''
  });

  // Stats state
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeSuppliers: 0
  });

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suppliers');
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      const data = await response.json();
      setSuppliers(data);
      setStats(calculateStats(data));
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  // Calculate stats from supplier data
  const calculateStats = (suppliersData) => {
    // Handle both integer (1/0) and string ('active'/'inactive') status values
    const activeSuppliers = suppliersData.filter(s => {
      const status = s.status;
      return status === 1 || status === '1' || status === 'active' || status === 'Active';
    }).length;
    const totalOutstanding = suppliersData.reduce((sum, supplier) => sum + (supplier.outstandingBalance || 0), 0);
    
    return {
      totalCustomers: suppliersData.length,
      activeSuppliers
    };
  };


  // ✅ FIX: Generate purchase history function
  const generatePurchaseHistory = (supplierId) => {
    // Mock purchase history data - replace with actual API call if needed
    return [
      {
        id: 1,
        date: new Date(),
        invoiceNo: `INV-${supplierId}-001`,
        description: 'Purchase Order',
        items: ['Item 1', 'Item 2'],
        amount: 50000,
        status: 'completed',
        paymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        invoiceNo: `INV-${supplierId}-002`,
        description: 'Purchase Order',
        items: ['Item 3'],
        amount: 30000,
        status: 'pending',
        paymentDue: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      }
    ];
  };

  // Load purchase history
  const loadPurchaseHistory = (supplier) => {
    setSelectedSupplier(supplier);
    const history = generatePurchaseHistory(supplier.id);
    setPurchaseHistory(history);
    setShowPurchaseHistory(true);
  };

  // Removed duplicate useEffect - fetchSuppliers is now called from checkPermissions

  // Add new supplier via API
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    
    if (submitting) return; // Prevent double submission
    
    // Validate required fields
    if (!formData.name || !formData.pan || !formData.supplier_type || !formData.password) {
      alert('Please fill in all required fields: Name, PAN, Supplier Type, and Password');
      return;
    }

    // Check if status is set
    if (!formData.status) {
      formData.status = 'active';
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone?.trim() || '',
        address: formData.address?.trim() || '',
        postbox: formData.postbox?.trim() || '',
        email: formData.email?.trim() || '',
        picture: formData.picture?.trim() || '',
        gstin: formData.gstin?.trim() || '',
        pan: formData.pan.trim(),
        supplier_type: formData.supplier_type.trim(),
        status: formData.status || 'active',
        password: formData.password
      };

      console.log('Submitting supplier:', payload);

      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || data.details || `Failed to create supplier: ${response.status} ${response.statusText}`);
      }

      const newSupplier = data;
      console.log('Supplier created:', newSupplier);
      
      // Refresh suppliers list
      await fetchSuppliers();
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        address: '',
        postbox: '',
        email: '',
        picture: '',
        gstin: '',
        pan: '',
        supplier_type: '',
        status: 'active',
        password: ''
      });
      setShowForm(false);
      
      alert('✅ Supplier created successfully!');
    } catch (error) {
      console.error('Error creating supplier:', error);
      alert(`❌ Error: ${error.message}\n\nPlease check console for details.`);
    } finally {
      setSubmitting(false);
    }
  };


  // Toggle supplier status
  const toggleSupplierStatus = async (id) => {
    if (!permissions.can_edit) {
      alert('You do not have permission to change supplier status.');
      return;
    }

    // Find the supplier
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) {
      alert('Supplier not found');
      return;
    }

    // Determine new status (toggle between active/inactive)
    // Handle both integer (1/0) and string ('active'/'inactive') status values
    const currentStatus = supplier.status;
    const isCurrentlyActive = currentStatus === 1 || currentStatus === '1' || currentStatus === 'active' || currentStatus === 'Active';
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    const newStatusValue = isCurrentlyActive ? 0 : 1; // For API

    // Confirm action
    const confirmMessage = isCurrentlyActive 
      ? `Are you sure you want to deactivate ${supplier.name}?`
      : `Are you sure you want to activate ${supplier.name}?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Call API to update status
      const response = await fetch(`/api/suppliers?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update supplier status');
      }

      // Update local state
      const updatedSuppliers = suppliers.map(s => 
        s.id === id 
          ? { ...s, status: newStatus }
          : s
      );
      setSuppliers(updatedSuppliers);
      setStats(calculateStats(updatedSuppliers));

      alert(`✅ Supplier status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating supplier status:', error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter suppliers based on search and status
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.gstin?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && (supplier.status === 1 || supplier.status === '1' || supplier.status === 'active' || supplier.status === 'Active')) ||
      (statusFilter === 'inactive' && (supplier.status === 0 || supplier.status === '0' || supplier.status === 'inactive' || supplier.status === 'Inactive'));
    return matchesSearch && matchesStatus;
  });

  // Color scheme for different status
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    shipped: 'bg-blue-100 text-blue-800'
  };

  // Show access denied if no permission
  if (!authLoading && user && !hasPermission) {
    return (
      <div className="flex min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center max-w-2xl mx-auto">
              <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600 text-sm sm:text-base">You do not have permission to view suppliers.</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <Header />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Supplier Management</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your suppliers and track purchases</p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64 transition-all text-sm sm:text-base"
                />
                <div className="absolute left-3 top-2.5 sm:top-3.5 text-gray-400">
                  🔍
                </div>
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base w-full sm:w-auto"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link
                href="/suppliers/activity-logs"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-cyan-700 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md w-full lg:w-auto text-sm sm:text-base"
              >
                <span>📋</span>
                <span>Activity Logs</span>
              </Link>
                    {permissions.can_create && (
                      <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md w-full lg:w-auto text-sm sm:text-base"
                      >
                        <span className="text-lg">+</span>
                        <span>{showForm ? 'Cancel' : 'Add New Supplier'}</span>
                      </button>
                    )}
            </div>
          </div>

          {/* Add Supplier Form */}
          {showForm && (
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-4 sm:mb-6 border border-gray-200 animate-fade-in">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Add New Supplier</h2>
              <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: 'Supplier Name *', name: 'name', type: 'text', required: true },
                  { label: 'Phone', name: 'phone', type: 'tel', required: false },
                  { label: 'Email', name: 'email', type: 'email', required: false },
                  { label: 'GSTIN *', name: 'gstin', type: 'text', required: true },
                  { label: 'PAN Number *', name: 'pan', type: 'text', required: true },
                  { label: 'Supplier Type *', name: 'supplier_type', type: 'text', required: true },
                  { label: 'Password *', name: 'password', type: 'password', required: true },
                  { label: 'Postbox', name: 'postbox', type: 'text', required: false },
                  { label: 'Picture URL', name: 'picture', type: 'text', required: false },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">{field.label}</label>
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required={field.required}
                    />
                  </div>
                ))}
                
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Adding...' : 'Add Supplier'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Dashboard Cards - Enhanced Modern Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
            {[
              { title: 'Total Suppliers', value: stats.totalCustomers, color: 'from-blue-500 to-blue-600', icon: '👥', bgIcon: 'bg-blue-100' },
              { title: 'Active Suppliers', value: stats.activeSuppliers, color: 'from-green-500 to-green-600', icon: '✅', bgIcon: 'bg-green-100' },
            ].map((stat, index) => (
              <div key={index} className={`group relative bg-gradient-to-br ${stat.color} text-white p-4 sm:p-5 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden`}>
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
                
                {/* Icon */}
                <div className={`relative z-10 inline-flex items-center justify-center w-10 h-10 ${stat.bgIcon} rounded-xl mb-3 group-hover:scale-110 transition-transform duration-200`}>
                  <span className="text-xl">{stat.icon}</span>
                </div>
                
                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xs sm:text-sm font-medium opacity-90 mb-1">{stat.title}</h3>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stat.value}</p>
                </div>
                
                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>

          {/* Suppliers List - Enhanced Modern Design */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                    📋
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Suppliers List</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Showing {filteredSuppliers.length} of {suppliers.length} suppliers
                    </p>
                  </div>
                </div>
                
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search suppliers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading supplier data...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View - Enhanced Modern Design */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Supplier Details</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact Info</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Business</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSuppliers.map((supplier) => (
                        <React.Fragment key={supplier.id}>
                        <tr className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg transform hover:scale-110 transition-transform duration-200">
                                {supplier.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">{supplier.name}</div>
                                <div className="text-xs text-gray-500">PAN: {supplier.pan}</div>
                                <div className="text-xs text-gray-400">GST: {supplier.gstin}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-900">
                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {supplier.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {supplier.phone}
                              </div>
                              <div className="flex items-start text-xs text-gray-500">
                                <svg className="w-4 h-4 mr-2 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="line-clamp-2 max-w-xs">{supplier.address}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">{supplier.supplier_type}</div>
                              <div className="text-xs text-gray-500">Postbox: {supplier.postbox}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-2">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                supplier.status === 1 || supplier.status === '1' || supplier.status === 'active' || supplier.status === 'Active'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {supplier.status === 1 || supplier.status === '1' ? 'active' : supplier.status === 0 || supplier.status === '0' ? 'inactive' : supplier.status}
                              </span>
                              <div className="text-xs text-gray-400">
                                Since {new Date(supplier.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4">
                            <div className="flex flex-wrap gap-2">
                              {permissions.can_view && (
                                <Link
                                  href={`/supplierinvoice?id=${supplier.id}`}
                                  className="text-blue-600 hover:text-blue-900 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 bg-blue-50 rounded-lg transition-colors"
                                >
                                  View
                                </Link>
                              )}
                              <button 
                                onClick={() => loadPurchaseHistory(supplier)}
                                className="text-green-600 hover:text-green-900 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 bg-green-50 rounded-lg transition-colors"
                              >
                                History
                              </button>
                                    {permissions.can_edit && (
                                      <button 
                                        onClick={() => toggleSupplierStatus(supplier.id)}
                                        className={`text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded-lg transition-colors ${
                                          (supplier.status === 1 || supplier.status === '1' || supplier.status === 'active' || supplier.status === 'Active')
                                            ? 'text-yellow-600 hover:text-yellow-900 bg-yellow-50' 
                                            : 'text-green-600 hover:text-green-900 bg-green-50'
                                        }`}
                                      >
                                        {(supplier.status === 1 || supplier.status === '1' || supplier.status === 'active' || supplier.status === 'Active') ? 'Deactivate' : 'Activate'}
                                      </button>
                                    )}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4">
                            <button
                              onClick={() => toggleSupplierLogs(supplier.id)}
                              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                              title="View Activity Logs"
                            >
                              {expandedSuppliers[supplier.id] ? (
                                <>
                                  <BiChevronUp size={18} />
                                  <span className="ml-1 text-xs">Hide</span>
                                </>
                              ) : (
                                <>
                                  <BiChevronDown size={18} />
                                  <span className="ml-1 text-xs">Logs</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                        {/* Expandable Logs Row */}
                        {expandedSuppliers[supplier.id] && (
                          <tr className="bg-gray-50">
                            <td colSpan="6" className="px-4 lg:px-6 py-4">
                              <div className="max-w-4xl">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Logs for {supplier.name}</h3>
                                <EntityLogs entityType="supplier" entityId={supplier.id} />
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View - Enhanced Modern Design */}
                <div className="md:hidden space-y-4 p-4">
                  {filteredSuppliers.map((supplier) => (
                    <div
                      key={`${supplier.id}-mobile`}
                      className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
                    >
                      {/* Background Pattern */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full -mr-12 -mt-12 opacity-60 group-hover:scale-110 transition-transform duration-300"></div>
                      
                      {/* Supplier Header */}
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center flex-1">
                          <div className="flex-shrink-0 h-14 w-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform duration-200">
                            {supplier.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="text-base font-semibold text-gray-900 truncate">{supplier.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{supplier.supplier_type}</div>
                          </div>
                        </div>
                        <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full flex-shrink-0 ml-2 shadow-sm ${
                          supplier.status === 1 || supplier.status === '1' || supplier.status === 'active' || supplier.status === 'Active'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {supplier.status === 1 || supplier.status === '1' ? 'active' : supplier.status === 0 || supplier.status === '0' ? 'inactive' : supplier.status}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 gap-3 mt-4 relative z-10">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center text-xs font-medium text-gray-500 mb-1">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email
                          </div>
                          <p className="text-sm text-gray-900 truncate">{supplier.email}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center text-xs font-medium text-gray-500 mb-1">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Phone
                          </div>
                          <p className="text-sm text-gray-900">{supplier.phone}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center text-xs font-medium text-gray-500 mb-1">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Address
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{supplier.address}</p>
                        </div>
                      </div>

                      {/* Business Details */}
                      <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs font-medium text-blue-600 mb-1">PAN</p>
                          <p className="text-xs text-blue-900 font-medium">{supplier.pan}</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3">
                          <p className="text-xs font-medium text-purple-600 mb-1">GSTIN</p>
                          <p className="text-xs text-purple-900 font-medium">{supplier.gstin}</p>
                        </div>
                        <div className="col-span-2 bg-green-50 rounded-xl p-3">
                          <p className="text-xs font-medium text-green-600 mb-1">📮 Postbox</p>
                          <p className="text-xs text-green-900 font-medium">{supplier.postbox}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 relative z-10">
                        {permissions.can_view && (
                          <Link
                            href={`/supplierinvoice?id=${supplier.id}`}
                            className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors text-center shadow-sm"
                          >
                            👁️ View
                          </Link>
                        )}
                        <button 
                          onClick={() => loadPurchaseHistory(supplier)}
                          className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors text-center shadow-sm"
                        >
                          📊 History
                        </button>
                        {permissions.can_edit && (
                          <button 
                            onClick={() => toggleSupplierStatus(supplier.id)}
                            className={`flex-1 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors text-center shadow-sm ${
                              (supplier.status === 1 || supplier.status === '1' || supplier.status === 'active' || supplier.status === 'Active')
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {(supplier.status === 1 || supplier.status === '1' || supplier.status === 'active' || supplier.status === 'Active') ? '⏸️ Deactivate' : '▶️ Activate'}
                          </button>
                        )}
                        <button
                          onClick={() => toggleSupplierLogs(supplier.id)}
                          className="flex-1 bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors text-center shadow-sm"
                        >
                          📋 Logs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredSuppliers.length === 0 && (
                  <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
                    No suppliers found matching your criteria.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Purchase History Modal */}
          {showPurchaseHistory && selectedSupplier && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="p-3 sm:p-4 lg:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 sticky top-0 bg-white z-10">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      Purchase History - {selectedSupplier.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">GST: {selectedSupplier.gstin}</p>
                  </div>
                  <button 
                    onClick={() => setShowPurchaseHistory(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl p-2 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    {[
                      { title: 'Supplier Type', value: selectedSupplier.supplier_type },
                      { title: 'Phone', value: selectedSupplier.phone },
                      { title: 'Email', value: selectedSupplier.email },
                      { title: 'Status', value: selectedSupplier.status },
                    ].map((stat, index) => (
                      <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-lg text-center">
                        <div className="text-xs sm:text-sm text-gray-600">{stat.title}</div>
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mt-1 truncate">{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {purchaseHistory.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-gray-50">
                            <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm">
                              {new Date(purchase.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap font-mono text-xs lg:text-sm">
                              {purchase.invoiceNo}
                            </td>
                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                              <div className="text-sm font-medium text-gray-900">{purchase.description}</div>
                            </td>
                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                              <div className="text-sm text-gray-900">
                                {purchase.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                              <div className="text-base lg:text-lg font-bold text-gray-900">
                                ₹{purchase.amount.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 lg:px-3 py-1 text-xs font-semibold rounded-full ${statusColors[purchase.status]}`}>
                                {purchase.status}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500">
                              {new Date(purchase.paymentDue).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {purchaseHistory.map((purchase) => (
                      <div key={`${purchase.id}-mobile`} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b pb-2">
                            <div>
                              <p className="text-xs font-medium text-gray-500">Date</p>
                              <p className="text-sm font-semibold text-gray-900 mt-1">
                                {new Date(purchase.date).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[purchase.status]}`}>
                              {purchase.status}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-500">Invoice</p>
                            <p className="text-sm font-mono text-gray-900 mt-1">{purchase.invoiceNo}</p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-500">Description</p>
                            <p className="text-sm text-gray-900 mt-1">{purchase.description}</p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-500">Items</p>
                            <div className="mt-1 space-y-1">
                              {purchase.items.map((item, idx) => (
                                <div key={idx} className="flex items-center text-sm text-gray-900">
                                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                            <div>
                              <p className="text-xs font-medium text-gray-500">Amount</p>
                              <p className="text-base font-bold text-gray-900 mt-1">
                                ₹{purchase.amount.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">Due Date</p>
                              <p className="text-sm text-gray-900 mt-1">
                                {new Date(purchase.paymentDue).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
