'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from "react";

function EditEmployeeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user, loading: authLoading } = useSession();
  const [image, setImage] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [existingQrCode, setExistingQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
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
    Dashboard: { can_view: false, can_edit: false, can_delete: false },
    Customers: { can_view: false, can_edit: false, can_delete: false },
    "Purchese Request": { can_view: false, can_edit: false, can_delete: false },
    Stock: { can_view: false, can_edit: false, can_delete: false },
    "Loading Stations": { can_view: false, can_edit: false, can_delete: false },
    "Schedule Prices": { can_view: false, can_edit: false, can_delete: false },
    Products: { can_view: false, can_edit: false, can_delete: false },
    Employees: { can_view: false, can_edit: false, can_delete: false },
    Suppliers: { can_view: false, can_edit: false, can_delete: false },
    Transporters: { can_view: false, can_edit: false, can_delete: false },
    "NB Accounts": { can_view: false, can_edit: false, can_delete: false },
    "NB Expenses": { can_view: false, can_edit: false, can_delete: false },
    "NB Stock": { can_view: false, can_edit: false, can_delete: false },
    "Stock Transfer": { can_view: false, can_edit: false, can_delete: false },
    Reports: { can_view: false, can_edit: false, can_delete: false },
    Retailers: { can_view: false, can_edit: false, can_delete: false },
    "Agent Management": { can_view: false, can_edit: false, can_delete: false },
    Users: { can_view: false, can_edit: false, can_delete: false },
    Vehicles: { can_view: false, can_edit: false, can_delete: false },
    "LR Management": { can_view: false, can_edit: false, can_delete: false },
    "Loading History": { can_view: false, can_edit: false, can_delete: false },
    "Tanker History": { can_view: false, can_edit: false, can_delete: false },
    "Deepo History": { can_view: false, can_edit: false, can_delete: false },
    Vouchers: { can_view: false, can_edit: false, can_delete: false },
    Remarks: { can_view: false, can_edit: false, can_delete: false },
    Items: { can_view: false, can_edit: false, can_delete: false },
  });

  const modules = Object.keys(permissions);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (id) {
        fetchEmployee();
      }
    }
  }, [id, user, authLoading]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employee/edit?id=${id}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        const emp = result.data;
        setFormData({
          emp_code: emp.emp_code || "",
          email: emp.email || "",
          password: "", // Don't show password
          role: emp.role?.toString() || "",
          salary: emp.salary?.toString() || "",
          name: emp.name || "",
          address: emp.address || "",
          city: emp.city || "",
          region: emp.region || "",
          country: emp.country || "",
          postbox: emp.postbox || "",
          phone: emp.phone || "",
          phonealt: emp.phonealt || "",
          status: emp.status?.toString() || "1",
          account_details: emp.account_details || "",
        });

        if (emp.picture) {
          setExistingImage(`/uploads/${emp.picture}`);
        }

        if (emp.qr_code) {
          setExistingQrCode(`/uploads/${emp.qr_code}`);
        }

        // Load permissions
        if (result.data.permissions && Array.isArray(result.data.permissions)) {
          const perms = {};
          result.data.permissions.forEach(p => {
            perms[p.module_name] = {
              can_view: p.can_view === 1,
              can_edit: p.can_edit === 1,
              can_delete: p.can_delete === 1
            };
          });
          setPermissions(prev => ({ ...prev, ...perms }));
        }
      } else {
        alert('Failed to load employee data');
        router.push('/employees');
      }
    } catch (err) {
      console.error(err);
      alert('Error loading employee data');
      router.push('/employees');
    } finally {
      setLoading(false);
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

  const handlePermissionChange = (module, perm) => {
    setPermissions(prev => ({
      ...prev,
      [module]: { ...prev[module], [perm]: !prev[module][perm] }
    }));
  };

  const handleSubmit = async () => {
    try {
      const form = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== "emp_code" && formData[key] !== "") {
          form.append(key, formData[key]);
        }
      });
      if (image) form.append('picture', image);
      if (qrCode) form.append('qr_code', qrCode);
      form.append('permissions', JSON.stringify(permissions));

      const res = await fetch(`/api/employee/edit?id=${id}`, {
        method: 'PUT',
        body: form,
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('Employee updated successfully!');
        router.push('/employees');
      } else {
        alert(`Error: ${data.error || data.message || 'Failed to update employee'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong while updating the employee.');
    }
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
            <h1 className="text-2xl font-bold">Edit Employee</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 w-full">
              <div className="flex flex-col items-center border p-4 rounded-lg bg-white mb-4">
                <label className="block text-sm font-medium mb-2">Profile Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="mb-3 text-sm" />
                {image ? (
                  <img src={URL.createObjectURL(image)} alt="Preview" className="mt-3 h-32 w-32 object-cover rounded-full border" />
                ) : existingImage ? (
                  <img src={existingImage} alt="Current" className="mt-3 h-32 w-32 object-cover rounded-full border" />
                ) : (
                  <div className="mt-3 h-32 w-32 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center border p-4 rounded-lg bg-white">
                <label className="block text-sm font-medium mb-2">QR Code Upload (Image or PDF)</label>
                <input type="file" accept="image/*,.pdf" onChange={handleQrCodeChange} className="mb-3 text-sm" />
                {qrCode ? (
                  <div className="mt-3 h-32 w-32 border-2 border-blue-500 rounded flex items-center justify-center bg-blue-50">
                    <span className="text-blue-700 text-sm font-semibold">✓ File Selected</span>
                  </div>
                ) : existingQrCode ? (
                  existingQrCode.endsWith('.pdf') ? (
                    <div className="mt-3 h-32 w-32 border-2 border-green-500 rounded flex items-center justify-center bg-green-50">
                      <span className="text-green-700 text-xs text-center font-semibold">PDF Uploaded</span>
                    </div>
                  ) : (
                    <img src={existingQrCode} alt="QR Code" className="mt-3 h-32 w-32 object-cover border-2 border-green-500 rounded" />
                  )
                ) : (
                  <div className="mt-3 h-32 w-32 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs text-center">No QR Code</span>
                  </div>
                )}
              </div>
            </div>

            <div className="md:w-2/3 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="emp_code" 
                  value={formData.emp_code} 
                  readOnly 
                  className="border rounded p-2 bg-gray-100 cursor-not-allowed" 
                />
                <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} className="border rounded p-2" />
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="border rounded p-2" />
                <input type="password" name="password" placeholder="New Password (leave blank to keep current)" value={formData.password} onChange={handleChange} className="border rounded p-2" />
                <select name="role" value={formData.role} onChange={handleChange} className="border rounded p-2">
                  <option value="">Select Role</option>
                  <option value="1">Staff</option>
                  <option value="2">Incharge</option>
                  <option value="3">Team Leader</option>
                  <option value="4">Accountant</option>
                  <option value="5">Admin</option>
                  <option value="6">Driver</option>
                </select>
                <input type="number" name="salary" placeholder="Salary" value={formData.salary} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="phonealt" placeholder="Alternate Phone" value={formData.phonealt} onChange={handleChange} className="border rounded p-2" />
                <select name="status" value={formData.status} onChange={handleChange} className="border rounded p-2">
                  <option value="0">Inactive</option>
                  <option value="1">Active</option>
                </select>
                <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="region" placeholder="Region" value={formData.region} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="country" placeholder="Country" value={formData.country} onChange={handleChange} className="border rounded p-2" />
                <input type="text" name="postbox" placeholder="Postbox" value={formData.postbox} onChange={handleChange} className="border rounded p-2" />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Details</label>
                <textarea 
                  name="account_details" 
                  placeholder="Bank Account Number / IFSC / Account Holder Name" 
                  value={formData.account_details} 
                  onChange={handleChange} 
                  className="w-full border rounded p-2 min-h-20 resize-vertical font-mono"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto bg-white rounded-lg p-4">
            <h3 className="text-md font-semibold mb-3">Assign Module Permissions</h3>
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Module</th>
                  <th className="p-2 border">View</th>
                  <th className="p-2 border">Edit</th>
                  <th className="p-2 border">Delete</th>
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
                        checked={permissions[mod].can_delete} 
                        onChange={() => handlePermissionChange(mod, "can_delete")} 
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-4">
            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded" onClick={handleSubmit}>
              Update Employee
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

export default function EditEmployeePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <EditEmployeeContent />
    </Suspense>
  );
}

