"use client";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";

export default function AgentCommissionsPage() {
  const { id } = useParams(); // agent id
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [paymentLogs, setPaymentLogs] = useState([]);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [tdsAmount, setTdsAmount] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agentCustomers, setAgentCustomers] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});

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
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      const authHeader = token ? { Authorization: `Bearer ${token.trim()}` } : {};
      const [historyRes, logsRes, profileRes, customersRes] = await Promise.all([
        fetch(`/api/agent/commission-history?agentId=${id}`, { headers: authHeader, credentials: 'include' }),
        fetch(`/api/agent-management/payments?agentId=${id}`, { headers: authHeader, credentials: 'include' }),
        fetch(`/api/agent-management?id=${id}`, { headers: authHeader, credentials: 'include' }),
        fetch(`/api/agent-management/customers?id=${id}`, { headers: authHeader, credentials: 'include' })
      ]);
      
      if (historyRes.ok) {
        const json = await historyRes.json();
        setData(json);
      }
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setPaymentLogs(logsData.logs || []);
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setAgentProfile(profileData);
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setAgentCustomers(customersData.customers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || !id) return;

    if (!user || (userPermissions.can_edit !== true && Number(user.role) !== 5)) {
      alert("Access Denied: You do not have permission to record payments.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const customerSelect = document.getElementById('paymentCustomerId');
      const customerId = customerSelect ? (customerSelect.value ? parseInt(customerSelect.value) : null) : null;

      const res = await fetch("/api/agent-management/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token.trim()}` : undefined
        },
        credentials: 'include',
        body: JSON.stringify({
          agentId: parseInt(id),
          amount: parseFloat(paymentAmount),
          tdsAmount: tdsAmount ? parseFloat(tdsAmount) : 0,
          remarks: paymentRemarks,
          customerId: customerId,
        }),
      });

      if (res.ok) {
        alert("Payment recorded successfully!");
        setPaymentAmount("");
        setTdsAmount("");
        setPaymentRemarks("");
        setShowPaymentModal(false);
        fetchData(); // Refresh data
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to record payment");
      }
    } catch (err) {
      alert("Error recording payment: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/agent-management/export-commissions?agentId=${id}`, "_blank");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-500 font-medium">Loading data...</p>
      </div>
    </div>
  );
  if (!data) return <div className="p-6">Error loading data</div>;

  const { history, payments, summary } = data;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="hidden md:block fixed top-0 left-0 h-full w-64 bg-white shadow z-20">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col md:ml-64">
        <div className="fixed top-0 left-0 md:left-64 right-0 z-10">
          <Header />
        </div>

        <div className="p-6 mt-20 flex-1">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Link href="/agent-management" className="text-blue-600 hover:underline">
                &larr; Back to Agents
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Agent Commission Management</h1>
            </div>
            <div className="flex gap-2">
              {(userPermissions.can_edit === true || Number(user?.role) === 5) && (summary?.remaining || 0) > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition font-bold"
                >
                  Record Payment
                </button>
              )}
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                Export Excel
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
              <h3 className="text-gray-500 text-sm font-medium uppercase">Total Commission Earned</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">₹{summary?.totalCommission?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-500 mt-1">From all products</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
              <h3 className="text-gray-500 text-sm font-medium uppercase">Total Paid</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">₹{(summary?.totalPaid ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Amount paid by admin</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
              <h3 className="text-gray-500 text-sm font-medium uppercase">Due Commission</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">₹{Math.max(0, summary?.remaining ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Pending payment</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
              <h3 className="text-gray-500 text-sm font-medium uppercase">Remaining Balance</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">₹{Math.max(0, summary?.remaining ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Available to pay</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Commission History
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'payments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Payment History
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Payment Logs
                </button>
                <button
                  onClick={() => setActiveTab('productSummary')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'productSummary'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Product-wise Summary
                </button>
              </nav>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Commission History Table */}
            {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Commission History</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Client</th>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Rate (₹/L)</th>
                      <th className="px-4 py-2 text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history?.length > 0 ? (
                      history.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{new Date(item.completed_date || item.earned_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{item.client_name || 'N/A'}</td>
                          <td className="px-4 py-2">{item.product_name || item.product_code || 'N/A'}</td>
                          <td className="px-4 py-2">{item.quantity || '0'}L</td>
                          <td className="px-4 py-2">₹{parseFloat(item.commission_rate || 0).toFixed(2)}/L</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-600">
                            ₹{parseFloat(item.commission_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-4 text-center text-gray-500">No commissions yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Payment History Table */}
            {activeTab === 'payments' && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Payment History</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Remarks</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">TDS</th>
                      <th className="px-4 py-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments?.length > 0 ? (
                      payments.map((pay, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{new Date(pay.payment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{pay.remarks || "-"}</td>
                          <td className="px-4 py-2 text-right font-semibold text-blue-600">
                            ₹{parseFloat(pay.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">₹{parseFloat(pay.tds_amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-semibold">₹{parseFloat(pay.net_amount || ((pay.amount || 0) - (pay.tds_amount || 0))).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-4 text-center text-gray-500">No payments yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Payment Logs */}
            {activeTab === 'logs' && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Payment Logs</h2>
              <p className="text-sm text-gray-600 mb-4">Complete payment history with who paid, when, and details</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-2">Date & Time</th>
                      <th className="px-4 py-2">Amount (₹)</th>
                      <th className="px-4 py-2">TDS (₹)</th>
                      <th className="px-4 py-2">Net (₹)</th>
                      <th className="px-4 py-2">Paid By</th>
                      <th className="px-4 py-2">Remarks</th>
                      <th className="px-4 py-2">Payment ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentLogs?.length > 0 ? (
                      paymentLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {new Date(log.payment_date || log.created_at).toLocaleString('en-IN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-2 font-semibold text-green-600">
                            ₹{parseFloat(log.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2">₹{parseFloat(log.tds_amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 font-semibold">₹{parseFloat(log.net_amount || ((log.amount || 0) - (log.tds_amount || 0))).toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <div>
                              <div className="font-medium">{log.paid_by_user_name || (log.paid_by_user_id ? `Employee ID: ${log.paid_by_user_id}` : 'N/A')}</div>
                              {log.paid_by_user_id && (
                                <div className="text-xs text-gray-500">ID: {log.paid_by_user_id}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2">{log.remarks || '-'}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs">#{log.payment_id || log.id}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-4 text-center text-gray-500">No payment logs available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Product-wise Summary */}
            {activeTab === 'productSummary' && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Product-wise Commission Summary</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2">Product Code</th>
                      <th className="px-4 py-2">Commission Rate (₹/L)</th>
                      <th className="px-4 py-2 text-right">Total Commission</th>
                      <th className="px-4 py-2 text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const productMap = {};
                      history?.forEach(item => {
                        const key = `${item.product_id || item.product_code_id}_${item.product_code || 'N/A'}`;
                        if (!productMap[key]) {
                          productMap[key] = {
                            product_name: item.product_name || 'N/A',
                            product_code: item.product_code || 'N/A',
                            commission_rate: item.commission_rate || 0,
                            total_commission: 0,
                            transaction_count: 0
                          };
                        }
                        productMap[key].total_commission += parseFloat(item.commission_amount || 0);
                        productMap[key].transaction_count += 1;
                      });
                      return Object.values(productMap);
                    })().length > 0 ? (
                      Object.values((() => {
                        const productMap = {};
                        history?.forEach(item => {
                          const key = `${item.product_id || item.product_code_id}_${item.product_code || 'N/A'}`;
                          if (!productMap[key]) {
                            productMap[key] = {
                              product_name: item.product_name || 'N/A',
                              product_code: item.product_code || 'N/A',
                              commission_rate: item.commission_rate || 0,
                              total_commission: 0,
                              transaction_count: 0
                            };
                          }
                          productMap[key].total_commission += parseFloat(item.commission_amount || 0);
                          productMap[key].transaction_count += 1;
                        });
                        return productMap;
                      })()).map((product, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{product.product_name}</td>
                          <td className="px-4 py-2">{product.product_code}</td>
                          <td className="px-4 py-2">₹{parseFloat(product.commission_rate).toFixed(2)}/L</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-600">
                            ₹{product.total_commission.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">{product.transaction_count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-4 text-center text-gray-500">No product data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && agentProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Record Payment</h2>
                <p className="text-sm text-gray-500">Agent: {agentProfile.first_name} {agentProfile.last_name}</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-bold uppercase">Total Due</p>
                  <p className="text-2xl font-black text-blue-800">₹{(summary?.remaining || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 font-bold uppercase">Bank Account</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{agentProfile.bank_name || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{agentProfile.account_number || ''}</p>
                </div>
              </div>

              {agentCustomers.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Specific Customer (Optional)</label>
                  <select
                    id="paymentCustomerId"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="">-- General Payment --</option>
                    {agentCustomers.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (Gross)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    max={summary?.remaining || 0}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">TDS Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={tdsAmount}
                    onChange={(e) => setTdsAmount(e.target.value)}
                  />
                </div>
              </div>

              {paymentAmount > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-green-800">Net Payable:</span>
                  <span className="text-xl font-bold text-green-700">₹{(parseFloat(paymentAmount || 0) - parseFloat(tdsAmount || 0)).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  rows="2"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  placeholder="Check number, Transaction ID etc."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
