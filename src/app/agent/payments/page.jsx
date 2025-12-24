"use client";

import AgentHeader from "@/components/agentHeader";
import AgentSidebar from "@/components/agentSidebar";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function PaymentsPage() {
  const router = useRouter();
  const [agent, setAgent] = useState(() => {
    if (typeof window !== "undefined") {
      const agentData = localStorage.getItem("agent");
      const agentToken = localStorage.getItem("agent_token");
      if (agentData && agentToken) {
        try {
          return JSON.parse(agentData);
        } catch {}
      }
    }
    return null;
  });
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!agent) {
      const agentData = localStorage.getItem("agent");
      const agentToken = localStorage.getItem("agent_token");
      if (!agentData || !agentToken) {
        router.push("/agent/login");
        return;
      }
    }
    if (agent?.id) {
      setLoading(true);
      setError("");
      fetch(`/api/agent/commission-history?agentId=${agent.id}`)
        .then((res) => res.json())
        .then((json) => {
          setData(json?.payments || []);
        })
        .catch((e) => setError(e?.message || "Failed to load data"))
        .finally(() => setLoading(false));
    }
  }, [agent, router]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.length || 0) / pageSize)), [data]);
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (data || []).slice(start, start + pageSize);
  }, [data, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  return (
    <div className="flex h-screen bg-gray-50">
      <AgentSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AgentHeader />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
              <span className="text-sm text-gray-600" suppressHydrationWarning>
                {mounted ? `Agent ID: ${agent?.agent_id || ""}` : ""}
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">Total: {(data || []).length}</p>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-center text-gray-600">Loading...</div>
              ) : error ? (
                <div className="p-6 text-center text-red-600">{error}</div>
              ) : (
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
                      {pageData.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.payment_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            ₹{parseFloat(item.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            ₹{parseFloat(item.tds_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            ₹{parseFloat(item.net_amount ?? ((item.amount || 0) - (item.tds_amount || 0))).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.remarks || "-"}</td>
                        </tr>
                      ))}
                      {pageData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No payment history found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
