'use client';

import { useSession } from '@/context/SessionContext';
import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaEdit, FaEye, FaPlus, FaToggleOff, FaToggleOn, FaKey } from 'react-icons/fa';

export default function EmployeeHistory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_create: false
  });
  const { user, loading: authLoading } = useSession();
  const isAdmin = user?.role === 5;
  const router = useRouter();

  // Role names mapping
  const roleNames = {
    1: "Staff",
    2: "Incharge",
    3: "Team Leader",
    4: "Accountant",
    5: "Admin",
    6: "Driver",
    7: "Hard Operation"
  };

  // ✅ FIXED: Check permissions first
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_create: true });
      fetchEmployees();
      return;
    }

    try {
      // ✅ FIXED: Use correct API endpoint
      const response = await fetch(
        `/api/permissions?module=${encodeURIComponent('Employees')}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      if (!response.ok) {
        console.error('Permission check failed:', response.status);
        setHasPermission(false);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      console.log('🔐 Employees List Permission check:', {
        userId: user.id,
        role: user.role,
        roleName: roleNames[user.role] || 'Unknown',
        permissions: data
      });

      if (data.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: data.can_view === true || data.can_view === 1,
          can_edit: data.can_edit === true || data.can_edit === 1,
          can_create: data.can_create === true || data.can_create === 1 // ✅ Only true if explicitly can_create
        });
        fetchEmployees();
      } else {
        setHasPermission(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Permission check error:', error);
      setHasPermission(false);
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employee');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      alert('Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleStatusToggle = async (employeeId, currentStatus) => {
    // Check permission
    if (!permissions.can_edit && !isAdmin) {
      alert('You do not have permission to change employee status');
      return;
    }

    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this employee?`)) {
      return;
    }

    try {
      setUpdatingStatus(prev => ({ ...prev, [employeeId]: true }));
      
      // Use update-status API endpoint
      const res = await fetch('/api/employee/update-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employeeId,
          status: newStatus
        })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to update status');
      }

      alert(result.message || `Employee ${action}d successfully`);
      fetchEmployees(); // Refresh the list
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update employee status');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const handlePasswordChange = async (employeeId) => {
    // Check permission - only admin or user with edit permission
    if (!permissions.can_edit && !isAdmin) {
      alert('You do not have permission to change employee password');
      return;
    }

    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      if (newPassword !== null) {
        alert('Password must be at least 6 characters long');
      }
      return;
    }

    if (!confirm('Are you sure you want to change this employee\'s password?')) {
      return;
    }

    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employeeId,
          newPassword: newPassword
        })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to change password');
      }

      alert('Password changed successfully');
    } catch (err) {
      console.error('Error changing password:', err);
      alert(err.message || 'Failed to change password');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar activePage="Employees" />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (!hasPermission && !authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar activePage="Employees" />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">
                You don't have permission to view employees.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Your Role: <span className="font-semibold">{user ? roleNames[user.role] || user.role : 'Unknown'}</span>
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen hidden md:block">
        <Sidebar activePage="Employees" />
      </div>

      {/* Main Content with fixed header and footer */}
      <div className="flex flex-col flex-1 md:ml-64 ml-0"> {/* ml-64 sidebar width ke liye */}
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 md:left-64 left-0 h-16 z-10 bg-white border-b">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 mt-16 overflow-y-auto">
          <div className="p-6">
            {/* Header Section */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your employees and their permissions
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                {/* Activity Logs Button */}
                <button
                  onClick={() => router.push('/employees/activity-logs')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Activity Logs
                </button>
                
                {/* Add Employee Button - Only show if user has can_create permission (NOT can_edit) */}
                {(permissions.can_create === true || isAdmin) && (
                  <button
                    onClick={() => router.push('/employees/add')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Employee
                  </button>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base md:text-sm text-gray-600">Total Employees</p>
                    <p className="text-3xl md:text-2xl font-bold">{employees.length}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 3.136a5.5 5.5 0 00-11 0" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base md:text-sm text-gray-600">Active</p>
                    <p className="text-3xl md:text-2xl font-bold text-green-600">
                      {employees.filter(e => e.status === 1).length}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <FaToggleOn className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base md:text-sm text-gray-600">Inactive</p>
                    <p className="text-3xl md:text-2xl font-bold text-red-600">
                      {employees.filter(e => e.status === 0).length}
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <FaToggleOff className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base md:text-sm text-gray-600">Admin Users</p>
                    <p className="text-3xl md:text-2xl font-bold text-purple-600">
                      {employees.filter(e => e.role === 5).length}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7 7 0 0114.828 17H19a2 2 0 002-2v-4a2 2 0 00-2-2h-1.828c-.346 0-.682.044-1.006.127l-2.712-.734A3 3 0 0012.464 7c-.85 0-1.66.34-2.263.94l-2.349 2.35A3 3 0 005 12.828V17a2 2 0 002 2h.121z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden mb-16"> {/* mb-16 for footer space */}
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Employee List</h2>
                <p className="text-sm text-gray-600">
                  Showing {employees.length} employees
                </p>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading employees...</p>
                  </div>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 3.136a5.5 5.5 0 00-11 0" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Employees Found</h3>
                  <p className="text-gray-600 mb-6">Get started by adding your first employee.</p>
                  {(permissions.can_create === true || isAdmin) && (
                    <button
                      onClick={() => router.push('/employees/add')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                    >
                      <FaPlus className="w-4 h-4" />
                      Add First Employee
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {employees.map((emp, idx) => (
                      <div key={emp.id} className={`bg-white border rounded-lg shadow-sm p-4 ${emp.status === 0 ? 'bg-red-50 border-red-200' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                              {emp.picture && emp.picture !== 'default.png' ? (
                                <img 
                                  src={`/uploads/profiles/${emp.picture}`} 
                                  alt={emp.name}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-blue-600 font-semibold text-lg">
                                  {emp.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-lg text-gray-900 truncate">{emp.name}</div>
                              <div className="text-base text-gray-600 truncate">{emp.email}</div>
                              <div className="text-sm text-gray-500">Code: {emp.emp_code || 'N/A'}</div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              emp.status === 1 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {emp.status === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Role</div>
                            <div className="flex flex-col">
                              <span className={`px-2 py-1 rounded text-sm font-medium inline-block w-fit ${
                                emp.role === 5 
                                  ? 'bg-purple-100 text-purple-800'
                                  : emp.role === 3 || emp.role === 2 || emp.role === 4
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {roleNames[emp.role] || `Role ${emp.role}`}
                              </span>
                              {emp.role_name && (
                                <span className="text-xs text-gray-500 mt-1">{emp.role_name}</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Salary</div>
                            <div className="text-base font-semibold text-gray-900">₹{emp.salary?.toLocaleString('en-IN') || '0'}</div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Created</div>
                          <div className="text-sm text-gray-600">{formatDate(emp.created_at)}</div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center space-x-2">
                            {/* View Button */}
                            {permissions.can_view && (
                              <button
                                onClick={() => router.push(`/employees/view?id=${emp.id}`)}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                title="View Details"
                              >
                                <FaEye className="w-5 h-5" />
                              </button>
                            )}
                            
                            {/* Edit Button */}
                            {permissions.can_edit && (
                              <button
                                onClick={() => router.push(`/employees/edit?id=${emp.id}`)}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                title="Edit Employee"
                              >
                                <FaEdit className="w-5 h-5" />
                              </button>
                            )}
                            
                            {/* Password Change Button */}
                            {(permissions.can_edit || isAdmin) && (
                              <button
                                onClick={() => handlePasswordChange(emp.id)}
                                className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                title="Change Password"
                              >
                                <FaKey className="w-5 h-5" />
                              </button>
                            )}

                            {/* Status Toggle Button */}
                            {(permissions.can_edit || isAdmin) && (
                              <button
                                onClick={() => handleStatusToggle(emp.id, emp.status)}
                                disabled={updatingStatus[emp.id]}
                                className={`p-2 rounded-lg transition-colors ${
                                  emp.status === 1
                                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={emp.status === 1 ? 'Deactivate' : 'Activate'}
                              >
                                {updatingStatus[emp.id] ? (
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                ) : emp.status === 1 ? (
                                  <FaToggleOn className="w-5 h-5" />
                                ) : (
                                  <FaToggleOff className="w-5 h-5" />
                                )}
                              </button>
                            )}
                          </div>
                          
                          {!permissions.can_view && !permissions.can_edit && (
                            <span className="text-sm text-gray-400">No actions</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium text-gray-900 border-b">#</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-900 border-b">Employee Details</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-900 border-b">Role</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-900 border-b">Salary</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-900 border-b">Status</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-900 border-b">Created</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-900 border-b">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {employees.map((emp, idx) => (
                          <tr key={emp.id} className={`hover:bg-gray-50 ${emp.status === 0 ? 'bg-red-50' : ''}`}>
                            <td className="p-3 border-b">
                              <div className="text-sm text-gray-900">{idx + 1}</div>
                            </td>
                            <td className="p-3 border-b">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  {emp.picture && emp.picture !== 'default.png' ? (
                                    <img 
                                      src={`/uploads/profiles/${emp.picture}`} 
                                      alt={emp.name}
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-blue-600 font-semibold text-sm">
                                      {emp.name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-sm text-gray-900">{emp.name}</div>
                                  <div className="text-sm text-gray-600">{emp.email}</div>
                                  <div className="text-xs text-gray-500">Code: {emp.emp_code || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 border-b">
                              <div className="flex flex-col">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  emp.role === 5 
                                    ? 'bg-purple-100 text-purple-800'
                                    : emp.role === 3 || emp.role === 2 || emp.role === 4
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {roleNames[emp.role] || `Role ${emp.role}`}
                                </span>
                                {emp.role_name && (
                                  <span className="text-xs text-gray-500 mt-1">{emp.role_name}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 border-b">
                              <div className="text-sm text-gray-900">₹{emp.salary?.toLocaleString('en-IN') || '0'}</div>
                            </td>
                            <td className="p-3 border-b">
                              <div className="flex items-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  emp.status === 1 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {emp.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 border-b">
                              <div className="text-sm text-gray-600">
                                {formatDate(emp.created_at)}
                              </div>
                            </td>
                            <td className="p-3 border-b">
                              <div className="flex items-center space-x-2">
                                {/* View Button */}
                                {permissions.can_view && (
                                  <button
                                    onClick={() => router.push(`/employees/view?id=${emp.id}`)}
                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                    title="View Details"
                                  >
                                    <FaEye className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {/* Edit Button */}
                                {permissions.can_edit && (
                                  <button
                                    onClick={() => router.push(`/employees/edit?id=${emp.id}`)}
                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                    title="Edit Employee"
                                  >
                                    <FaEdit className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {/* Password Change Button */}
                                {(permissions.can_edit || isAdmin) && (
                                  <button
                                    onClick={() => handlePasswordChange(emp.id)}
                                    className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                    title="Change Password"
                                  >
                                    <FaKey className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Status Toggle Button */}
                                {(permissions.can_edit || isAdmin) && (
                                  <button
                                    onClick={() => handleStatusToggle(emp.id, emp.status)}
                                    disabled={updatingStatus[emp.id]}
                                    className={`p-2 rounded-lg transition-colors ${
                                      emp.status === 1
                                        ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                    title={emp.status === 1 ? 'Deactivate' : 'Activate'}
                                  >
                                    {updatingStatus[emp.id] ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                    ) : emp.status === 1 ? (
                                      <FaToggleOn className="w-4 h-4" />
                                    ) : (
                                      <FaToggleOff className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                
                                
                                {/* No Actions Message */}
                                {!permissions.can_view && !permissions.can_edit && (
                                  <span className="text-sm text-gray-400">No actions available</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {/* Table Footer */}
              {employees.length > 0 && (
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{employees.length}</span> of <span className="font-medium">{employees.length}</span> employees
                  </div>
                  <div className="text-sm text-gray-600">
                    Last updated: {new Date().toLocaleTimeString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Fixed Footer at bottom */}
        <div className="fixed bottom-0 right-0 md:left-64 left-0 h-16 bg-white border-t z-10">
          <Footer />
        </div>
      </div>
    </div>
  );
}
