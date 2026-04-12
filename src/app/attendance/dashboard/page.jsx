// src/app/attendance/dashboard/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AttendanceDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();

  const attendanceOptions = [
    {
      title: "🚛 Drivers",
      description: "Mark attendance for all drivers at once",
      href: "/attendance/drivers",
      color: "blue",
      icon: "🚛",
      features: ["Bulk selection", "Quick mark present/absent", "Time tracking", "Remarks"]
    },
    {
      title: "👥 Team Leaders",
      description: "Manage team leader attendance efficiently",
      href: "/attendance/team-leaders",
      color: "emerald",
      icon: "👥",
      features: ["Role-based filtering", "Bulk operations", "Station management", "Status tracking"]
    },
    {
      title: "💰 Accountants",
      description: "Track accountant attendance and work hours",
      href: "/attendance/accountants",
      color: "yellow",
      icon: "💰",
      features: ["Financial team tracking", "Work hour calculation", "Leave management", "Reporting"]
    },
    {
      title: "👤 Staff",
      description: "Manage staff attendance and work schedules",
      href: "/attendance/staff",
      color: "gray",
      icon: "👤",
      features: ["Staff scheduling", "Time tracking", "Leave management", "Performance tracking"]
    },
    {
      title: "👨‍✈️ Incharge",
      description: "Supervisor attendance and management",
      href: "/attendance/incharge",
      color: "purple",
      icon: "👨‍✈️",
      features: ["Supervisor tracking", "Station management", "Team oversight", "Reporting"]
    },
    {
      title: "👑 Admin",
      description: "Administrator attendance and management",
      href: "/attendance/admin",
      color: "red",
      icon: "👑",
      features: ["Admin tracking", "System oversight", "Full access", "Management"]
    },
    {
      title: "📝 Regular Attendance",
      description: "Traditional attendance marking system",
      href: "/attendance",
      color: "purple",
      icon: "📝",
      features: ["Individual marking", "Edit capabilities", "History view", "Detailed records"]
    },
    {
      title: "📊 Reports & Analytics",
      description: "View attendance reports and analytics",
      href: "/admin/attendance-reports",
      color: "indigo",
      icon: "📊",
      features: ["Attendance reports", "Analytics dashboard", "Export data", "Trends analysis"]
    }
  ];

  const AttendanceCard = ({ option }) => {
    const colorClasses = {
      blue: "bg-blue-600 hover:bg-blue-700 border-blue-200",
      emerald: "bg-emerald-600 hover:bg-emerald-700 border-emerald-200",
      yellow: "bg-yellow-600 hover:bg-yellow-700 border-yellow-200",
      green: "bg-green-600 hover:bg-green-700 border-green-200",
      purple: "bg-purple-600 hover:bg-purple-700 border-purple-200",
      indigo: "bg-indigo-600 hover:bg-indigo-700 border-indigo-200",
      red: "bg-red-600 hover:bg-red-700 border-red-200",
      gray: "bg-gray-600 hover:bg-gray-700 border-gray-200"
    };

    return (
      <Link href={option.href} className="block">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{option.icon}</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{option.description}</p>
              <div className="space-y-1">
                {option.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${colorClasses[option.color]}`}>
              Open →
            </span>
          </div>
        </div>
      </Link>
    );
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
            
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                🎯 Attendance Dashboard
              </h1>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Complete attendance management system with role-based access
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {attendanceOptions.map((option, index) => (
                  <AttendanceCard key={index} option={option} />
                ))}
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