// src/app/attendance/accountants/page.jsx
"use client";

import { Suspense, lazy, useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Loading component for Suspense
function LoadingFallback() {
  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading attendance page...</p>
      </div>
    </div>
  );
}

// Main component content
function AccountantAttendanceContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [accountants, setAccountants] = useState([]);
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
      if (user.role === 1) {
        router.push("/dashboard");
        return;
      }
      fetchStations();
      fetchAccountants();
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

  const fetchAccountants = async () => {
    try {
      setLoading(true);
      setError("");
      
      let url = '/api/attendance/employees';
      const params = new URLSearchParams();
      if (selectedStation) params.append('station_id', selectedStation);
      
      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        const allAccountants = data.employees ? data.employees.filter(emp => emp.role === 4) : [];
        setAccountants(allAccountants);
      } else {
        setError(data.error || "Failed to fetch accountants");
      }
    } catch (error) {
      console.error('Error fetching accountants:', error);
      setError("Failed to load accountant data");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStations = () => {
    if (user?.role === 4 || user?.role === 5) {
      return [];
    }
    if (user?.role === 3) {
      return stations;
    }
    else if (user?.role === 2) {
      if (!user.fs_id) return [];
      const stationIds = user.fs_id.toString().split(',').map(id => id.trim()).filter(id => id);
      return stations.filter(s => stationIds.includes(s.id.toString()));
    }
    if (user?.role === 1) {
      if (!user.fs_id) return [];
      const stationIds = user.fs_id.toString().split(',').map(id => id.trim()).filter(id => id);
      return stations.filter(s => stationIds.includes(s.id.toString()));
    }
    return [];
  };

  const availableStations = getAvailableStations();

  const filteredAccountants = accountants.filter((acc, index, self) => 
    (acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.emp_code.toLowerCase().includes(searchTerm.toLowerCase())) &&
    self.findIndex(a => a.id === acc.id) === index
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
          status: "Present",
          check_in_time: "",
          check_out_time: "",
          remarks: ""
        }
      });
    }
    setSelectedEmployees(newSelected);
  };

  const toggleAllEmployees = () => {
    const availableEmployees = filteredAccountants.filter(emp => !selectedEmployees.has(emp.id));
    
    if (availableEmployees.length === 0) {
      setSelectedEmployees(new Set());
      setAttendanceData({});
    } else {
      const newSelected = new Set(selectedEmployees);
      const newAttendanceData = { ...attendanceData };
      
      availableEmployees.forEach(emp => {
        newSelected.add(emp.id);
        if (!newAttendanceData[emp.id]) {
          newAttendanceData[emp.id] = {
            status: "Present",
            check_in_time: "",
            check_out_time: "",
            remarks: ""
          };
        }
      });
      
      setSelectedEmployees(newSelected);
      setAttendanceData(newAttendanceData);
    }
  };

  const updateAttendanceData = (employeeId, field, value) => {
    setAttendanceData({
      ...attendanceData,
      [employeeId]: {
        ...attendanceData[employeeId],
        [field]: value
      }
    });
  };

  const handleSubmitBulkAttendance = async () => {
    if (selectedEmployees.size === 0) {
      setError("Please select at least one accountant");
      return;
    }

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
        setSuccess(`Attendance processed successfully! ${data.summary.successful} accountants marked, ${data.summary.failed} failed.`);
        setSelectedEmployees(new Set());
        setAttendanceData({});
        fetchAccountants();
      } else {
        setError(data.error || "Failed to process attendance");
      }
    } catch (error) {
      console.error('Error submitting bulk attendance:', error);
      setError("Failed to process attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const markAllPresent = () => {
    const newAttendanceData = { ...attendanceData };
    selectedEmployees.forEach(employeeId => {
      newAttendanceData[employeeId] = {
        ...newAttendanceData[employeeId],
        status: "Present",
        check_in_time: new Date().toTimeString().slice(0, 5),
        check_out_time: "",
        remarks: "Bulk marked as present"
      };
    });
    setAttendanceData(newAttendanceData);
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
            
            <div className="mb-4 sm:mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  💰 Accountant Attendance
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                  Mark attendance for all accountants
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/attendance/bulk"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  👥 All Roles
                </Link>
                <Link
                  href="/attendance"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  ← Regular Attendance
                </Link>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Search Accountants
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or code..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Selected
                  </label>
                  <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-medium text-center">
                    {selectedEmployees.size} / {filteredAccountants.length}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={toggleAllEmployees}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                >
                  {filteredAccountants.filter(acc => !selectedEmployees.has(acc.id)).length === 0 ? 'Deselect All' : 'Select All'}
                </button>
                {selectedEmployees.size > 0 && (
                  <button
                    onClick={markAllPresent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    ✓ Mark All Present
                  </button>
                )}
              </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Accountants List */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading accountants...</p>
                </div>
              </div>
            ) : filteredAccountants.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="text-gray-500">
                  <p className="text-lg">No accountants found</p>
                  <p className="text-sm mt-2">Try adjusting your search or station filter</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Accountants ({filteredAccountants.length})
                    </h3>
                    <div className="text-sm text-gray-600">
                      {selectedEmployees.size} selected for attendance
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {filteredAccountants.map((accountant) => (
                    <div key={`${accountant.id}-${accountant.station_id}`} className="p-4 hover:bg-yellow-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(accountant.id)}
                          onChange={() => toggleEmployeeSelection(accountant.id)}
                          className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">💰</span>
                            <div>
                              <div className="font-medium text-gray-900">{accountant.name}</div>
                              <div className="text-sm text-gray-500">
                                {accountant.emp_code} • {accountant.station_name}
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedEmployees.has(accountant.id) && (
                          <div className="flex items-center gap-2">
                            <select
                              value={attendanceData[accountant.id]?.status || "Present"}
                              onChange={(e) => updateAttendanceData(accountant.id, 'status', e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Half Day">Half Day</option>
                              <option value="Leave">Leave</option>
                            </select>

                            <input
                              type="time"
                              value={attendanceData[accountant.id]?.check_in_time || ""}
                              onChange={(e) => updateAttendanceData(accountant.id, 'check_in_time', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              placeholder="In"
                            />

                            <input
                              type="time"
                              value={attendanceData[accountant.id]?.check_out_time || ""}
                              onChange={(e) => updateAttendanceData(accountant.id, 'check_out_time', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              placeholder="Out"
                            />

                            <input
                              type="text"
                              value={attendanceData[accountant.id]?.remarks || ""}
                              onChange={(e) => updateAttendanceData(accountant.id, 'remarks', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-32"
                              placeholder="Remarks"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedEmployees.size > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSubmitBulkAttendance}
                  disabled={submitting || (availableStations.length > 0 && !selectedStation)}
                  className="px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {submitting ? 'Processing...' : `💰 Mark Attendance for ${selectedEmployees.size} Accountants`}
                </button>
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

// Main export with Suspense
export default function AccountantAttendancePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AccountantAttendanceContent />
    </Suspense>
  );
}