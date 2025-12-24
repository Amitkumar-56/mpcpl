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
  const router = useRouter();
  const { user, loading: authLoading } = useSession();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (Number(user.role) !== 5) {
      setLoading(false);
      return;
    }
    fetchAgents();
  }, [user, authLoading]);

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

  if (authLoading || loading) return <div className="p-6">Loading...</div>;

  if (Number(user?.role) !== 5) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
              <div className="text-red-500 text-5xl mb-2">🚫</div>
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">Only Admin can view Agent Management.</p>
              <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded">Go to Dashboard</Link>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:block fixed top-0 left-0 h-full w-64 bg-white shadow z-20">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <div className="fixed top-0 left-0 md:left-64 right-0 z-10">
          <Header />
        </div>

        <div className="p-4 md:p-6 mt-16 flex-1 overflow-y-auto">
          {/* Page Title */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Agent Management</h1>
          </div>

          {/* Search Bar */}
          <div className="mb-4 md:mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, email, ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Create New Agent Button - Moved down */}
          <div className="mb-4 md:mb-6">
            <Link
              href="/agent-management/create"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition whitespace-nowrap text-center text-sm md:text-base"
            >
              + Create New Agent
            </Link>
          </div>

          {/* ✅ Summary Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 md:mb-6">
            {/* Total Agents */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <h3 className="text-gray-600 font-semibold mb-1">Total Agents</h3>
              <p className="text-3xl font-bold text-blue-600">{totalAgents}</p>
              <span className="text-sm text-gray-500 mt-1">All Registered Agents</span>
            </div>

            {/* Active Agents */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <h3 className="text-gray-600 font-semibold mb-1">Active Agents</h3>
              <p className="text-3xl font-bold text-green-600">{activeAgents}</p>
              <span className="text-sm text-gray-500 mt-1">Currently Active</span>
            </div>

            {/* Inactive Agents */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <h3 className="text-gray-600 font-semibold mb-1">Inactive Agents</h3>
              <p className="text-3xl font-bold text-red-600">{inactiveAgents}</p>
              <span className="text-sm text-gray-500 mt-1">Currently Inactive</span>
            </div>

            {/* Total Commission Earned */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <h3 className="text-gray-600 font-semibold mb-1">Total Commission Earned</h3>
              <p className="text-3xl font-bold text-purple-600">
                ₹{totalEarnedCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-sm text-gray-500 mt-1">Across all agents</span>
            </div>

            {/* Total Due Commission */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <h3 className="text-gray-600 font-semibold mb-1">Total Due Commission</h3>
              <p className="text-3xl font-bold text-yellow-600">
                ₹{totalDueCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-sm text-gray-500 mt-1">From All Agents</span>
            </div>
            
            {/* Total Paid */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-500 lg:col-span-1 sm:col-span-2 col-span-1">
              <h3 className="text-gray-600 font-semibold mb-1">Total Paid</h3>
              <p className="text-3xl font-bold text-teal-600">
                ₹{totalPaidCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-sm text-gray-500 mt-1">Admin payments</span>
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
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/agent-management/edit?id=${agent.id}`}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 whitespace-nowrap"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/agent-management/customers/${agent.id}`}
                          className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600 whitespace-nowrap"
                        >
                          Allocate
                        </Link>
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
                        {(agent.total_due_commission || 0) > 0 && Number(user?.role) === 5 && (
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
        </div>

        <Footer />
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedAgent && user && Number(user.role) === 5 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Record Payment</h2>
            
            {/* Agent Summary */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Agent Name</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedAgent.first_name} {selectedAgent.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Agent ID</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedAgent.agent_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Due Commission</p>
                    <p className="text-lg font-bold text-red-600">₹{(selectedAgent.total_due_commission || 0).toLocaleString()}</p>
                  </div>
                </div>
                <a
                  href={`/api/agent-management/commission-breakdown?agentId=${selectedAgent.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 whitespace-nowrap"
                  title="View detailed commission breakdown"
                >
                  View Breakdown
                </a>
              </div>
              {selectedAgent.bank_name && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded border border-blue-200 p-2">
                    <p className="text-xs text-gray-600 mb-1">Bank</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedAgent.bank_name}</p>
                  </div>
                  <div className="bg-white rounded border border-blue-200 p-2">
                    <p className="text-xs text-gray-600 mb-1">Account Number</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedAgent.account_number || '—'}</p>
                  </div>
                  <div className="bg-white rounded border border-blue-200 p-2">
                    <p className="text-xs text-gray-600 mb-1">IFSC</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedAgent.ifsc_code || '—'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Customers with Detailed Commission Breakdown */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Customer-wise Commission Breakdown</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                  {agentCustomers.length} Customer{agentCustomers.length !== 1 ? 's' : ''}
                </span>
              </div>
              {agentCustomers.length > 0 ? (
                <div className="max-h-80 overflow-y-auto space-y-3">
                  {agentCustomers.map((customer) => {
                    const earned = parseFloat(customer.total_earned_commission || 0);
                    const paid = parseFloat(customer.total_paid_commission || 0);
                    const remaining = parseFloat(customer.remaining_commission || 0);
                    const isExpanded = expandedCustomer === customer.customer_id;
                    
                    return (
                      <div key={customer.customer_id || customer.id} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition">
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{customer.name || `Customer #${customer.customer_id || customer.id}`}</p>
                              {customer.phone && <p className="text-xs text-gray-500 mt-1">{customer.phone}</p>}
                            </div>
                            {customer.product_breakdown && customer.product_breakdown.length > 0 && (
                              <button
                                onClick={() => setExpandedCustomer(isExpanded ? null : customer.customer_id)}
                                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50 whitespace-nowrap ml-2"
                              >
                                {isExpanded ? 'Hide' : 'Show'} Products
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                          <div className="bg-green-50 p-2 rounded border border-green-200">
                            <p className="text-gray-600 mb-1">Total Commission Earned</p>
                            <p className="text-sm font-bold text-green-700">₹{earned.toFixed(2)}</p>
                            {customer.transaction_count > 0 && (
                              <p className="text-xs text-gray-500 mt-1">{customer.transaction_count} transaction{customer.transaction_count !== 1 ? 's' : ''}</p>
                            )}
                          </div>
                          <div className="bg-blue-50 p-2 rounded border border-blue-200">
                            <p className="text-gray-600 mb-1">Total Paid</p>
                            <p className="text-sm font-bold text-blue-700">₹{paid.toFixed(2)}</p>
                            {customer.payment_count > 0 && (
                              <p className="text-xs text-blue-600 mt-1">{customer.payment_count} payment{customer.payment_count !== 1 ? 's' : ''} ✓</p>
                            )}
                          </div>
                          <div className="bg-orange-50 p-2 rounded border border-orange-200">
                            <p className="text-gray-600 mb-1">Remaining Due</p>
                            <p className="text-sm font-bold text-orange-700">₹{remaining.toFixed(2)}</p>
                            {remaining > 0 && (
                              <p className="text-xs text-orange-600 mt-1">⚠️ Due</p>
                            )}
                            {remaining <= 0 && paid > 0 && (
                              <p className="text-xs text-green-600 mt-1">✓ Fully Paid</p>
                            )}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-300 space-y-3">
                            {/* Product-wise Commission Breakdown */}
                            {customer.product_breakdown && customer.product_breakdown.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-2">Product-wise Commission Breakdown:</p>
                                <div className="space-y-2">
                                  {customer.product_breakdown.map((product, idx) => (
                                    <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-200">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold text-gray-800">{product.product_name || 'Unknown Product'}</p>
                                          <div className="mt-1 space-y-1">
                                            <p className="text-xs text-gray-600">
                                              <span className="font-medium">Transactions:</span> {product.transaction_count} 
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              <span className="font-medium">Quantity:</span> {product.total_quantity.toFixed(2)}L
                                            </p>
                                          </div>
                                        </div>
                                        <div className="text-right ml-3">
                                          <p className="text-xs text-gray-500 mb-1">Commission</p>
                                          <p className="text-sm font-bold text-green-700">₹{product.total_commission.toFixed(2)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="mt-2 pt-2 border-t border-gray-300 bg-blue-50 p-2 rounded">
                                    <div className="flex justify-between items-center">
                                      <p className="text-xs font-semibold text-gray-700">Total from all products:</p>
                                      <p className="text-sm font-bold text-blue-700">
                                        ₹{customer.product_breakdown.reduce((sum, p) => sum + parseFloat(p.total_commission || 0), 0).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Customer-wise Payment History */}
                            {Array.isArray(customerPayments) && customerPayments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-300">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Payment History for this Customer:</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {customerPayments
                                    .filter(p => p.customer_id === customer.customer_id)
                                    .map((payment, idx) => (
                                      <div key={payment.id || idx} className="bg-green-50 p-2 rounded border border-green-200">
                                        <div className="flex justify-between items-center">
                                          <div className="flex-1">
                                            <p className="text-xs font-medium text-gray-800">
                                              Payment #{payment.id || idx + 1}
                                            </p>
                                            {payment.remarks && (
                                              <p className="text-xs text-gray-500 italic">{payment.remarks}</p>
                                            )}
                                            <p className="text-xs text-gray-500">
                                              {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                                            </p>
                                          </div>
                                          <div className="text-right ml-2">
                                            <p className="text-xs font-bold text-green-700">
                                              ₹{parseFloat(payment.amount || 0).toFixed(2)}
                                            </p>
                                            {parseFloat(payment.tds_amount || 0) > 0 && (
                                              <p className="text-[10px] text-gray-600">
                                                TDS: ₹{parseFloat(payment.tds_amount).toFixed(2)} • Net: ₹{parseFloat(payment.net_amount || ((payment.amount || 0) - (payment.tds_amount || 0))).toFixed(2)}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  {customerPayments.filter(p => p.customer_id === customer.customer_id).length === 0 && (
                                    <p className="text-xs text-gray-500 text-center py-1">No payments for this customer yet</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {customer.transaction_count > 0 && !isExpanded && (
                          <p className="text-xs text-gray-500 mt-2">
                            {customer.transaction_count} transaction{(customer.transaction_count || 0) !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div className="mt-3 pt-3 border-t-2 border-gray-400 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600 mb-1 font-medium">Total Earned</p>
                        <p className="text-base font-bold text-green-700">
                          ₹{agentCustomers.reduce((sum, c) => sum + parseFloat(c.total_earned_commission || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1 font-medium">Total Paid</p>
                        <p className="text-base font-bold text-blue-700">
                          ₹{agentCustomers.reduce((sum, c) => sum + parseFloat(c.total_paid_commission || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1 font-medium">Total Remaining</p>
                        <p className="text-base font-bold text-orange-700">
                          ₹{agentCustomers.reduce((sum, c) => sum + parseFloat(c.remaining_commission || 0), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">No customers assigned yet</p>
              )}
            </div>

            {/* Payment History Summary */}
            {Array.isArray(customerPayments) && customerPayments.length > 0 && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment History</h3>
                <div className="max-h-40 overflow-y-auto space-y-2 mb-3">
                  {customerPayments.map((payment, idx) => (
                    <div key={payment.id || idx} className="bg-white p-2 rounded border border-green-200">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold text-blue-600">Payment #{(payment.id || idx + 1)}</p>
                            {payment.customer_name && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Customer Payment</span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-gray-800">
                            {payment.customer_name ? `Customer: ${payment.customer_name}` : 'General Payment'}
                          </p>
                          {payment.customer_phone && (
                            <p className="text-xs text-gray-500">{payment.customer_phone}</p>
                          )}
                          {payment.remarks && (
                            <p className="text-xs text-gray-500 italic mt-1">{payment.remarks}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(payment.payment_date).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-sm font-bold text-green-700">₹{parseFloat(payment.amount || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-green-300">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                    <p className="text-lg font-bold text-green-700">
                      ₹{customerPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Payments Count</p>
                    <p className="text-lg font-bold text-gray-800">{customerPayments.length}</p>
                  </div>
                </div>
              <div className="mt-3 pt-3 border-t border-green-300">
                <p className="text-xs text-gray-600 mb-1">Remaining Due</p>
                <p className="text-lg font-bold text-red-600">
                  ₹{((selectedAgent.total_due_commission || 0) - customerPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handlePaymentSubmit}>
            {/* Customer Selection for Payment */}
            {agentCustomers.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  Select Customer for Payment *
                </label>
                <select
                  id="paymentCustomerId"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                  onChange={(e) => {
                    const selectedCustomerId = e.target.value ? parseInt(e.target.value) : null;
                    if (selectedCustomerId) {
                      const customer = agentCustomers.find(c => c.customer_id === selectedCustomerId);
                      if (customer) {
                        // Show customer details
                        console.log('Selected customer:', customer);
                      }
                    }
                  }}
                >
                  <option value="">-- Select Customer --</option>
                  {agentCustomers.map(customer => {
                    const earned = parseFloat(customer.total_earned_commission || 0);
                    const paid = parseFloat(customer.total_paid_commission || 0);
                    const remaining = parseFloat(customer.remaining_commission || 0);
                    return (
                      <option key={customer.customer_id} value={customer.customer_id}>
                        {customer.name || `Customer #${customer.customer_id}`} 
                        {customer.phone && ` (${customer.phone})`} 
                        {' - Commission: ₹' + earned.toFixed(2) + ' | Paid: ₹' + paid.toFixed(2) + ' | Due: ₹' + remaining.toFixed(2)}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the customer for whom this payment is being made. This will track payment per customer.
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedAgent.total_due_commission || 0}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum: ₹{(selectedAgent.total_due_commission || 0).toLocaleString()}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 text-sm font-medium">TDS Deduction (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={tdsAmount}
                onChange={(e) => setTdsAmount(e.target.value)}
                placeholder="Enter TDS (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Net Pay: ₹{(
                  Math.max(0, (parseFloat(paymentAmount || 0) || 0) - (parseFloat(tdsAmount || 0) || 0))
                ).toFixed(2)}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Remarks</label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows="3"
                value={paymentRemarks}
                onChange={(e) => setPaymentRemarks(e.target.value)}
                placeholder="Transaction ID, Check No, UTR, Payment method, etc."
              ></textarea>
            </div>
            
            {Array.isArray(paymentLogs) && paymentLogs.length > 0 && (
              <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Recent Payment Logs</p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {paymentLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="text-xs flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          Amount ₹{parseFloat(log.amount || 0).toFixed(2)}{" "}
                          {parseFloat(log.tds_amount || 0) > 0 ? (
                            <>- TDS ₹{parseFloat(log.tds_amount).toFixed(2)} = Net ₹{parseFloat(log.net_amount || ((log.amount || 0) - (log.tds_amount || 0))).toFixed(2)}</>
                          ) : (
                            <>= Net ₹{parseFloat(log.net_amount || log.amount || 0).toFixed(2)}</>
                          )}
                        </p>
                        <p className="text-gray-500">
                          {log.paid_by_user_name || 'Admin'} • {new Date(log.payment_date).toLocaleString('en-IN')}
                        </p>
                      </div>
                      {log.customer_name && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Customer: {log.customer_name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
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
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-300 text-sm"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || !paymentAmount || !user || Number(user?.role) !== 5}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {submitting ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
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
