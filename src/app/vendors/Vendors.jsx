'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import React from 'react';
import { BiChevronDown, BiChevronUp, BiEdit, BiTrash, BiPlus, BiSearch } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

export default function VendorsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
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
  const [expandedVendors, setExpandedVendors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    status: '1'
  });

  const toggleVendorLogs = (vendorId) => {
    setExpandedVendors(prev => ({
      ...prev,
      [vendorId]: !prev[vendorId]
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
      const response = await fetch('/api/check-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: user?.id,
          user_role: user?.role,
          module_name: 'Vendors'
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
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
      router.push('/dashboard');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission) {
      fetchVendors();
    }
  }, [hasPermission]);

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
      const url = selectedVendor 
        ? `/api/vendors?id=${selectedVendor.id}`
        : '/api/vendors';
      
      const method = selectedVendor ? 'PUT' : 'POST';
      
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
        await fetchVendors();
        resetForm();
        setShowForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Error saving vendor');
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Error saving vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone,
      status: vendor.status.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (vendorId) => {
    if (!confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors?id=${vendorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchVendors();
      } else {
        const error = await response.json();
        alert(error.error || 'Error deleting vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Error deleting vendor');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      status: '1'
    });
    setSelectedVendor(null);
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && vendor.status === 1) ||
                         (statusFilter === 'inactive' && vendor.status === 0);
    
    return matchesSearch && matchesStatus;
  });

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
                <p className="text-gray-600">Loading vendor module...</p>
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
              <h1 className="text-3xl font-bold text-gray-800">Vendor Management</h1>
              {permissions.can_create && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <BiPlus className="text-xl" />
                  Add Vendor
                </button>
              )}
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <BiSearch className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="text"
                  placeholder="Search vendors..."
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

            {/* Vendor Form */}
            {showForm && (
              <div className="mb-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter vendor name"
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
                      {submitting ? 'Saving...' : (selectedVendor ? 'Update Vendor' : 'Add Vendor')}
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

            {/* Vendors Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Phone</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <React.Fragment key={vendor.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {vendor.name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {vendor.phone}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            vendor.status === 1 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {vendor.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex gap-2">
                            {permissions.can_edit && (
                              <button
                                onClick={() => handleEdit(vendor)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <BiEdit className="text-xl" />
                              </button>
                            )}
                            {permissions.can_delete && (
                              <button
                                onClick={() => handleDelete(vendor.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <BiTrash className="text-xl" />
                              </button>
                            )}
                            <button
                              onClick={() => toggleVendorLogs(vendor.id)}
                              className="text-gray-600 hover:text-gray-800"
                              title="View Logs"
                            >
                              {expandedVendors[vendor.id] ? (
                                <BiChevronUp className="text-xl" />
                              ) : (
                                <BiChevronDown className="text-xl" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedVendors[vendor.id] && (
                        <tr>
                          <td colSpan="4" className="border border-gray-300 px-4 py-2 bg-gray-50">
                            <EntityLogs
                              recordType="vendor"
                              recordId={vendor.id}
                              uniqueCode={vendor.id.toString()}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {filteredVendors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No vendors found
                </div>
              )}
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}