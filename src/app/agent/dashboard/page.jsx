
"use client";

import AgentHeader from "@/components/agentHeader";
import AgentSidebar from "@/components/agentSidebar";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AgentDashboard() {
  const router = useRouter();
  const [agent, setAgent] = useState(() => {
    // Initialize from localStorage immediately - no loading
    if (typeof window !== 'undefined') {
      const agentData = localStorage.getItem("agent");
      const agentToken = localStorage.getItem("agent_token");
      if (agentData && agentToken) {
        try {
          return JSON.parse(agentData);
        } catch (err) {
          console.error("Error parsing agent data:", err);
        }
      }
    }
    return null;
  });

  const [commissionData, setCommissionData] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    // Only redirect if no agent data
    if (!agent) {
      const agentData = localStorage.getItem("agent");
      const agentToken = localStorage.getItem("agent_token");
      if (!agentData || !agentToken) {
        router.push("/agent/login");
      }
    } else if (agent.id) {
        // Fetch commission data
        fetch(`/api/agent/commission-history?agentId=${agent.id}`)
            .then(res => res.json())
            .then(data => setCommissionData(data))
            .catch(err => console.error("Error fetching commissions:", err));
    }
  }, [agent, router]);

  return (
    <div className="flex h-screen bg-gray-50">
      <AgentSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <AgentHeader />
        
        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <div className="flex gap-2">
                <Link
                  href="/agent/allocated-customers"
                  className="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  My Allocated Customers & Rates
                </Link>
                <Link
                  href="/agent/commissions"
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Commission History
                </Link>
                <Link
                  href="/agent/payments"
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Payment History
                </Link>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                <span suppressHydrationWarning={true}>
                  {mounted ? `Welcome, ${agent?.name || ''}!` : 'Welcome,'}
                </span>
              </h2>
              <p className="text-gray-600">
                <span suppressHydrationWarning={true}>
                  You are logged in as Agent ID: <span className="font-semibold">{mounted ? (agent?.agent_id || '') : ''}</span>
                </span>
              </p>
            </div>

            {/* Commission Summary */}
            {commissionData && commissionData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <p className="text-gray-500 text-sm">Total Commission</p>
                        <p className="text-2xl font-bold text-blue-600">₹{commissionData.summary.totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                        <p className="text-gray-500 text-sm">Total Paid</p>
                        <p className="text-2xl font-bold text-green-600">₹{commissionData.summary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
                        <p className="text-gray-500 text-sm">Remaining Due</p>
                        <p className="text-2xl font-bold text-yellow-600">₹{commissionData.summary.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            )}

            {/* Allocated Customers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">My Allocated Customers & Rates</h3>
                    <Link href="/agent/allocated-customers" className="text-sm text-indigo-600 hover:text-indigo-800">View all</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Rate</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(commissionData?.allocatedCustomers || []).slice(0, 5).map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.client_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">₹{item.commission_rate}</td>
                                </tr>
                            ))}
                            {(!commissionData?.allocatedCustomers || commissionData.allocatedCustomers.length === 0) && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No allocated customers found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Commission History Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Commission History Log</h3>
                    <Link href="/agent/commissions" className="text-sm text-blue-600 hover:text-blue-800">View all</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(commissionData?.history || []).slice(0, 5).map((item, index) => (
                                <tr key={item.id || index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(item.completed_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.client_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{item.commission_rate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                        ₹{parseFloat(item.commission_amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {(!commissionData?.history || commissionData.history.length === 0) && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">No commission history found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment History Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                    <Link href="/agent/payments" className="text-sm text-green-600 hover:text-green-800">View all</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TDS</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(commissionData?.payments || []).slice(0, 5).map((item, index) => (
                                <tr key={item.id || index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(item.payment_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                        ₹{parseFloat(item.amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        ₹{parseFloat(item.tds_amount || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        ₹{parseFloat(item.net_amount ?? ((item.amount || 0) - (item.tds_amount || 0))).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.remarks || '-'}</td>
                                </tr>
                            ))}
                             {(!commissionData?.payments || commissionData.payments.length === 0) && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No payment history found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium">{agent?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900 font-medium">{agent?.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
        <PWAInstallBanner />
    </div>
  </div>
  );
}

