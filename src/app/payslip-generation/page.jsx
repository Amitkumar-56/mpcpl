"use client";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BiDownload } from "react-icons/bi";

// Loading component for Suspense fallback
function PayslipGenerationLoading() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading payslip generator...</div>
        </div>
      </div>
    </div>
  );
}

// Main component content
function PayslipGenerationContent() {
  const { user: sessionUser, logout, loading } = useSession();
  const router = useRouter();
  const [activePage, setActivePage] = useState("Payslip Generation");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loadingState, setLoadingState] = useState(false);

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
      fetchEmployees();
    } else {
      router.push("/dashboard");
    }
  }, [sessionUser, router, loading]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const result = await response.json();
        setEmployees(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const handleGeneratePayslips = async () => {
    if (!selectedMonth || !selectedYear || selectedEmployees.length === 0) {
      alert('Please select month, year, and at least one employee');
      return;
    }

    console.log('Generating payslips for:', { selectedMonth, selectedYear, selectedEmployees });

    setLoadingState(true);
    try {
      const response = await fetch('/api/salary/payslip/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          employeeIds: selectedEmployees
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const blob = await response.blob();
        console.log('Blob size:', blob.size);
        
        if (blob.size === 0) {
          throw new Error('Received empty file');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payslips_${selectedMonth}_${selectedYear}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Payslips generated successfully!');
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Error generating payslips: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Error generating payslips: ${error.message}`);
    } finally {
      setLoadingState(false);
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
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
              Bulk Payslip Generation
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Generate and download payslips for multiple employees
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Select Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Select Employees</h2>
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`employee-${employee.id}`}
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => toggleEmployeeSelection(employee.id)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`employee-${employee.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-gray-900">{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.emp_code || employee.employee_id}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGeneratePayslips}
              disabled={loadingState}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <BiDownload className="mr-2" />
              {loadingState ? 'Generating...' : 'Generate Payslips'}
            </button>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function PayslipGeneration() {
  return (
    <Suspense fallback={<PayslipGenerationLoading />}>
      <PayslipGenerationContent />
    </Suspense>
  );
}