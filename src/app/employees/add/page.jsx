
//
'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateUserPage() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [formData, setFormData] = useState({
    emp_code: "", // auto-generated from backend, display only
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
    status: "0",
    account_details: "",
  });

  const [permissions, setPermissions] = useState({
    Dashboard: { can_view: false, can_edit: false, can_delete: false },
    "Filling Requests": { can_view: false, can_edit: false, can_delete: false },
    "Loading Station": { can_view: false, can_edit: false, can_delete: false },
    Customer: { can_view: false, can_edit: false, can_delete: false },
    Vehicle: { can_view: false, can_edit: false, can_delete: false },
    "LR Management": { can_view: false, can_edit: false, can_delete: false },
    "Loading History": { can_view: false, can_edit: false, can_delete: false },
    "Tanker History": { can_view: false, can_edit: false, can_delete: false },
    "Deepo History": { can_view: false, can_edit: false, can_delete: false },
    "Items & Products": { can_view: false, can_edit: false, can_delete: false },
    Employees: { can_view: false, can_edit: false, can_delete: false },
    Suppliers: { can_view: false, can_edit: false, can_delete: false },
    Transporters: { can_view: false, can_edit: false, can_delete: false },
    "NB Accounts": { can_view: false, can_edit: false, can_delete: false },
    "NB Expenses": { can_view: false, can_edit: false, can_delete: false },
    "NB Stock": { can_view: false, can_edit: false, can_delete: false },
    Voucher: { can_view: false, can_edit: false, can_delete: false },
    "Stock Transfer": { can_view: false, can_edit: false, can_delete: false },
    Remarks: { can_view: false, can_edit: false, can_delete: false },
  });

  const modules = Object.keys(permissions);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setImage(file);
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
      // Remove emp_code from formData; backend will auto-generate it
      Object.keys(formData).forEach(key => {
        if (key !== "emp_code") form.append(key, formData[key]);
      });
      if (image) form.append('picture', image);
      form.append('permissions', JSON.stringify(permissions));

      const res = await fetch('/api/employee', { method: 'POST', body: form });
      const data = await res.json();

      if (res.ok) {
        alert('Employee added successfully!');
        router.push('/employees'); // Redirect after success
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong while saving the employee.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="sticky top-0 h-screen">
        <Sidebar activePage="Employees" />
      </div>

      {/* Main content with fixed header and footer */}
      <div className="flex flex-col flex-1 w-full">
        {/* Fixed Header */}
        <div className="sticky top-0 z-10">
          <Header />
        </div>

        {/* Scrollable form content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Back Button and Page Title */}
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

        {/* Fixed Footer */}
        <div className="sticky bottom-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
