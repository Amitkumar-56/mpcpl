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
      color: "bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400",
      icon: "📊",
      borderColor: "border-blue-200",
      shadowColor: "shadow-blue-200"
    },
    {
      title: "Total Stock", 
      value: stats.stock.total,
      color: "bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400",
      icon: "📦",
      borderColor: "border-emerald-200",
      shadowColor: "shadow-emerald-200"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`${stat.color} ${stat.borderColor} border-2 rounded-2xl p-6 text-white shadow-xl ${stat.shadowColor} transform transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden group`}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-white/90 text-sm font-semibold mb-2 tracking-wide uppercase">{stat.title}</p>
              <p className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{stat.value.toLocaleString()}</p>
              <div className="mt-3 h-1 bg-white/30 rounded-full w-16"></div>
            </div>
            <div className="text-4xl sm:text-5xl opacity-90 transform group-hover:scale-110 transition-transform duration-300">
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {reports.map((report, index) => (
        <div
          key={index}
          className={`${report.color} rounded-2xl p-8 shadow-xl transform transition-all duration-300 cursor-pointer ${
            activeReport === index 
              ? 'scale-95 ring-4 ring-white ring-opacity-50 shadow-2xl' 
              : 'hover:scale-105 hover:shadow-2xl'
          } relative overflow-hidden group`}
          onClick={() => onReportClick(report.path, report.name, index)}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`
            }}></div>
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between mb-6">
              <div className="text-4xl sm:text-5xl transform group-hover:scale-110 transition-transform duration-300">
                {report.icon}
              </div>
              <div className={`p-3 rounded-full bg-white/20 backdrop-blur-sm transform group-hover:scale-110 transition-all duration-300 group-hover:bg-white/30`}>
                <svg 
                  className="w-6 h-6 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3 text-white drop-shadow-lg">{report.name}</h3>
              <p className="text-white/90 text-base leading-relaxed mb-6">{report.description}</p>
            </div>
            
            <div className="mt-auto pt-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold text-sm uppercase tracking-wide">
                  View Report
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3].map((dot) => (
                    <div key={dot} className="w-2 h-2 bg-white/50 rounded-full group-hover:bg-white transition-colors duration-300"></div>
                  ))}
                </div>
              </div>
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
      color: "bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400",
      textColor: "text-white",
      description: "View comprehensive filling requests analysis and status tracking",
      icon: "📊",
      path: "/reports/filling-report",
      type: "filling"
    },
    { 
      name: "Stock Report", 
      color: "bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400",
      textColor: "text-white",
      description: "Monitor real-time inventory levels and stock management insights",
      icon: "📦",
      path: "/stock/stock-reports",
      type: "stock"
    }
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
        <main className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <button 
                onClick={handleBack} 
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors group"
                title="Go Back"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Back</span>
              </button>
            </div>
            <div className="mt-6">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-3">Reports Dashboard</h1>
              <p className="text-lg text-gray-600">Access comprehensive reports and analytics for your business</p>
            </div>
          </div>

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