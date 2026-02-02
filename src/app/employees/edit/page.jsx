"use client";
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function EditEmployeeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [stations, setStations] = useState([]);
  const [selectedStations, setSelectedStations] = useState([]);
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
    "Stock Requests": { can_view: false, can_edit: false, can_create: false },
    "Transfer Logs": { can_view: false, can_edit: false, can_create: false },
    "Stock History": { can_view: false, can_edit: false, can_create: false },
    Attendance: { can_view: false, can_edit: false, can_create: false },
    "Outstanding History": { can_view: false, can_edit: false, can_create: false },
    Reports: { can_view: false, can_edit: false, can_create: false },
    Retailers: { can_view: false, can_edit: false, can_create: false },
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
      setLoading(true);
      setError(null);

      // Get token from localStorage for Authorization header
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      console.log('🔍 Fetching employee data for ID:', id);

      const res = await fetch(`/api/employee/edit?id=${id}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });

      console.log('🔍 Response status:', res.status, res.statusText);

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch (e) {
          errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
        }
        console.error('❌ API Error:', errorData);

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
        setError(errorData.error || errorData.message || `Failed to load employee data (${res.status})`);
        setLoading(false);
        return;
      }

      const result = await res.json();

      if (result.success && result.data) {
        const employeeData = result.data.employee || result.data;
        const stationsData = result.data.stations || [];
        const permissionsData = result.data.permissions || {};

        if (employeeData && employeeData.id) {
          setFormData(employeeData);
          setStations(stationsData);

          // Initialize selected stations from fs_id
          let fsIdArray = [];
          if (employeeData.fs_id) {
            if (Array.isArray(employeeData.fs_id)) {
              fsIdArray = employeeData.fs_id.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
            } else if (typeof employeeData.fs_id === 'string' && employeeData.fs_id.trim() !== '') {
              // Split by comma and convert to integers
              // Remove any extra spaces and filter out empty values
              fsIdArray = employeeData.fs_id
                .split(',')
                .map(id => id.trim())
                .filter(id => id !== '')
                .map(id => parseInt(id))
                .filter(id => !isNaN(id) && id > 0);
            } else if (typeof employeeData.fs_id === 'number' && employeeData.fs_id > 0) {
              fsIdArray = [parseInt(employeeData.fs_id)];
            }
          }
          console.log('🔍 Loading employee stations:', {
            fs_id: employeeData.fs_id,
            type: typeof employeeData.fs_id,
            parsed: fsIdArray,
            count: fsIdArray.length
          });
          setSelectedStations(fsIdArray);

          // Set permissions if returned - merge with existing modules list
          console.log('🔍 Loading employee permissions:', permissionsData);
          if (permissionsData && Object.keys(permissionsData).length > 0) {
            setPermissions(prev => {
              const updated = { ...prev };
              Object.keys(permissionsData).forEach(module => {
                if (updated.hasOwnProperty(module)) {
                  updated[module] = {
                    can_view: permissionsData[module].can_view || false,
                    can_edit: permissionsData[module].can_edit || false,
                    can_create: permissionsData[module].can_create || false
                  };
                }
              });
              return updated;
            });
          } else {
            // If no permissions found, reset all to false
            console.log('⚠️ No permissions found for employee, resetting all to false');
            setPermissions(prev => {
              const reset = {};
              Object.keys(prev).forEach(module => {
                reset[module] = { can_view: false, can_edit: false, can_create: false };
              });
              return reset;
            });
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
      console.error("❌ Fetch error:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(`Network error: ${err.message || 'Please check if server is running and try again.'}`);
    } finally {
      setLoading(false);
    }
  }

  const handleStationToggle = (stationId) => {
    setSelectedStations(prev => {
      if (prev.includes(stationId)) {
        return prev.filter(id => id !== stationId);
      } else {
        return [...prev, stationId];
      }
    });
  };

  const handlePermissionChange = (module, perm) => {
    setPermissions(prev => ({
      ...prev,
      [module]: { ...prev[module], [perm]: !prev[module][perm] }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData || !id) {
      alert('Employee data not loaded');
      return;
    }

    const fd = new FormData(e.currentTarget);

    // Add employee ID to form data
    fd.append('id', id);

    // Add current employee data for comparison
    fd.append('current_data', JSON.stringify(formData));

    // Add station assignments (admin only) - send as array like in create page
    if (isAdmin) {
      // Remove any existing fs_id from form data
      fd.delete('fs_id');
      fd.delete('fs_id[]');

      // Always send fs_id[] array, even if empty (to allow removing all stations)
      console.log('🔍 EDIT - Sending stations to backend:', selectedStations, 'Count:', selectedStations.length);

      if (selectedStations.length > 0) {
        // Add selected stations as array
        selectedStations.forEach(stationId => {
          fd.append('fs_id[]', String(stationId));
        });
      } else {
        // Send empty marker to indicate we want to clear all stations
        // Backend will see this and set fs_id to empty string
        fd.append('fs_id[]', ''); // Empty value indicates clear all
        console.log('⚠️ EDIT - No stations selected, sending empty marker to clear fs_id');
      }
    }

    // Add permissions if admin (all modules)
    if (isAdmin) {
      const formattedPermissions = {};
      modules.forEach(module => {
        formattedPermissions[module] = {
          can_view: permissions[module]?.can_view || false,
          can_edit: permissions[module]?.can_edit || false,
          can_create: permissions[module]?.can_create || false
        };
      });
      fd.append('permissions', JSON.stringify(formattedPermissions));
    }

    // Get token from localStorage for Authorization header
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
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
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Please try again.');
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
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar activePage="Employees" />
      </div>

      <div className="flex-1 lg:ml-64 w-full flex flex-col">
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>

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
                    <label className="text-sm font-semibold text-gray-600 block mb-3">
                      Assigned Filling Stations
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        ({selectedStations.length} of {stations.length} selected)
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 max-h-60 overflow-y-auto">
                      {stations.map(station => {
                        const stationId = parseInt(station.id);
                        const isChecked = selectedStations.includes(stationId);

                        return (
                          <label
                            key={station.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isChecked
                                ? "bg-orange-50 border-2 border-orange-400 shadow-md"
                                : "hover:bg-gray-50 border border-gray-200 bg-white"
                              }`}
                          >
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleStationToggle(stationId)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${isChecked
                                  ? "bg-orange-600 border-orange-600"
                                  : "border-gray-300 bg-white"
                                }`}>
                                {isChecked && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className={`flex-1 font-medium ${isChecked ? "text-orange-700" : "text-gray-700"
                              }`}>
                              {station.station_name}
                              {isChecked && <span className="ml-2 text-xs text-orange-600">✓ Active</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {selectedStations.length === 0 && (
                      <p className="mt-2 text-sm text-amber-600 italic">
                        ⚠️ No stations selected. Employee will have no station assignments.
                      </p>
                    )}
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

                {/* Permissions Section - Only for Admin */}
                {isAdmin && (
                  <div className="md:col-span-2 mt-6 bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Assign Module Permissions</h3>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full border border-gray-200 text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="p-3 border text-left font-semibold">Module</th>
                            <th className="p-3 border text-center font-semibold">View</th>
                            <th className="p-3 border text-center font-semibold">Edit</th>
                            <th className="p-3 border text-center font-semibold">Create</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modules.map((module, index) => (
                            <tr key={module} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                              <td className="p-3 border font-medium text-gray-700">{module}</td>
                              <td className="p-3 border text-center">
                                <input
                                  type="checkbox"
                                  checked={permissions[module]?.can_view || false}
                                  onChange={() => handlePermissionChange(module, "can_view")}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                />
                              </td>
                              <td className="p-3 border text-center">
                                <input
                                  type="checkbox"
                                  checked={permissions[module]?.can_edit || false}
                                  onChange={() => handlePermissionChange(module, "can_edit")}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                />
                              </td>
                              <td className="p-3 border text-center">
                                <input
                                  type="checkbox"
                                  checked={permissions[module]?.can_create || false}
                                  onChange={() => handlePermissionChange(module, "can_create")}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                />
                              </td>
                            </tr>
                          ))}
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