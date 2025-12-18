'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from "react";

function ViewEmployeeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (id) {
        fetchEmployee();
      } else {
        setError('Employee ID is required');
        setLoading(false);
      }
    }
  }, [id, user, authLoading]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/employee/edit?id=${id}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setEmployee(result.data);
        if (result.data.permissions) {
          setPermissions(result.data.permissions);
        }
      } else {
        setError(result.error || 'Failed to load employee data');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading employee data');
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (role) => {
    const roles = {
      1: 'Staff',
      2: 'Incharge',
      3: 'Team Leader',
      4: 'Accountant',
      5: 'Admin',
      6: 'Driver'
    };
    return roles[role] || 'Unknown';
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar activePage="Employees" />
        </div>
        <div className="flex-1 lg:ml-64">
          <div className="fixed top-0 left-0 lg:left-64 right-0 z-40">
            <Header />
          </div>
          <main className="pt-16 lg:pt-20 min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading employee data...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar activePage="Employees" />
        </div>
        <div className="flex-1 lg:ml-64">
          <div className="fixed top-0 left-0 lg:left-64 right-0 z-40">
            <Header />
          </div>
          <main className="pt-16 lg:pt-20 min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-4">
              <p className="text-red-600 mb-4">{error}</p>
              <Link href="/employees" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
                Back to Employees
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed Sidebar - Only on desktop */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar activePage="Employees" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 w-full">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="pt-16 lg:pt-20 min-h-screen overflow-y-auto">
          <div className="p-4 md:p-6">
            {/* Mobile Back Button */}
            <div className="lg:hidden mb-4">
              <button 
                onClick={() => router.back()} 
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center">
                <button 
                  onClick={() => router.back()} 
                  className="hidden lg:flex mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Employee Details</h1>
              </div>
              <Link
                href={`/employees/edit?id=${id}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center font-medium transition-colors"
              >
                Edit Employee
              </Link>
            </div>

            {employee && (
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                {/* Profile Image */}
                <div className="flex flex-col items-center mb-6 md:mb-8">
                  <div className="relative mb-4">
                    {employee.picture ? (
                      <img 
                        src={`/uploads/${employee.picture}`} 
                        alt={employee.name} 
                        className="h-24 w-24 md:h-32 md:w-32 object-cover rounded-full border-4 border-gray-200"
                      />
                    ) : (
                      <div className="h-24 w-24 md:h-32 md:w-32 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-400 text-3xl md:text-4xl font-semibold">
                          {employee.name?.charAt(0)?.toUpperCase() || 'E'}
                        </span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">{employee.name || 'N/A'}</h2>
                  <p className="text-gray-600 mt-1">{employee.emp_code || 'N/A'}</p>
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-gray-900 text-sm md:text-base break-words font-medium">{employee.email || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Phone</label>
                    <p className="text-gray-900 text-sm md:text-base font-medium">{employee.phone || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Alternate Phone</label>
                    <p className="text-gray-900 text-sm md:text-base font-medium">{employee.phonealt || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Role</label>
                    <p className="text-gray-900 text-sm md:text-base font-medium">{getRoleName(employee.role)}</p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Salary</label>
                    <p className="text-gray-900 text-sm md:text-base font-semibold text-green-600">
                      ₹{employee.salary ? parseFloat(employee.salary).toLocaleString('en-IN') : '0'}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Status</label>
                    <div>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        employee.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">City</label>
                    <p className="text-gray-900 text-sm md:text-base font-medium">{employee.city || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Region</label>
                    <p className="text-gray-900 text-sm md:text-base font-medium">{employee.region || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg sm:col-span-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Address</label>
                    <p className="text-gray-900 text-sm md:text-base font-medium break-words">{employee.address || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Country</label>
                    <p className="text-gray-900 text-sm md:text-base font-medium">{employee.country || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Postbox</label>
                    <p className="text-gray-900 text-sm md:text-base font-medium">{employee.postbox || 'N/A'}</p>
                  </div>

                  {employee.account_details && (
                    <div className="bg-gray-50 p-3 md:p-4 rounded-lg sm:col-span-2">
                      <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Account Details</label>
                      <p className="text-gray-900 text-sm md:text-base font-medium break-words">{employee.account_details}</p>
                    </div>
                  )}

                  {employee.created_at && (
                    <div className="bg-gray-50 p-3 md:p-4 rounded-lg sm:col-span-2">
                      <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Created At</label>
                      <p className="text-gray-900 text-sm md:text-base font-medium">
                        {new Date(employee.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Permissions Section */}
                {permissions.length > 0 && (
                  <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 md:mb-6">Module Permissions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {permissions.map((perm, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">{perm.module_name}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">View</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                perm.can_view ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {perm.can_view ? 'Allowed' : 'Not Allowed'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Edit</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                perm.can_edit ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {perm.can_edit ? 'Allowed' : 'Not Allowed'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Delete</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                perm.can_delete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {perm.can_delete ? 'Allowed' : 'Not Allowed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Fixed Footer at bottom */}
          <div className="sticky top-[100vh] mt-8">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ViewEmployeePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ViewEmployeeContent />
    </Suspense>
  );
}