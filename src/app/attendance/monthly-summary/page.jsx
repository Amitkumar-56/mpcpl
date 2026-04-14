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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
    return false; // No weekends - all days are office days
  };

  const downloadPDF = () => {
    if (!summaryData) return;
    
    const printContent = `
      <html>
        <head>
          <title>Attendance Report - ${summaryData.employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .employee-info { margin: 20px 0; }
            .summary { margin: 20px 0; }
            .calendar { margin: 20px 0; }
            .day-cell { width: 60px; height: 60px; border: 1px solid #ccc; text-align: center; padding: 5px; display: inline-block; margin: 2px; }
            .weekend { background-color: #f0f0f0; }
            .present { background-color: #d4edda; }
            .absent { background-color: #f8d7da; }
            .half-day { background-color: #fff3cd; }
            .leave { background-color: #d1ecf1; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Monthly Attendance Report</h1>
            <h2>${getMonthName(selectedMonth)} ${selectedYear}</h2>
          </div>
          
          <div class="employee-info">
            <h3>Employee Information</h3>
            <table>
              <tr><td><strong>Name:</strong></td><td>${summaryData.employee.name}</td></tr>
              <tr><td><strong>Employee Code:</strong></td><td>${summaryData.employee.emp_code}</td></tr>
              <tr><td><strong>Phone:</strong></td><td>${summaryData.employee.phone}</td></tr>
              <tr><td><strong>Email:</strong></td><td>${summaryData.employee.email}</td></tr>
            </table>
          </div>
          
          <div class="summary">
            <h3>Attendance Summary</h3>
            <table>
              <tr><td><strong>Present Days:</strong></td><td>${summaryData.summary.presentDays}</td></tr>
              <tr><td><strong>Absent Days:</strong></td><td>${summaryData.summary.absentDays}</td></tr>
              <tr><td><strong>Half Days:</strong></td><td>${summaryData.summary.halfDays}</td></tr>
              <tr><td><strong>Leave Days:</strong></td><td>${summaryData.summary.leaveDays}</td></tr>
              <tr><td><strong>Effective Present:</strong></td><td><strong>${summaryData.summary.effectivePresentDays}</strong></td></tr>
            </table>
          </div>
          
          <div class="summary">
            <h3>Salary Calculation</h3>
            <table>
              <tr><td><strong>Annual CTC:</strong></td><td>Rs. ${summaryData.salary.annualSalary.toFixed(2)}</td></tr>
              <tr><td><strong>Monthly Gross:</strong></td><td>Rs. ${summaryData.salary.grossSalary.toFixed(2)}</td></tr>
              <tr><td><strong>Basic Salary:</strong></td><td>Rs. ${summaryData.salary.basicSalary.toFixed(2)}</td></tr>
              <tr><td><strong>HRA Amount:</strong></td><td>Rs. ${summaryData.salary.hraAmount.toFixed(2)}</td></tr>
              <tr><td><strong>Daily Rate:</strong></td><td>Rs. ${summaryData.salary.perDaySalary.toFixed(2)}</td></tr>
              <tr><td><strong>Earned Salary:</strong></td><td>Rs. ${summaryData.salary.earnedSalary.toFixed(2)}</td></tr>
              <tr><td><strong>PF Deduction:</strong></td><td>Rs. ${summaryData.salary.deductions.pf.toFixed(2)}</td></tr>
              <tr><td><strong>ESI Deduction:</strong></td><td>Rs. ${summaryData.salary.deductions.esi.toFixed(2)}</td></tr>
              <tr><td><strong>Net Salary:</strong></td><td><strong>Rs. ${(summaryData.salary.earnedSalary - summaryData.salary.deductions.pf - summaryData.salary.deductions.esi).toFixed(2)}</strong></td></tr>
            </table>
          </div>
          
          <div class="calendar">
            <h3>Attendance Calendar</h3>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;">
              ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<div style="text-align: center; font-weight: bold; padding: 5px;">${day}</div>`).join('')}
              ${Array.from({length: summaryData.totalDays}, (_, i) => i + 1).map(day => {
                const attendance = summaryData.attendance[day];
                const isWeekendDay = isWeekend(day, selectedMonth, selectedYear);
                let className = 'day-cell';
                let content = `<div>${day}</div>`;
                
                if (attendance) {
                  className += ` ${attendance.status.toLowerCase().replace(' ', '-')}`;
                  content += `<div>${attendance.status === 'Half Day' ? 'HD' : attendance.status.substring(0, 1)}</div>`;
                  if (attendance.check_in_time) content += `<div style="font-size: 10px;">IN: ${attendance.check_in_time}</div>`;
                  if (attendance.check_out_time) content += `<div style="font-size: 10px;">OUT: ${attendance.check_out_time}</div>`;
                } else if (isWeekendDay) {
                  className += ' weekend';
                  content += `<div style="font-size: 10px;">Weekend</div>`;
                } else {
                  content += `<div style="font-size: 10px; color: #999;">No Data</div>`;
                }
                
                return `<div class="${className}">${content}</div>`;
              }).join('')}
            </div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
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
            
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  📊 Monthly Attendance Summary
                </h1>
                <p className="text-blue-100 text-sm sm:text-base">
                  View detailed monthly attendance report and salary calculations
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    👤 Employee
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.emp_code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📅 Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📆 Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    {Array.from({length: 5}, (_, i) => (
                      <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>
                        {new Date().getFullYear() - i}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end space-x-3">
                  <button
                    onClick={fetchSummary}
                    disabled={loading || !selectedEmployee}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold disabled:from-gray-400 disabled:to-gray-500 shadow-lg transform hover:scale-105"
                  >
                    {loading ? '⏳ Loading...' : '🔍 View Summary'}
                  </button>
                  <button
                    onClick={downloadPDF}
                    disabled={!summaryData}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold disabled:from-gray-400 disabled:to-gray-500 shadow-lg transform hover:scale-105"
                  >
                    📄 Download PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl mb-6 shadow-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <strong className="block">Error:</strong>
                    <span>{error}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Content */}
            {summaryData && (
              <>
                {/* Employee Info & Summary Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="lg:col-span-2 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="text-2xl mr-2">👤</span>
                      Employee Information
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm text-blue-600 font-semibold mb-1">Name</p>
                        <p className="font-bold text-gray-900 text-lg">{summaryData.employee.name}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-sm text-green-600 font-semibold mb-1">Employee Code</p>
                        <p className="font-bold text-gray-900 text-lg">{summaryData.employee.emp_code}</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4">
                        <p className="text-sm text-purple-600 font-semibold mb-1">Phone</p>
                        <p className="font-bold text-gray-900 text-lg">{summaryData.employee.phone}</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4">
                        <p className="text-sm text-orange-600 font-semibold mb-1">Email</p>
                        <p className="font-bold text-gray-900 text-lg break-all">{summaryData.employee.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                    <h2 className="text-xl font-bold mb-6 flex items-center">
                      <span className="text-2xl mr-2">📊</span>
                      Attendance Summary
                    </h2>
                    <div className="space-y-4">
                      <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">✅ Present Days</span>
                          <span className="font-bold text-xl">{summaryData.summary.presentDays}</span>
                        </div>
                      </div>
                      <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">❌ Absent Days</span>
                          <span className="font-bold text-xl">{summaryData.summary.absentDays}</span>
                        </div>
                      </div>
                      <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">⏰ Half Days</span>
                          <span className="font-bold text-xl">{summaryData.summary.halfDays}</span>
                        </div>
                      </div>
                      <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">🏖️ Leave Days</span>
                          <span className="font-bold text-xl">{summaryData.summary.leaveDays}</span>
                        </div>
                      </div>
                      <div className="bg-white/30 backdrop-blur rounded-xl p-4 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold">💰 Effective Present</span>
                          <span className="font-bold text-2xl">{summaryData.summary.effectivePresentDays}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Calculation */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-xl border border-emerald-100 p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-3xl mr-3">💰</span>
                    Salary Calculation
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-200">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">💵</span>
                        <p className="text-sm font-bold text-emerald-600">Annual CTC</p>
                      </div>
                      <p className="font-bold text-2xl text-gray-900">₹{summaryData.salary.annualSalary.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-200">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">📈</span>
                        <p className="text-sm font-bold text-emerald-600">Monthly Gross</p>
                      </div>
                      <p className="font-bold text-2xl text-gray-900">₹{summaryData.salary.grossSalary.toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-lg text-white">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">🎯</span>
                        <p className="text-sm font-bold">Earned Salary</p>
                      </div>
                      <p className="font-bold text-3xl">₹{summaryData.salary.earnedSalary.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-200 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <span className="text-xl mr-2">📋</span>
                      Salary Breakdown
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm font-bold text-blue-600 mb-1">Basic (50% of CTC)</p>
                        <p className="font-bold text-lg text-gray-900">₹{summaryData.salary.basicSalary.toFixed(2)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4">
                        <p className="text-sm font-bold text-purple-600 mb-1">HRA (30% of Basic)</p>
                        <p className="font-bold text-lg text-gray-900">₹{summaryData.salary.hraAmount.toFixed(2)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4">
                        <p className="text-sm font-bold text-orange-600 mb-1">Daily Rate</p>
                        <p className="font-bold text-lg text-gray-900">₹{summaryData.salary.perDaySalary.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <span className="text-xl mr-2">🧾</span>
                      Deductions & Net Salary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-red-50 rounded-xl p-4">
                        <p className="text-sm font-bold text-red-600 mb-1">PF Deduction (12%)</p>
                        <p className="font-bold text-lg text-red-700">-₹{summaryData.salary.deductions.pf.toFixed(2)}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-4">
                        <p className="text-sm font-bold text-red-600 mb-1">ESI Deduction (0.75%)</p>
                        <p className="font-bold text-lg text-red-700">-₹{summaryData.salary.deductions.esi.toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white">
                        <p className="text-sm font-bold mb-1">💎 Net Salary</p>
                        <p className="font-bold text-2xl">
                          ₹{(summaryData.salary.earnedSalary - summaryData.salary.deductions.pf - summaryData.salary.deductions.esi).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Attendance Summary Table */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-xl border border-orange-200 p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-3xl mr-3">📋</span>
                    Daily Attendance & Earnings Details
                  </h2>
                  <div className="bg-white rounded-2xl p-4 shadow-inner overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                          <th className="px-4 py-3 text-left rounded-tl-lg font-bold">Date</th>
                          <th className="px-4 py-3 text-center font-bold">Day</th>
                          <th className="px-4 py-3 text-center font-bold">Status</th>
                          <th className="px-4 py-3 text-center font-bold">Check In</th>
                          <th className="px-4 py-3 text-center font-bold">Check Out</th>
                          <th className="px-4 py-3 text-center font-bold">Daily Rate</th>
                          <th className="px-4 py-3 text-center rounded-tr-lg font-bold">Day Earnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({length: summaryData.totalDays}, (_, i) => i + 1).map((day) => {
                          const dailyData = summaryData.dailyAttendance?.[day] || summaryData.attendance[day];
                          const date = new Date(selectedYear, selectedMonth - 1, day);
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                          
                          return (
                            <tr key={day} className="border-b hover:bg-orange-50 transition-colors">
                              <td className="px-4 py-3 font-medium">
                                {day.toString().padStart(2, '0')}-{selectedMonth.toString().padStart(2, '0')}-{selectedYear}
                              </td>
                              <td className="px-4 py-3 text-center font-medium">{dayName}</td>
                              <td className="px-4 py-3 text-center">
                                {dailyData?.status ? (
                                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getStatusBadge(dailyData.status)}`}>
                                    {dailyData.status}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-500">No Data</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-green-600 font-medium">
                                {dailyData?.check_in_time || '-'}
                              </td>
                              <td className="px-4 py-3 text-center text-red-600 font-medium">
                                {dailyData?.check_out_time || '-'}
                              </td>
                              <td className="px-4 py-3 text-center font-medium">
                                ₹{dailyData?.perDayRate?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-3 text-center font-bold">
                                {dailyData?.dayEarnings > 0 ? (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg font-bold">
                                    ₹{dailyData.dayEarnings.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-lg font-bold">
                                    ₹0.00
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Attendance Calendar */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-xl border border-slate-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-3xl mr-3">📅</span>
                    Attendance Calendar - {getMonthName(selectedMonth)} {selectedYear}
                  </h2>
                  <div className="bg-white rounded-2xl p-4 mb-4 shadow-inner">
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-sm font-bold text-gray-700 py-3 bg-gradient-to-b from-gray-50 to-white rounded-lg">
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({length: summaryData.totalDays}, (_, i) => i + 1).map((day) => {
                      const dailyData = summaryData.dailyAttendance?.[day] || summaryData.attendance[day];
                      const isWeekendDay = isWeekend(day, selectedMonth, selectedYear);
                      const dayName = getDayName(day, selectedMonth, selectedYear);
                      
                      return (
                        <div
                          key={day}
                          className={`
                            border-2 rounded-xl p-3 text-center min-h-[100px] transition-all duration-200
                            ${dailyData ? 'hover:shadow-xl hover:scale-105 cursor-pointer' : ''}
                            ${!dailyData?.status ? 'bg-white border-gray-200' : ''}
                            ${dailyData?.status === 'Present' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' : ''}
                            ${dailyData?.status === 'Absent' ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300' : ''}
                            ${dailyData?.status === 'Half Day' ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300' : ''}
                            ${dailyData?.status === 'Leave' ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' : ''}
                          `}
                        >
                          <div className="text-sm font-bold mb-2 text-gray-700">{day}</div>
                          {dailyData ? (
                            <div className="space-y-1">
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getStatusBadge(dailyData.status)}`}>
                                {dailyData.status === 'Half Day' ? '⏰ HD' : dailyData.status === 'Present' ? '✅ P' : dailyData.status === 'Absent' ? '❌ A' : '🏖️ L'}
                              </span>
                              <div className="text-xs text-gray-600 space-y-1">
                                {dailyData.check_in_time && (
                                  <div className="flex items-center justify-center">
                                    <span className="text-green-600 font-semibold">🔽 {dailyData.check_in_time}</span>
                                  </div>
                                )}
                                {dailyData.check_out_time && (
                                  <div className="flex items-center justify-center">
                                    <span className="text-red-600 font-semibold">🔼 {dailyData.check_out_time}</span>
                                  </div>
                                )}
                                {dailyData.dayEarnings > 0 && (
                                  <div className="flex items-center justify-center">
                                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
                                      💰 ₹{dailyData.dayEarnings.toFixed(0)}
                                    </span>
                                  </div>
                                )}
                                {dailyData.dayEarnings === 0 && dailyData.status === 'Absent' && (
                                  <div className="flex items-center justify-center">
                                    <span className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
                                      💸 ₹0
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 flex flex-col items-center justify-center h-12 space-y-1">
                              <span className="px-2 py-1 bg-gray-100 rounded-lg text-gray-500">📝 No Data</span>
                              <span className="text-xs text-gray-400">💰 ₹0</span>
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
