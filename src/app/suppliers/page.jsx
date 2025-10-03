"use client";

import { useEffect, useState } from "react";
import { FaEdit, FaExclamationTriangle, FaEye, FaImage, FaPlus, FaSearch, FaTrash } from "react-icons/fa";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [permissions, setPermissions] = useState({ can_view: 0, can_edit: 0, can_delete: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers");
      
      if (!res.ok) {
        if (res.status === 403) throw new Error("Access denied");
        throw new Error(`Failed to load: Status ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        setSuppliers([]);
      } else {
        setSuppliers(data.suppliers || []);
        setPermissions(data.permissions || { can_view: 0, can_edit: 0, can_delete: 0 });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load suppliers.");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.includes(searchTerm) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.gstin?.includes(searchTerm)
  );

  // Format supplier type
  const formatSupplierType = (type) => {
    const types = {
      'individual': 'Individual',
      'company': 'Company',
      'distributor': 'Distributor',
      'wholesaler': 'Wholesaler'
    };
    return types[type] || type;
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const styles = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-red-100 text-red-800',
      'pending': 'bg-yellow-100 text-yellow-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <FaExclamationTriangle className="text-red-500 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Suppliers</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={fetchSuppliers}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No permission state
  if (!permissions.can_view) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <FaExclamationTriangle className="text-orange-500 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view suppliers.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate active suppliers
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Suppliers</h1>
              <p className="text-gray-600">Manage your suppliers and vendor relationships</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, email, GSTIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
                />
              </div>
              
              {permissions.can_edit === 1 && (
                <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                  <FaPlus className="text-sm" />
                  Add Supplier
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-800">{suppliers.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FaEye className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-600">{activeSuppliers}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <span className="text-green-600 text-xl font-bold">✓</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Companies</p>
                <p className="text-2xl font-bold text-purple-600">
                  {suppliers.filter(s => s.supplier_type === 'company').length}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <span className="text-purple-600 text-xl font-bold">🏢</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Individuals</p>
                <p className="text-2xl font-bold text-orange-600">
                  {suppliers.filter(s => s.supplier_type === 'individual').length}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <span className="text-orange-600 text-xl font-bold">👤</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Supplier Info</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Contact Details</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Business Info</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <FaExclamationTriangle className="text-gray-400 text-4xl mb-3" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-1">No suppliers found</h3>
                          <p className="text-gray-500">
                            {searchTerm ? "Try adjusting your search" : "Get started by adding your first supplier"}
                          </p>
                          {permissions.can_edit === 1 && !searchTerm && (
                            <button className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                              Add First Supplier
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {supplier.picture ? (
                              <img 
                                src={supplier.picture} 
                                alt={supplier.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <FaImage className="text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-800">{supplier.name}</p>
                              <p className="text-sm text-gray-500">{formatSupplierType(supplier.supplier_type)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-700">📞 {supplier.phone}</p>
                          <p className="text-sm text-gray-500">{supplier.email}</p>
                          {supplier.address && (
                            <p className="text-xs text-gray-400 mt-1">{supplier.address}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {supplier.gstin && (
                              <p className="text-sm">
                                <span className="font-medium">GSTIN:</span> {supplier.gstin}
                              </p>
                            )}
                            {supplier.pan && (
                              <p className="text-sm">
                                <span className="font-medium">PAN:</span> {supplier.pan}
                              </p>
                            )}
                            {supplier.postbox && (
                              <p className="text-sm">
                                <span className="font-medium">Postbox:</span> {supplier.postbox}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(supplier.status)}`}>
                            {supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center space-x-3">
                            <button className="text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50" title="View">
                              <FaEye size={16} />
                            </button>
                            {permissions.can_edit === 1 && (
                              <button className="text-green-600 hover:text-green-800 transition-colors p-2 rounded-lg hover:bg-green-50" title="Edit">
                                <FaEdit size={16} />
                              </button>
                            )}
                            {permissions.can_delete === 1 && (
                              <button className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-50" title="Delete">
                                <FaTrash size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            {filteredSuppliers.length === 0 ? (
              <div className="p-8 text-center">
                <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-600 mb-1">No suppliers found</h3>
                <p className="text-gray-500">
                  {searchTerm ? "Try adjusting your search" : "Get started by adding your first supplier"}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredSuppliers.map((supplier) => (
                  <div key={supplier.id} className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        {supplier.picture ? (
                          <img 
                            src={supplier.picture} 
                            alt={supplier.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <FaImage className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-800 text-lg">{supplier.name}</h3>
                          <p className="text-gray-600 text-sm">{formatSupplierType(supplier.supplier_type)}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(supplier.status)}`}>
                        {supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <p className="text-gray-700">📞 {supplier.phone}</p>
                      <p className="text-gray-600 text-sm">{supplier.email}</p>
                      {supplier.address && (
                        <p className="text-gray-500 text-sm">{supplier.address}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {supplier.gstin && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">GSTIN: {supplier.gstin}</span>
                        )}
                        {supplier.pan && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">PAN: {supplier.pan}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {supplier.postbox && `Postbox: ${supplier.postbox}`}
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 p-2 rounded-lg hover:bg-blue-100" title="View">
                          <FaEye size={14} />
                        </button>
                        {permissions.can_edit === 1 && (
                          <button className="text-green-600 p-2 rounded-lg hover:bg-green-100" title="Edit">
                            <FaEdit size={14} />
                          </button>
                        )}
                        {permissions.can_delete === 1 && (
                          <button className="text-red-600 p-2 rounded-lg hover:bg-red-100" title="Delete">
                            <FaTrash size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}