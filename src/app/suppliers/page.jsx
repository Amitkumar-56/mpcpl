'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    totalOutstanding: 0,
    tomorrowPayment: 0,
    overdue2to7: 0,
    overdue8Plus: 0,
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
      console.error('Error fetching suppliers:', error);
      setLoading(false);
    }
  };

  // Calculate stats from supplier data
  const calculateStats = (suppliersData) => {
    const activeSuppliers = suppliersData.filter(s => s.status === 'active').length;
    const totalOutstanding = suppliersData.reduce((sum, supplier) => sum + (supplier.outstandingBalance || 0), 0);
    
    return {
      totalCustomers: suppliersData.length,
      totalOutstanding,
      tomorrowPayment: Math.round(totalOutstanding * 0.1), // 10% for demo
      overdue2to7: Math.round(totalOutstanding * 0.05), // 5% for demo
      overdue8Plus: Math.round(totalOutstanding * 0.03), // 3% for demo
      activeSuppliers
    };
  };

  // Generate mock purchase history
  const generatePurchaseHistory = (supplierId) => {
    return [
      {
        id: 1,
        date: '2024-01-15',
        invoiceNo: `INV-${supplierId}-001`,
        description: 'Raw Materials Purchase',
        items: ['Steel Sheets', 'Aluminum Bars'],
        amount: 25000,
        status: 'completed',
        paymentDue: '2024-02-15'
      },
      {
        id: 2,
        date: '2024-01-20',
        invoiceNo: `INV-${supplierId}-002`,
        description: 'Electronic Components',
        items: ['Resistors', 'Capacitors', 'PCBs'],
        amount: 18000,
        status: 'pending',
        paymentDue: '2024-02-20'
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

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Add new supplier via API
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create supplier');
      }

      const newSupplier = await response.json();
      
      // Update local state
      const updatedSuppliers = [...suppliers, newSupplier];
      setSuppliers(updatedSuppliers);
      setStats(calculateStats(updatedSuppliers));
      
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
      
      alert('Supplier created successfully!');
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Delete supplier
  const handleDeleteSupplier = async (id) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      // Note: You'll need to implement DELETE API endpoint
      const updatedSuppliers = suppliers.filter(supplier => supplier.id !== id);
      setSuppliers(updatedSuppliers);
      setStats(calculateStats(updatedSuppliers));
      alert('Supplier deleted successfully!');
    }
  };

  // Toggle supplier status
  const toggleSupplierStatus = async (id) => {
    // Note: You'll need to implement UPDATE API endpoint
    const updatedSuppliers = suppliers.map(supplier => 
      supplier.id === id 
        ? { ...supplier, status: supplier.status === 'active' ? 'inactive' : 'active' }
        : supplier
    );
    setSuppliers(updatedSuppliers);
    setStats(calculateStats(updatedSuppliers));
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
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
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

  return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          {/* Sidebar */}
          <div className={`fixed lg:static z-40 h-full transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
            <Sidebar activePage="Customers" onClose={() => setSidebarOpen(false)} />
          </div>
    
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
    
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <Header/>
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Supplier Management</h1>
              <p className="text-gray-600 mt-2">Manage your suppliers and track purchases</p>
            </div>
            <button 
              onClick={() => router.push('/suppliers/purchase')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-md"
            >
              <span>📦</span>
              <span>Go to Purchase</span>
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64 transition-all"
                />
                <div className="absolute left-3 top-3.5 text-gray-400">
                  🔍
                </div>
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2 shadow-md w-full lg:w-auto justify-center"
            >
              <span className="text-lg">+</span>
              <span>{showForm ? 'Cancel' : 'Add New Supplier'}</span>
            </button>
          </div>

          {/* Add Supplier Form */}
          {showForm && (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border border-gray-200 animate-fade-in">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Supplier</h2>
              <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required={field.required}
                    />
                  </div>
                ))}
                
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="md:col-span-2 lg:col-span-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Supplier
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {[
              { title: 'Total Suppliers', value: stats.totalCustomers, color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
              { title: 'Active Suppliers', value: stats.activeSuppliers, color: 'bg-gradient-to-r from-green-500 to-green-600' },
              { title: 'Total Outstanding', value: `₹${stats.totalOutstanding.toLocaleString()}`, color: 'bg-gradient-to-r from-orange-500 to-orange-600' },
              { title: 'Tomorrow Payment', value: `₹${stats.tomorrowPayment.toLocaleString()}`, color: 'bg-gradient-to-r from-purple-500 to-purple-600' },
              { title: 'Overdue 2-7 Days', value: `₹${stats.overdue2to7.toLocaleString()}`, color: 'bg-gradient-to-r from-red-500 to-red-600' },
              { title: 'Overdue 8+ Days', value: `₹${stats.overdue8Plus.toLocaleString()}`, color: 'bg-gradient-to-r from-pink-500 to-pink-600' },
            ].map((stat, index) => (
              <div key={index} className={`${stat.color} text-white p-4 rounded-xl shadow-md transform hover:scale-105 transition-transform duration-200`}>
                <h3 className="text-sm font-medium opacity-90">{stat.title}</h3>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Suppliers List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Suppliers List</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredSuppliers.length} of {suppliers.length} suppliers
              </div>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading supplier data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Details</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {supplier.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                              <div className="text-sm text-gray-500">PAN: {supplier.pan}</div>
                              <div className="text-xs text-gray-400">GST: {supplier.gstin}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{supplier.email}</div>
                          <div className="text-sm text-gray-500">{supplier.phone}</div>
                          <div className="text-xs text-gray-400 truncate max-w-xs">{supplier.address}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{supplier.supplier_type}</div>
                          <div className="text-sm text-gray-500">Postbox: {supplier.postbox}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusColors[supplier.status]}`}>
                            {supplier.status}
                          </span>
                          <div className="text-xs text-gray-400 mt-1">
                            Since {new Date(supplier.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => loadPurchaseHistory(supplier)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium px-3 py-1 bg-blue-50 rounded-lg transition-colors"
                            >
                              History
                            </button>
                            <button 
                              onClick={() => toggleSupplierStatus(supplier.id)}
                              className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
                                supplier.status === 'active' 
                                  ? 'text-yellow-600 hover:text-yellow-900 bg-yellow-50' 
                                  : 'text-green-600 hover:text-green-900 bg-green-50'
                              }`}
                            >
                              {supplier.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button 
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium px-3 py-1 bg-red-50 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSuppliers.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No suppliers found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Purchase History Modal */}
          {showPurchaseHistory && selectedSupplier && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Purchase History - {selectedSupplier.name}
                    </h2>
                    <p className="text-gray-600">GST: {selectedSupplier.gstin}</p>
                  </div>
                  <button 
                    onClick={() => setShowPurchaseHistory(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl p-2"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { title: 'Supplier Type', value: selectedSupplier.supplier_type },
                      { title: 'Phone', value: selectedSupplier.phone },
                      { title: 'Email', value: selectedSupplier.email },
                      { title: 'Status', value: selectedSupplier.status },
                    ].map((stat, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-sm text-gray-600">{stat.title}</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {purchaseHistory.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(purchase.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                              {purchase.invoiceNo}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{purchase.description}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {purchase.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-lg font-bold text-gray-900">
                                ₹{purchase.amount.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusColors[purchase.status]}`}>
                                {purchase.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(purchase.paymentDue).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
          </div>
  );
}