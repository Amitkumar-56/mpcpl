"use client";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BiDownload } from "react-icons/bi";

// Loading component for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    </div>
  );
}

// Main content component that uses hooks that might suspend
function AttendanceReportsContent() {
  const { user: sessionUser, logout, loading } = useSession();
  const router = useRouter();
  const [activePage, setActivePage] = useState("Attendance Reports");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loadingState, setLoadingState] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (loading) return;
    
    if (!sessionUser) {
      router.push("/login");
      return;
    }

    // Check if user has HR-related permissions
    const userRole = Number(sessionUser.role);
    const allowedRoles = [5, 4, 3]; // Admin, Accountant, Team Leader
    
    if (allowedRoles.includes(userRole)) {
      setIsAuthorized(true);
    } else {
      router.push("/dashboard");
    }
  }, [sessionUser, router, loading]);

  const fetchReports = async () => {
    if (!selectedMonth || !selectedYear) return;

    setLoadingState(true);
    try {
      const response = await fetch(`/api/attendance/reports?month=${selectedMonth}&year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingState(false);
    }
  };

  const fetchEmployees = async () => {
    setLoadingState(true);
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const result = await response.json();
        setEmployees(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchReports();
    }
  }, [selectedMonth, selectedYear]);

  const handleDownloadReport = async () => {
    if (!selectedMonth || !selectedYear) {
      alert('Please select month and year');
      return;
    }

    console.log('Downloading attendance report for:', { selectedMonth, selectedYear });

    try {
      const response = await fetch(`/api/attendance/reports?month=${selectedMonth}&year=${selectedYear}&download=true`);
      console.log('Download response status:', response.status);
      console.log('Download response headers:', response.headers);

      if (response.ok) {
        const blob = await response.blob();
        console.log('Blob size:', blob.size);
        
        if (blob.size === 0) {
          throw new Error('Received empty file');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${selectedMonth}_${selectedYear}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Attendance report downloaded successfully!');
      } else {
        const errorText = await response.text();
        console.error('Download error response:', errorText);
        alert(`Error downloading report: ${errorText || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`Error downloading report: ${error.message}`);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!sessionUser || !isAuthorized) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header user={sessionUser} />
        </div>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
              Attendance Reports
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              View and download monthly attendance reports
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Select Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Month</option>
                  {["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"].map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Year</option>
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleDownloadReport}
                disabled={!selectedMonth || !selectedYear || loadingState}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <BiDownload className="mr-2" />
                {loadingState ? 'Downloading...' : 'Download Report'}
              </button>
            </div>
          </div>

          {loadingState && reports.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Loading reports...</div>
              </div>
            </div>
          )}

          {!loadingState && reports.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Attendance Summary</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Present Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Half Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absent Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Days
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.id || report.emp_code}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{report.name}</div>
                          <div className="text-sm text-gray-500">{report.emp_code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.present_days || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.half_days || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.absent_days || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.leave_days || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loadingState && reports.length === 0 && selectedMonth && selectedYear && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center py-12">
                <p className="text-gray-500">No attendance data found for the selected period.</p>
              </div>
            </div>
          )}

          <Footer />
        </main>
      </div>
    </div>
  );
}

// Export the main component wrapped with Suspense
export default function AttendanceReports() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AttendanceReportsContent />
    </Suspense>
  );
}