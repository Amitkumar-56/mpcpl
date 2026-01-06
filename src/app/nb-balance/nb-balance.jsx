'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NBBalance() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [totalCash, setTotalCash] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false
  });

  const [formData, setFormData] = useState({
    amount: '',
    payment_date: '',
    payment_type: '',
    comments: ''
  });

  // Check permissions
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      checkPermissions();
    }
  }, [user, authLoading, router]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true });
      fetchData();
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['NB Accounts']) {
      const nbPerms = user.permissions['NB Accounts'];
      if (nbPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: nbPerms.can_view,
          can_edit: nbPerms.can_edit,
          can_delete: nbPerms.can_delete
        });
        fetchData();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_NB Accounts`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchData();
        return;
      }
    }

    try {
      const moduleName = 'NB Accounts';
      const [viewRes, editRes, deleteRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`)
      ]);

      const [viewData, editData, deleteData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        deleteRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed
      };

      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        fetchData();
      } else {
        setHasPermission(false);
        setPermissions(perms);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission) {
      fetchData();
    }
  }, [hasPermission]);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, dateFilter, paymentTypeFilter, sortConfig]); // Added sortConfig to dependencies

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/nb-balance');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRecords(data.records || []);
        setTotalCash(data.totalCash || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load cash history data');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...records]; // Create a copy to avoid mutating original

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.remark?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.payment_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(record => record.payment_date === dateFilter);
    }

    // Payment type filter
    if (paymentTypeFilter) {
      filtered = filtered.filter(record => record.payment_type === paymentTypeFilter);
    }

    // Sort records
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredRecords(filtered);
    
    // Calculate filtered total
    const filteredTotalAmount = filtered.reduce((sum, record) => {
      const amount = parseFloat(record.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    setFilteredTotal(filteredTotalAmount);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      amount: record.amount?.toString() || '',
      payment_date: record.payment_date || '',
      payment_type: record.payment_type || 'Cash',
      comments: record.remark || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/nb-balance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingRecord.id,
          ...formData
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert('Record updated successfully!');
        setShowEditModal(false);
        setEditingRecord(null);
        fetchData(); // Refresh data
      } else {
        alert(data.error || 'Error updating record.');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setPaymentTypeFilter('');
    setSortConfig({ key: '', direction: '' });
  };

  const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(isNaN(numAmount) ? 0 : numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading cash history...</p>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  // Check if user has view permission
  if (!hasPermission) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to view NB Accounts.</p>
              <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <button 
                onClick={() => router.back()}
                className="flex items-center text-blue-600 hover:text-blue-800 mb-2 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Cash History</h1>
              <nav className="flex space-x-2 text-sm text-gray-600 mt-1">
                <a href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</a>
                <span>&gt;</span>
                <span className="text-gray-900">Cash History</span>
              </nav>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Cash</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalCash)}</p>
              </div>
              {permissions.can_edit && (
                <a 
                  href="/nb-balance/cash-management"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Cash Management
                </a>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by name, remark..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Payment Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="Cash">Cash</option>
                  <option value="RTGS">RTGS</option>
                  <option value="NEFT">NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              
              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            
            {/* Filter Summary */}
            {(searchTerm || dateFilter || paymentTypeFilter) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">Filtered Results:</span>
                  <span className="text-green-600 font-bold">{formatCurrency(filteredTotal)}</span>
                  <span className="text-gray-600">({filteredRecords.length} records)</span>
                  {searchTerm && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Search: {searchTerm}</span>
                  )}
                  {dateFilter && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Date: {formatDate(dateFilter)}</span>
                  )}
                  {paymentTypeFilter && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Type: {paymentTypeFilter}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
                  Cash Transactions
                  {filteredRecords.length > 0 && (
                    <span className="text-sm text-gray-600 ml-2">
                      ({filteredRecords.length} records)
                    </span>
                  )}
                </h2>
                
                <button
                  onClick={fetchData}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th 
                        className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('customer_name')}
                      >
                        <div className="flex items-center">
                          Customer Name
                          <span className="ml-1">{getSortIcon('customer_name')}</span>
                        </div>
                      </th>
                      <th 
                        className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center">
                          Amount
                          <span className="ml-1">{getSortIcon('amount')}</span>
                        </div>
                      </th>
                      <th 
                        className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('payment_date')}
                      >
                        <div className="flex items-center">
                          Payment Date
                          <span className="ml-1">{getSortIcon('payment_date')}</span>
                        </div>
                      </th>
                      <th 
                        className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('payment_type')}
                      >
                        <div className="flex items-center">
                          Payment Type
                          <span className="ml-1">{getSortIcon('payment_type')}</span>
                        </div>
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Remark
                      </th>
                      {(permissions.can_edit || permissions.can_delete) && (
                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                          <div className="font-medium">{record.customer_name || '-'}</div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(record.amount)}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                          {formatDate(record.payment_date)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.payment_type === 'Cash' ? 'bg-green-100 text-green-800' :
                            record.payment_type === 'UPI' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {record.payment_type || 'Cash'}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                          {record.remark || '-'}
                        </td>
                        {(permissions.can_edit || permissions.can_delete) && (
                          <td className="border border-gray-200 px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              {permissions.can_edit && (
                                <button
                                  onClick={() => handleEdit(record)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={(permissions.can_edit || permissions.can_delete) ? "6" : "5"} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                          {records.length === 0 ? 'No cash records found.' : 'No records match your filters.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{record.name || '-'}</h3>
                          <p className="text-sm text-gray-600">{formatDate(record.payment_date)}</p>
                        </div>
                        <span className="font-bold text-green-600 text-lg">
                          {formatCurrency(record.amount)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.payment_type === 'Cash' ? 'bg-green-100 text-green-800' :
                          record.payment_type === 'UPI' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {record.payment_type || 'Cash'}
                        </span>
                      </div>
                      
                      {record.remark && (
                        <div>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Remark:</span> {record.remark}
                          </p>
                        </div>
                      )}
                      
                      {(permissions.can_edit || permissions.can_delete) && (
                        <div className="flex space-x-2 pt-2 border-t border-gray-100">
                          {permissions.can_edit && (
                            <button
                              onClick={() => handleEdit(record)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && (
                  <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2">
                      {records.length === 0 ? 'No cash records found.' : 'No records match your filters.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdate}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Cash Entry</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRecord(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={formData.payment_date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Type *
                  </label>
                  <select
                    name="payment_type"
                    value={formData.payment_type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">-- Select Payment Type --</option>
                    <option value="Cash">Cash</option>
                    <option value="RTGS">RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remark
                  </label>
                  <textarea
                    name="comments"
                    value={formData.comments}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter any remarks..."
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}