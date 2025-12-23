"use client";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";

export default function AgentManagement() {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agentCustomers, setAgentCustomers] = useState([]);
  const [customerPayments, setCustomerPayments] = useState({});
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
        headers: { Authorization: `Bearer ${token}` },
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
  const totalDueCommission = filteredAgents.reduce(
    (sum, a) => sum + (a.total_due_commission || 0),
    0
  );

  const handlePaymentClick = async (agent) => {
    setSelectedAgent(agent);
    setPaymentAmount("");
    setPaymentRemarks("");
    setShowPaymentModal(true);
    
    // Fetch assigned customers and their payment details
    try {
      const token = localStorage.getItem("token");
      const [customersRes, paymentsRes] = await Promise.all([
        fetch(`/api/agent-management/customers?id=${agent.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/agent-management/payments?agentId=${agent.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setAgentCustomers(customersData.customers || []);
      }
      
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        // Calculate payment per customer (if needed)
        setCustomerPayments(paymentsData.payments || []);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || !selectedAgent) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/agent-management/payments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          amount: parseFloat(paymentAmount),
          remarks: paymentRemarks,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Payment recorded successfully!\n${data.message || ''}`);
        setShowPaymentModal(false);
        setSelectedAgent(null);
        setPaymentAmount("");
        setPaymentRemarks("");
        setAgentCustomers([]);
        setCustomerPayments({});
        fetchAgents(); // Refresh agents list
      } else {
        const errorMsg = data.error || "Failed to record payment";
        const details = data.details ? `\n${data.details}` : '';
        alert(`${errorMsg}${details}`);
        console.error("Payment error:", data);
      }
    } catch (err) {
      console.error(err);
      alert("Error recording payment");
    } finally {
      setSubmitting(false);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6">
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

            {/* Total Due Commission */}
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <h3 className="text-gray-600 font-semibold mb-1">Total Due Commission</h3>
              <p className="text-3xl font-bold text-yellow-600">
                ₹{totalDueCommission.toLocaleString()}
              </p>
              <span className="text-sm text-gray-500 mt-1">From All Agents</span>
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
                          href={`/agent-management/customers?id=${agent.id}`}
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
                        {(agent.total_due_commission || 0) > 0 && (
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
      {showPaymentModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Record Payment</h2>
            
            {/* Agent Summary */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            </div>

            {/* Assigned Customers with Commission Details */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Assigned Customers & Commission</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                  {agentCustomers.length} Customer{agentCustomers.length !== 1 ? 's' : ''}
                </span>
              </div>
              {agentCustomers.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {agentCustomers.map((customer) => (
                    <div key={customer.customer_id || customer.id} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{customer.name || `Customer #${customer.customer_id || customer.id}`}</p>
                          {customer.phone && <p className="text-xs text-gray-500 mt-1">{customer.phone}</p>}
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-xs text-gray-600">Commission</p>
                          <p className="text-sm font-bold text-green-600">₹{parseFloat(customer.total_commission || 0).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{customer.transaction_count || 0} transaction{(customer.transaction_count || 0) !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-gray-300 bg-blue-50 rounded p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-700">Total from all customers:</span>
                      <span className="text-sm font-bold text-blue-700">
                        ₹{agentCustomers.reduce((sum, c) => sum + parseFloat(c.total_commission || 0), 0).toFixed(2)}
                      </span>
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
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment History Summary</h3>
                <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-gray-700 mb-2 text-sm font-medium">Remarks</label>
                <textarea
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  rows="3"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  placeholder="Transaction ID, Check No, UTR, etc."
                ></textarea>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedAgent(null);
                    setPaymentAmount("");
                    setPaymentRemarks("");
                    setAgentCustomers([]);
                    setCustomerPayments({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !paymentAmount}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {submitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
