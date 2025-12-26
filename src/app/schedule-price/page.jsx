//src/app/schedule-price/page.jsx
"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SchedulePriceContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(false);
  const [scheduledPrices, setScheduledPrices] = useState([]);
  const [requireApproval, setRequireApproval] = useState(true);
  const [viewMode, setViewMode] = useState("all"); // "all", "pending", "approved"
  const [bulkUpdateSamePrice, setBulkUpdateSamePrice] = useState(true); // Enable bulk update by default
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduleTime, setScheduleTime] = useState(new Date().toTimeString().slice(0, 5));
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false
  });

  // Check permissions
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      checkPermissions();
    }
  }, [user, authLoading, router]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true });
      fetchSetupData();
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['Schedule Prices']) {
      const schedulePerms = user.permissions['Schedule Prices'];
      if (schedulePerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: schedulePerms.can_view,
          can_edit: schedulePerms.can_edit,
          can_delete: schedulePerms.can_delete
        });
        fetchSetupData();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Schedule Prices`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchSetupData();
        return;
      }
    }

    try {
      const moduleName = 'Schedule Prices';
      const [viewRes, editRes, deleteRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`)
      ]);

      const [viewData, editData, deleteData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        deleteRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed
      };

      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        fetchSetupData();
      } else {
        setHasPermission(false);
        setPermissions(perms);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    if (hasPermission) {
      fetchSetupData();
    }
  }, [hasPermission]);

  useEffect(() => {
    if (selectedCustomers.length > 0) {
      fetchScheduledPrices(selectedCustomers);
    } else {
      setScheduledPrices([]);
      setScheduleData({});
    }
  }, [selectedCustomers, viewMode, scheduleDate, scheduleTime]);

  // Fetch setup data
  const fetchSetupData = async () => {
    try {
      const res = await fetch("/api/schedule-price");
      const result = await res.json();
      
      if (result.success) {
        setProducts(result.products);
        setStations(result.stations);
        setCustomers(result.customers);
      } else {
        alert("Error loading setup data");
      }
    } catch (err) {
      console.error("Error fetching setup data:", err);
      alert("Server error while loading data");
    }
  };

  // Fetch scheduled prices
  const fetchScheduledPrices = async (customerIds) => {
    try {
      const res = await fetch(`/api/schedule-price?customer_ids=${customerIds.join(',')}`);
      let data = await res.json();
      
      if (Array.isArray(data)) {
        // Filter based on view mode
        if (viewMode === "pending") {
          data = data.filter(item => !item.is_applied);
        } else if (viewMode === "approved") {
          data = data.filter(item => item.is_applied);
        }
        
        setScheduledPrices(data);
        
        // Pre-fill form with existing data (only pending approvals)
        const initialData = {};
        data.forEach(item => {
          if (!item.is_applied) {
            const key = `${item.customer_id}_${item.station_id}_${item.sub_product_id}_${item.Schedule_Date}_${item.Schedule_Time}`;
            initialData[key] = {
              price: item.price,
              date: item.Schedule_Date,
              time: item.Schedule_Time,
              product_id: item.product_id,
              record_id: item.id
            };
          }
        });
        setScheduleData(initialData);
      } else {
        setScheduledPrices([]);
      }
    } catch (err) {
      console.error("Error fetching scheduled prices:", err);
      setScheduledPrices([]);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  // Handle input change
  const handleChange = (customerId, stationId, codeId, productId, date, time, field, value) => {
    const key = `${customerId}_${stationId}_${codeId}_${date}_${time}`;
    setScheduleData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
        product_id: productId,
        date: date,
        time: time
      },
    }));
  };

  // Group products by main product
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.product_id]) {
      acc[product.product_id] = {
        product_name: product.product_name,
        sub_products: []
      };
    }
    acc[product.product_id].sub_products.push(product);
    return acc;
  }, {});

  // Submit scheduled prices
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedCustomers.length === 0) {
      alert("Please select at least one customer first");
      return;
    }

    setLoading(true);

    try {
      const updates = [];

      // Collect all updates for all selected customers
      selectedCustomers.forEach(customerId => {
        stations.forEach(station => {
          Object.values(groupedProducts).forEach(group => {
            group.sub_products.forEach(subProduct => {
              // Use scheduleDate and scheduleTime from state
              const key = `${customerId}_${station.id}_${subProduct.code_id}_${scheduleDate}_${scheduleTime}`;
              const data = scheduleData[key];
              
              // Only update if price is entered and greater than 0 (zero will never update)
              if (data && data.price && parseFloat(data.price) > 0) {
                updates.push({
                  customer_id: customerId,
                  station_id: station.id,
                  product_id: subProduct.product_id,
                  sub_product_id: subProduct.code_id,
                  price: parseFloat(data.price),
                  schedule_date: scheduleDate,
                  schedule_time: scheduleTime
                });
              }
            });
          });
        });
      });

      if (updates.length === 0) {
        alert("Please enter at least one scheduled price");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/schedule-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          customerIds: selectedCustomers,
          updates,
          requireApproval,
          bulkUpdateSamePrice // Enable bulk update for customers with same price
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        setScheduleData({});
        fetchScheduledPrices(selectedCustomers);
      } else {
        alert("Error saving schedule: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  // Apply scheduled prices
  const handleApplyPrices = async (priceIds) => {
    try {
      const res = await fetch("/api/schedule-price", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          priceIds
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        fetchScheduledPrices(selectedCustomers);
      } else {
        alert("Error applying prices: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // Auto-update prices (cron job simulation)
  const handleAutoUpdate = async () => {
    try {
      const res = await fetch("/api/schedule-price", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        fetchScheduledPrices(selectedCustomers);
      } else {
        alert("Error auto-updating: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // Status badge component
  const getStatusBadge = (status, isApplied) => {
    if (isApplied) {
      return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Applied</span>;
    }
    
    switch (status) {
      case 'active':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Active</span>;
      case 'scheduled':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Scheduled</span>;
      case 'expired':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Expired</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Pending</span>;
    }
  };

  if (authLoading) {
    return null;
  }

  // Check if user has view permission
  if (!hasPermission) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to view Schedule Prices.</p>
              <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {/* Customer Selection */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
            <h1 className="text-xl font-bold mb-4">Schedule Prices - Multiple Customers</h1>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Multiple Customers ({selectedCustomers.length} selected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`customer-${customer.id}`}
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => handleCustomerSelect(customer.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`customer-${customer.id}`}
                      className="ml-2 text-sm text-gray-700"
                    >
                      {customer.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Bulk Update Setting */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="bulk-update"
                  checked={bulkUpdateSamePrice}
                  onChange={(e) => setBulkUpdateSamePrice(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="bulk-update" className="ml-2 text-sm font-medium text-gray-700">
                  Bulk Update Same Price (Within Selected Customers Only)
                </label>
              </div>
              <p className="text-xs text-gray-600 mt-1 ml-6">
                If enabled, when you set the same price for multiple selected customers, updating one will update all selected customers with that same price. Only selected customers will be affected, not all customers in the system.
              </p>
            </div>

            {/* Approval Settings */}
            <div className="flex gap-4 mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="require-approval"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="require-approval" className="ml-2 text-sm text-gray-700">
                  Require Manual Approval
                </label>
              </div>
            </div>

            {selectedCustomers.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>{selectedCustomers.length} Customers Selected:</strong>
                  {selectedCustomers.map(id => (
                    <span key={id} className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                      {customers.find(c => c.id == id)?.name}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>

          {/* Price Schedule Form */}
          {selectedCustomers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Price Schedule Form</h2>
              
              {/* Date and Time Selection - Mobile Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* View Mode Tabs - Matching Deal Price Design - Mobile Responsive */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setViewMode("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "all" 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  All Prices
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("pending")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "pending" 
                      ? "bg-yellow-600 text-white shadow-md" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("approved")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "approved" 
                      ? "bg-green-600 text-white shadow-md" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Applied
                </button>
                {permissions.can_edit && (
                  <button
                    type="button"
                    onClick={handleAutoUpdate}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-md"
                  >
                    Auto-Update
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                {stations.map((station) => (
                  <div key={station.id} className="mb-6 border-b border-gray-200 pb-6 last:border-b-0">
                    <h2 className="font-semibold text-lg mb-3 flex items-center">
                      <span className="mr-2">📍</span>
                      {station.station_name}
                    </h2>
                    
                    {Object.entries(groupedProducts).map(([productId, group]) => (
                      <div key={productId} className="mb-4">
                        <h3 className="font-medium text-gray-800 mb-2">{group.product_name}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {group.sub_products.map((subProduct) => (
                            <div 
                              key={subProduct.code_id} 
                              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                            >
                              <label className="block font-medium text-gray-700 mb-1">
                                {subProduct.pcode}
                              </label>
                              
                              {/* Price Input */}
                              <input
                                type="number"
                                placeholder="Price"
                                min="0"
                                step="0.01"
                                onChange={(e) => {
                                  selectedCustomers.forEach(customerId => {
                                    handleChange(
                                      customerId,
                                      station.id, 
                                      subProduct.code_id, 
                                      subProduct.product_id,
                                      scheduleDate,
                                      scheduleTime,
                                      "price", 
                                      e.target.value
                                    );
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded-lg mb-2 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : `💾 Save Schedule for ${selectedCustomers.length} Customers`}
                </button>
              </form>
            </div>
          )}

          {/* Existing Scheduled Prices */}
          {selectedCustomers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">
                  Scheduled Prices ({scheduledPrices.length} records)
                </h2>
                {viewMode === "pending" && scheduledPrices.length > 0 && permissions.can_edit && (
                  <button
                    onClick={() => handleApplyPrices(scheduledPrices.map(sp => sp.id))}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Apply All Pending
                  </button>
                )}
              </div>
              
              {scheduledPrices.length === 0 ? (
                <p className="text-gray-500">No scheduled prices found.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full border-collapse min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-3 py-2 border text-left">Status</th>
                        <th className="px-3 py-2 border text-left">Customer</th>
                        <th className="px-3 py-2 border text-left">Station</th>
                        <th className="px-3 py-2 border text-left">Product</th>
                        <th className="px-3 py-2 border text-left">Code</th>
                        <th className="px-3 py-2 border text-left">Price</th>
                        <th className="px-3 py-2 border text-left">Date</th>
                        <th className="px-3 py-2 border text-left">Time</th>
                        <th className="px-3 py-2 border text-left">Applied At</th>
                        {viewMode === "pending" && <th className="px-3 py-2 border text-left">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledPrices.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 border">
                            {getStatusBadge(item.status, item.is_applied)}
                          </td>
                          <td className="px-3 py-2 border">{item.customer_name}</td>
                          <td className="px-3 py-2 border">{item.station_name}</td>
                          <td className="px-3 py-2 border">{item.product_name}</td>
                          <td className="px-3 py-2 border">{item.product_code}</td>
                          <td className="px-3 py-2 border">₹{item.price}</td>
                          <td className="px-3 py-2 border">{item.Schedule_Date}</td>
                          <td className="px-3 py-2 border">{item.Schedule_Time}</td>
                          <td className="px-3 py-2 border">
                            {item.applied_at ? new Date(item.applied_at).toLocaleString() : 'Not Applied'}
                          </td>
                          {viewMode === "pending" && permissions.can_edit && (
                            <td className="px-3 py-2 border">
                              <button
                                onClick={() => handleApplyPrices([item.id])}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                              >
                                Apply
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function SchedulePricePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SchedulePriceContent />
    </Suspense>
  );
}