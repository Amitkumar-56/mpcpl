// src/app/admin/attendance-reports/page.jsx
"use client";

import { Suspense, useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Loading component for Suspense
function LoadingFallback() {
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
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading admin reports...</p>
              </div>
            </div>
          </div>
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main component content
function AdminReportsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStation, setSelectedStation] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const downloadExcel = () => {
    // Create CSV content for Excel
    const headers = ['Employee Name', 'Employee Code', 'Role', 'Month', 'Total Attendance', 'Present', 'Absent', 'Half Day', 'Leave'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.employee_name || '',
        item.emp_code || '',
        item.role_name || '',
        item.month || '',
        item.total_attendance || 0,
        item.present_count || 0,
        item.absent_count || 0,
        item.half_day_count || 0,
        item.leave_count || 0
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create and download Excel file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      // Only admin can access this page
      if (user.role !== 5) {
        router.push("/dashboard");
        return;
      }
      fetchAttendanceData();
    }
  }, [user?.id, authLoading, selectedMonth, selectedRole, selectedStation]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('user_id', user.id);
      params.append('role', user.role);
      params.append('month', selectedMonth);
      if (selectedStation) {
        params.append('station_id', selectedStation);
      }

      const response = await fetch(`/api/attendance/statistics?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setAttendanceData(data.statistics || []);
      } else {
        console.error('Failed to fetch attendance data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverClick = (driver) => {
    setSelectedDriver(driver);
    // Generate detailed report for this driver
    generateDriverReport(driver);
  };

  const generateDriverReport = (driver) => {
    // Create HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Attendance Report - ${driver.employee_name}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
            color: #333;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .header h1 { 
            color: #2563eb; 
            margin: 0;
            font-size: 24px;
        }
        .info-section { 
            margin: 20px 0; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 5px;
        }
        .info-section h3 { 
            color: #1f2937; 
            margin-top: 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin: 20px 0;
        }
        .summary-item { 
            padding: 10px; 
            background: #fff; 
            border: 1px solid #e5e7eb; 
            border-radius: 5px;
            text-align: center;
        }
        .present { background: #dcfce7; color: #166534; }
        .absent { background: #fef2f2; color: #dc2626; }
        .half-day { background: #fef3c7; color: #d97706; }
        .leave { background: #dbeafe; color: #2563eb; }
        .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 12px; 
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        @media print {
            body { margin: 10px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>EMPLOYEE ATTENDANCE REPORT</h1>
        <p><strong>Month:</strong> ${selectedMonth}</p>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
    </div>

    <div class="info-section">
        <h3>Employee Information</h3>
        <p><strong>Name:</strong> ${driver.employee_name}</p>
        <p><strong>Role:</strong> ${driver.role_name}</p>
        <p><strong>Employee ID:</strong> ${driver.employee_id || 'N/A'}</p>
        <p><strong>Employee Code:</strong> ${driver.emp_code || 'N/A'}</p>
    </div>

    <div class="info-section">
        <h3>Attendance Summary</h3>
        <div class="summary-grid">
            <div class="summary-item present">
                <strong>Present Days</strong><br>
                ${driver.present_count || 0}
            </div>
            <div class="summary-item absent">
                <strong>Absent Days</strong><br>
                ${driver.absent_count || 0}
            </div>
            <div class="summary-item half-day">
                <strong>Half Days</strong><br>
                ${driver.half_day_count || 0}
            </div>
            <div class="summary-item leave">
                <strong>Leave Days</strong><br>
                ${driver.leave_count || 0}
            </div>
        </div>
        <p><strong>Total Attendance Records:</strong> ${driver.total_attendance || 0}</p>
        <p><strong>Attendance Rate:</strong> ${driver.total_attendance > 0 ? Math.round((driver.present_count / driver.total_attendance) * 100) : 0}%</p>
    </div>

    <div class="info-section">
        <h3>Performance Metrics</h3>
        <p><strong>Punctuality Score:</strong> ${driver.present_count > (driver.absent_count + driver.half_day_count) ? 'Good' : 'Needs Improvement'}</p>
        <p><strong>Overall Status:</strong> ${driver.present_count > driver.absent_count ? 'Active' : 'Inactive'}</p>
    </div>

    ${driver.monthly_breakdown ? `
    <div class="info-section">
        <h3>Monthly Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Date</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Status</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Records</th>
                </tr>
            </thead>
            <tbody>
                ${driver.monthly_breakdown.map(day => `
                    <tr>
                        <td style="border: 1px solid #d1d5db; padding: 8px;">${day.date}</td>
                        <td style="border: 1px solid #d1d5db; padding: 8px;">${day.status}</td>
                        <td style="border: 1px solid #d1d5db; padding: 8px;">${day.attendance_count || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p>This report was generated automatically by the Attendance Management System</p>
        <p>For any queries, please contact the system administrator</p>
    </div>
</body>
</html>
    `.trim();

    // Create a new window and print as PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    printWindow.onload = function() {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  const filteredData = selectedRole === 'all' 
    ? attendanceData 
    : attendanceData.filter(item => item.role_name === selectedRole);

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
                &larr;
              </button>
            </div>
            
            <div className="mb-4 sm:mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  👑 Admin Attendance Reports
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                  Complete attendance data for all employees with detailed filtering
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/salary"
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                >
                  <span className="text-lg mr-1">💰</span> Salary Management
                </Link>
                <Link
                  href="/attendance/bulk"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <span className="text-lg mr-1">👥</span> All Roles
                </Link>
                <Link
                  href="/attendance"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <span className="text-lg mr-1">📝</span> Regular Attendance
                </Link>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                    Month
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:px-4 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                    Role Filter
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:px-4 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="Staff">Staff</option>
                    <option value="Incharge">Incharge</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="Driver">Driver</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                    Station
                  </label>
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:px-4 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Stations</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 sm:gap-3">
                  <button
                    onClick={downloadExcel}
                    disabled={loading || filteredData.length === 0}
                    className="w-full sm:w-auto px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-xs sm:text-sm"
                  >
                    📊 Download Excel
                  </button>
                  <button
                    onClick={fetchAttendanceData}
                    disabled={loading}
                    className="w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-xs sm:text-sm"
                  >
                    {loading ? 'Loading...' : '🔄 Refresh Data'}
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Attendance Data ({filteredData.length} records)
                  </h2>
                  <div className="text-sm text-gray-600">
                    Click on any employee name to generate detailed report
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading attendance data...</p>
                </div>
              ) : filteredData.length > 0 ? (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Employee</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Role</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Month</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Total</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Present</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Absent</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Half Day</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Leave</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredData.map((item, index) => (
                          <tr key={`${item.employee_id}-${item.month}-${index}`} className="hover:bg-gray-50">
                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                              <button
                                onClick={() => handleDriverClick(item)}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left text-xs sm:text-sm"
                                title={`Click to generate detailed report for ${item.employee_name}`}
                              >
                                {item.employee_name}
                              </button>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                item.role_name === 'Staff' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                                item.role_name === 'Incharge' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                item.role_name === 'Team Leader' ? 'bg-green-100 text-green-800 border-green-300' :
                                item.role_name === 'Driver' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                item.role_name === 'Accountant' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                item.role_name === 'Admin' ? 'bg-red-100 text-red-800 border-red-300' :
                                'bg-gray-100 text-gray-800 border-gray-300'
                              }`}>
                                {item.role_name}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 text-xs sm:text-sm">{item.month}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-medium text-gray-900 text-xs sm:text-sm">{item.total_attendance || 0}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {item.present_count || 0}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {item.absent_count || 0}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {item.half_day_count || 0}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {item.leave_count || 0}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                              <button
                                onClick={() => handleDriverClick(item)}
                                className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                              >
                                📊 Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>No attendance data available for the selected criteria.</p>
                  <p className="mt-2">Try adjusting filters or mark some attendance first.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense
export default function AdminReportsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminReportsContent />
    </Suspense>
  );
}
