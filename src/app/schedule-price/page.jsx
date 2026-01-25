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
  
  // Data State
  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Selection State
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [scheduleData, setScheduleData] = useState({});
  const [scheduledPrices, setScheduledPrices] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduleTime, setScheduleTime] = useState(new Date().toTimeString().slice(0, 5));
  const [bulkPriceInput, setBulkPriceInput] = useState({}); // { `${stationId}_${productId}`: price }
  
  // Permissions
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({ can_edit: false });

  // 1. Check Auth & Permissions
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        checkPermissions();
      }
    }
  }, [user, authLoading, router]);

  const checkPermissions = async () => {
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_edit: true });
      fetchSetupData();
      return;
    }
    
    const canView = user.permissions?.['Schedule Prices']?.can_view || false;
    const canEdit = user.permissions?.['Schedule Prices']?.can_edit || false;
    
    if (canView) {
      setHasPermission(true);
      setPermissions({ can_edit: canEdit });
      fetchSetupData();
    } else {
      setHasPermission(false);
    }
  };

  // 2. Fetch Initial Data
  const fetchSetupData = async () => {
    try {
      const res = await fetch("/api/schedule-price");
      if (!res.ok) {
        throw new Error(`Server status: ${res.status}`);
      }
      const text = await res.text();
      try {
        const result = JSON.parse(text);
        if (result.success) {
          setProducts(result.products || []);
          setStations(result.stations || []);
          setCustomers(result.customers || []);
        }
      } catch (e) {
        console.error("Invalid JSON:", text);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  // 3. Fetch Scheduled Prices
  useEffect(() => {
    if (hasPermission) {
      if (selectedCustomers.length > 0) {
        fetchScheduledPrices(selectedCustomers); 
      } else {
        // Fetch ALL pending if no selection
        fetchScheduledPrices([]); 
      }
    }
  }, [hasPermission, selectedCustomers, customers]);

  const fetchScheduledPrices = async (customerIds) => {
    try {
      let url = `/api/schedule-price`;
      if (customerIds && customerIds.length > 0) {
        url += `?customer_ids=${customerIds.join(",")}`;
      } else {
        // Fetch all pending for all customers
        if (customers.length > 0) {
           const allIds = customers.map(c => c.id).join(",");
           url += `?customer_ids=${allIds}`;
        } else if (customers.length === 0) {
           // Wait for customers to load first
           return;
        }
      }

      const res = await fetch(url);
      if (!res.ok) {
         console.error("Server Error:", res.status);
         return;
      }
      
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setScheduledPrices(data.filter(item => !item.is_applied)); 
        }
      } catch (e) {
         console.error("Invalid JSON response:", text); 
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
  };

  // 4. Input Handlers
  const handleCustomerToggle = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => setSelectedCustomers(customers.map(c => c.id));
  const deselectAllCustomers = () => setSelectedCustomers([]);

  const handlePriceChange = (customerId, stationId, codeId, productId, val) => {
    const key = `${customerId}_${stationId}_${codeId}`;
    setScheduleData(prev => ({
      ...prev,
      [key]: { price: val, productId }
    }));
  };

  const handleBulkPriceApply = (stationId, productId, price) => {
    if (!price || price <= 0) return alert("Enter valid price");
    if (selectedCustomers.length === 0) return alert("Select customers first");
    
    // Find sub-products for this product
    const subProducts = products.filter(p => p.product_id === productId && p.code_id);
    
    const newScheduleData = { ...scheduleData };
    selectedCustomers.forEach(custId => {
      subProducts.forEach(sp => {
        const key = `${custId}_${stationId}_${sp.code_id}`;
        newScheduleData[key] = { price: price, productId: productId };
      });
    });
    
    setScheduleData(newScheduleData);
    setBulkPriceInput(prev => ({ ...prev, [`${stationId}_${productId}`]: "" }));
  };

  // 5. Submit Schedule
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const updates = [];
    
    Object.keys(scheduleData).forEach(key => {
      const [custId, stationId, codeId] = key.split("_");
      const item = scheduleData[key];
      
      if (item.price && parseFloat(item.price) > 0) {
        if (selectedCustomers.includes(Number(custId))) {
          updates.push({
            customer_id: custId,
            station_id: stationId,
            product_id: item.productId,
            sub_product_id: codeId,
            price: parseFloat(item.price),
            schedule_date: scheduleDate,
            schedule_time: scheduleTime
          });
        }
      }
    });

    if (updates.length === 0) {
      setLoading(false);
      return alert("No valid prices to save for selected customers.");
    }

    try {
      const res = await fetch("/api/schedule-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          customerIds: selectedCustomers,
          updates,
          requireApproval: true, 
          bulkUpdateSamePrice: true 
        }),
      });
      
      const result = await res.json();
      if (result.success) {
        alert("✅ Schedule saved!");
        setScheduleData({}); // Clear inputs
        fetchScheduledPrices(selectedCustomers); 
      } else {
        alert("Error: " + result.message);
      }
    } catch (err) {
      alert("Server Error");
    } finally {
      setLoading(false);
    }
  };

  // 6. Apply Logic
  const isScheduleReady = (dateStr, timeStr) => {
    if (!dateStr) return true;
    // Extract YYYY-MM-DD if it's a full ISO string
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const scheduleDateTime = new Date(`${cleanDate}T${timeStr || '00:00'}`);
    return new Date() >= scheduleDateTime;
  };

  const handleApply = async (ids) => {
    if (!ids.length) return;
    
    try {
      const res = await fetch("/api/schedule-price", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceIds: ids }),
      });
      
      const result = await res.json();
      if (result.success) {
        alert("✅ Prices Applied!");
        fetchScheduledPrices(selectedCustomers);
      } else {
        alert("Failed: " + result.message);
      }
    } catch (err) {
      alert("Error applying prices");
    }
  };

  // UI Helpers
  const groupedProducts = products.reduce((acc, p) => {
    if (p.product_id && p.code_id) {
      if (!acc[p.product_id]) acc[p.product_id] = { name: p.product_name, items: [] };
      acc[p.product_id].items.push(p);
    }
    return acc;
  }, {});

  if (authLoading) return null;
  if (!hasPermission) return <div className="p-10 text-center">Access Denied</div>;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Schedule Prices</h1>
          
          {/* 1. Customer Selection */}
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Select Customers ({selectedCustomers.length})</span>
              <div className="space-x-2">
                <button onClick={selectAllCustomers} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">All</button>
                <button onClick={deselectAllCustomers} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">None</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
              {customers.map(c => {
                // Check if customer has ANY pending schedule
                const hasPending = scheduledPrices.some(
                  schedule => schedule.customer_id === c.id && schedule.status === 'scheduled' && !schedule.is_applied
                );
                
                const isSelected = selectedCustomers.includes(c.id);
                // Disable if has pending schedule (unless we want to allow viewing? 
                // User said "disable... not able to schedule another one". 
                // So if not selected, they can't be selected.
                // If already selected? Probably shouldn't happen if we strictly enforcing.
                // But let's say we disable the INPUT if hasPending is true.
                
                return (
                  <label 
                    key={c.id} 
                    className={`flex items-center space-x-2 p-2 rounded border transition-colors
                      ${hasPending ? 'bg-yellow-50 border-yellow-200 cursor-not-allowed text-gray-400' : 'cursor-pointer'}
                      ${isSelected ? 'bg-blue-50 border-blue-200' : 'border-gray-100'}
                    `}
                    title={hasPending ? "Has pending schedule - Cannot add new" : c.name}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => !hasPending && handleCustomerToggle(c.id)}
                      disabled={hasPending}
                      className={`rounded focus:ring-blue-500 ${hasPending ? 'text-gray-300' : 'text-blue-600'}`}
                    />
                    <span className="text-xs truncate flex-1">{c.name}</span>
                    {hasPending && <span className="text-[10px] text-yellow-600 font-bold">⏳</span>}
                  </label>
                );
              })}
            </div>
          </div>

          {selectedCustomers.length > 0 ? (
            <>
              {/* 2. Schedule Form */}
              <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4 mb-6 border-b pb-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Date</label>
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full mt-1 p-2 border rounded" required />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Time</label>
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full mt-1 p-2 border rounded" />
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {stations.map(st => (
                    <div key={st.id} className="mb-6">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">📍 {st.station_name}</h3>
                      
                      {Object.entries(groupedProducts).map(([prodId, group]) => (
                        <div key={prodId} className="mb-4 bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">{group.name}</span>
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                placeholder="All Price" 
                                className="w-24 text-xs p-1 border rounded"
                                value={bulkPriceInput[`${st.id}_${prodId}`] || ""}
                                onChange={e => setBulkPriceInput({...bulkPriceInput, [`${st.id}_${prodId}`]: e.target.value})}
                              />
                              <button 
                                type="button"
                                onClick={() => handleBulkPriceApply(st.id, prodId, bulkPriceInput[`${st.id}_${prodId}`])}
                                className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                              >
                                Set All
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {group.items.map(sub => {
                              const firstKey = `${selectedCustomers[0]}_${st.id}_${sub.code_id}`;
                              const val = scheduleData[firstKey]?.price || "";
                              
                              return (
                                <div key={sub.code_id}>
                                  <label className="text-xs text-gray-500 block">{sub.pcode}</label>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    className="w-full p-2 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                                    value={val}
                                    placeholder="0.00"
                                    onChange={e => {
                                      const newVal = e.target.value;
                                      const newData = { ...scheduleData };
                                      selectedCustomers.forEach(cid => {
                                        const k = `${cid}_${st.id}_${sub.code_id}`;
                                        newData[k] = { price: newVal, productId: prodId };
                                      });
                                      setScheduleData(newData);
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save Schedule"}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center p-10 text-gray-400 border border-dashed rounded-xl mb-6">Select customers above to schedule new prices</div>
          )}

          {/* 3. Scheduled List (Pending Only) - ALWAYS VISIBLE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Pending Schedules {selectedCustomers.length > 0 ? "(Selected)" : "(All)"}</h3>
              {permissions.can_edit && scheduledPrices.length > 0 && (
                  <button
                    onClick={() => {
                      const readyIds = scheduledPrices
                        .filter(i => isScheduleReady(i.Schedule_Date, i.Schedule_Time))
                        .map(i => i.id);
                      if(readyIds.length === 0) return alert("No schedules are ready yet.");
                      handleApply(readyIds);
                    }}
                    disabled={!scheduledPrices.some(i => isScheduleReady(i.Schedule_Date, i.Schedule_Time))}
                    className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Ready ({scheduledPrices.filter(i => isScheduleReady(i.Schedule_Date, i.Schedule_Time)).length})
                  </button>
              )}
            </div>

            {scheduledPrices.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending schedules found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {scheduledPrices.map(item => {
                      const isReady = isScheduleReady(item.Schedule_Date, item.Schedule_Time);
                      const displayDate = item.Schedule_Date ? (item.Schedule_Date.includes('T') ? item.Schedule_Date.split('T')[0] : item.Schedule_Date) : '-';
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">{item.customer_name}</td>
                          <td className="p-3">{item.product_name}</td>
                          <td className="p-3 text-gray-500">{item.product_code}</td>
                          <td className="p-3 font-bold text-gray-800">₹{item.price}</td>
                          <td className="p-3">
                            {displayDate} <span className="text-gray-400 text-xs">{item.Schedule_Time}</span>
                          </td>
                          <td className="p-3 text-right">
                            {permissions.can_edit && (
                              <button
                                onClick={() => handleApply([item.id])}
                                disabled={!isReady}
                                title={!isReady ? "Wait for schedule time" : "Apply Now"}
                                className={`px-3 py-1 rounded text-xs ${
                                  isReady ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                Apply
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}

export default function SchedulePricePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SchedulePriceContent />
    </Suspense>
  );
}