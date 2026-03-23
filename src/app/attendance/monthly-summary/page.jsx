// src/app/attendance/monthly-summary/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MonthlyAttendanceSummary() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [summaryData, setSummaryData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      // Check if user has access (not staff for viewing others)
      if (user.role === 1) {
        setSelectedEmployee(user.id);
      }
      fetchEmployees();
      if (selectedEmployee || user.role === 1) {
        fetchSummary();
      }
    }
  }, [user, authLoading, selectedEmployee, selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      console.log('🔍 Fetching employees...');
      const response = await fetch('/api/get-employees');
      console.log('📦 Employees API status:', response.status);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response from employees API:', text.substring(0, 200));
        throw new Error('Employees API returned non-JSON response');
      }
      
      const data = await response.json();
      console.log('📊 Employees API Response:', data);
      
      if (data.employees) {
        setEmployees(data.employees);
      } else if (data.success && data.data) {
        setEmployees(data.data);
      } else {
        console.log('❌ Invalid employees response format:', data);
        setEmployees([]);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const employeeId = selectedEmployee || (user && user.role === 1 ? user.id : "");
      
      if (!employeeId) {
        setLoading(false);
        return;
      }

      const url = `/api/salary/attendance-summary?employee_id=${employeeId}&month=${selectedMonth}&year=${selectedYear}`;
      console.log('🔍 Fetching attendance summary from:', url);
      
      const response = await fetch(url);
      console.log('📦 Response status:', response.status);
      console.log('📦 Response headers:', response.headers.get('content-type'));
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response. Please check authentication.');
      }
      
      const data = await response.json();
      console.log('📊 API Response:', data);
      
      if (data.success) {
        setSummaryData(data.data);
      } else {
        setError(data.error || "Failed to fetch attendance summary");
      }
    } catch (error) {
      console.error('❌ Error fetching attendance summary:', error);
      if (error.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(error.message || "Failed to load attendance summary");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Present': 'bg-green-100 text-green-800',
      'Absent': 'bg-red-100 text-red-800',
      'Half Day': 'bg-yellow-100 text-yellow-800',
      'Leave': 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const getDayName = (day, month, year) => {
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isWeekend = (day, month, year) => {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0; // Sunday
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:px-8 max-w-7xl">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
            </div>
            
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Monthly Attendance Summary
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                View detailed monthly attendance report
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {user && user.role !== 1 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Employee
                    </label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.emp_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({length: 5}, (_, i) => (
                      <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>
                        {new Date().getFullYear() - i}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={fetchSummary}
                    disabled={loading || (!selectedEmployee && user && user.role !== 1)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
                  >
                    {loading ? 'Loading...' : 'View Summary'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Summary Content */}
            {summaryData && (
              <>
                {/* Employee Info & Summary Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Employee Information</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-semibold">{summaryData.employee.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Employee Code</p>
                        <p className="font-semibold">{summaryData.employee.emp_code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-semibold">{summaryData.employee.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-semibold">{summaryData.employee.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Summary</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Present Days</span>
                        <span className="font-semibold text-green-600">{summaryData.summary.presentDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Absent Days</span>
                        <span className="font-semibold text-red-600">{summaryData.summary.absentDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Half Days</span>
                        <span className="font-semibold text-yellow-600">{summaryData.summary.halfDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Leave Days</span>
                        <span className="font-semibold text-blue-600">{summaryData.summary.leaveDays}</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-semibold">Effective Present</span>
                          <span className="font-bold text-lg">{summaryData.summary.effectivePresentDays}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Calculation */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Salary Calculation</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Annual CTC</p>
                      <p className="font-semibold text-lg">₹{summaryData.salary.annualSalary.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Monthly Gross</p>
                      <p className="font-semibold text-lg">₹{summaryData.salary.grossSalary.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Earned Salary</p>
                      <p className="font-semibold text-lg text-green-600">₹{summaryData.salary.earnedSalary.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Basic (50% of CTC)</p>
                        <p className="font-semibold">₹{summaryData.salary.basicSalary.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">HRA (30% of Basic)</p>
                        <p className="font-semibold">₹{summaryData.salary.hraAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Daily Rate</p>
                        <p className="font-semibold">₹{summaryData.salary.perDaySalary.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">PF Deduction (12%)</p>
                        <p className="font-semibold text-red-600">-₹{summaryData.salary.deductions.pf.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ESI Deduction (0.75%)</p>
                        <p className="font-semibold text-red-600">-₹{summaryData.salary.deductions.esi.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Net Salary</p>
                        <p className="font-bold text-lg text-blue-600">
                          ₹{(summaryData.salary.earnedSalary - summaryData.salary.deductions.pf - summaryData.salary.deductions.esi).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance Calendar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Attendance Calendar - {getMonthName(selectedMonth)} {selectedYear}
                  </h2>
                  <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-xs font-semibold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({length: summaryData.totalDays}, (_, i) => i + 1).map((day) => {
                      const attendance = summaryData.attendance[day];
                      const isWeekendDay = isWeekend(day, selectedMonth, selectedYear);
                      const dayName = getDayName(day, selectedMonth, selectedYear);
                      
                      return (
                        <div
                          key={day}
                          className={`
                            border rounded-lg p-2 text-center min-h-[60px]
                            ${isWeekendDay ? 'bg-gray-50 border-gray-200' : 'border-gray-300'}
                            ${attendance ? 'hover:shadow-md transition-shadow' : ''}
                          `}
                        >
                          <div className="text-xs font-semibold mb-1">{day}</div>
                          {attendance ? (
                            <div className="space-y-1">
                              <span className={`px-1 py-0.5 rounded text-xs font-medium ${getStatusBadge(attendance.status)}`}>
                                {attendance.status === 'Half Day' ? 'HD' : attendance.status.substring(0, 1)}
                              </span>
                              <div className="text-xs text-gray-500">
                                {attendance.check_in_time && `IN: ${attendance.check_in_time}`}
                                {attendance.check_out_time && (
                                  <div>OUT: {attendance.check_out_time}</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              {isWeekendDay ? 'Weekend' : 'No Data'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
