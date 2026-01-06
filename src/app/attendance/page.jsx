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
  }, [user, authLoading, router, selectedDate, selectedStation]);

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
            <div className="mb-4 sm:mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  Attendance Management
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                  View and mark employee attendance
                </p>
              </div>
              <Link
                href="/attendance/history"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                View History & Logs
              </Link>
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
                        {station.station_name}
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                          Employee
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                          {station.station_name}
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

