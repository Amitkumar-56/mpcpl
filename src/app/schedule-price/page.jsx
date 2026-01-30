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
  const [priceHistory, setPriceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [customersWithPendingUpdates, setCustomersWithPendingUpdates] = useState(new Set());
  const [requireApproval, setRequireApproval] = useState(true);
  const [viewMode, setViewMode] = useState("all"); // "all", "pending", "approved"
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
    // Only fetch if customers are selected
    if (selectedCustomers.length > 0) {
      fetchScheduledPrices(selectedCustomers);
    } else {
      setScheduledPrices([]);
      setScheduleData({});
      setCustomersWithPendingUpdates(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomers, viewMode, scheduleDate, scheduleTime]);

  useEffect(() => {
    if (selectedCustomers.length > 0) {
      fetchPriceHistory(selectedCustomers);
    } else {
      setPriceHistory([]);
    }
  }, [selectedCustomers]);

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

  // Fetch history of scheduled/active/expired prices for selected customers
  const fetchPriceHistory = async (customerIds) => {
    // Validate input
    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      setPriceHistory([]);
      setHistoryLoading(false);
      return;
    }
    
    try {
      setHistoryLoading(true);
      const customerIdsString = customerIds.filter(id => id != null).join(",");
      
      if (!customerIdsString) {
        setPriceHistory([]);
        setHistoryLoading(false);
        return;
      }
      
      const res = await fetch(`/api/schedule-price-logs?customer_ids=${customerIdsString}`);
      
      // Try to parse JSON even if status is not OK
      let result;
      try {
        result = await res.json();
      } catch (parseError) {
        // If JSON parsing fails, create a default error response
        console.error("Error parsing API response:", parseError);
        result = {
          success: false,
          message: `API error: ${res.status} ${res.statusText}`,
          data: []
        };
      }
      
      if (result.success) {
        setPriceHistory(result.data || []);
      } else {
        console.warn("API returned error:", result.message);
        setPriceHistory([]);
        // Don't show alert for history fetch errors, just log them
      }
    } catch (err) {
      console.error("Error fetching price history:", err);
      setPriceHistory([]);
      // Silently handle errors - don't disrupt user experience
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch scheduled prices
  const fetchScheduledPrices = async (customerIds) => {
    // Validate input
    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      setScheduledPrices([]);
      setScheduleData({});
      setCustomersWithPendingUpdates(new Set());
      return;
    }
    
    try {
      const customerIdsString = customerIds.filter(id => id != null).join(',');
      if (!customerIdsString) {
        setScheduledPrices([]);
        setScheduleData({});
        setCustomersWithPendingUpdates(new Set());
        return;
      }
      
      const res = await fetch(`/api/schedule-price?customer_ids=${customerIdsString}`);
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      
      let data = await res.json();
      
      // Handle case where API returns error
      if (data && data.success === false) {
        console.error("API returned error:", data.message);
        setScheduledPrices([]);
        setScheduleData({});
        setCustomersWithPendingUpdates(new Set());
        return;
      }
      
      if (Array.isArray(data)) {
        // Track customers with pending updates
        const pendingCustomers = new Set();
        const allData = [...data]; // Keep all data for tracking
        
        // Check which customers have pending (not applied) prices
        allData.forEach(item => {
          if (!item.is_applied && item.status === 'scheduled') {
            pendingCustomers.add(item.customer_id);
          }
        });
        
        // Update pending customers list
        setCustomersWithPendingUpdates(pendingCustomers);
        
        // DON'T auto-unselect here - keep all selected customers
        // Auto-unselect will only happen when prices are applied (in handleApplyPrices)
        
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
        setCustomersWithPendingUpdates(new Set());
      }
    } catch (err) {
      console.error("Error fetching scheduled prices:", err);
      // Don't show alert for empty selections, only for actual errors
      if (customerIds && customerIds.length > 0) {
        console.warn("Failed to fetch scheduled prices for customers:", customerIds);
      }
      setScheduledPrices([]);
      setScheduleData({});
      setCustomersWithPendingUpdates(new Set());
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId) => {
    // Check if customer has pending updates
    const hasPending = customersWithPendingUpdates.has(customerId);
    const isCurrentlySelected = selectedCustomers.includes(customerId);
    
    // If trying to unselect a customer with pending updates, prevent it
    if (isCurrentlySelected && hasPending) {
      alert("This customer has pending price updates. Cannot unselect until all prices are applied.");
      return;
    }
    
    // Toggle selection
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        // Unselect customer
        return prev.filter(id => id !== customerId);
      } else {
        // Select customer - add to array
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
          (products || []).forEach(subProduct => {
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
          requireApproval
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        setScheduleData({});
        
        // Immediately mark all selected customers as having pending updates
        // This ensures they stay selected until prices are applied
        setCustomersWithPendingUpdates(prev => {
          const updated = new Set(prev);
          selectedCustomers.forEach(customerId => {
            updated.add(customerId);
          });
          return updated;
        });
        
        // Refresh scheduled prices - customers will stay selected if they have pending updates
        fetchScheduledPrices(selectedCustomers);
        // Refresh history if shown
        if (showHistory) {
          fetchPriceHistory(selectedCustomers);
        }
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
        
        // Refresh scheduled prices first
        const res2 = await fetch(`/api/schedule-price?customer_ids=${selectedCustomers.join(',')}`);
        const data = await res2.json();
        
        if (Array.isArray(data)) {
          // Check which customers still have pending updates
          const stillPending = new Set();
          data.forEach(item => {
            if (!item.is_applied && item.status === 'scheduled') {
              stillPending.add(item.customer_id);
            }
          });
          
          // Auto-unselect customers whose all prices are now applied
          setSelectedCustomers(prev => {
            return prev.filter(customerId => {
              // Keep customer if they still have pending updates
              return stillPending.has(customerId);
            });
          });
          
          // Update pending customers list
          setCustomersWithPendingUpdates(stillPending);
          
          // Update scheduled prices display
          let filteredData = data;
          if (viewMode === "pending") {
            filteredData = data.filter(item => !item.is_applied);
          } else if (viewMode === "approved") {
            filteredData = data.filter(item => item.is_applied);
          }
          setScheduledPrices(filteredData);
        }
        
        // Refresh history if shown
        if (showHistory) {
          fetchPriceHistory(selectedCustomers);
        }
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
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold">Schedule Prices - Multiple Customers</h1>
              <button
                type="button"
                onClick={() => {
                  if (!showHistory) {
                    if (selectedCustomers.length > 0) {
                      setShowHistory(true);
                      fetchPriceHistory(selectedCustomers);
                    } else {
                      alert("Please select at least one customer to view history.");
                    }
                  } else {
                    setShowHistory(false);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showHistory 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {showHistory ? "📋 Hide History" : "📋 View History & Logs"}
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Multiple Customers ({selectedCustomers.length} selected)
                  {customersWithPendingUpdates.size > 0 && (
                    <span className="ml-2 text-xs text-yellow-600 font-normal">
                      ({customersWithPendingUpdates.size} with pending updates)
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Select all customers that don't have pending updates
                      const selectableCustomers = (customers || [])
                        .filter(c => c && c.id && !customersWithPendingUpdates.has(c.id))
                        .map(c => c.id);
                      
                      setSelectedCustomers(prev => {
                        const newSelection = [...prev];
                        selectableCustomers.forEach(id => {
                          if (!newSelection.includes(id)) {
                            newSelection.push(id);
                          }
                        });
                        return newSelection;
                      });
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Deselect all customers that don't have pending updates
                      setSelectedCustomers(prev => {
                        return prev.filter(id => customersWithPendingUpdates.has(id));
                      });
                    }}
                    className="px-3 py-1 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {(customers || []).map((customer) => {
                  if (!customer || !customer.id) return null;
                  
                  const hasPending = customersWithPendingUpdates.has(customer.id);
                  const isSelected = selectedCustomers.includes(customer.id);
                  const isDisabled = hasPending && isSelected; // Disable only if selected AND has pending
                  
                  return (
                    <div 
                      key={customer.id} 
                      className={`flex items-center ${hasPending && isSelected ? 'bg-yellow-50 p-1 rounded' : ''}`}
                    >
                      <input
                        type="checkbox"
                        id={`customer-${customer.id}`}
                        checked={isSelected}
                        onChange={() => {
                          handleCustomerSelect(customer.id);
                        }}
                        disabled={isDisabled}
                        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      />
                      <label
                        htmlFor={`customer-${customer.id}`}
                        className={`ml-2 text-sm ${
                          hasPending && isSelected 
                            ? 'text-yellow-700 font-medium' 
                            : 'text-gray-700'
                        } ${isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                      >
                        {customer.name || "Unknown"}
                        {hasPending && isSelected && (
                          <span className="ml-1 text-xs text-yellow-600">⏳ Pending</span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
              {customersWithPendingUpdates.size > 0 && (
                <p className="mt-2 text-xs text-yellow-600">
                  ⚠️ Customers with pending updates cannot be unselected until all prices are applied.
                </p>
              )}
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
                {(stations || []).map((station) => (
                  <div key={station.id} className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-xl text-gray-900 flex items-center">
                        <span className="mr-3 text-2xl">📍</span>
                        {station.station_name}
                      </h2>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {products?.length || 0} Products
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ID: {station.id}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {(products || []).map((subProduct) => {
                        if (!subProduct || !subProduct.code_id) {
                          return null;
                        }
                        
                        // Get current price value for this sub-product
                        const firstCustomerKey = selectedCustomers && selectedCustomers.length > 0 
                          ? `${selectedCustomers[0]}_${station.id}_${subProduct.code_id}_${scheduleDate}_${scheduleTime}`
                          : null;
                        const currentValue = firstCustomerKey && scheduleData && scheduleData[firstCustomerKey] 
                          ? scheduleData[firstCustomerKey].price || ""
                          : "";
                        
                        return (
                          <div 
                            key={subProduct.code_id} 
                            className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-blue-300"
                          >
                            <div className="mb-3">
                              <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight">
                                {subProduct.product_name || "Unknown Product"}
                              </h3>
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {subProduct.pcode || "N/A"}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  ID: {subProduct.code_id}
                                </span>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">₹</span>
                              </div>
                              <input
                                type="number"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={currentValue}
                                onChange={(e) => {
                                  if (selectedCustomers && selectedCustomers.length > 0) {
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
                                  } else {
                                    alert("Please select at least one customer first");
                                  }
                                }}
                                className="w-full pl-8 pr-3 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all duration-200 hover:border-gray-400"
                              />
                            </div>
                            
                            {currentValue && (
                              <div className="mt-2 text-xs text-green-600 font-medium">
                                ✓ Price set for {selectedCustomers.length} customer(s)
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex flex-col sm:flex-row items-center justify-center mt-10 gap-4">
                  <button
                    type="submit"
                    disabled={loading || selectedCustomers.length === 0}
                    className="px-12 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 w-full sm:w-auto transform"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving Schedule...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <span className="mr-2">💾</span>
                        Save Schedule for {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                  
                  {selectedCustomers.length === 0 && (
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-gray-500 flex items-center">
                        <span className="mr-2">ℹ️</span>
                        Please select at least one customer to continue
                      </p>
                    </div>
                  )}
                </div>
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
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
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

                  {/* Mobile Cards */}
                  <div className="block md:hidden space-y-4">
                    {scheduledPrices.map((item, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.customer_name}</h3>
                            <p className="text-sm text-gray-600">{item.station_name}</p>
                          </div>
                          {getStatusBadge(item.status, item.is_applied)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Product:</span>
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Code:</span>
                            <p className="font-medium text-gray-900">{item.product_code}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <p className="font-semibold text-green-600">₹{item.price}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <p className="font-medium text-gray-900">{item.Schedule_Date}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Time:</span>
                            <p className="font-medium text-gray-900">{item.Schedule_Time}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Applied:</span>
                            <p className="font-medium text-gray-900 text-xs">
                              {item.applied_at ? new Date(item.applied_at).toLocaleString() : 'Not Applied'}
                            </p>
                          </div>
                        </div>
                        
                        {viewMode === "pending" && permissions.can_edit && (
                          <button
                            onClick={() => handleApplyPrices([item.id])}
                            className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            Apply Price
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Price Change History */}
          {showHistory && (
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 mt-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">Price Change History & Logs</h2>
                {selectedCustomers.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Total Records: <span className="font-semibold">{priceHistory.length}</span>
                  </div>
                )}
              </div>

              {selectedCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Please select at least one customer to view their price history.
                </p>
              ) : historyLoading ? (
                <p className="text-gray-500">Loading history...</p>
              ) : priceHistory.length === 0 ? (
                <p className="text-gray-500">No history found for the selected customers.</p>
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
                        <th className="px-3 py-2 border text-right">Price</th>
                        <th className="px-3 py-2 border text-left">Scheduled Date</th>
                        <th className="px-3 py-2 border text-left">Scheduled Time</th>
                        <th className="px-3 py-2 border text-left">Applied At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceHistory.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 border">
                            {getStatusBadge(item.status, item.is_applied)}
                          </td>
                          <td className="px-3 py-2 border">{item.customer_name || "-"}</td>
                          <td className="px-3 py-2 border">{item.station_name || "-"}</td>
                          <td className="px-3 py-2 border">{item.product_name || "-"}</td>
                          <td className="px-3 py-2 border">{item.product_code || "-"}</td>
                          <td className="px-3 py-2 border text-right">₹{parseFloat(item.price || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 border">{item.Schedule_Date || "-"}</td>
                          <td className="px-3 py-2 border">{item.Schedule_Time || "-"}</td>
                          <td className="px-3 py-2 border">
                            {item.applied_at ? new Date(item.applied_at).toLocaleString() : "Not Applied"}
                          </td>
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
