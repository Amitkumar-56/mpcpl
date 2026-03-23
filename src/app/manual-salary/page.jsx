//src/app/manual-salary/page.jsx
'use client';
import { AlertCircle, CalendarDays, CheckCircle, Clock, DollarSign, Download, FileText, IndianRupee, Plus, Search } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Loading component for Suspense
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Main component
function ManualSalaryContent() {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);

  const [addForm, setAddForm] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: '',
    earned_salary: '',
    pf_deduction: '',
    esi_deduction: '',
    tds_deduction: '',
    advance_deduction: '',
    total_deduction: '',
    net_salary: '',
    payment_status: 'pending',
    payment_date: '',
    payment_method: 'cash',
    remarks: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_status: 'paid',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    remarks: ''
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
  }, [selectedMonth, selectedYear]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/manual-salary?month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      
      if (data.success) {
        setSalaries(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch salaries');
      }
    } catch (error) {
      toast.error('Error fetching salaries');
    } finally {
      setLoading(false);
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
      console.error('Error fetching employees:', error);
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

  // FIXED: Improved download function with proper error handling
  const downloadPayslip = async (salaryId) => {
    if (!salaryId) {
      toast.error('Invalid salary ID');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Generating payslip...');
    
    try {
      console.log('Downloading PDF payslip for manual salary ID:', salaryId);
      
      const response = await fetch(`/api/manual-salary-pdf-payslip?salary_id=${salaryId}`);
      
      console.log('Response status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      // Handle PDF response
      if (contentType && contentType.includes('application/pdf')) {
        // Get response as blob
        const blob = await response.blob();
        
        // Check if blob is empty
        if (blob.size === 0) {
          throw new Error('Generated PDF is empty');
        }
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payslip_${salaryId}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        toast.success('Payslip downloaded successfully!', {
          id: loadingToast,
        });
      } 
      // Handle JSON response
      else {
        const data = await response.json();
        console.log('Manual salary PDF payslip API response:', data);
        
        if (data.success && data.payslip) {
          // If it's a URL, open in new tab or download
          if (data.payslip.startsWith('http')) {
            window.open(data.payslip, '_blank');
            toast.success('Payslip opened in new tab!', {
              id: loadingToast,
            });
          } else {
            // If it's base64 or blob URL
            const link = document.createElement('a');
            link.href = data.payslip;
            link.download = data.filename || `payslip_${salaryId}.pdf`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
            }, 100);
            toast.success('Payslip downloaded successfully!', {
              id: loadingToast,
            });
          }
        } else {
          throw new Error(data.error || 'Failed to generate payslip');
        }
      }
      
    } catch (error) {
      console.error('Error downloading manual salary PDF payslip:', error);
      toast.error(`Error downloading payslip: ${error.message}`, {
        id: loadingToast,
      });
    }
  };

  const addSalary = async () => {
    if (!addForm.employee_id || !addForm.month || !addForm.year) {
      toast.error('Please fill all required fields');
      return;
    }

    console.log('Submitting manual salary form:', addForm);

    try {
      console.log('Trying working manual salary API...');
      
      const response = await fetch('/api/manual-salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText);
        toast.error(`Server error: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        toast.success(data.message || 'Manual salary added successfully!');
        setShowAddModal(false);
        setAddForm({
          employee_id: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          basic_salary: '',
          earned_salary: '',
          pf_deduction: '',
          esi_deduction: '',
          tds_deduction: '',
          advance_deduction: '',
          total_deduction: '',
          net_salary: '',
          payment_status: 'pending',
          payment_date: '',
          payment_method: 'cash',
          remarks: ''
        });
        fetchSalaries();
      } else {
        console.error('Error response:', data);
        toast.error(data.error || 'Failed to add manual salary');
      }
    } catch (error) {
      console.error('Error in manual salary submission:', error);
      toast.error('Error adding manual salary: ' + error.message);
    }
  };

  const updatePaymentStatus = async () => {
    if (!selectedSalary) return;

    try {
      const response = await fetch('/api/manual-salary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSalary.id,
          payment_status: paymentForm.payment_status,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          remarks: paymentForm.remarks
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Payment status updated successfully!');
        setShowPaymentModal(false);
        fetchSalaries();
      } else {
        toast.error(data.error || 'Failed to update payment');
      }
    } catch (error) {
      toast.error('Error updating payment');
    }
  };

  const calculateDeductions = () => {
    const basic = parseFloat(addForm.basic_salary) || 0;
    const earned = parseFloat(addForm.earned_salary) || 0;
    
    const pf = basic * 0.12; // 12% of basic
    const esi = earned * 0.0075; // 0.75% of earned
    const tds = parseFloat(addForm.tds_deduction) || 0;
    const advance = parseFloat(addForm.advance_deduction) || 0;
    const total = pf + esi + tds + advance;
    const net = earned - total;

    setAddForm({
      ...addForm,
      pf_deduction: pf.toFixed(2),
      esi_deduction: esi.toFixed(2),
      total_deduction: total.toFixed(2),
      net_salary: net.toFixed(2)
    });
  };

  const openPaymentModal = (salary) => {
    setSelectedSalary(salary);
    setPaymentForm({
      payment_status: salary.status || 'pending',
      payment_date: salary.release_date || new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      remarks: ''
    });
    setShowPaymentModal(true);
  };

  const filteredSalaries = salaries.filter(salary => {
    const matchesSearch = salary.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         salary.emp_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || salary.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: salaries.length,
    paid: salaries.filter(s => s.status === 'released').length,
    pending: salaries.filter(s => s.status === 'pending').length,
    totalAmount: salaries.reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IndianRupee className="h-8 w-8" />
              Manual Salary Management
            </h1>
            <p className="text-blue-100 mt-1">Add and manage employee salaries like payment system</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Paid</p>
                  <p className="text-2xl font-bold text-green-900">{stats.paid}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-purple-900">₹{stats.totalAmount.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="px-6 pb-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {months.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
                
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="released">Paid</option>
                </select>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Salary
              </button>
            </div>
          </div>

          {/* Salary Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                      No salary records found
                    </td>
                  </tr>
                ) : (
                  filteredSalaries.map((salary) => (
                    <tr key={salary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{salary.employee_name}</div>
                          <div className="text-sm text-gray-500">{salary.emp_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{months[salary.month - 1]} {salary.year}</div>
                        <div className="text-gray-500">
                          {salary.present_days}/{salary.total_days} days
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(salary.basic_salary || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(salary.earned_salary || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(salary.total_deduction || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(salary.net_salary || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          salary.status === 'released' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {salary.status === 'released' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openPaymentModal(salary)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Update Payment"
                          >
                            <DollarSign className="h-4 w-4" />
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Salary Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Add Manual Salary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                  <select
                    value={addForm.employee_id}
                    onChange={(e) => setAddForm({...addForm, employee_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.emp_code})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={addForm.month}
                    onChange={(e) => setAddForm({...addForm, month: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <select
                    value={addForm.year}
                    onChange={(e) => setAddForm({...addForm, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                  <input
                    type="number"
                    value={addForm.basic_salary}
                    onChange={(e) => setAddForm({...addForm, basic_salary: e.target.value})}
                    onBlur={calculateDeductions}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter basic salary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Earned Salary</label>
                  <input
                    type="number"
                    value={addForm.earned_salary}
                    onChange={(e) => setAddForm({...addForm, earned_salary: e.target.value})}
                    onBlur={calculateDeductions}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter earned salary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">TDS Deduction</label>
                  <input
                    type="number"
                    value={addForm.tds_deduction}
                    onChange={(e) => setAddForm({...addForm, tds_deduction: e.target.value})}
                    onBlur={calculateDeductions}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter TDS amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Advance Deduction</label>
                  <input
                    type="number"
                    value={addForm.advance_deduction}
                    onChange={(e) => setAddForm({...addForm, advance_deduction: e.target.value})}
                    onBlur={calculateDeductions}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter advance amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PF Deduction (Auto)</label>
                  <input
                    type="text"
                    value={addForm.pf_deduction}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    placeholder="Auto calculated"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ESI Deduction (Auto)</label>
                  <input
                    type="text"
                    value={addForm.esi_deduction}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    placeholder="Auto calculated"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Deduction (Auto)</label>
                  <input
                    type="text"
                    value={addForm.total_deduction}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    placeholder="Auto calculated"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Net Salary (Auto)</label>
                  <input
                    type="text"
                    value={addForm.net_salary}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    placeholder="Auto calculated"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                  <select
                    value={addForm.payment_status}
                    onChange={(e) => setAddForm({...addForm, payment_status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="released">Paid</option>
                  </select>
                </div>
                
                {addForm.payment_status === 'released' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                    <input
                      type="date"
                      value={addForm.payment_date}
                      onChange={(e) => setAddForm({...addForm, payment_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addSalary}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Salary
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status Modal */}
        {showPaymentModal && selectedSalary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Update Payment Status - {selectedSalary.employee_name}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                  <select
                    value={paymentForm.payment_status}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="released">Paid</option>
                  </select>
                </div>
                
                {paymentForm.payment_status === 'released' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <textarea
                    value={paymentForm.remarks}
                    onChange={(e) => setPaymentForm({...paymentForm, remarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter payment remarks..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={updatePaymentStatus}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Payment
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
                  <h4 className="font-semibold text-green-900 mb-2">Attendance Summary</h4>
                  <p className="text-sm text-green-600">Present: {attendanceData.summary.presentDays}</p>
                  <p className="text-sm text-green-600">Absent: {attendanceData.summary.absentDays}</p>
                  <p className="text-sm text-green-600">Half Days: {attendanceData.summary.halfDays}</p>
                  <p className="text-sm text-green-600">Leave: {attendanceData.summary.leaveDays}</p>
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
      </div>
    </div>
  );
}

// Main export with Suspense
export default function ManualSalary() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ManualSalaryContent />
    </Suspense>
  );
}