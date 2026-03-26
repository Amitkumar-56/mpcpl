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
  BiUser,
} from "react-icons/bi";

// ─── Skeleton ───────────────────────────────────────────────────────────────
const DashboardSkeleton = () => (
  <div className="flex h-screen bg-[#f4f6fb]">
    <div className="flex-1 flex flex-col">
      <div className="h-16 bg-white shadow-sm animate-pulse" />
      <div className="flex-1 p-6 overflow-auto space-y-6">
        <div className="h-10 bg-gray-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Card Config ─────────────────────────────────────────────────────────────
const CARD_STYLES = {
  green:  { bg: "bg-emerald-500",  ring: "ring-emerald-200",  text: "text-emerald-600",  light: "bg-emerald-50"  },
  purple: { bg: "bg-violet-500",   ring: "ring-violet-200",   text: "text-violet-600",   light: "bg-violet-50"   },
  blue:   { bg: "bg-sky-500",      ring: "ring-sky-200",      text: "text-sky-600",      light: "bg-sky-50"      },
  yellow: { bg: "bg-amber-500",    ring: "ring-amber-200",    text: "text-amber-600",    light: "bg-amber-50"    },
  red:    { bg: "bg-rose-500",     ring: "ring-rose-200",     text: "text-rose-600",     light: "bg-rose-50"     },
  indigo: { bg: "bg-indigo-500",   ring: "ring-indigo-200",   text: "text-indigo-600",   light: "bg-indigo-50"   },
};

// ─── Info Card ────────────────────────────────────────────────────────────────
const InfoCard = ({ title, value, icon: Icon, color, href }) => {
  const s = CARD_STYLES[color] ?? CARD_STYLES.blue;
  return (
    <a
      href={href}
      className={`group block rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md ring-2 ring-transparent hover:${s.ring} transition-all duration-200 overflow-hidden`}
    >
      <div className="p-5 flex items-center gap-4">
        {/* Icon bubble */}
        <div className={`shrink-0 w-12 h-12 rounded-xl ${s.light} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`w-6 h-6 ${s.text}`} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">{title}</p>
          <p className={`text-sm font-bold mt-0.5 ${s.text}`}>{value}</p>
        </div>

        {/* Arrow */}
        <svg
          className={`w-4 h-4 ${s.text} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Bottom accent bar */}
      <div className={`h-0.5 w-full ${s.bg} scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300`} />
    </a>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ label, icon: Icon, color }) => {
  const s = CARD_STYLES[color] ?? CARD_STYLES.blue;
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-8 h-8 rounded-lg ${s.light} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${s.text}`} />
      </div>
      <h2 className="text-base font-bold text-gray-700 tracking-tight">{label}</h2>
    </div>
  );
};

// ─── Main Dashboard Content ───────────────────────────────────────────────────
const HRDashboardContent = () => {
  const { user: sessionUser, logout, loading } = useSession();
  const router = useRouter();
  const [activePage, setActivePage] = useState("HR Dashboard");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!sessionUser) { router.push("/login"); return; }
    const userRole = Number(sessionUser.role);
    if ([5, 4, 3].includes(userRole)) setIsAuthorized(true);
    else router.push("/dashboard");
  }, [sessionUser, router, loading]);

  if (loading) return <DashboardSkeleton />;
  if (!sessionUser) return null;

  const userRole = Number(sessionUser.role);
  if (![5, 4, 3].includes(userRole)) {
    return (
      <div className="flex h-screen bg-[#f4f6fb] items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.27 16a2 2 0 001.8 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm mb-5">You don't have permission to access the HR Dashboard.</p>
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
    <div className="flex h-screen bg-[#f4f6fb] font-sans">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header user={sessionUser} />
        </div>

        <main className="flex-1 overflow-auto px-5 py-6 lg:px-8 lg:py-7">

          {/* ── Page Title ── */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
                  <BiGroup className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">HR Dashboard</h1>
              </div>
              <p className="text-sm text-gray-400 ml-12">Manage employee services, payroll, and attendance</p>
            </div>

            {/* Today's date badge */}
            <span className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm">
              <BiCalendar className="w-4 h-4" />
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          {/* ── Salary Management ── */}
          <section className="mb-8">
            <SectionHeader label="Salary Management" icon={BiMoney} color="green" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <InfoCard title="Salary Management" value="Manage Salaries"    icon={BiMoney} color="green"  href="/salary-management" />
              <InfoCard title="Manual Salary"      value="Add Payment"       icon={BiMoney} color="purple" href="/manual-salary" />
              <InfoCard title="Advances"           value="Manage Advances"   icon={BiMoney} color="yellow" href="/advances" />
              <InfoCard title="Payment Release"    value="Bulk Pay"          icon={BiMoney} color="red"    href="/payment-release" />
            </div>
          </section>

          {/* ── Attendance & Leave ── */}
          <section className="mb-8">
            <SectionHeader label="Attendance & Leave" icon={BiCalendar} color="blue" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <InfoCard title="Attendance"         value="Mark Attendance"   icon={BiCheckCircle} color="green"  href="/attendance" />
              <InfoCard title="Attendance Summary" value="Monthly View"      icon={BiCalendar}    color="blue"   href="/attendance/monthly-summary" />
              <InfoCard title="Leave Management"   value="Manage Leaves"     icon={BiCalendar}    color="purple" href="/leave" />
              <InfoCard title="Leave History"      value="View & Approve"    icon={BiCalendar}    color="yellow" href="/leave-history" />
            </div>
          </section>

          {/* ── Employee Services ── */}
          <section className="mb-8">
            <SectionHeader label="Employee Services" icon={BiUser} color="indigo" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <InfoCard title="My Salary"          value="View Payslips"     icon={BiUser}    color="blue"   href="/my-salary" />
              <InfoCard title="Employee Reports"   value="Analytics"         icon={BiChart}   color="green"  href="/employee-reports" />
              <InfoCard title="My Attendance"      value="View Records"      icon={BiCalendar} color="purple" href="/attendance/monthly-summary" />
              <InfoCard title="HR Letters"         value="Generate Letters"  icon={BiSend}    color="indigo" href="/hr-letters" />
            </div>
          </section>

          {/* ── Quick Actions ── */}
          <section className="mb-8">
            <SectionHeader label="Quick Actions" icon={BiSend} color="yellow" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <InfoCard title="Generate Payslips"    value="Bulk Generate"   icon={BiSend}     color="blue"   href="/payslip-generation" />
              <InfoCard title="Attendance Reports"   value="Monthly Report"  icon={BiCalendar} color="purple" href="/attendance-reports" />
              <InfoCard title="Employee Directory"   value="View All Staff"  icon={BiGroup}    color="green"  href="/employee-directory" />
            </div>
          </section>

          <Footer />
        </main>
      </div>
    </div>
  );
};

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("Dashboard error:", error, info); }
  render() {
    if (this.state.hasError)
      return (
        <div className="flex h-screen bg-[#f4f6fb] items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
            <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-gray-500 text-sm mb-5">There was an error loading the dashboard.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}

// ─── Default Export ───────────────────────────────────────────────────────────
export default function HRDashboard() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardSkeleton />}>
        <HRDashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}