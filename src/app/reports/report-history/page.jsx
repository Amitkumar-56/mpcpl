// src/app/reports/report-history/page.jsx
'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function FillingReport() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    product: '',
    loading_station: '',
    customer: '',
    from_date: '',
    to_date: ''
  });
  const [records, setRecords] = useState([]);
  const [checkedRecords, setCheckedRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalQty: 0,
    totalAmount: 0,
    totalRecords: 0
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 100;

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/filling-requests', {
        params: { ...filters, page, limit }
      });
      setRecords(data.records || []);
      setSummary(data.summary || {
        totalQty: 0,
        totalAmount: 0,
        totalRecords: 0
      });
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching data:', err);
      setRecords([]);
      setSummary({
        totalQty: 0,
        totalAmount: 0,
        totalRecords: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, page]);

  // Handle checkbox toggle
  const handleCheck = async (id) => {
    const isChecked = checkedRecords.includes(id);
    const newChecked = isChecked
      ? checkedRecords.filter((x) => x !== id)
      : [...checkedRecords, id];
    setCheckedRecords(newChecked);

    try {
      await axios.post('/api/update-check-status', { record_id: id, is_checked: !isChecked });
    } catch (err) {
      console.error('Error updating check status:', err);
    }
  };

  // Select All toggle
  const handleSelectAll = () => {
    if (checkedRecords.length === records.length) {
      setCheckedRecords([]);
    } else {
      setCheckedRecords(records.map((r) => r.id));
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      const query = new URLSearchParams(filters).toString();
      window.location.href = `/api/filling-requests/export?${query}`;
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Error exporting data');
    }
  };

  // Reset filters
  const handleReset = () => {
    setFilters({
      product: '',
      loading_station: '',
      customer: '',
      from_date: '',
      to_date: ''
    });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Filling Report
            </h1>
            <p className="text-gray-600 mt-2">View and manage all filling requests and their status</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                checkedRecords.length > 0 
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={() => {
                if (checkedRecords.length > 0) {
                  const query = checkedRecords.join(',');
                  router.push(`/checked-records?checked_ids=${query}`);
                }
              }}
              disabled={checkedRecords.length === 0}
            >
              View Checked Records ({checkedRecords.length})
            </button>
            <button
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
              onClick={handleExport}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Product"
            className="border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
          />
          <input
            type="text"
            placeholder="Loading Station"
            className="border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
            value={filters.loading_station}
            onChange={(e) => setFilters({ ...filters, loading_station: e.target.value })}
          />
          <input
            type="text"
            placeholder="Customer"
            className="border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
            value={filters.customer}
            onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
          />
          <input
            type="date"
            className="border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
            value={filters.from_date}
            onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
          />
          <input
            type="date"
            className="border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
            value={filters.to_date}
            onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
              onClick={fetchData}
            >
              Apply
            </button>
            <button
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
          <h2 className="font-bold text-lg mb-2">Total Quantity</h2>
          <p className="text-3xl font-bold">{summary.totalQty.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
          <h2 className="font-bold text-lg mb-2">Total Amount</h2>
          <p className="text-3xl font-bold">₹{summary.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
          <h2 className="font-bold text-lg mb-2">Total Records</h2>
          <p className="text-3xl font-bold">{summary.totalRecords.toLocaleString()}</p>
        </div>
      </div>

      {/* Select All */}
      <div className="mb-4 bg-white rounded-2xl shadow-lg p-4">
        <label className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            checked={checkedRecords.length === records.length && records.length > 0}
            onChange={handleSelectAll}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="font-semibold text-gray-700">
            Select All ({records.length} records on this page)
          </span>
        </label>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center p-8 bg-white rounded-2xl shadow-lg mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-blue-600 font-medium">Loading records...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Select</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Request ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Loading Station</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Images</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="px-6 py-8 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={checkedRecords.includes(r.id)}
                          onChange={() => handleCheck(r.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-6 py-4 text-sm font-mono text-blue-600 font-bold">{r.rid}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.product_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.station_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.vehicle_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.client_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.driver_number}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{r.aqty}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-600">₹{r.amount || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(r.created).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{r.completed_date ? new Date(r.completed_date).toLocaleString() : '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {['doc1', 'doc2', 'doc3'].map((imgKey) => (
                            <a 
                              key={imgKey} 
                              href={r[imgKey] || '/assets/img/placeholder.png'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="transform hover:scale-110 transition-transform duration-200"
                            >
                              <img
                                src={r[imgKey] || '/assets/img/placeholder.png'}
                                alt="Document"
                                className="w-12 h-12 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors duration-200"
                              />
                            </a>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          r.status === 'Pending' 
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                            : r.status === 'Cancelled' 
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : r.status === 'Processing' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-4 py-2 rounded-lg text-sm min-w-[44px] font-medium transition-all ${
                  page === pageNum 
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}