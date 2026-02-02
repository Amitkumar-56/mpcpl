//src/app/customers/add/page.jsx
"use client";

import { useSession } from '@/context/SessionContext';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    dashboard: { can_view: true, can_edit: false },
    filling_requests: { can_view: false, can_edit: false },
    loading_stations: { can_view: false, can_edit: false },
    customer_history: { can_view: false, can_edit: false },
  });

  const moduleDisplayNames = {
    dashboard: "Dashboard",
    filling_requests: "Filling Requests",
    loading_stations: "Loading Stations",
    customer_history: "Loading History"
  };

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
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base">Checking permissions...</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div className="text-center bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-md w-full">
              <div className="text-red-500 text-4xl sm:text-6xl mb-4">🚫</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">You don't have permission to create customers.</p>
              <button
                onClick={() => router.push('/customers')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors text-sm sm:text-base flex items-center gap-2"
              >
                <span className="text-lg">←</span>
                <span>Go Back</span>
              </button>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0 z-50 relative">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full w-full overflow-hidden relative">
        {/* Header */}
        <div className="flex-shrink-0 z-40 shadow-sm sticky top-0">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-gray-50 scroll-smooth">
          <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl p-4 sm:p-8 border border-gray-100">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-xl">👤</span>
              Add New Customer
            </h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Client Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="client_name"
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter client name"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Role <span className="text-red-500">*</span></label>
                <select
                  name="role"
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="1">Client</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Phone <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Contact number"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Email address"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Customer Image (Optional)</label>
                <input
                  type="file"
                  name="customer_image"
                  accept="image/*"
                  className="w-full border border-gray-300 p-2 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Secure password"
                />
              </div>

              {/* Customer Type */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Customer Type <span className="text-red-500">*</span></label>
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="1">Prepaid Client</option>
                  <option value="2">Postpaid Client</option>
                  <option value="3">Day Limit Client</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Billing Type</label>
                <select
                  name="billing_type"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="1">Billing</option>
                  <option value="2">Non Billing</option>
                </select>
              </div>

              {/* Conditional Fields */}
              {clientType === "2" && (
                <div className="space-y-1 bg-yellow-50 p-3 rounded-lg border border-yellow-200 animate-fade-in">
                  <label className="block font-semibold text-gray-800 text-sm">
                    Credit Limit (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amtlimit"
                    step="0.01"
                    required
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                    placeholder="Enter credit limit amount"
                  />
                </div>
              )}

              {clientType === "3" && (
                <div className="space-y-1 bg-yellow-50 p-3 rounded-lg border border-yellow-200 animate-fade-in">
                  <label className="block font-semibold text-gray-800 text-sm">
                    Day Limit (Days) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="day_limit"
                    required
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                    placeholder="Enter number of days"
                  />
                </div>
              )}

              {/* Products */}
              <div className="col-span-2 space-y-2">
                <label className="block font-semibold text-gray-700 text-sm">Select Products</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-gray-50">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-200 hover:border-blue-400 cursor-pointer transition-colors shadow-sm">
                      <input type="checkbox" name="products[]" value={p.id} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      <span className="text-sm text-gray-700 font-medium">{p.pname}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div className="col-span-2 space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Address</label>
                <textarea
                  name="address"
                  rows="3"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                  placeholder="Full address"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">City</label>
                <input
                  type="text"
                  name="city"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="City"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">State</label>
                <select name="region" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" required>
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

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Country</label>
                <input
                  type="text"
                  name="country"
                  defaultValue="India"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">Postbox / Zip Code</label>
                <input
                  type="text"
                  name="postbox"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Zip Code"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">GST Name</label>
                <input
                  type="text"
                  name="gst_name"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="GST Registered Name"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-gray-700 text-sm">GSTIN</label>
                <input
                  type="text"
                  name="gst_number"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="GST Number"
                />
              </div>

              {/* Assign Location */}
              <div className="col-span-2 space-y-2">
                <label className="block font-semibold text-gray-700 text-sm">Assign Locations</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-gray-50">
                  {stations.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-200 hover:border-blue-400 cursor-pointer transition-colors shadow-sm">
                      <input type="checkbox" name="block_location[]" value={s.id} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      <span className="text-sm text-gray-700 font-medium">{s.station_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="block font-semibold text-gray-700 text-sm">Document 1</label>
                  <input type="file" name="doc1" className="w-full border border-gray-300 p-2 rounded-lg text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700" />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-gray-700 text-sm">Document 2</label>
                  <input type="file" name="doc2" className="w-full border border-gray-300 p-2 rounded-lg text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700" />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-gray-700 text-sm">Document 3</label>
                  <input type="file" name="doc3" className="w-full border border-gray-300 p-2 rounded-lg text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700" />
                </div>
              </div>

              {/* Permissions */}
              <div className="col-span-2 mt-2 border-t pt-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">🛡️</span> Module Permissions
                </h3>
                <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100 border-b border-gray-300">
                      <tr>
                        <th className="p-3 text-left font-semibold text-gray-700 text-sm">Module Name</th>
                        <th className="p-3 text-center font-semibold text-gray-700 text-sm w-24">View</th>
                        <th className="p-3 text-center font-semibold text-gray-700 text-sm w-24">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {modules.map((mod, idx) => (
                        <tr key={idx} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                          <td className="p-3 font-medium text-gray-700 text-sm">
                            {moduleDisplayNames[mod] || mod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={permissions[mod].can_view}
                              onChange={() => handlePermissionChange(mod, "can_view")}
                              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={permissions[mod].can_edit}
                              onChange={() => handlePermissionChange(mod, "can_edit")}
                              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="col-span-2 flex flex-col sm:flex-row justify-end gap-4 mt-6 border-t pt-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2 justify-center"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span>Save Customer</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>

        {/* Footer */}
        <div className="flex-shrink-0 z-40 bg-white border-t border-gray-200">
          <Footer />
        </div>
      </div>
    </div>
  );
}
