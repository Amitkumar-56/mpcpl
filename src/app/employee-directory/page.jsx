"use client";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { Building, Mail, Phone, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Loading component for Suspense fallback
function EmployeeDirectorySkeleton() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl mx-auto p-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main content component that uses useSearchParams or other hooks
function EmployeeDirectoryContent() {
  const { user: sessionUser, logout, loading } = useSession();
  const router = useRouter();
  const [activePage, setActivePage] = useState("Employee Directory");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredEmployees = employees.filter(employee =>
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.emp_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.phone?.includes(searchTerm)
  );

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
              Employee Directory
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              View all employees and their contact information
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search employees by name, ID, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                All Employees ({filteredEmployees.length})
              </h2>
            </div>
            
            {loadingState ? (
              <div className="p-6 text-center">
                <div className="text-gray-500">Loading employees...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.emp_code || employee.employee_id}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {employee.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      )}
                      
                      {employee.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                      
                      {employee.station_name && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Building className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{employee.station_name}</span>
                        </div>
                      )}
                      
                      {employee.role_name && (
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{employee.role_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingState && filteredEmployees.length === 0 && (
              <div className="p-6 text-center">
                <div className="text-gray-500">
                  {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
                </div>
              </div>
            )}
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function EmployeeDirectory() {
  return (
    <Suspense fallback={<EmployeeDirectorySkeleton />}>
      <EmployeeDirectoryContent />
    </Suspense>
  );
}