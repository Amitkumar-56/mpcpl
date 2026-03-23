"use client";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import {
  BiCalendar,
  BiChart,
  BiCheckCircle,
  BiGroup,
  BiMoney,
  BiSend,
  BiUser
} from "react-icons/bi";

// Loading component for Suspense fallback
const DashboardSkeleton = () => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <div className="h-16 bg-white/50 animate-pulse"></div>
        
        {/* Main Content Skeleton */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
          
          {/* Cards Skeleton */}
          <div className="mb-6">
            <div className="h-6 bg-gray-200 rounded w-1/6 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// InfoCard component for HR Dashboard
const InfoCard = ({ title, value, icon: Icon, color, href }) => {
  const colorClasses = {
    green: "bg-gradient-to-r from-green-500 to-green-600",
    purple: "bg-gradient-to-r from-purple-500 to-purple-600",
    blue: "bg-gradient-to-r from-blue-500 to-blue-600",
    yellow: "bg-gradient-to-r from-yellow-500 to-yellow-600",
    red: "bg-gradient-to-r from-red-500 to-red-600",
    indigo: "bg-gradient-to-r from-indigo-500 to-indigo-600",
  };

  return (
    <a
      href={href}
      className="block transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-xl"
    >
      <div className={`${colorClasses[color]} p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm font-medium">{title}</p>
            <p className="text-white text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="bg-white/20 p-3 rounded-lg">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </a>
  );
};

// Main dashboard content component
const HRDashboardContent = () => {
  const { user: sessionUser, logout, loading } = useSession();
  const router = useRouter();
  const [activePage, setActivePage] = useState("HR Dashboard");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    if (!sessionUser) {
      router.push("/login");
      return;
    }

    // Check if user has HR-related permissions
    const userRole = Number(sessionUser.role);
    const allowedRoles = [5, 4, 3]; // Admin, Accountant, Team Leader
    
    if (allowedRoles.includes(userRole)) {
      setIsAuthorized(true);
    } else {
      router.push("/dashboard");
    }
  }, [sessionUser, router, loading]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!sessionUser) {
    return null;
  }

  // Check if user has HR permissions
  const userRole = Number(sessionUser.role);
  const hasHRPermissions = [5, 4, 3].includes(userRole);

  if (!hasHRPermissions) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access the HR Dashboard.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0">
          <Header user={sessionUser} />
        </div>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Welcome Section */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                  HR Dashboard
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Manage employee services, payroll, and attendance
                </p>
              </div>
            </div>
          </div>

          {/* Salary Management Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Salary Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <InfoCard
                title="Salary Management"
                value="Manage"
                icon={BiMoney}
                color="green"
                href="/salary-management"
              />
              <InfoCard
                title="Manual Salary"
                value="Add Payment"
                icon={BiMoney}
                color="purple"
                href="/manual-salary"
              />
              <InfoCard
                title="Advances"
                value="Manage"
                icon={BiMoney}
                color="yellow"
                href="/advances"
              />
              <InfoCard
                title="Payment Release"
                value="Bulk Pay"
                icon={BiMoney}
                color="red"
                href="/payment-release"
              />
            </div>
          </div>

          {/* Attendance & Leave Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Attendance & Leave</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <InfoCard
                title="Attendance"
                value="Mark"
                icon={BiCheckCircle}
                color="green"
                href="/attendance"
              />
              <InfoCard
                title="Attendance Summary"
                value="View"
                icon={BiCalendar}
                color="blue"
                href="/attendance/monthly-summary"
              />
              <InfoCard
                title="Leave Management"
                value="Manage"
                icon={BiCalendar}
                color="purple"
                href="/leave"
              />
              <InfoCard
                title="HR Letters"
                value="Generate"
                icon={BiSend}
                color="indigo"
                href="/hr-letters"
              />
            </div>
          </div>

          {/* Employee Services Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Employee Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InfoCard
                title="My Salary"
                value="View"
                icon={BiUser}
                color="blue"
                href="/my-salary"
              />
              <InfoCard
                title="Employee Reports"
                value="Analytics"
                icon={BiChart}
                color="green"
                href="/employee-reports"
              />
              <InfoCard
                title="My Attendance"
                value="View"
                icon={BiCalendar}
                color="purple"
                href="/attendance/monthly-summary"
              />
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InfoCard
                title="Generate Payslips"
                value="Bulk"
                icon={BiSend}
                color="blue"
                href="/payslip-generation"
              />
              <InfoCard
                title="Attendance Reports"
                value="Monthly"
                icon={BiCalendar}
                color="purple"
                href="/attendance-reports"
              />
              <InfoCard
                title="Employee Directory"
                value="View All"
                icon={BiGroup}
                color="green"
                href="/employee-directory"
              />
            </div>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
};

// Error Boundary component (optional but recommended)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center bg-white p-8 rounded-xl shadow-lg">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
              <p className="text-gray-600 mb-4">There was an error loading the dashboard.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main export with Suspense and ErrorBoundary
export default function HRDashboard() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardSkeleton />}>
        <HRDashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}