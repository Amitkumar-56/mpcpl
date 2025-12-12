'use client';

import { useSession } from '@/context/SessionContext';
import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaEdit, FaEye, FaToggleOff, FaToggleOn, FaTrash } from 'react-icons/fa';

export default function EmployeeHistory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState({});
  const { user } = useSession();
  const isAdmin = user?.role === 5;
  const router = useRouter();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employee');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await fetch(`/api/employee?id=${id}`, { method: 'DELETE' });
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusToggle = async (employeeId, currentStatus) => {
    if (!isAdmin) {
      alert('Only admin can change employee status');
      return;
    }

    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this employee?`)) {
      return;
    }

    try {
      setUpdatingStatus(prev => ({ ...prev, [employeeId]: true }));
      
      const res = await fetch('/api/employee/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ employeeId, status: newStatus })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      alert(result.message || `Employee ${action}d successfully`);
      fetchEmployees();
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update employee status');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="md:sticky md:top-0 md:h-screen w-full md:w-64 z-20">
        <Sidebar activePage="Employees" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="sticky top-0 z-10">
          <Header />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
            <div>
              <h1 className="text-2xl font-bold">Employee History</h1>
              <p className="text-gray-600 text-sm mt-1">
                Total Employees: <span className="font-bold text-indigo-600">{employees.length}</span>
                {' | '}
                Active: <span className="font-bold text-green-600">{employees.filter(e => e.status === 1).length}</span>
                {' | '}
                Inactive: <span className="font-bold text-red-600">{employees.filter(e => e.status === 0).length}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/employees/activity-logs')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
              >
                📋 Activity Logs
              </button>
              <button
                onClick={() => router.push('/employees/add')}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
              >
                + Add Employee
              </button>
            </div>
          </div>

          {/* Scrollable employee list */}
          <div className="flex-1 overflow-hidden bg-white rounded shadow">
            {loading ? (
              <div className="flex justify-center items-center h-64 md:h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto h-full">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      <th className="border px-4 py-2 text-left">#</th>
                      <th className="border px-4 py-2 text-left">Name</th>
                      <th className="border px-4 py-2 text-left">Email</th>
                      <th className="border px-4 py-2 text-left">Role</th>
                      <th className="border px-4 py-2 text-left">Salary</th>
                      <th className="border px-4 py-2 text-left">Status</th>
                      <th className="border px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length > 0 ? (
                      employees.map((emp, idx) => (
                        <tr key={emp.id} className={`hover:bg-gray-50 ${emp.status === 0 ? 'bg-red-50' : ''}`}>
                          <td className="border px-4 py-2">{idx + 1}</td>
                          <td className="border px-4 py-2">{emp.name}</td>
                          <td className="border px-4 py-2">{emp.email}</td>
                          <td className="border px-4 py-2">{roleName(emp.role)}</td>
                          <td className="border px-4 py-2">₹{emp.salary?.toLocaleString('en-IN') || '0'}</td>
                          <td className="border px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              emp.status === 1 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {emp.status === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="border px-4 py-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => router.push(`/employees/view?id=${emp.id}`)}
                              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                              title="View"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => router.push(`/employees/edit?id=${emp.id}`)}
                              className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleStatusToggle(emp.id, emp.status)}
                                disabled={updatingStatus[emp.id]}
                                className={`p-2 rounded hover:opacity-80 ${
                                  emp.status === 1
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-500 text-white'
                                }`}
                                title={emp.status === 1 ? 'Deactivate' : 'Activate'}
                              >
                                {updatingStatus[emp.id] ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : emp.status === 1 ? (
                                  <FaToggleOn className="text-lg" />
                                ) : (
                                  <FaToggleOff className="text-lg" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="border px-4 py-4 text-center">
                          No employees found. Click "Add Employee" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

function roleName(role) {
  switch (role) {
    case 1: return 'Staff';
    case 2: return 'Incharge';
    case 3: return 'Team Leader';
    case 4: return 'Accountant';
    case 5: return 'Admin';
    case 6: return 'Driver';
    default: return 'Unknown';
  }
}
