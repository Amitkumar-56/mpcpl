"use client";
import Sidebar from "@/components/sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { FaUserPlus, FaSearch, FaArrowLeft, FaEdit, FaTruck } from "react-icons/fa";
import { useRouter } from "next/navigation";
import Pagination from "@/components/Pagination";

export default function RentalCustomersPage() {
  const [rentalCustomers, setRentalCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", company_name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, currentPage: 1 });
  const router = useRouter();

  useEffect(() => {
    fetchRentalCustomers(1, searchTerm);
  }, []);

  const fetchRentalCustomers = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rental/rental-customers?page=${page}&limit=${recordsPerPage}&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setRentalCustomers(result.data);
        setPagination(result.pagination);
        setCurrentPage(result.pagination.currentPage);
      }
    } catch (error) {
      console.error("Error fetching rental customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRentalCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rental/rental-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewCustomer({ name: "", company_name: "", phone: "" });
        fetchRentalCustomers();
      }
    } catch (error) {
      console.error("Error adding rental customer:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchRentalCustomers(1, searchTerm);
    }
  };

  const onPageChange = (page) => {
    fetchRentalCustomers(page, searchTerm);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Simple Header */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                  <FaArrowLeft />
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Rental Customers</h1>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all justify-center"
              >
                <FaUserPlus size={12} /> Add Customer
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rental customers or companies... (Press Enter)"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                <button 
                  onClick={() => fetchRentalCustomers(1, searchTerm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                >
                  <FaSearch size={14} />
                </button>
            </div>

            {/* Table List - Hidden on mobile */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto mb-6">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Rental Name</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Trips</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-gray-400 font-medium">Loading customers...</p>
                        </div>
                      </td>
                    </tr>
                  ) : rentalCustomers.length === 0 ? (
                    <tr><td colSpan="5" className="p-20 text-center text-gray-400">No rental customers found</td></tr>
                  ) : (
                    rentalCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900 uppercase">{c.name}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {c.company_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm font-medium">
                          {c.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => router.push(`/rental-trips?customer_id=${c.id}`)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors flex items-center gap-1 mx-auto text-xs font-bold"
                          >
                            <FaTruck size={12} /> Trips
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                            <FaEdit size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - Only visible on small screens */}
            <div className="lg:hidden space-y-4 mb-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400 font-medium">Loading...</p>
                </div>
              ) : rentalCustomers.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl shadow-sm text-gray-400 font-medium">
                  No rental customers found
                </div>
              ) : (
                rentalCustomers.map((c) => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black">
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-gray-900 uppercase leading-tight">{c.name}</h3>
                          <p className="text-xs text-gray-400 font-bold">{c.company_name || 'Individual'}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">ID: {c.id}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Contact</p>
                        <p className="text-sm font-bold text-gray-700">{c.phone || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Trips</p>
                        <p className="text-sm font-bold text-blue-600">View History</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-50">
                      <button 
                        onClick={() => router.push(`/rental-trips?customer_id=${c.id}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all text-sm"
                      >
                        <FaTruck size={14} /> Trips
                      </button>
                      <button className="px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-all border border-gray-100">
                        <FaEdit size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.pages}
                onPageChange={onPageChange}
                totalRecords={pagination.total}
                recordsPerPage={recordsPerPage}
              />
            )}
          </div>
        </main>
        <Footer />
      </div>

      {/* Premium Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl m-auto animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <h2 className="text-xl font-bold">Register Rental Customer</h2>
              <p className="text-blue-100 text-xs mt-1">Fill in the details to add a new client to the system.</p>
            </div>
            
            <form onSubmit={handleAddRentalCustomer} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <input required className="w-full pl-3 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700" placeholder="e.g. John Doe" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Company Name</label>
                  <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700" placeholder="Business or Agency name" value={newCustomer.company_name} onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                  <input required type="tel" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700" placeholder="+91 XXXXX XXXXX" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  disabled={submitting} 
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all order-1 sm:order-2"
                >
                  {submitting ? "Saving..." : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
