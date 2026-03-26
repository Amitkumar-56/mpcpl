// src/app/salary-management/page.jsx
'use client';
import { AlertCircle, Calendar, CalendarDays, CheckCircle, Clock, DollarSign, Download, Edit2, Plus, Search, Users, X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Loading skeleton component
function SalaryManagementSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="h-10 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-5 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-gray-50 h-12"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-t border-gray-200">
              <div className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main component
function SalaryManagementContent() {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [advancesData, setAdvancesData] = useState([]);
  const [showAdvanceDetails, setShowAdvanceDetails] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [editForm, setEditForm] = useState({
    tds_deduction: 0,
    advance_deduction: 0,
    status: 'pending'
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
    fetchAdvancesData();
  }, [selectedMonth, selectedYear]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/salary?month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();

      if (data.success) {
        setSalaries(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch salaries');
        setSalaries([]);
      }
    } catch (error) {
      console.error('Salary fetch error:', error);
      toast.error('Error fetching salaries');
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvancesData = async () => {
    try {
      const response = await fetch('/api/advances');
      const data = await response.json();
      if (data.success) {
        setAdvancesData(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching advances:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/get-employees');
      const data = await response.json();
      if (data.employees) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Employees fetch error:', error);
    }
  };

  // FIX 1: Correct API endpoint - /api/salary/attendance-summary
  const fetchAttendanceData = async (employeeId, month, year) => {
    try {
      const response = await fetch(
        `/api/salary/attendance-summary?employee_id=${employeeId}&month=${month}&year=${year}`
      );
      const data = await response.json();

      if (data.success) {
        setAttendanceData(data.data);
        setShowAttendanceModal(true);
      } else {
        toast.error(data.error || 'Failed to fetch attendance data');
      }
    } catch (error) {
      console.error('Attendance fetch error:', error);
      toast.error('Error fetching attendance data');
    }
  };

  const generateSalary = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    try {
      const response = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployee,
          month: selectedMonth,
          year: selectedYear
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Salary generated successfully');
        setShowGenerateModal(false);
        setSelectedEmployee('');
        fetchSalaries();
      } else {
        toast.error(data.error || 'Failed to generate salary');
      }
    } catch (error) {
      console.error('Generate salary error:', error);
      toast.error('Error generating salary');
    }
  };

  const updateSalary = async () => {
    if (!selectedSalary) return;

    try {
      const response = await fetch('/api/salary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSalary.id,
          tds_deduction: editForm.tds_deduction,
          advance_deduction: editForm.advance_deduction,
          status: editForm.status
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Salary updated successfully');
        setShowEditModal(false);
        setSelectedSalary(null);
        fetchSalaries();
      } else {
        toast.error(data.error || 'Failed to update salary');
      }
    } catch (error) {
      console.error('Update salary error:', error);
      toast.error('Error updating salary');
    }
  };

  // FIX 2: Correct API endpoint - /api/salary-payslip-simple
  const downloadPayslip = async (salaryId) => {
    try {
      setDownloadingId(salaryId);
      const response = await fetch(`/api/salary-payslip-simple?salary_id=${salaryId}`);
      const data = await response.json();

      if (data.success) {
        // Create blob and trigger download
        const blob = new Blob([data.payslip], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename || `payslip_${salaryId}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Payslip downloaded successfully');
      } else {
        toast.error(data.error || 'Failed to generate payslip');
      }
    } catch (error) {
      console.error('Download payslip error:', error);
      toast.error('Error downloading payslip');
    } finally {
      setDownloadingId(null);
    }
  };

  const openEditModal = (salary) => {
    setSelectedSalary(salary);
    setEditForm({
      tds_deduction: parseFloat(salary.tds_deduction) || 0,
      advance_deduction: parseFloat(salary.advance_deduction) || 0,
      status: salary.status || 'pending'
    });
    setShowEditModal(true);
  };

  const getEmployeeAdvances = (employeeId) => {
    return advancesData.filter(advance =>
      advance.employee_id === employeeId &&
      (advance.status === 'approved' || advance.status === 'pending')
    );
  };

  const getTotalAdvanceDeduction = (employeeId) => {
    const advances = getEmployeeAdvances(employeeId);
    return advances.reduce((total, advance) => total + parseFloat(advance.amount || 0), 0);
  };

  const filteredSalaries = salaries.filter(salary => {
    const matchesSearch =
      salary.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salary.emp_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || salary.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: salaries.length,
    pending: salaries.filter(s => s.status === 'pending').length,
    released: salaries.filter(s => s.status === 'released').length,
    totalAmount: salaries.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0),
    totalAdvances: advancesData.filter(a => a.status === 'approved' || a.status === 'pending').length,
    totalAdvanceAmount: advancesData
      .filter(a => a.status === 'approved' || a.status === 'pending')
      .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0)
  };

  const tableNotInitialized =
    salaries.length === 0 &&
    Array.isArray(salaries) === false ||
    (salaries.message && salaries.message?.includes('Salary table not initialized'));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Salary Management</h1>
        <p className="text-gray-600">Manage employee salaries, deductions, and payslips</p>
      </div>

      {/* Initialization Message */}
      {tableNotInitialized && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Salary System Not Initialized</h3>
              <p className="text-yellow-700 mb-4">
                The salary records table needs to be created before you can manage salaries.
              </p>
              <a
                href="/init-salary"
                className="inline-flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
              >
                <Calendar className="h-4 w-4" />
                Initialize Salary System
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Released</p>
              <p className="text-2xl font-bold text-green-600">{stats.released}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalAmount.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Advances</p>
              <p className="text-2xl font-bold text-orange-600">{stats.totalAdvances}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Advance Amount</p>
              <p className="text-2xl font-bold text-red-600">₹{stats.totalAdvanceAmount.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="released">Released</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Generate Salary
            </button>
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advances</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">Loading salary records...</p>
                  </td>
                </tr>
              ) : filteredSalaries.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No salary records found for {months[selectedMonth - 1]} {selectedYear}</p>
                    <button
                      onClick={() => setShowGenerateModal(true)}
                      className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Generate salary records
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSalaries.map((salary) => {
                  const employeeAdvances = getEmployeeAdvances(salary.employee_id);
                  const totalAdvanceAmount = getTotalAdvanceDeduction(salary.employee_id);

                  return (
                    <tr key={salary.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{salary.employee_name}</div>
                          <div className="text-xs text-gray-500">{salary.emp_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {months[salary.month - 1]} {salary.year}
                      </td>
                      {/* FIX 3: Attendance column now inline in table */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {parseFloat(salary.present_days || 0).toFixed(1)}
                          </span>
                          <span className="text-gray-400"> / {salary.total_days || '-'} days</span>
                        </div>
                        <button
                          onClick={() => fetchAttendanceData(salary.employee_id, salary.month, salary.year)}
                          className="text-purple-600 hover:text-purple-900 flex items-center gap-1 text-xs mt-1"
                          title="View Attendance Details"
                        >
                          <CalendarDays className="h-3 w-3" />
                          View Details
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(salary.basic_salary || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(salary.earned_salary || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {employeeAdvances.length > 0 ? (
                            <div>
                              <span className="font-medium text-orange-600">₹{totalAdvanceAmount.toFixed(2)}</span>
                              <div className="text-xs text-gray-500">{employeeAdvances.length} advance(s)</div>
                              <button
                                onClick={() => setShowAdvanceDetails({ employeeId: salary.employee_id, advances: employeeAdvances })}
                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                              >
                                View Details
                              </button>
                            </div>
                          ) : (
                            <span className="text-green-600 text-xs">No Advances</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>₹{parseFloat(salary.total_deduction || 0).toFixed(2)}</div>
                        <div className="text-xs text-gray-400">
                          PF: ₹{parseFloat(salary.pf_deduction || 0).toFixed(0)} |
                          ESI: ₹{parseFloat(salary.esi_deduction || 0).toFixed(0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ₹{parseFloat(salary.net_salary || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          salary.status === 'released'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {salary.status === 'released' ? '✓ Released' : 'Pending'}
                        </span>
                        {salary.release_date && (
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(salary.release_date).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3">
                          <button
                            onClick={() => openEditModal(salary)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            title="Edit Salary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => downloadPayslip(salary.id)}
                            disabled={downloadingId === salary.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 flex items-center gap-1"
                            title="Download Payslip"
                          >
                            {downloadingId === salary.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with count */}
        {!loading && filteredSalaries.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredSalaries.length} of {salaries.length} records for {months[selectedMonth - 1]} {selectedYear}
          </div>
        )}
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Generate Salary Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Generate Salary</h3>
              {/* FIX 4: Use X icon for close buttons */}
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
              Generating salary for <strong>{months[selectedMonth - 1]} {selectedYear}</strong>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.emp_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowGenerateModal(false); setSelectedEmployee(''); }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={generateSalary}
                disabled={!selectedEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Modal */}
      {showEditModal && selectedSalary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Salary</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Employee summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">{selectedSalary.employee_name}</p>
              <p className="text-xs text-gray-500">{selectedSalary.emp_code} · {months[selectedSalary.month - 1]} {selectedSalary.year}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <span>Earned: ₹{parseFloat(selectedSalary.earned_salary || 0).toFixed(2)}</span>
                <span>PF: ₹{parseFloat(selectedSalary.pf_deduction || 0).toFixed(2)}</span>
                <span>ESI: ₹{parseFloat(selectedSalary.esi_deduction || 0).toFixed(2)}</span>
                <span>Net: ₹{parseFloat(selectedSalary.net_salary || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TDS Deduction (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.tds_deduction}
                  onChange={(e) => setEditForm({ ...editForm, tds_deduction: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Advance Deduction (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.advance_deduction}
                  onChange={(e) => setEditForm({ ...editForm, advance_deduction: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="released">Released</option>
                </select>
              </div>

              {/* Live net salary preview */}
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-xs text-green-700 font-medium">Estimated Net Salary (after deductions)</p>
                <p className="text-lg font-bold text-green-800">
                  ₹{Math.max(0,
                    parseFloat(selectedSalary.earned_salary || 0) -
                    parseFloat(selectedSalary.pf_deduction || 0) -
                    parseFloat(selectedSalary.esi_deduction || 0) -
                    editForm.tds_deduction -
                    editForm.advance_deduction
                  ).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={updateSalary}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Update Salary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && attendanceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Attendance Details
                </h3>
                <p className="text-sm text-gray-500">
                  {attendanceData.employee?.name} ({attendanceData.employee?.emp_code}) ·{' '}
                  {months[(attendanceData.month || 1) - 1]} {attendanceData.year}
                </p>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Employee & Summary Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Employee Info</h4>
                <p className="text-sm text-gray-600">Name: <span className="font-medium">{attendanceData.employee?.name}</span></p>
                <p className="text-sm text-gray-600">Code: {attendanceData.employee?.emp_code}</p>
                <p className="text-sm text-gray-600">Phone: {attendanceData.employee?.phone || 'N/A'}</p>
                <p className="text-sm text-gray-600">Email: {attendanceData.employee?.email || 'N/A'}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Month Summary</h4>
                <p className="text-sm text-blue-700">Period: {months[(attendanceData.month || 1) - 1]} {attendanceData.year}</p>
                <p className="text-sm text-blue-700">Total Days: {attendanceData.totalDays}</p>
                <p className="text-sm text-blue-700">Working Days: {attendanceData.totalWorkingDays}</p>
                <p className="text-sm text-blue-700">Weekends (Sun): {attendanceData.weekends}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2 text-sm">Salary Calculation</h4>
                <p className="text-sm text-green-700">Basic: ₹{parseFloat(attendanceData.salary?.basicSalary || 0).toFixed(2)}</p>
                <p className="text-sm text-green-700">HRA: ₹{parseFloat(attendanceData.salary?.hraAmount || 0).toFixed(2)}</p>
                <p className="text-sm text-green-700">Gross: ₹{parseFloat(attendanceData.salary?.grossSalary || 0).toFixed(2)}</p>
                <p className="text-sm text-green-700">Daily Rate: ₹{parseFloat(attendanceData.salary?.perDaySalary || 0).toFixed(2)}</p>
                <p className="text-sm text-green-700">Earned: ₹{parseFloat(attendanceData.salary?.earnedSalary || 0).toFixed(2)}</p>
                <p className="text-sm text-green-700">PF: ₹{parseFloat(attendanceData.salary?.deductions?.pf || 0).toFixed(2)}</p>
                <p className="text-sm text-green-700">ESI: ₹{parseFloat(attendanceData.salary?.deductions?.esi || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Attendance Summary Boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-100 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-800">{attendanceData.summary?.presentDays}</p>
                <p className="text-sm text-green-600">Present Days</p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-800">{attendanceData.summary?.absentDays}</p>
                <p className="text-sm text-red-600">Absent Days</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-800">{attendanceData.summary?.halfDays}</p>
                <p className="text-sm text-yellow-600">Half Days</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-800">{attendanceData.summary?.leaveDays}</p>
                <p className="text-sm text-purple-600">Leave Days</p>
              </div>
            </div>

            {/* Daily Attendance Calendar */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Daily Attendance Calendar</h4>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-100 inline-block"></span>P = Present</span>
                <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-100 inline-block"></span>A = Absent</span>
                <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-100 inline-block"></span>HD = Half Day</span>
                <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-purple-100 inline-block"></span>L = Leave</span>
                <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-200 inline-block"></span>Sun = Weekend</span>
                <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-200 inline-block"></span>- = Not Marked</span>
              </div>

              <div className="grid grid-cols-7 md:grid-cols-14 gap-1.5">
                {Array.from({ length: attendanceData.totalDays || 30 }, (_, i) => {
                  const day = i + 1;
                  const attendance = attendanceData.attendance?.[day];
                  const dayOfWeek = new Date(attendanceData.year, (attendanceData.month || 1) - 1, day).getDay();
                  const isWeekend = dayOfWeek === 0;

                  let bgColor = 'bg-gray-200';
                  let textColor = 'text-gray-500';
                  let statusText = '-';

                  if (isWeekend) {
                    bgColor = 'bg-red-200';
                    textColor = 'text-red-700';
                    statusText = 'Sun';
                  } else if (attendance) {
                    switch (attendance.status) {
                      case 'Present':
                        bgColor = 'bg-green-100';
                        textColor = 'text-green-700';
                        statusText = 'P';
                        break;
                      case 'Absent':
                        bgColor = 'bg-red-100';
                        textColor = 'text-red-700';
                        statusText = 'A';
                        break;
                      case 'Half Day':
                        bgColor = 'bg-yellow-100';
                        textColor = 'text-yellow-700';
                        statusText = 'HD';
                        break;
                      case 'Leave':
                        bgColor = 'bg-purple-100';
                        textColor = 'text-purple-700';
                        statusText = 'L';
                        break;
                      default:
                        statusText = attendance.status?.charAt(0) || '-';
                    }
                  }

                  return (
                    <div
                      key={day}
                      className={`${bgColor} ${textColor} p-1.5 rounded text-center cursor-default`}
                      title={`Day ${day}: ${attendance?.status || (isWeekend ? 'Sunday' : 'Not marked')}${attendance?.remarks ? ' - ' + attendance.remarks : ''}`}
                    >
                      <div className="text-xs font-bold">{day}</div>
                      <div className="text-xs">{statusText}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advance Details Modal */}
      {showAdvanceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Employee Advance Details</h3>
              <button
                onClick={() => setShowAdvanceDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {showAdvanceDetails.advances.map((advance) => (
                <div key={advance.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Advance Information</h4>
                      <p className="text-sm text-gray-600">
                        Amount: <span className="font-medium text-orange-600">₹{parseFloat(advance.amount || 0).toFixed(2)}</span>
                      </p>
                      <p className="text-sm text-gray-600">Reason: {advance.reason || 'N/A'}</p>
                      <p className="text-sm text-gray-600 capitalize">Method: {advance.payment_method || 'cash'}</p>
                      <p className="text-sm text-gray-600">
                        Date: {advance.payment_date ? new Date(advance.payment_date).toLocaleDateString('en-IN') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Status & Repayment</h4>
                      <div className="mb-2">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          advance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          advance.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          advance.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {advance.status?.charAt(0).toUpperCase() + advance.status?.slice(1)}
                        </span>
                      </div>
                      {advance.repayment_amount && (
                        <p className="text-sm text-gray-600">Repayment: ₹{parseFloat(advance.repayment_amount).toFixed(2)}</p>
                      )}
                      {advance.repayment_date && (
                        <p className="text-sm text-gray-600">
                          Repay Date: {new Date(advance.repayment_date).toLocaleDateString('en-IN')}
                        </p>
                      )}
                      {advance.remarks && (
                        <p className="text-sm text-gray-600">Remarks: {advance.remarks}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-1 text-sm">Total Advance Amount</h4>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{showAdvanceDetails.advances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0).toFixed(2)}
                </p>
                <p className="text-xs text-orange-700 mt-1">This amount will be deducted from the employee's salary</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAdvanceDetails(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalaryManagement() {
  return (
    <Suspense fallback={<SalaryManagementSkeleton />}>
      <SalaryManagementContent />
    </Suspense>
  );
}