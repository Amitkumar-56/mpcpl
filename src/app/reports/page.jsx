// app/reports/page.jsx
"use client";

import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Sidebar from '../../components/sidebar';

// Loading component for the main page
function ReportsLoading() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50">
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="animate-pulse">
            {/* Breadcrumb skeleton */}
            <div className="mb-6 lg:mb-8">
              <div className="h-6 w-32 bg-gray-300 rounded"></div>
            </div>

            {/* Quick Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-2xl p-4 h-24"></div>
              ))}
            </div>

            {/* Reports Grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-2xl h-48"></div>
              ))}
            </div>

            {/* Additional Stats skeleton */}
            <div className="bg-gray-200 rounded-2xl p-6 h-32"></div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Stats Loading component
function StatsLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 h-20 sm:h-24 animate-pulse"></div>
      ))}
    </div>
  );
}

// Quick Stats component
function QuickStats({ stats, loading }) {
  if (loading) {
    return <StatsLoading />;
  }

  const statCards = [
    {
      title: "Total Fillings",
      value: stats.filling.total,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      icon: "📊"
    },
    {
      title: "Total Stock",
      value: stats.stock.total,
      color: "bg-gradient-to-br from-green-500 to-green-600",
      icon: "📦"
    },
    {
      title: "Total Invoices",
      value: stats.invoice.total,
      color: "bg-gradient-to-br from-amber-500 to-amber-600",
      icon: "🧾"
    },
    {
      title: "Total Recharges",
      value: stats.recharge.total,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      icon: "💰"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`${stat.color} rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">{stat.title}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2">{stat.value}</p>
            </div>
            <div className="text-2xl sm:text-3xl opacity-80">
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Reports Grid component
function ReportsGrid({ reports, loading, activeReport, onReportClick }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-48 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {reports.map((report, index) => (
        <div
          key={index}
          className={`${report.color} ${report.textColor} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg transform transition-all duration-300 cursor-pointer ${
            activeReport === index 
              ? 'scale-95 ring-4 ring-opacity-50 ring-white' 
              : 'hover:scale-105 hover:shadow-xl'
          }`}
          onClick={() => onReportClick(report.path, report.name, index)}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-2xl sm:text-3xl">{report.icon}</div>
              <svg 
                className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 transform transition-transform duration-300 group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">{report.name}</h3>
            <p className="text-xs sm:text-sm opacity-90 flex-1">{report.description}</p>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-opacity-20">
              <span className="text-xs font-medium opacity-80">
                Click to view report →
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main component
function ReportsContent() {
  const router = useRouter();
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    filling: { total: 0, completed: 0, pending: 0, approved: 0 },
    stock: { total: 0 },
    invoice: { total: 0 },
    recharge: { total: 0 }
  });

  // Fetch all reports stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch stats from API
        const response = await fetch('/api/reports/filling-report');
        const result = await response.json();
        
        if (result.success && result.data.stats) {
          setStats({
            filling: { 
              total: result.data.stats.totalFilling || 0, 
              completed: result.data.stats.totalFilling || 0, 
              pending: 0, 
              approved: 0 
            },
            stock: { total: result.data.stats.totalStock || 0 },
            invoice: { total: result.data.stats.totalInvoice || 0 },
            recharge: { total: result.data.stats.totalRecharge || 0 }
          });
        } else {
          // Fallback to zero if API fails
          setStats({
            filling: { total: 0, completed: 0, pending: 0, approved: 0 },
            stock: { total: 0 },
            invoice: { total: 0 },
            recharge: { total: 0 }
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set default values on error
        setStats({
          filling: { total: 0, completed: 0, pending: 0, approved: 0 },
          stock: { total: 0 },
          invoice: { total: 0 },
          recharge: { total: 0 }
        });
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const reports = [
    { 
      name: "Filling Report", 
      color: "bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800",
      textColor: "text-white",
      description: "View all filling requests and their status",
      icon: "📊",
      path: "/reports/filling-report",
      type: "filling"
    },
    { 
      name: "Invoice Report", 
      color: "bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700",
      textColor: "text-gray-900",
      description: "Generate and view invoice reports",
      icon: "🧾",
      path: "/reports/invoice",
      type: "invoice"
    },
    { 
      name: "Recharge Report", 
      color: "bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800",
      textColor: "text-white",
      description: "Check recharge history and reports",
      icon: "💰",
      path: "/reports/recharge",
      type: "recharge"
    },
    { 
      name: "Stock Report", 
      color: "bg-gradient-to-br from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700",
      textColor: "text-gray-900",
      description: "Monitor stock levels and inventory",
      icon: "📦",
      path: "/stock/stock-reports",
      type: "stock"
    },
  ];

  const handleReportClick = (path, reportName, index) => {
    setActiveReport(index);
    setTimeout(() => setActiveReport(null), 300);
    router.push(path);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50">
      {/* Sidebar - Always visible, collapsible on mobile */}
      <div className="flex-shrink-0">
        <Sidebar activePage="Reports" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <Header />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          {/* Breadcrumb */}
          <nav className="mb-4 sm:mb-6 lg:mb-8">
            <button 
              onClick={handleBack} 
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </nav>

          {/* Quick Stats with Suspense */}
          <Suspense fallback={null}>
            <QuickStats stats={stats} loading={loading} />
          </Suspense>

          {/* Reports Grid with Suspense */}
          <Suspense fallback={null}>
            <ReportsGrid 
              reports={reports} 
              loading={loading} 
              activeReport={activeReport} 
              onReportClick={handleReportClick}
            />
          </Suspense>
        </main>
        
        {/* Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  );
}