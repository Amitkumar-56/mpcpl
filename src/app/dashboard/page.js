// src/app/dashboard/page.js
"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BiBell,
  BiCalendar,
  BiChart,
  BiCheckCircle,
  BiDollar,
  BiDownload,
  BiError,
  BiGroup,
  BiHide,
  BiRefresh,
  BiShoppingBag,
  BiShow,
  BiTrendingDown,
  BiTrendingUp
} from "react-icons/bi";

// Indian Rupee formatting function
const formatIndianRupees = (amount) => {
  if (amount === 0 || !amount) return '₹0';
  
  const number = parseFloat(amount);
  if (isNaN(number)) return '₹0';
  
  if (number < 1000) {
    return `₹${number.toLocaleString('en-IN')}`;
  }
  
  const parts = number.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';
  
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  if (otherNumbers !== '') {
    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    return `₹${formatted}${decimalPart}`;
  }
  
  return `₹${integerPart}${decimalPart}`;
};

// Calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return { change: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return {
    change: Math.abs(change).toFixed(1),
    isPositive: change >= 0
  };
};

// API endpoints configuration
const API_ENDPOINTS = {
  DASHBOARD_STATS: '/api/dashboard/stats',
  OUTSTANDING_HISTORY: '/api/outstanding/history',
  REFRESH_DATA: '/api/data/refresh'
};

