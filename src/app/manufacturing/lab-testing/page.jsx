// src/app/manufacturing/lab-testing/page.js
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { FaFlask, FaPlus, FaSearch, FaSpinner, FaEdit } from 'react-icons/fa';
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";

function LabTestingContent() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({
    batch_id: '', test_method: '', test_date: new Date().toISOString().split('T')[0],
    tested_by: '', parameters: '', result_value: '', result_status: 'pending', remarks: ''
  });

  useEffect(() => { fetchTests(); fetchBatches(); }, [search, filterStatus]);

  const fetchTests = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('result_status', filterStatus);
      const res = await fetch(`/api/manufacturing/lab-testing?${params}`);
      const data = await res.json();
      if (data.success) setTests(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/manufacturing/process');
      const data = await res.json();
      if (data.success) setBatches(data.data);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!form.batch_id || !form.test_method) return alert('Batch and test method required');
    setSaving(true);
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, result_value: form.result_value, result_status: form.result_status, remarks: form.remarks, parameters: form.parameters } : form;
      const res = await fetch('/api/manufacturing/lab-testing', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setShowModal(false); setEditItem(null);
        setForm({ batch_id: '', test_method: '', test_date: new Date().toISOString().split('T')[0], tested_by: '', parameters: '', result_value: '', result_status: 'pending', remarks: '' });
        fetchTests();
      } else alert(data.error);
    } catch (err) { alert('Error saving'); }
    finally { setSaving(false); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ batch_id: item.batch_id, test_method: item.test_method, test_date: item.test_date, tested_by: item.tested_by || '', parameters: item.parameters || '', result_value: item.result_value || '', result_status: item.result_status, remarks: item.remarks || '' });
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      pass: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800',
      retest: 'bg-blue-100 text-blue-800',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status?.replace('_', ' ').toUpperCase()}</span>;
  };

  const testMethods = ['ASTM D4294', 'ASTM D445', 'ASTM D93', 'ASTM D1298', 'ASTM D97', 'IS 1460', 'IS 2796', 'Visual Inspection', 'Color Test', 'Density Test', 'Viscosity Test', 'Flash Point Test', 'Pour Point Test', 'Sulfur Content', 'Water Content', 'Other'];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <FaFlask className="text-2xl" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Lab Testing</h1>
                    <p className="text-xs text-purple-100 mt-0.5">Manage quality control and batch tests</p>
                  </div>
                </div>
                <button onClick={() => { setEditItem(null); setForm({ batch_id: '', test_method: '', test_date: new Date().toISOString().split('T')[0], tested_by: '', parameters: '', result_value: '', result_status: 'pending', remarks: '' }); setShowModal(true); }}
                  className="bg-white text-purple-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2 text-sm shadow-md">
                  <FaPlus /> New Test
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Search test code, method, batch..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm" />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm min-w-[180px]">
                <option value="">All Results</option>
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="retest">Retest</option>
              </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Tests', value: tests.length, color: 'text-purple-600', bg: 'bg-purple-100' },
                { label: 'Pending', value: tests.filter(t => t.result_status === 'pending').length, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                { label: 'Passed', value: tests.filter(t => t.result_status === 'pass').length, color: 'text-green-600', bg: 'bg-green-100' },
                { label: 'Failed', value: tests.filter(t => t.result_status === 'fail').length, color: 'text-red-600', bg: 'bg-red-100' },
              ].map((c, i) => (
                <div key={i} className="bg-white border rounded-xl p-4 shadow-sm text-center">
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  <div className="text-xs font-medium text-gray-500 mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {loading ? (
                <div className="p-12 text-center"><FaSpinner className="animate-spin text-purple-600 text-3xl mx-auto" /></div>
              ) : tests.length > 0 ? tests.map(t => (
                <div key={t.id} className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-sm font-bold text-purple-600">{t.test_code}</span>
                      <h3 className="font-semibold text-gray-800 mt-1">{t.test_method}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(t.result_status)}
                      <button onClick={() => openEdit(t)} className="bg-purple-50 text-purple-600 hover:bg-purple-100 p-2 rounded-lg transition">
                        <FaEdit className="text-xs" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                    <div><span className="font-medium text-gray-700">Batch:</span> {t.batch_code}</div>
                    <div><span className="font-medium text-gray-700">Product:</span> {t.product_name || '-'}</div>
                    <div><span className="font-medium text-gray-700">Date:</span> {t.test_date ? new Date(t.test_date).toLocaleDateString('en-IN') : '-'}</div>
                    <div><span className="font-medium text-gray-700">Tested By:</span> {t.tested_by || '-'}</div>
                  </div>
                  {t.result_value && (
                    <div className="text-xs">
                      <span className="font-medium text-gray-700">Result:</span> 
                      <span className="font-semibold text-gray-900 ml-1">{t.result_value}</span>
                    </div>
                  )}
                </div>
              )) : (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">No lab tests found. Click "New Test" to create one.</div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white rounded-xl border shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 flex justify-center"><FaSpinner className="animate-spin text-purple-600 text-4xl" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Test Code', 'Batch', 'Product', 'Method', 'Date', 'Tested By', 'Result', 'Status', 'Actions'].map(h => (
                          <th key={h} className="p-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {tests.length > 0 ? tests.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition">
                          <td className="p-3 font-semibold text-purple-600 whitespace-nowrap">{t.test_code}</td>
                          <td className="p-3 font-medium text-gray-900 whitespace-nowrap">{t.batch_code}</td>
                          <td className="p-3 text-gray-600 whitespace-nowrap">{t.product_name || '-'}</td>
                          <td className="p-3 font-medium text-gray-800 whitespace-nowrap">{t.test_method}</td>
                          <td className="p-3 text-gray-500 whitespace-nowrap">{t.test_date ? new Date(t.test_date).toLocaleDateString('en-IN') : '-'}</td>
                          <td className="p-3 text-gray-600 whitespace-nowrap">{t.tested_by || '-'}</td>
                          <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">{t.result_value || '-'}</td>
                          <td className="p-3 whitespace-nowrap">{getStatusBadge(t.result_status)}</td>
                          <td className="p-3 whitespace-nowrap">
                            <button onClick={() => openEdit(t)} className="bg-purple-50 text-purple-600 hover:bg-purple-100 p-2 rounded-lg transition">
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={9} className="p-8 text-center text-gray-400">No lab tests found. Click "New Test" to create one.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Modal - similar structure as before */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{editItem ? 'Update Test Result' : 'Create Lab Test'}</h2>
            <div className="space-y-4">
              {!editItem && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                    <select value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm">
                      <option value="">Select Batch</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code} - {b.product_name} ({b.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Method *</label>
                    <select value={form.test_method} onChange={e => setForm({ ...form, test_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm">
                      <option value="">Select Method</option>
                      {testMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Test Date</label>
                      <input type="date" value={form.test_date} onChange={e => setForm({ ...form, test_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tested By</label>
                      <input value={form.tested_by} onChange={e => setForm({ ...form, tested_by: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parameters / Specifications</label>
                <textarea value={form.parameters} onChange={e => setForm({ ...form, parameters: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result Value</label>
                  <input value={form.result_value} onChange={e => setForm({ ...form, result_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result Status</label>
                  <select value={form.result_status} onChange={e => setForm({ ...form, result_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm">
                    <option value="pending">Pending</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="retest">Retest</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 text-sm">
                {saving ? 'Saving...' : editItem ? 'Update' : 'Create Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <FaSpinner className="animate-spin text-purple-500 text-4xl" />
    </div>
  );
}

export default function LabTestingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LabTestingContent />
    </Suspense>
  );
}