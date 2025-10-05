// app/reports/page.jsx
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Sidebar from '../../components/sidebar';

export default function ReportsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const reports = [
    { 
      name: "Filling Report", 
      color: "bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800",
      textColor: "text-white",
      description: "View all filling requests and their status",
      icon: "📊",
      path: "/reports/report-history",
      stats: "1,234"
    },
    { 
      name: "Invoice Report", 
      color: "bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700",
      textColor: "text-gray-900",
      description: "Generate and view invoice reports",
      icon: "🧾",
      path: "/reports/invoice",
      stats: "890"
    },
    { 
      name: "Recharge Report", 
      color: "bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800",
      textColor: "text-white",
      description: "Check recharge history and reports",
      icon: "💰",
      path: "/reports/recharge",
      stats: "456"
    },
    { 
      name: "Stock Report", 
      color: "bg-gradient-to-br from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700",
      textColor: "text-gray-900",
      description: "Monitor stock levels and inventory",
      icon: "📦",
      path: "/stock/stock-request",
      stats: "2,567"
    },
  ];

  const quickStats = [
    {
      title: "Total Requests",
      value: "1,234",
      change: "+12%",
      trend: "up",
      color: "blue",
      icon: "📈"
    },
    {
      title: "Completed",
      value: "890",
      change: "+8%",
      trend: "up",
      color: "green",
      icon: "✅"
    },
    {
      title: "Pending",
      value: "344",
      change: "-3%",
      trend: "down",
      color: "amber",
      icon: "⏳"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: "filling",
      title: "New filling request completed",
      description: "Request #FR-2024-0012",
      time: "2 hours ago",
      icon: "📊",
      color: "blue"
    },
    {
      id: 2,
      type: "invoice",
      title: "Invoice generated",
      description: "Invoice #INV-2024-0456",
      time: "5 hours ago",
      icon: "🧾",
      color: "green"
    },
    {
      id: 3,
      type: "recharge",
      title: "Recharge request processed",
      description: "Transaction #RC-2024-0789",
      time: "1 day ago",
      icon: "💰",
      color: "emerald"
    }
  ];

  const handleReportClick = (path, reportName, index) => {
    setActiveReport(index);
    setTimeout(() => setActiveReport(null), 300);
    
    // Fixed condition - now all reports will navigate
    router.push(path);
  };

  const handleBack = () => {
    router.back();
  };

  const getStatColor = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', change: 'text-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600', change: 'text-green-600' },
      amber: { bg: 'bg-amber-100', text: 'text-amber-600', change: 'text-amber-600' },
      emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', change: 'text-emerald-600' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50">
      {/* Sidebar */}
      <div className={`fixed lg:static z-40 h-full transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <Sidebar activePage="Reports" onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          title="Reports Dashboard"
          subtitle="Access various reports and analytics for your business operations"
        />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-6 lg:mb-8">
              <button 
                onClick={handleBack} 
                className="group flex items-center space-x-2 text-purple-600 hover:text-purple-800 font-medium transition-all duration-200 transform hover:-translate-x-1"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </button>
            </nav>

            {/* Header Section */}
            <header className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 lg:p-8 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-4 lg:mb-0">
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                    Reports Dashboard
                  </h1>
                  <p className="text-gray-600 text-lg max-w-2xl">
                    Comprehensive analytics and reporting for your business operations. Monitor performance, track trends, and make data-driven decisions.
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-medium text-sm">Live Data</span>
                  </div>
                  <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold">
                    Export All
                  </button>
                </div>
              </div>
            </header>

            {/* Quick Stats Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
              {quickStats.map((stat, index) => {
                const color = getStatColor(stat.color);
                return (
                  <div 
                    key={stat.title}
                    className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 ${color.bg} rounded-xl flex items-center justify-center shadow-md`}>
                          <span className="text-2xl">{stat.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                          <p className="text-2xl lg:text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                        </div>
                      </div>
                      <div className={`text-right ${color.change}`}>
                        <div className="flex items-center justify-end space-x-1">
                          <span className="font-semibold">{stat.change}</span>
                          <svg className={`w-4 h-4 ${stat.trend === 'down' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500">from yesterday</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Reports Grid */}
            <section className="mb-8 lg:mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Available Reports</h2>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {reports.length} reports
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                {reports.map((report, index) => (
                  <div
                    key={report.name}
                    className={`bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform ${
                      activeReport === index ? 'scale-95' : 'hover:scale-105'
                    } cursor-pointer border border-white/20 overflow-hidden group relative`}
                    onClick={() => handleReportClick(report.path, report.name, index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleReportClick(report.path, report.name, index);
                      }
                    }}
                  >
                    {/* Active state overlay */}
                    <div className={`absolute inset-0 bg-white bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 ${
                      activeReport === index ? 'bg-opacity-20' : ''
                    }`}></div>
                    
                    <div className={`${report.color} p-6 relative overflow-hidden`}>
                      {/* Background pattern */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -translate-y-10 translate-x-10"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white bg-opacity-10 rounded-full translate-y-8 -translate-x-8"></div>
                      
                      <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm shadow-lg">
                          {report.icon}
                        </div>
                        <div className="text-white text-opacity-80 transform group-hover:translate-x-2 transition-transform duration-300">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${report.textColor} relative z-10`}>{report.name}</h3>
                      <p className={`text-sm opacity-90 mb-3 ${report.textColor} relative z-10`}>{report.description}</p>
                      <div className={`flex items-center space-x-2 ${report.textColor} relative z-10`}>
                        <span className="text-xs font-medium bg-white bg-opacity-20 px-2 py-1 rounded-full backdrop-blur-sm">
                          {report.stats} records
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 bg-opacity-50 px-6 py-4 border-t border-gray-100 border-opacity-50 backdrop-blur-sm">
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors duration-300 flex items-center">
                        View Report 
                        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Activity Section */}
            <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1"></div>
              <div className="p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Recent Activity</h2>
                  <button className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center space-x-1 transition-colors duration-200">
                    <span>View All</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {recentActivities.map((activity) => {
                    const color = getStatColor(activity.color);
                    return (
                      <div 
                        key={activity.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 ${color.bg} rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200`}>
                            <span className="text-xl">{activity.icon}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 group-hover:text-gray-900 transition-colors duration-200">
                              {activity.title}
                            </p>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-300">
                            {activity.time}
                          </span>
                          <svg className="w-5 h-5 text-gray-400 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}