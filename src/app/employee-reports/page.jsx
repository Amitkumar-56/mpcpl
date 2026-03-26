"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BiCalendar, BiChart, BiGroup, BiMoney, BiTrendingUp, BiUser } from "react-icons/bi";

// Skeleton Component
const ReportSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-32 bg-gray-200 rounded-xl" />
    </div>
  </div>
);

// Stat Card Skeleton
const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
        <div className="w-12 h-6 bg-gray-200 rounded-full" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

// Stat Card Component
function StatCard({ label, value, icon: Icon, color, trend }) {
  const colorClasses = {
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    purple: "bg-violet-50 text-violet-600 border-violet-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-red-50 text-red-600 border-red-200",
  };

  const s = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${s} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

// Report Card Component
function ReportCard({ title, description, icon: Icon, color, onClick }) {
  const colorClasses = {
    green: "bg-emerald-500 ring-emerald-200",
    blue: "bg-blue-500 ring-blue-200",
    purple: "bg-violet-500 ring-violet-200",
    amber: "bg-amber-500 ring-amber-200",
    red: "bg-rose-500 ring-rose-200",
  };

  const s = colorClasses[color] || colorClasses.blue;

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md ring-2 ring-transparent hover:${s.ring} transition-all duration-200 cursor-pointer overflow-hidden`}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
          <span>View Report</span>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      <div className={`h-1 w-full ${s.bg} scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300`} />
    </div>
  );
}

// Main Content Component with Suspense
function EmployeeReportsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    monthlyAttendance: 0,
    totalSalaryPaid: 0,
    pendingApprovals: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user) fetchReportData();
  }, [user, authLoading]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Simulate API calls - replace with actual API endpoints
      const mockData = {
        totalEmployees: 45,
        activeEmployees: 42,
        presentToday: 38,
        absentToday: 4,
        onLeaveToday: 3,
        monthlyAttendance: 85.2,
        totalSalaryPaid: 1250000,
        pendingApprovals: 7,
      };
      setReportData(mockData);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableReports = [
    {
      title: "Attendance Report",
      description: "Monthly and yearly attendance statistics with trends and patterns",
      icon: BiCalendar,
      color: "blue",
      action: () => router.push("/attendance-reports")
    },
    {
      title: "Salary Analytics",
      description: "Comprehensive salary analysis including deductions and bonuses",
      icon: BiMoney,
      color: "green",
      action: () => router.push("/salary-management")
    },
    {
      title: "Employee Directory",
      description: "Complete employee database with contact information and roles",
      icon: BiGroup,
      color: "purple",
      action: () => router.push("/employee-directory")
    },
    {
      title: "Leave Analysis",
      description: "Leave trends, balances, and approval patterns",
      icon: BiCalendar,
      color: "amber",
      action: () => router.push("/leave-history")
    },
    {
      title: "Performance Metrics",
      description: "Employee performance indicators and productivity analysis",
      icon: BiTrendingUp,
      color: "red",
      action: () => router.push("#performance")
    },
    {
      title: "Department Overview",
      description: "Department-wise statistics and resource allocation",
      icon: BiChart,
      color: "blue",
      action: () => router.push("#departments")
    }
  ];

  if (authLoading) {
    return (
      <div className="flex h-screen bg-[#f4f6fb] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userRole = parseInt(user.role) || 0;
  if (userRole < 3) {
    return (
      <div className="flex h-screen bg-[#f4f6fb] items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.27 16a2 2 0 001.8 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm mb-5">You don't have permission to access Employee Reports.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f6fa] overflow-hidden">
      <div className="flex-shrink-0 z-50">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header user={user} />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Hero Header */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                      <BiChart className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Employee Reports</h1>
                  </div>
                  <p className="text-slate-400 text-sm">Comprehensive analytics and insights for workforce management</p>
                </div>

                <button
                  onClick={fetchReportData}
                  className="px-4 py-2 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white text-sm font-semibold hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Key Metrics with Suspense */}
            <Suspense fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
            }>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  label="Total Employees" 
                  value={reportData.totalEmployees} 
                  icon={BiGroup} 
                  color="blue"
                  trend={5.2}
                />
                <StatCard 
                  label="Present Today" 
                  value={reportData.presentToday} 
                  icon={BiUser} 
                  color="green"
                  trend={2.1}
                />
                <StatCard 
                  label="Monthly Attendance" 
                  value={`${reportData.monthlyAttendance}%`} 
                  icon={BiCalendar} 
                  color="purple"
                  trend={-1.3}
                />
                <StatCard 
                  label="Total Salary Paid" 
                  value={`₹${(reportData.totalSalaryPaid / 100000).toFixed(1)}L`} 
                  icon={BiMoney} 
                  color="amber"
                  trend={8.7}
                />
              </div>
            </Suspense>

            {/* Available Reports with Suspense */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Available Reports</h2>
              <Suspense fallback={
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <ReportSkeleton key={i} />)}
                </div>
              }>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    [...Array(6)].map((_, i) => <ReportSkeleton key={i} />)
                  ) : (
                    availableReports.map((report, index) => (
                      <ReportCard
                        key={index}
                        title={report.title}
                        description={report.description}
                        icon={report.icon}
                        color={report.color}
                        onClick={report.action}
                      />
                    ))
                  )}
                </div>
              </Suspense>
            </div>

            {/* Quick Stats with Suspense */}
            <Suspense fallback={
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded-lg w-1/4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-200 rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            }>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Today's Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-600">{reportData.presentToday}</p>
                    <p className="text-sm text-emerald-700 mt-1">Present</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <p className="text-2xl font-bold text-red-600">{reportData.absentToday}</p>
                    <p className="text-sm text-red-700 mt-1">Absent</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-xl">
                    <p className="text-2xl font-bold text-amber-600">{reportData.onLeaveToday}</p>
                    <p className="text-sm text-amber-700 mt-1">On Leave</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">{reportData.pendingApprovals}</p>
                    <p className="text-sm text-blue-700 mt-1">Pending</p>
                  </div>
                </div>
              </div>
            </Suspense>
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main Export with Suspense Boundary
export default function EmployeeReports() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-[#f4f6fb] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading Employee Reports...</p>
        </div>
      </div>
    }>
      <EmployeeReportsContent />
    </Suspense>
  );
}