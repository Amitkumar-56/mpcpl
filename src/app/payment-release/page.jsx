'use client';
import {
  AlertCircle, ArrowUpRight, Banknote, CheckCircle2,
  CreditCard, IndianRupee, Loader2,
  Search, Users, X, Zap
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

/* ─────────────────────────── helpers ─────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const PAYMENT_METHODS = ['bank','cash','cheque','upi'];

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parseFloat(n) || 0);

/* ─────────────────────────── skeleton ────────────────────────── */
function Skeleton() {
  return (
    <div className="pr-page">
      <div className="pr-header pr-header--loading">
        <div className="skel skel--title" />
        <div className="skel skel--sub" />
      </div>
      <div className="pr-stat-grid">
        {[0,1,2,3].map(i => (
          <div key={i} className="pr-stat-card pr-stat-card--skel">
            <div className="skel skel--label" />
            <div className="skel skel--value" />
          </div>
        ))}
      </div>
      <div className="pr-body">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="pr-row-skel">
            {[0,1,2,3,4,5].map(j => (
              <div key={j} className="skel skel--cell" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── main ────────────────────────────── */
function PaymentReleaseContent() {
  const [records, setRecords]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [search, setSearch]               = useState('');
  const [selected, setSelected]           = useState(new Set());
  const [modal, setModal]                 = useState(false);
  const [releasing, setReleasing]         = useState(false);
  const [stats, setStats]                 = useState({ totalEmployees:0, totalNetSalary:0, totalAdvances:0, finalTotal:0 });

  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank',
    remarks: ''
  });

  /* fetch */
  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setSelected(new Set());
      const res  = await fetch(`/api/payment-release?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
        setStats({
          totalEmployees: data.data.length,
          totalNetSalary: data.data.reduce((s,r) => s + parseFloat(r.net_salary||0), 0),
          totalAdvances:  data.data.reduce((s,r) => s + r.totalAdvanceAmount, 0),
          finalTotal:     data.data.reduce((s,r) => s + r.finalNetSalary, 0)
        });
      } else {
        toast.error(data.error || 'Failed to fetch data');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  /* filter */
  const filtered = records.filter(r =>
    r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.emp_code?.toLowerCase().includes(search.toLowerCase())
  );

  /* selection helpers */
  const isAllSelected = filtered.length > 0 && filtered.every(r => selected.has(r.employee_id));
  const isIndeterminate = !isAllSelected && filtered.some(r => selected.has(r.employee_id));

  const toggleAll = () => {
    if (isAllSelected) {
      // deselect only filtered
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(r => next.delete(r.employee_id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(r => next.add(r.employee_id));
        return next;
      });
    }
  };

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedRecords = records.filter(r => selected.has(r.employee_id));
  const selectedTotal   = selectedRecords.reduce((s,r) => s + r.finalNetSalary, 0);

  /* release */
  const releasePayments = async () => {
    if (selected.size === 0) { toast.error('Koi employee select nahi hai'); return; }
    try {
      setReleasing(true);
      const res  = await fetch('/api/payment-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          payment_date:   form.payment_date,
          payment_method: form.payment_method,
          remarks:        form.remarks,
          selected_employees: [...selected]
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setModal(false);
        setSelected(new Set());
        await fetchData();
        downloadSummary(data.data.releasedEmployees);
      } else {
        toast.error(data.error || 'Release failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setReleasing(false);
    }
  };

  const downloadSummary = (employees) => {
    const lines = [
      '╔══════════════════════════════════════╗',
      '║      PAYMENT RELEASE SUMMARY         ║',
      '╚══════════════════════════════════════╝',
      '',
      `Date           : ${new Date().toLocaleDateString('en-IN')}`,
      `Period         : ${MONTHS[selectedMonth-1]} ${selectedYear}`,
      `Payment Method : ${form.payment_method.toUpperCase()}`,
      `Payment Date   : ${form.payment_date}`,
      '',
      '──────────────────────────────────────',
      'Employees Paid :',
      ...employees.map((e,i) => `  ${String(i+1).padStart(2,'0')}. ${e.employee_name.padEnd(25)} ₹${fmt(e.net_salary)}`),
      '',
      '──────────────────────────────────────',
      `Total Amount   : ₹${fmt(employees.reduce((s,e) => s+parseFloat(e.net_salary),0))}`,
      `Total Count    : ${employees.length}`,
      '',
      `Remarks        : ${form.remarks || 'None'}`,
      '',
      '[ Generated by Payment Release System ]'
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `payment_summary_${selectedMonth}_${selectedYear}.txt`
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── render ─── */
  return (
    <>
      <style>{`
        /* ── reset / base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #f0f4f8;
          --surface:   #ffffff;
          --border:    #dde3ed;
          --text-1:    #1a2332;
          --text-2:    #4a5568;
          --text-3:    #8a97aa;
          --green-1:   #059669;
          --green-2:   #d1fae5;
          --green-3:   #10b981;
          --blue-1:    #2563eb;
          --blue-2:    #dbeafe;
          --amber-1:   #d97706;
          --amber-2:   #fef3c7;
          --purple-1:  #7c3aed;
          --purple-2:  #ede9fe;
          --red-1:     #dc2626;
          --red-2:     #fee2e2;
          --shadow-sm: 0 1px 3px rgba(0,0,0,.08);
          --shadow-md: 0 4px 16px rgba(0,0,0,.10);
          --shadow-lg: 0 8px 32px rgba(0,0,0,.14);
          --radius:    12px;
          --radius-sm: 8px;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        /* ── layout ── */
        .pr-page {
          min-height: 100vh;
          background: var(--bg);
          padding: 28px 20px 60px;
        }
        .pr-card {
          max-width: 1320px;
          margin: 0 auto;
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow-md);
          overflow: hidden;
          border: 1px solid var(--border);
        }

        /* ── header ── */
        .pr-header {
          background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%);
          padding: 28px 32px 24px;
          position: relative;
          overflow: hidden;
        }
        .pr-header::after {
          content: '';
          position: absolute;
          right: -60px; top: -60px;
          width: 240px; height: 240px;
          border-radius: 50%;
          background: rgba(255,255,255,.05);
          pointer-events: none;
        }
        .pr-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          position: relative;
        }
        .pr-header-left { display: flex; align-items: center; gap: 14px; }
        .pr-icon-wrap {
          background: rgba(255,255,255,.15);
          border-radius: 10px;
          padding: 10px;
          display: flex;
        }
        .pr-title { color: #fff; font-size: 1.5rem; font-weight: 700; line-height: 1.2; }
        .pr-subtitle { color: rgba(255,255,255,.65); font-size: .875rem; margin-top: 3px; }
        .pr-refresh-btn {
          background: rgba(255,255,255,.15);
          border: 1px solid rgba(255,255,255,.2);
          color: #fff;
          border-radius: var(--radius-sm);
          padding: 8px 16px;
          font-size: .85rem;
          cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: background .2s;
        }
        .pr-refresh-btn:hover { background: rgba(255,255,255,.25); }

        /* ── stats ── */
        .pr-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border-bottom: 1px solid var(--border);
        }
        @media (max-width: 768px) {
          .pr-stat-grid { grid-template-columns: repeat(2,1fr); }
        }
        .pr-stat-card {
          padding: 20px 24px;
          border-right: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          transition: background .15s;
        }
        .pr-stat-card:last-child { border-right: none; }
        .pr-stat-card:hover { background: #fafbfc; }
        .pr-stat-label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 4px; }
        .pr-stat-value { font-size: 1.4rem; font-weight: 700; }
        .pr-stat-icon { border-radius: 10px; padding: 10px; }

        .stat--green .pr-stat-label { color: var(--green-1); }
        .stat--green .pr-stat-value { color: #064e3b; }
        .stat--green .pr-stat-icon  { background: var(--green-2); color: var(--green-1); }

        .stat--blue .pr-stat-label { color: var(--blue-1); }
        .stat--blue .pr-stat-value { color: #1e3a8a; }
        .stat--blue .pr-stat-icon  { background: var(--blue-2); color: var(--blue-1); }

        .stat--amber .pr-stat-label { color: var(--amber-1); }
        .stat--amber .pr-stat-value { color: #78350f; }
        .stat--amber .pr-stat-icon  { background: var(--amber-2); color: var(--amber-1); }

        .stat--purple .pr-stat-label { color: var(--purple-1); }
        .stat--purple .pr-stat-value { color: #4c1d95; }
        .stat--purple .pr-stat-icon  { background: var(--purple-2); color: var(--purple-1); }

        /* ── toolbar ── */
        .pr-toolbar {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          background: #fafbfc;
        }
        .pr-select {
          appearance: none;
          background: var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 32px 8px 12px;
          font-size: .875rem;
          color: var(--text-1);
          cursor: pointer;
          transition: border-color .2s, box-shadow .2s;
        }
        .pr-select:focus {
          outline: none;
          border-color: var(--green-1);
          box-shadow: 0 0 0 3px rgba(5,150,105,.12);
        }
        .pr-search {
          position: relative;
          flex: 1;
          min-width: 180px;
          max-width: 300px;
        }
        .pr-search svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-3);
        }
        .pr-search input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 12px 8px 34px;
          font-size: .875rem;
          color: var(--text-1);
          transition: border-color .2s, box-shadow .2s;
        }
        .pr-search input:focus {
          outline: none;
          border-color: var(--green-1);
          box-shadow: 0 0 0 3px rgba(5,150,105,.12);
        }
        .pr-sel-btns {
          display: flex; align-items: center; gap: 6px;
          margin-left: auto;
        }
        .pr-txt-btn {
          font-size: .8rem;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: background .15s;
        }
        .pr-txt-btn--green { background: var(--green-2); color: var(--green-1); }
        .pr-txt-btn--green:hover { background: #a7f3d0; }
        .pr-txt-btn--red   { background: var(--red-2);   color: var(--red-1); }
        .pr-txt-btn--red:hover   { background: #fca5a5; }

        /* ── selection bar ── */
        .pr-sel-bar {
          margin: 0 24px 0;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, #064e3b, #065f46);
          color: #fff;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          animation: slideDown .2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pr-sel-bar-info { font-size: .875rem; }
        .pr-sel-bar-info strong { font-size: 1.05rem; }
        .pr-release-btn {
          background: #fff;
          color: #064e3b;
          border: none;
          border-radius: var(--radius-sm);
          padding: 9px 20px;
          font-weight: 700;
          font-size: .875rem;
          cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 2px 8px rgba(0,0,0,.15);
        }
        .pr-release-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.2); }

        /* ── table ── */
        .pr-table-wrap {
          overflow-x: auto;
        }
        .pr-table {
          width: 100%;
          border-collapse: collapse;
          font-size: .875rem;
        }
        .pr-table thead th {
          background: #f8fafc;
          color: var(--text-2);
          font-weight: 600;
          font-size: .75rem;
          text-transform: uppercase;
          letter-spacing: .5px;
          padding: 12px 16px;
          text-align: left;
          border-bottom: 2px solid var(--border);
          white-space: nowrap;
        }
        .pr-table thead th:first-child { padding-left: 24px; }
        .pr-table thead th:last-child  { padding-right: 24px; }

        .pr-table tbody tr {
          border-bottom: 1px solid var(--border);
          transition: background .12s;
        }
        .pr-table tbody tr:last-child { border-bottom: none; }
        .pr-table tbody tr:hover { background: #f8fffe; }
        .pr-table tbody tr.is-selected { background: #ecfdf5; }

        .pr-table td {
          padding: 14px 16px;
          color: var(--text-1);
          vertical-align: middle;
        }
        .pr-table td:first-child { padding-left: 24px; }
        .pr-table td:last-child  { padding-right: 24px; }

        /* custom checkbox */
        .pr-checkbox {
          width: 18px; height: 18px;
          border-radius: 5px;
          border: 2px solid var(--border);
          cursor: pointer;
          appearance: none;
          position: relative;
          transition: background .15s, border-color .15s;
          flex-shrink: 0;
        }
        .pr-checkbox:checked {
          background: var(--green-1);
          border-color: var(--green-1);
        }
        .pr-checkbox:checked::after {
          content: '';
          position: absolute;
          left: 4px; top: 1px;
          width: 6px; height: 9px;
          border: 2px solid #fff;
          border-top: none; border-left: none;
          transform: rotate(45deg);
        }
        .pr-checkbox:indeterminate {
          background: var(--green-1);
          border-color: var(--green-1);
        }
        .pr-checkbox:indeterminate::after {
          content: '';
          position: absolute;
          left: 3px; top: 6px;
          width: 8px; height: 2px;
          background: #fff;
        }
        .pr-checkbox:focus { outline: none; box-shadow: 0 0 0 3px rgba(5,150,105,.2); }

        /* emp cell */
        .emp-name { font-weight: 600; color: var(--text-1); }
        .emp-code {
          font-size: .75rem;
          color: var(--text-3);
          background: #f1f5f9;
          border-radius: 4px;
          padding: 1px 6px;
          display: inline-block;
          margin-top: 2px;
        }

        /* amount cells */
        .amount-main { font-weight: 600; }
        .amount-sub  { font-size: .75rem; color: var(--text-3); margin-top: 2px; }
        .amount--red   { color: var(--red-1); }
        .amount--green { color: var(--green-1); }

        /* advance badge */
        .adv-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--amber-2);
          color: var(--amber-1);
          border-radius: 20px;
          padding: 2px 8px;
          font-size: .72rem;
          font-weight: 600;
        }

        /* bank cell */
        .bank-cell { font-size: .8rem; color: var(--text-2); max-width: 180px; word-break: break-word; }
        .no-bank {
          color: var(--red-1);
          font-size: .78rem;
          display: flex; align-items: center; gap: 4px;
        }

        /* empty / loading */
        .pr-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-3);
        }
        .pr-empty svg { margin: 0 auto 12px; display: block; }
        .pr-empty p  { font-size: 1rem; color: var(--text-2); margin-bottom: 4px; }
        .pr-empty small { font-size: .82rem; }
        .pr-loading {
          text-align: center;
          padding: 60px 20px;
        }

        /* skeleton */
        .skel {
          background: linear-gradient(90deg, #e2e8f0 25%, #f0f4f8 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 6px;
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .skel--title  { height: 24px; width: 200px; margin-bottom: 8px; }
        .skel--sub    { height: 14px; width: 280px; }
        .skel--label  { height: 12px; width: 80px; margin-bottom: 8px; }
        .skel--value  { height: 28px; width: 100px; }
        .skel--cell   { height: 14px; border-radius: 4px; }
        .pr-row-skel {
          display: grid;
          grid-template-columns: 40px 1fr 1fr 1fr 1fr 1fr 1fr;
          gap: 12px;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
        }

        /* ── modal ── */
        .pr-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.45);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn .15s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        .pr-modal {
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow-lg);
          width: 100%;
          max-width: 480px;
          animation: popIn .2s ease;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)  translateY(0); }
        }
        .pr-modal-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .pr-modal-title { font-size: 1.1rem; font-weight: 700; color: var(--text-1); display: flex; align-items: center; gap: 8px; }
        .pr-modal-close {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          color: var(--text-2);
          transition: background .15s;
          display: flex;
        }
        .pr-modal-close:hover { background: var(--red-2); color: var(--red-1); }

        .pr-modal-body { padding: 20px 24px; }
        .pr-summary-box {
          background: var(--green-2);
          border: 1px solid #6ee7b7;
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          margin-bottom: 20px;
          display: flex; align-items: center; gap: 12px;
        }
        .pr-summary-box svg { flex-shrink: 0; color: var(--green-1); }
        .pr-summary-box strong { color: #064e3b; font-size: .9rem; }
        .pr-summary-box span  { color: var(--green-1); font-size: .82rem; }

        .pr-field { margin-bottom: 16px; }
        .pr-label {
          display: block;
          font-size: .8rem;
          font-weight: 600;
          color: var(--text-2);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: .4px;
        }
        .pr-input, .pr-select-full, .pr-textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 9px 12px;
          font-size: .875rem;
          color: var(--text-1);
          transition: border-color .2s, box-shadow .2s;
        }
        .pr-input:focus, .pr-select-full:focus, .pr-textarea:focus {
          outline: none;
          border-color: var(--green-1);
          box-shadow: 0 0 0 3px rgba(5,150,105,.12);
        }
        .pr-select-full {
          appearance: none;
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center;
        }
        .pr-textarea { resize: vertical; min-height: 80px; }

        .pr-modal-footer {
          padding: 16px 24px 20px;
          border-top: 1px solid var(--border);
          display: flex; gap: 10px; justify-content: flex-end;
        }
        .pr-btn-cancel {
          background: #f1f5f9;
          color: var(--text-1);
          border: none;
          border-radius: var(--radius-sm);
          padding: 9px 20px;
          font-weight: 600;
          font-size: .875rem;
          cursor: pointer;
          transition: background .15s;
        }
        .pr-btn-cancel:hover:not(:disabled) { background: var(--border); }
        .pr-btn-cancel:disabled { opacity: .5; cursor: not-allowed; }

        .pr-btn-confirm {
          background: var(--green-1);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          padding: 9px 22px;
          font-weight: 700;
          font-size: .875rem;
          cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: background .15s, transform .15s;
        }
        .pr-btn-confirm:hover:not(:disabled) { background: #047857; transform: translateY(-1px); }
        .pr-btn-confirm:disabled { opacity: .6; cursor: not-allowed; transform: none; }
      `}</style>

      <div className="pr-page">
        <div className="pr-card">

          {/* ── Header ── */}
          <div className="pr-header">
            <div className="pr-header-row">
              <div className="pr-header-left">
                <div className="pr-icon-wrap">
                  <CreditCard size={28} color="#fff" />
                </div>
                <div>
                  <h1 className="pr-title">Payment Release</h1>
                  <p className="pr-subtitle">Bulk salary disbursement with advance deductions</p>
                </div>
              </div>
              <button className="pr-refresh-btn" onClick={fetchData} disabled={loading}>
                {loading
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <ArrowUpRight size={14} />
                }
                Refresh
              </button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="pr-stat-grid">
            {[
              { label:'Pending Employees', value: stats.totalEmployees, icon:<Users size={22}/>, cls:'stat--green' },
              { label:'Total Net Salary',  value:`₹${fmt(stats.totalNetSalary)}`, icon:<IndianRupee size={22}/>, cls:'stat--blue' },
              { label:'Total Advances',    value:`₹${fmt(stats.totalAdvances)}`,  icon:<AlertCircle size={22}/>, cls:'stat--amber' },
              { label:'Final Payable',     value:`₹${fmt(stats.finalTotal)}`,     icon:<Banknote size={22}/>,    cls:'stat--purple' }
            ].map(s => (
              <div key={s.label} className={`pr-stat-card ${s.cls}`}>
                <div>
                  <div className="pr-stat-label">{s.label}</div>
                  <div className="pr-stat-value">{s.value}</div>
                </div>
                <div className="pr-stat-icon">{s.icon}</div>
              </div>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div className="pr-toolbar">
            <select className="pr-select" value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}>
              {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <select className="pr-select" value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="pr-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search by name / code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="pr-sel-btns">
              <button className="pr-txt-btn pr-txt-btn--green" onClick={() => {
                setSelected(prev => {
                  const next = new Set(prev);
                  filtered.forEach(r => next.add(r.employee_id));
                  return next;
                });
              }}>Select All</button>
              <button className="pr-txt-btn pr-txt-btn--red" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
          </div>

          {/* ── Selection Bar ── */}
          {selected.size > 0 && (
            <div style={{ padding: '12px 24px 0' }}>
              <div className="pr-sel-bar">
                <div className="pr-sel-bar-info">
                  <strong>{selected.size}</strong> employee{selected.size > 1 ? 's' : ''} selected
                  &nbsp;·&nbsp;
                  Total: <strong>₹{fmt(selectedTotal)}</strong>
                </div>
                <button className="pr-release-btn" onClick={() => setModal(true)}>
                  <Zap size={16} /> Release Payments
                </button>
              </div>
            </div>
          )}

          {/* ── Table ── */}
          <div style={{ padding: '16px 0 0' }}>
            <div className="pr-table-wrap">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        className="pr-checkbox"
                        checked={isAllSelected}
                        ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={toggleAll}
                      />
                    </th>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Net Salary</th>
                    <th>Advances</th>
                    <th>Final Amount</th>
                    <th>Bank Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="pr-loading">
                          <Loader2 size={32} color="var(--green-1)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', display: 'block' }} />
                          <span style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>Loading salary records…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="pr-empty">
                          <CheckCircle2 size={40} color="var(--border)" />
                          <p>No pending salaries</p>
                          <small>{MONTHS[selectedMonth-1]} {selectedYear} ke liye koi pending record nahi hai</small>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map(row => (
                      <tr
                        key={row.id}
                        className={selected.has(row.employee_id) ? 'is-selected' : ''}
                        onClick={() => toggle(row.employee_id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="pr-checkbox"
                            checked={selected.has(row.employee_id)}
                            onChange={() => toggle(row.employee_id)}
                          />
                        </td>
                        <td>
                          <div className="emp-name">{row.employee_name}</div>
                          {row.emp_code && <span className="emp-code">{row.emp_code}</span>}
                        </td>
                        <td style={{ color: 'var(--text-2)' }}>
                          {MONTHS[row.month-1]} {row.year}
                        </td>
                        <td>
                          <div className="amount-main">₹{fmt(row.net_salary)}</div>
                        </td>
                        <td>
                          {row.totalAdvanceAmount > 0 ? (
                            <>
                              <div className="amount-main amount--red">₹{fmt(row.totalAdvanceAmount)}</div>
                              <span className="adv-badge" style={{ marginTop: 4 }}>
                                <AlertCircle size={10} />
                                {row.advances.length} advance{row.advances.length > 1 ? 's' : ''}
                              </span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="amount-main amount--green" style={{ fontSize: '1rem' }}>
                            ₹{fmt(row.finalNetSalary)}
                          </div>
                        </td>
                        <td>
                          {row.account_details
                            ? <div className="bank-cell">{row.account_details}</div>
                            : <span className="no-bank"><AlertCircle size={12} /> No bank details</span>
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Release Modal ── */}
      {modal && (
        <div className="pr-overlay" onClick={e => { if (e.target === e.currentTarget && !releasing) setModal(false); }}>
          <div className="pr-modal">
            <div className="pr-modal-header">
              <div className="pr-modal-title">
                <Zap size={18} color="var(--green-1)" /> Confirm Payment Release
              </div>
              <button className="pr-modal-close" onClick={() => !releasing && setModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="pr-modal-body">
              <div className="pr-summary-box">
                <CheckCircle2 size={22} />
                <div>
                  <strong>{selected.size} employee{selected.size > 1 ? 's' : ''} — ₹{fmt(selectedTotal)}</strong><br />
                  <span>{MONTHS[selectedMonth-1]} {selectedYear} salary release</span>
                </div>
              </div>

              <div className="pr-field">
                <label className="pr-label">Payment Date</label>
                <input
                  type="date"
                  className="pr-input"
                  value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                />
              </div>

              <div className="pr-field">
                <label className="pr-label">Payment Method</label>
                <select
                  className="pr-select-full"
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="pr-field" style={{ marginBottom: 0 }}>
                <label className="pr-label">Remarks (Optional)</label>
                <textarea
                  className="pr-textarea"
                  value={form.remarks}
                  onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder="Any notes for this payment batch…"
                />
              </div>
            </div>

            <div className="pr-modal-footer">
              <button className="pr-btn-cancel" disabled={releasing} onClick={() => setModal(false)}>
                Cancel
              </button>
              <button className="pr-btn-confirm" disabled={releasing} onClick={releasePayments}>
                {releasing
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                  : <><Zap size={15} /> Release Payments</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

export default function PaymentRelease() {
  return (
    <Suspense fallback={<Skeleton />}>
      <PaymentReleaseContent />
    </Suspense>
  );
}