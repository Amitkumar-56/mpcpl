// src/app/attendance/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AttendancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stations, setStations] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [currentMonthStats, setCurrentMonthStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dailySalaryData, setDailySalaryData] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStation, setSelectedStation] = useState("");
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: "",
    station_id: "",
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: "",
    check_out_time: "",
    status: "Present",
    remarks: ""
  });
  const [editFormData, setEditFormData] = useState({
    id: "",
    check_in_time: "",
    check_out_time: "",
    status: "Present",
    remarks: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      // Check if user has access (not staff)
      if (user.role === 1) {
        router.push("/dashboard");
        return;
      }
      fetchStations();
      fetchEmployees();
      fetchAttendance();
    }
  }, [user, authLoading, router, selectedStation, selectedDate]);

  // Refresh data when page becomes visible (after navigation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && user.role !== 1) {
        fetchAttendance();
        fetchAttendanceStatistics();
        fetchDailySalaryData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, selectedStation, selectedDate]);

  // Also refresh when page gets focus
  useEffect(() => {
    const handleFocus = () => {
      if (user && user.role !== 1) {
        fetchAttendance();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, selectedStation, selectedDate]);

  const fetchStations = async () => {
    try {
      const url = user ? `/api/stations?user_id=${user.id}&role=${user.role}` : '/api/stations';
      console.log('🔍 Fetching stations from:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('📦 Stations API Response:', data);

      if (data.success && data.stations) {
        console.log('✅ Setting stations:', data.stations);
        setStations(data.stations);
      } else if (Array.isArray(data)) {
        console.log('✅ Setting stations (direct array):', data);
        setStations(data);
      } else {
        console.log('❌ Invalid stations response:', data);
        setStations([]);
      }
    } catch (error) {
      console.error('❌ Error fetching stations:', error);
      setStations([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const url = selectedStation
        ? `/api/attendance/employees?station_id=${selectedStation}`
        : '/api/attendance/employees';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        // Use employees array from response
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError("");
      let url = `/api/attendance?date=${selectedDate}`;
      if (selectedStation) {
        url += `&station_id=${selectedStation}`;
      }
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setAttendanceRecords(data.data || []);
      } else {
        setError(data.error || "Failed to fetch attendance");
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStatistics = async () => {
    try {
      setStatsLoading(true);
      const params = new URLSearchParams();
      params.append('user_id', user.id);
      params.append('role', user.role);
      if (selectedStation) {
        params.append('station_id', selectedStation);
      }

      const response = await fetch(`/api/attendance/statistics?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAttendanceStats(data.statistics || []);
        setCurrentMonthStats(data.currentMonthSummary || []);
      } else {
        console.error('Failed to fetch statistics:', data.error);
      }
    } catch (error) {
      console.error('Error fetching attendance statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchDailySalaryData = async () => {
    try {
      setSalaryLoading(true);
      const params = new URLSearchParams();
      params.append('user_id', user.id);
      params.append('role', user.role);
      params.append('month', selectedDate);
      if (selectedStation) {
        params.append('station_id', selectedStation);
      }

      const response = await fetch(`/api/salary/calculate?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Group daily salary data by date
        const dailyData = {};
        data.individual_calculations.forEach(employee => {
          employee.daily_breakdown.forEach(day => {
            if (!dailyData[day.date]) {
              dailyData[day.date] = {
                date: day.date,
                total_salary: 0,
                employees: []
              };
            }
            dailyData[day.date].employees.push({
              name: employee.name,
              role: employee.role_name,
              daily_salary: day.daily_salary,
              status: day.status
            });
            dailyData[day.date].total_salary += day.daily_salary;
          });
        });

        // Convert to array and sort by date
        const sortedDailyData = Object.values(dailyData).sort((a, b) =>
          new Date(a.date) - new Date(b.date)
        );

        setDailySalaryData(sortedDailyData);
      } else {
        console.error('Failed to fetch daily salary data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching daily salary data:', error);
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowMarkModal(false);
        setFormData({
          employee_id: "",
          station_id: "",
          attendance_date: new Date().toISOString().split('T')[0],
          check_in_time: "",
          check_out_time: "",
          status: "Present",
          remarks: ""
        });
        fetchAttendance();
        fetchEmployees();
      } else {
        setError(data.error || "Failed to mark attendance");
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError("Failed to mark attendance");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setEditFormData({
      id: record.id,
      check_in_time: record.check_in_time || "",
      check_out_time: record.check_out_time || "",
      status: record.status || "Present",
      remarks: record.remarks || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const response = await fetch('/api/attendance/edit', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (data.success) {
        setShowEditModal(false);
        setEditingRecord(null);
        fetchAttendance();
      } else {
        setError(data.error || "Failed to update attendance");
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      setError("Failed to update attendance");
    }
  };

  const handleQuickIn = async (employeeId, stationId) => {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: employeeId,
          station_id: stationId,
          attendance_date: new Date().toISOString().split('T')[0],
          check_in_time: currentTime,
          check_out_time: "",
          status: "Present",
          remarks: ""
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchAttendance();
      } else {
        setError(data.error || "Failed to mark check-in");
      }
    } catch (error) {
      console.error('Error marking check-in:', error);
      setError("Failed to mark check-in");
    }
  };

  const handleQuickOut = async (record) => {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const response = await fetch('/api/attendance/edit', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: record.id,
          check_in_time: record.check_in_time,
          check_out_time: currentTime,
          status: record.status,
          remarks: record.remarks
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchAttendance();
      } else {
        setError(data.error || "Failed to mark check-out");
      }
    } catch (error) {
      console.error('Error marking check-out:', error);
      setError("Failed to mark check-out");
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

  const getRoleBadge = (role) => {
    const badges = {
      1: { name: 'Staff', color: 'bg-gray-100 text-gray-800', borderColor: 'border-gray-300' },
      2: { name: 'Incharge', color: 'bg-purple-100 text-purple-800', borderColor: 'border-purple-300' },
      3: { name: 'Team Leader', color: 'bg-green-100 text-green-800', borderColor: 'border-green-300' },
      4: { name: 'Accountant', color: 'bg-yellow-100 text-yellow-800', borderColor: 'border-yellow-300' },
      5: { name: 'Admin', color: 'bg-red-100 text-red-800', borderColor: 'border-red-300' },
      6: { name: 'Driver', color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-300' }
    };
    return badges[role] || { name: 'Unknown', color: 'bg-gray-100 text-gray-800', borderColor: 'border-gray-300' };
  };

  const getRoleIcon = (role) => {
    const icons = {
      1: 'Staff',
      2: 'Incharge',
      3: 'Team Leader',
      4: 'Accountant',
      5: 'Admin',
      6: 'Driver'
    };
    return icons[role] || 'Unknown';
  };

  // Calculate working hours from check-in and check-out time
  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "-";

    try {
      const [inHours, inMinutes] = checkIn.split(':').map(Number);
      const [outHours, outMinutes] = checkOut.split(':').map(Number);

      const inTime = inHours * 60 + inMinutes; // Convert to minutes
      const outTime = outHours * 60 + outMinutes; // Convert to minutes

      // Handle case where check-out is next day (e.g., night shift)
      let diffMinutes = outTime - inTime;
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Add 24 hours
      }

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      if (hours === 0 && minutes === 0) return "0 hrs";
      if (minutes === 0) return `${hours} hrs`;
      return `${hours} hrs ${minutes} mins`;
    } catch (error) {
      return "-";
    }
  };

  // Filter stations based on user role
  const getAvailableStations = () => {
    if (user?.role === 5 || user?.role === 4 || user?.role === 3) {
      // Admin, Accountant, Team Leader - can see all stations
      return stations;
    } else if (user?.role === 2) {
      // Incharge - only their stations
      if (!user.fs_id) return [];
      const stationIds = user.fs_id.toString().split(',').map(id => id.trim()).filter(id => id);
      return stations.filter(s => stationIds.includes(s.id.toString()));
    }
    return [];
  };

  const availableStations = getAvailableStations();

  // Debug logging
  console.log('Debug Info:', {
    user: user,
    stations: stations,
    availableStations: availableStations,
    selectedStation: selectedStation
  });

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="lg:ml-64 flex-1 flex flex-col h-screen overflow-hidden">
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
            <div className="mb-4 sm:mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  Attendance Management
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                  View and mark employee attendance
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => fetchAttendance()}
                    className="w-full sm:w-auto bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Refresh
                  </button>
                  <Link
                    href="/attendance/history"
                    className="w-full sm:w-auto bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    View History
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                  <Link
                    href="/attendance/dashboard"
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-medium shadow-lg"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/attendance/drivers"
                    className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Drivers
                  </Link>
                  <Link
                    href="/attendance/team-leaders"
                    className="bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  >
                    Team Leaders
                  </Link>
                  <Link
                    href="/attendance/accountants"
                    className="bg-yellow-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Accountants
                  </Link>
                  <Link
                    href="/attendance/staff"
                    className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Staff
                  </Link>
                  <Link
                    href="/attendance/incharge"
                    className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Incharge
                  </Link>
                  <Link
                    href="/attendance/admin"
                    className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Admin
                  </Link>
                  <Link
                    href="/attendance/activity-logs"
                    className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    Activity Logs
                  </Link>
                </div>
              </div>
            </div>

            {/* Role Legend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-3">Role Color Legend:</div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-300">Staff</span>
                  <span className="text-xs text-gray-600">Staff Members</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="px-2 py-1 rounded-full text-xs font-medium border bg-purple-100 text-purple-800 border-purple-300">Incharge</span>
                  <span className="text-xs text-gray-600">Supervisors</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-300">Team Leader</span>
                  <span className="text-xs text-gray-600">Team Leaders</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="px-2 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-300">Accountant</span>
                  <span className="text-xs text-gray-600">Finance Team</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="px-2 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-300">Driver</span>
                  <span className="text-xs text-gray-600">Drivers</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="px-2 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-300">Admin</span>
                  <span className="text-xs text-gray-600">Administrators</span>
                </div>
              </div>
            </div>

            {/* Daily Salary Calculation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-4">
                💰 Daily Salary Calculation - {selectedDate}
              </div>
              <div className="text-xs text-gray-600 mb-4">
                Shows day-by-day salary calculation based on attendance
              </div>

              {salaryLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 text-sm">Calculating daily salaries...</p>
                </div>
              ) : dailySalaryData.length > 0 ? (
                <div className="space-y-4">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-700">Total Salary</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-700">Employees</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dailySalaryData.map((dayData, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900 font-medium">
                              {new Date(dayData.date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-green-600">
                              ₹{dayData.total_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2">
                              <div className="space-y-1">
                                {dayData.employees.map((employee, empIndex) => (
                                  <div key={empIndex} className="flex items-center gap-2 text-xs">
                                    <span className={`px-2 py-1 rounded-full font-medium border ${employee.role === 'Staff' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                                        employee.role === 'Incharge' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                          employee.role === 'Team Leader' ? 'bg-green-100 text-green-800 border-green-300' :
                                            employee.role === 'Accountant' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                              employee.role === 'Admin' ? 'bg-red-100 text-red-800 border-red-300' :
                                                'bg-gray-100 text-gray-800 border-gray-300'
                                      }`}>
                                      {employee.name}
                                    </span>
                                    <span className="text-gray-600">
                                      {employee.status === 'Present' ? '✅' :
                                        employee.status === 'Absent' ? '❌' :
                                          employee.status === 'Half Day' ? '🕐' :
                                            employee.status === 'Leave' ? '🏖️' : '❓'}
                                    </span>
                                    <span className="text-gray-900 font-medium">
                                      ₹{employee.daily_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>No salary data available for the selected period</p>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Station
                  </label>
                  <select
                    value={selectedStation}
                    onChange={(e) => {
                      setSelectedStation(e.target.value);
                      setFormData({ ...formData, station_id: e.target.value });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Stations</option>
                    {availableStations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.station_name || station.name || `Station ${station.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setShowMarkModal(true)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Mark Attendance
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

            {/* Attendance Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading attendance...</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No attendance records found for the selected date.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Employee
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Role
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Station
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Check In
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Check Out
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Working Hours
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Marked By
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {attendanceRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div>
                                <div className="font-medium">{record.employee_name}</div>
                                <div className="text-xs text-gray-500">{record.emp_code}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadge(record.role).color} ${getRoleBadge(record.role).borderColor}`}>
                                {getRoleIcon(record.role)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {record.station_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(record.attendance_date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {record.check_in_time || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {record.check_out_time || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {calculateWorkingHours(record.check_in_time, record.check_out_time)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {record.remarks || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {record.marked_by_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {!record.check_in_time ? (
                                  <button
                                    onClick={() => handleQuickIn(record.employee_id, record.station_id)}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                    title="Mark Check-In"
                                  >
                                    In
                                  </button>
                                ) : !record.check_out_time ? (
                                  <>
                                    <button
                                      onClick={() => handleQuickOut(record)}
                                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                                      title="Mark Check-Out"
                                    >
                                      Out
                                    </button>
                                    <button
                                      onClick={() => handleEdit(record)}
                                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                      title="Edit"
                                    >
                                      Edit
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleEdit(record)}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                    title="Edit"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4 p-4">
                    {attendanceRecords.map((record) => (
                      <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-base text-gray-900">{record.employee_name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadge(record.role).color} ${getRoleBadge(record.role).borderColor}`}>
                                {getRoleIcon(record.role)}
                              </span>
                              <span className="text-xs text-gray-500">{record.emp_code}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{record.station_name}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                            {record.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Date</div>
                            <div className="font-medium">{new Date(record.attendance_date).toLocaleDateString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Working Hours</div>
                            <div className="font-medium">{calculateWorkingHours(record.check_in_time, record.check_out_time)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Check In</div>
                            <div className="font-medium">{record.check_in_time || "-"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Check Out</div>
                            <div className="font-medium">{record.check_out_time || "-"}</div>
                          </div>
                          {record.remarks && (
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500 mb-1">Remarks</div>
                              <div className="text-sm text-gray-700">{record.remarks}</div>
                            </div>
                          )}
                          {record.marked_by_name && (
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500 mb-1">Marked By</div>
                              <div className="text-sm text-gray-700">{record.marked_by_name}</div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t">
                          {!record.check_in_time ? (
                            <button
                              onClick={() => handleQuickIn(record.employee_id, record.station_id)}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            >
                              Mark Check-In
                            </button>
                          ) : !record.check_out_time ? (
                            <>
                              <button
                                onClick={() => handleQuickOut(record)}
                                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                              >
                                Mark Check-Out
                              </button>
                              <button
                                onClick={() => handleEdit(record)}
                                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEdit(record)}
                              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Mark Attendance</h2>
                <button
                  onClick={() => {
                    setShowMarkModal(false);
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleMarkAttendance}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Station <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.station_id}
                      onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Station</option>
                      {availableStations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.station_name || station.name || `Station ${station.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Employee <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      required
                      disabled={!formData.station_id}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select Employee</option>
                      {employees
                        .filter(emp => {
                          if (!formData.station_id) return true;
                          // Check if employee belongs to selected station
                          // Employees API returns station_id directly
                          return emp.station_id?.toString() === formData.station_id.toString();
                        })
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.emp_code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.attendance_date}
                      onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Check In Time
                      </label>
                      <input
                        type="time"
                        value={formData.check_in_time}
                        onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Check Out Time
                      </label>
                      <input
                        type="time"
                        value={formData.check_out_time}
                        onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Leave">Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional remarks..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMarkModal(false);
                      setError("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Mark Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Attendance</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRecord(null);
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Employee: <span className="font-semibold text-gray-900">{editingRecord.employee_name}</span></p>
                <p className="text-sm text-gray-600">Station: <span className="font-semibold text-gray-900">{editingRecord.station_name}</span></p>
                <p className="text-sm text-gray-600">Date: <span className="font-semibold text-gray-900">{new Date(editingRecord.attendance_date).toLocaleDateString('en-IN')}</span></p>
              </div>

              <form onSubmit={handleUpdateAttendance}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Check In Time
                      </label>
                      <input
                        type="time"
                        value={editFormData.check_in_time}
                        onChange={(e) => setEditFormData({ ...editFormData, check_in_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Check Out Time
                      </label>
                      <input
                        type="time"
                        value={editFormData.check_out_time}
                        onChange={(e) => setEditFormData({ ...editFormData, check_out_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Leave">Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={editFormData.remarks}
                      onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional remarks..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRecord(null);
                      setError("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

