// src/app/hr-letters/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HRLetters() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [letterPreview, setLetterPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const letterTypes = [
    { id: 'offer', name: 'Offer Letter', description: 'Job offer for new candidates' },
    { id: 'appointment', name: 'Appointment Letter', description: 'Confirmation of employment' },
    { id: 'joining', name: 'Joining Letter', description: 'Welcome letter for new employees' },
    { id: 'agreement', name: 'Employment Agreement', description: 'Terms and conditions of employment' },
    { id: 'salary', name: 'Salary Slip', description: 'Monthly salary statement', requiresMonth: true },
    { id: 'termination', name: 'Termination Letter', description: 'Employment termination notice' },
    { id: 'relieving', name: 'Relieving Letter', description: 'Experience and relieving certificate' }
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      // Check if user has access
      if (![3, 4, 5].includes(user.role)) {
        router.push("/dashboard");
        return;
      }
      fetchEmployees();
    }
  }, [user, authLoading, router]);

  const fetchEmployees = async () => {
    try {
      console.log('🔍 Fetching employees for HR Letters...');
      const response = await fetch('/api/employees');
      console.log('📦 Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Employees API Response:', data);
      
      if (data.success) {
        setEmployees(data.data || []);
      } else {
        console.error('❌ API Error:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
    }
  };

  const handleGenerateLetter = async (letterType) => {
    if (!selectedEmployee) {
      setError("Please select an employee");
      return;
    }

    if (letterType === 'salary' && (!selectedMonth || !selectedYear)) {
      setError("Please select month and year for salary slip");
      return;
    }

    try {
      setLoading(true);
      setError("");

      let url = `/api/hr-letters?type=${letterType}&employee_id=${selectedEmployee}`;
      if (letterType === 'salary') {
        url += `&month=${selectedMonth}&year=${selectedYear}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setLetterPreview(data.data);
        setShowPreviewModal(true);
      } else {
        setError(data.error || "Failed to generate letter");
      }
    } catch (error) {
      console.error('Error generating letter:', error);
      setError("Failed to generate letter");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!letterPreview) return;

    // Create a new window with the letter content
    const printWindow = window.open('', '_blank');
    printWindow.document.write(letterPreview.content);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const getLetterIcon = (letterType) => {
    const icons = {
      'offer': '📄',
      'appointment': '✅',
      'joining': '🎉',
      'agreement': '📋',
      'salary': '💰',
      'termination': '❌',
      'relieving': '🎓'
    };
    return icons[letterType] || '📄';
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
            
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                HR Letters Generator
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                Generate professional HR documents with PDF download
              </p>
            </div>

            {/* Employee Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Select Employee</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.emp_code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Month (for Salary Slip)
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Year (for Salary Slip)
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({length: 5}, (_, i) => (
                      <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>
                        {new Date().getFullYear() - i}
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

            {/* Letter Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {letterTypes.map((letter) => (
                <div
                  key={letter.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{getLetterIcon(letter.id)}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{letter.name}</h3>
                      <p className="text-sm text-gray-600 mb-4">{letter.description}</p>
                      {letter.requiresMonth && (
                        <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded mb-3">
                          Requires month and year selection
                        </div>
                      )}
                      <button
                        onClick={() => handleGenerateLetter(letter.id)}
                        disabled={loading || !selectedEmployee}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Generating...' : 'Generate Letter'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
              <h3 className="text-lg font-bold text-blue-900 mb-3">How to Use</h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. Select an employee from the dropdown list</li>
                <li>2. For salary slips, also select the month and year</li>
                <li>3. Click on the desired letter type to generate</li>
                <li>4. Preview the generated letter in the modal</li>
                <li>5. Download as PDF using the print function</li>
              </ol>
            </div>
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>

      {/* Letter Preview Modal */}
      {showPreviewModal && letterPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Letter Preview</h2>
                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      setLetterPreview(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div 
                className="p-8"
                dangerouslySetInnerHTML={{ __html: letterPreview.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
