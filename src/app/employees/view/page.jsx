'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from "react";
import Link from 'next/link';

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
        <div className="sticky top-0 h-screen">
          <Sidebar activePage="Employees" />
        </div>
        <div className="flex flex-col flex-1 w-full">
          <div className="sticky top-0 z-10">
            <Header />
          </div>
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
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
        <div className="sticky top-0 h-screen">
          <Sidebar activePage="Employees" />
        </div>
        <div className="flex flex-col flex-1 w-full">
          <div className="sticky top-0 z-10">
            <Header />
          </div>
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Link href="/employees" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
      <div className="sticky top-0 h-screen">
        <Sidebar activePage="Employees" />
      </div>

      <div className="flex flex-col flex-1 w-full">
        <div className="sticky top-0 z-10">
          <Header />
        </div>

        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()} 
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold">Employee Details</h1>
            </div>
            <Link
              href={`/employees/edit?id=${id}`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Edit
            </Link>
          </div>

          {employee && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Image */}
                <div className="md:col-span-2 flex justify-center mb-6">
                  {employee.picture ? (
                    <img 
                      src={`/uploads/${employee.picture}`} 
                      alt={employee.name} 
                      className="h-32 w-32 object-cover rounded-full border-4 border-gray-200"
                    />
                  ) : (
                    <div className="h-32 w-32 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-4xl">{employee.name?.charAt(0)?.toUpperCase() || 'E'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{employee.emp_code || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{employee.name || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md break-words">{employee.email || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{employee.phone || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{employee.phonealt || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{getRoleName(employee.role)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md font-semibold">
                    ₹{employee.salary ? parseFloat(employee.salary).toLocaleString('en-IN') : '0'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="bg-gray-50 px-3 py-2 rounded-md">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md break-words">{employee.address || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{employee.city || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{employee.region || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{employee.country || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postbox</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{employee.postbox || 'N/A'}</p>
                </div>

                {employee.account_details && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Details</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md break-words">{employee.account_details}</p>
                  </div>
                )}

                {employee.created_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {new Date(employee.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>

              {/* Permissions Section */}
              {permissions.length > 0 && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Module Permissions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {permissions.map((perm, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{perm.module_name}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${perm.can_view ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            <span className={perm.can_view ? 'text-gray-900' : 'text-gray-400'}>View</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${perm.can_edit ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            <span className={perm.can_edit ? 'text-gray-900' : 'text-gray-400'}>Edit</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${perm.can_delete ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            <span className={perm.can_delete ? 'text-gray-900' : 'text-gray-400'}>Delete</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <div className="sticky bottom-0">
          <Footer />
        </div>
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

