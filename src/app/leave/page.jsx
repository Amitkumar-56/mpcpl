// src/app/leave/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Loading component for Suspense fallback
function LeaveManagementSkeleton() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:px-8 max-w-7xl">
            <div className="mb-4 sm:mb-6 flex justify-between items-center">
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-64 bg-gray-200 rounded mt-2 animate-pulse"></div>
              </div>
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Filters Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="h-4 w-16 bg-gray-200 rounded mb-2 animate-pulse"></div>
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-8">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex space-x-4">
                      <div className="h-12 w-1/6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 w-1/6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 w-1/6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 w-1/6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 w-1/6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 w-1/6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function LeaveManagement() {
  return (
    <Suspense fallback={<LeaveManagementSkeleton />}>
      <LeaveManagementContent />
    </Suspense>
  );
}

// Actual content component
function LeaveManagementContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    leave_type: "Sick Leave",
    from_date: "",
    to_date: "",
    reason: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      fetchLeaveRequests();
    }
  }, [user, authLoading, selectedStatus, selectedYear]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      setError("");
      let url = `/api/leave?year=${selectedYear}`;
      
      if (selectedStatus) {
        url += `&status=${selectedStatus}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setLeaveRequests(data.data || []);
      } else {
        setError(data.error || "Failed to fetch leave requests");
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setError("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowApplyModal(false);
        setFormData({
          leave_type: "Sick Leave",
          from_date: "",
          to_date: "",
          reason: ""
        });
        fetchLeaveRequests();
      } else {
        setError(data.error || "Failed to submit leave request");
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      setError("Failed to submit leave request");
    }
  };

  const handleUpdateStatus = async (id, status, rejectionReason = "") => {
    try {
      setError("");
      const response = await fetch('/api/leave', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status,
          rejection_reason: rejectionReason
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchLeaveRequests();
      } else {
        setError(data.error || "Failed to update leave request");
      }
    } catch (error) {
      console.error('Error updating leave request:', error);
      setError("Failed to update leave request");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      'Sick Leave': 'text-red-600',
      'Casual Leave': 'text-blue-600',
      'Annual Leave': 'text-green-600',
      'Maternity Leave': 'text-purple-600',
      'Paternity Leave': 'text-indigo-600',
      'Unpaid Leave': 'text-gray-600'
    };
    return colors[type] || 'text-gray-600';
  };

  const calculateDays = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const timeDiff = to - from;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  };

  const canApproveReject = () => {
    return user && [3, 4, 5].includes(user.role);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:px-8 max-w-7xl">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
            </div>
            
            <div className="mb-4 sm:mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  Leave Management
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                  Apply and manage leave requests
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Apply for Leave
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({length: 5}, (_, i) => (
                      <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>
                        {new Date().getFullYear() - i}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={fetchLeaveRequests}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
                  >
                    {loading ? 'Loading...' : 'Filter'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Leave Requests Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading leave requests...</p>
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No leave requests found.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Employee
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Leave Type
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Period
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Days
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Reason
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                            Applied On
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {leaveRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div>
                                <div className="font-medium">{request.employee_name}</div>
                                <div className="text-xs text-gray-500">{request.emp_code}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-medium ${getLeaveTypeColor(request.leave_type)}`}>
                                {request.leave_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div>
                                <div>{new Date(request.from_date).toLocaleDateString('en-IN')}</div>
                                <div className="text-xs text-gray-500">to {new Date(request.to_date).toLocaleDateString('en-IN')}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="max-w-xs truncate" title={request.reason}>
                                {request.reason}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                                {request.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(request.created_at).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {request.status === 'Pending' && canApproveReject() && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(request.id, 'Approved')}
                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Enter rejection reason:');
                                        if (reason) {
                                          handleUpdateStatus(request.id, 'Rejected', reason);
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {request.status === 'Pending' && request.employee_id === user?.id && (
                                  <button
                                    onClick={() => handleUpdateStatus(request.id, 'Cancelled')}
                                    className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4 p-4">
                    {leaveRequests.map((request) => (
                      <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-base text-gray-900">{request.employee_name}</div>
                            <div className="text-xs text-gray-500">{request.emp_code}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-3 text-sm">
                          <div>
                            <span className={`font-medium ${getLeaveTypeColor(request.leave_type)}`}>
                              {request.leave_type}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Period</div>
                            <div className="font-medium">
                              {new Date(request.from_date).toLocaleDateString('en-IN')} - {new Date(request.to_date).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Duration</div>
                            <div className="font-medium">{request.total_days} {request.total_days === 1 ? 'day' : 'days'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Reason</div>
                            <div className="text-sm text-gray-700">{request.reason}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Applied On</div>
                            <div className="font-medium">{new Date(request.created_at).toLocaleDateString('en-IN')}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-3 border-t">
                          {request.status === 'Pending' && canApproveReject() && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(request.id, 'Approved')}
                                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (reason) {
                                    handleUpdateStatus(request.id, 'Rejected', reason);
                                  }
                                }}
                                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {request.status === 'Pending' && request.employee_id === user?.id && (
                            <button
                              onClick={() => handleUpdateStatus(request.id, 'Cancelled')}
                              className="w-full px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Apply for Leave</h2>
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleApplyLeave}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.leave_type}
                      onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Casual Leave">Casual Leave</option>
                      <option value="Annual Leave">Annual Leave</option>
                      <option value="Maternity Leave">Maternity Leave</option>
                      <option value="Paternity Leave">Paternity Leave</option>
                      <option value="Unpaid Leave">Unpaid Leave</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        From Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.from_date}
                        onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        To Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.to_date}
                        onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                        required
                        min={formData.from_date || new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                      rows={4}
                      placeholder="Please provide a reason for your leave request..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyModal(false);
                      setError("");
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}