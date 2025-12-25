"use client";

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
    status: "1",
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
        const [customerResponse, stationData, prodData] = await Promise.all([
          axios.get(`/api/customers/edit?id=${customerId}`),
          axios.get(`/api/stations`),
          axios.get(`/api/products`)
        ]);

        console.log('Customer Response:', customerResponse.data);
        console.log('Station Data:', stationData.data);
        console.log('Product Data:', prodData.data);

        setStations(stationData.data || []);
        setProductList(prodData.data || []);

        const customer = customerResponse.data.data?.customer || customerResponse.data;
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

        // Get status as numeric (1 or 0)
        let statusValue = customer.status;
        if (typeof statusValue === 'string') {
          statusValue = (statusValue === 'Enable' || statusValue.toLowerCase() === 'enable') ? '1' : '0';
        } else {
          statusValue = statusValue === 1 ? '1' : '0';
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
        try {
          const balanceRes = await axios.get(`/api/customers/recharge-request?id=${customerId}`);
          if (balanceRes.data.success && balanceRes.data.customer) {
            dayLimit = balanceRes.data.customer.day_limit || 0;
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
          customer_type: customer.status === 1 ? '1' : '0',
          billing_type: billingType,
          payment_type: paymentType,
          client_type: clientType,
          day_limit: dayLimit.toString(),
          blocklocation: customer.blocklocation || [],
          products: customer.products || [],
          status: statusValue,
          gst_name: customer.gst_name || "",
          gst_number: customer.gst_number || "",
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        console.error('Error details:', err.response?.data);
        alert('Error loading customer data: ' + (err.response?.data?.message || err.message));
        setLoading(false);
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
        status: form.status,
        gst_name: form.gst_name,
        gst_number: form.gst_number,
        products: form.products,
        blocklocation: form.blocklocation,
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <FiLoader className="animate-spin text-4xl text-blue-600 mb-4" />
          <p className="text-gray-600">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Customer Selected</h2>
          <p className="text-gray-600 mb-4">Please select a customer to edit</p>
          <button
            onClick={() => router.push("/customers")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Go Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FiEdit className="text-2xl text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Edit Customer
                </h1>
                <p className="text-gray-600 mt-1">Customer ID: <span className="font-semibold">{form.id}</span></p>
              </div>
            </div>
            <button
              onClick={submitForm}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium disabled:opacity-70 hover:scale-105 active:scale-95"
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
        </div>

        {/* Main Form Container - Left & Right Sections Side by Side */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN - Basic Information */}
          <div className="lg:w-2/3">
            {/* Basic Information Card */}
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <FiUser className="text-xl text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">Basic Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postbox</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={form.postbox}
                    onChange={(e) => updateForm("postbox", e.target.value)}
                    placeholder="Postbox number"
                  />
                </div>

                {/* Address - Full Width */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={form.address}
                    onChange={(e) => updateForm("address", e.target.value)}
                    placeholder="Full address"
                  />
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <FiPackage className="text-xl text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">Products & Services</h2>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Products</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2">
                  {productList.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        form.products.includes(p.id)
                          ? "bg-green-50 border border-green-200 shadow-sm"
                          : "hover:bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={form.products.includes(p.id)}
                          onChange={() => handleProductChange(p.id)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${
                          form.products.includes(p.id)
                            ? "bg-green-600 border-green-600"
                            : "border-gray-300"
                        }`}>
                          {form.products.includes(p.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="flex-1 text-gray-700 font-medium">
                        {p.pname || p.product_name || `Product ${p.id}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN - Settings & Stations */}
          <div className="lg:w-1/3">
            {/* Settings Card */}
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <FiSettings className="text-xl text-purple-600" />
                <h2 className="text-xl font-bold text-gray-800">Customer Settings</h2>
              </div>
              
              <div className="space-y-5">
                {/* Customer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    value={form.customer_type}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      updateForm("customer_type", newStatus);
                      updateForm("status", newStatus);
                      handleStatusChange(newStatus);
                    }}
                  >
                    <option value="1">Enable</option>
                    <option value="0">Disable</option>
                  </select>
                </div>

                {/* Billing Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Billing Type</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    value={form.billing_type}
                    onChange={(e) => updateForm("billing_type", e.target.value)}
                  >
                    <option value="1">Billing</option>
                    <option value="2">Non Billing</option>
                  </select>
                </div>

                {/* Client Type (Payment Type) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Type</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
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
                  <p className="text-xs text-gray-500 mt-1">
                    Cash = Prepaid, Credit = Postpaid, Day Limit = Day Limit Customer
                  </p>
                </div>

                {/* Day Limit Controls - Only for Day Limit customers */}
                {form.client_type === "3" && (
                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Day Limit Management</label>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={async () => {
                          const newDayLimit = Math.max(0, (parseInt(form.day_limit) || 0) - 1);
                          updateForm("day_limit", newDayLimit.toString());
                          try {
                            await axios.put(`/api/customers/edit`, {
                              id: customerId,
                              day_limit: newDayLimit,
                              client_type: 3
                            });
                            alert(`Day limit decreased to ${newDayLimit} days`);
                          } catch (err) {
                            alert('Error updating day limit: ' + (err.response?.data?.message || err.message));
                          }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        - Decrease
                      </button>
                      <input
                        type="number"
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-center font-semibold"
                        value={form.day_limit || 0}
                        onChange={(e) => updateForm("day_limit", e.target.value)}
                        min="0"
                        placeholder="Days"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const newDayLimit = (parseInt(form.day_limit) || 0) + 1;
                          updateForm("day_limit", newDayLimit.toString());
                          try {
                            await axios.put(`/api/customers/edit`, {
                              id: customerId,
                              day_limit: newDayLimit,
                              client_type: 3
                            });
                            alert(`Day limit increased to ${newDayLimit} days`);
                          } catch (err) {
                            alert('Error updating day limit: ' + (err.response?.data?.message || err.message));
                          }
                        }}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                      >
                        + Increase
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Admin can increase/decrease day limit for day_limit customers
                    </p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    id="statusDropdown"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    value={form.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="1">Enable</option>
                    <option value="0">Disable</option>
                  </select>
                </div>

                {/* GST Details */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">GST Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GST Name</label>
                      <input
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                        value={form.gst_name}
                        onChange={(e) => updateForm("gst_name", e.target.value)}
                        placeholder="GST registered name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                      <input
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
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
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <FiMapPin className="text-xl text-orange-600" />
                <h2 className="text-xl font-bold text-gray-800">Assigned Stations</h2>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {stations.map((station) => (
                  <div
                    key={station.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      form.blocklocation.includes(station.id)
                        ? "bg-orange-50 border border-orange-200 shadow-sm"
                        : "hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        form.blocklocation.includes(station.id) ? "bg-orange-500" : "bg-gray-300"
                      }`} />
                      <div>
                        <span className="font-medium text-gray-700 block">{station.station_name}</span>
                        <span className="text-xs text-gray-500">ID: {station.id}</span>
                      </div>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.blocklocation.includes(station.id)}
                        onChange={() => handleToggleStation(station.id)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-5 rounded-full transition-colors ${
                        form.blocklocation.includes(station.id)
                          ? "bg-orange-500"
                          : "bg-gray-300"
                      }`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          form.blocklocation.includes(station.id)
                            ? "transform translate-x-6"
                            : "transform translate-x-0.5"
                        }`} />
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{form.blocklocation.length}</span> of <span className="font-semibold">{stations.length}</span> stations assigned
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Update Button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-10">
          <button
            onClick={submitForm}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <FiLoader className="animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <FiSave />
                Update Customer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function EditCustomerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <FiLoader className="animate-spin text-4xl text-blue-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <EditCustomerContent />
    </Suspense>
  );
}