export default function DashboardPage() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    vendorYesterdayOutstanding: 0,
    vendorTodayOutstanding: 0,
    clientYesterdayOutstanding: 0,
    clientTodayOutstanding: 0,
    totalVendors: 0,
    totalClients: 0,
    totalTransactions: 0,
    collectionEfficiency: 0,
    pendingPayments: 0,
    clearedPayments: 0
  });
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [error, setError] = useState(null);
  const [dataStatus, setDataStatus] = useState('idle'); // idle, loading, success, error

  // Get authentication token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('userToken');
    }
    return null;
  };

  // API request helper
  const apiRequest = async (url, options = {}) => {
    const token = getAuthToken();
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setDataStatus('loading');
      const data = await apiRequest(API_ENDPOINTS.DASHBOARD_STATS);
      
      setStats({
        vendorYesterdayOutstanding: data.vendorYesterdayOutstanding || 0,
        vendorTodayOutstanding: data.vendorTodayOutstanding || 0,
        clientYesterdayOutstanding: data.clientYesterdayOutstanding || 0,
        clientTodayOutstanding: data.clientTodayOutstanding || 0,
        totalVendors: data.totalVendors || 0,
        totalClients: data.totalClients || 0,
        totalTransactions: data.totalTransactions || 0,
        collectionEfficiency: data.collectionEfficiency || 0,
        pendingPayments: data.pendingPayments || 0,
        clearedPayments: data.clearedPayments || 0
      });
      
      setDataStatus('success');
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard statistics');
      setDataStatus('error');
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch outstanding history
  const fetchOutstandingHistory = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.OUTSTANDING_HISTORY);
      setHistoryData(data.transactions || data.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      // Don't set error for history to avoid blocking the whole dashboard
    }
  };

  // Refresh all data
  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchOutstandingHistory()
      ]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAllData();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Initial data load
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(savedUser));
    
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchDashboardStats(),
          fetchOutstandingHistory()
        ]);
        setLastUpdated(new Date());
      } catch (err) {
        setError('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [router]);

  const handleRefresh = () => {
    refreshAllData();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'Paid': 'bg-green-100 text-green-800 border border-green-200',
      'Overdue': 'bg-red-100 text-red-800 border border-red-200',
      'Partially Paid': 'bg-blue-100 text-blue-800 border border-blue-200',
      'Processing': 'bg-purple-100 text-purple-800 border border-purple-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    return type === 'Vendor' ? 
      <BiShoppingBag className="text-blue-500 text-lg" /> : 
      <BiGroup className="text-green-500 text-lg" />;
  };

  // Loading state
  if (!user || (loading && !refreshing)) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Fetching latest data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header user={user} />

        {/* Scrollable main panel */}
        <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-auto">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <BiError className="text-red-500 text-xl mr-3" />
                <div>
                  <p className="text-red-800 font-medium">Data Loading Error</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
              <button 
                onClick={refreshAllData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Success Alert */}
          {dataStatus === 'success' && refreshing && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <BiCheckCircle className="text-green-500 text-xl mr-3" />
              <div>
                <p className="text-green-800 font-medium">Data Updated</p>
                <p className="text-green-600 text-sm">Dashboard data refreshed successfully</p>
              </div>
            </div>
          )}

          {/* Welcome and Controls Section */}
          <div className="mb-4 lg:mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Welcome back, {user.name}!
                </h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">
                  Real-time outstanding balances and financial overview
                </p>
                {lastUpdated && (
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    Last updated: {lastUpdated.toLocaleString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2 md:space-x-3 mt-3 lg:mt-0">
                {/* Date Display */}
                <div className="hidden sm:flex items-center space-x-2 bg-white px-3 py-2 rounded-xl shadow-sm">
                  <BiCalendar className="text-purple-600 text-sm md:text-base" />
                  <span className="text-gray-700 text-xs md:text-sm">
                    {new Date().toLocaleDateString("en-IN", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </span>
                </div>

                {/* Action Buttons */}
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 tooltip"
                  title="Refresh Data"
                >
                  <BiRefresh className={`text-lg text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                <button 
                  onClick={() => setShowDetailedView(!showDetailedView)}
                  className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 tooltip"
                  title={showDetailedView ? "Hide Details" : "Show Details"}
                >
                  {showDetailedView ? 
                    <BiHide className="text-lg text-gray-600" /> : 
                    <BiShow className="text-lg text-gray-600" />
                  }
                </button>

                <button 
                  className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 tooltip"
                  title="Export Data"
                >
                  <BiDownload className="text-lg text-gray-600" />
                </button>

                <button className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 tooltip" title="Notifications">
                  <BiBell className="text-lg text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-4 lg:mb-6">
            {/* Vendor Yesterday Outstanding */}
            <StatCard
              title="Vendor Yesterday Outstanding"
              amount={stats.vendorYesterdayOutstanding}
              icon={<BiShoppingBag className="text-lg md:text-xl" />}
              gradient="from-blue-500 to-blue-600"
              change={calculatePercentageChange(stats.vendorYesterdayOutstanding, stats.vendorTodayOutstanding * 0.8)}
              showDetails={showDetailedView}
              additionalInfo={{
                label: "Active Vendors",
                value: stats.totalVendors
              }}
            />

            {/* Vendor Today Outstanding */}
            <StatCard
              title="Vendor Today Outstanding"
              amount={stats.vendorTodayOutstanding}
              icon={<BiGroup className="text-lg md:text-xl" />}
              gradient="from-green-500 to-green-600"
              change={{
                change: Math.abs(((stats.vendorTodayOutstanding - stats.vendorYesterdayOutstanding) / stats.vendorYesterdayOutstanding) * 100).toFixed(1),
                isPositive: stats.vendorTodayOutstanding <= stats.vendorYesterdayOutstanding
              }}
              showDetails={showDetailedView}
              additionalInfo={{
                label: "Daily Change",
                value: formatIndianRupees(stats.vendorTodayOutstanding - stats.vendorYesterdayOutstanding),
                isPositive: stats.vendorTodayOutstanding <= stats.vendorYesterdayOutstanding
              }}
            />

            {/* Client Yesterday Outstanding */}
            <StatCard
              title="Client Yesterday Outstanding"
              amount={stats.clientYesterdayOutstanding}
              icon={<BiDollar className="text-lg md:text-xl" />}
              gradient="from-purple-500 to-purple-600"
              change={{ change: stats.collectionEfficiency, isPositive: true }}
              showDetails={showDetailedView}
              additionalInfo={{
                label: "Active Clients",
                value: stats.totalClients
              }}
              customTrendText={`Collection Efficiency: ${stats.collectionEfficiency.toFixed(1)}%`}
            />

            {/* Client Today Outstanding */}
            <StatCard
              title="Client Today Outstanding"
              amount={stats.clientTodayOutstanding}
              icon={<BiChart className="text-lg md:text-xl" />}
              gradient="from-orange-500 to-orange-600"
              change={{
                change: Math.abs(((stats.clientTodayOutstanding - stats.clientYesterdayOutstanding) / stats.clientYesterdayOutstanding) * 100).toFixed(1),
                isPositive: stats.clientTodayOutstanding <= stats.clientYesterdayOutstanding
              }}
              showDetails={showDetailedView}
              additionalInfo={{
                label: "Total Transactions",
                value: stats.totalTransactions
              }}
            />
          </div>

          {/* Outstanding History Table */}
          <HistoryTable 
            data={historyData} 
            getStatusBadge={getStatusBadge}
            getTypeIcon={getTypeIcon}
            formatIndianRupees={formatIndianRupees}
          />
        </main>

        {/* Footer */}
        <Footer className="w-full" />
      </div>
    </div>
  );
}

// Stat Card Component
const StatCard = ({ title, amount, icon, gradient, change, showDetails, additionalInfo, customTrendText }) => (
  <div className={`bg-gradient-to-br ${gradient} text-white p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-opacity-90 text-xs md:text-sm lg:text-base font-medium">
          {title}
        </p>
        <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2">
          {formatIndianRupees(amount)}
        </p>
        
        {showDetails && additionalInfo && (
          <div className="mt-2 md:mt-3 pt-2 border-t border-opacity-40">
            <div className="flex justify-between text-xs md:text-sm">
              <span>{additionalInfo.label}:</span>
              <span className={`font-semibold ${
                additionalInfo.isPositive !== undefined ? 
                (additionalInfo.isPositive ? 'text-green-200' : 'text-red-200') : ''
              }`}>
                {additionalInfo.value}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className={`p-2 md:p-3 bg-opacity-30 rounded-lg md:rounded-xl ml-3`}>
        {icon}
      </div>
    </div>
    
    <div className="flex items-center mt-3 md:mt-4">
      {change.isPositive ? (
        <BiTrendingUp className="text-green-300 mr-1" />
      ) : (
        <BiTrendingDown className="text-red-300 mr-1" />
      )}
      <span className="text-opacity-90 text-xs md:text-sm">
        {customTrendText || `${change.isPositive ? '+' : '-'}${change.change}% ${change.isPositive ? 'improvement' : 'change'}`}
      </span>
    </div>
  </div>
);

// History Table Component
const HistoryTable = ({ data, getStatusBadge, getTypeIcon, formatIndianRupees }) => (
  <div className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden">
    <div className="p-4 md:p-6 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-2 sm:mb-0">
          Outstanding History
        </h2>
        <div className="flex space-x-2">
          <select className="text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
            <option>All Types</option>
            <option>Vendor</option>
            <option>Client</option>
          </select>
          <select className="text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
            <option>All Status</option>
            <option>Pending</option>
            <option>Paid</option>
            <option>Overdue</option>
            <option>Partially Paid</option>
          </select>
        </div>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full min-w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {new Date(item.date).toLocaleDateString('en-IN')}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  {getTypeIcon(item.type)}
                  <span className="ml-2 text-sm font-medium text-gray-900">{item.type}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.description}>
                {item.description}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                {formatIndianRupees(item.amount)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {getStatusBadge(item.status)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {new Date(item.dueDate).toLocaleDateString('en-IN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {data.length === 0 && (
      <div className="text-center py-12">
        <BiChart className="mx-auto text-4xl text-gray-400 mb-3" />
        <p className="text-gray-500 text-lg mb-2">No outstanding records found</p>
        <p className="text-gray-400 text-sm">Data will appear here when available</p>
      </div>
    )}

    <div className="px-4 md:px-6 py-3 bg-gray-50 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs md:text-sm text-gray-600 mb-2 sm:mb-0">
          Showing {data.length} records
        </p>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            Previous
          </button>
          <button className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
);