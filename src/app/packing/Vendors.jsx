'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import React from 'react';
import { BiChevronDown, BiChevronUp, BiEdit, BiPlus, BiSearch, BiMoney, BiReceipt } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

export default function PackingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [packing, setPacking] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPacking, setSelectedPacking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [totalPacking, setTotalPacking] = useState(0);
  const [serverPagination, setServerPagination] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_create: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [expandedPacking, setExpandedPacking] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    amount: '',
    status: '1'
  });

  const togglePackingLogs = (packingId) => {
    setExpandedPacking(prev => ({
      ...prev,
      [packingId]: !prev[packingId]
    }));
  };

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
    try {
      // Temporarily bypass permission check for debugging
      setHasPermission(true);
      setPermissions({
        can_view: true,
        can_edit: true,
        can_create: true,
        can_delete: true
      });
      
      // Original permission check (commented out for debugging)
      /*
      const response = await fetch('/api/check-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: user?.id,
          user_role: user?.role,
          module_name: 'Packing'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const perms = data.permissions || data;
        setPermissions(perms);
        setHasPermission(perms.can_view === true);
        if (!perms.can_view) {
          router.push('/dashboard');
        }
      } else {
        setHasPermission(false);
        router.push('/dashboard');
      }
      */
    } catch (error) {
      console.error('Error checking permissions:', error);
      // Still allow access for debugging
      setHasPermission(true);
      setPermissions({
        can_view: true,
        can_edit: true,
        can_create: true,
        can_delete: true
      });
    }
  };

  const fetchPacking = async () => {
    try {
      // Use server-side pagination for better performance
      const response = await fetch(`/api/packing?page=${currentPage}&limit=${itemsPerPage}`);
      if (response.ok) {
        const data = await response.json();
        setPacking(data.vendors || []);
        if (data.pagination) {
          setTotalPacking(data.pagination.total);
          setServerPagination(true);
        }
      }
    } catch (error) {
      console.error('Error fetching packing entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission) {
      fetchPacking();
    }
  }, [hasPermission, currentPage, itemsPerPage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const phoneValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: phoneValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = selectedPacking 
        ? `/api/packing?id=${selectedPacking.id}`
        : '/api/packing';
      
      const method = selectedPacking ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          created_by: user?.id
        }),
      });

      if (response.ok) {
        await fetchPacking();
        resetForm();
        setShowForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Error saving packing entry');
      }
    } catch (error) {
      console.error('Error saving packing entry:', error);
      alert('Error saving packing entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (packing) => {
    setSelectedPacking(packing);
    setFormData({
      name: packing.name,
      phone: packing.phone,
      status: packing.status.toString()
    });
    setShowForm(true);
  };


  const handlePackingCarton = (packingId) => {
    router.push(`/packing-collection?id=${packingId}`);
  };

  const handlePackingTransactions = (packingId) => {
    router.push(`/packing-transactions?id=${packingId}`);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      amount: '',
      status: '1'
    });
    setSelectedPacking(null);
  };

  // For server-side pagination, filter on client side only for search/status
  const filteredPacking = useMemo(() => {
    if (serverPagination) {
      return packing.filter(packing => {
        const matchesSearch = packing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             packing.phone.includes(searchTerm);
        
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && packing.status === 1) ||
                             (statusFilter === 'inactive' && packing.status === 0);
        
        return matchesSearch && matchesStatus;
      });
    } else {
      // Client-side pagination fallback
      return packing.filter(packing => {
        const matchesSearch = packing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             packing.phone.includes(searchTerm);
        
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && packing.status === 1) ||
                             (statusFilter === 'inactive' && packing.status === 0);
        
        return matchesSearch && matchesStatus;
      });
    }
  }, [packing, searchTerm, statusFilter, serverPagination]);

  // Pagination calculations
  const { totalPages, startIndex, endIndex, paginatedPacking } = useMemo(() => {
    if (serverPagination) {
      const totalPages = Math.ceil(totalPacking / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalPacking);
      return { totalPages, startIndex, endIndex, paginatedPacking: filteredPacking };
    } else {
      // Client-side pagination fallback
      const totalPages = Math.ceil(filteredPacking.length / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedPacking = filteredPacking.slice(startIndex, endIndex);
      return { totalPages, startIndex, endIndex, paginatedPacking };
    }
  }, [filteredPacking, currentPage, itemsPerPage, totalPacking, serverPagination]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  // For server-side pagination, we don't reset page on search/filter changes
  // as the server handles the filtering
  useEffect(() => {
    if (!serverPagination) {
      setCurrentPage(1); // Only reset for client-side pagination
    }
  }, [searchTerm, statusFilter, serverPagination]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        
        <div className="lg:ml-64 flex flex-col flex-1 min-h-screen">
          <Header />
          
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading parking module...</p>
              </div>
            </div>
          </main>
          
          <Footer />
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      
      {/* Main Content Area with margin for sidebar */}
      <div className="lg:ml-64 flex flex-col flex-1 min-h-screen">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Parking Management</h1>
              {permissions.can_create && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <BiPlus className="text-xl" />
                  Add Parking
                </button>
              )}
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <BiSearch className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="text"
                  placeholder="Search parking records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Packing Form */}
            {showForm && (
              <div className="mb-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {selectedPacking ? 'Edit Parking' : 'Add New Parking'}
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parking Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter parking name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter 10 digit phone number"
                      maxLength="10"
                      pattern="[0-9]{10}"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0.00"
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      {submitting ? 'Saving...' : (selectedPacking ? 'Update Parking' : 'Add Parking')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Packing Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Phone</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPacking.map((packing) => (
                    <React.Fragment key={packing.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {packing.name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {packing.phone}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-medium text-green-600">
                          ₹{packing.amount ? parseFloat(packing.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            packing.status === 1 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {packing.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex gap-2">
                            {permissions.can_edit && (
                              <button
                                onClick={() => handleEdit(packing)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <BiEdit className="text-xl" />
                              </button>
                            )}
                            <button
                              onClick={() => handlePackingCarton(packing.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Packing In"
                            >
                              <BiMoney className="text-xl" />
                            </button>
                            <button
                              onClick={() => handlePackingTransactions(packing.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Packing Out"
                            >
                              <BiReceipt className="text-xl" />
                            </button>
                            <button
                              onClick={() => togglePackingLogs(packing.id)}
                              className="text-gray-600 hover:text-gray-800"
                              title="View Logs"
                            >
                              {expandedPacking[packing.id] ? (
                                <BiChevronUp className="text-xl" />
                              ) : (
                                <BiChevronDown className="text-xl" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedPacking[packing.id] && (
                        <tr>
                          <td colSpan="4" className="border border-gray-300 px-4 py-2 bg-gray-50">
                            <EntityLogs
                              entityType="packing"
                              entityId={packing.id}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {filteredPacking.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No parking records found
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredPacking.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, serverPagination ? totalPacking : filteredPacking.length)} of {serverPagination ? totalPacking : filteredPacking.length} parking records
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === page
                              ? 'bg-yellow-500 text-white border-yellow-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}