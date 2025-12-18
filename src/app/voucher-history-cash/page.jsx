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
  const [vehicle, setVehicle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [logModal, setLogModal] = useState({ open: false, voucherId: null, rows: [] });

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
    if (opts.vehicle ?? vehicle) params.set('vehicle_no', opts.vehicle ?? vehicle);
    if (opts.from ?? from) params.set('from', opts.from ?? from);
    if (opts.to ?? to) params.set('to', opts.to ?? to);
    return '/api/voucher-history-cash?' + params.toString();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(buildUrl());
      const data = await res.json();
      if (data.success) setRows(data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
    <div className="flex h-screen bg-gray-50">
      {/* Fixed Sidebar like other pages */}
      <div className="fixed left-0 top-0 h-screen w-64 z-30">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col ml-64">
        <div className="fixed top-0 right-0 left-64 z-20">
          <Header />
        </div>

        <main className="flex-1 p-4 mt-16 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 flex flex-col md:flex-row gap-2 md:gap-3 items-stretch md:items-center">
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search item, voucher no or employee" className="border px-3 py-2 rounded w-full md:w-72 text-sm" />
              <select value={empId} onChange={e=>setEmpId(e.target.value)} className="border px-3 py-2 rounded w-full md:w-auto text-sm">
                <option value="">All Employees</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              <input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="Vehicle No" className="border px-3 py-2 rounded w-full md:w-40 text-sm" />
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border px-3 py-2 rounded w-full md:w-auto text-sm" />
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border px-3 py-2 rounded w-full md:w-auto text-sm" />
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={fetchData} className="flex-1 md:flex-none bg-blue-600 text-white px-3 md:px-4 py-2 rounded text-sm font-medium">Filter</button>
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

            <div className="bg-white rounded shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">#</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Voucher</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Date</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Employee</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap">Vehicle</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap hidden md:table-cell">Driver</th>
                    <th className="px-2 md:px-4 py-2 text-left whitespace-nowrap hidden lg:table-cell">Item</th>
                    <th className="px-2 md:px-4 py-2 text-right whitespace-nowrap">Amount</th>
                    <th className="px-2 md:px-4 py-2 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="p-6 text-center">Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={9} className="p-6 text-center">No records</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={`${r.history_id}-${i}`} className={i%2? 'bg-gray-50':''}>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{i+1}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm font-medium">{r.voucher_no}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{r.exp_date ? new Date(r.exp_date).toLocaleDateString('en-IN') : ''}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{r.emp_name || r.emp_id}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{r.vehicle_no}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm hidden md:table-cell">{r.driver_name || ''}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm hidden lg:table-cell">{r.item_details || r.history_type}</td>
                      <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-right font-medium">₹{parseFloat(r.history_amount||0).toFixed(2)}</td>
                      <td className="px-2 md:px-4 py-2 text-center">
                        <button onClick={()=>openLog(r.voucher_id)} className="text-sm text-blue-600 underline">View Log</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
        {/* Log Modal */}
        {logModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-2xl overflow-auto max-h-[80vh]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Voucher Log - {logModal.voucherId}</h3>
                <button onClick={closeLog} className="text-gray-600">Close</button>
              </div>
              <div>
                {logModal.rows.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No log entries</div>
                ) : (
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
                        <tr key={lr.id} className={idx%2? 'bg-gray-50':''}>
                          <td className="px-3 py-2">{idx+1}</td>
                          <td className="px-3 py-2">{lr.type}</td>
                          <td className="px-3 py-2">{lr.user_name || lr.user_id}</td>
                          <td className="px-3 py-2">₹{parseFloat(lr.amount||0).toFixed(2)}</td>
                          <td className="px-3 py-2">{lr.created_at ? new Date(lr.created_at).toLocaleString('en-IN') : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
