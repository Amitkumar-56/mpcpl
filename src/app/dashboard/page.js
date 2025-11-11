"use client";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  BiMessageRounded,
  BiRefresh,
  BiSend,
  BiShoppingBag,
  BiShow,
  BiTrendingDown,
  BiTrendingUp,
  BiX,
} from "react-icons/bi";

// Indian Rupee formatting function
const formatIndianRupees = (amount) => {
  if (amount === 0 || !amount) return "₹0";

  const number = parseFloat(amount);
  if (isNaN(number)) return "₹0";

  if (number < 1000) {
    return `₹${number.toLocaleString("en-IN")}`;
  }

  const parts = number.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : "";

  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);

  if (otherNumbers !== "") {
    const formatted =
      otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    return `₹${formatted}${decimalPart}`;
  }

  return `₹${integerPart}${decimalPart}`;
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

// API endpoints
const API_ENDPOINTS = {
  DASHBOARD_DATA: "/api/dashboard?type=all",
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
    vendorChange: 0,
    clientChange: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [error, setError] = useState(null);
  const [dataStatus, setDataStatus] = useState("idle");

  // Real-time Chat States
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

  // API request helper
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

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "API request failed");
      }

      return result;
    } catch (error) {
      console.error("API Request failed:", error);
      throw error;
    }
  };

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setDataStatus("loading");
      const result = await apiRequest(API_ENDPOINTS.DASHBOARD_DATA);

      // Set stats
      setStats(result.data);

      setDataStatus("success");
      setError(null);
      setLastUpdated(new Date(result.lastUpdated));
    } catch (err) {
      setError(err.message || "Failed to fetch dashboard data");
      setDataStatus("error");
      console.error("Error fetching dashboard data:", err);
    }
  }, []);

  // Refresh all data
  const handleRefresh = () => {
    refreshAllData();
  };

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshAllData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshAllData]);

  // Socket.io connection for real-time chat
  useEffect(() => {
    // Initialize socket connection
    const newSocket = new WebSocket("ws://localhost:3001");

    newSocket.onopen = () => {
      console.log("WebSocket connected");
      setSocket(newSocket);

      // Join employee room
      if (sessionUser?.id) {
        newSocket.send(
          JSON.stringify({
            type: "employee_join",
            employeeId: sessionUser.id,
          })
        );
      }
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "new_message") {
        const { message, customerId, customerName } = data;

        setActiveChats((prev) => {
          const existingChat = prev.find(
            (chat) => chat.customerId === customerId
          );
          if (existingChat) {
            return prev.map((chat) =>
              chat.customerId === customerId
                ? { ...chat, lastMessage: message, unread: true }
                : chat
            );
          } else {
            return [
              ...prev,
              {
                customerId,
                customerName,
                lastMessage: message,
                unread: true,
                timestamp: new Date(),
              },
            ];
          }
        });

        setEmployeeMessages((prev) => ({
          ...prev,
          [customerId]: [...(prev[customerId] || []), message],
        }));
      }
    };

    newSocket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, [sessionUser]);

  // Load active chats
  useEffect(() => {
    if (sessionUser?.id) {
      fetchActiveChats();
    }
  }, [sessionUser]);

  const fetchActiveChats = async () => {
    try {
      const response = await fetch("/api/chat/sessions");
      const data = await response.json();

      if (data.success) {
        setActiveChats(
          data.sessions.map((session) => ({
            customerId: session.customerId.id,
            customerName: session.customerId.name,
            customerEmail: session.customerId.email,
            customerPhone: session.customerId.phone,
            customerPlan: session.customerId.plan,
            lastMessageAt: session.last_message_at,
            unread: true,
            assignedEmployee: session.employeeId,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching active chats:", error);
    }
  };

  // Initial data load
  useEffect(() => {
    if (!sessionUser) {
      router.push("/login");
      return;
    }

    const loadInitialData = async () => {
      setLoading(true);
      try {
        await fetchDashboardData();
      } catch (err) {
        setError("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [sessionUser, router, fetchDashboardData]);

  // Chat Functions
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowChat(true);

    if (socket) {
      socket.send(
        JSON.stringify({
          type: "employee_join_customer",
          customerId: customer.customerId,
        })
      );
    }

    fetchCustomerMessages(customer.customerId);

    // Mark as read
    if (socket && sessionUser) {
      socket.send(
        JSON.stringify({
          type: "mark_as_read",
          customerId: customer.customerId,
          userId: sessionUser.id,
          userType: "employee",
        })
      );
    }
  };

  const fetchCustomerMessages = async (customerId) => {
    try {
      const response = await fetch(
        `/api/chat/messages?customerId=${customerId}`
      );
      const data = await response.json();

      if (data.success) {
        setEmployeeMessages((prev) => ({
          ...prev,
          [customerId]: data.messages,
        }));
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error fetching customer messages:", error);
    }
  };

  const sendEmployeeMessage = () => {
    if (!newMessage.trim() || !selectedCustomer || !socket || !sessionUser)
      return;

    const messageData = {
      type: "employee_message",
      customerId: selectedCustomer.customerId,
      text: newMessage.trim(),
      employeeId: sessionUser.id,
      employeeName: sessionUser.name,
    };

    socket.send(JSON.stringify(messageData));
    setNewMessage("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendEmployeeMessage();
    }
  };

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const chatElement = document.querySelector(".employee-chat-widget");
      if (
        chatElement &&
        !chatElement.contains(event.target) &&
        !event.target.closest(".chat-toggle-button")
      ) {
        setShowChat(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Loading state
  if (!sessionUser || (loading && !refreshing)) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">
            Fetching latest dynamic data
          </p>
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
        <Header user={sessionUser} />

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
                onClick={handleRefresh}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Success Alert */}
          {dataStatus === "success" && refreshing && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <BiCheckCircle className="text-green-500 text-xl mr-3" />
              <div>
                <p className="text-green-800 font-medium">Data Updated</p>
                <p className="text-green-600 text-sm">
                  Dashboard data refreshed dynamically from database
                </p>
              </div>
            </div>
          )}

          {/* Welcome and Controls Section */}
          <div className="mb-4 lg:mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Welcome back, {sessionUser.name}!
                </h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">
                  Real-time dynamic outstanding balances and customer support
                  dashboard
                </p>
                {lastUpdated && (
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    Last updated:{" "}
                    {lastUpdated.toLocaleString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
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
                      day: "numeric",
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
                  <BiRefresh
                    className={`text-lg text-gray-600 ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                </button>

                <button
                  onClick={() => setShowDetailedView(!showDetailedView)}
                  className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 tooltip"
                  title={showDetailedView ? "Hide Details" : "Show Details"}
                >
                  {showDetailedView ? (
                    <BiHide className="text-lg text-gray-600" />
                  ) : (
                    <BiShow className="text-lg text-gray-600" />
                  )}
                </button>

                <button
                  className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 tooltip"
                  title="Export Data"
                >
                  <BiDownload className="text-lg text-gray-600" />
                </button>

                <button
                  className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 tooltip"
                  title="Notifications"
                >
                  <BiBell className="text-lg text-gray-600" />
                </button>

                {/* Live Chat Button for Admin */}
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="p-2 bg-green-500 text-white rounded-xl shadow-sm hover:bg-green-600 transition-all duration-200 tooltip relative"
                  title="Customer Support Chat"
                >
                  <BiMessageRounded className="text-lg" />
                  {activeChats.filter((chat) => chat.unread).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {activeChats.filter((chat) => chat.unread).length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid - Dynamic Client Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 mb-4 lg:mb-6">
            {/* Yesterday Outstanding */}
            <StatCard
              title="Yesterday Outstanding"
              amount={stats.clientYesterdayOutstanding}
              icon={<BiDollar className="text-lg md:text-xl" />}
              gradient="from-blue-500 to-blue-600"
              change={calculatePercentageChange(
                stats.clientYesterdayOutstanding,
                stats.clientTodayOutstanding
              )}
              showDetails={showDetailedView}
              additionalInfo={{
                label: "Active Clients",
                value: stats.totalClients,
              }}
            />

            {/* Today Outstanding */}
            <StatCard
              title="Today Outstanding"
              amount={stats.clientTodayOutstanding}
              icon={<BiChart className="text-lg md:text-xl" />}
              gradient="from-green-500 to-green-600"
              change={calculatePercentageChange(
                stats.clientTodayOutstanding,
                stats.clientYesterdayOutstanding
              )}
              showDetails={showDetailedView}
              additionalInfo={{
                label: "Collection Efficiency",
                value: `${stats.collectionEfficiency.toFixed(1)}%`,
                isPositive: stats.collectionEfficiency >= 80,
              }}
            />
          </div>

          {/* Additional Info Cards - Dynamic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-4 lg:mb-6">
            {/* Total Clients */}
            <InfoCard
              title="Total Clients"
              value={stats.totalClients}
              icon={<BiGroup className="text-lg md:text-xl" />}
              color="purple"
            />

            {/* Total Transactions */}
            <InfoCard
              title="Total Transactions"
              value={stats.totalTransactions}
              icon={<BiShoppingBag className="text-lg md:text-xl" />}
              color="blue"
            />

            {/* Pending Payments */}
            <InfoCard
              title="Pending Payments"
              value={stats.pendingPayments}
              icon={<BiError className="text-lg md:text-xl" />}
              color="yellow"
            />

            {/* Cleared Payments */}
            <InfoCard
              title="Cleared Payments"
              value={stats.clearedPayments}
              icon={<BiCheckCircle className="text-lg md:text-xl" />}
              color="green"
            />
          </div>

          {/* Support Quick Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <BiMessageRounded className="text-green-600 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Support Overview
                </h2>
                <p className="text-gray-600 text-sm">
                  Customer support and communication stats
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Active Chats</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeChats.length}
                </p>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Pending Replies</p>
                <p className="text-2xl font-bold text-blue-600">
                  {activeChats.filter((chat) => chat.unread).length}
                </p>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
                <p className="text-2xl font-bold text-orange-600">2m</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary - Dynamic */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BiChart className="text-blue-600 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Financial Summary
                </h2>
                <p className="text-gray-600 text-sm">
                  Dynamic overview of your outstanding balances
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatIndianRupees(
                    stats.clientTodayOutstanding +
                      stats.clientYesterdayOutstanding
                  )}
                </p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Daily Change</p>
                <p
                  className={`text-2xl font-bold ${
                    stats.clientChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stats.clientChange >= 0 ? "+" : ""}
                  {formatIndianRupees(stats.clientChange)}
                </p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.collectionEfficiency.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer className="w-full" />
      </div>

      {/* Employee Chat Widget */}
      {showChat && (
        <div className="employee-chat-widget fixed bottom-4 right-4 z-50 w-96 transition-all duration-300 ease-in-out">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-lg p-4 text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-bold">Support Dashboard</h3>
                <p className="text-purple-100 text-sm">
                  {activeChats.length} active chats
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-purple-100 hover:text-white transition-colors p-1"
            >
              <BiX className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="bg-white rounded-b-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden flex">
            {/* Active Chats List */}
            <div className="w-1/3 border-r border-gray-200">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <h4 className="font-semibold text-sm">Active Chats</h4>
              </div>
              <div className="overflow-y-auto h-80">
                {activeChats.map((chat) => (
                  <div
                    key={chat.customerId}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedCustomer?.customerId === chat.customerId
                        ? "bg-blue-50"
                        : ""
                    }`}
                    onClick={() => selectCustomer(chat)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm text-gray-800">
                          {chat.customerName}
                        </h5>
                        <p className="text-xs text-gray-600 truncate">
                          {chat.lastMessage?.text || "No messages yet"}
                        </p>
                      </div>
                      {chat.unread && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center ml-2">
                          !
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {activeChats.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No active chats
                  </div>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="w-2/3 flex flex-col">
              {selectedCustomer ? (
                <>
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <h4 className="font-semibold text-sm">
                      Chat with {selectedCustomer.customerName}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {selectedCustomer.customerEmail}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                    {(employeeMessages[selectedCustomer.customerId] || []).map(
                      (message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === "employee"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs px-3 py-2 rounded-2xl ${
                              message.sender === "employee"
                                ? "bg-purple-500 text-white rounded-br-none"
                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <div
                              className={`flex items-center justify-end space-x-1 mt-1 ${
                                message.sender === "employee"
                                  ? "text-purple-100"
                                  : "text-gray-500"
                              }`}
                            >
                              <span className="text-xs">
                                {new Date(message.timestamp).toLocaleTimeString(
                                  "en-IN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                              {message.sender === "employee" &&
                                message.employee_name && (
                                  <span className="text-xs ml-1">
                                    - {message.employee_name}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your response..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                      <button
                        onClick={sendEmployeeMessage}
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                      >
                        <BiSend className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                  Select a customer to start chatting
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
const StatCard = ({
  title,
  amount,
  icon,
  gradient,
  change,
  showDetails,
  additionalInfo,
}) => (
  <div
    className={`bg-gradient-to-br ${gradient} text-white p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200`}
  >
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
              <span
                className={`font-semibold ${
                  additionalInfo.isPositive !== undefined
                    ? additionalInfo.isPositive
                      ? "text-green-200"
                      : "text-red-200"
                    : ""
                }`}
              >
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
        {change.isPositive ? "+" : "-"}
        {change.change}% {change.isPositive ? "increase" : "decrease"}
      </span>
    </div>
  </div>
);

// Info Card Component
const InfoCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <div
      className={`border rounded-xl p-4 md:p-5 ${colorClasses[color]} shadow-sm hover:shadow-md transition-shadow duration-200`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm md:text-base font-medium">{title}</p>
          <p className="text-xl md:text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 bg-white bg-opacity-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
};
