'use client';

import { useSession } from '@/context/SessionContext';
import { useEffect, useState } from 'react';
import ExportButton from './ExportButton';

/**
 * Reusable Activity Logs Component
 * Can be used on any page to show activity logs specific to that page
 *
 * @param {string} pageName - Name of the page (e.g., 'Stock Management', 'Customer Management')
 * @param {string} section - Section name (optional, for filtering)
 * @param {string} recordType - Record type (e.g., 'stock', 'customer', 'supplier')
 * @param {number} recordId - Specific record ID to filter (optional)
 * @param {string} uniqueCode - Unique code to filter (optional)
 * @param {boolean} showFilters - Show filter controls (default: true)
 * @param {number} limit - Number of logs per page (default: 50)
 */
export default function ActivityLogs({
  pageName,
  section = null,
  recordType = null,
  recordId = null,
  uniqueCode = null,
  showFilters = true,
  limit = 50
}) {
  const { user } = useSession();
  const isAdmin = user && Number(user.role) === 5;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [availableActions, setAvailableActions] = useState([]);

  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
    from_date: '',
    to_date: ''
  });

  const allowedActions = ['create', 'add', 'edit', 'update', 'created by', 'updated by', 'edited by'];
  const [showOnlySpecificActions, setShowOnlySpecificActions] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters, pageName, section, recordType, recordId, uniqueCode]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (pageName)      params.append('page', pageName);
      if (section)       params.append('section', section);
      if (recordType)    params.append('record_type', recordType);
      if (recordId)      params.append('record_id', recordId.toString());
      if (uniqueCode)    params.append('unique_code', uniqueCode);
      if (filters.action)     params.append('action', filters.action);
      if (filters.user_id)    params.append('user_id', filters.user_id);
      if (filters.from_date)  params.append('from_date', filters.from_date);
      if (filters.to_date)    params.append('to_date', filters.to_date);
      params.append('limit',  limit.toString());
      params.append('offset', ((currentPage - 1) * limit).toString());

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const result   = await response.json();

      if (result.success) {
        const logsData = result.data || [];

        const filteredLogs = showOnlySpecificActions
          ? logsData.filter(log => {
              const action = (log.action || '').toLowerCase();
              return allowedActions.some(a =>
                action.includes(a.toLowerCase()) || a.toLowerCase().includes(action)
              );
            })
          : logsData;

        const actionsInData = filteredLogs.map(log => log.action).filter(Boolean);
        console.log('🔍 [ActivityLogs] Actions:', [...new Set(actionsInData)]);

        setLogs(filteredLogs);
        setTotal(result.total || 0);
        setHasMore(result.hasMore || false);
        setAvailableActions([...new Set(actionsInData)].sort());
      } else {
        setError(result.error || 'Failed to fetch activity logs');
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err.message || 'Error fetching activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ action: '', user_id: '', from_date: '', to_date: '' });
    setCurrentPage(1);
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const time = timeStr || '00:00:00';
    return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${time}`;
  };

  const formatValue = (value) => {
    if (!value && value !== 0) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    const roleNames = { 1: 'Staff', 2: 'Incharge', 3: 'Team Leader', 4: 'Accountant', 5: 'Admin', 6: 'Driver' };
    if (typeof value === 'number' && roleNames[value]) return `${roleNames[value]} (${value})`;
    return String(value);
  };

  const downloadPDF = () => {
    const dateStr = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    const rows = logs.map((log, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px">${i + 1}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;white-space:nowrap">
          ${log.action_date ? new Date(log.action_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A'}<br/>
          <span style="color:#94a3b8;font-size:11px">${log.action_time || ''}</span>
        </td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#1e293b">
          ${log.user_name || log.user_display_name || (log.user_id ? 'Employee #' + log.user_id : '—')}
          ${log.user_id ? '<br/><span style="color:#94a3b8;font-size:11px;font-weight:400">ID: ' + log.user_id + '</span>' : ''}
        </td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px">
          <span style="
            display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
            background:${(log.action||'').toLowerCase()==='create'||( log.action||'').toLowerCase()==='add'?'#eff6ff':(log.action||'').toLowerCase()==='edit'||(log.action||'').toLowerCase()==='update'?'#fefce8':(log.action||'').toLowerCase()==='delete'?'#fef2f2':'#f5f3ff'};
            color:${(log.action||'').toLowerCase()==='create'||(log.action||'').toLowerCase()==='add'?'#2563eb':(log.action||'').toLowerCase()==='edit'||(log.action||'').toLowerCase()==='update'?'#92400e':(log.action||'').toLowerCase()==='delete'?'#b91c1c':'#6d28d9'};
          ">${(log.action || 'N/A').toUpperCase()}</span>
        </td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-style:italic">${log.remarks || '—'}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;color:#64748b">${log.record_type || '—'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Activity Logs${pageName ? ' - ' + pageName : ''}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; }
          @media print {
            @page { size: A4 landscape; margin: 15mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px 28px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;margin-bottom:0">
          <div>
            <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">📋 Activity Logs</div>
            ${pageName ? `<div style="font-size:13px;color:#c7d2fe;margin-top:3px">${pageName}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:#c7d2fe">Generated on</div>
            <div style="font-size:14px;font-weight:700;color:#fff">${dateStr}</div>
          </div>
        </div>

        <!-- Stats bar -->
        <div style="display:flex;gap:0;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 0 0;margin-bottom:18px;overflow:hidden">
          ${[
            { label:'Total Records', value: total,        bg:'#eff6ff', color:'#2563eb' },
            { label:'Created',       value: logs.filter(l=>['create','add'].includes((l.action||'').toLowerCase())).length, bg:'#f0fdf4', color:'#16a34a' },
            { label:'Edited',        value: logs.filter(l=>['edit','update'].includes((l.action||'').toLowerCase())).length, bg:'#fefce8', color:'#92400e' },
            { label:'Deleted',       value: logs.filter(l=>(l.action||'').toLowerCase()==='delete').length, bg:'#fef2f2', color:'#b91c1c' },
            { label:'Other',         value: logs.filter(l=>!['create','add','edit','update','delete'].includes((l.action||'').toLowerCase())).length, bg:'#f5f3ff', color:'#6d28d9' },
          ].map(s=>`
            <div style="flex:1;padding:12px 16px;background:${s.bg};border-right:1px solid #e2e8f0;text-align:center">
              <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">${s.label}</div>
              <div style="font-size:22px;font-weight:800;color:${s.color}">${s.value}</div>
            </div>
          `).join('')}
        </div>

        <!-- Table -->
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#4f46e5">
              <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px;border:1px solid #6366f1;width:40px">#</th>
              <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px;border:1px solid #6366f1">Date &amp; Time</th>
              <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px;border:1px solid #6366f1">User</th>
              <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px;border:1px solid #6366f1">Action</th>
              <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px;border:1px solid #6366f1">Remarks</th>
              <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px;border:1px solid #6366f1">Record Type</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <!-- Footer -->
        <div style="margin-top:18px;text-align:center;font-size:11px;color:#94a3b8">
          Total ${logs.length} records exported &nbsp;|&nbsp; Activity Logs &nbsp;|&nbsp; ${dateStr}
        </div>
      </body>
      </html>
    `;

    // Create a blob and download link
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity_logs_${pageName || 'all'}_${dateStr.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Derive stat counts from current logs
  const statsCreate = logs.filter(l => ['create','add'].includes((l.action||'').toLowerCase())).length;
  const statsEdit   = logs.filter(l => ['edit','update'].includes((l.action||'').toLowerCase())).length;
  const statsDelete = logs.filter(l => (l.action||'').toLowerCase() === 'delete').length;
  const statsOther  = logs.filter(l => !['create','add','edit','update','delete'].includes((l.action||'').toLowerCase())).length;

  const statCards = [
    { label: 'TOTAL RECORDS', value: total,        iconBg: '#e0e7ff', icon: '📊' },
    { label: 'CREATED',       value: statsCreate,  iconBg: '#fef9c3', icon: '✏️'  },
    { label: 'EDITED',        value: statsEdit,    iconBg: '#fef9c3', icon: '⚙️'  },
    { label: 'COMPLETED',     value: statsDelete,  iconBg: '#dcfce7', icon: '✅'  },
    { label: 'OTHER',         value: statsOther,   iconBg: '#fee2e2', icon: '❌'  },
  ];

  const getActionStyle = (action) => {
    const a = (action || '').toLowerCase();
    if (a === 'create' || a === 'add')  return { bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe', dot:'#3b82f6', label: a==='add'?'Added':'Created' };
    if (a === 'edit' || a === 'update') return { bg:'#fefce8', color:'#92400e', border:'#fde68a', dot:'#f59e0b', label: a==='edit'?'Edited':'Updated' };
    if (a === 'delete')                 return { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca', dot:'#ef4444', label:'Deleted' };
    if (a === 'approve')                return { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0', dot:'#22c55e', label:'Approved' };
    if (a === 'reject')                 return { bg:'#fff1f2', color:'#be123c', border:'#fecdd3', dot:'#f43f5e', label:'Rejected' };
    return { bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe', dot:'#8b5cf6', label: action||'Action' };
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif", background:'#f1f5f9', minHeight:'100%', padding:'24px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .al-title { font-size:28px; font-weight:800; color:#4f46e5; letter-spacing:-0.5px; margin:0 0 4px; }
        .al-sub   { font-size:14px; color:#64748b; margin:0 0 24px; }

        /* stat cards */
        .al-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-bottom:20px; }
        @media(max-width:900px){ .al-stats{ grid-template-columns:repeat(3,1fr); } }
        @media(max-width:560px){ .al-stats{ grid-template-columns:repeat(2,1fr); } }
        .al-sc {
          background:#fff; border-radius:14px; padding:18px 20px;
          display:flex; align-items:center; justify-content:space-between;
          border:1px solid #e2e8f0;
          box-shadow:0 1px 4px rgba(0,0,0,.04);
          transition:transform .15s,box-shadow .15s;
        }
        .al-sc:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.07); }
        .al-sc-lbl  { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.7px; margin-bottom:6px; }
        .al-sc-val  { font-size:28px; font-weight:800; color:#0f172a; line-height:1; }
        .al-sc-icon { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }

        /* filter card */
        .al-fc { background:#fff; border-radius:14px; border:1px solid #e2e8f0; padding:20px 24px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .al-fc-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
        .al-fc-title { font-size:15px; font-weight:700; color:#1e293b; }
        .al-fc-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .al-fg { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:16px; align-items:end; }
        @media(max-width:900px){ .al-fg{ grid-template-columns:1fr 1fr; } }
        @media(max-width:560px){ .al-fg{ grid-template-columns:1fr; } }

        .al-lbl { display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:7px; }
        .al-inp, .al-sel {
          width:100%; height:42px; background:#f8fafc; border:1.5px solid #e2e8f0;
          border-radius:9px; padding:0 14px; font-size:13.5px; color:#1e293b;
          font-family:'Plus Jakarta Sans',sans-serif; transition:border-color .2s,box-shadow .2s;
          outline:none; box-sizing:border-box;
        }
        .al-inp:focus,.al-sel:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
        .al-inp::placeholder { color:#94a3b8; }
        .al-srch { position:relative; }
        .al-srch-ic { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:14px; pointer-events:none; }
        .al-srch .al-inp { padding-left:36px; }

        .al-pdf-btn {
          display:inline-flex; align-items:center; gap:7px;
          padding:0 18px; height:40px; background:#ef4444; color:#fff;
          border:none; border-radius:9px; font-size:13px; font-weight:700;
          cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
          transition:background .2s,transform .15s; white-space:nowrap;
          box-shadow:0 2px 8px rgba(239,68,68,.3);
        }
        .al-pdf-btn:hover { background:#dc2626; transform:translateY(-1px); box-shadow:0 4px 14px rgba(239,68,68,.4); }
        .al-pdf-btn:active { transform:translateY(0); }

        .al-toggle {
          display:inline-flex; align-items:center; gap:6px;
          padding:0 14px; height:40px; border-radius:9px;
          font-size:12.5px; font-weight:600; cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif; transition:all .2s;
          border:1.5px solid; white-space:nowrap;
        }
        .al-toggle.on  { background:#4f46e5; color:#fff; border-color:#4f46e5; }
        .al-toggle.off { background:#fff; color:#64748b; border-color:#e2e8f0; }
        .al-toggle:hover { transform:translateY(-1px); }

        .al-clear {
          height:38px; padding:0 14px; background:#fff; border:1.5px solid #e2e8f0;
          border-radius:9px; font-size:12.5px; font-weight:600; color:#64748b;
          cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all .2s;
        }
        .al-clear:hover { border-color:#ef4444; color:#ef4444; background:#fff5f5; }

        /* table card */
        .al-tc { background:#fff; border-radius:14px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .al-tc-count { padding:12px 24px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#64748b; font-weight:500; }
        .al-tc-count b { color:#4f46e5; }

        .al-tbl { width:100%; border-collapse:collapse; }
        .al-tbl thead tr { background:#f8fafc; border-bottom:2px solid #e2e8f0; }
        .al-tbl thead th { padding:12px 20px; text-align:left; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.7px; white-space:nowrap; }
        .al-tbl tbody tr { border-bottom:1px solid #f1f5f9; transition:background .12s; }
        .al-tbl tbody tr:last-child { border-bottom:none; }
        .al-tbl tbody tr:hover { background:#fafbff; }
        .al-tbl td { padding:14px 20px; font-size:13px; color:#334155; vertical-align:top; }

        .al-dt-d { font-size:13px; font-weight:600; color:#1e293b; white-space:nowrap; }
        .al-dt-t { font-size:11.5px; color:#94a3b8; margin-top:2px; font-family:'JetBrains Mono',monospace; white-space:nowrap; }

        .al-un  { font-weight:600; color:#1e293b; font-size:13px; }
        .al-uid { font-size:11px; color:#94a3b8; margin-top:2px; font-family:'JetBrains Mono',monospace; }
        .al-url { font-size:11px; color:#8b5cf6; margin-top:1px; font-weight:500; }

        .al-badge {
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 11px; border-radius:20px; font-size:12px; font-weight:700;
          border:1.5px solid; white-space:nowrap;
        }
        .al-bdot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

        .al-cfl { font-size:10.5px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px; }
        .al-cr  { display:flex; align-items:center; gap:6px; font-size:12px; padding:4px 8px; background:#f8fafc; border-radius:6px; margin-bottom:3px; border-left:3px solid #e2e8f0; }
        .al-ck  { font-weight:600; color:#475569; font-size:11px; min-width:70px; }
        .al-ov  { color:#ef4444; text-decoration:line-through; font-family:'JetBrains Mono',monospace; font-size:11px; }
        .al-arr { color:#94a3b8; font-size:11px; }
        .al-nv  { color:#16a34a; font-weight:700; font-family:'JetBrains Mono',monospace; font-size:11px; }

        .al-rem { font-size:12.5px; color:#475569; font-style:italic; line-height:1.5; }
        .al-ttag { display:inline-block; font-size:10px; font-weight:700; color:#7c3aed; background:#f5f3ff; border:1px solid #ddd6fe; border-radius:5px; padding:2px 7px; margin-top:5px; text-transform:uppercase; letter-spacing:.4px; }

        .al-empty { padding:64px 24px; text-align:center; }
        .al-empty-ic { font-size:42px; opacity:.35; margin-bottom:12px; }
        .al-empty-tx { font-size:14px; color:#94a3b8; font-weight:500; }

        .al-skel { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:6px; }
        @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }

        .al-pg { padding:14px 24px; border-top:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; background:#fafbff; }
        .al-pg-info { font-size:12.5px; color:#64748b; font-weight:500; }
        .al-pg-info b { color:#1e293b; }
        .al-pgb { padding:7px 16px; font-size:12.5px; font-weight:600; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#475569; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all .18s; margin-left:6px; }
        .al-pgb:hover:not(:disabled) { border-color:#6366f1; color:#6366f1; background:#f5f3ff; }
        .al-pgb:disabled { opacity:.38; cursor:not-allowed; }

        /* mobile */
        .al-mob { padding:16px; border-bottom:1px solid #f1f5f9; background:#fff; }
        .al-mob:hover { background:#fafbff; }
        .al-mob-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; gap:8px; }
        .al-mob-time { font-size:11px; color:#94a3b8; font-family:'JetBrains Mono',monospace; text-align:right; white-space:nowrap; }
        .al-mob-chg { background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; margin-top:8px; }
      `}</style>

      {/* Title */}
      <h1 className="al-title">Activity Logs</h1>
      <p className="al-sub">Track and monitor all system activities{pageName ? ` — ${pageName}` : ''}</p>

      {/* Stat Cards */}
      <div className="al-stats">
        {statCards.map(s => (
          <div key={s.label} className="al-sc">
            <div>
              <div className="al-sc-lbl">{s.label}</div>
              <div className="al-sc-val">{s.value}</div>
            </div>
            <div className="al-sc-icon" style={{ background: s.iconBg }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="al-fc">
          <div className="al-fc-head">
            <span className="al-fc-title">Filters</span>
            <div className="al-fc-actions">
              <button
                onClick={() => setShowOnlySpecificActions(!showOnlySpecificActions)}
                className={`al-toggle ${showOnlySpecificActions ? 'on' : 'off'}`}
              >
                {showOnlySpecificActions ? '✦ Created / Updated' : '◈ All Actions'}
              </button>
              <button onClick={downloadPDF} className="al-pdf-btn">
                📄 Export PDF
              </button>
              <ExportButton
                data={logs}
                fileName={`activity_logs_${pageName || 'all'}`}
                columns={[
                  { header: 'Date',        key: 'action_date'  },
                  { header: 'Time',        key: 'action_time'  },
                  { header: 'Section',     key: 'section'      },
                  { header: 'Unique Code', key: 'unique_code'  },
                  { header: 'Action',      key: 'action'       },
                  { header: 'User',        key: 'user_name'    },
                  { header: 'Field',       key: 'field_name'   },
                  { header: 'Old Value',   key: 'old_value'    },
                  { header: 'New Value',   key: 'new_value'    },
                  { header: 'Remarks',     key: 'remarks'      },
                ]}
              />
            </div>
          </div>

          <div className="al-fg">
            {/* Search / User ID */}
            <div>
              <label className="al-lbl">Search</label>
              <div className="al-srch">
                <span className="al-srch-ic">🔍</span>
                <input
                  type="number"
                  className="al-inp"
                  value={filters.user_id}
                  onChange={e => handleFilterChange('user_id', e.target.value)}
                  placeholder="Search by user ID..."
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="al-lbl">Status</label>
              <select className="al-sel" value={filters.action} onChange={e => handleFilterChange('action', e.target.value)}>
                <option value="">All Status</option>
                {availableActions.length > 0
                  ? availableActions.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)
                  : <>
                      <option value="create">Create</option>
                      <option value="add">Add</option>
                      <option value="edit">Edit</option>
                      <option value="delete">Delete</option>
                      <option value="approve">Approve</option>
                      <option value="reject">Reject</option>
                      <option value="update">Update</option>
                    </>
                }
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="al-lbl">From Date</label>
              <input type="date" className="al-inp" value={filters.from_date} onChange={e => handleFilterChange('from_date', e.target.value)} />
            </div>

            {/* To Date + Clear */}
            <div>
              <label className="al-lbl">To Date</label>
              <div style={{ display:'flex', gap:8 }}>
                <input type="date" className="al-inp" value={filters.to_date} onChange={e => handleFilterChange('to_date', e.target.value)} style={{ flex:1 }} />
                <button onClick={clearFilters} className="al-clear" title="Clear">✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="al-tc">
        <div className="al-tc-count">Showing <b>{logs.length}</b> of <b>{total}</b> records</div>

        {loading ? (
          <div style={{ padding:24 }}>
            {[...Array(6)].map((_,i) => (
              <div key={i} style={{ display:'flex', gap:14, marginBottom:14, alignItems:'center' }}>
                <div className="al-skel" style={{ width:100, height:34 }} />
                <div className="al-skel" style={{ width:120, height:34 }} />
                <div className="al-skel" style={{ width:80,  height:26, borderRadius:20 }} />
                <div className="al-skel" style={{ flex:1,    height:34 }} />
                <div className="al-skel" style={{ width:130, height:26 }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding:40, textAlign:'center', color:'#ef4444', fontSize:14 }}>⚠️ {error}</div>
        ) : logs.length === 0 ? (
          <div className="al-empty">
            <div className="al-empty-ic">🗂️</div>
            <div className="al-empty-tx">No activity logs found</div>
          </div>
        ) : (
          <>
            {/* ── Mobile ── */}
            <div className="md:hidden">
              {logs.map(log => {
                const s = getActionStyle(log.action);
                return (
                  <div key={log.id} className="al-mob">
                    <div className="al-mob-top">
                      <div>
                        <span className="al-badge" style={{ background:s.bg, color:s.color, borderColor:s.border }}>
                          <span className="al-bdot" style={{ background:s.dot }} />
                          {s.label}
                        </span>
                        <div className="al-un" style={{ marginTop:6 }}>
                          {log.user_name || log.user_display_name || (log.user_id ? `Employee #${log.user_id}` : '—')}
                        </div>
                        {log.user_id && <div className="al-uid">ID: {log.user_id}</div>}
                        {isAdmin && log.creator_info?.role_name && <div className="al-url">{log.creator_info.role_name}</div>}
                      </div>
                      <div className="al-mob-time">{formatDateTime(log.action_date, log.action_time)}</div>
                    </div>
                    {log.remarks && <div style={{ marginTop:8 }} className="al-rem">"{log.remarks}"</div>}
                  </div>
                );
              })}
            </div>

            {/* ── Desktop ── */}
            <div className="hidden md:block" style={{ overflowX:'auto' }}>
              <table className="al-tbl">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const s = getActionStyle(log.action);
                    return (
                      <tr key={log.id}>
                        <td>
                          <div className="al-dt-d">
                            {log.action_date ? new Date(log.action_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A'}
                          </div>
                          {log.action_time && <div className="al-dt-t">{log.action_time}</div>}
                        </td>
                        <td>
                          <div className="al-un">{log.user_name || log.user_display_name || (log.user_id ? `Employee #${log.user_id}` : '—')}</div>
                          {log.user_id && <div className="al-uid">ID: {log.user_id}</div>}
                          {isAdmin && log.creator_info?.role_name && <div className="al-url">{log.creator_info.role_name}</div>}
                        </td>
                        <td>
                          <span className="al-badge" style={{ background:s.bg, color:s.color, borderColor:s.border }}>
                            <span className="al-bdot" style={{ background:s.dot }} />
                            {s.label}
                          </span>
                        </td>
                        <td style={{ maxWidth:200 }}>
                          {log.remarks && <div className="al-rem">"{log.remarks}"</div>}
                          {log.record_type && <span className="al-ttag">{log.record_type}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="al-pg">
            <div className="al-pg-info">Page <b>{currentPage}</b> of <b>{totalPages}</b></div>
            <div>
              <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1} className="al-pgb">← Previous</button>
              <button onClick={() => setCurrentPage(p => p+1)} disabled={!hasMore} className="al-pgb">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}