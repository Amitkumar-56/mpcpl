"use client";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { X } from "lucide-react";

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
  const [selectedEarning, setSelectedEarning] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

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

  const handlePayTDS = async (paymentId) => {
    if (!confirm("Are you sure you want to mark this TDS as Paid to Government?")) return;
    try {
      const res = await fetch("/api/agent-management/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status: 'paid' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || !id) return;

    if (!user) {
      alert("Access Denied: User session not found.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const customerId = selectedCustomerId ? parseInt(selectedCustomerId) : null;

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
          earningIds: selectedItems.length > 0 ? selectedItems.map(i => i.id) : (selectedEarning ? [selectedEarning.id] : []),
        }),
      });

      if (res.ok) {
        alert("Payment recorded successfully!");
        setPaymentAmount("");
        setTdsAmount("");
        setPaymentRemarks("");
        setSelectedCustomerId("");
        setSelectedItems([]);
        setSelectedEarning(null);
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

  const handlePayNow = (item) => {
    if (selectedItems.length > 0) {
      // If we already have items selected, include this item if it's not already in the list
      // and trigger the bulk payment modal for everything in selection
      const isSelected = selectedItems.find(i => i.id === item.id);
      if (!isSelected) {
        const newSelection = [...selectedItems, item];
        setSelectedItems(newSelection);
        
        // Calculate total for the modal
        const total = newSelection.reduce((sum, i) => sum + parseFloat(i.commission_amount || 0), 0);
        const firstItem = newSelection[0];
        const sameCustomer = newSelection.every(i => i.customer_id === firstItem.customer_id);

        setSelectedEarning(null);
        setSelectedCustomerId(sameCustomer ? firstItem.customer_id : "");
        setPaymentAmount(total.toFixed(2));
        setPaymentRemarks(`Bulk Payment for ${newSelection.length} requests`);
      } else {
        handleBulkPay();
      }
    } else {
      // Standard single pay logic when nothing is selected
      setSelectedEarning(item);
      setSelectedItems([]); 
      setSelectedCustomerId(item.customer_id || "");
      setPaymentAmount(item.commission_amount);
      setPaymentRemarks(`Payment for Request: ${item.product_name} - Qty: ${item.quantity}L`);
    }
    setShowPaymentModal(true);
  };

  const handleBulkPay = () => {
    if (selectedItems.length === 0) return;
    
    const total = selectedItems.reduce((sum, item) => sum + parseFloat(item.commission_amount || 0), 0);
    const firstItem = selectedItems[0];
    
    // Check if all selected items are from the same customer
    const sameCustomer = selectedItems.every(i => i.customer_id === firstItem.customer_id);
    
    setSelectedEarning(null);
    setSelectedCustomerId(sameCustomer ? firstItem.customer_id : "");
    setPaymentAmount(total.toFixed(2));
    setPaymentRemarks(`Bulk Payment for ${selectedItems.length} requests`);
    setShowPaymentModal(true);
  };

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.find(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      const payableItems = history.filter(item => parseFloat(item.commission_amount || 0) > 0);
      setSelectedItems(payableItems);
    } else {
      setSelectedItems([]);
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
              {user && selectedItems.length > 0 && (
                <button
                  onClick={handleBulkPay}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-bold animate-bounce"
                >
                  Pay Selected ({selectedItems.length}) - ₹{selectedItems.reduce((s, i) => s + parseFloat(i.commission_amount || 0), 0).toFixed(2)}
                </button>
              )}
              {user && (summary?.remaining || 0) > 0 && (
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
                <button
                  onClick={() => setActiveTab('tds')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'tds'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  TDS History
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
                      <th className="px-4 py-2">
                        <input 
                          type="checkbox" 
                          onChange={toggleSelectAll}
                          checked={selectedItems.length > 0 && selectedItems.length === history.filter(i => parseFloat(i.commission_amount || 0) > 0).length}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Client</th>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Rate (₹/L)</th>
                      <th className="px-4 py-2 text-right">Commission</th>
                      <th className="px-4 py-2 text-center text-orange-600 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history?.length > 0 ? (
                      history.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50 transition ${selectedItems.find(i => i.id === item.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-2">
                            {!item.payment_id && parseFloat(item.commission_amount || 0) > 0 && (
                              <input 
                                type="checkbox"
                                checked={!!selectedItems.find(i => i.id === item.id)}
                                onChange={() => toggleItemSelection(item)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="px-4 py-2">{new Date(item.completed_date || item.earned_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{item.client_name || 'N/A'}</td>
                          <td className="px-4 py-2">{item.product_name || item.product_code || 'N/A'}</td>
                          <td className="px-4 py-2">{item.quantity || '0'}L</td>
                          <td className="px-4 py-2">₹{parseFloat(item.commission_rate || 0).toFixed(2)}/L</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-600">
                            ₹{parseFloat(item.commission_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {user && !item.payment_id && parseFloat(item.commission_amount || 0) > 0 ? (
                              <button
                                onClick={() => handlePayNow(item)}
                                className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded text-xs font-bold hover:bg-orange-600 hover:text-white transition"
                              >
                                PAY NOW
                              </button>
                            ) : (
                              <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded text-xs font-bold border border-green-200">
                                PAID
                              </span>
                            )}
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
            <div className="bg-white rounded-lg shadow overflow-hidden lg:col-span-2">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">Payment Breakdown</h2>
              </div>
              <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase font-medium sticky top-0 z-10 shadow-sm">
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
            <div className="bg-white rounded-lg shadow overflow-hidden lg:col-span-2">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">Payment Audit Logs</h2>
              </div>
              <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Amount (₹)</th>
                      <th className="px-4 py-3">TDS (₹)</th>
                      <th className="px-4 py-3">Net (₹)</th>
                      <th className="px-4 py-3">Paid By</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3">Payment ID</th>
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

            {/* TDS History */}
            {activeTab === 'tds' && (
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-2 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Tax Deducted at Source (TDS)</h2>
                    <p className="text-sm text-gray-500">History of tax withholdings for {agentProfile?.first_name || 'this agent'}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Total Deducted</p>
                      <p className="text-lg font-black text-rose-600">₹{paymentLogs?.reduce((sum, log) => sum + parseFloat(log.tds_amount || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-black tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Deduction Date</th>
                        <th className="px-6 py-4">Client/Customer</th>
                        <th className="px-6 py-4 text-right">Base Amount</th>
                        <th className="px-6 py-4 text-right">TDS Amount</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paymentLogs?.filter(log => parseFloat(log.tds_amount || 0) > 0).length > 0 ? (
                        paymentLogs.filter(log => parseFloat(log.tds_amount || 0) > 0).map((log, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 group transition-all">
                            <td className="px-6 py-4 font-medium text-gray-700">
                              {new Date(log.payment_date || log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-gray-800">{log.customer_name || 'General Account'}</p>
                              <p className="text-[10px] text-gray-400">Payment ID: #{log.payment_id || log.id}</p>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600 font-medium">₹{parseFloat(log.amount || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-rose-600 font-black">₹{parseFloat(log.tds_amount || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 text-center">
                              {log.tds_status === 'paid' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                  Settled
                                </span>
                              ) : (
                                <button
                                  onClick={() => handlePayTDS(log.payment_id || log.id)}
                                  className="px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase hover:bg-rose-700 transition shadow-sm hover:shadow-rose-200"
                                >
                                  Pay to Govt
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium italic bg-gray-50/50">
                            No TDS deductions found for this agent.
                          </td>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col h-[600px] max-h-[90vh] overflow-hidden border border-gray-100">
            {/* Header - Fixed */}
            <div className="p-6 border-b bg-white flex-shrink-0 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {selectedItems.length > 0 ? `Pay ${selectedItems.length} Requests` : (selectedEarning ? 'Targeted Payment' : 'Agent Payout')}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{agentProfile.first_name} {agentProfile.last_name}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowPaymentModal(false); setSelectedEarning(null); setSelectedItems([]); }}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handlePaymentSubmit} id="payment-form" className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-100 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70 mb-1">Available Due</p>
                    <p className="text-2xl font-black">₹{(selectedEarning ? parseFloat(selectedEarning.commission_amount) : (summary?.remaining || 0)).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-2xl shadow-lg shadow-slate-100 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70 mb-1">Bank Info</p>
                    <p className="text-xs font-bold truncate">{agentProfile.bank_name || 'NOT LINKED'}</p>
                    <p className="text-[10px] opacity-60 font-mono tracking-tighter">{agentProfile.account_number || '**** **** ****'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Select Customer</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      disabled={!!selectedEarning}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-bold transition-all appearance-none"
                    >
                      <option value="">General Payment / No Customer</option>
                      {agentCustomers.map((c, idx) => <option key={`${c.customer_id}-${idx}`} value={c.customer_id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Payout Amount</label>
                       <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 group-focus-within:text-blue-500">₹</span>
                          <input
                            type="number" step="0.01" required
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-black text-gray-900 transition-all"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">TDS (Tax)</label>
                       <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 group-focus-within:text-orange-500">₹</span>
                          <input
                            type="number" step="0.01"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3.5 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none font-black text-gray-900 transition-all"
                            value={tdsAmount}
                            onChange={(e) => setTdsAmount(e.target.value)}
                          />
                       </div>
                    </div>
                  </div>

                  {paymentAmount > 0 && (
                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 space-y-3">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-orange-100/50 shadow-sm">
                           <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Total Deduction</span>
                           <span className="text-xl font-black text-orange-600">₹{(parseFloat(paymentAmount || 0) + parseFloat(tdsAmount || 0)).toLocaleString('en-IN')}</span>
                        </div>
                        {(parseFloat(paymentAmount || 0) + parseFloat(tdsAmount || 0)) > (selectedEarning ? parseFloat(selectedEarning.commission_amount) : (summary?.remaining || 0)) && (
                           <p className="text-[10px] font-black text-red-600 text-center uppercase tracking-widest animate-pulse">Caution: Amount Exceeds Due!</p>
                        )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Payment Remarks</label>
                    <textarea
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all resize-none"
                      rows="2"
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                      placeholder="Transaction ID, Cheque No..."
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="flex-shrink-0 p-6 bg-white border-t border-gray-100 flex gap-4">
                 <button
                   type="button"
                   onClick={() => { setShowPaymentModal(false); setSelectedEarning(null); setSelectedItems([]); }}
                   className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all transform active:scale-[0.98]"
                 >
                   Process Payment Now
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
