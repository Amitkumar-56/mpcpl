"use client";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BiCalendar,
  BiChart,
  BiCheckCircle,
  BiDollar,
  BiError,
  BiGroup,
  BiHide,
  BiMessageRounded,
  BiRefresh,
  BiSend,
  BiShoppingBag,
  BiShow,
  BiTrendingDown,
  BiTrendingUp,
  BiX
} from "react-icons/bi";

// Indian Rupee formatting function
const formatIndianRupees = (amount) => {
  if (amount === 0 || !amount) return "₹0";
  const number = parseFloat(amount);
  if (isNaN(number)) return "₹0";
  return `₹${number.toLocaleString('en-IN')}`;
};

// Calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0 || previous === null || previous === undefined) {
    return current > 0
      ? { change: 100, isPositive: true }
      : { change: 0, isPositive: true };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    change: Math.abs(change).toFixed(1),
    isPositive: change >= 0,
  };
};

export default function DashboardPage() {
  const { user: sessionUser, logout, checkAuth } = useSession();
  const router = useRouter();
  const [activePage, setActivePage] = useState("Dashboard");
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
    clearedPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [error, setError] = useState(null);

  // Real-time Chat States - Lazy loaded
  const [socket, setSocket] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [activeChats, setActiveChats] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [employeeMessages, setEmployeeMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Get authentication token
  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  // Fast API request helper - only essential data
  const apiRequest = async (url, options = {}) => {
    const token = getAuthToken();
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("API Request failed:", error);
      throw error;
    }
  };

  // Fast dashboard data fetch - only critical data
  const fetchDashboardData = useCallback(async () => {
    try {
      const result = await apiRequest("/api/dashboard?type=essential");
      setStats(result.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Error:", err);
    }
  }, []);

  // Quick refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Navigation handlers
  const handleViewStockHistory = () => {
    router.push('/stock-history');
  };

  const handleViewAllStocks = () => {
    router.push('/all-stock');
  };

  // Lazy load chat only when needed
  const initializeChat = useCallback(async () => {
    if (!showChat || !sessionUser?.id) return;
    
    // Initialize WebSocket only when chat is opened
    const newSocket = new WebSocket("ws://localhost:3001");
    newSocket.onopen = () => {
      setSocket(newSocket);
      if (sessionUser?.id) {
        newSocket.send(JSON.stringify({
          type: "employee_join",
          employeeId: sessionUser.id,
        }));
      }
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message") {
        // Handle new messages
        setActiveChats(prev => {
          const existingChat = prev.find(chat => chat.customerId === data.customerId);
          if (existingChat) {
            return prev.map(chat =>
              chat.customerId === data.customerId
                ? { ...chat, lastMessage: data.message, unread: true }
                : chat
            );
          }
          return [...prev, {
            customerId: data.customerId,
            customerName: data.customerName,
            lastMessage: data.message,
            unread: true,
          }];
        });
      }
    };

    return () => {
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, [showChat, sessionUser]);

  // Load essential data first
  useEffect(() => {
    if (!sessionUser) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };

    loadData();
  }, [sessionUser, router, fetchDashboardData]);

  // Initialize chat only when needed
  useEffect(() => {
    if (showChat) {
      initializeChat();
    }
  }, [showChat, initializeChat]);

  // Fast loading component
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={sessionUser} />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center">
                <BiError className="text-red-500 mr-2" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
              <button onClick={handleRefresh} className="text-red-800 text-sm">
                Retry
              </button>
            </div>
          )}

          {/* Welcome Section */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                  Welcome, {sessionUser?.name}!
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Real-time outstanding balances overview
                </p>
                {lastUpdated && (
                  <p className="text-gray-500 text-xs mt-1">
                    Updated: {lastUpdated.toLocaleTimeString('en-IN')}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 mt-3 lg:mt-0">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
                  title="Refresh"
                >
                  <BiRefresh className={refreshing ? "animate-spin" : ""} />
                </button>

                <button
                  onClick={() => setShowDetailedView(!showDetailedView)}
                  className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
                >
                  {showDetailedView ? <BiHide /> : <BiShow />}
                </button>

                <button
                  onClick={() => setShowChat(!showChat)}
                  className="p-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-all relative"
                >
                  <BiMessageRounded />
                  {activeChats.filter(chat => chat.unread).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {activeChats.filter(chat => chat.unread).length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleViewStockHistory}
              className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <BiCalendar />
              <span>Stock History</span>
            </button>

            <button
              onClick={handleViewAllStocks}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <BiShoppingBag />
              <span>All Stocks</span>
            </button>
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StatCard
              title="Yesterday Outstanding"
              amount={stats.clientYesterdayOutstanding}
              icon={<BiDollar />}
              gradient="from-blue-500 to-blue-600"
              change={calculatePercentageChange(
                stats.clientYesterdayOutstanding,
                stats.clientTodayOutstanding
              )}
              showDetails={showDetailedView}
            />

            <StatCard
              title="Today Outstanding"
              amount={stats.clientTodayOutstanding}
              icon={<BiChart />}
              gradient="from-green-500 to-green-600"
              change={calculatePercentageChange(
                stats.clientTodayOutstanding,
                stats.clientYesterdayOutstanding
              )}
              showDetails={showDetailedView}
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <InfoCard
              title="Total Clients"
              value={stats.totalClients}
              icon={<BiGroup />}
              color="purple"
            />
            <InfoCard
              title="Transactions"
              value={stats.totalTransactions}
              icon={<BiShoppingBag />}
              color="blue"
            />
            <InfoCard
              title="Pending"
              value={stats.pendingPayments}
              icon={<BiError />}
              color="yellow"
            />
            <InfoCard
              title="Cleared"
              value={stats.clearedPayments}
              icon={<BiCheckCircle />}
              color="green"
            />
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Financial Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatIndianRupees(stats.clientTodayOutstanding + stats.clientYesterdayOutstanding)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Efficiency</p>
                <p className="text-xl font-bold text-blue-600">
                  {stats.collectionEfficiency?.toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.totalClients}
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Chat Widget - Only renders when showChat is true */}
      {showChat && (
        <ChatWidget
          activeChats={activeChats}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          employeeMessages={employeeMessages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          setShowChat={setShowChat}
          sessionUser={sessionUser}
          socket={socket}
        />
      )}
    </div>
  );
}

// Optimized Stat Card Component
const StatCard = ({ title, amount, icon, gradient, change, showDetails }) => (
  <div className={`bg-gradient-to-br ${gradient} text-white p-5 rounded-xl shadow-lg`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm opacity-90">{title}</p>
        <p className="text-2xl font-bold mt-2">{formatIndianRupees(amount)}</p>
        <div className="flex items-center mt-3">
          {change.isPositive ? <BiTrendingUp className="text-green-300 mr-1" /> : <BiTrendingDown className="text-red-300 mr-1" />}
          <span className="text-sm opacity-90">
            {change.isPositive ? '+' : '-'}{change.change}%
          </span>
        </div>
      </div>
      <div className="p-3 bg-white bg-opacity-20 rounded-lg">
        {icon}
      </div>
    </div>
  </div>
);

// Optimized Info Card Component
const InfoCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-lg font-bold mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
};

// Separate Chat Widget Component - Lazy loaded
const ChatWidget = ({
  activeChats,
  selectedCustomer,
  setSelectedCustomer,
  employeeMessages,
  newMessage,
  setNewMessage,
  setShowChat,
  sessionUser,
  socket
}) => {
  const messagesEndRef = useRef(null);

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedCustomer || !socket) return;
    
    const messageData = {
      type: "employee_message",
      customerId: selectedCustomer.customerId,
      text: newMessage.trim(),
      employeeId: sessionUser.id,
    };
    
    socket.send(JSON.stringify(messageData));
    setNewMessage("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border">
      <div className="bg-purple-600 rounded-t-lg p-3 text-white flex justify-between items-center">
        <h3 className="font-bold">Support Chat</h3>
        <button onClick={() => setShowChat(false)}>
          <BiX />
        </button>
      </div>
      
      <div className="max-h-96 overflow-hidden flex">
        {/* Chat list */}
        <div className="w-1/3 border-r">
          <div className="p-2 border-b bg-gray-50">
            <h4 className="font-semibold text-sm">Chats</h4>
          </div>
          <div className="h-64 overflow-y-auto">
            {activeChats.map(chat => (
              <div
                key={chat.customerId}
                className={`p-2 border-b cursor-pointer text-sm ${
                  selectedCustomer?.customerId === chat.customerId ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedCustomer(chat)}
              >
                <p className="font-medium">{chat.customerName}</p>
                <p className="text-xs text-gray-600 truncate">
                  {chat.lastMessage?.text || 'No messages'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="w-2/3 flex flex-col">
          {selectedCustomer ? (
            <>
              <div className="p-2 border-b bg-gray-50">
                <p className="font-semibold text-sm">{selectedCustomer.customerName}</p>
              </div>
              <div className="flex-1 p-2 overflow-y-auto">
                {/* Messages content */}
              </div>
              <div className="p-2 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                  <button onClick={sendMessage} className="bg-purple-600 text-white px-3 rounded">
                    <BiSend size={14} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Select a chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
};