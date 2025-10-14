// app/customers/page.jsx
"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BiCoin,
  BiEdit,
  BiMessage,
  BiPlus,
  BiRupee,
  BiSearch,
  BiShow,
  BiTrash
} from "react-icons/bi";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [permissions, setPermissions] = useState({ 
    can_edit: true, 
    can_view: true, 
    can_delete: true 
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch customers with balances
      const customersRes = await fetch("/api/customers");
      if (!customersRes.ok) {
        throw new Error('Failed to fetch customers');
      }
      const customersData = await customersRes.json();
      setCustomers(customersData);

      // Try to fetch permissions
      try {
        const permRes = await fetch("/api/permissions?module=Customers");
        if (permRes.ok) {
          const permData = await permRes.json();
          setPermissions(permData);
        }
      } catch (permError) {
        console.log("Using default permissions");
        // Keep default permissions
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Failed to load customers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized filtered customers
  const filteredCustomers = useMemo(() => 
    customers.filter((c) =>
      `${c.name || ''} ${c.email || ''} ${c.phone || ''} ${c.address || ''} ${c.region || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ),
    [customers, search]
  );

  // Memoized pagination data
  const paginationData = useMemo(() => {
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentCustomers = filteredCustomers.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    
    return { indexOfFirst, indexOfLast, currentCustomers, totalPages };
  }, [currentPage, itemsPerPage, filteredCustomers]);

  const { indexOfFirst, indexOfLast, currentCustomers, totalPages } = paginationData;

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const res = await fetch("/api/customers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete customer');
      }
      
      const data = await res.text();
      if (data === "success") {
        setCustomers(customers.filter((c) => c.id !== id));
        alert("Customer deleted successfully");
      } else {
        alert("Error deleting customer");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  const getBillingType = useCallback((type) => {
    switch (type) {
      case 1:
        return { text: "Billing", color: "bg-green-100 text-green-800 border border-green-200" };
      case 2:
        return { text: "Non Billing", color: "bg-blue-100 text-blue-800 border border-blue-200" };
      default:
        return { text: "Unknown", color: "bg-gray-100 text-gray-800 border border-gray-200" };
    }
  }, []);

  const getStatusColor = useCallback((balance, limit) => {
    const remaining = limit - balance;
    if (remaining <= 0) return "text-red-600 font-bold";
    if (remaining < limit * 0.3) return "text-yellow-600 font-bold";
    return "text-green-600 font-bold";
  }, []);

  // Function to handle limit click
  const handleLimitClick = useCallback((customerId, customerName) => {
    window.location.href = `/credit-limit?id=${customerId}`;
  }, []);

  // Calculate remaining limit
  const calculateRemainingLimit = useCallback((balance, limit) => {
    return Math.max(0, limit - balance);
  }, []);

  // Memoized action buttons configuration
  const actionButtons = useMemo(() => [
    {
      key: 'view',
      icon: BiShow,
      label: 'View',
      href: (id) => `/customers/customer-details?id=${id}`,
      color: 'bg-blue-500 hover:bg-blue-600',
      show: permissions.can_view
    },
    {
      key: 'edit',
      icon: BiEdit,
      label: 'Edit',
      href: (id) => `/customers/edit/${id}`,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      show: permissions.can_edit
    },
    {
      key: 'recharge-request',
      icon: BiRupee ,
      label: 'Recharge',
      href: (id) => `/customers/recharge-request?id=${id}`,
      color: 'bg-purple-500 hover:bg-purple-600',
      show: permissions.can_edit
    },
    {
      key: 'deal-price',
      icon: BiCoin,
      label: 'Deal',
      href: (id) => `/customers/deal-price?id=${id}`,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      show: permissions.can_edit
    },
    {
      key: 'messages',
      icon: BiMessage,
      label: 'Msg',
      href: (id) => `/customers/messages/${id}`,
      color: 'bg-teal-500 hover:bg-teal-600',
      show: permissions.can_edit
    },
    {
      key: 'delete',
      icon: BiTrash,
      label: 'Delete',
      onClick: (id) => handleDelete(id),
      color: 'bg-red-500 hover:bg-red-600',
      show: permissions.can_delete
    }
  ], [permissions, handleDelete]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Memoized stats
  const stats = useMemo(() => [
    { title: 'Total Customers', value: customers.length, color: 'from-blue-500 to-blue-600' },
    { title: 'Billing Customers', value: customers.filter(c => c.billing_type === 1).length, color: 'from-green-500 to-green-600' },
    { title: 'Non-Billing', value: customers.filter(c => c.billing_type === 2).length, color: 'from-purple-500 to-purple-600' },
    { title: 'Over Limit', value: customers.filter(c => c.balance > c.cst_limit).length, color: 'from-orange-500 to-orange-600' },
  ], [customers]);

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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          title="Customer Management"
          subtitle="Manage your customers efficiently with real-time data"
        />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-4 lg:mb-6">
              <ol className="flex items-center gap-2 text-sm text-purple-600">
                <li>
                  <Link href="/" className="hover:text-purple-800 font-medium transition-colors">Home</Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">❯</span>
                  <span className="bg-clip-text text-transparent font-bold text-gradient bg-gradient-to-r from-purple-600 to-pink-600">
                    Customer Management
                  </span>
                </li>
              </ol>
            </nav>

            {/* Header Section */}
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Customer List
                </h1>
                <p className="text-purple-500 font-medium text-sm lg:text-base">
                  Manage your customers efficiently with real-time data
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BiSearch className="text-purple-500 text-lg" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search customers..."
                    className="w-full lg:w-64 border-2 border-purple-100 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all duration-300 bg-white/70 backdrop-blur-sm text-sm lg:text-base placeholder-purple-300"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Link
                  href="/customers/add"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 font-semibold text-sm lg:text-base whitespace-nowrap transform hover:scale-105"
                >
                  <BiPlus className="text-lg" />
                  <span>Add Customer</span>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {stats.map((stat, index) => (
                <div key={index} className={`bg-gradient-to-r ${stat.color} text-white p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200`}>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-opacity-90 text-sm mt-1">{stat.title}</div>
                </div>
              ))}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center p-12 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <span className="ml-4 text-purple-600 font-medium">Loading customers...</span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
                <div className="flex items-center">
                  <span className="font-bold">Error: </span>
                  <span className="ml-2">{error}</span>
                </div>
                <button 
                  onClick={fetchData}
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Customers List/Table */}
            {!loading && !error && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1"></div>
                <div className="p-4 lg:p-6 overflow-auto max-h-[70vh]">
                  
                  {/* Results Count */}
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                      {search && ` for "${search}"`}
                    </div>
                    {totalPages > 1 && (
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </div>
                    )}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[1200px]">
                      <thead>
                        <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">ID</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Name</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Email</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Phone</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Address</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Region</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Billing Type</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Credit Limit</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Outstanding</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Remaining Limit</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCustomers.length === 0 ? (
                          <tr>
                            <td colSpan="11" className="p-8 text-center text-gray-700 font-semibold">
                              {search ? 'No customers found matching your search' : 'No customers found'}
                            </td>
                          </tr>
                        ) : (
                          currentCustomers.map((c) => {
                            const billingInfo = getBillingType(c.billing_type);
                            const remainingLimit = calculateRemainingLimit(c.balance, c.cst_limit);
                            const statusInfo = getStatusColor(c.balance, c.cst_limit);
                            return (
                              <tr key={c.id} className="border-b border-purple-100 hover:bg-purple-50 transition-colors duration-200">
                                <td className="p-4 font-mono text-purple-600 font-bold">#{c.id}</td>
                                <td className="p-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-md">
                                      <span className="text-white font-bold text-sm">{(c.name?.charAt(0) || 'C').toUpperCase()}</span>
                                    </div>
                                    <div>
                                      <Link 
                                        href={`/customers/client-history?id=${c.id}`}
                                        className="font-bold text-gray-900 hover:text-purple-700 transition-colors block"
                                      >
                                        {c.name || 'Unnamed Customer'}
                                      </Link>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="text-gray-900 font-medium truncate max-w-[200px]">{c.email || 'No email'}</div>
                                </td>
                                <td className="p-4">
                                  <div className="text-gray-900 font-medium">{c.phone || 'No phone'}</div>
                                </td>
                                <td className="p-4">
                                  <div className="text-gray-600 text-sm truncate max-w-[200px]">{c.address || 'No address'}</div>
                                </td>
                                <td className="p-4">
                                  <span className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
                                    {c.region || 'Unknown'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${billingInfo.color}`}>
                                    {billingInfo.text}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <button
                                    onClick={() => handleLimitClick(c.id, c.name)}
                                    className="font-bold text-purple-700 hover:text-purple-900 hover:underline transition-all duration-200 cursor-pointer bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg border border-purple-200"
                                    title="Click to view limit details"
                                  >
                                    {c.cst_limit || 0}
                                  </button>
                                </td>
                                <td className="p-4">
                                  <span className="font-bold text-red-600">{c.balance || 0}</span>
                                </td>
                                <td className="p-4">
                                  <span className={`font-bold ${statusInfo}`}>{c.amtlimit || 0}</span>
                                </td>
                                
                                <td className="p-4">
                                  <div className="flex flex-wrap gap-1 w-32">
                                    {actionButtons
                                      .filter(action => action.show)
                                      .map((action) => {
                                        const commonClasses = `p-2 ${action.color} text-white rounded text-xs flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200`;
                                        
                                        if (action.key === 'delete') {
                                          return (
                                            <button
                                              key={action.key}
                                              onClick={() => action.onClick(c.id)}
                                              className={commonClasses}
                                              title={action.label}
                                            >
                                              <action.icon className="w-3 h-3" />
                                            </button>
                                          );
                                        }
                                        
                                        return (
                                          <Link
                                            key={action.key}
                                            href={action.href(c.id)}
                                            className={commonClasses}
                                            title={action.label}
                                          >
                                            <action.icon className="w-3 h-3" />
                                          </Link>
                                        );
                                      })}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-4">
                    {currentCustomers.length === 0 ? (
                      <div className="text-center p-8 text-gray-700 font-semibold bg-white rounded-xl">
                        {search ? 'No customers found matching your search' : 'No customers found'}
                      </div>
                    ) : (
                      currentCustomers.map((c) => {
                        const billingInfo = getBillingType(c.billing_type);
                        const remainingLimit = calculateRemainingLimit(c.balance, c.cst_limit);
                        const statusInfo = getStatusColor(c.balance, c.cst_limit);
                        return (
                          <div key={c.id} className="bg-white rounded-xl shadow-lg border border-purple-100 p-4 hover:shadow-xl transition-all duration-200">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-md">
                                  <span className="text-white font-bold">{(c.name?.charAt(0) || 'C').toUpperCase()}</span>
                                </div>
                                <div>
                                  <Link href={`/customers/client-history?id=${c.id}`} className="font-bold text-gray-900 text-lg hover:text-purple-700 transition-colors block">
                                    {c.name || 'Unnamed Customer'}
                                  </Link>
                                  <p className="text-purple-600 font-mono text-sm">#{c.id}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3 text-sm mb-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-gray-600">Email</div>
                                  <div className="font-medium truncate">{c.email || 'No email'}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Phone</div>
                                  <div className="font-medium">{c.phone || 'No phone'}</div>
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-600">Address</div>
                                <div className="font-medium text-sm">{c.address || 'No address'}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-gray-600">Region</div>
                                  <div className="font-medium">{c.region || 'Unknown'}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Type</div>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${billingInfo.color}`}>
                                    {billingInfo.text}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg p-3 mb-3 border border-gray-200">
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <div className="text-xs text-gray-600">Credit Limit</div>
                                  <button
                                    onClick={() => handleLimitClick(c.id, c.name)}
                                    className="font-bold text-sm text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                                    title="Click to view limit details"
                                  >
                                    {c.cst_limit || 0}
                                  </button>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600">Outstanding</div>
                                  <div className="font-bold text-sm text-red-600">{c.balance || 0}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600">Remaining</div>
                                  <div className={`font-bold text-sm ${statusInfo.includes('red') ? 'text-red-600' : statusInfo.includes('yellow') ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {c.amtlimit || 0}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Mobile Action Buttons */}
                            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                              {actionButtons
                                .filter(action => action.show)
                                .map((action) => {
                                  const commonClasses = `p-2 ${action.color} text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 shadow-sm hover:shadow-md transition-all`;
                                  
                                  if (action.key === 'delete') {
                                    return (
                                      <button
                                        key={action.key}
                                        onClick={() => action.onClick(c.id)}
                                        className={commonClasses}
                                      >
                                        <action.icon className="w-3 h-3" />
                                        <span className="text-xs">{action.label}</span>
                                      </button>
                                    );
                                  }
                                  
                                  return (
                                    <Link
                                      key={action.key}
                                      href={action.href(c.id)}
                                      className={commonClasses}
                                    >
                                      <action.icon className="w-3 h-3" />
                                      <span className="text-xs">{action.label}</span>
                                    </Link>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Pagination */}
                  {currentCustomers.length > 0 && totalPages > 1 && (
                    <div className="border-t border-purple-200 pt-4 mt-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-purple-700">
                          Showing {indexOfFirst + 1} to {Math.min(indexOfLast, filteredCustomers.length)} of {filteredCustomers.length} customers
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors text-sm font-medium"
                          >
                            Previous
                          </button>
                          <div className="flex space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              const pageNum = i + 1;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`px-4 py-2 rounded-lg text-sm min-w-[44px] font-medium transition-all ${
                                    currentPage === pageNum 
                                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" 
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-pink-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors text-sm font-medium"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}