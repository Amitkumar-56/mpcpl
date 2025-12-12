// change-password/page.jsx
'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ChangePasswordPage() {
  const { user, loading: authLoading, logout } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log('❌ No user found, redirecting to login');
        router.push('/login');
        return;
      }

      // Only admin (role 5) can access this page
      const userRole = Number(user.role);
      console.log('👤 User role:', userRole);
      
      if (userRole !== 5) {
        console.log('❌ User is not admin, redirecting to dashboard');
        router.push('/dashboard');
        return;
      }

      // User is admin, fetch employees
      console.log('✅ Admin user confirmed, fetching employees');
      fetchEmployees();
    }
  }, [user, authLoading, router]);

  const fetchEmployees = async () => {
    try {
      console.log('📡 Fetching employees...');
      const response = await fetch('/api/employee', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      console.log('📊 Employee fetch response:', response.status);

      if (response.status === 401) {
        // Session expired
        console.log('⚠️ Session expired during employee fetch');
        setError('Your session has expired. Please login again.');
        
        // Clear storage and redirect
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('user');
        }
        
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Employees fetched:', result.length);

      if (Array.isArray(result)) {
        setEmployees(result);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('❌ Error fetching employees:', err);
      setError('Failed to load employees. Please refresh the page.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Check if user is authenticated
    if (!user) {
      setError('You are not logged in. Please login again.');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }

    // Check if user is admin
    const userRole = Number(user.role);
    if (userRole !== 5) {
      setError('Only admin can change passwords');
      return;
    }

    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      
      // Validate employeeId
      const employeeId = parseInt(selectedEmployee);
      if (isNaN(employeeId) || employeeId <= 0) {
        setError('Please select a valid employee');
        setLoading(false);
        return;
      }

      console.log('🔄 Sending change password request...');
      
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          employeeId: employeeId,
          newPassword: newPassword
        })
      });

      console.log('📡 Response status:', response.status);

      const result = await response.json();
      console.log('📦 Response data:', result);

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired - force logout
          console.log('❌ Session expired during password change');
          setError('Your session has expired. Please login again.');
          
          // Force logout
          logout();
          
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }
        throw new Error(result.error || 'Failed to change password');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully');
      setSelectedEmployee('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err) {
      console.error('❌ Error changing password:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden">
        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden md:block">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
        
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-screen md:min-h-0 md:overflow-hidden">
          <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  // Only admin can access
  if (user && Number(user.role) !== 5) {
    router.push('/dashboard');
    return null;
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar (always visible on desktop) */}
      <div className="hidden md:block">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-screen md:min-h-0 md:overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-2xl mx-auto w-full">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Change Password</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Only admin can change employee passwords</p>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs sm:text-sm text-red-800 break-words">{error}</span>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5 sm:mt-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs sm:text-sm text-green-800 break-words">{success}</span>
                    </div>
                  </div>
                )}

                {/* Employee Selection */}
                <div>
                  <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Select Employee
                  </label>
                  <select
                    id="employee"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full text-sm sm:text-base border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.emp_code} - {emp.name} {emp.email ? `(${emp.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className="w-full text-sm sm:text-base border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    className="w-full text-sm sm:text-base border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Buttons */}
                <div className="flex flex-col-reverse sm:flex-row justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm sm:text-base"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Changing...
                      </span>
                    ) : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}