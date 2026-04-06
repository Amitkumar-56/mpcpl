'use client';

import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, Suspense } from 'react';

// ─── Icons ───────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
  </svg>
);

const LogsIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

// ─── Stat Icons ───────────────────────────────────────────────────────────────
const StatIcons = {
  blue: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  green: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  purple: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  amber: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ─── PDF Export using jsPDF (loaded from CDN) ────────────────────────────────
async function exportToPDF(logs, actionFilter) {
  // Dynamically load jsPDF from CDN
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const now   = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  // ── Header bar ──
  doc.setFillColor(24, 95, 165);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Stock Management Activity Logs', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Exported: ${now}`, pageW - 14, 14, { align: 'right' });

  // ── Sub-header ──
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Filter: ${actionFilter === 'All' ? 'All types' : actionFilter}   |   Total records: ${logs.length}`, 14, 30);

  // ── Stats summary row ──
  const statLabels = ['Total Activities', "Today's Activities", 'Active Users', 'Recent Updates'];
  const statValues = [logs.length, logs.filter(log => {
    const logDate = new Date(log.action_date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length, new Set(logs.map(log => log.user_name)).size, logs.filter(log => {
    const logTime = new Date(`${log.action_date} ${log.action_time || '00:00:00'}`);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return logTime > thirtyMinutesAgo;
  }).length];
  const boxW = (pageW - 28) / 4;

  statLabels.forEach((label, i) => {
    const x = 14 + i * (boxW + 2);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, 34, boxW, 16, 2, 2, 'F');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 4, 40);
    doc.setTextColor(24, 95, 165);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(statValues[i].toString(), x + 4, 48);
  });

  // ── Action color mapping ──
  const ACTION_COLORS = {
    create: [59, 130, 246],
    add: [16, 185, 129],
    update: [139, 92, 246],
    edit: [245, 158, 11],
    delete: [239, 68, 68],
    approve: [34, 197, 94],
    reject: [239, 68, 68],
  };

  // ── Table ──
  doc.autoTable({
    startY: 55,
    head: [['#', 'User', 'Action', 'Record', 'Details', 'Date', 'Time']],
    body: logs.map((log, idx) => [
      idx + 1,
      log.user_name || 'N/A',
      log.action || 'N/A',
      log.record_type || 'N/A',
      log.remarks || log.field_name || 'N/A',
      log.action_date || 'N/A',
      log.action_time || 'N/A',
    ]),
    headStyles: {
      fillColor: [24, 95, 165],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 60 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20 },
    },
    didDrawCell(data) {
      // Color-code the Action column (index 2) with a pill
      if (data.section === 'body' && data.column.index === 2) {
        const action = data.cell.raw;
        const color  = ACTION_COLORS[action] || [100, 100, 100];
        const { x, y, width: w, height: h } = data.cell;
        const pill = { x: x + 2, y: y + (h - 5) / 2, w: w - 4, h: 5 };
        doc.setFillColor(color[0], color[1], color[2], 0.15);
        doc.setFillColor(...color.map(c => Math.min(255, c + 180)));
        doc.roundedRect(pill.x, pill.y, pill.w, pill.h, 1.5, 1.5, 'F');
        doc.setTextColor(...color);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(action, x + w / 2, y + h / 2 + 0.5, { align: 'center', baseline: 'middle' });
        // Reset
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer on each page ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, doc.internal.pageSize.getHeight() - 14, pageW - 14, doc.internal.pageSize.getHeight() - 14);
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('MPCL — Confidential', 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Page ${p} of ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }

  doc.save(`stock-management-activity-logs-${Date.now()}.pdf`);
}

// ─── Loading Components ──────────────────────────────────────────────────────
const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-32 mt-3"></div>
      </div>
    ))}
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/40">
      <div className="h-5 bg-gray-200 rounded w-40 animate-pulse"></div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['User', 'Action', 'Record Type', 'Details', 'Date', 'Time'].map((header) => (
              <th key={header} className="px-6 py-3">
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i} className="border-b border-gray-50">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <td key={j} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const LogsContentSkeleton = () => (
  <>
    <StatsSkeleton />
    <TableSkeleton />
  </>
);

// ─── Main Content Component (with Suspense) ──────────────────────────────────
function StockActivityLogsContent() {
  const router = useRouter();
  const { user } = useSession();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('All time');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [availableActions, setAvailableActions] = useState([]);
  const PER_PAGE = 8;

  // ── Fetch Logs ──
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      
      if (search) params.append('search', search);
      if (actionFilter && actionFilter !== 'All') params.append('action', actionFilter);
      if (timeFilter && timeFilter !== 'All time') {
        const now = new Date();
        if (timeFilter === 'Today') {
          params.append('from_date', now.toISOString().split('T')[0]);
          params.append('to_date', now.toISOString().split('T')[0]);
        } else if (timeFilter === 'This week') {
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          params.append('from_date', weekStart.toISOString().split('T')[0]);
          params.append('to_date', new Date().toISOString().split('T')[0]);
        } else if (timeFilter === 'This month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          params.append('from_date', monthStart.toISOString().split('T')[0]);
          params.append('to_date', new Date().toISOString().split('T')[0]);
        }
      }
      
      params.append('page', 'Stock Management');
      params.append('record_type', 'stock');
      params.append('limit', PER_PAGE.toString());
      params.append('offset', ((page - 1) * PER_PAGE).toString());
      
      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        const logsData = result.data || [];
        setLogs(logsData);
        setTotal(result.total || 0);
        
        const actions = [...new Set(logsData.map(log => log.action).filter(Boolean))];
        setAvailableActions(actions);
      } else {
        setError(result.error || 'Failed to fetch activity logs');
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err.message || 'Error fetching activity logs');
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, timeFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Filter handlers ──
  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      (log.user_name && log.user_name.toLowerCase().includes(search.toLowerCase())) ||
      (log.record_type && log.record_type.toLowerCase().includes(search.toLowerCase())) ||
      (log.remarks && log.remarks.toLowerCase().includes(search.toLowerCase()));
    const matchAction = actionFilter === 'All' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const totalPages = Math.ceil(total / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Export handler ──
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportToPDF(logs, actionFilter);
    } catch (e) {
      alert('PDF export failed. Please try again.');
      console.error(e);
    } finally {
      setExporting(false);
    }
  }, [logs, actionFilter]);

  // ── Badge Colors ──
  const BADGE_STYLES = {
    create: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    add: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    update: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    edit: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    delete: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    approve: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    reject: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  };

  const AVATAR_STYLES = {
    blue:   'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm',
    green:  'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm',
    amber:  'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm',
    pink:   'bg-gradient-to-br from-pink-400 to-pink-600 text-white shadow-sm',
    purple: 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-sm',
  };

  const STAT_STYLES = {
    blue:   { card: 'text-blue-700', icon: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    green:  { card: 'text-emerald-700', icon: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
    purple: { card: 'text-purple-700', icon: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
    amber:  { card: 'text-amber-700', icon: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  };

  // ── Stats calculation ──
  const todayCount = logs.filter(log => {
    const logDate = new Date(log.action_date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  const activeUsersCount = new Set(logs.map(log => log.user_name)).size;

  const recentCount = logs.filter(log => {
    const logTime = new Date(`${log.action_date} ${log.action_time || '00:00:00'}`);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return logTime > thirtyMinutesAgo;
  }).length;

  const STATS = [
    { label: 'Total Activities', value: total.toString(), trend: '+12% vs last week', color: 'blue' },
    { label: "Today's Activities", value: todayCount.toString(), trend: 'Updated in real-time', color: 'green' },
    { label: 'Active Users', value: activeUsersCount.toString(), trend: 'Unique contributors', color: 'purple' },
    { label: 'Recent Updates', value: recentCount.toString(), trend: 'Last 30 minutes', color: 'amber' },
  ];

  // ── Helper functions ──
  const getUserInitials = (userName) => {
    if (!userName) return 'NA';
    const names = userName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  const getUserColor = (userName) => {
    const colors = ['blue', 'green', 'amber', 'pink', 'purple'];
    if (!userName) return 'blue';
    const index = userName.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading && logs.length === 0) {
    return <LogsContentSkeleton />;
  }

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className={`bg-white rounded-2xl border ${STAT_STYLES[stat.color].border} p-5 shadow-sm hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${STAT_STYLES[stat.color].card}`}>{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${STAT_STYLES[stat.color].icon}`}>
                {StatIcons[stat.color]}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* Logs Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/40">
          <div className="flex items-center gap-2">
            <LogsIcon />
            <span className="text-sm font-semibold text-gray-700">Activity Timeline</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total} records</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <SearchIcon />
              <input
                className="text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400 w-40"
                placeholder="Search logs..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Action Filter */}
            <select
              className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            >
              <option value="All">All Actions</option>
              {availableActions.length > 0 ? (
                availableActions.map(action => (
                  <option key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </option>
                ))
              ) : (
                ['create', 'add', 'update', 'edit', 'delete', 'approve', 'reject'].map(action => (
                  <option key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </option>
                ))
              )}
            </select>

            {/* Time Filter */}
            <select
              className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value)}
            >
              {['All time', 'Today', 'This week', 'This month'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all ${
                exporting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
              }`}
            >
              {exporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Record Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Details</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Time</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {error ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="text-red-600 bg-red-50 inline-block px-4 py-2 rounded-lg">{error}</div>
                   </td>
                 </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="text-gray-400">No activity records found</div>
                   </td>
                 </tr>
              ) : (
                paginated.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-gray-50/80 transition-colors duration-150">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${AVATAR_STYLES[getUserColor(log.user_name)]}`}>
                          {getUserInitials(log.user_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{log.user_name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-400">ID: {log.user_id || 'N/A'}</p>
                        </div>
                      </div>
                     </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${BADGE_STYLES[log.action] || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'}`}>
                        {log.action || 'N/A'}
                      </span>
                     </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-gray-700 font-mono">{log.record_type || 'N/A'}</span>
                     </td>
                    <td className="px-6 py-3">
                      <p className="text-sm text-gray-500 max-w-md truncate" title={log.remarks || log.field_name}>
                        {log.remarks || log.field_name || 'N/A'}
                      </p>
                     </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-gray-600 whitespace-nowrap">{formatDate(log.action_date)}</span>
                     </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-gray-500 font-mono">{log.action_time || 'N/A'}</span>
                     </td>
                   </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && !error && paginated.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{paginated.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}</span> to{' '}
              <span className="font-medium text-gray-700">{Math.min(page * PER_PAGE, total)}</span> of{' '}
              <span className="font-medium text-gray-700">{total}</span> entries
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg border text-sm font-medium transition-all ${
                    page === p
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              {totalPages > 5 && (
                <>
                  <span className="text-gray-300 px-1">...</span>
                  <button
                    onClick={() => setPage(totalPages)}
                    className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-gray-400 px-2">
        <span>© 2025 MPCL. All rights reserved.</span>
        <span>v2.4.1</span>
      </div>
    </>
  );
}

// ─── Main Page Component with Suspense ───────────────────────────────────────
export default function StockActivityLogsPage() {
  const router = useRouter();
  const { user } = useSession();

  const getUserInitials = (userName) => {
    if (!userName) return 'NA';
    const names = userName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header Section with Back Button */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button - Navigates to /stock */}
              <button
                onClick={() => router.push('/stock')}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <BackIcon />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Back to Stock</span>
              </button>
              
              <div className="h-8 w-px bg-gray-200" />
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Activity Logs</h1>
                <p className="text-sm text-gray-500 mt-0.5">Track and monitor all stock management activities</p>
              </div>
            </div>
            
            {/* User Avatar */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-semibold text-white shadow-md">
                {getUserInitials(user?.name || 'User')}
              </div>
            </div>
          </div>
        </div>

        {/* Suspense Boundary for the dynamic content */}
        <Suspense fallback={<LogsContentSkeleton />}>
          <StockActivityLogsContent />
        </Suspense>
      </div>
    </div>
  );
}