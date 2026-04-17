"use client";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Footer from "components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import {
  ChevronLeft,
  Search,
  TrendingDown,
  FileText,
  Calendar,
  User,
  Users,
  Download,
  Filter,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Activity,
  Plus
} from "lucide-react";

// Loading component for Suspense fallback
function TDSPageLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 font-medium">Loading TDS Repository...</p>
      </div>
    </div>
  );
}

// Main content component
function TDSPageContent() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchTDSLogs();
  }, []);

  const fetchTDSLogs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/agent-management/payments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Extract logs that have TDS > 0
        const allLogs = data.logs || [];
        const tdsLogs = allLogs.filter(log => parseFloat(log.tds_amount || 0) > 0);
        setLogs(tdsLogs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(log =>
      log.agent_name?.toLowerCase().includes(term) ||
      log.customer_name?.toLowerCase().includes(term) ||
      log.payment_id?.toString().includes(term)
    );
  }, [logs, searchTerm]);

  const totalTDS = useMemo(() => {
    return filteredLogs.reduce((sum, log) => sum + parseFloat(log.tds_amount || 0), 0);
  }, [filteredLogs]);

  const pendingTDS = useMemo(() => {
    return filteredLogs.filter(l => l.tds_status !== 'paid')
      .reduce((sum, log) => sum + parseFloat(log.tds_amount || 0), 0);
  }, [filteredLogs]);

  const paidTDS = useMemo(() => {
    return filteredLogs.filter(l => l.tds_status === 'paid')
      .reduce((sum, log) => sum + parseFloat(log.tds_amount || 0), 0);
  }, [filteredLogs]);

  const handlePayTDS = async (paymentId) => {
    if (!confirm("Are you sure you want to mark this TDS as Paid to Government?")) return;
    try {
      const res = await fetch("/api/agent-management/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status: 'paid' })
      });
      if (res.ok) {
        fetchTDSLogs(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50/50 overflow-hidden">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-none animate-fade-in relative">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-100 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Agent TDS Repository</h1>
                <p className="text-sm text-gray-500 font-medium">Monitoring tax deductions and statutory compliance.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/agent-management')}
                className="bg-purple-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs shadow-xl shadow-purple-100 hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> NEW SETTLEMENT
              </button>
              <button className="bg-white text-gray-700 px-6 py-3 rounded-2xl font-black text-xs border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition flex items-center gap-2">
                <Download className="w-4 h-4" /> EXPORT TDS REPORT
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition hover:border-purple-200">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <TrendingDown className="w-10 h-10 text-purple-600 mb-4 relative" />
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest relative">Outstanding Deductions</h3>
              <p className="text-3xl font-black text-rose-600 mt-1 relative">₹{pendingTDS.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                <AlertCircle className="w-3 h-3 text-rose-500" /> PENDING DEPOSIT
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition hover:border-emerald-200">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-4 relative" />
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest relative">Settled Taxes</h3>
              <p className="text-3xl font-black text-emerald-600 mt-1 relative">₹{paidTDS.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                <Activity className="w-3 h-3 text-emerald-500" /> VERIFIED DEPOSITS
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition hover:border-blue-200">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <Users className="w-10 h-10 text-blue-600 mb-4 relative" />
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest relative">Affected Agents</h3>
              <p className="text-3xl font-black text-gray-900 mt-1 relative">{new Set(filteredLogs.map(l => l.agent_id)).size}</p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                <Users className="w-3 h-3 text-blue-400" /> UNIQUE RECIPIENTS
              </div>
            </div>
          </div>

          {/* Filtering Section */}
          <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-600 transition" />
              <input
                type="text"
                placeholder="Search by Agent, Customer, or Payment Reference..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-6 py-4 bg-gray-50 text-gray-500 font-bold text-xs rounded-2xl hover:bg-gray-100 transition border border-gray-100 uppercase tracking-widest">
              <Filter className="w-4 h-4" /> Refine
            </button>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-6">Identity Breakdown</th>
                    <th className="px-8 py-6">Customer Relation</th>
                    <th className="px-8 py-6">Tax Basis</th>
                    <th className="px-8 py-6 text-right">Deduction (TDS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/30 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 font-black group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                            {log.agent_name?.[0] || 'A'}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm whitespace-nowrap">{log.agent_name || (log.first_name ? `${log.first_name} ${log.last_name}` : 'System Agent')}</p>
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-0.5 uppercase">
                              <Calendar className="w-3 h-3" /> {new Date(log.created_at || log.payment_date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 group-hover:border-purple-200 transition">
                            <User className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{log.customer_name || 'Direct Payout'}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Ref: #{log.payment_id || log.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="font-bold text-gray-600 uppercase text-[10px] tracking-tight">Base Amount: ₹{parseFloat(log.amount).toLocaleString()}</p>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100/50 rounded-lg w-max">
                            <Activity className="w-3 h-3 text-purple-500" />
                            <span className="text-[9px] font-black text-purple-600">RETENTION BASIS</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-base font-black text-gray-900 tracking-tighter">₹{parseFloat(log.tds_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          {log.tds_status === 'paid' ? (
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> SETTLED
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePayTDS(log.payment_id || log.id);
                              }}
                              className="text-[9px] font-black text-white bg-rose-600 px-3 py-1 rounded-lg hover:bg-rose-700 transition transform hover:scale-105 shadow-md shadow-rose-100"
                            >
                              PAY TO GOVT
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="py-24 text-center">
                <AlertCircle className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                <p className="text-gray-400 font-medium italic">No tax deduction records found matching your query.</p>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AgentTDSPage() {
  return (
    <Suspense fallback={<TDSPageLoading />}>
      <TDSPageContent />
    </Suspense>
  );
}