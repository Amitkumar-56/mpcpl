"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from '@/context/SessionContext';

export default function AddCustomer() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [clientType, setClientType] = useState("1"); // 1: Prepaid, 2: Postpaid, 3: Day Limit
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    Dashboard: { can_view: false, can_edit: false },
    "Filling Requests": { can_view: false, can_edit: false},
    "Loading Station": { can_view: false, can_edit: false },
    "Loading History": { can_view: false, can_edit: false},
  });

  const modules = Object.keys(permissions);

  const handlePermissionChange = (module, perm) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [perm]: !prev[module][perm] },
    }));
  };

  // Check permissions
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
      setCheckingPermission(false);
      return;
    }

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setCheckingPermission(false);
      fetchData();
      return;
    }

    // Check cached permissions
    if (user.permissions && user.permissions['Customer']) {
      const customerPerms = user.permissions['Customer'];
      if (customerPerms.can_create) {
        setHasPermission(true);
        setCheckingPermission(false);
        fetchData();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Customer`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_create) {
        setHasPermission(true);
        setCheckingPermission(false);
        fetchData();
        return;
      }
    }

    try {
      const moduleName = 'Customer';
      const createRes = await fetch(
        `/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`
      );
      const createData = await createRes.json();
      
      if (createData.allowed) {
        setHasPermission(true);
        fetchData();
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

  const fetchData = () => {
    fetch("/api/products").then((res) => res.json()).then(setProducts);
    fetch("/api/stations").then((res) => res.json()).then(setStations);
  };

  if (checkingPermission || authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 w-full">
          <Header />
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

  if (!hasPermission) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 w-full">
          <Header />
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6">You don't have permission to create customers.</p>
              <button
                onClick={() => router.push('/customers')}
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const form = new FormData(e.target);
      
      // Append permissions and client_type
      form.append("permissions", JSON.stringify(permissions));
      form.append("client_type", clientType); // This is crucial for server-side logic
      
      console.log("🟡 Sending request to API...");
      
      const res = await fetch("/api/customers/add", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      console.log("🟡 API Response:", data);

      if (res.ok && data.success) {
        alert("Customer added successfully!");
        router.push("/customers");
      } else {
        alert(`Error: ${data.message || 'Failed to add customer'}`);
      }
    } catch (err) {
      console.error("🔴 Frontend Error:", err);
      alert("Something went wrong while saving the customer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="pt-16 lg:pt-20 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Client Name *</label>
                <input 
                  type="text" 
                  name="client_name" 
                  required 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Role *</label>
                <select 
                  name="role" 
                  required 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Client</option>
                  <option value="3">Super Client</option>
                </select>
              </div>
              
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone *</label>
                <input 
                  type="tel" 
                  name="phone" 
                  required 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Password *</label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              {/* Customer Type */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Customer Type *</label>
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Prepaid Client</option>
                  <option value="2">Postpaid Client</option>
                  <option value="3">Day Limit Client</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Billing Type</label>
                <select 
                  name="billing_type" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Billing</option>
                  <option value="2">Non Billing</option>
                </select>
              </div>

              {/* Conditional Fields */}
              {clientType === "2" && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Credit Limit (₹) *
                  </label>
                  <input
                    type="number"
                    name="amtlimit" // ⬅️ Field name for Postpaid Credit Limit
                    step="0.01"
                    required
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter credit amount"
                  />
                </div>
              )}

              {clientType === "3" && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Day Limit (Days) *
                  </label>
                  <input
                    type="number"
                    name="day_limit" // ⬅️ Field name for Day Limit
                    required
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter number of days"
                  />
                </div>
              )}

              {/* Products */}
              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-2">Select Products</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2">
                      <input type="checkbox" name="products[]" value={p.id} /> {/* ⬅️ Correct name for multiple selection */}
                      <span>{p.pname}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Address</label>
                <textarea 
                  name="address" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">City</label>
                <input 
                  type="text" 
                  name="city" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">State</label>
                   <select name="region" className="w-full border p-2 rounded" required>
                  <option value="">Select State</option>
                  <option value="andhra_pradesh">Andhra Pradesh</option>
                  <option value="arunachal_pradesh">Arunachal Pradesh</option>
                  <option value="assam">Assam</option>
                  <option value="bihar">Bihar</option>
                  <option value="chhattisgarh">Chhattisgarh</option>
                  <option value="goa">Goa</option>
                  <option value="gujarat">Gujarat</option>
                  <option value="haryana">Haryana</option>
                  <option value="himachal_pradesh">Himachal Pradesh</option>
                  <option value="jharkhand">Jharkhand</option>
                  <option value="karnataka">Karnataka</option>
                  <option value="kerala">Kerala</option>
                  <option value="madhya_pradesh">Madhya Pradesh</option>
                  <option value="maharashtra">Maharashtra</option>
                  <option value="manipur">Manipur</option>
                  <option value="meghalaya">Meghalaya</option>
                  <option value="mizoram">Mizoram</option>
                  <option value="nagaland">Nagaland</option>
                  <option value="odisha">Odisha</option>
                  <option value="punjab">Punjab</option>
                  <option value="rajasthan">Rajasthan</option>
                  <option value="sikkim">Sikkim</option>
                  <option value="tamil_nadu">Tamil Nadu</option>
                  <option value="telangana">Telangana</option>
                  <option value="tripura">Tripura</option>
                  <option value="uttar_pradesh">Uttar Pradesh</option>
                  <option value="uttarakhand">Uttarakhand</option>
                  <option value="west_bengal">West Bengal</option>
                  <option value="andaman_nicobar">Andaman & Nicobar Islands</option>
                  <option value="chandigarh">Chandigarh</option>
                  <option value="dadra_nagar_haveli">Dadra & Nagar Haveli</option>
                  <option value="daman_diu">Daman & Diu</option>
                  <option value="delhi">Delhi</option>
                  <option value="lakshadweep">Lakshadweep</option>
                  <option value="puducherry">Puducherry</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Country</label>
                <input 
                  type="text" 
                  name="country" 
                  defaultValue="India" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Zip Code</label>
                <input 
                  type="text" 
                  name="postbox" // ⬅️ CORRECTED: Changed from "zip" to "postbox" to match DB column
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">GST Name</label>
                <input 
                  type="text" 
                  name="gst_name" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">GSTIN</label>
                <input 
                  type="text" 
                  name="gst_number" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              {/* Assign Location */}
              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-2">Assign Locations</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {stations.map((s) => (
                    <label key={s.id} className="flex items-center gap-2">
                      <input type="checkbox" name="block_location[]" value={s.id} /> {/* ⬅️ Correct name for multiple selection */}
                      <span>{s.station_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Document 1</label>
                  <input type="file" name="doc1" className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Document 2</label>
                  <input type="file" name="doc2" className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Document 3</label>
                  <input type="file" name="doc3" className="w-full border p-2 rounded" />
                </div>
              </div>

              {/* Permissions */}
              <div className="col-span-2 mt-6">
                <h3 className="text-lg font-semibold mb-3">Module Permissions</h3>
                <div className="overflow-x-auto border rounded">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 border">Module</th>
                        <th className="p-2 border">View</th>
                        <th className="p-2 border">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((mod, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-2 border font-medium">{mod}</td>
                          <td className="p-2 border text-center">
                            <input
                              type="checkbox"
                              checked={permissions[mod].can_view}
                              onChange={() => handlePermissionChange(mod, "can_view")}
                            />
                          </td>
                          <td className="p-2 border text-center">
                            <input
                              type="checkbox"
                              checked={permissions[mod].can_edit}
                              onChange={() => handlePermissionChange(mod, "can_edit")}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="col-span-2 flex justify-center gap-4 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {loading ? "Saving..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
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