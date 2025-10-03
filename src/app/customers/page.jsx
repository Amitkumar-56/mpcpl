// app/customers/page.jsx
"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BiCoin,
  BiCreditCard,
  BiDollar,
  BiEdit,
  BiHistory,
  BiMessage,
  BiPlus,
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
  }); // Default true for testing
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch customers
        const customersRes = await fetch("/api/customers");
        const customersData = await customersRes.json();
        setCustomers(customersData);

        // Try to fetch permissions, but if fails, use default permissions
        try {
          const permRes = await fetch("/api/permissions?module=Customers");
          if (permRes.ok) {
            const permData = await permRes.json();
            setPermissions(permData);
          }
        } catch (permError) {
          console.log("Using default permissions");
          // Use default permissions if API fails
          setPermissions({ can_edit: true, can_view: true, can_delete: true });
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    }
    fetchData();
  }, []);

  const filteredCustomers = customers.filter((c) =>
    `${c.name} ${c.email} ${c.phone} ${c.address} ${c.region}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const res = await fetch("/api/customers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
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

  const getBillingType = (type) => {
    switch (type) {
      case 1:
        return { text: "Billing", color: "bg-green-100 text-green-800" };
      case 2:
        return { text: "Non Billing", color: "bg-blue-100 text-blue-800" };
      default:
        return { text: "Unknown", color: "bg-gray-100 text-gray-800" };
    }
  };

  const getStatusColor = (balance, limit) => {
    const remaining = limit - balance;
    if (remaining <= 0) return "bg-red-100 text-red-800";
    if (remaining < limit * 0.3) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  // Debug permissions
  console.log("Current Permissions:", permissions);

  // Action buttons configuration - TEMPORARILY SHOW ALL FOR TESTING
  const actionButtons = [
    {
      key: 'view',
      icon: BiShow,
      label: 'View Details',
      href: (id) => `/customers/details/${id}`,
      color: 'bg-blue-500 hover:bg-blue-600',
      show: true // Always show view
    },
    {
      key: 'edit',
      icon: BiEdit,
      label: 'Edit Customer',
      href: (id) => `/customers/edit/${id}`,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      show: true // permissions.can_edit - TEMPORARILY TRUE
    },
    {
      key: 'recharge-history',
      icon: BiHistory,
      label: 'Recharge History',
      href: (id) => `/customers/recharge-history/${id}`,
      color: 'bg-green-500 hover:bg-green-600',
      show: true // permissions.can_edit - TEMPORARILY TRUE
    },
    {
      key: 'recharge-request',
      icon: BiDollar,
      label: 'Recharge Request',
      href: (id) => `/customers/recharge-request/${id}`,
      color: 'bg-purple-500 hover:bg-purple-600',
      show: true // permissions.can_edit - TEMPORARILY TRUE
    },
    {
      key: 'deal-price',
      icon: BiCoin,
      label: 'Deal Price',
      href: (id) => `/customers/deal-price/${id}`,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      show: true // permissions.can_edit - TEMPORARILY TRUE
    },
    {
      key: 'messages',
      icon: BiMessage,
      label: 'Messages',
      href: (id) => `/customers/messages/${id}`,
      color: 'bg-teal-500 hover:bg-teal-600',
      show: true // permissions.can_edit - TEMPORARILY TRUE
    },
    {
      key: 'billing',
      icon: BiCreditCard,
      label: 'Billing Info',
      href: (id) => `/customers/billing/${id}`,
      color: 'bg-orange-500 hover:bg-orange-600',
      show: true // permissions.can_edit - TEMPORARILY TRUE
    },
    {
      key: 'delete',
      icon: BiTrash,
      label: 'Delete Customer',
      onClick: (id) => handleDelete(id),
      color: 'bg-red-500 hover:bg-red-600',
      show: true // permissions.can_delete - TEMPORARILY TRUE
    }
  ];

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
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-4 lg:mb-6">
              <ol className="flex items-center gap-2 text-sm text-purple-600">
                <li>
                  <Link href="/" className="hover:text-purple-800 font-medium">Home</Link>
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
                    className="w-full lg:w-64 border-2 border-purple-100 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all duration-300 bg-white/50 text-sm lg:text-base"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Link
                  href="/customers/add"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 flex items-center space-x-2 font-semibold text-sm lg:text-base whitespace-nowrap"
                >
                  <BiPlus className="text-lg" />
                  <span>Add Customer</span>
                </Link>
              </div>
            </div>

            {/* Debug Permissions Info */}
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>Debug Info:</strong> Permissions - Edit: {permissions.can_edit ? 'Yes' : 'No'}, 
                View: {permissions.can_view ? 'Yes' : 'No'}, 
                Delete: {permissions.can_delete ? 'Yes' : 'No'}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="text-2xl font-bold">{customers.length}</div>
                <div className="text-blue-100 text-sm">Total Customers</div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="text-2xl font-bold">{customers.filter(c => c.billing_type === 1).length}</div>
                <div className="text-green-100 text-sm">Billing Customers</div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="text-2xl font-bold">{customers.filter(c => c.billing_type === 2).length}</div>
                <div className="text-purple-100 text-sm">Non-Billing</div>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="text-2xl font-bold">{customers.filter(c => c.balance > c.cst_limit).length}</div>
                <div className="text-orange-100 text-sm">Over Limit</div>
              </div>
            </div>

            {/* Customers List/Table */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1"></div>
              <div className="p-4 lg:p-6 overflow-auto max-h-[70vh]">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                        <th className="text-left p-4 font-bold text-purple-700">ID</th>
                        <th className="text-left p-4 font-bold text-purple-700">Customer</th>
                        <th className="text-left p-4 font-bold text-purple-700">Contact</th>
                        <th className="text-left p-4 font-bold text-purple-700">Region</th>
                        <th className="text-left p-4 font-bold text-purple-700">Billing Type</th>
                        <th className="text-left p-4 font-bold text-purple-700">Financials</th>
                        <th className="text-left p-4 font-bold text-purple-700 w-64">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCustomers.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-gray-700 font-semibold">No customers found</td>
                        </tr>
                      ) : (
                        currentCustomers.map((c) => {
                          const billingInfo = getBillingType(c.billing_type);
                          const statusInfo = getStatusColor(c.balance, c.cst_limit);
                          return (
                            <tr key={c.id} className="border-b border-purple-100 hover:bg-purple-50 transition-colors">
                              <td className="p-4 font-mono text-purple-600 font-bold">#{c.id}</td>
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">{c.name?.charAt(0) || 'C'}</span>
                                  </div>
                                  <div>
                                    <Link href={`/customers/history/${c.id}`} className="font-bold text-gray-900 hover:text-purple-700">{c.name}</Link>
                                    <div className="text-sm text-gray-600">{c.address}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="text-gray-900 font-medium">{c.email}</div>
                                <div className="text-sm text-gray-600">{c.phone}</div>
                              </td>
                              <td className="p-4">
                                <span className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                  {c.region}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${billingInfo.color}`}>
                                  {billingInfo.text}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Limit:</span>
                                    <span className="font-bold">${c.cst_limit}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Balance:</span>
                                    <span className="font-bold text-red-600">${c.balance}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Remaining:</span>
                                    <span className={`font-bold ${statusInfo}`}>${c.amtlimit}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-2">
                                  {actionButtons.map((action) => {
                                    if (!action.show) {
                                      console.log(`Hiding action: ${action.key}`);
                                      return null;
                                    }
                                    
                                    console.log(`Showing action: ${action.key}`);
                                    
                                    if (action.key === 'delete') {
                                      return (
                                        <button
                                          key={action.key}
                                          onClick={() => action.onClick(c.id)}
                                          className={`p-2 ${action.color} text-white rounded-lg transition-colors duration-200 flex items-center justify-center`}
                                          title={action.label}
                                        >
                                          <action.icon className="w-4 h-4" />
                                        </button>
                                      );
                                    }
                                    
                                    return (
                                      <Link
                                        key={action.key}
                                        href={action.href(c.id)}
                                        className={`p-2 ${action.color} text-white rounded-lg transition-colors duration-200 flex items-center justify-center`}
                                        title={action.label}
                                      >
                                        <action.icon className="w-4 h-4" />
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
                  {currentCustomers.map((c) => {
                    const billingInfo = getBillingType(c.billing_type);
                    const statusInfo = getStatusColor(c.balance, c.cst_limit);
                    return (
                      <div key={c.id} className="bg-white rounded-xl shadow-lg border border-purple-100 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold">{c.name?.charAt(0) || 'C'}</span>
                            </div>
                            <div>
                              <Link href={`/customers/history/${c.id}`} className="font-bold text-gray-900 text-lg">{c.name}</Link>
                              <p className="text-purple-600 font-mono text-sm">#{c.id}</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <div className="text-gray-600">Email</div>
                            <div className="font-medium">{c.email}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Phone</div>
                            <div className="font-medium">{c.phone}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Region</div>
                            <div className="font-medium">{c.region}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Type</div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${billingInfo.color}`}>
                              {billingInfo.text}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg p-3">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-xs text-gray-600">Limit</div>
                              <div className="font-bold text-sm">${c.cst_limit}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">Balance</div>
                              <div className="font-bold text-sm text-red-600">${c.balance}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">Remaining</div>
                              <div className={`font-bold text-sm ${statusInfo.includes('red') ? 'text-red-600' : statusInfo.includes('yellow') ? 'text-yellow-600' : 'text-green-600'}`}>
                                ${c.amtlimit}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Mobile Action Buttons */}
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                          {actionButtons.map((action) => {
                            if (!action.show) return null;
                            
                            if (action.key === 'delete') {
                              return (
                                <button
                                  key={action.key}
                                  onClick={() => action.onClick(c.id)}
                                  className={`flex-1 min-w-[60px] p-2 ${action.color} text-white rounded-lg text-xs font-medium flex flex-col items-center gap-1`}
                                >
                                  <action.icon className="w-4 h-4" />
                                  <span className="text-xs">Delete</span>
                                </button>
                              );
                            }
                            
                            return (
                              <Link
                                key={action.key}
                                href={action.href(c.id)}
                                className={`flex-1 min-w-[60px] p-2 ${action.color} text-white rounded-lg text-xs font-medium flex flex-col items-center gap-1`}
                              >
                                <action.icon className="w-4 h-4" />
                                <span className="text-xs">
                                  {action.key === 'view' && 'View'}
                                  {action.key === 'edit' && 'Edit'}
                                  {action.key === 'recharge-history' && 'History'}
                                  {action.key === 'recharge-request' && 'Recharge'}
                                  {action.key === 'deal-price' && 'Deal Price'}
                                  {action.key === 'messages' && 'Messages'}
                                  {action.key === 'billing' && 'Billing'}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {currentCustomers.length > 0 && (
                  <div className="border-t border-purple-200 pt-4 mt-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-purple-700">
                        Showing {indexOfFirst + 1} to {Math.min(indexOfLast, filteredCustomers.length)} of {filteredCustomers.length} customers
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 text-sm"
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
                                className={`px-3 py-2 rounded-lg text-sm min-w-[40px] ${currentPage === pageNum ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 bg-pink-500 text-white rounded-lg disabled:bg-gray-300 text-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}