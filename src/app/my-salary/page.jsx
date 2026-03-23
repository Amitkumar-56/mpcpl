'use client';
import { AlertCircle, Calendar, CalendarDays, CheckCircle, Clock, DollarSign, Download, Search, X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Loading skeleton component
function MySalarySkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="h-10 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-5 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>
      
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Filters Skeleton */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
          {[1, 2, 3, 4].map((i) => (
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
function MySalaryContent() {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth, selectedYear]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/salary?month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      
      if (data.success) {
        setSalaries(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch salaries');
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
      toast.error('Error fetching salaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async (month, year) => {
    try {
      const response = await fetch(`/api/salary/attendance-summary?month=${month}&year=${year}`);
      const data = await response.json();
      
      if (data.success) {
        setAttendanceData(data.data);
        setShowAttendanceModal(true);
      } else {
        toast.error(data.error || 'Failed to fetch attendance data');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Error fetching attendance data');
    }
  };

  const downloadPayslip = async (salaryId) => {
    try {
      setDownloading(salaryId);
      console.log('Downloading payslip for salary ID:', salaryId);
      
      const response = await fetch(`/api/salary-payslip-simple?salary_id=${salaryId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API response not OK:', response.status, errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Payslip API response:', data);
      
      if (data.success && data.payslip) {
        const blob = new Blob([data.payslip], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        toast.success('Payslip downloaded successfully!');
      } else {
        console.error('Payslip generation failed:', data);
        toast.error(data.error || 'Failed to generate payslip');
      }
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error(error.message || 'Error downloading payslip');
    } finally {
      setDownloading(null);
    }
  };

  const filteredSalaries = salaries.filter(salary => {
    const monthName = months[salary.month - 1];
    const searchLower = searchTerm.toLowerCase();
    return monthName.toLowerCase().includes(searchLower) ||
           salary.year.toString().includes(searchLower);
  });

  const totalEarnings = salaries.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0);
  const pendingSalaries = salaries.filter(s => s.status === 'pending').length;
  const releasedSalaries = salaries.filter(s => s.status === 'released').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Salary</h1>
        <p className="text-gray-600">View your salary details and download payslips</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalEarnings.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingSalaries}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Released</p>
              <p className="text-2xl font-bold text-green-600">{releasedSalaries}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
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
                placeholder="Search by month/year..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchSalaries}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Refresh
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned Salary</th>
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
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredSalaries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No salary records found
                  </td>
                </tr>
              ) : (
                filteredSalaries.map((salary) => (
                  <tr key={salary.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{months[salary.month - 1]} {salary.year}</div>
                      <div className="text-gray-500 text-xs">
                        {parseFloat(salary.present_days || 0).toFixed(1)}/{salary.total_days || 0} days
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{parseFloat(salary.basic_salary || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{parseFloat(salary.earned_salary || 0).toFixed(2)}
                      {salary.incentive_bonus > 0 && (
                        <div className="text-green-600 text-xs">+₹{parseFloat(salary.incentive_bonus).toFixed(2)} (Bonus)</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{parseFloat(salary.total_deduction || 0).toFixed(2)}
                      <div className="text-xs text-gray-500">
                        {salary.pf_deduction > 0 && `PF: ₹${parseFloat(salary.pf_deduction).toFixed(2)}`}
                        {salary.tds_deduction > 0 && `, TDS: ₹${parseFloat(salary.tds_deduction).toFixed(2)}`}
                        {salary.advance_deduction > 0 && `, Adv: ₹${parseFloat(salary.advance_deduction).toFixed(2)}`}
                      </div>
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
                      {salary.release_date && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(salary.release_date).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => downloadPayslip(salary.id)}
                        disabled={downloading === salary.id}
                        className="text-green-600 hover:text-green-900 flex items-center gap-1 disabled:opacity-50"
                        title="Download Payslip"
                      >
                        {downloading === salary.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Payslip
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => fetchAttendanceData(salary.month, salary.year)}
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

      {filteredSalaries.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Salary Information</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Basic Salary is fixed monthly amount</li>
                <li>Earned Salary is calculated based on attendance (Present Days × Daily Rate)</li>
                <li>PF Deduction is 12% of Basic Salary</li>
                <li>ESI Deduction is 0.75% of Earned Salary (if applicable)</li>
                <li>Net Salary = Earned Salary + Incentive/Bonus - Total Deductions</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && attendanceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Attendance Details - {months[attendanceData.month - 1]} {attendanceData.year}
              </h2>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Employee Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Employee Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name:</p>
                    <p className="font-medium">{attendanceData.employee?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Employee Code:</p>
                    <p className="font-medium">{attendanceData.employee?.emp_code || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Basic Salary:</p>
                    <p className="font-medium">₹{parseFloat(attendanceData.salary?.basicSalary || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Daily Rate:</p>
                    <p className="font-medium">₹{parseFloat(attendanceData.salary?.dailyRate || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Present Days</p>
                  <p className="text-2xl font-bold text-green-900">{attendanceData.summary?.presentDays || 0}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600">Absent Days</p>
                  <p className="text-2xl font-bold text-red-900">{attendanceData.summary?.absentDays || 0}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600">Half Days</p>
                  <p className="text-2xl font-bold text-yellow-900">{attendanceData.summary?.halfDays || 0}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Leaves</p>
                  <p className="text-2xl font-bold text-blue-900">{attendanceData.summary?.leaveDays || 0}</p>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Day</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Check In</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Check Out</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: attendanceData.totalDays }, (_, i) => i + 1).map(day => {
                      const record = attendanceData.attendance?.[day];
                      const date = new Date(attendanceData.year, attendanceData.month - 1, day);
                      const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
                      const isSunday = date.getDay() === 0;
                      
                      return (
                        <tr key={day} className={isSunday ? 'bg-gray-50' : ''}>
                          <td className="px-4 py-2 text-sm">{day}</td>
                          <td className="px-4 py-2 text-sm">{dayName}</td>
                          <td className="px-4 py-2 text-sm">
                            {isSunday ? (
                              <span className="text-gray-500">Weekend</span>
                            ) : record ? (
                              <span className={`font-medium ${
                                record.status === 'Present' ? 'text-green-600' :
                                record.status === 'Absent' ? 'text-red-600' :
                                record.status === 'Half Day' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`}>
                                {record.status}
                              </span>
                            ) : (
                              <span className="text-gray-400">No Record</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {record?.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {record?.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {record?.remarks || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main export with Suspense
export default function MySalary() {
  return (
    <Suspense fallback={<MySalarySkeleton />}>
      <MySalaryContent />
    </Suspense>
  );
}