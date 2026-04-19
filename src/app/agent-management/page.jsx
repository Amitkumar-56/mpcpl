"use client";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AgentManagement() {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [tdsAmount, setTdsAmount] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agentCustomers, setAgentCustomers] = useState([]);
  const [customerPayments, setCustomerPayments] = useState({});
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [showAllocationsModal, setShowAllocationsModal] = useState(false);
  const [allocationsCustomers, setAllocationsCustomers] = useState([]);
  const [allocationsRates, setAllocationsRates] = useState({});
  const [allocationsAgent, setAllocationsAgent] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const router = useRouter();
  const { user, loading: authLoading } = useSession();

  // Check user permissions for Agent Management
  useEffect(() => {
    const checkPermissions = async () => {
      if (authLoading || !user) return;
      
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/check-permissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token?.trim()}`,
          },
          credentials: 'include',
          body: JSON.stringify({ 
            module_name: "Agent Management",
            user_id: user.id,
            user_role: user.role 
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setUserPermissions(data.permissions || {});
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    };

    checkPermissions();
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    
    // Check if user has permission to view Agent Management
    const hasPermission = userPermissions.can_view === true || Number(user.role) === 5;
    
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    
    fetchAgents();
  }, [user, authLoading, userPermissions]);

  // Filter agents based on search term
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredAgents(agents);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = agents.filter(
        (agent) =>
          agent.first_name?.toLowerCase().includes(lowercasedTerm) ||
          agent.last_name?.toLowerCase().includes(lowercasedTerm) ||
          agent.email?.toLowerCase().includes(lowercasedTerm) ||
          agent.agent_id?.toString().includes(lowercasedTerm) ||
          agent.phone?.includes(searchTerm)
      );
      setFilteredAgents(filtered);
    }
  }, [searchTerm, agents]);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/agent-management", {
        headers: { Authorization: `Bearer ${token?.trim()}` },
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both array and object responses
        if (Array.isArray(data)) {
          setAgents(data);
          setFilteredAgents(data);
        } else if (data.error) {
          console.error("API Error:", data.error);
          setAgents([]);
          setFilteredAgents([]);
        } else {
          setAgents([]);
          setFilteredAgents([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch agents:", errorData.error || response.statusText);
        setAgents([]);
        setFilteredAgents([]);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      setAgents([]);
      setFilteredAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = () => {
    window.open(`/api/agent-management/export-all?search=${encodeURIComponent(searchTerm || "")}`, "_blank");
  };

  // ✅ Calculations for summary cards (using filtered agents for accurate counts)
  const totalAgents = filteredAgents.length;
  const activeAgents = filteredAgents.filter((a) => a.status === true || a.status === 1).length;
  const inactiveAgents = filteredAgents.filter((a) => a.status === false || a.status === 0).length;
  const totalEarnedCommission = filteredAgents.reduce(
    (sum, a) => sum + (parseFloat(a.total_earned || 0) || 0),
    0
  );
  const totalPaidCommission = filteredAgents.reduce(
    (sum, a) => sum + (parseFloat(a.total_paid || 0) || 0),
    0
  );
  const totalDueCommission = filteredAgents.reduce(
    (sum, a) => sum + (parseFloat(a.total_due_commission || 0) || 0),
    0
  );

  const handlePaymentClick = async (agent) => {
    // ✅ STRICT AUTH CHECK: Verify user is logged in and is Admin
    if (!user) {
      alert("You are not logged in. Please login again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      router.push("/login");
      return;
    }

    // ✅ STRICT ROLE CHECK: Only Admin (role 5) can make payments
    if (Number(user.role) !== 5) {
      alert("Access Denied: Only Administrators can record payments.\n\nYour role does not have permission.");
      return;
    }

    setSelectedAgent(agent);
    setPaymentAmount("");
    setPaymentRemarks("");
    setShowPaymentModal(true);
    
    // Fetch assigned customers and their payment details
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? { Authorization: `Bearer ${token.trim()}` } : {};
      const [customersRes, paymentsRes] = await Promise.all([
        fetch(`/api/agent-management/customers?id=${agent.id}`, {
          headers: authHeader,
          credentials: 'include'
        }),
        fetch(`/api/agent-management/payments?agentId=${agent.id}`, {
          headers: authHeader,
          credentials: 'include'
        })
      ]);
      
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setAgentCustomers(customersData.customers || []);
      }
      
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        // Ensure payments is an array
        const payments = Array.isArray(paymentsData.payments) 
          ? paymentsData.payments 
          : Array.isArray(paymentsData) 
            ? paymentsData 
            : [];
        setCustomerPayments(payments);
        setPaymentLogs(paymentsData.logs || []);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || !selectedAgent) return;

    // ✅ STRICT AUTH CHECK: Verify user is logged in and is Admin
    if (!user) {
      alert("You are not logged in. Please login again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      router.push("/login");
      return;
    }

    // ✅ STRICT ROLE CHECK: Only Admin (role 5) can make payments
    if (Number(user.role) !== 5) {
      alert("Access Denied: Only Administrators can record payments.\n\nYour role does not have permission.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      // ✅ STRICT TOKEN VERIFICATION: Verify token is valid and user is Admin
      try {
        const verifyOptions = { credentials: 'include' };
        if (token) {
          verifyOptions.headers = { Authorization: `Bearer ${token.trim()}` };
        }
        const verifyRes = await fetch("/api/auth/verify", verifyOptions);
        
        if (!verifyRes.ok) {
          const verifyData = await verifyRes.json().catch(() => ({}));
          alert("Session expired or invalid. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
          router.push("/login");
          return;
        }
        
        const verifyData = await verifyRes.json();
        
        // ✅ STRICT: Check if verification was successful (API returns 'authenticated' not 'success')
        if (!verifyData.authenticated) {
          alert("Authentication failed. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
          router.push("/login");
          return;
        }
        
        // ✅ STRICT: Check if user is Admin (role 5)
        // API returns user data directly, not nested in 'user' object
        const userRole = Number(verifyData.role || verifyData.user?.role || 0);
        if (userRole !== 5) {
          alert("Access Denied: Only Administrators can record payments.\n\nYour role does not have permission.");
          return;
        }
      } catch (verifyError) {
        console.error("Token verification error:", verifyError);
        alert("Authentication failed. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        router.push("/login");
        return;
      }
      
      // Get selected customer ID from dropdown if available
      const customerSelect = document.getElementById('paymentCustomerId');
      const customerId = customerSelect ? (customerSelect.value ? parseInt(customerSelect.value) : null) : null;
      
      const res = await fetch("/api/agent-management/payments", {
        method: "POST",
        headers: (() => {
          const h = { "Content-Type": "application/json" };
          if (token) h.Authorization = `Bearer ${token.trim()}`;
          return h;
        })(),
        credentials: 'include', // Include cookies for token
        body: JSON.stringify({
          agentId: selectedAgent.id,
          amount: parseFloat(paymentAmount),
          tdsAmount: tdsAmount ? parseFloat(tdsAmount) : 0,
          remarks: paymentRemarks,
          customerId: customerId, // Include customer ID if selected
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        // If response is not JSON, get text
        const text = await res.text();
        console.error("Payment API response (non-JSON):", text);
        alert(`Payment failed: ${res.status} ${res.statusText}\n${text}`);
        return;
      }

      if (res.ok) {
        const paymentId = data.id ? `Payment ID: #${data.id}` : '';
        
        // Show success message first
        alert(`Payment recorded successfully!\n${paymentId}\n${data.message || ''}`);
        
        // Refresh customer data and payment history
        if (selectedAgent) {
          try {
            const refreshToken = localStorage.getItem("token");
            if (refreshToken) {
              const [customersRes, paymentsRes] = await Promise.all([
                fetch(`/api/agent-management/customers?id=${selectedAgent.id}`, {
                headers: refreshToken ? { Authorization: `Bearer ${refreshToken.trim()}` } : undefined,
                credentials: 'include'
              }),
              fetch(`/api/agent-management/payments?agentId=${selectedAgent.id}`, {
                headers: refreshToken ? { Authorization: `Bearer ${refreshToken.trim()}` } : undefined,
                credentials: 'include'
              })
              ]);
              
              if (customersRes.ok) {
                const customersData = await customersRes.json();
                setAgentCustomers(customersData.customers || []);
              }
              
              if (paymentsRes.ok) {
                const paymentsData = await paymentsRes.json();
                // Ensure payments is an array
                const payments = Array.isArray(paymentsData.payments) 
                  ? paymentsData.payments 
                  : Array.isArray(paymentsData) 
                    ? paymentsData 
                    : [];
                setCustomerPayments(payments);
                console.log('Payment history refreshed:', payments.length, 'payments');
              }
            }
          } catch (error) {
            console.error('Error refreshing payment data:', error);
          }
        }
        
        // Clear form but keep modal open to see updated data
        setPaymentAmount("");
        setTdsAmount("");
        setPaymentRemarks("");
        
        // Refresh agents list to update commission amounts
        await fetchAgents();
        
        // Update selectedAgent with new commission data
        if (selectedAgent) {
          const updatedAgents = await fetch("/api/agent-management", {
            headers: token ? { Authorization: `Bearer ${token.trim()}` } : undefined,
            credentials: 'include'
          }).then(res => res.ok ? res.json() : []);
          
          const updatedAgent = updatedAgents.find(a => a.id === selectedAgent.id);
          if (updatedAgent) {
            setSelectedAgent(updatedAgent);
          }
        }
        
        // Close modal and redirect to Agent Management
        setShowPaymentModal(false);
        router.push("/agent-management");
      } else {
        const errorMsg = data?.error || data?.message || "Failed to record payment";
        const details = data?.details ? `\n${data.details}` : '';
        
        // If unauthorized or forbidden, redirect to login
        if (res.status === 401 || res.status === 403) {
          alert(`${errorMsg}${details}\n\nRedirecting to login...`);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
          router.push("/login");
          return;
        }
        
        alert(`${errorMsg}${details}`);
        console.error("Payment error:", {
          status: res.status,
          statusText: res.statusText,
          data: data,
          response: res
        });
      }
    } catch (err) {
      console.error("Payment submission error:", err);
      alert(`Error recording payment: ${err.message || 'Network error. Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllocationsClick = async (agent) => {
    setAllocationsAgent(agent);
    setShowAllocationsModal(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token.trim()}` } : undefined;
      const res = await fetch(`/api/agent-management/customers?id=${agent.id}`, {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAllocationsCustomers(data.customers || []);
        setAllocationsRates(data.commissionRates || {});
      } else {
        setAllocationsCustomers([]);
        setAllocationsRates({});
      }
    } catch (e) {
      setAllocationsCustomers([]);
      setAllocationsRates({});
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 flex items-center justify-center p-6 bg-gray-50/50">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
                <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
              </div>
              <p className="text-gray-600 font-medium mt-4 tracking-wide">Loading Agents Data...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Check if user has permission to view Agent Management
  const hasPermission = userPermissions.can_view === true || Number(user?.role) === 5;
  
  if (!hasPermission) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
              <div className="text-red-500 text-5xl mb-2">🚫</div>
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">You don't have permission to view Agent Management.</p>
              <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded">Go to Dashboard</Link>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
          {/* Header area with Title, Search, and Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  title="Go Back"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Agent Management</h1>
              </div>
              <p className="text-gray-500 text-sm mt-1 ml-11">Manage all your agents, commissions, and view TDS history.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <Link
                href="/agent-management/tds"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                TDS History
              </Link>
              <Link
                href="/agent-management/create"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 hover:shadow-md transition-all font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Agent
              </Link>
              <button
                onClick={handleExportAll}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 hover:shadow-md transition-all font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>

          {/* ✅ Summary Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Total Agents */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path></svg>
              </div>
              <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Total Agents</h3>
              <p className="text-3xl font-bold text-gray-800">{totalAgents}</p>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1"><div className="bg-blue-500 h-1 rounded-full" style={{ width: '100%' }}></div></div>
            </div>

            {/* Active Agents */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              </div>
              <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Active Agents</h3>
              <p className="text-3xl font-bold text-green-600">{activeAgents}</p>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1"><div className="bg-green-500 h-1 rounded-full" style={{ width: `${totalAgents ? (activeAgents/totalAgents)*100 : 0}%` }}></div></div>
            </div>

            {/* Inactive Agents */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              </div>
              <h3 className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Inactive Agents</h3>
              <p className="text-3xl font-bold text-red-500">{inactiveAgents}</p>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1"><div className="bg-red-500 h-1 rounded-full" style={{ width: `${totalAgents ? (inactiveAgents/totalAgents)*100 : 0}%` }}></div></div>
            </div>

            {/* Total Commission Earned */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group lg:col-span-1">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-gray-500 font-medium text-xs mb-1 uppercase tracking-wider truncate">Total Commission</h3>
              <p className="text-2xl font-bold text-gray-800">
                ₹{totalEarnedCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1"><div className="bg-purple-500 h-1 rounded-full" style={{ width: '100%' }}></div></div>
            </div>

            {/* Total Due & Paid */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group lg:col-span-1 flex flex-col justify-between">
              <div>
                <h3 className="text-gray-500 font-medium text-xs mb-1 uppercase tracking-wider">Total Due</h3>
                <p className="text-lg font-bold text-orange-500">
                  ₹{totalDueCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <h3 className="text-gray-400 font-medium text-[10px] mb-0.5 uppercase tracking-wider">Total Paid</h3>
                <p className="text-sm font-semibold text-teal-600">
                  ₹{totalPaidCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-700">
                Showing {filteredAgents.length} of {agents.length} agents matching "{searchTerm}"
                <button 
                  onClick={() => setSearchTerm("")}
                  className="ml-2 text-blue-500 hover:text-blue-700 underline"
                >
                  Clear search
                </button>
              </p>
            </div>
          )}

          {/* ✅ Table */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 uppercase">Agent ID</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 uppercase">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 uppercase">Total Due Commission</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 uppercase">Unsettled TDS</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono">{agent.agent_id}</td>
                    <td className="px-6 py-4">
                      {agent.first_name} {agent.last_name}
                    </td>
                    <td className="px-6 py-4">{agent.email}</td>
                    <td className="px-6 py-4">{agent.phone}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          agent.status === true || agent.status === 1
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {agent.status === true || agent.status === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-blue-600 font-semibold">
                      ₹{(agent.total_due_commission || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {parseFloat(agent.unsettled_tds || 0) > 0 ? (
                        <Link 
                          href="/agent-management/tds" 
                          className="text-rose-600 hover:text-rose-800 hover:underline transition-colors flex items-center gap-1"
                          title="Click to view and settle TDS"
                        >
                          ₹{(parseFloat(agent.unsettled_tds) || 0).toLocaleString('en-IN', {minimumFractionDigits: 0})}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </Link>
                      ) : (
                        <span className="text-gray-400">₹0</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(userPermissions.can_edit === true || Number(user.role) === 5) && (
                          <Link
                            href={`/agent-management/edit?id=${agent.id}`}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 whitespace-nowrap"
                          >
                            Edit
                          </Link>
                        )}
                        {(userPermissions.can_edit === true || Number(user.role) === 5) && (
                          <Link
                            href={`/agent-management/customers/${agent.id}`}
                            className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600 whitespace-nowrap"
                          >
                            Allocate
                          </Link>
                        )}
                        <Link
                          href={`/agent-management/${agent.id}/commissions`}
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 whitespace-nowrap"
                        >
                          Commissions
                        </Link>
                        <button
                          onClick={() => handleAllocationsClick(agent)}
                          className="bg-indigo-500 text-white px-2 py-1 rounded text-xs hover:bg-indigo-600 whitespace-nowrap"
                        >
                          Customers & Rates
                        </button>
                        {(agent.total_due_commission || 0) > 0 && (userPermissions.can_edit === true || Number(user?.role) === 5) && (
                          <button
                            onClick={() => handlePaymentClick(agent)}
                            className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 whitespace-nowrap"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAgents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? (
                  <>
                    No agents found matching "{searchTerm}".{" "}
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="text-blue-600 hover:underline"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    No agents found.{" "}
                    <Link href="/agent-management/create" className="text-blue-600 hover:underline">
                      Create your first agent
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedAgent && user && (userPermissions.can_edit === true || Number(user.role) === 5) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden relative">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Record Payment</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">
                   Agent: <span className="font-semibold text-slate-700">{selectedAgent.first_name} {selectedAgent.last_name}</span> (ID: {selectedAgent.agent_id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedAgent(null);
                  setPaymentAmount("");
                  setTdsAmount("");
                  setPaymentRemarks("");
                  setAgentCustomers([]);
                  setCustomerPayments({});
                  setExpandedCustomer(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full transition-colors border border-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {/* Agent Commission Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-1">Total Earned</p>
                  <p className="text-xl font-black text-emerald-800">₹{(selectedAgent.total_earned || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mb-1">Total Paid</p>
                  <p className="text-xl font-black text-blue-800">₹{(selectedAgent.total_paid || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] text-orange-700 font-bold uppercase tracking-wider mb-1">Remaining Due</p>
                  <p className="text-xl font-black text-orange-800">₹{(selectedAgent.total_due_commission || 0).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</p>
                </div>
              </div>

              {selectedAgent.bank_name && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-x-6 gap-y-2 text-sm justify-center md:justify-start">
                  <div>
                    <span className="text-slate-500 font-medium text-[13px]">Bank:</span>
                    <span className="ml-1.5 font-semibold text-slate-800">{selectedAgent.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium text-[13px]">Acct:</span>
                    <span className="ml-1.5 font-semibold text-slate-800">{selectedAgent.account_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium text-[13px]">IFSC:</span>
                    <span className="ml-1.5 font-semibold text-slate-800">{selectedAgent.ifsc_code || '—'}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-6">
                {/* Customer Selection for Payment */}
                {agentCustomers.length > 0 && (
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                    <label className="block text-indigo-900 mb-2 text-sm font-semibold">
                      Select Customer specific payment <span className="text-indigo-500">*</span>
                    </label>
                    <select
                      id="paymentCustomerId"
                      className="w-full border border-indigo-200 rounded-lg px-4 py-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm bg-white font-medium shadow-sm transition-all text-slate-700"
                    >
                      <option value="">-- General Payment / Entire Due --</option>
                      {agentCustomers
                        .filter(customer => parseFloat(customer.remaining_commission || 0) > 0) // ONLY customers with pending due
                        .map(customer => {
                          const remaining = parseFloat(customer.remaining_commission || 0);
                          return (
                            <option key={customer.customer_id} value={customer.customer_id}>
                              {customer.name || `Customer #${customer.customer_id}`} - Due: ₹{remaining.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </option>
                          );
                        })}
                    </select>
                    <p className="text-[11px] text-indigo-500 mt-2 font-medium">
                      Select specific customer from dropdown to map payment specifically to their pending due.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-slate-700 mb-2 text-sm font-medium">Payment Amount <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-semibold">₹</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={selectedAgent.total_due_commission || 0}
                        required
                        className="w-full pl-8 border border-slate-300 rounded-lg px-4 py-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-semibold shadow-sm text-slate-800"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-slate-700 mb-2 text-sm font-medium">TDS Deduction</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-semibold">₹</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 border border-slate-300 rounded-lg px-4 py-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-semibold shadow-sm text-slate-800"
                        value={tdsAmount}
                        onChange={(e) => setTdsAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {(parseFloat(paymentAmount || 0) > 0) && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-0.5">Net Payable Amount</p>
                      <p className="text-[11px] text-emerald-600">Gross minus TDS deduction</p>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-700">
                      ₹{Math.max(0, (parseFloat(paymentAmount || 0) || 0) - (parseFloat(tdsAmount || 0) || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 mb-2 text-sm font-medium">Remarks</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm resize-none shadow-sm text-slate-800"
                    rows="2"
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                    placeholder="Transaction details, Check No, Payment Method..."
                  ></textarea>
                </div>
              
                {Array.isArray(paymentLogs) && paymentLogs.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Logs</p>
                    <div className="space-y-2">
                      {paymentLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="text-xs flex justify-between items-start bg-slate-50 border border-slate-100 p-3 rounded-lg shadow-sm">
                          <div>
                            <p className="font-semibold text-slate-700">
                              ₹{parseFloat(log.amount || 0).toFixed(0)}
                              {parseFloat(log.tds_amount || 0) > 0 && (
                                <span className="text-slate-500 font-normal ml-1">
                                  (-TDS ₹{parseFloat(log.tds_amount).toFixed(0)}) <span className="font-medium text-slate-800">= Net ₹{parseFloat(log.net_amount || ((log.amount || 0) - (log.tds_amount || 0))).toFixed(0)}</span>
                                </span>
                              )}
                            </p>
                            <p className="text-slate-400 text-[10px] mt-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 
                              {log.paid_by_user_name || 'Admin'} • {new Date(log.payment_date).toLocaleString('en-IN')}
                            </p>
                          </div>
                          {log.customer_name && (
                            <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md shadow-sm font-medium">
                              {log.customer_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedAgent(null);
                      setPaymentAmount("");
                      setTdsAmount("");
                      setPaymentRemarks("");
                      setAgentCustomers([]);
                      setCustomerPayments({});
                      setExpandedCustomer(null);
                    }}
                    className="px-6 py-2.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 font-medium rounded-xl text-sm transition-colors w-full sm:w-auto shadow-sm"
                  >
                    Cancel
                  </button>
                   <button
                    type="submit"
                    disabled={submitting || !paymentAmount || !user || (userPermissions.can_edit !== true && Number(user?.role) !== 5)}
                    className="px-7 py-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 disabled:opacity-50 disabled:shadow-none text-sm font-semibold transition-all w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Processing...
                      </>
                    ) : "Confirm Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Allocations Modal */}
      {showAllocationsModal && allocationsAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">My Allocated Customers & Rates</h2>
              <button
                onClick={() => {
                  setShowAllocationsModal(false);
                  setAllocationsAgent(null);
                  setAllocationsCustomers([]);
                  setAllocationsRates({});
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-600">
                Agent: {allocationsAgent.first_name} {allocationsAgent.last_name} • ID: {allocationsAgent.agent_id}
              </p>
            </div>
            {allocationsCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No allocated customers found.</div>
            ) : (
              <div className="space-y-3">
                {allocationsCustomers.map((customer) => {
                  const cId = customer.customer_id || customer.id;
                  const rates = allocationsRates[cId] || {};
                  return (
                    <div key={cId} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{customer.name || `Customer #${cId}`}</p>
                          {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Commission Earned</p>
                          <p className="text-sm font-bold text-green-700">₹{parseFloat(customer.total_earned_commission || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      {Array.isArray(customer.product_breakdown) && customer.product_breakdown.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600">
                              <tr>
                                <th className="px-3 py-2 text-left">Product</th>
                                <th className="px-3 py-2 text-right">Rate (₹/L)</th>
                                <th className="px-3 py-2 text-right">Quantity (L)</th>
                                <th className="px-3 py-2 text-right">Transactions</th>
                                <th className="px-3 py-2 text-right">Total Commission (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {customer.product_breakdown.map((p, idx) => {
                                const rate = rates[p.product_id] ?? null;
                                return (
                                  <tr key={idx}>
                                    <td className="px-3 py-2">{p.product_name}</td>
                                    <td className="px-3 py-2 text-right">{rate !== null ? `₹${parseFloat(rate || 0).toFixed(2)}` : '-'}</td>
                                    <td className="px-3 py-2 text-right">{parseFloat(p.total_quantity || 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right">{parseInt(p.transaction_count || 0)}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-green-700">₹{parseFloat(p.total_commission || 0).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
