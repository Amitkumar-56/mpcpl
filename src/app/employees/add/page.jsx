'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreateUserPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [image, setImage] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStations, setSelectedStations] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [formData, setFormData] = useState({
    emp_code: "",
    email: "",
    password: "",
    role: "",
    salary: "",
    name: "",
    address: "",
    city: "",
    region: "",
    country: "",
    postbox: "",
    phone: "",
    phonealt: "",
    status: "1",
    account_details: "",
  });

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

  // Check permissions on mount and fetch stations
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      checkPermissions();
      fetchStations();
    }
  }, [user, authLoading]);

  const isAdmin = user?.role === 5;

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      setStations(data || []);
    } catch (err) {
      console.error('Error fetching stations:', err);
    }
  };

  const checkPermissions = async () => {
    if (!user || !user.id) {
      setCheckingPermission(false);
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
      if (cachedPerms.can_create) {
        setHasPermission(true);
        setCheckingPermission(false);
        return;
      }
    }

    try {
      // Check user's permissions from session
      if (user.permissions && user.permissions['Employees']) {
        const empPerms = user.permissions['Employees'];
        if (empPerms.can_create) {
          sessionStorage.setItem(cacheKey, JSON.stringify(empPerms));
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }
      }

      // Check API for Employees module - check can_create permission
      const response = await fetch(
        `/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent('Employees')}&action=can_create`
      );
      const data = await response.json();

      if (data.allowed) {
        setHasPermission(true);
        sessionStorage.setItem(cacheKey, JSON.stringify({ can_create: true }));
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setImage(file);
  };

  const handleQrCodeChange = (e) => {
    const file = e.target.files[0];
    if (file) setQrCode(file);
  };

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

  const handleSubmit = async () => {
    try {
      const form = new FormData();
      const payloadData = { ...formData };
      if (!isAdmin) {
        payloadData.status = "1";
      }

      // Add all form data except emp_code
      Object.keys(payloadData).forEach(key => {
        if (key !== "emp_code") form.append(key, payloadData[key]);
      });

      if (image) form.append('picture', image);
      if (qrCode) form.append('qr_code', qrCode);

      // Add station assignments (admin only)
      if (isAdmin) {
        console.log('🔍 CREATE - Sending stations to backend:', selectedStations);
        selectedStations.forEach(stationId => {
          // Ensure stationId is converted to string
          form.append('fs_id[]', String(stationId));
        });
        console.log('🔍 CREATE - Total stations being sent:', selectedStations.length);
      }

      // Format permissions for backend (admin only)
      if (isAdmin) {
        const formattedPermissions = {};
        modules.forEach(module => {
          formattedPermissions[module] = {
            can_view: permissions[module]?.can_view || false,
            can_edit: permissions[module]?.can_edit || false,
            can_create: permissions[module]?.can_create || false
          };
        });
        form.append('permissions', JSON.stringify(formattedPermissions));
      }

      const res = await fetch('/api/employee', {
        method: 'POST',
        body: form
      });

      const data = await res.json();

      if (res.ok) {
        alert('Employee added successfully!');
        router.push('/employees');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong while saving the employee.');
    }
  };

  // Show loading state
  if (checkingPermission || authLoading) {
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
              <p className="text-gray-600">Checking permissions...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (!hasPermission) {
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
            <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
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
      <div className="sticky top-0 h-screen">
        <Sidebar activePage="Employees" />
      </div>

      <div className="flex flex-col flex-1 w-full">
        <div className="sticky top-0 z-10">
          <Header />
        </div>

        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Create Employee</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 w-full flex flex-col items-center border p-4 rounded-lg bg-white">
              <label className="block text-sm font-medium mb-2">Profile Image</label>
              <input type="file" accept="image/*" onChange={handleImageChange} className="mb-3" />
              {image && <img src={URL.createObjectURL(image)} alt="Preview" className="mt-3 h-32 w-32 object-cover rounded-full border" />}
            </div>

            <div className="md:w-2/3 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="emp_code"
                  value="Auto-generated"
                  readOnly
                  className="border rounded p-2 bg-gray-100 cursor-not-allowed"
                />
                <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} className="border rounded p-2" />
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="border rounded p-2" />
                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="border rounded p-2" />
                <select name="role" value={formData.role} onChange={handleChange} className="border rounded p-2">
                  <option value="">Select Role</option>
                  <option value="1">Staff</option>
                  <option value="2">Incharge</option>
                  <option value="3">Team Leader</option>
                  <option value="4">Accountant</option>
                  <option value="5">Admin</option>
                  <option value="6">Driver</option>
                  <option value="7">Hard Operation</option>
                </select>
                <input type="number" name="salary" placeholder="Salary" value={formData.salary} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="phonealt" placeholder="Alternate Phone" value={formData.phonealt} onChange={handleChange} className="border rounded p-2" />
                {isAdmin && (
                  <select name="status" value={formData.status} onChange={handleChange} className="border rounded p-2">
                    <option value="0">Inactive</option>
                    <option value="1">Active</option>
                  </select>
                )}
                <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} className="border rounded p-2" />
                <select name="region" value={formData.region} onChange={handleChange} className="border rounded p-2">
                  <option value="">Select Region</option>
                  {['andhra_pradesh', 'arunachal_pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana', 'himachal_pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya_pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil_nadu', 'telangana', 'tripura', 'uttar_pradesh', 'uttarakhand', 'west_bengal'].map(state => (
                    <option key={state} value={state}>
                      {state.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
                <input type="text" name="country" placeholder="Country" value={formData.country} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="postbox" placeholder="Postbox" value={formData.postbox} onChange={handleChange} className="border rounded p-2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Details</label>
                <textarea
                  name="account_details"
                  placeholder="Bank Account Number / IFSC / Account Holder Name"
                  value={formData.account_details}
                  onChange={handleChange}
                  className="w-full border rounded p-2 min-h-20 resize-vertical"
                />
              </div>
            </div>
          </div>

          {/* QR Code Upload */}
          <div className="mt-6 bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">QR Code Upload (Image or PDF)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleQrCodeChange}
              className="border rounded p-2 w-full"
            />
            {qrCode && (
              <div className="mt-3 p-3 bg-blue-50 rounded">
                <span className="text-blue-700 text-sm font-semibold">✓ File Selected: {qrCode.name}</span>
              </div>
            )}
          </div>

          {/* Station Assignment */}
          {isAdmin && (
            <div className="mt-6 bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">Assign Stations</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
                {stations.map((station) => (
                  <label
                    key={station.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedStations.includes(station.id)
                        ? "bg-orange-50 border border-orange-200 shadow-sm"
                        : "hover:bg-gray-50 border border-gray-200"
                      }`}
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={selectedStations.includes(station.id)}
                        onChange={() => handleStationToggle(station.id)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${selectedStations.includes(station.id)
                          ? "bg-orange-600 border-orange-600"
                          : "border-gray-300"
                        }`}>
                        {selectedStations.includes(station.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="flex-1 text-gray-700 font-medium">
                      {station.station_name}
                    </span>
                  </label>
                ))}
              </div>
              {stations.length === 0 && (
                <p className="text-gray-500 text-sm mt-2">No stations available</p>
              )}
            </div>
          )}

          {/* Module Permissions - Only for Admin */}
          {isAdmin && (
            <div className="mt-6 overflow-x-auto bg-white rounded-lg p-4">
              <h3 className="text-md font-semibold mb-3">Assign Module Permissions</h3>
              <table className="w-full border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Module</th>
                    <th className="p-2 border">View</th>
                    <th className="p-2 border">Edit</th>
                    <th className="p-2 border">Create</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-2 border font-medium">{mod}</td>
                      <td className="p-2 border text-center">
                        <input
                          type="checkbox"
                          checked={permissions[mod].can_view}
                          onChange={() => handlePermissionChange(mod, "can_view")}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="p-2 border text-center">
                        <input
                          type="checkbox"
                          checked={permissions[mod].can_edit}
                          onChange={() => handlePermissionChange(mod, "can_edit")}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="p-2 border text-center">
                        <input
                          type="checkbox"
                          checked={permissions[mod].can_create}
                          onChange={() => handlePermissionChange(mod, "can_create")}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex gap-4">
            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded" onClick={handleSubmit}>
              Save User
            </button>
            <button
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded"
              onClick={() => router.push('/employees')}
            >
              Cancel
            </button>
          </div>
        </main>

        <div className="sticky bottom-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
