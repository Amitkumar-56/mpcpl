// src/app/attendance/history/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [stations, setStations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    station_id: "",
    employee_id: "",
    marked_by: ""
  });

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
      fetchStations();
      fetchEmployees();
      fetchHistory();
    }
  }, [user, authLoading, router, filters]);

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (Array.isArray(data)) {
        setStations(data);
      } else if (data.success && data.data) {
        setStations(data.data);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/attendance/employees');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");
      let url = `/api/attendance/history?start_date=${filters.start_date}&end_date=${filters.end_date}`;
      if (filters.station_id) url += `&station_id=${filters.station_id}`;
      if (filters.employee_id) url += `&employee_id=${filters.employee_id}`;
      if (filters.marked_by) url += `&marked_by=${filters.marked_by}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setAttendanceHistory(data.data || []);
      } else {
        setError(data.error || "Failed to fetch attendance history");
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setError("Failed to load attendance history");
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

  const getAvailableStations = () => {
    if (user?.role === 5) {
      return stations;
    } else if (user?.role === 4 || user?.role === 3) {
      if (!user.fs_id) return stations;
      const stationIds = user.fs_id.toString().split(',').map(id => id.trim()).filter(id => id);
      return stations.filter(s => stationIds.includes(s.id.toString()));
    } else if (user?.role === 2) {
      if (!user.fs_id) return [];
      const stationIds = user.fs_id.toString().split(',').map(id => id.trim()).filter(id => id);
      return stations.filter(s => stationIds.includes(s.id.toString()));
    }
    return [];
  };

  const availableStations = getAvailableStations();

  // Get unique marked by users from history
  const markedByUsers = [...new Map(
    attendanceHistory
      .filter(record => record.marked_by)
      .map(record => [record.marked_by, {
        id: record.marked_by,
        name: record.marked_by_name,
        code: record.marked_by_code,
        role: record.marked_by_role_name
      }])
  ).values()];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto min-h-0">
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
                Attendance History & Logs
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                View complete attendance history and track who marked attendance
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Station
                  </label>
                  <select
                    value={filters.station_id}
                    onChange={(e) => setFilters({ ...filters, station_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Stations</option>
                    {availableStations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.station_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Employee
                  </label>
                  <select
                    value={filters.employee_id}
                    onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.emp_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Marked By
                  </label>
                  <select
                    value={filters.marked_by}
                    onChange={(e) => setFilters({ ...filters, marked_by: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Users</option>
                    {markedByUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading history...</p>
                </div>
              ) : attendanceHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No attendance records found for the selected filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                          Station
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                          Marked At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {attendanceHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(record.attendance_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{record.employee_name}</div>
                              <div className="text-xs text-gray-500">{record.employee_code}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {record.station_name}
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
                            {record.marked_by_name ? (
                              <div>
                                <div className="font-medium">{record.marked_by_name}</div>
                                <div className="text-xs text-gray-500">{record.marked_by_role_name}</div>
                                {record.marked_by_code && (
                                  <div className="text-xs text-gray-400">{record.marked_by_code}</div>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {record.created_at ? (
                              <div>
                                <div>{new Date(record.created_at).toLocaleDateString('en-IN')}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(record.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary */}
            {attendanceHistory.length > 0 && (
              <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Records</div>
                    <div className="text-2xl font-bold text-gray-900">{attendanceHistory.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Present</div>
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceHistory.filter(r => r.status === 'Present').length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Absent</div>
                    <div className="text-2xl font-bold text-red-600">
                      {attendanceHistory.filter(r => r.status === 'Absent').length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Half Day / Leave</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {attendanceHistory.filter(r => r.status === 'Half Day' || r.status === 'Leave').length}
                    </div>
                  </div>
                </div>
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

