"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FiEdit, FiLoader, FiMapPin, FiPackage, FiSave, FiSettings, FiUser } from "react-icons/fi";

function EditCustomerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const customerId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingDayLimit, setUpdatingDayLimit] = useState(false);

  // Permissions State - Keys must match those checked in cstsidebar.jsx
  const [permissions, setPermissions] = useState({
    dashboard: { can_view: true, can_edit: false },
    filling_requests: { can_view: false, can_edit: false },
    loading_stations: { can_view: false, can_edit: false },
    customer_history: { can_view: false, can_edit: false },
  });

  // Mapping for UI display
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

  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    region: "",
    postbox: "",
    customer_type: "Enable",
    billing_type: "1",
    payment_type: "1",
    client_type: "1", // 1=Prepaid, 2=Postpaid, 3=Day Limit
    day_limit: "0",
    blocklocation: [],
    products: [],
    status: "1", // Default to Enable
    gst_name: "",
    gst_number: "",
  });

  // Indian states for region dropdown
  const regions = {
    'andhra_pradesh': 'Andhra Pradesh',
    'arunachal_pradesh': 'Arunachal Pradesh',
    'assam': 'Assam',
    'bihar': 'Bihar',
    'chhattisgarh': 'Chhattisgarh',
    'goa': 'Goa',
    'gujarat': 'Gujarat',
    'haryana': 'Haryana',
    'himachal_pradesh': 'Himachal Pradesh',
    'jharkhand': 'Jharkhand',
    'karnataka': 'Karnataka',
    'kerala': 'Kerala',
    'madhya_pradesh': 'Madhya Pradesh',
    'maharashtra': 'Maharashtra',
    'manipur': 'Manipur',
    'meghalaya': 'Meghalaya',
    'mizoram': 'Mizoram',
    'nagaland': 'Nagaland',
    'odisha': 'Odisha',
    'punjab': 'Punjab',
    'rajasthan': 'Rajasthan',
    'sikkim': 'Sikkim',
    'tamil_nadu': 'Tamil Nadu',
    'telangana': 'Telangana',
    'tripura': 'Tripura',
    'uttar_pradesh': 'Uttar Pradesh',
    'uttarakhand': 'Uttarakhand',
    'west_bengal': 'West Bengal'
  };

  const [stations, setStations] = useState([]);
  const [productList, setProductList] = useState([]);

  // -------------------------------
  // Fetch customer & station data
  // -------------------------------
  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        );

        const apiCallPromise = Promise.all([
          axios.get(`/api/customers/edit?id=${customerId}`),
          axios.get(`/api/stations`),
          axios.get(`/api/products`)
        ]);

        const [customerResponse, stationData, prodData] = await Promise.race([
          apiCallPromise,
          timeoutPromise
        ]);

        console.log('Customer Response:', customerResponse.data);
        console.log('Station Data:', stationData.data);
        console.log('Product Data:', prodData.data);

        setStations(stationData.data || []);
        setProductList(prodData.data || []);

        // Handle different response structures
        let customer;
        if (customerResponse.data?.success && customerResponse.data?.data?.customer) {
          customer = customerResponse.data.data.customer;
        } else if (customerResponse.data?.data) {
          customer = customerResponse.data.data;
        } else if (customerResponse.data?.customer) {
          customer = customerResponse.data.customer;
        } else {
          customer = customerResponse.data;
        }

        if (!customer || !customer.id) {
          throw new Error('Invalid customer data received');
        }

        console.log('Customer Data:', customer);

        // Convert billing_type to string if it's a number
        let billingType = customer.billing_type;
        if (typeof billingType === 'number') {
          billingType = billingType.toString();
        } else if (!billingType) {
          billingType = "1"; // Default to "Billing"
        }

        // Get payment_type (gid) from customer data
        let paymentType = customer.gid || customer.payment_type || "1";
        if (typeof paymentType === 'string') {
          paymentType = paymentType === 'Cash' ? '1' : (paymentType === 'Credit' ? '2' : paymentType);
        } else {
          paymentType = paymentType.toString();
        }

        // Get status as numeric (1 or 0) - Default to '1' (Enable) if not set
        // Only set to '0' (Disable) if explicitly '0' or 'Disable', otherwise default to '1' (Enable)
        let statusValue = customer.status;
        if (statusValue === null || statusValue === undefined || statusValue === '' || statusValue === 'undefined') {
          statusValue = '1'; // Default to Enable
        } else if (typeof statusValue === 'string') {
          // Only set to '0' if explicitly "Disable", otherwise default to '1' (Enable)
          statusValue = (statusValue.toLowerCase() === 'disable') ? '0' : '1';
        } else {
          // Only set to '0' if explicitly 0, otherwise default to '1' (Enable)
          statusValue = (statusValue === 0) ? '0' : '1';
        }

        // Ensure customer_type also defaults to '1' (Enable) if not explicitly set to '0' (Disable)
        let customerTypeValue = customer.customer_type;
        if (customerTypeValue === null || customerTypeValue === undefined || customerTypeValue === '' || customerTypeValue === 'undefined') {
          customerTypeValue = '1'; // Default to Enable
        } else if (typeof customerTypeValue === 'string') {
          // Only set to '0' if explicitly "Disable", otherwise default to '1' (Enable)
          customerTypeValue = (customerTypeValue.toLowerCase() === 'disable') ? '0' : '1';
        } else {
          // Only set to '0' if explicitly 0, otherwise default to '1' (Enable)
          customerTypeValue = (customerTypeValue === 0) ? '0' : '1';
        }

        // If customer_type is not set, use statusValue, but ensure it defaults to '1' (Enable)
        if (!customer.customer_type) {
          customerTypeValue = statusValue;
        }

        // Get client_type from customer (1=Prepaid, 2=Postpaid, 3=Day Limit)
        let clientType = customer.client_type || paymentType;
        if (typeof clientType === 'number') {
          clientType = clientType.toString();
        } else if (!clientType) {
          clientType = paymentType; // Fallback to payment_type
        }

        // Fetch customer balance info for day_limit
        let dayLimit = 0;
        let cstLimit = 0;
        try {
          const balanceRes = await axios.get(`/api/customers/recharge-request?id=${customerId}`);
          if (balanceRes.data.success && balanceRes.data.customer) {
            dayLimit = balanceRes.data.customer.day_limit || 0;
            cstLimit = balanceRes.data.customer.cst_limit || 0;
          }
        } catch (err) {
          console.error('Error fetching balance info:', err);
        }

        setForm({
          id: customer.id || customerId,
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          password: "",
          address: customer.address || "",
          region: customer.region || "",
          postbox: customer.postbox || "",
          customer_type: customerTypeValue, // Use customerTypeValue which defaults to '1' (Enable)
          billing_type: billingType,
          payment_type: paymentType,
          client_type: clientType,
          day_limit: dayLimit.toString(),
          cst_limit: cstLimit.toString(),
          blocklocation: customer.blocklocation || [],
          products: customer.products || [],
          status: statusValue,
          gst_name: customer.gst_name || "",
          gst_number: customer.gst_number || "",
        });

        // Populate permissions if available
        if (customer.permissions) {
          setPermissions(prev => {
            const merged = { ...prev };
            Object.keys(customer.permissions).forEach(mod => {
              // Only update matches or add new ones if structure matches expectations
              // Use loose matching for safety
              if (merged[mod]) {
                merged[mod] = {
                  ...merged[mod],
                  can_view: customer.permissions[mod].can_view,
                  can_edit: customer.permissions[mod].can_edit
                };
              } else {
                // Or just add it (though usually we stick to predefined modules)
                merged[mod] = {
                  can_view: customer.permissions[mod].can_view,
                  can_edit: customer.permissions[mod].can_edit
                };
              }
            });
            return merged;
          });
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        const errorDetails = err?.response?.data;
        const errorMessage = err?.message;
        console.error('Error details:', errorDetails);

        // Set loading to false regardless of error
        setLoading(false);

        // Show error message
        const errorMsg = errorDetails?.message || errorMessage || 'Failed to load customer data';
        alert('Error loading customer data: ' + errorMsg);

        // Redirect back if customer not found
        if (err?.response?.status === 404) {
          router.push('/customers');
        }
      }
    };

    fetchData();
  }, [customerId]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleStation = (id) => {
    let updated = [...form.blocklocation];

    if (updated.includes(id)) {
      updated = updated.filter((x) => x !== id);
    } else {
      updated.push(id);
    }

    updateForm("blocklocation", updated);
  };

  const handleProductChange = (id) => {
    let updated = [...form.products];

    if (updated.includes(id)) {
      updated = updated.filter((x) => x !== id);
    } else {
      updated.push(id);
    }

    updateForm("products", updated);
  };

  // Handle immediate status update (like PHP AJAX)
  const handleStatusChange = async (newStatus) => {
    try {
      updateForm("status", newStatus);

      // Immediately update status via API (like PHP update_customer_status.php)
      const response = await axios.put(`/api/customers/edit`, {
        id: customerId,
        status: newStatus
      });

      if (response.data.success) {
        console.log('Status updated successfully');
      } else {
        console.error('Status update failed:', response.data.message);
        // Revert status on failure
        updateForm("status", form.status);
        alert('Failed to update status: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Status update error:', err);
      // Revert status on error
      updateForm("status", form.status);
      alert('Error updating status: ' + (err.response?.data?.message || err.message));
    }
  };

  const submitForm = async () => {
    try {
      setSaving(true);

      // Prepare the data to send
      const updateData = {
        id: customerId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        address: form.address,
        region: form.region,
        postbox: form.postbox,
        billing_type: form.billing_type,
        payment_type: form.payment_type, // gid
        client_type: form.client_type, // client_type (1=Prepaid, 2=Postpaid, 3=Day Limit)
        day_limit: form.client_type === "3" ? parseInt(form.day_limit) : null, // Only set if day_limit customer
        cst_limit: form.client_type === "2" ? parseFloat(form.cst_limit) : 0, // Only set if postpaid
        status: form.status,
        gst_name: form.gst_name,
        gst_number: form.gst_number,
        products: form.products,
        blocklocation: form.blocklocation,
        permissions: permissions, // Include permissions in the update data
      };

      console.log('Sending update data:', updateData);

      const response = await axios.put(`/api/customers/edit`, updateData);
      console.log('Update response:', response.data);

      if (response.data.success) {
        alert("Customer Updated Successfully!");
        // Redirect to customers page
        router.push("/customers");
      } else {
        alert("Error: " + (response.data.message || "Update failed"));
      }
    } catch (err) {
      console.error('Update error:', err);
      console.error('Error response:', err.response?.data);
      alert("Error updating customer: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <FiLoader className="animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600">Loading customer data...</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No Customer Selected</h2>
              <p className="text-gray-600 mb-4">Please select a customer to edit</p>
              <button
                onClick={() => router.push("/customers")}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <span className="text-xl">←</span>
                <span>Go Back to Customers</span>
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="flex-shrink-0 z-50 relative">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 h-full w-full overflow-hidden relative">
        <div className="flex-shrink-0 z-40 shadow-sm sticky top-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-gray-50 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6 border border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.back()}
                    className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors p-2 hover:bg-blue-50 rounded-full"
                    title="Go Back"
                  >
                    ←
                  </button>
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <FiEdit className="text-2xl text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                      Edit Customer
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Customer ID: <span className="font-mono font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{form.id}</span></p>
                  </div>
                </div>
                <button
                  onClick={submitForm}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                >
                  {saving ? (
                    <>
                      <FiLoader className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave className="text-lg" />
                      <span>Update Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Main Form Container - Left & Right Sections Side by Side */}
            <div className="flex flex-col lg:flex-row gap-6">

              {/* LEFT COLUMN - Basic Information */}
              <div className="lg:w-2/3 space-y-6">
                {/* Basic Information Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <FiUser className="text-xl text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Basic Information</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        placeholder="Enter customer name"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        placeholder="customer@example.com"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
                        value={form.phone}
                        onChange={(e) => updateForm("phone", e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
                        value={form.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        placeholder="Leave blank to keep current"
                      />
                    </div>

                    {/* Region */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Region</label>
                      <select
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none bg-white"
                        value={form.region}
                        onChange={(e) => updateForm("region", e.target.value)}
                      >
                        <option value="">Select Region</option>
                        {Object.entries(regions).map(([key, value]) => (
                          <option key={key} value={key}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Postbox */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Postbox</label>
                      <input
                        type="text"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
                        value={form.postbox}
                        onChange={(e) => updateForm("postbox", e.target.value)}
                        placeholder="Postbox number"
                      />
                    </div>

                    {/* Address - Full Width */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input
                        type="text"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
                        value={form.address}
                        onChange={(e) => updateForm("address", e.target.value)}
                        placeholder="Full address"
                      />
                    </div>
                  </div>
                </div>

                {/* Products Section */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="bg-green-50 p-2 rounded-lg">
                      <FiPackage className="text-xl text-green-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Products & Services</h2>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Products</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                      {productList.map((p) => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${form.products.includes(p.id)
                            ? "bg-white border-green-500 shadow-sm ring-1 ring-green-500"
                            : "bg-white border-gray-200 hover:border-blue-300"
                            }`}
                        >
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={form.products.includes(p.id)}
                              onChange={() => handleProductChange(p.id)}
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500 border-gray-300"
                            />
                          </div>
                          <span className="flex-1 text-gray-700 font-medium text-sm">
                            {p.pname || p.product_name || `Product ${p.id}`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Module Permissions */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="bg-indigo-50 p-2 rounded-lg">
                      <span className="text-xl">🛡️</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Module Permissions</h2>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="p-3 text-left font-semibold text-gray-700 text-sm">Module Name</th>
                          <th className="p-3 text-center font-semibold text-gray-700 text-sm w-24">View</th>
                          <th className="p-3 text-center font-semibold text-gray-700 text-sm w-24">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {modules.map((mod, idx) => (
                          <tr key={idx} className={`hover:bg-indigo-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                            <td className="p-3 font-medium text-gray-700 text-sm">
                              {moduleDisplayNames[mod] || mod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={permissions[mod]?.can_view || false}
                                onChange={() => handlePermissionChange(mod, "can_view")}
                                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer transition"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={permissions[mod]?.can_edit || false}
                                onChange={() => handlePermissionChange(mod, "can_edit")}
                                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer transition"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN - Settings & Stations */}
              <div className="lg:w-1/3 space-y-6">
                {/* Settings Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="bg-purple-50 p-2 rounded-lg">
                      <FiSettings className="text-xl text-purple-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Customer Settings</h2>
                  </div>

                  <div className="space-y-5">
                    {/* Billing Type */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Billing Type</label>
                      <select
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition outline-none bg-white"
                        value={form.billing_type}
                        onChange={(e) => updateForm("billing_type", e.target.value)}
                      >
                        <option value="1">Billing</option>
                        <option value="2">Non Billing</option>
                      </select>
                    </div>

                    {/* Client Type (Payment Type) */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Client Type</label>
                      <select
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition outline-none bg-white"
                        value={form.client_type || form.payment_type}
                        onChange={(e) => {
                          const newClientType = e.target.value;
                          updateForm("client_type", newClientType);
                          updateForm("payment_type", newClientType); // Keep for backward compatibility
                        }}
                      >
                        <option value="1">Cash (Prepaid)</option>
                        <option value="2">Credit (Postpaid)</option>
                        <option value="3">Day Limit</option>
                      </select>
                      <p className="text-xs text-gray-500">
                        Cash = Prepaid, Credit = Postpaid, Day Limit = Day Limit Customer
                      </p>
                    </div>

                    {/* Credit Limit - For Prepaid/Postpaid */}
                    {(form.client_type === "1" || form.client_type === "2") && (
                      <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                          <input
                            type="number"
                            className={`w-full pl-8 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition outline-none ${form.client_type === "1" ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
                              }`}
                            value={form.cst_limit || 0}
                            onChange={(e) => updateForm("cst_limit", e.target.value)}
                            disabled={form.client_type === "1"}
                            placeholder="Enter credit limit"
                          />
                        </div>
                        {form.client_type === "1" && (
                          <p className="text-xs text-gray-500 mt-1">Credit limit is disabled for Prepaid customers.</p>
                        )}
                      </div>
                    )}

                    {/* Day Limit - For Day Limit Customers */}
                    {(form.client_type === "3") && (
                      <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Day Limit (Days)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">📅</span>
                          <input
                            type="number"
                            className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition outline-none"
                            value={form.day_limit || 0}
                            onChange={(e) => updateForm("day_limit", e.target.value)}
                            placeholder="Enter day limit"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Set the number of days for the limit.</p>
                      </div>
                    )}

                    {/* Day Limit Controls - Only for Day Limit customers */}
                    {form.client_type === "3" && (
                      <div className="pt-4 border-t border-gray-100 animate-fade-in">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Day Limit Management</label>
                        <div className="flex gap-2 items-center">
                          <button
                            type="button"
                            disabled={updatingDayLimit || (parseInt(form.day_limit) || 0) <= 0}
                            onClick={async () => {
                              if (updatingDayLimit) return;

                              const currentLimit = parseInt(form.day_limit) || 0;
                              const newDayLimit = Math.max(0, currentLimit - 1);

                              if (newDayLimit === currentLimit) {
                                return;
                              }

                              setUpdatingDayLimit(true);
                              try {
                                const response = await axios.put(`/api/customers/edit`, {
                                  id: customerId,
                                  day_limit: newDayLimit,
                                  client_type: 3
                                });

                                if (response.data.success) {
                                  updateForm("day_limit", newDayLimit.toString());
                                  // Refresh data
                                  const balanceRes = await axios.get(`/api/customers/recharge-request?id=${customerId}`);
                                  if (balanceRes.data.success && balanceRes.data.customer) {
                                    updateForm("day_limit", (balanceRes.data.customer.day_limit || 0).toString());
                                  }
                                } else {
                                  alert('❌ Error: ' + (response.data.message || 'Update failed'));
                                }
                              } catch (err) {
                                console.error('Error updating day limit:', err);
                                alert('❌ Error updating day limit: ' + (err.response?.data?.message || err.message));
                                // Revert on error
                                updateForm("day_limit", currentLimit.toString());
                              } finally {
                                setUpdatingDayLimit(false);
                              }
                            }}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition disabled:bg-gray-100 disabled:text-gray-400"
                            title="Decrease"
                          >
                            {updatingDayLimit ? (
                              <FiLoader className="animate-spin w-5 h-5" />
                            ) : (
                              <span className="text-xl font-bold px-2">−</span>
                            )}
                          </button>

                          <div className="flex-1 text-center font-mono text-lg font-bold bg-gray-50 py-2 rounded border border-gray-200">
                            {form.day_limit}
                          </div>

                          <button
                            type="button"
                            disabled={updatingDayLimit}
                            onClick={async () => {
                              if (updatingDayLimit) return;

                              const currentLimit = parseInt(form.day_limit) || 0;
                              const newDayLimit = currentLimit + 1;

                              setUpdatingDayLimit(true);
                              try {
                                const response = await axios.put(`/api/customers/edit`, {
                                  id: customerId,
                                  day_limit: newDayLimit,
                                  client_type: 3
                                });

                                if (response.data.success) {
                                  updateForm("day_limit", newDayLimit.toString());
                                  // Refresh data
                                  const balanceRes = await axios.get(`/api/customers/recharge-request?id=${customerId}`);
                                  if (balanceRes.data.success && balanceRes.data.customer) {
                                    updateForm("day_limit", (balanceRes.data.customer.day_limit || 0).toString());
                                  }
                                } else {
                                  alert('❌ Error: ' + (response.data.message || 'Update failed'));
                                }
                              } catch (err) {
                                console.error('Error updating day limit:', err);
                                alert('❌ Error updating day limit: ' + (err.response?.data?.message || err.message));
                                // Revert on error
                                updateForm("day_limit", currentLimit.toString());
                              } finally {
                                setUpdatingDayLimit(false);
                              }
                            }}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition disabled:bg-gray-100 disabled:text-gray-400"
                            title="Increase"
                          >
                            {updatingDayLimit ? (
                              <FiLoader className="animate-spin w-5 h-5" />
                            ) : (
                              <span className="text-xl font-bold px-2">+</span>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Updating this value saves immediately.
                        </p>
                      </div>
                    )}

                    {/* Status */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        id="statusDropdown"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition bg-white text-gray-900 cursor-pointer outline-none"
                        value={form.status && form.status === '0' ? '0' : '1'}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          updateForm("status", newStatus);
                          handleStatusChange(newStatus);
                        }}
                      >
                        <option value="1">Enable</option>
                        <option value="0">Disable</option>
                      </select>
                      <p className="text-xs text-gray-500">
                        Immediate update.
                      </p>
                    </div>

                    {/* GST Details */}
                    <div className="pt-4 border-t border-gray-100">
                      <h3 className="text-md font-bold text-gray-800 mb-3 ml-1">GST Information</h3>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">GST Name</label>
                          <input
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition outline-none"
                            value={form.gst_name}
                            onChange={(e) => updateForm("gst_name", e.target.value)}
                            placeholder="GST registered name"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">GST Number</label>
                          <input
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition outline-none"
                            value={form.gst_number}
                            onChange={(e) => updateForm("gst_number", e.target.value)}
                            placeholder="GSTIN number"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stations Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="bg-orange-50 p-2 rounded-lg">
                      <FiMapPin className="text-xl text-orange-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Assigned Stations</h2>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1 customize-scrollbar">
                    {stations.map((station) => (
                      <div
                        key={station.id}
                        onClick={() => handleToggleStation(station.id)}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer border ${form.blocklocation.includes(station.id)
                          ? "bg-orange-50 border-orange-200 shadow-sm"
                          : "bg-white border-gray-200 hover:border-orange-300 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${form.blocklocation.includes(station.id) ? "bg-orange-500" : "bg-gray-300"
                            }`} />
                          <div>
                            <span className="font-medium text-gray-700 block text-sm">{station.station_name}</span>
                            <span className="text-[10px] text-gray-400">ID: {station.id}</span>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${form.blocklocation.includes(station.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                          {form.blocklocation.includes(station.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-blue-800">
                      <span className="font-bold">{form.blocklocation.length}</span> assigned
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Update Button */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
              <button
                onClick={submitForm}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3.5 rounded-lg shadow-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2 active:scale-95"
              >
                {saving ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Update Customer
                  </>
                )}
              </button>
            </div>

            {/* Bottom spacer for mobile button */}
            <div className="h-24 lg:hidden"></div>
          </div>
        </main>
        <div className="flex-shrink-0 z-40 bg-white border-t border-gray-200">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function EditCustomerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <FiLoader className="animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    }>
      <EditCustomerContent />
    </Suspense>
  );
}