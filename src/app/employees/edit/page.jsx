"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSession } from '@/context/SessionContext';

function EditEmployeeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [stations, setStations] = useState([]);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState({
    Dashboard: { can_view: false, can_edit: false, can_create: false },
    Customers: { can_view: false, can_edit: false, can_create: false },
    "Filling Requests": { can_view: false, can_edit: false, can_create: false },
    Stock: { can_view: false, can_edit: false, can_create: false },
    "Loading Station": { can_view: false, can_edit: false, can_create: false },
    "Schedule Prices": { can_view: false, can_edit: false, can_create: false },
    Products: { can_view: false, can_edit: false, can_create: false },
    Employees: { can_view: false, can_edit: false, can_create: false },
    Suppliers: { can_view: false, can_edit: false, can_create: false },
    Transporters: { can_view: false, can_edit: false, can_create: false },
    "NB Accounts": { can_view: false, can_edit: false, can_create: false },
    "NB Expenses": { can_view: false, can_edit: false, can_create: false },
    "NB Stock": { can_view: false, can_edit: false, can_create: false },
    "Stock Transfer": { can_view: false, can_edit: false, can_create: false },
    Reports: { can_view: false, can_edit: false, can_create: false },
    "Agent Management": { can_view: false, can_edit: false, can_create: false },
    Users: { can_view: false, can_edit: false, can_create: false },
    Vehicles: { can_view: false, can_edit: false, can_create: false },
    "LR Management": { can_view: false, can_edit: false, can_create: false },
    "Loading History": { can_view: false, can_edit: false, can_create: false },
    "Tanker History": { can_view: false, can_edit: false, can_create: false },
    "Deepo History": { can_view: false, can_edit: false, can_create: false },
    Vouchers: { can_view: false, can_edit: false, can_create: false },
    Remarks: { can_view: false, can_edit: false, can_create: false },
    Items: { can_view: false, can_edit: false, can_create: false },
  });
  const modules = Object.keys(permissions);

  const isAdmin = user?.role === 5;

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      checkPermissions();
      if (id) {
        fetchData();
      } else {
        setError('Employee ID is required');
        setLoading(false);
      }
    }
  }, [id, user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) {
      setCheckingPermission(false);
      setHasPermission(false);
      return;
    }

    // Admin (role 5) has full access
    if (user.role === 5) {
      setHasPermission(true);
      setCheckingPermission(false);
      return;
    }

    // Check cache first
    const cacheKey = `perms_${user.id}_Employees`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_edit) {
        setHasPermission(true);
        setCheckingPermission(false);
        return;
      }
    }

    try {
      // Check user's permissions from session
      if (user.permissions && user.permissions['Employees']) {
        const empPerms = user.permissions['Employees'];
        if (empPerms.can_edit) {
          sessionStorage.setItem(cacheKey, JSON.stringify(empPerms));
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }
      }

      // Check API for Employees module - check can_edit permission
      const response = await fetch(
        `/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent('Employees')}&action=can_edit`
      );
      const data = await response.json();

      if (data.allowed) {
        setHasPermission(true);
        sessionStorage.setItem(cacheKey, JSON.stringify({ can_edit: true }));
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  async function fetchData() {
    try {
      // Get token from localStorage for Authorization header
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const res = await fetch(`/api/employee/edit?id=${id}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Network error' }));
        console.error('API Error:', errorData);
        // If token is invalid, redirect to login
        if (res.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
          }
          alert('Your session has expired. Please login again.');
          window.location.href = '/login';
          return;
        }
        setError(errorData.error || errorData.message || 'Failed to load employee data');
        setLoading(false);
        return;
      }
      
      const result = await res.json();
      
      if (result.success && result.data) {
        // Check if data has employee property (new format) or is the employee directly (old format)
        const employeeData = result.data.employee || result.data;
        const stationsData = result.data.stations || [];
        const permissionsData = result.data.permissions || {};
        
        if (employeeData && employeeData.id) {
          setFormData(employeeData);
          setStations(stationsData);
          // Set permissions if returned (admin only)
          if (permissionsData && Object.keys(permissionsData).length > 0) {
            setPermissions(prev => ({
              ...prev,
              ...permissionsData
            }));
          }
          setError(null);
        } else {
          const errorMsg = 'Invalid employee data received';
          console.error('API returned invalid data:', result);
          setError(errorMsg);
        }
      } else {
        const errorMsg = result.error || result.message || 'Failed to load employee data';
        console.error('API returned error:', errorMsg, result);
        setError(errorMsg);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handlePermissionChange = (module, perm) => {
    setPermissions(prev => ({
      ...prev,
      [module]: { ...prev[module], [perm]: !prev[module][perm] }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    // Add employee ID to form data
    fd.append('id', id);
    
    // Add permissions if admin (only Employees module)
    if (isAdmin) {
      const formattedPermissions = {
        'Employees': {
          can_view: permissions['Employees']?.can_view || false,
          can_edit: permissions['Employees']?.can_edit || false,
          can_create: permissions['Employees']?.can_create || false
        }
      };
      fd.append('permissions', JSON.stringify(formattedPermissions));
    }
    
    // Get token from localStorage for Authorization header
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Use POST method to match the API route
    const res = await fetch(`/api/employee/edit`, {
      method: 'POST', 
      body: fd,
      credentials: 'include',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });

    const result = await res.json();
    if (result.success) {
      alert("Updated Successfully");
      router.push('/employees');
    } else {
      alert("Error: " + (result.error || result.message || 'Update failed'));
    }
  };

  // Show loading state
  if (checkingPermission || authLoading || loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar activePage="Employees" />
        </div>
        <div className="flex-1 lg:ml-64 w-full">
          <div className="fixed top-0 left-0 lg:left-64 right-0 z-40">
            <Header />
          </div>
          <main className="pt-16 lg:pt-20 min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{checkingPermission ? 'Checking permissions...' : 'Loading employee data...'}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (!hasPermission && !authLoading && !checkingPermission) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar activePage="Employees" />
        </div>
        <div className="flex-1 lg:ml-64 w-full">
          <div className="fixed top-0 left-0 lg:left-64 right-0 z-40">
            <Header />
          </div>
          <main className="pt-16 lg:pt-20 min-h-screen flex items-center justify-center">
            <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6">You don't have permission to edit employees.</p>
              <button
                onClick={() => router.push('/employees')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar activePage="Employees" />
        </div>
        <div className="flex-1 lg:ml-64 w-full">
          <div className="fixed top-0 left-0 lg:left-64 right-0 z-40">
            <Header />
          </div>
          <main className="pt-16 lg:pt-20 min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-4">
              <p className="text-red-500 mb-4">{error || 'Employee not found.'}</p>
              <button 
                onClick={() => router.push('/employees')} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Employees
              </button>
            </div>
          </main>
          <div className="sticky top-[100vh] mt-8">
            <Footer />
          </div>
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
      <div className="flex-1 lg:ml-64 w-full flex flex-col">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="pt-16 lg:pt-20 flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Edit Employee Profile</h1>
                <button 
                  onClick={() => router.back()} 
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm md:text-base"
                >
                  <span>←</span> Back
                </button>
              </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">Full Name</label>
            <input name="name" defaultValue={formData.name} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required />
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">Email</label>
            <input name="email" type="email" defaultValue={formData.email} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          {/* Role - Only admin can change */}
          {isAdmin && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-600 mb-1">Role</label>
              <select name="role" defaultValue={formData.role} className="p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                <option value="1">Staff</option>
                <option value="2">Incharge</option>
                <option value="3">Team Leader</option>
                <option value="4">Accountant</option>
                <option value="5">Admin</option>
                <option value="6">Driver</option>
                <option value="7">Hard Operation</option>
              </select>
            </div>
          )}

          {/* Salary */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">Basic Salary</label>
            <input name="salary" type="number" defaultValue={formData.salary} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          {/* Phone */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">Phone Number</label>
            <input name="phone" defaultValue={formData.phone} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          {/* Alternate Phone */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">Alternate Phone</label>
            <input name="phonealt" defaultValue={formData.phonealt || ''} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          {/* Address */}
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm font-semibold text-gray-600 mb-1">Address</label>
            <input name="address" defaultValue={formData.address || ''} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          {/* City */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">City</label>
            <input name="city" defaultValue={formData.city || ''} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          {/* Region */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">Region</label>
            <input name="region" defaultValue={formData.region || ''} className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          {/* Status - Only admin can change */}
          {isAdmin && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-600 mb-1">Status</label>
              <select name="status" defaultValue={formData.status} className="p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                <option value="1">Enable</option>
                <option value="0">Disable</option>
              </select>
            </div>
          )}

          {/* Stations - Only admin can assign */}
          {isAdmin && stations.length > 0 && (
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-600 block mb-3">Assigned Filling Stations</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 max-h-60 overflow-y-auto">
                {stations.map(station => {
                  // Handle fs_id - it could be a number, string, array, or comma-separated string
                  let fsIdArray = [];
                  if (formData.fs_id) {
                    if (Array.isArray(formData.fs_id)) {
                      fsIdArray = formData.fs_id;
                    } else if (typeof formData.fs_id === 'string') {
                      // Handle comma-separated string like "1,2,3"
                      fsIdArray = formData.fs_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                    } else {
                      // Single number
                      fsIdArray = [parseInt(formData.fs_id)];
                    }
                  }
                  const isChecked = fsIdArray.includes(parseInt(station.id));
                  
                  return (
                    <label key={station.id} className="flex items-center space-x-3 p-2 bg-white rounded-md shadow-sm cursor-pointer hover:bg-blue-50 transition">
                      <input 
                        type="checkbox" 
                        name="fs_id" 
                        value={station.id}
                        defaultChecked={isChecked}
                        className="w-4 h-4 text-blue-600 rounded" 
                      />
                      <span className="text-sm text-gray-700 font-medium">{station.station_name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* QR Code Upload */}
          <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
             <label className="text-sm font-semibold text-blue-800 block mb-2">Update QR Code / Identity Document</label>
             <input type="file" name="qr_code" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
             {formData.qr_code && (
               <p className="mt-2 text-xs text-gray-500 italic">Current file: {formData.qr_code}</p>
             )}
          </div>

          {/* Permissions Section - Only for Admin, Only Employees Module */}
          {isAdmin && (
            <div className="md:col-span-2 mt-6 bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-md font-semibold mb-3 text-gray-800">Assign Module Permissions</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border text-left">Module</th>
                      <th className="p-2 border text-center">View</th>
                      <th className="p-2 border text-center">Edit</th>
                      <th className="p-2 border text-center">Create</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="p-2 border font-medium text-gray-700">Employees</td>
                      <td className="p-2 border text-center">
                        <input 
                          type="checkbox" 
                          checked={permissions['Employees']?.can_view || false} 
                          onChange={() => handlePermissionChange('Employees', "can_view")} 
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="p-2 border text-center">
                        <input 
                          type="checkbox" 
                          checked={permissions['Employees']?.can_edit || false} 
                          onChange={() => handlePermissionChange('Employees', "can_edit")} 
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="p-2 border text-center">
                        <input 
                          type="checkbox" 
                          checked={permissions['Employees']?.can_create || false} 
                          onChange={() => handlePermissionChange('Employees', "can_create")}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

              <div className="md:col-span-2 flex items-center justify-end space-x-4 pt-6 border-t">
                <button type="button" onClick={() => router.back()} className="px-4 md:px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm md:text-base">Cancel</button>
                <button type="submit" className="px-6 md:px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition text-sm md:text-base">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
        </main>

        {/* Fixed Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function EditEmployee() {
  return (
    <Suspense fallback={
      <div className="p-10 text-center animate-pulse text-gray-500">
        Loading...
      </div>
    }>
      <EditEmployeeContent />
    </Suspense>
  );
}