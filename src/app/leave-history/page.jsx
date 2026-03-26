"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const STATUS_CONFIG = {
  Approved: {
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    glow: "shadow-emerald-100",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
        <circle cx="8" cy="8" r="7" fill="#10b981" opacity="0.15" />
        <path d="M5 8l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  Rejected: {
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    glow: "shadow-red-100",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
        <circle cx="8" cy="8" r="7" fill="#ef4444" opacity="0.15" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  Pending: {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-400",
    glow: "shadow-amber-100",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
        <circle cx="8" cy="8" r="7" fill="#f59e0b" opacity="0.15" />
        <path d="M8 5v3l2 1.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  Cancelled: {
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
    glow: "shadow-slate-100",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
        <circle cx="8" cy="8" r="7" fill="#94a3b8" opacity="0.15" />
        <path d="M5 8h6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
};

const LEAVE_ABBR = {
  "Sick Leave": { short: "SL", color: "bg-sky-100 text-sky-700" },
  "Casual Leave": { short: "CL", color: "bg-violet-100 text-violet-700" },
  "Earned Leave": { short: "EL", color: "bg-teal-100 text-teal-700" },
  "Maternity Leave": { short: "ML", color: "bg-pink-100 text-pink-700" },
  "Paternity Leave": { short: "PL", color: "bg-blue-100 text-blue-700" },
  "Marriage Leave": { short: "MR", color: "bg-rose-100 text-rose-700" },
  "Bereavement Leave": { short: "BL", color: "bg-gray-100 text-gray-600" },
};

function StatCard({ label, value, color, children, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center`}>{children}</div>
      </div>
      <div className="text-3xl font-black text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}

function MobileLeaveCard({ leave, index, userRole, onApprove, onReject }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const cfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.Pending;
  const abbr = LEAVE_ABBR[leave.leave_type] || { short: "OT", color: "bg-gray-100 text-gray-600" };

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(t);
  }, [index]);

  const fmt = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const canApproveReject = userRole >= 3 && leave.status === 'Pending';

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(leave.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setLoading(true);
    try {
      await onReject(leave.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 transition-all duration-400 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {leave.employee_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{leave.employee_name}</p>
            <p className="text-xs text-gray-400 font-mono">{leave.emp_code}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.icon} {leave.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-0.5">From</p>
          <p className="text-sm font-semibold text-gray-800">{fmt(leave.from_date)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-0.5">To</p>
          <p className="text-sm font-semibold text-gray-800">{fmt(leave.to_date)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${abbr.color}`}>{abbr.short}</span>
          <span className="text-xs text-gray-500 truncate max-w-[140px]">{leave.reason}</span>
        </div>
        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {leave.total_days}d
        </span>
      </div>

      {leave.approved_by_name && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 16 16">
            <path d="M8 2a3 3 0 100 6 3 3 0 000-6zM3 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-gray-500">By {leave.approved_by_name}</span>
        </div>
      )}

      {/* Approval/Rejection Buttons */}
      {canApproveReject && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={loading}
            className="flex-1 bg-red-500 text-white text-xs font-semibold py-2 rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Leave Request</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejection</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              rows="3"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 bg-red-500 text-white text-sm font-semibold py-2 rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component wrapped with Suspense
function LeaveHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSession();

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({
    status: searchParams.get("status") || "",
    year: searchParams.get("year") || new Date().getFullYear().toString(),
  });
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'cards'

  // Get user role for permissions
  const userRole = user ? parseInt(user.role) || 0 : 0;

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.year) params.set("year", filter.year);
    if (search) params.set("search", search);
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [filter.status, filter.year, search]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user) fetchLeaveHistory();
  }, [user, authLoading]);

  const fetchLeaveHistory = async () => {
    try {
      setLoadingHistory(true);
      setError("");
      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.year) params.append("year", filter.year);
      const res = await fetch(`/api/leave?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeaveHistory(data.data || []);
      } else {
        setError(data.error || "Failed to fetch leave history");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) fetchLeaveHistory();
  }, [filter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return leaveHistory;
    const q = search.toLowerCase();
    return leaveHistory.filter(
      (l) =>
        l.employee_name?.toLowerCase().includes(q) ||
        l.emp_code?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        l.leave_type?.toLowerCase().includes(q)
    );
  }, [leaveHistory, search]);

  const stats = useMemo(() => ({
    approved: leaveHistory.filter((l) => l.status === "Approved").length,
    pending: leaveHistory.filter((l) => l.status === "Pending").length,
    rejected: leaveHistory.filter((l) => l.status === "Rejected").length,
    totalDays: leaveHistory.reduce((s, l) => s + (l.total_days || 0), 0),
  }), [leaveHistory]);

  const fmt = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  // Handle approve/reject actions
  const handleApprove = async (leaveId) => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId, status: 'Approved' })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeaveHistory(); // Refresh data
      } else {
        setError(data.error || 'Failed to approve leave request');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleReject = async (leaveId, reason) => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId, status: 'Rejected', rejection_reason: reason })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeaveHistory(); // Refresh data
      } else {
        setError(data.error || 'Failed to reject leave request');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f6fa] overflow-hidden">
      <div className="flex-shrink-0 z-50">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Hero Header */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Leave History</h1>
                  </div>
                  <p className="text-slate-400 text-sm">Track and manage employee leave requests</p>
                </div>

                {/* Year Filter - Hero */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-1 py-1">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <button
                      key={year}
                      onClick={() => setFilter((p) => ({ ...p, year: year.toString() }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        filter.year === year.toString()
                          ? "bg-white text-slate-900 shadow"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Stats Row */}
            {leaveHistory.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Approved" value={stats.approved} color="bg-emerald-100" delay={0}>
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </StatCard>
                <StatCard label="Pending" value={stats.pending} color="bg-amber-100" delay={80}>
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </StatCard>
                <StatCard label="Rejected" value={stats.rejected} color="bg-red-100" delay={160}>
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24">
                    <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </StatCard>
                <StatCard label="Total Days" value={stats.totalDays} color="bg-blue-100" delay={240}>
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </StatCard>
              </div>
            )}

            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, code, reason..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all placeholder-gray-400"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-1 py-1">
                  {["", "Pending", "Approved", "Rejected", "Cancelled"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilter((p) => ({ ...p, status: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                        filter.status === s
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {s || "All"}
                    </button>
                  ))}
                </div>

                {/* View Toggle (desktop) */}
                <div className="hidden sm:flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white shadow-sm text-slate-900" : "text-gray-400 hover:text-gray-600"}`}
                    title="Table view"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <path d="M3 10h18M3 14h18M10 4v16M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-2 rounded-lg transition-all ${viewMode === "cards" ? "bg-white shadow-sm text-slate-900" : "text-gray-400 hover:text-gray-600"}`}
                    title="Card view"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Active filter chips */}
              {(filter.status || search) && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                  {filter.status && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {filter.status}
                      <button onClick={() => setFilter((p) => ({ ...p, status: "" }))} className="hover:text-slate-900">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                    </span>
                  )}
                  {search && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      "{search}"
                      <button onClick={() => setSearch("")} className="hover:text-slate-900">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                    </span>
                  )}
                  <span className="text-xs text-gray-400 self-center">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3.5">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Content */}
            {loadingHistory ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-2 border-slate-200 rounded-full" />
                  <div className="absolute inset-0 border-2 border-t-slate-800 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Fetching records...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700 mb-1">No records found</p>
                  <p className="text-sm text-gray-400">Try adjusting your filters or search query.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile: always cards */}
                <div className="block sm:hidden space-y-3">
                  {filtered.map((leave, i) => (
                    <MobileLeaveCard 
                      key={leave.id} 
                      leave={leave} 
                      index={i} 
                      userRole={userRole}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>

                {/* Desktop: table or cards based on viewMode */}
                <div className="hidden sm:block">
                  {viewMode === "cards" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filtered.map((leave, i) => (
                        <MobileLeaveCard 
                          key={leave.id} 
                          leave={leave} 
                          index={i} 
                          userRole={userRole}
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/80">
                              {["Employee", "Type", "Period", "Days", "Reason", "Status", "Approved By", "Applied", "Action"].map((h) => (
                                <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                                  {h}
                                </th>
                              ))}
                             </tr>
                          </thead>
                          <tbody>
                            {filtered.map((leave, i) => {
                              const cfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.Pending;
                              const abbr = LEAVE_ABBR[leave.leave_type] || { short: "OT", color: "bg-gray-100 text-gray-600" };
                              const canApproveReject = userRole >= 3 && leave.status === 'Pending';
                              return (
                                <tr
                                  key={leave.id}
                                  className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors duration-150 group"
                                  style={{ animationDelay: `${i * 30}ms` }}
                                >
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                                        {leave.employee_name?.charAt(0)?.toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900 leading-tight">{leave.employee_name}</p>
                                        <p className="text-xs text-gray-400 font-mono">{leave.emp_code}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${abbr.color}`}>{abbr.short}</span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="text-sm text-gray-700">
                                      <span>{fmt(leave.from_date)}</span>
                                      <span className="text-gray-300 mx-1.5">→</span>
                                      <span>{fmt(leave.to_date)}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                      {leave.total_days}d
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <p className="text-sm text-gray-600 max-w-[180px] truncate" title={leave.reason}>
                                      {leave.reason}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                      {cfg.icon} {leave.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-sm text-gray-600">
                                    {leave.approved_by_name || <span className="text-gray-300 text-xs">—</span>}
                                  </td>
                                  <td className="px-4 py-3.5 text-sm text-gray-500">
                                    {fmt(leave.created_at)}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {canApproveReject && (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => handleApprove(leave.id)}
                                          className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => {
                                            const reason = prompt('Please provide rejection reason:');
                                            if (reason) handleReject(leave.id, reason);
                                          }}
                                          className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Table footer */}
                      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of{" "}
                          <span className="font-semibold text-gray-600">{leaveHistory.length}</span> records
                        </span>
                        <span className="text-xs text-gray-400">
                          Total: <span className="font-semibold text-gray-600">{stats.totalDays} days</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function LeaveHistory() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <LeaveHistoryContent />
    </Suspense>
  );
}