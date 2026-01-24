// src/app/customers/page.jsx
"use client";

import { useSession } from '@/context/SessionContext';
import DayLimitManager from "components/DayLimitManager";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BiCoin,
  BiEdit,
  BiMessage,
  BiPlus,
  BiRupee,
  BiSearch,
  BiShow
} from "react-icons/bi";
import { FaToggleOff, FaToggleOn } from "react-icons/fa";

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({ 
    can_edit: false, 
    can_view: false, 
    can_create: false 
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState({});
  const { user } = useSession();
  const router = useRouter();
  const isAdmin = user?.role === 5;

  useEffect(() => {
    if (user) {
      checkPermissions();
    }
  }, [user]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_create: true });
      fetchData();
      return;
    }

    if (user.permissions && user.permissions['Customer']) {
      const customerPerms = user.permissions['Customer'];
      if (customerPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: customerPerms.can_view,
          can_edit: customerPerms.can_edit,
          can_create: customerPerms.can_create || false
        });
        fetchData();
        return;
      }
    }

    const cacheKey = `perms_${user.id}_Customer`;
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
      const moduleName = 'Customer';
      const [viewRes, editRes, createRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`)
      ]);

      const [viewData, editData, createData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        createRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_create: createData.allowed || false
      };

      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        fetchData();
      } else {
        setHasPermission(false);
        setError('You do not have permission to view customers.');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setError('Failed to check permissions.');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const customersRes = await fetch("/api/customers");

      if (!customersRes || !customersRes.ok) {
        throw new Error('Failed to fetch customers');
      }
      const customersData = await customersRes.json();
      setCustomers(customersData);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Failed to load customers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filterCustomersByType = useCallback((customersList, filter) => {
    switch (filter) {
      case "prepaid":
        return customersList.filter(c => c.client_type === "1");
      case "postpaid":
        return customersList.filter(c => c.client_type === "2");
      case "daylimit":
        return customersList.filter(c => c.client_type === "3");
      case "all":
      default:
        return customersList;
    }
  }, []);

  const filteredCustomers = useMemo(() => {
    const typeFiltered = filterCustomersByType(customers, activeFilter);
    return typeFiltered.filter((c) =>
      `${c.name || ''} ${c.email || ''} ${c.phone || ''} ${c.address || ''} ${c.region || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [customers, search, activeFilter, filterCustomersByType]);

  const paginationData = useMemo(() => {
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentCustomers = filteredCustomers.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    
    return { indexOfFirst, indexOfLast, currentCustomers, totalPages };
  }, [currentPage, itemsPerPage, filteredCustomers]);

  const { indexOfFirst, indexOfLast, currentCustomers, totalPages } = paginationData;

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchCustomer, setSwitchCustomer] = useState(null);
  const [switchTarget, setSwitchTarget] = useState('post');
  const [switchValue, setSwitchValue] = useState('');
  const [switchLoading, setSwitchLoading] = useState(false);

  const openSwitchModal = (customer, target) => {
    setSwitchCustomer(customer);
    setSwitchTarget(target);
    setSwitchValue('');
    setShowSwitchModal(true);
  };

  const submitSwitch = async () => {
    if (!switchCustomer) return;
    
    const valNum = Number(switchValue);
    
    if (switchTarget === 'day') {
      if (isNaN(valNum) || valNum < 1) {
        alert('Enter a valid day limit (minimum 1 day)');
        return;
      }
    } else {
      if (isNaN(valNum) || valNum < 0) {
        alert('Enter a valid credit limit');
        return;
      }
    }
    
    try {
      setSwitchLoading(true);
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: switchCustomer.id, 
          targetType: switchTarget, 
          limitValue: valNum 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to switch customer type');
      
      alert(data.message || 'Customer type updated successfully');
      setShowSwitchModal(false);
      setSwitchCustomer(null);
      setSwitchValue('');
      fetchData();
    } catch (e) {
      alert(e.message || 'Failed to switch customer type');
    } finally {
      setSwitchLoading(false);
    }
  };

  const handleStatusToggle = async (customerId, currentStatus) => {
    if (!isAdmin) {
      alert('Only admin can change customer status');
      return;
    }

    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this customer?`)) {
      return;
    }

    try {
      setUpdatingStatus(prev => ({ ...prev, [customerId]: true }));
      
      const res = await fetch('/api/customers/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, status: newStatus })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      alert(result.message || `Customer ${action}d successfully`);
      fetchData();
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update customer status');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [customerId]: false }));
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

  const getClientType = useCallback((client_type) => {
    switch (client_type) {
      case "1":
        return { text: "Prepaid", color: "bg-purple-100 text-purple-800 border border-purple-200" };
      case "2":
        return { text: "Postpaid", color: "bg-orange-100 text-orange-800 border border-orange-200" };
      case "3":
        return { text: "Day Limit", color: "bg-indigo-100 text-indigo-800 border border-indigo-200" };
      default:
        return { text: "Unknown", color: "bg-gray-100 text-gray-800 border border-gray-200" };
    }
  }, []);

  const getDayLimitStatus = useCallback((customer) => {
    if (customer.client_type !== "3") return null;
    const isActive = customer.is_active !== 0;
    return {
      text: isActive ? "Active" : "Expired",
      color: isActive
        ? "bg-gray-100 text-gray-800 border border-gray-200"
        : "bg-red-100 text-red-800 border border-red-200",
      daysRemaining: null
    };
  }, []);

  // Calculate remaining limit (can be negative)
  const calculateRemainingLimit = useCallback((balance, limit) => {
    const bal = Number(balance) || 0;
    const lim = Number(limit) || 0;
    return lim - bal; // Can be negative
  }, []);

  // Get status color based on remaining limit
  const getRemainingLimitStatus = useCallback((balance, limit) => {
    const remaining = calculateRemainingLimit(balance, limit);
    
    if (remaining < 0) {
      return {
        color: "text-red-600 font-bold",
        text: `₹${remaining.toLocaleString('en-IN')}`,
        extraInfo: `Exceeded by ₹${Math.abs(remaining).toLocaleString('en-IN')}`
      };
    }
    
    if (remaining === 0) {
      return {
        color: "text-red-600 font-bold",
        text: `₹0`,
        extraInfo: "Limit fully utilized"
      };
    }
    
    if (remaining < (limit * 0.3)) {
      return {
        color: "text-yellow-600 font-bold",
        text: `₹${remaining.toLocaleString('en-IN')}`,
        extraInfo: "Low limit"
      };
    }
    
    return {
      color: "text-green-600 font-bold",
      text: `₹${remaining.toLocaleString('en-IN')}`,
      extraInfo: "Good standing"
    };
  }, [calculateRemainingLimit]);

  const handleLimitClick = useCallback((customerId, customerName) => {
    window.location.href = `/credit-limit?id=${customerId}`;
  }, []);

  const [dayLimitCustomer, setDayLimitCustomer] = useState(null);
  const openDayLimitManager = useCallback((customer) => {
    setDayLimitCustomer(customer);
  }, []);
  const closeDayLimitManager = useCallback(() => {
    setDayLimitCustomer(null);
  }, []);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Day limit customers के लिए सिर्फ balance fetch करें (no calculation)
  const getDayLimitBalance = useCallback((balance) => {
    const bal = Number(balance) || 0;
    return {
      balance: bal,
      display: `₹${bal.toLocaleString('en-IN')}`,
      color: bal >= 0 ? 'text-green-600' : 'text-red-600'
    };
  }, []);

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
      href: (id) => `/customers/edit?id=${id}`,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      show: permissions.can_edit
    },
    {
      key: 'recharge-request',
      icon: BiRupee,
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
  ], [permissions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter]);

  const stats = useMemo(() => [
    { 
      title: 'Total Customers', 
      value: customers.length, 
      color: 'from-blue-500 to-blue-600',
      filter: 'all',
      count: customers.length
    },
    { 
      title: 'Prepaid Customers', 
      value: customers.filter(c => c.client_type === "1").length, 
      color: 'from-purple-500 to-purple-600',
      filter: 'prepaid',
      count: customers.filter(c => c.client_type === "1").length
    },
    { 
      title: 'Postpaid Customers', 
      value: customers.filter(c => c.client_type === "2").length, 
      color: 'from-orange-500 to-orange-600',
      filter: 'postpaid',
      count: customers.filter(c => c.client_type === "2").length
    },
    { 
      title: 'Day Limit Customers', 
      value: customers.filter(c => c.client_type === "3").length, 
      color: 'from-indigo-500 to-indigo-600',
      filter: 'daylimit',
      count: customers.filter(c => c.client_type === "3").length
    },
  ], [customers]);

  const handleStatClick = (filter) => {
    setActiveFilter(filter);
  };

  const getActiveFilterName = () => {
    switch (activeFilter) {
      case "prepaid": return "Prepaid Customers";
      case "postpaid": return "Postpaid Customers";
      case "daylimit": return "Day Limit Customers";
      default: return "All Customers";
    }
  };

  if (user && !hasPermission) {
    return (
      <div className="flex min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="flex-shrink-0">
          <Sidebar activePage="Customers" />
        </div>
        <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center max-w-2xl mx-auto">
              <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600 text-sm sm:text-base">{error || 'You do not have permission to view customers.'}</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
      <div className="flex-shrink-0">
        <Sidebar activePage="Customers" />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 min-h-0">
          <div className="max-w-7xl mx-auto">
            <nav className="mb-4 lg:mb-6">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => router.back()}
                  className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                  title="Go Back"
                >
                  ←
                </button>
              </div>
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

            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {getActiveFilterName()}
                </h1>
                <p className="text-purple-500 font-medium text-sm lg:text-base">
                  {activeFilter === "all" 
                    ? "Manage all your customers efficiently with real-time data" 
                    : `Showing ${activeFilter} customers only`}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  Total Customers: <span className="font-bold text-indigo-600">{customers.length}</span>
                  {' | '}
                  Active: <span className="font-bold text-green-600">{customers.filter(c => c.status === 1).length}</span>
                  {' | '}
                  Inactive: <span className="font-bold text-red-600">{customers.filter(c => c.status === 0).length}</span>
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
                  href="/customers/activity-logs"
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 font-semibold text-sm lg:text-base whitespace-nowrap transform hover:scale-105"
                >
                  <BiSearch className="text-lg" />
                  <span>Activity Logs</span>
                </Link>
                {permissions.can_create && (
                  <Link
                    href="/customers/add"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 font-semibold text-sm lg:text-base whitespace-nowrap transform hover:scale-105"
                  >
                    <BiPlus className="text-lg" />
                    <span>Add Customer</span>
                  </Link>
                )}
              </div>
            </div>

            {activeFilter !== "all" && (
              <div className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-purple-700 font-medium">
                    Showing {activeFilter} customers only
                  </span>
                  <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {filteredCustomers.length} found
                  </span>
                </div>
                <button
                  onClick={() => setActiveFilter("all")}
                  className="text-purple-600 hover:text-purple-800 font-medium text-sm underline"
                >
                  Show All Customers
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {stats.map((stat, index) => (
                <div 
                  key={index} 
                  className={`bg-gradient-to-r ${stat.color} text-white p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200 cursor-pointer ${
                    activeFilter === stat.filter ? 'ring-4 ring-white ring-opacity-50' : ''
                  }`}
                  onClick={() => handleStatClick(stat.filter)}
                >
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-opacity-90 text-sm mt-1">{stat.title}</div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center items-center p-12 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <span className="ml-4 text-purple-600 font-medium">Loading customers...</span>
              </div>
            )}

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

            {!loading && !error && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1"></div>
                <div className="p-4 lg:p-6">
                  
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                      {search && ` for "${search}"`}
                      {activeFilter !== "all" && ` (${activeFilter} only)`}
                    </div>
                    {totalPages > 1 && (
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </div>
                    )}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden lg:block rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">ID</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Name</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Email</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Phone</th>
                          <th className="text-left p-4 font-bold text-purple-700 border-b border-purple-200">Client Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCustomers.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-gray-700 font-semibold">
                              {search ? 'No customers found matching your search' : `No ${activeFilter !== 'all' ? activeFilter : ''} customers found`}
                            </td>
                          </tr>
                        ) : (
                          currentCustomers.map((c) => {
                            const billingInfo = getBillingType(c.billing_type);
                            const clientTypeInfo = getClientType(c.client_type);
                            const dayLimitStatus = getDayLimitStatus(c);
                            const isDayLimit = c.client_type === "3";
                            const remainingLimitInfo = !isDayLimit ? getRemainingLimitStatus(c.balance, c.cst_limit) : null;
                            const dayLimitBalance = isDayLimit ? getDayLimitBalance(c.balance) : null;
                            
                            return (
                              <React.Fragment key={c.id}>
                                <tr className={`border-b border-purple-100 hover:bg-purple-50 transition-colors duration-200 ${
                                c.status === 0 ? 'bg-red-50/30 opacity-90' : ''
                              }`}>
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
                                        <div className="text-xs text-gray-500">{c.region || 'No region'}</div>
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
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${clientTypeInfo.color}`}>
                                        {clientTypeInfo.text}
                                        {isDayLimit && c.day_limit && (
                                          <span className="ml-1 text-xs">({c.day_limit}d)</span>
                                        )}
                                      </span>
                                      {c.status === 0 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                                          ⚠️ Disabled
                                        </span>
                                      )}
                                      {c.status === 1 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                                          ✓ Active
                                        </span>
                                      )}
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedRows);
                                          if (newExpanded.has(c.id)) {
                                            newExpanded.delete(c.id);
                                          } else {
                                            newExpanded.add(c.id);
                                          }
                                          setExpandedRows(newExpanded);
                                        }}
                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center"
                                        title={expandedRows.has(c.id) ? "Hide Details" : "Show Details"}
                                      >
                                        {expandedRows.has(c.id) ? (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                          </svg>
                                        ) : (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {expandedRows.has(c.id) && (
                                  <tr className="bg-green-50 border-b">
                                    <td colSpan="5" className="p-4">
                                      <div className="space-y-4 animate-fade-in">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {/* Billing Type */}
                                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Billing Type</div>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${billingInfo.color}`}>
                                              {billingInfo.text}
                                            </span>
                                          </div>

                                          {/* Credit Limit */}
                                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Credit Limit</div>
                                            {isDayLimit ? (
                                              <span className="text-sm font-bold text-gray-400">Disabled</span>
                                            ) : (
                                              <button
                                                onClick={() => handleLimitClick(c.id, c.name)}
                                                className="font-bold text-sm text-purple-700 hover:text-purple-900 hover:underline transition-all duration-200 cursor-pointer"
                                                title="Click to manage credit limit"
                                              >
                                                ₹{(c.cst_limit || 0).toLocaleString('en-IN')}
                                              </button>
                                            )}
                                          </div>

                                          {/* Outstanding - सिर्फ balance fetch करें */}
                                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Outstanding</div>
                                            {isDayLimit ? (
                                              // Day limit: सिर्फ balance दिखाएं
                                              <div className={`text-sm font-bold ${dayLimitBalance?.color || 'text-gray-600'}`}>
                                                {dayLimitBalance?.display || '₹0'}
                                              </div>
                                            ) : (
                                              // Prepaid/Postpaid: balance दिखाएं (यह कर्ज है)
                                              <div className="text-sm font-bold text-red-600">
                                                ₹{(c.balance || 0).toLocaleString('en-IN')}
                                              </div>
                                            )}
                                          </div>

                                          {/* Remaining Limit - Only for Prepaid/Postpaid */}
                                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Remaining Limit</div>
                                            {isDayLimit ? (
                                              <span className="text-sm font-bold text-gray-400">N/A</span>
                                            ) : (
                                              <div className="space-y-1">
                                                <div className={remainingLimitInfo?.color}>
                                                  {remainingLimitInfo?.text}
                                                </div>
                                                {remainingLimitInfo?.extraInfo && (
                                                  <div className="text-xs text-gray-600">
                                                    {remainingLimitInfo.extraInfo}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Day Limit Status */}
                                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Day Limit Status</div>
                                            {dayLimitStatus ? (
                                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${dayLimitStatus.color}`}>
                                                {dayLimitStatus.text}
                                              </span>
                                            ) : (
                                              <span className="text-xs text-gray-400">N/A</span>
                                            )}
                                          </div>

                                          {/* Day Limit Info */}
                                          {isDayLimit && (
                                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                              <div className="text-xs font-medium text-gray-500 mb-1">Day Limit</div>
                                              <div className="text-sm font-bold text-indigo-700">{c.day_limit || 0} days</div>
                                            </div>
                                          )}

                                          {/* Actions */}
                                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                                            <div className="text-xs font-medium text-gray-500 mb-2">Actions</div>
                                            <div className="flex flex-wrap gap-1">
                                              {actionButtons
                                                .filter(action => action.show)
                                                .map((action) => {
                                                  const commonClasses = `p-2 ${action.color} text-white rounded text-xs flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200`;
                                                  
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
                                              {isAdmin && (
                                                <button
                                                  onClick={() => handleStatusToggle(c.id, c.status)}
                                                  disabled={updatingStatus[c.id]}
                                                  className={`p-2 rounded text-xs flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 ${
                                                    c.status === 1
                                                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                                      : 'bg-gray-500 text-white hover:bg-gray-600'
                                                  }`}
                                                  title={c.status === 1 ? 'Deactivate' : 'Activate'}
                                                >
                                                  {updatingStatus[c.id] ? (
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                  ) : c.status === 1 ? (
                                                    <FaToggleOn className="text-sm" />
                                                  ) : (
                                                    <FaToggleOff className="text-sm" />
                                                  )}
                                                </button>
                                              )}
                                              {isDayLimit && (
                                                <button
                                                  onClick={() => openDayLimitManager(c)}
                                                  className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200"
                                                  title="Manage Day Limit"
                                                >
                                                  DL
                                                </button>
                                              )}
                                              <button
                                                onClick={() => openSwitchModal(c, isDayLimit ? 'post' : 'day')}
                                                className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded text-xs flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200"
                                                title={
                                                  isDayLimit 
                                                    ? 'Switch to Postpaid' 
                                                    : `Switch to Day Limit`
                                                }
                                              >
                                                SW
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
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
                        {search ? 'No customers found matching your search' : `No ${activeFilter !== 'all' ? activeFilter : ''} customers found`}
                      </div>
                    ) : (
                      currentCustomers.map((c) => {
                        const billingInfo = getBillingType(c.billing_type);
                        const clientTypeInfo = getClientType(c.client_type);
                        const dayLimitStatus = getDayLimitStatus(c);
                        const isDayLimit = c.client_type === "3";
                        const remainingLimitInfo = !isDayLimit ? getRemainingLimitStatus(c.balance, c.cst_limit) : null;
                        const dayLimitBalance = isDayLimit ? getDayLimitBalance(c.balance) : null;
                        
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
                              <div className="flex flex-col items-end space-y-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${clientTypeInfo.color}`}>
                                  {clientTypeInfo.text}
                                </span>
                                {dayLimitStatus && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${dayLimitStatus.color}`}>
                                    {dayLimitStatus.text}
                                  </span>
                                )}
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
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-gray-600">Billing Type</div>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${billingInfo.color}`}>
                                    {billingInfo.text}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-gray-600">Region</div>
                                  <div className="font-medium">{c.region || 'Unknown'}</div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg p-3 mb-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs text-gray-600">Credit Limit</div>
                                  {isDayLimit ? (
                                    <span className="font-bold text-sm text-gray-400">Disabled</span>
                                  ) : (
                                    <button
                                      onClick={() => handleLimitClick(c.id, c.name)}
                                      className="font-bold text-sm text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                                      title="Click to view limit details"
                                    >
                                      ₹{(c.cst_limit || 0).toLocaleString('en-IN')}
                                    </button>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedRows);
                                    if (newExpanded.has(c.id)) {
                                      newExpanded.delete(c.id);
                                    } else {
                                      newExpanded.add(c.id);
                                    }
                                    setExpandedRows(newExpanded);
                                  }}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center"
                                  title={expandedRows.has(c.id) ? "Hide Details" : "Show Details"}
                                >
                                  {expandedRows.has(c.id) ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedRows.has(c.id) && (
                              <div className="mt-3 pt-3 border-t border-green-200 bg-green-50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Details</h4>
                                <div className="space-y-3">
                                  {/* Billing Type */}
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-500 mb-1">Billing Type</div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${billingInfo.color}`}>
                                      {billingInfo.text}
                                    </span>
                                  </div>

                                  {/* Credit Limit */}
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-500 mb-1">Credit Limit</div>
                                    {isDayLimit ? (
                                      <span className="text-sm font-bold text-gray-400">Disabled</span>
                                    ) : (
                                      <button
                                        onClick={() => handleLimitClick(c.id, c.name)}
                                        className="font-bold text-sm text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                                        title="Click to view limit details"
                                      >
                                        ₹{(c.cst_limit || 0).toLocaleString('en-IN')}
                                      </button>
                                    )}
                                  </div>

                                  {/* Outstanding - सिर्फ balance fetch करें */}
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-500 mb-1">Outstanding</div>
                                    {isDayLimit ? (
                                      // Day limit: सिर्फ balance दिखाएं
                                      <div className={`text-sm font-bold ${dayLimitBalance?.color || 'text-gray-600'}`}>
                                        {dayLimitBalance?.display || '₹0'}
                                      </div>
                                    ) : (
                                      // Prepaid/Postpaid: balance दिखाएं (यह कर्ज है)
                                      <div className="text-sm font-bold text-red-600">
                                        ₹{(c.balance || 0).toLocaleString('en-IN')}
                                      </div>
                                    )}
                                  </div>

                                  {/* Remaining Limit - Only for Prepaid/Postpaid */}
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-500 mb-1">Remaining Limit</div>
                                    {isDayLimit ? (
                                      <span className="text-sm font-bold text-gray-400">N/A</span>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className={remainingLimitInfo?.color}>
                                          {remainingLimitInfo?.text}
                                        </div>
                                        {remainingLimitInfo?.extraInfo && (
                                          <div className="text-xs text-gray-600">
                                            {remainingLimitInfo.extraInfo}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Day Limit Status */}
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-500 mb-1">Day Limit Status</div>
                                    {dayLimitStatus ? (
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${dayLimitStatus.color}`}>
                                        {dayLimitStatus.text}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">N/A</span>
                                    )}
                                  </div>

                                  {/* Day Limit Info */}
                                  {isDayLimit && (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <div className="text-xs font-medium text-gray-500 mb-1">Day Limit</div>
                                      <div className="text-sm font-bold text-indigo-700">{c.day_limit || 0} days</div>
                                    </div>
                                  )}

                                  {/* Status */}
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-500 mb-2">Status</div>
                                    <div className="flex items-center justify-between">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        c.status === 1 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {c.status === 1 ? 'Active' : 'Inactive'}
                                      </span>
                                      {isAdmin && (
                                        <button
                                          onClick={() => handleStatusToggle(c.id, c.status)}
                                          disabled={updatingStatus[c.id]}
                                          className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                                            c.status === 1
                                              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                              : 'bg-gray-500 text-white hover:bg-gray-600'
                                          }`}
                                        >
                                          {updatingStatus[c.id] ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          ) : c.status === 1 ? (
                                            <>
                                              <FaToggleOn className="text-sm" />
                                              <span>Deactivate</span>
                                            </>
                                          ) : (
                                            <>
                                              <FaToggleOff className="text-sm" />
                                              <span>Activate</span>
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-500 mb-2">Actions</div>
                                    <div className="grid grid-cols-3 gap-2">
                                      {actionButtons
                                        .filter(action => action.show)
                                        .map((action) => {
                                          const commonClasses = `p-2 ${action.color} text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 shadow-sm hover:shadow-md transition-all`;
                                          
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
                                      {isDayLimit && (
                                        <button
                                          onClick={() => openDayLimitManager(c)}
                                          className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 shadow-sm hover:shadow-md transition-all"
                                        >
                                          <span>Day Limit</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => openSwitchModal(c, isDayLimit ? 'post' : 'day')}
                                        className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 shadow-sm hover:shadow-md transition-all"
                                      >
                                        <span>Switch</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

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

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>

      {/* Switch Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {switchCustomer?.client_type === '3' 
                  ? 'Switch to Postpaid' 
                  : `Switch ${switchCustomer?.client_type === '1' ? 'Prepaid' : 'Postpaid'} to Day Limit`}
              </h3>
              
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Customer: <strong>{switchCustomer?.name}</strong>
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Current: <strong>
                    {switchCustomer?.client_type === '1' ? 'Prepaid' : 
                     switchCustomer?.client_type === '2' ? 'Postpaid' : 'Day Limit'}
                  </strong>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {switchCustomer?.client_type === '3' 
                      ? 'Set Credit Limit (₹)' 
                      : 'Set Day Limit (Days)'}
                  </label>
                  <input
                    type="number"
                    step={switchCustomer?.client_type === '3' ? "0.01" : "1"}
                    min="0"
                    value={switchValue}
                    onChange={(e) => setSwitchValue(e.target.value)}
                    placeholder={
                      switchCustomer?.client_type === '3' 
                        ? 'Enter credit limit amount' 
                        : 'Enter day limit duration'
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {switchCustomer?.client_type === '3' 
                      ? 'Credit limit will be activated for postpaid billing'
                      : 'Day limit will be activated, credit limit will be disabled'}
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => { 
                      setShowSwitchModal(false); 
                      setSwitchCustomer(null); 
                      setSwitchValue(''); 
                    }}
                    disabled={switchLoading}
                    className="px-4 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitSwitch}
                    disabled={switchLoading || !switchValue}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {switchLoading ? 'Switching...' : 'Switch Type'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Limit Manager Modal */}
      {dayLimitCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Manage Day Limit — {dayLimitCustomer.name}</h2>
              <button onClick={closeDayLimitManager} className="text-gray-600 hover:text-gray-900">×</button>
            </div>
            <div className="p-4">
              <DayLimitManager customer={dayLimitCustomer} onUpdate={() => { closeDayLimitManager(); fetchData(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <CustomersPage />;
}