// src/app/attendance/admin/page.jsx
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin attendance page...</p>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Main component content
function AdminAttendanceContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [admins, setAdmins] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [attendanceData, setAttendanceData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      // Check if user has access
      if (user.role === 1) {
        router.push("/dashboard");
        return;
      }
      fetchStations();
      fetchAdmins();
    }
  }, [user, authLoading, router, selectedStation, selectedDate]);

  const fetchStations = async () => {
    try {
      const url = user ? `/api/stations?user_id=${user.id}&role=${user.role}` : '/api/stations';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.stations) {
        setStations(data.stations);
      } else if (Array.isArray(data)) {
        setStations(data);
      } else {
        setStations([]);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      setStations([]);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError("");
      
      let url = '/api/attendance/employees';
      const params = new URLSearchParams();
      if (selectedStation) params.append('station_id', selectedStation);
      
      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        // Filter for admin role (role = 5)
        const allAdmins = data.employees ? data.employees.filter(emp => emp.role === 5) : [];
        setAdmins(allAdmins);
      } else {
        setError(data.error || "Failed to fetch admins");
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  // Filter stations based on user role
  const getAvailableStations = () => {
    // Accountant, Admin - no station filter needed (can see all)
    if (user?.role === 4 || user?.role === 5) {
      return []; // Return empty array to hide station dropdown
    }
    // Team Leader - can see all stations
    if (user?.role === 3) {
      return stations; // Show all stations for team leader
    }
    else if (user?.role === 2) {
      // Incharge - only their stations
      if (!user.fs_id) return [];
      const stationIds = user.fs_id.toString().split(',').map(id => id.trim()).filter(id => id);
      return stations.filter(s => stationIds.includes(s.id.toString()));
    }
    // Staff (role 1) - only their stations
    if (user?.role === 1) {
      if (!user.fs_id) return [];
      const stationIds = user.fs_id.toString().split(',').map(id => id.trim()).filter(id => id);
      return stations.filter(s => stationIds.includes(s.id.toString()));
    }
    return [];
  };

  const availableStations = getAvailableStations();

  const filteredAdmins = admins.filter((emp, index, self) => 
    (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.emp_code.toLowerCase().includes(searchTerm.toLowerCase())) &&
    // Remove duplicates based on employee ID
    self.findIndex(e => e.id === emp.id) === index
  );

  const toggleEmployeeSelection = (employeeId) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
      const newAttendanceData = { ...attendanceData };
      delete newAttendanceData[employeeId];
      setAttendanceData(newAttendanceData);
    } else {
      newSelected.add(employeeId);
      setAttendanceData({
        ...attendanceData,
        [employeeId]: {
          status: 'Present',
          check_in_time: '',
          check_out_time: '',
          remarks: ''
        }
      });
    }
    setSelectedEmployees(newSelected);
  };

  const toggleAllAdmins = () => {
    if (selectedEmployees.size === filteredAdmins.length) {
      // Deselect all
      setSelectedEmployees(new Set());
      setAttendanceData({});
    } else {
      // Select all
      const allIds = new Set(filteredAdmins.map(emp => emp.id));
      const allData = {};
      filteredAdmins.forEach(emp => {
        allData[emp.id] = {
          status: 'Present',
          check_in_time: '',
          check_out_time: '',
          remarks: ''
        };
      });
      setSelectedEmployees(allIds);
      setAttendanceData(allData);
    }
  };

  const updateAttendanceData = (employeeId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  const handleSubmitBulkAttendance = async () => {
    if (selectedEmployees.size === 0) {
      setError("Please select at least one admin");
      return;
    }

    // Only require station selection for non-admin roles
    if (availableStations.length > 0 && !selectedStation) {
      setError("Please select a station");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const attendanceArray = Array.from(selectedEmployees).map(employeeId => ({
        employee_id: employeeId,
        ...attendanceData[employeeId]
      }));

      const response = await fetch('/api/attendance/bulk-mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance_data: attendanceArray,
          date: selectedDate,
          station_id: selectedStation || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`✅ ${data.message}`);
        setSelectedEmployees(new Set());
        setAttendanceData({});
        fetchAdmins(); // Refresh data
      } else {
        setError(data.error || "Failed to mark attendance");
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError("Failed to mark attendance");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading admin data...</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">👑 Admin Attendance</h1>
                <p className="text-gray-600 mt-1">Mark attendance for all administrators at once</p>
              </div>
              <Link
                href="/attendance"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Back to Attendance
              </Link>
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {availableStations.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Station <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select Station</option>
                    {availableStations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.station_name || station.name || `Station ${station.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Admins
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or code..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Alert Messages */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}
          </div>

          {/* Admin List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Administrators ({filteredAdmins.length})
                  </h3>
                  <div className="text-sm text-gray-600">
                    {selectedEmployees.size} selected for attendance
                  </div>
                </div>
                <button
                  onClick={toggleAllAdmins}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  {selectedEmployees.size === filteredAdmins.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredAdmins.map((employee) => (
                <div key={`${employee.id}-${employee.station_id}`} className="p-4 hover:bg-red-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.has(employee.id)}
                      onChange={() => toggleEmployeeSelection(employee.id)}
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">
                            {employee.emp_code} • {employee.station_name}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedEmployees.has(employee.id) && (
                      <div className="flex items-center gap-3">
                        <select
                          value={attendanceData[employee.id]?.status || 'Present'}
                          onChange={(e) => updateAttendanceData(employee.id, 'status', e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Half Day">Half Day</option>
                          <option value="Leave">Leave</option>
                        </select>

                        <input
                          type="time"
                          value={attendanceData[employee.id]?.check_in_time || ''}
                          onChange={(e) => updateAttendanceData(employee.id, 'check_in_time', e.target.value)}
                          placeholder="Check-in"
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-32"
                        />

                        <input
                          type="time"
                          value={attendanceData[employee.id]?.check_out_time || ''}
                          onChange={(e) => updateAttendanceData(employee.id, 'check_out_time', e.target.value)}
                          placeholder="Check-out"
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-32"
                        />

                        <input
                          type="text"
                          value={attendanceData[employee.id]?.remarks || ''}
                          onChange={(e) => updateAttendanceData(employee.id, 'remarks', e.target.value)}
                          placeholder="Remarks"
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-32"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          {selectedEmployees.size > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleSubmitBulkAttendance}
                disabled={submitting || (availableStations.length > 0 && !selectedStation)}
                className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                {submitting ? 'Processing...' : `👑 Mark Attendance for ${selectedEmployees.size} Admins`}
              </button>
            </div>
          )}
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense
export default function AdminAttendancePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminAttendanceContent />
    </Suspense>
  );
}