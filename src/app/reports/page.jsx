// app/reports/page.jsx
"use client";

import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  
  const reports = [
    { 
      name: "Filling Report", 
      color: "bg-gradient-to-br from-blue-500 to-blue-700",
      textColor: "text-white",
      description: "View all filling requests and their status",
      icon: "📊",
      path: "/filling-requests?status=All"
    },
    { 
      name: "Invoice Report", 
      color: "bg-gradient-to-br from-amber-400 to-amber-600",
      textColor: "text-gray-900",
      description: "Generate and view invoice reports",
      icon: "🧾",
      path: "/reports/invoice"
    },
    { 
      name: "Recharge Report", 
      color: "bg-gradient-to-br from-emerald-500 to-emerald-700",
      textColor: "text-white",
      description: "Check recharge history and reports",
      icon: "💰",
      path: "/reports/recharge"
    },
    { 
      name: "Stock Report", 
      color: "bg-gradient-to-br from-cyan-400 to-cyan-600",
      textColor: "text-gray-900",
      description: "Monitor stock levels and inventory",
      icon: "📦",
      path: "/reports/stock"
    },
  ];

  const handleReportClick = (path, reportName) => {
    if (path.includes('/filling-requests')) {
      router.push(path);
    } else {
      alert(`${reportName} will be implemented soon`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-600" aria-label="Breadcrumb">
        <button 
          onClick={handleBack} 
          className="hover:underline text-blue-600 flex items-center transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </nav>

      {/* Header Section */}
      <header className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Reports Dashboard</h1>
        <p className="text-gray-600 text-lg">Access various reports and analytics for your business operations</p>
      </header>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
        {reports.map((report, index) => (
          <div
            key={report.name}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-200 overflow-hidden group"
            onClick={() => handleReportClick(report.path, report.name)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleReportClick(report.path, report.name);
              }
            }}
          >
            <div className={`${report.color} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm`}>
                  {report.icon}
                </div>
                <div className="text-white text-opacity-80 transform group-hover:translate-x-1 transition-transform duration-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${report.textColor}`}>{report.name}</h3>
              <p className={`text-sm opacity-90 ${report.textColor}`}>{report.description}</p>
            </div>
            <div className="bg-gray-50 bg-opacity-50 px-6 py-4 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200 flex items-center">
                View Report 
                <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <span className="text-blue-600 text-xl">📈</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800">1,234</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-gray-800">890</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mr-4">
              <span className="text-amber-600 text-xl">⏳</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-gray-800">344</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-blue-600 text-sm">📊</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">New filling request completed</p>
                <p className="text-sm text-gray-600">Request #FR-2024-0012</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">2 hours ago</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-green-600 text-sm">🧾</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Invoice generated</p>
                <p className="text-sm text-gray-600">Invoice #INV-2024-0456</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">5 hours ago</span>
          </div>  
        </div>
      </section>
    </div>
  );
}