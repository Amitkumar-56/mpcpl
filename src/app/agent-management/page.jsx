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
        setAgents(data);
        setFilteredAgents(data);
      } else {
        console.error("Failed to fetch agents");
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
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

        <div className="p-6 mt-16 flex-1">
          {/* Page Title and Actions */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Agent Management</h1>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email, ID, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <Link
                href="/agent-management/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition whitespace-nowrap text-center"
              >
                Create New Agent
              </Link>
            </div>
          </div>

          {/* ✅ Summary Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    <td className="px-6 py-4 space-x-2">
                      <Link
                        href={`/agent-management/edit/${agent.id}`}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/agent-management/customers/${agent.id}`}
                        className="bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600"
                      >
                        Allocate
                      </Link>
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
    </div>
  );
}
