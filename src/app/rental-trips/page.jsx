'use client';

import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { FaArrowLeft, FaCheckCircle, FaDownload, FaGasPump, FaLock, FaMoneyBillWave, FaPlus, FaUserPlus } from "react-icons/fa";
import jsPDF from "jspdf";

function RentalTripsContent() {
  const [trips, setTrips] = useState([]);
  const [rentalCustomers, setRentalCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showExpensesHistoryModal, setShowExpensesHistoryModal] = useState(false);
  const [payments, setPayments] = useState([]);
  const [expensesHistory, setExpensesHistory] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, currentPage: 1, limit: 10 });
  const [totals, setTotals] = useState({ count: 0, revenue: 0, expense: 0, profit: 0 });

  const router = useRouter();
  const searchParams = useSearchParams();
  const customerFilter = searchParams.get('customer_id');

  const [newTrip, setNewTrip] = useState({
    rental_customer_id: "",
    vehicle_id: "",
    vehicle_no: "",
    driver_name: "",
    driver_number: "",
    source: "",
    destination: "",
    state: ""
  });

  const [newExpense, setNewExpense] = useState({
    type: "Fuel",
    amount: "",
    description: ""
  });

  const [newAdvance, setNewAdvance] = useState({
    amount: "",
    remarks: ""
  });

  const [closeData, setCloseData] = useState({
    destination: "",
    received_amount: ""
  });

  useEffect(() => {
    fetchTrips(1, searchQuery);
    fetchRentalCustomers();
    fetchVehicles();
    fetchEmployees();
  }, [customerFilter]);

  const fetchTrips = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const url = `/api/rental/trips?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}${customerFilter ? `&customer_id=${customerFilter}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setTrips(result.data);
        setTotals(result.totals);
        setPagination(result.pagination);
        setCurrentPage(result.pagination.currentPage);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRentalCustomers = async () => {
    try {
      const res = await fetch("/api/rental/rental-customers");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();
      setRentalCustomers(result.data || []);
    } catch (error) {
      console.error("Error fetching rental customers:", error);
      setRentalCustomers([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/get-vehicles");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const onVehicleChange = (vehicleNo) => {
    if (!vehicleNo) {
      setNewTrip({ ...newTrip, vehicle_no: "", vehicle_id: "", driver_name: "", driver_number: "" });
      return;
    }
    const selected = vehicles.find(v => v.licence_plate === vehicleNo);
    if (selected) {
      // Find driver info to set just the name first
      setNewTrip({
        ...newTrip,
        vehicle_no: selected.licence_plate,
        vehicle_id: selected.id,
        driver_name: selected.driver_name || ""
      });

      // If we have a driver name from the vehicle, trigger the phone fill logic
      if (selected.driver_name) {
        const emp = employees.find(e => e.name === selected.driver_name);
        if (emp) {
          setNewTrip(prev => ({ ...prev, driver_number: emp.phone || "" }));
        }
      }
    } else {
      setNewTrip({ ...newTrip, vehicle_no: vehicleNo });
    }
  };

  const onDriverChange = (driverName) => {
    if (!driverName) {
      setNewTrip({ ...newTrip, driver_name: "", driver_number: "" });
      return;
    }
    const selected = employees.find(e => e.name === driverName);
    if (selected) {
      setNewTrip({
        ...newTrip,
        driver_name: selected.name,
        driver_number: selected.phone || ""
      });
    } else {
      setNewTrip({ ...newTrip, driver_name: driverName });
    }
  };

  const handleOpenTrip = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rental/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTrip),
      });
      if (res.ok) {
        alert("✅ Trip opened successfully!");
        setShowOpenModal(false);
        setNewTrip({ rental_customer_id: "", vehicle_id: "", vehicle_no: "", driver_name: "", driver_number: "", source: "", destination: "", state: "" });
        fetchTrips();
      } else {
        const errorData = await res.json();
        alert("❌ Error: " + (errorData.error || "Failed to open trip"));
      }
    } catch (error) {
      console.error("Error opening trip:", error);
      alert("❌ Critical Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rental/trips/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newExpense, trip_id: selectedTrip.id }),
      });
      if (res.ok) {
        setShowExpenseModal(false);
        setNewExpense({ type: "Fuel", amount: "", description: "" });
        fetchTrips();
      }
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAdvance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rental/trips/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newAdvance, trip_id: selectedTrip.id }),
      });
      if (res.ok) {
        setShowAdvanceModal(false);
        setNewAdvance({ amount: "", remarks: "" });
        fetchTrips();
      }
    } catch (error) {
      console.error("Error adding advance:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTrip = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rental/trips/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...closeData, trip_id: selectedTrip.id, remarks: "Closed via dashboard" }),
      });
      if (res.ok) {
        setShowCloseModal(false);
        setCloseData({ destination: "", received_amount: "" });
        fetchTrips();
      }
    } catch (error) {
      console.error("Error closing trip:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchPayments = async (tripId) => {
    try {
      const res = await fetch(`/api/rental/trips/payments?trip_id=${tripId}`);
      const data = await res.json();
      setPayments(data);
      setShowPaymentsModal(true);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchExpensesHistory = async (tripId) => {
    try {
      const res = await fetch(`/api/rental/trips/expenses?trip_id=${tripId}`);
      const data = await res.json();
      setExpensesHistory(data);
      setShowExpensesHistoryModal(true);
    } catch (error) {
      console.error("Error fetching expenses history:", error);
    }
  };

  const onPageChange = (newPage) => {
    fetchTrips(newPage, searchQuery);
  };

  const downloadPDF = () => {
    window.open(`/rental-receipt?download=true`, '_blank');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchTrips(1, searchQuery);
    }
  };

  const downloadTripPDF = (trip) => {
    window.open(`/rental-receipt?id=${trip.id}`, '_blank');
  };



  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-full mx-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1">Total Trips</div>
                <div className="text-xl md:text-2xl font-black text-gray-900">{totals.count}</div>
              </div>
              <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-[10px] md:text-xs font-bold text-green-600 uppercase mb-1">Total Revenue</div>
                <div className="text-xl md:text-2xl font-black text-green-700">₹{totals.revenue.toLocaleString()}</div>
              </div>
              <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-[10px] md:text-xs font-bold text-red-600 uppercase mb-1">Total Expense</div>
                <div className="text-xl md:text-2xl font-black text-red-700">₹{totals.expense.toLocaleString()}</div>
              </div>
              <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-[10px] md:text-xs font-bold text-blue-600 uppercase mb-1">Net Profit</div>
                <div className="text-xl md:text-2xl font-black text-blue-700">₹{totals.profit.toLocaleString()}</div>
              </div>
            </div>

            {/* Header & Search */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                  <FaArrowLeft />
                </button>
                <h1 className="text-lg md:text-xl font-bold text-gray-800 whitespace-nowrap">Rental History</h1>
                <div className="relative flex-1 lg:w-64">
                  <input
                    type="text"
                    placeholder="Search trips..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button 
                    onClick={() => fetchTrips(1, searchQuery)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:flex gap-2 w-full lg:w-auto">
                                <button
                  onClick={() => router.push('/rental-customers')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all flex-1 md:flex-none justify-center"
                >
                  <FaUserPlus size={12} /> Rental Customers
                </button>
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all justify-center col-span-2 md:col-span-none"
                >
                  <FaPlus size={12} /> Open Trip
                </button>
              </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Trip Info</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Rental Customer</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Vehicle/Driver</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Route</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Expense History</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Advance Logs</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Voucher Link</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Profit/Loss</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 relative">
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-20 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">Loading trips...</p>
                          </div>
                        </td>
                      </tr>
                    ) : trips.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-20 text-center text-gray-400">No trips found matching your criteria.</td>
                      </tr>
                    ) : trips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">TRP-{trip.id}</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{trip.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800">{trip.rental_customer_name}</span>
                            <span className="text-xs text-gray-500">{trip.rc_company_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-blue-600">{trip.current_vehicle_no || trip.vehicle_no}</span>
                            <span className="text-xs text-gray-500">{trip.driver_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-700">{trip.source} → {trip.destination || '...'}</span>
                            <span className="text-[10px] text-gray-400">{trip.state}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => { setSelectedTrip(trip); fetchExpensesHistory(trip.id); }}
                            className="flex flex-col items-end group"
                          >
                            <span className="text-sm font-bold text-red-600 group-hover:underline">₹{parseFloat(trip.total_expense).toLocaleString()}</span>
                            <span className="text-[9px] text-gray-400 group-hover:text-blue-500">View Logs</span>
                          </button>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => { setSelectedTrip(trip); fetchPayments(trip.id); }}
                            className="flex flex-col items-end group"
                          >
                            <span className="text-sm font-bold text-green-600 group-hover:underline">₹{parseFloat(trip.total_advance || trip.received_amount || 0).toLocaleString()}</span>
                            <span className="text-[9px] text-gray-400 group-hover:text-blue-500">View Logs</span>
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {trip.voucher_no ? (
                            <span className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full text-[10px] font-black shadow-sm uppercase tracking-wider border border-purple-400">
                              {trip.voucher_no}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[10px] font-medium">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {trip.status === 'Closed' ? (
                            <span className={`text-sm font-black ${trip.profit_loss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              ₹{Math.abs(trip.profit_loss).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center gap-2">
                            {trip.status === 'Open' ? (
                              <>
                                <button
                                  onClick={() => downloadTripPDF(trip)}
                                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                  title="Download PDF"
                                >
                                  <FaDownload size={14} />
                                </button>
                                <button
                                  onClick={() => { setSelectedTrip(trip); setShowExpenseModal(true); }}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                  title="Expense"
                                >
                                  <FaGasPump size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTrip(trip);
                                    setShowCloseModal(true);
                                    setCloseData({
                                      destination: trip.destination || "",
                                      received_amount: trip.received_amount || 0
                                    });
                                  }}
                                  className="p-2 bg-gray-900 text-white rounded-lg hover:bg-black"
                                  title="Close Trip"
                                >
                                  <FaLock size={14} />
                                </button>

                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => downloadTripPDF(trip)}
                                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                  title="Download PDF"
                                >
                                  <FaDownload size={14} />
                                </button>
                                <div className="text-green-600 ml-2">
                                  <FaCheckCircle size={18} />
                                </div>

                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <button
                  disabled={currentPage === 1 || loading}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  Previous
                </button>
                <div className="text-sm text-gray-500 font-medium">
                  Page <span className="text-gray-900 font-bold">{currentPage}</span> of {pagination.pages}
                  <span className="ml-2 text-xs text-gray-400">({pagination.total} total trips)</span>
                </div>
                <button
                  disabled={currentPage === pagination.pages || loading}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Open New Trip Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl m-auto animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">Open New Rental Trip</h2>
                <p className="text-blue-100 text-xs mt-1">Initialize a new trip by filling operational details.</p>
              </div>
              <button onClick={() => setShowOpenModal(false)} className="text-white/60 hover:text-white text-2xl font-light">&times;</button>
            </div>
            
            <form id="openTripForm" onSubmit={handleOpenTrip} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Rental Customer</label>
                  <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700" value={newTrip.rental_customer_id} onChange={(e) => setNewTrip({ ...newTrip, rental_customer_id: e.target.value })}>
                    <option value="">Select Rental Customer</option>
                    {rentalCustomers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company_name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Vehicle No</label>
                  <select
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700"
                    value={newTrip.vehicle_no}
                    onChange={(e) => onVehicleChange(e.target.value)}
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.licence_plate}>{v.licence_plate}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Driver Name</label>
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700"
                    value={newTrip.driver_name}
                    onChange={(e) => onDriverChange(e.target.value)}
                  >
                    <option value="">Select Driver</option>
                    {employees.filter(e => parseInt(e.role) === 6).map(e => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Driver Number</label>
                  <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700" placeholder="Driver Phone" value={newTrip.driver_number} onChange={(e) => setNewTrip({ ...newTrip, driver_number: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Source</label>
                  <input required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700" placeholder="Starting Point" value={newTrip.source} onChange={(e) => setNewTrip({ ...newTrip, source: e.target.value })} />
                </div>
                                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">State/Route Info</label>
                  <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700" placeholder="e.g. Maharashtra to Gujarat" value={newTrip.state} onChange={(e) => setNewTrip({ ...newTrip, state: e.target.value })} />
                </div>
              </div>
            </form>
            
            <div className="p-6 pt-0 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowOpenModal(false)} 
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  disabled={submitting} 
                  onClick={() => document.querySelector('#openTripForm').requestSubmit()}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all order-1 sm:order-2"
                >
                  {submitting ? "Opening..." : "Start Trip"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl m-auto animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-red-500 to-red-700 p-5 text-white">
              <h2 className="text-lg font-bold">Add Trip Expense</h2>
              <p className="text-red-100 text-[10px]">Record fuel, DEF or other operational costs.</p>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Expense Type</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-medium text-gray-700" value={newExpense.type} onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value })}>
                  <option>Fuel</option><option>DEF</option><option>Fastag</option><option>Others</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Amount (₹)</label>
                <input required type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-bold text-red-600 text-lg" placeholder="0.00" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Description</label>
                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-medium text-gray-700" placeholder="Optional details..." value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button disabled={submitting} className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all">
                  {submitting ? "Adding..." : "Add Expense"}
                </button>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl m-auto animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-5 text-white">
              <h2 className="text-lg font-bold">Add Advance Payment</h2>
              <p className="text-green-100 text-[10px]">Record payments received from the customer.</p>
            </div>
            <form onSubmit={handleAddAdvance} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Amount Received (₹)</label>
                <input required type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-bold text-green-700 text-lg" placeholder="0.00" value={newAdvance.amount} onChange={(e) => setNewAdvance({ ...newAdvance, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Remarks / Voucher Info</label>
                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-gray-700" placeholder="e.g. Cash, GPay, Voucher No." value={newAdvance.remarks} onChange={(e) => setNewAdvance({ ...newAdvance, remarks: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button disabled={submitting} className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all">
                  {submitting ? "Processing..." : "Receive Advance"}
                </button>
                <button type="button" onClick={() => setShowAdvanceModal(false)} className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl m-auto animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-900 p-5 text-white">
              <h2 className="text-lg font-bold">Close Trip</h2>
              <p className="text-gray-400 text-[10px]">Complete the trip and calculate final P/L.</p>
            </div>
            <form onSubmit={handleCloseTrip} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Final Drop Location</label>
                <input required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-gray-700" placeholder="Final Destination" value={closeData.destination} onChange={(e) => setCloseData({ ...closeData, destination: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Total Trip Amount (Final) (₹)</label>
                <input required type="number" className="w-full p-4 bg-blue-50 border border-blue-100 rounded-xl text-2xl font-black text-blue-700 outline-none" placeholder="0.00" value={closeData.received_amount} onChange={(e) => setCloseData({ ...closeData, received_amount: e.target.value })} />
                <p className="text-[10px] text-blue-400 mt-1.5 font-medium leading-relaxed">* This is the final total billing amount for this trip.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Advance Received:</span>
                  <b className="text-gray-900">₹{parseFloat(selectedTrip?.received_amount || 0).toLocaleString()}</b>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Total Trip Expenses:</span>
                  <b className="text-red-600">₹{parseFloat(selectedTrip?.total_expense || 0).toLocaleString()}</b>
                </div>
                <div className="h-px bg-gray-200 my-1"></div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>Net Estimated P/L:</span>
                  <span className={((parseFloat(closeData.received_amount) || 0) - (parseFloat(selectedTrip?.total_expense) || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ₹{Math.abs((parseFloat(closeData.received_amount) || 0) - (parseFloat(selectedTrip?.total_expense) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button disabled={submitting} className="w-full py-3.5 bg-black hover:bg-gray-800 text-white rounded-xl font-bold shadow-xl transition-all">
                  {submitting ? "Closing..." : "Close Trip Now"}
                </button>
                <button type="button" onClick={() => setShowCloseModal(false)} className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments History Modal */}
      {showPaymentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden m-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
              <button onClick={() => setShowPaymentsModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-blue-50/50">
                      <div>
                        <div className="text-sm font-bold text-gray-900">₹{parseFloat(p.amount).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{p.remarks}</div>
                        {p.voucher_no && (
                          <div className="mt-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider">
                              Voucher: {p.voucher_no}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">No payments recorded yet.</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-gray-50">
              <button onClick={() => setShowPaymentsModal(false)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Expenses History Modal */}
      {showExpensesHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden m-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Expense History</h2>
              <button onClick={() => setShowExpensesHistoryModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {expensesHistory.length > 0 ? (
                <div className="space-y-3">
                  {expensesHistory.map((e, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-red-50/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">₹{parseFloat(e.amount).toLocaleString()}</span>
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">{e.type}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{e.description || 'No description'}</div>
                      </div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap ml-4">
                        {new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">No expenses recorded yet.</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-gray-50">
              <button onClick={() => setShowExpensesHistoryModal(false)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RentalTripsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500 text-sm">Loading Trips...</div>
        </div>
      </div>
    }>
      <RentalTripsContent />
    </Suspense>
  );
}
