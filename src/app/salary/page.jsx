// src/app/salary/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SalaryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [salaryData, setSalaryData] = useState([]);
  const [roleSummary, setRoleSummary] = useState([]);
  const [grandTotal, setGrandTotal] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedStation, setSelectedStation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedEmployee, setExpandedEmployee] = useState(null);

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
      fetchSalaryData();
    }
  }, [user, authLoading, router, selectedMonth, selectedStation]);

  const fetchStations = async () => {
    try {
      const url = user ? `/api/stations?user_id=${user.id}&role=${user.role}` : '/api/stations';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.stations) {
        setStations(data.stations);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchSalaryData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams();
      params.append('user_id', user.id);
      params.append('role', user.role);
      params.append('month', selectedMonth);
      if (selectedStation) {
        params.append('station_id', selectedStation);
      }

      const response = await fetch(`/api/salary/calculate?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setSalaryData(data.individual_calculations || []);
        setRoleSummary(data.role_summary || []);
        setGrandTotal(data.grand_total);
      } else {
        setError(data.error || "Failed to fetch salary data");
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
      setError("Failed to load salary data");
    } finally {
      setLoading(false);
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

  const getRoleBadge = (role) => {
    const badges = {
      1: { name: 'Staff', color: 'bg-gray-100 text-gray-800', borderColor: 'border-gray-300' },
      2: { name: 'Incharge', color: 'bg-purple-100 text-purple-800', borderColor: 'border-purple-300' },
      3: { name: 'Team Leader', color: 'bg-green-100 text-green-800', borderColor: 'border-green-300' },
      4: { name: 'Accountant', color: 'bg-yellow-100 text-yellow-800', borderColor: 'border-yellow-300' },
      5: { name: 'Admin', color: 'bg-red-100 text-red-800', borderColor: 'border-red-300' }
    };
    return badges[role] || { name: 'Unknown', color: 'bg-gray-100 text-gray-800', borderColor: 'border-gray-300' };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const toggleEmployeeDetails = (employeeId) => {
    setExpandedEmployee(expandedEmployee === employeeId ? null : employeeId);
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
                <span className="text-lg mr-1">?</span> Back
              </button>
            </div>
            
            <div className="mb-4 sm:mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  💰 Salary & Attendance Management
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                  Calculate salaries and manage employee attendance
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/attendance"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  📝 Mark Attendance
                  <span className="text-lg mr-1">?</span> Attendance
                </Link>
                <Link
                  href="/attendance/drivers"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <span className="text-lg mr-1">?</span> Drivers
                </Link>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {availableStations.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Station
                    </label>
                    <select
                      value={selectedStation}
                      onChange={(e) => setSelectedStation(e.target.value)}
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
                )}
                <div className="flex items-end">
                  <button
                    onClick={fetchSalaryData}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <span className="text-lg mr-1">?</span> Calculate Salary
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

            {/* Grand Total Summary */}
            {grandTotal && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm p-6 mb-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-4">
                    <span className="text-lg mr-1">?</span> Grand Total Summary - {selectedMonth}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-2xl font-bold">{grandTotal.total_employees}</div>
                      <div className="text-xs">Employees</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-2xl font-bold">{grandTotal.total_present_days}</div>
                      <div className="text-xs">Present Days</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-2xl font-bold">{grandTotal.total_absent_days}</div>
                      <div className="text-xs">Absent Days</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-2xl font-bold">{grandTotal.total_half_days}</div>
                      <div className="text-xs">Half Days</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-2xl font-bold">{grandTotal.total_leave_days}</div>
                      <div className="text-xs">Leave Days</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-2xl font-bold">{formatCurrency(grandTotal.total_salary)}</div>
                      <div className="text-xs">Total Salary</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Individual Employee Details */}
            {salaryData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    <span className="text-lg mr-1">?</span> Employee Salary Details - {selectedMonth}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Monthly salary calculated based on attendance</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Employee</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Total Attendance</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Present</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Absent</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Half Day</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Leave</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Daily Salary</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Monthly Salary</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {salaryData.map((employee) => (
                        <tr key={employee.employee_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                {employee.name?.charAt(0) || 'E'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{employee.name}</div>
                                <div className="text-xs text-gray-500">{employee.emp_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {employee.present_days + employee.absent_days + employee.half_days + employee.leave_days}
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
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {employee.leave_days}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(employee.salary_per_day)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-green-600">
                              {formatCurrency(employee.total_salary)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleEmployeeDetails(employee.employee_id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                            >
                              {expandedEmployee === employee.employee_id ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Employee Daily Breakdown */}
            {expandedEmployee && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <span className="text-lg mr-1">?</span> Daily Attendance Breakdown
                </h3>
                {(() => {
                  const employee = salaryData.find(emp => emp.employee_id === expandedEmployee);
                  if (!employee) return null;
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {employee.daily_breakdown && employee.daily_breakdown.map((day, index) => (
                        <div key={index} className="bg-white p-2 rounded border border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">{day.date}</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              day.status === 'Present' ? 'bg-green-100 text-green-800' :
                              day.status === 'Absent' ? 'bg-red-100 text-red-800' :
                              day.status === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {day.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-900 mt-1">
                            Salary: {formatCurrency(day.daily_salary)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
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
