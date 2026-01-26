"use client";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function EditAgentContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('id');
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    aadharNumber: "",
    panNumber: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    password: "",
    confirmPassword: "",
    status: 1
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [commissionRates, setCommissionRates] = useState({});
  const [agentData, setAgentData] = useState(null);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(false);

  // Fetch agent data, customers, and products on mount
  useEffect(() => {
    if (!agentId) {
      alert("Agent ID is required");
      router.push("/agent-management");
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [agentRes, customersRes, productsRes] = await Promise.all([
          fetch(`/api/agent-management?id=${agentId}`),
          fetch('/api/customers'),
          fetch('/api/products')
        ]);
        
        // Fetch agent data
        if (agentRes.ok) {
          const agentData = await agentRes.json();
          console.log('Fetched agent data:', agentData);
          
          // Handle different response formats
          let agent = null;
          if (Array.isArray(agentData) && agentData.length > 0) {
            agent = agentData[0];
          } else if (agentData.agent) {
            agent = agentData.agent;
          } else if (agentData.data) {
            agent = agentData.data;
          } else if (agentData.id) {
            agent = agentData;
          }
          
          if (agent) {
            setAgentData(agent);
            setFormData({
              firstName: agent.first_name || "",
              lastName: agent.last_name || "",
              email: agent.email || "",
              phone: agent.phone || "",
              address: agent.address || "",
              aadharNumber: agent.aadhar_number || "",
              panNumber: agent.pan_number || "",
              bankName: agent.bank_name || "",
              accountNumber: agent.account_number || "",
              ifscCode: agent.ifsc_code || "",
              password: "",
              confirmPassword: "",
              status: agent.status || 1
            });
            
            // Fetch assigned customers and commission rates
            const assignedCustomersRes = await fetch(`/api/agent-management/customers?id=${agentId}`);
            if (assignedCustomersRes.ok) {
              const assignedData = await assignedCustomersRes.json();
              if (assignedData.customers && Array.isArray(assignedData.customers)) {
                setSelectedCustomers(assignedData.customers.map(c => c.customer_id || c.id));
              }
              if (assignedData.commissionRates) {
                setCommissionRates(assignedData.commissionRates);
              }
            }
            
            // Fetch commission history
            fetchCommissionHistory();
          } else {
            alert("Agent not found");
            router.push("/agent-management");
          }
        } else {
          alert("Failed to load agent data");
          router.push("/agent-management");
        }
        
        // Fetch customers
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          let customersList = [];
          if (Array.isArray(customersData)) {
            customersList = customersData;
          } else if (customersData.customers && Array.isArray(customersData.customers)) {
            customersList = customersData.customers;
          }
          
          const filteredCustomers = customersList.filter(c => {
            if (c.roleid !== undefined) {
              const roleId = Number(c.roleid);
              return roleId === 1 || roleId === 3;
            }
            return true;
          });
          
          setCustomers(filteredCustomers);
        }
        
        // Fetch products
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          let productsList = [];
          if (Array.isArray(productsData)) {
            productsList = productsData;
          } else if (productsData.products && Array.isArray(productsData.products)) {
            productsList = productsData.products;
          }
          setProducts(productsList);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert("Error loading data");
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchData();
  }, [agentId, router]);

  const fetchCommissionHistory = async () => {
    try {
      setCommissionLoading(true);
      const res = await fetch(`/api/agent/commission-history?agentId=${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setCommissionHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching commission history:', error);
    } finally {
      setCommissionLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleCustomerToggle = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        const newRates = { ...commissionRates };
        delete newRates[customerId];
        setCommissionRates(newRates);
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const handleCommissionRateChange = (customerId, productId, rate) => {
    setCommissionRates(prev => ({
      ...prev,
      [customerId]: {
        ...(prev[customerId] || {}),
        [productId]: parseFloat(rate) || 0
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.aadharNumber.trim()) newErrors.aadharNumber = "Aadhar number is required";
    if (!formData.panNumber.trim()) newErrors.panNumber = "PAN number is required";
    if (!formData.bankName.trim()) newErrors.bankName = "Bank name is required";
    if (!formData.accountNumber.trim()) newErrors.accountNumber = "Account number is required";
    if (!formData.ifscCode.trim()) newErrors.ifscCode = "IFSC code is required";
    
    // Password is optional for edit, but if provided, must be at least 6 characters
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        alert("No authentication token found. Please login again.");
        router.push("/login");
        return;
      }

      const { confirmPassword, ...submitData } = formData;
      
      // Only include password if it's provided
      if (!submitData.password) {
        delete submitData.password;
      }
      
      // Add agent ID and customer assignments
      submitData.id = agentId;
      submitData.customers = selectedCustomers;
      submitData.commissionRates = commissionRates;

      const response = await fetch("/api/agent-management", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (response.ok) {
        alert("Agent updated successfully!");
        router.push("/agent-management");
      } else {
        alert(data.error || "Failed to update agent");
      }
    } catch (error) {
      console.error("Error updating agent:", error);
      alert("Network error updating agent");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="hidden md:block fixed top-0 left-0 h-full w-64 bg-gray-100 shadow-lg z-20">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col md:ml-64">
          <div className="fixed top-0 left-0 md:left-64 right-0 z-10">
            <Header />
          </div>
          <div className="p-6 mt-16 flex-1 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading agent data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!agentData) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="hidden md:block fixed top-0 left-0 h-full w-64 bg-gray-100 shadow-lg z-20">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col md:ml-64">
          <div className="fixed top-0 left-0 md:left-64 right-0 z-10">
            <Header />
          </div>
          <div className="p-6 mt-16 flex-1 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">Agent not found</p>
              <Link href="/agent-management" className="text-blue-600 hover:underline">
                Back to Agents
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:block fixed top-0 left-0 h-full w-64 bg-gray-100 shadow-lg z-20">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col md:ml-64">
        <div className="fixed top-0 left-0 md:left-64 right-0 z-10">
          <Header />
        </div>
        
        <div className="p-4 md:p-6 mt-16 flex-1 bg-gray-50 overflow-y-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
            <h1 className="text-xl md:text-2xl font-bold">Edit Agent</h1>
            <Link
              href="/agent-management"
              className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 text-sm md:text-base"
            >
              ← Back to Agents
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>
            </div>

            {/* KYC Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium mb-3">KYC Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Number *
                  </label>
                  <input
                    type="text"
                    name="aadharNumber"
                    value={formData.aadharNumber}
                    onChange={handleChange}
                    maxLength="12"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.aadharNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.aadharNumber && <p className="text-red-500 text-xs mt-1">{errors.aadharNumber}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number *
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleChange}
                    maxLength="10"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.panNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.panNumber && <p className="text-red-500 text-xs mt-1">{errors.panNumber}</p>}
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium mb-3">Bank Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.bankName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.ifscCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.ifscCode && <p className="text-red-500 text-xs mt-1">{errors.ifscCode}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="border-b pb-4">
              <h3 className="text-base md:text-lg font-medium mb-3">Status</h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="status"
                    checked={formData.status === 1 || formData.status === true}
                    onChange={(e) => {
                      const nextStatus = e.target.checked ? 1 : 0;
                      const wasActive = (formData.status === 1 || formData.status === true);
                      if (wasActive && nextStatus === 0) {
                        const ok = confirm("Agent ko Inactive karne se commission processing ruk jayegi. Kya aap sure hain?");
                        if (!ok) {
                          e.preventDefault();
                          return;
                        }
                      }
                      setFormData(prev => ({ ...prev, status: nextStatus }));
                    }}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm md:text-base text-gray-700 font-medium">
                    {formData.status === 1 || formData.status === true ? 'Active' : 'Inactive'}
                  </span>
                </label>
                <span className={`px-3 py-1 rounded text-xs md:text-sm font-medium ${
                  formData.status === 1 || formData.status === true 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {formData.status === 1 || formData.status === true ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Customer Assignment */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium mb-3">Customer Assignment</h3>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4">
                {customers.length === 0 ? (
                  <p className="text-gray-500">No customers available</p>
                ) : (
                  <div className="space-y-2">
                    {customers.map(customer => (
                      <div key={customer.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded border border-gray-100">
                        <input
                          type="checkbox"
                          id={`customer-${customer.id}`}
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleCustomerToggle(customer.id)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor={`customer-${customer.id}`} className="flex-1 cursor-pointer">
                          <span className="font-medium text-gray-800">{customer.name || `Customer #${customer.id}`}</span>
                          {customer.phone && <span className="text-gray-500 ml-2">({customer.phone})</span>}
                          {customer.email && <span className="text-gray-400 ml-2 text-xs">- {customer.email}</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Commission Rates */}
            {selectedCustomers.length > 0 && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium mb-3">Product Commission Rates</h3>
                <p className="text-sm text-gray-600 mb-4">Set commission rate (₹ per liter) for each product per customer</p>
                {products.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">No products available. Please add products first.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedCustomers.map(customerId => {
                      const customer = customers.find(c => c.id === customerId);
                      if (!customer) return null;
                      
                      return (
                        <div key={customerId} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm mr-2">
                              {customer.name || `Customer #${customerId}`}
                            </span>
                            <span className="text-xs text-gray-500">({products.length} products)</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {products.map(product => (
                              <div key={product.id} className="flex flex-col bg-white p-3 rounded border border-gray-200">
                                <label className="text-sm font-medium text-gray-700 mb-1">
                                  {product.pname || `Product #${product.id}`} (₹/L)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={commissionRates[customerId]?.[product.id] || ''}
                                  onChange={(e) => handleCommissionRateChange(customerId, product.id, e.target.value)}
                                  placeholder="0.00"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-500 mt-1">Amount per liter</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Commission History */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium mb-3">Commission History</h3>
              {commissionLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading commission history...</p>
                </div>
              ) : commissionHistory.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">No commission history available yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border-b">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border-b">Client</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border-b">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase border-b">Qty (L)</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase border-b">Rate (₹/L)</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase border-b">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {commissionHistory.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs border-b">
                            {new Date(item.completed_date || item.earned_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-xs border-b">{item.client_name || 'N/A'}</td>
                          <td className="px-3 py-2 text-xs border-b">{item.product_name || 'N/A'}</td>
                          <td className="px-3 py-2 text-xs text-right border-b">{parseFloat(item.quantity || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-xs text-right border-b">₹{parseFloat(item.commission_rate || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-xs text-right font-semibold text-green-600 border-b">
                            ₹{parseFloat(item.commission_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {commissionHistory.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Showing last 10 records. <Link href={`/agent-management/${agentId}/commissions`} className="text-blue-600 hover:underline">View all</Link>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Login Credentials */}
            <div className="pb-4">
              <h3 className="text-lg font-medium mb-3">Change Password (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">Leave blank to keep current password</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Link
                href="/agent-management"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Agent"}
              </button>
            </div>
          </form>
        </div>
        
        <Footer />
      </div>
    </div>
  );
}

export default function EditAgent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="hidden md:block fixed top-0 left-0 h-full w-64 bg-gray-100 shadow-lg z-20">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col md:ml-64">
          <div className="fixed top-0 left-0 md:left-64 right-0 z-10">
            <Header />
          </div>
          <div className="p-6 mt-16 flex-1 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading agent data...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <EditAgentContent />
    </Suspense>
  );
}

