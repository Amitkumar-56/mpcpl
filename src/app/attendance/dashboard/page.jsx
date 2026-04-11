// src/app/attendance/dashboard/page.jsx
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
                <p className="mt-4 text-gray-600">Loading attendance dashboard...</p>
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
function AttendanceDashboardContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    halfDayToday: 0,
    leaveToday: 0
  });
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      if (user.role === 1) {
        router.push("/dashboard");
        return;
      }
      fetchTodayStats();
    }
  }, [user, authLoading, router]);

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?date=${today}`);
      const data = await response.json();
      
      if (data.success) {
        const records = data.data || [];
        const stats = {
          totalEmployees: records.length,
          presentToday: records.filter(r => r.status === 'Present').length,
          absentToday: records.filter(r => r.status === 'Absent').length,
          halfDayToday: records.filter(r => r.status === 'Half Day').length,
          leaveToday: records.filter(r => r.status === 'Leave').length
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      setMonthlyLoading(true);
      setMonthlyError(null);
      const params = new URLSearchParams();
      params.append('user_id', user.id);
      params.append('role', user.role);
      params.append('month', selectedMonth);

      const response = await fetch(`/api/salary/calculate?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        // Process monthly stats for each employee
        const employeeStats = data.individual_calculations.map(employee => ({
          employee_id: employee.employee_id,
          name: employee.name,
          role_name: employee.role_name,
          present_days: employee.present_days,
          absent_days: employee.absent_days,
          half_days: employee.half_days,
          leave_days: employee.leave_days,
          total_salary: employee.total_salary,
          daily_salary: employee.daily_salary,
          monthly_breakdown: employee.daily_breakdown || []
        }));

        setMonthlyStats(employeeStats);
      } else {
        console.error('Failed to fetch monthly stats:', data.error);
        setMonthlyError(data.error || 'Failed to load monthly data');
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      setMonthlyError('Network error: Unable to connect to server');
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedMonth) {
      fetchMonthlyStats();
    }
  }, [user, selectedMonth]);

  const generateSalarySlip = (employee) => {
    // Generate salary slip content
    const slipContent = `
SALARY SLIP - ${selectedMonth}
=========================================
Employee Name: ${employee.name}
Role: ${employee.role_name}
Employee ID: ${employee.employee_id}

Attendance Summary:
-------------------
Present Days: ${employee.present_days}
Absent Days: ${employee.absent_days}
Half Days: ${employee.half_days}
Leave Days: ${employee.leave_days}

Salary Calculation:
------------------
Daily Salary: ${employee.daily_salary.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    })}
Present Days Salary: ${(employee.present_days * employee.daily_salary).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    })}
Half Days Salary: ${(employee.half_days * employee.daily_salary * 0.5).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    })}
Leave Days Salary: ${(employee.leave_days * employee.daily_salary * 0.5).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    })}

Total Monthly Salary: ${employee.total_salary.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    })}
=========================================
Generated on: ${new Date().toLocaleDateString('en-IN')}
    `.trim();

    // Create and download the salary slip
    const blob = new Blob([slipContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary_slip_${employee.name}_${selectedMonth}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const viewDailyBreakdown = (employee) => {
    // Create a modal or navigate to a detailed view
    const breakdownContent = employee.monthly_breakdown.map(day => 
      `${day.date}: ${day.status} - ${day.daily_salary.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      })}`
    ).join('\n');

    alert(`Daily Attendance Breakdown for ${employee.name}\n\n${breakdownContent}`);
  };

  const attendanceOptions = [
    {
      title: "🚛 Drivers",
      description: "Mark attendance for all drivers at once",
      href: "/attendance/drivers",
      color: "blue",
      icon: "🚛",
      features: ["Bulk selection", "Quick mark present/absent", "Time tracking", "Remarks"]
    },
    {
      title: "👥 Team Leaders",
      description: "Manage team leader attendance efficiently",
      href: "/attendance/team-leaders",
      color: "emerald",
      icon: "👥",
      features: ["Role-based filtering", "Bulk operations", "Station management", "Status tracking"]
    },
    {
      title: "💰 Accountants",
      description: "Track accountant attendance and work hours",
      href: "/attendance/accountants",
      color: "yellow",
      icon: "💰",
      features: ["Financial team tracking", "Work hour calculation", "Leave management", "Reporting"]
    },
    {
      title: "👤 Staff",
      description: "Manage staff attendance and work schedules",
      href: "/attendance/staff",
      color: "gray",
      icon: "👤",
      features: ["Staff scheduling", "Time tracking", "Leave management", "Performance tracking"]
    },
    {
      title: "👨‍✈️ Incharge",
      description: "Supervisor attendance and management",
      href: "/attendance/incharge",
      color: "purple",
      icon: "👨‍✈️",
      features: ["Supervisor tracking", "Station management", "Team oversight", "Reporting"]
    },
    {
      title: "👑 Admin",
      description: "Administrator attendance and management",
      href: "/attendance/admin",
      color: "red",
      icon: "👑",
      features: ["Admin tracking", "System oversight", "Full access", "Management"]
    },
    {
      title: "📝 Regular Attendance",
      description: "Traditional attendance marking system",
      href: "/attendance",
      color: "purple",
      icon: "📝",
      features: ["Individual marking", "Edit capabilities", "History view", "Detailed records"]
    },
    {
      title: "📊 Reports & Analytics",
      description: "View attendance reports and analytics",
      href: "/admin/attendance-reports",
      color: "indigo",
      icon: "📊",
      features: ["Attendance reports", "Analytics dashboard", "Export data", "Trends analysis"]
    }
  ];

  const StatCard = ({ title, value, color, icon }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-800 border-blue-200",
      green: "bg-green-50 text-green-800 border-green-200",
      red: "bg-red-50 text-red-800 border-red-200",
      yellow: "bg-yellow-50 text-yellow-800 border-yellow-200",
      purple: "bg-purple-50 text-purple-800 border-purple-200"
    };

    return (
      <div className={`${colorClasses[color]} border rounded-xl p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </div>
    );
  };

  const AttendanceCard = ({ option }) => {
    const colorClasses = {
      blue: "bg-blue-600 hover:bg-blue-700 border-blue-200",
      emerald: "bg-emerald-600 hover:bg-emerald-700 border-emerald-200",
      yellow: "bg-yellow-600 hover:bg-yellow-700 border-yellow-200",
      green: "bg-green-600 hover:bg-green-700 border-green-200",
      purple: "bg-purple-600 hover:bg-purple-700 border-purple-200",
      indigo: "bg-indigo-600 hover:bg-indigo-700 border-indigo-200",
      red: "bg-red-600 hover:bg-red-700 border-red-200",
      gray: "bg-gray-600 hover:bg-gray-700 border-gray-200"
    };

    return (
      <Link href={option.href} className="block">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{option.icon}</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{option.description}</p>
              <div className="space-y-1">
                {option.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${colorClasses[option.color]}`}>
              Open →
            </span>
          </div>
        </div>
      </Link>
    );
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
            
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                🎯 Attendance Dashboard
              </h1>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Complete attendance management system with bulk operations and role-based access
              </p>
            </div>

            {/* Today's Stats */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Overview</h2>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-gray-100 rounded-xl p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatCard title="Total Employees" value={stats.totalEmployees} color="blue" icon="👥" />
                  <StatCard title="Present" value={stats.presentToday} color="green" icon="✅" />
                  <StatCard title="Absent" value={stats.absentToday} color="red" icon="❌" />
                  <StatCard title="Half Day" value={stats.halfDayToday} color="yellow" icon="⏰" />
                  <StatCard title="Leave" value={stats.leaveToday} color="purple" icon="🏖️" />
                </div>
              )}
            </div>

            {/* Monthly Attendance & Salary Tracking */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Monthly Attendance & Salary</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={fetchMonthlyStats}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {monthlyLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading monthly data...</p>
                  </div>
                </div>
              ) : monthlyError ? (
                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
                  <div className="text-center">
                    <div className="text-red-500 text-4xl mb-4">!</div>
                    <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
                    <p className="text-red-600 mb-4">{monthlyError}</p>
                    <button
                      onClick={fetchMonthlyStats}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : monthlyStats.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Employees</p>
                        <p className="text-xl font-bold text-gray-900">{monthlyStats.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Present Days</p>
                        <p className="text-xl font-bold text-green-600">
                          {monthlyStats.reduce((sum, emp) => sum + emp.present_days, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Absent Days</p>
                        <p className="text-xl font-bold text-red-600">
                          {monthlyStats.reduce((sum, emp) => sum + emp.absent_days, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Salary</p>
                        <p className="text-xl font-bold text-blue-600">
                          {monthlyStats.reduce((sum, emp) => sum + emp.total_salary, 0).toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 2
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Employee</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Role</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Present</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Absent</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Half Day</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Leave</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Daily Salary</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Monthly Salary</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {monthlyStats.map((employee, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                  {employee.name.charAt(0)}
                                </div>
                                <span className="font-medium text-gray-900">{employee.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                employee.role_name === 'Staff' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                                employee.role_name === 'Incharge' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                employee.role_name === 'Team Leader' ? 'bg-green-100 text-green-800 border-green-300' :
                                employee.role_name === 'Accountant' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                employee.role_name === 'Admin' ? 'bg-red-100 text-red-800 border-red-300' :
                                'bg-gray-100 text-gray-800 border-gray-300'
                              }`}>
                                {employee.role_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {employee.present_days}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {employee.absent_days}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {employee.half_days}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {employee.leave_days}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-gray-900">
                                {employee.daily_salary.toLocaleString('en-IN', {
                                  style: 'currency',
                                  currency: 'INR',
                                  minimumFractionDigits: 2
                                })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-bold text-green-600">
                                {employee.total_salary.toLocaleString('en-IN', {
                                  style: 'currency',
                                  currency: 'INR',
                                  minimumFractionDigits: 2
                                })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <button
                                  onClick={() => generateSalarySlip(employee)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                                >
                                  Slip
                                </button>
                                <button
                                  onClick={() => viewDailyBreakdown(employee)}
                                  className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs font-medium"
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <div className="text-center text-gray-500">
                    <p>No attendance data available for {selectedMonth}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {attendanceOptions.map((option, index) => (
                  <AttendanceCard key={index} option={option} />
                ))}
              </div>
            </div>

            {/* Features Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🌟 Key Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Bulk Operations</h3>
                    <p className="text-sm text-gray-600">Mark attendance for multiple employees at once</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Role-Based Access</h3>
                    <p className="text-sm text-gray-600">Different interfaces for different employee roles</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Time Tracking</h3>
                    <p className="text-sm text-gray-600">Check-in and check-out time management</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Station Management</h3>
                    <p className="text-sm text-gray-600">Filter and manage by work stations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Audit Trail</h3>
                    <p className="text-sm text-gray-600">Complete audit log of all attendance changes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Mobile Friendly</h3>
                    <p className="text-sm text-gray-600">Works seamlessly on all devices</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">📈 Recent Activity</h2>
                <Link
                  href="/attendance/activity-logs"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All →
                </Link>
              </div>
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">📊 Activity tracking enabled</p>
                <p className="text-sm">All attendance changes are logged and tracked</p>
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

// Main export with Suspense
export default function AttendanceDashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AttendanceDashboardContent />
    </Suspense>
  );
}