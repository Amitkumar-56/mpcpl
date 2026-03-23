'use client';
import { AlertCircle, Calendar, CalendarDays, CheckCircle, Clock, DollarSign, Download, Edit2, Plus, Search, Users } from 'lucide-react';
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

      {/* Stats Cards Skeleton */}
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

      {/* Filters Skeleton */}
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

      {/* Table Skeleton */}
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

// Main component with all the logic
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
      console.log('Fetching salaries for:', { month: selectedMonth, year: selectedYear });
      
      const response = await fetch(`/api/salary?month=${selectedMonth}&year=${selectedYear}`);
      console.log('Salary fetch response status:', response.status);
      
      const data = await response.json();
      console.log('Salary fetch response data:', data);
      
      if (data.success) {
        setSalaries(data.data);
        console.log('Salaries loaded:', data.data?.length || 0, 'records');
      } else {
        console.error('Salary fetch error:', data.error);
        toast.error(data.error || 'Failed to fetch salaries');
      }
    } catch (error) {
      console.error('Salary fetch exception:', error);
      toast.error('Error fetching salaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvancesData = async () => {
    try {
      const response = await fetch('/api/advances');
      const data = await response.json();
      
      if (data.success) {
        setAdvancesData(data.data);
      }
    } catch (error) {
      console.error('Error fetching advances:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      console.log('Fetching employees...');
      const response = await fetch('/api/get-employees');
      console.log('Employees response status:', response.status);
      
      const data = await response.json();
      console.log('Employees response data:', data);
      
      if (data.employees) {
        setEmployees(data.employees);
        console.log('Employees loaded:', data.employees?.length || 0, 'records');
      } else {
        console.error('Unexpected response format:', data);
      }
    } catch (error) {
      console.error('Employees fetch exception:', error);
    }
  };

  const fetchAttendanceData = async (employeeId, month, year) => {
    try {
      const response = await fetch(`/api/salary/attendance-summary?employee_id=${employeeId}&month=${month}&year=${year}`);
      const data = await response.json();
      
      if (data.success) {
        setAttendanceData(data.data);
        setShowAttendanceModal(true);
      } else {
        toast.error(data.error || 'Failed to fetch attendance data');
      }
    } catch (error) {
      toast.error('Error fetching attendance data');
    }
  };

  const generateSalary = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    console.log('Generating salary for:', {
      employee_id: selectedEmployee,
      month: selectedMonth,
      year: selectedYear
    });

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

      console.log('Generate salary response status:', response.status);
      
      const data = await response.json();
      console.log('Generate salary response data:', data);
      
      if (data.success) {
        toast.success(data.message);
        setShowGenerateModal(false);
        setSelectedEmployee('');
        fetchSalaries();
      } else {
        console.error('Generate salary error:', data.error);
        toast.error(data.error || 'Failed to generate salary');
      }
    } catch (error) {
      console.error('Generate salary exception:', error);
      toast.error('Error generating salary');
    }
  };

  const updateSalary = async () => {
    if (!selectedSalary) return;

    console.log('Updating salary:', {
      id: selectedSalary.id,
      editForm: editForm
    });

    try {
      const response = await fetch('/api/salary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSalary.id,
          ...editForm
        })
      });

      console.log('Update salary response status:', response.status);
      
      const data = await response.json();
      console.log('Update salary response data:', data);
      
      if (data.success) {
        toast.success(data.message);
        setShowEditModal(false);
        setSelectedSalary(null);
        fetchSalaries();
      } else {
        console.error('Update salary error:', data.error);
        toast.error(data.error || 'Failed to update salary');
      }
    } catch (error) {
      console.error('Update salary exception:', error);
      toast.error('Error updating salary');
    }
  };

  const downloadPayslip = async (salaryId) => {
    try {
      const response = await fetch(`/api/salary/payslip?salary_id=${salaryId}`);
      const data = await response.json();
      
      if (data.success) {
        const link = document.createElement('a');
        link.href = data.payslip;
        link.download = data.filename;
        link.click();
        toast.success('Payslip downloaded successfully');
      } else {
        toast.error(data.error || 'Failed to generate payslip');
      }
    } catch (error) {
      toast.error('Error downloading payslip');
    }
  };

  const openEditModal = (salary) => {
    setSelectedSalary(salary);
    setEditForm({
      tds_deduction: salary.tds_deduction || 0,
      advance_deduction: salary.advance_deduction || 0,
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
    const matchesSearch = salary.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Check if data contains error message about table not existing
  const tableNotInitialized = salaries.length === 0 && 
    salaries.message && 
    salaries.message.includes('Salary table not initialized');

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
                This is a one-time setup process.
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

      {!tableNotInitialized && (
        <>
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
                  onChange={(e) => setSelectedMonth(e.target.value)}
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
                  onChange={(e) => setSelectedYear(e.target.value)}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advances</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                   </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-4 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredSalaries.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                        No salary records found
                      </td>
                    </tr>
                  ) : (
                    filteredSalaries.map((salary) => {
                      const employeeAdvances = getEmployeeAdvances(salary.employee_id);
                      const totalAdvanceAmount = getTotalAdvanceDeduction(salary.employee_id);
                      
                      return (
                        <tr key={salary.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{salary.employee_name}</div>
                              <div className="text-sm text-gray-500">{salary.emp_code}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {months[salary.month - 1]} {salary.year}
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
                                  <div className="text-xs text-gray-500">
                                    {employeeAdvances.length} advance(s)
                                  </div>
                                  <button
                                    onClick={() => setShowAdvanceDetails({ employeeId: salary.employee_id, advances: employeeAdvances })}
                                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                                  >
                                    View Details
                                  </button>
                                </div>
                              ) : (
                                <span className="text-green-600">No Advances</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{parseFloat(salary.total_deduction || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{parseFloat(salary.net_salary || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              salary.status === 'released' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {salary.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditModal(salary)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => downloadPayslip(salary.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Download Payslip"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => fetchAttendanceData(salary.employee_id, salary.month, salary.year)}
                              className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                              title="View Attendance"
                            >
                              <CalendarDays className="h-4 w-4" />
                              Attendance
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generate Salary Modal */}
          {showGenerateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Generate Salary</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose an employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.emp_code})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateSalary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Edit Salary - {selectedSalary.employee_name}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">TDS Deduction</label>
                    <input
                      type="number"
                      value={editForm.tds_deduction}
                      onChange={(e) => setEditForm({...editForm, tds_deduction: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Advance Deduction</label>
                    <input
                      type="number"
                      value={editForm.advance_deduction}
                      onChange={(e) => setEditForm({...editForm, advance_deduction: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="released">Released</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateSalary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Modal */}
          {showAttendanceModal && attendanceData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    Attendance Details - {attendanceData.employee.name} ({attendanceData.employee.emp_code})
                  </h3>
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <AlertCircle className="h-6 w-6" />
                  </button>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Employee Info</h4>
                    <p className="text-sm text-gray-600">Name: {attendanceData.employee.name}</p>
                    <p className="text-sm text-gray-600">Code: {attendanceData.employee.emp_code}</p>
                    <p className="text-sm text-gray-600">Phone: {attendanceData.employee.phone || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Email: {attendanceData.employee.email || 'N/A'}</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Month Summary</h4>
                    <p className="text-sm text-blue-600">Period: {months[attendanceData.month - 1]} {attendanceData.year}</p>
                    <p className="text-sm text-blue-600">Total Days: {attendanceData.totalDays}</p>
                    <p className="text-sm text-blue-600">Working Days: {attendanceData.totalWorkingDays}</p>
                    <p className="text-sm text-blue-600">Weekends: {attendanceData.weekends}</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Salary Calculation</h4>
                    <p className="text-sm text-green-600">Basic Salary: ₹{attendanceData.salary.basicSalary.toFixed(2)}</p>
                    <p className="text-sm text-green-600">Daily Rate: ₹{attendanceData.salary.dailyRate.toFixed(2)}</p>
                    <p className="text-sm text-green-600">Earned Salary: ₹{attendanceData.salary.earnedSalary.toFixed(2)}</p>
                    <p className="text-sm text-green-600">PF Deduction: ₹{attendanceData.salary.deductions.pf.toFixed(2)}</p>
                    <p className="text-sm text-green-600">ESI Deduction: ₹{attendanceData.salary.deductions.esi.toFixed(2)}</p>
                  </div>
                </div>

                {/* Attendance Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-green-100 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-800">{attendanceData.summary.presentDays}</p>
                    <p className="text-sm text-green-600">Present Days</p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-800">{attendanceData.summary.absentDays}</p>
                    <p className="text-sm text-red-600">Absent Days</p>
                  </div>
                  <div className="bg-yellow-100 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-800">{attendanceData.summary.halfDays}</p>
                    <p className="text-sm text-yellow-600">Half Days</p>
                  </div>
                  <div className="bg-purple-100 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-800">{attendanceData.summary.leaveDays}</p>
                    <p className="text-sm text-purple-600">Leave Days</p>
                  </div>
                </div>

                {/* Daily Attendance */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Daily Attendance</h4>
                  <div className="grid grid-cols-7 md:grid-cols-14 gap-2">
                    {Array.from({ length: attendanceData.totalDays }, (_, i) => {
                      const day = i + 1;
                      const attendance = attendanceData.attendance[day];
                      const dayOfWeek = new Date(attendanceData.year, attendanceData.month - 1, day).getDay();
                      const isWeekend = dayOfWeek === 0;
                      
                      let bgColor = 'bg-gray-200';
                      let textColor = 'text-gray-500';
                      let statusText = '-';
                      
                      if (isWeekend) {
                        bgColor = 'bg-red-100';
                        textColor = 'text-red-600';
                        statusText = 'Sun';
                      } else if (attendance) {
                        switch(attendance.status) {
                          case 'Present':
                            bgColor = 'bg-green-100';
                            textColor = 'text-green-600';
                            statusText = 'P';
                            break;
                          case 'Absent':
                            bgColor = 'bg-red-100';
                            textColor = 'text-red-600';
                            statusText = 'A';
                            break;
                          case 'Half Day':
                            bgColor = 'bg-yellow-100';
                            textColor = 'text-yellow-600';
                            statusText = 'HD';
                            break;
                          case 'Leave':
                            bgColor = 'bg-purple-100';
                            textColor = 'text-purple-600';
                            statusText = 'L';
                            break;
                        }
                      }
                      
                      return (
                        <div
                          key={day}
                          className={`${bgColor} ${textColor} p-2 rounded text-center text-xs font-medium`}
                          title={`Day ${day}: ${attendance?.status || 'Not marked'}${attendance?.remarks ? ' - ' + attendance.remarks : ''}`}
                        >
                          <div className="font-bold">{day}</div>
                          <div>{statusText}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    Employee Advance Details
                  </h3>
                  <button
                    onClick={() => setShowAdvanceDetails(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <AlertCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {showAdvanceDetails.advances.map((advance) => (
                    <div key={advance.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Advance Information</h4>
                          <p className="text-sm text-gray-600">Amount: <span className="font-medium text-orange-600">₹{parseFloat(advance.amount || 0).toFixed(2)}</span></p>
                          <p className="text-sm text-gray-600">Reason: {advance.reason || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Payment Method: <span className="capitalize">{advance.payment_method || 'cash'}</span></p>
                          <p className="text-sm text-gray-600">Payment Date: {new Date(advance.payment_date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Status & Repayment</h4>
                          <div className="mb-2">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              advance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              advance.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              advance.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {advance.status.charAt(0).toUpperCase() + advance.status.slice(1)}
                            </span>
                          </div>
                          {advance.repayment_amount && (
                            <p className="text-sm text-gray-600">Repayment Amount: ₹{parseFloat(advance.repayment_amount).toFixed(2)}</p>
                          )}
                          {advance.repayment_date && (
                            <p className="text-sm text-gray-600">Repayment Date: {new Date(advance.repayment_date).toLocaleDateString('en-IN')}</p>
                          )}
                          {advance.remarks && (
                            <p className="text-sm text-gray-600">Remarks: {advance.remarks}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">Total Advance Amount</h4>
                    <p className="text-2xl font-bold text-orange-600">
                      ₹{showAdvanceDetails.advances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      This amount will be deducted from the employee's salary
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowAdvanceDetails(null)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Main export with Suspense
export default function SalaryManagement() {
  return (
    <Suspense fallback={<SalaryManagementSkeleton />}>
      <SalaryManagementContent />
    </Suspense>
  );
}