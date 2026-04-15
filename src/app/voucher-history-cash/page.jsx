'use client';

import ExportButton from '@/components/ExportButton';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useEffect, useState } from 'react';

export default function VoucherHistoryCash() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [empId, setEmpId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [logModal, setLogModal] = useState({ open: false, voucherId: null, rows: [] });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    limit: 10,
    has_next: false,
    has_prev: false
  });

  useEffect(() => {
    fetchEmployees();
    fetchData();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/get-employees');
      const data = await res.json();
      // API returns { employees: [...] }
      if (data && Array.isArray(data.employees)) setEmployees(data.employees);
    } catch (e) {
      // ignore
    }
  };

  const buildUrl = (opts = {}) => {
    const params = new URLSearchParams();
    params.set('q', opts.q ?? q);
    if (opts.empId ?? empId) params.set('emp_id', opts.empId ?? empId);
    if (opts.from ?? from) params.set('from', opts.from ?? from);
    if (opts.to ?? to) params.set('to', opts.to ?? to);
    params.set('page', opts.page ?? pagination.current_page);
    params.set('limit', opts.limit ?? pagination.limit);
    return '/api/voucher-history-cash?' + params.toString();
  };

  const fetchData = async (targetPage = 1) => {
    try {
      setLoading(true);
      const res = await fetch(buildUrl({ page: targetPage }));
      const data = await res.json();
      if (data.success) {
        setRows(data.rows || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setQ('');
    setEmpId('');
    setFrom('');
    setTo('');
    fetchData(1);
  };

  const openLog = async (voucherId) => {
    try {
      setLogModal({ open: true, voucherId, rows: [] });
      const res = await fetch(`/api/voucher-log?voucher_id=${voucherId}`);
      const data = await res.json();
      if (data.success) setLogModal({ open: true, voucherId, rows: data.rows || [] });
      else setLogModal({ open: true, voucherId, rows: [] });
    } catch (e) {
      setLogModal({ open: true, voucherId, rows: [] });
    }
  };

  const closeLog = () => setLogModal({ open: false, voucherId: null, rows: [] });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Fixed Sidebar like other pages */}
      <div className="fixed left-0 top-0 h-screen w-64 z-30">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col ml-64">
        <div className="fixed top-0 right-0 left-64 z-20">
          <Header />
        </div>

        <main className="flex-1 p-4 mt-32 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 flex flex-col gap-3">
              {/* Search Input */}
              <div className="relative">
                <input 
                  value={q} 
                  onChange={e => setQ(e.target.value)} 
                  placeholder="Search item, voucher no or employee" 
                  className="border px-3 py-2.5 pr-10 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={empId} onChange={e => setEmpId(e.target.value)} className="border px-3 py-2.5 rounded-lg w-full sm:w-auto text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Employees</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border px-3 py-2.5 rounded-lg w-full sm:w-auto text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border px-3 py-2.5 rounded-lg w-full sm:w-auto text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => fetchData(1)} className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Filter</button>
                <button onClick={resetFilters} className="flex-1 sm:flex-none bg-gray-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-600 transition">Clear</button>
                <ExportButton
                  data={rows}
                  fileName={`voucher_history_cash_${new Date().toISOString().split('T')[0]}`}
                  columns={[
                    { field: 'voucher_no', header: 'Voucher No' },
                    { field: 'exp_date', header: 'Date', formatter: (row) => row.exp_date ? new Date(row.exp_date).toLocaleDateString('en-IN') : '' },
                    { field: 'emp_name', header: 'Employee', formatter: (row) => row.emp_name || row.emp_id },
                    { field: 'vehicle_no', header: 'Vehicle No' },
                    { field: 'driver_name', header: 'Driver' },
                    { field: 'item_details', header: 'Item', formatter: (row) => row.item_details || row.history_type },
                    { field: 'history_amount', header: 'Amount', formatter: (row) => parseFloat(row.history_amount || 0).toFixed(2) }
                  ]}
                />
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {loading ? (
                <div className="bg-white rounded-lg p-6 text-center">Loading...</div>
              ) : rows.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center text-gray-500">No records</div>
              ) : rows.map((r, i) => (
                <div key={`${r.history_id}-${i}`} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-gray-500">#{i + 1}</span>
                      <h3 className="font-semibold text-gray-800">{r.voucher_no}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">₹{parseFloat(r.history_amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{r.exp_date ? new Date(r.exp_date).toLocaleDateString('en-IN') : ''}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Employee:</span>
                      <span className="font-medium">{r.emp_name || r.emp_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vehicle:</span>
                      <span className="font-medium">{r.vehicle_no}</span>
                    </div>
                    {r.driver_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Driver:</span>
                        <span className="font-medium">{r.driver_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Item:</span>
                      <span className="font-medium">{r.item_details || r.history_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">#</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Voucher</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Date</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Employee</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Vehicle</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Driver</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Item</th>
                    <th className="px-2 md:px-4 py-2 text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="p-6 text-center">Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center">No records</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={`${r.history_id}-${i}`} className={i % 2 ? 'bg-gray-50' : ''}>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{i + 1}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm font-medium">{r.voucher_no}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{r.exp_date ? new Date(r.exp_date).toLocaleDateString('en-IN') : ''}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{r.emp_name || r.emp_id}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{r.vehicle_no}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{r.driver_name || ''}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{r.item_details || r.history_type}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-right font-medium">₹{parseFloat(r.history_amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="bg-white rounded shadow p-3 mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.current_page - 1) * pagination.limit) + 1} to {Math.min(pagination.current_page * pagination.limit, pagination.total_records)} of {pagination.total_records} records
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchData(pagination.current_page - 1)}
                    disabled={!pagination.has_prev}
                    className="px-3 py-1 border rounded disabled:opacity-50 text-sm hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  {[...Array(pagination.total_pages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => fetchData(i + 1)}
                      className={`px-3 py-1 border rounded text-sm ${pagination.current_page === i + 1 ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
                    >
                      {i + 1}
                    </button>
                  )).slice(Math.max(0, pagination.current_page - 3), Math.min(pagination.total_pages, pagination.current_page + 2))}
                  <button
                    onClick={() => fetchData(pagination.current_page + 1)}
                    disabled={!pagination.has_next}
                    className="px-3 py-1 border rounded disabled:opacity-50 text-sm hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        {/* Log Modal */}
        {logModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Voucher Log - {logModal.voucherId}</h3>
                <button onClick={closeLog} className="text-gray-600 hover:text-gray-800 p-1 hover:bg-gray-100 rounded transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                {logModal.rows.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No log entries</div>
                ) : (
                  <div className="block sm:hidden space-y-3">
                    {logModal.rows.map((lr, idx) => (
                      <div key={lr.id} className="bg-gray-50 rounded-lg p-3 border">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-500">#{idx + 1}</span>
                          <span className="text-xs font-semibold text-blue-600">{lr.type}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">User:</span>
                            <span className="font-medium">{lr.user_name || lr.user_id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Amount:</span>
                            <span className="font-medium">₹{parseFloat(lr.amount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">When:</span>
                            <span className="font-medium">{lr.created_at ? new Date(lr.created_at).toLocaleString('en-IN') : ''}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="hidden sm:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm">#</th>
                        <th className="px-3 py-2 text-left text-sm">Action</th>
                        <th className="px-3 py-2 text-left text-sm">User</th>
                        <th className="px-3 py-2 text-left text-sm">Amount</th>
                        <th className="px-3 py-2 text-left text-sm">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logModal.rows.map((lr, idx) => (
                        <tr key={lr.id} className={idx % 2 ? 'bg-gray-50' : ''}>
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">{lr.type}</td>
                          <td className="px-3 py-2">{lr.user_name || lr.user_id}</td>
                          <td className="px-3 py-2">₹{parseFloat(lr.amount || 0).toFixed(2)}</td>
                          <td className="px-3 py-2">{lr.created_at ? new Date(lr.created_at).toLocaleString('en-IN') : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
