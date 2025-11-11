"use client";

import CstHeader from "@/components/cstHeader";
import CstSidebar from "@/components/cstsidebar";
import Footer from "@/components/Footer";
import { useCustomerSession } from "@/context/CustomerSessionContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BiBell,
  BiCheckDouble,
  BiHistory,
  BiMessageRounded,
  BiMinus,
  BiReceipt,
  BiRefresh,
  BiSend,
  BiTime,
  BiUser,
  BiWallet,
  BiWifi,
  BiWifiOff,
  BiX,
} from "react-icons/bi";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { customer, loading: authLoading, logout } = useCustomerSession();
  const [activePage, setActivePage] = useState("Dashboard");

  // Socket and Chat States
  const [socket, setSocket] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatMinimized, setChatMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingEmployee, setTypingEmployee] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [notifications, setNotifications] = useState([]);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !customer) {
      router.push("/cst/login");
    }
  }, [customer, authLoading, router]);

  // Improved WebSocket connection with reconnection logic
  useEffect(() => {
    if (!customer?.id) return;

    console.log(
      "🔄 Initializing WebSocket connection for customer:",
      customer.id
    );

    const initializeSocket = () => {
      // Clean up existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

      try {
        const newSocket = new WebSocket(socketUrl);

        newSocket.onopen = () => {
          console.log("✅ WebSocket connected successfully");
          setConnectionStatus("connected");
          setReconnectAttempts(0);

          // Join customer room
          const joinMessage = {
            type: "customer_join",
            customerId: customer.id.toString(),
            customerName: customer.name || "Customer",
          };
          newSocket.send(JSON.stringify(joinMessage));
          console.log("📤 Sent join message:", joinMessage);
        };

        newSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📨 Received message:", data);

            switch (data.type) {
              case "new_message":
                handleNewMessage(data);
                break;
              case "message_sent":
                handleMessageSent(data);
                break;
              case "employee_typing":
                handleEmployeeTyping(data);
                break;
              case "joined_success":
                console.log("✅ Successfully joined room:", data);
                break;
              case "error":
                console.error("❌ Socket error:", data.message);
                break;
              default:
                console.log("📦 Unknown message type:", data.type);
            }
          } catch (error) {
            console.error("❌ Error parsing message:", error);
          }
        };

        newSocket.onclose = (event) => {
          console.log("🔴 WebSocket disconnected:", event.code, event.reason);
          setConnectionStatus("disconnected");

          // Attempt reconnection after delay
          if (reconnectAttempts < 5) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts),
              30000
            );
            console.log(
              `🔄 Attempting reconnection in ${delay}ms (attempt ${
                reconnectAttempts + 1
              })`
            );

            setTimeout(() => {
              setReconnectAttempts((prev) => prev + 1);
              initializeSocket();
            }, delay);
          } else {
            console.error("❌ Max reconnection attempts reached");
            setConnectionStatus("error");
          }
        };

        newSocket.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          setConnectionStatus("error");
        };

        socketRef.current = newSocket;
        setSocket(newSocket);
      } catch (error) {
        console.error("❌ Failed to create WebSocket:", error);
        setConnectionStatus("error");
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [customer?.id, reconnectAttempts]);

  // Message handlers
  const handleNewMessage = (data) => {
    const { message } = data;

    setMessages((prev) => [...prev, message]);

    if (!showChat) {
      setUnreadCount((prev) => prev + 1);
    }

    scrollToBottom();
  };

  const handleMessageSent = (data) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.tempId === data.tempId
          ? {
              ...msg,
              id: data.messageId,
              status: data.status,
              tempId: undefined,
            }
          : msg
      )
    );
  };

  const handleEmployeeTyping = (data) => {
    setIsTyping(data.typing);
    setTypingEmployee(data.typing ? data.employeeName : "");
  };

  // Load messages when chat opens
  useEffect(() => {
    if (customer?.id && showChat) {
      fetchCustomerMessages();
      setUnreadCount(0); // Mark as read when opening chat
    }
  }, [customer, showChat]);

  const fetchCustomerMessages = async () => {
    try {
      if (!customer?.id) return;

      console.log("📥 Fetching customer messages...");
      const response = await fetch(
        `/api/chat/messages?customerId=${customer.id}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages || []);
          scrollToBottom();
        }
      }
    } catch (error) {
      console.error("Error fetching customer messages:", error);
    }
  };

  const sendMessage = async () => {
    const messageText = newMessage.trim();

    if (
      !messageText ||
      !customer ||
      !socketRef.current ||
      connectionStatus !== "connected"
    ) {
      console.warn("⚠️ Cannot send message - conditions not met:", {
        hasMessage: !!messageText,
        hasCustomer: !!customer,
        socketReady: socketRef.current?.readyState === WebSocket.OPEN,
        connectionStatus,
      });
      return;
    }

    console.log("🚀 Sending message...");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      tempId,
      text: messageText,
      sender: "customer",
      customer_id: customer.id,
      status: "sending",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
    scrollToBottom();

    try {
      const messageData = {
        type: "customer_message",
        customerId: customer.id.toString(),
        text: messageText,
        customerName: customer.name || "Customer",
        tempId: tempId,
      };

      socketRef.current.send(JSON.stringify(messageData));
      console.log("📤 Sent message data:", messageData);
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId ? { ...msg, status: "failed" } : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  const reconnectSocket = () => {
    setReconnectAttempts(0);
    setConnectionStatus("connecting");

    // Force reinitialize socket
    if (socketRef.current) {
      socketRef.current.close();
    }

    setTimeout(() => {
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
      try {
        const newSocket = new WebSocket(socketUrl);

        newSocket.onopen = () => {
          console.log("✅ Manual reconnection successful");
          setConnectionStatus("connected");
          setReconnectAttempts(0);
        };

        newSocket.onerror = () => {
          setConnectionStatus("error");
        };

        socketRef.current = newSocket;
        setSocket(newSocket);
      } catch (error) {
        console.error("❌ Manual reconnection failed:", error);
        setConnectionStatus("error");
      }
    }, 1000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    setChatMinimized(false);
    if (!showChat) {
      setUnreadCount(0);
    }
  };

  const minimizeChat = () => {
    setChatMinimized(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "--:--";
    }
  };

  const getStatusIcon = (message) => {
    if (message.sender !== "customer") return null;

    switch (message.status) {
      case "sending":
        return <BiTime className="w-3 h-3 text-gray-400" />;
      case "sent":
        return <BiCheckDouble className="w-3 h-3 text-gray-400" />;
      case "delivered":
        return <BiCheckDouble className="w-3 h-3 text-blue-500" />;
      case "read":
        return <BiCheckDouble className="w-3 h-3 text-green-500" />;
      case "failed":
        return <BiTime className="w-3 h-3 text-red-500" />;
      default:
        return <BiTime className="w-3 h-3 text-gray-400" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
      case "reconnecting":
        return "bg-yellow-500 animate-pulse";
      case "disconnected":
        return "bg-gray-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <BiWifi className="w-4 h-4" />;
      case "connecting":
      case "reconnecting":
        return <BiWifi className="w-4 h-4 animate-spin" />;
      default:
        return <BiWifiOff className="w-4 h-4" />;
    }
  };

  const redirectToCustomerHistory = () => {
    router.push("/cst/customer-history");
  };

  const redirectToMyUsers = () => {
    router.push("/cst/user");
  };

  const handleRecharge = async () => {
    if (!rechargeAmount || isNaN(rechargeAmount) || rechargeAmount <= 0) {
      alert("Please enter a valid recharge amount");
      return;
    }

    try {
      const response = await fetch("/api/customer/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          amount: parseFloat(rechargeAmount),
        }),
      });

      if (response.ok) {
        alert(`Recharge of ₹${rechargeAmount} initiated successfully!`);
        setShowRechargeModal(false);
        setRechargeAmount("");
      } else {
        throw new Error("Recharge failed");
      }
    } catch (error) {
      console.error("Recharge error:", error);
      alert("Recharge failed. Please try again.");
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer dashboard...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <CstSidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <CstHeader />

        <main className="flex-1 p-6 overflow-auto">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            {activePage}
          </h2>

          {activePage === "Dashboard" && (
            <div className="space-y-6">
              {/* Connection Status Banner */}
              {connectionStatus !== "connected" && (
                <div
                  className={`border rounded-lg p-4 ${
                    connectionStatus === "error"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${getConnectionStatusColor()} mr-3`}
                      ></div>
                      <div>
                        <p
                          className={`font-medium ${
                            connectionStatus === "error"
                              ? "text-red-800"
                              : "text-yellow-800"
                          }`}
                        >
                          Chat Connection Issue
                        </p>
                        <p
                          className={`text-sm ${
                            connectionStatus === "error"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          Status: {connectionStatus}
                          {connectionStatus === "error" &&
                            " - Please check your internet connection"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={reconnectSocket}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center ${
                          connectionStatus === "error"
                            ? "bg-red-100 hover:bg-red-200 text-red-800"
                            : "bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
                        }`}
                      >
                        <BiRefresh className="mr-1" />
                        Retry
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-sm transition-colors"
                      >
                        Refresh Page
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">
                      Welcome back, {customer.name}! 👋
                    </h3>
                    <p className="text-blue-100">
                      {connectionStatus === "connected"
                        ? "Live support is available"
                        : `Connection: ${connectionStatus}`}
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={redirectToMyUsers}
                      className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      <BiUser className="w-5 h-5" />
                      <span>My Users</span>
                    </button>

                    <button
                      onClick={redirectToCustomerHistory}
                      className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      <BiHistory className="w-5 h-5" />
                      <span>Transaction History</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className={`p-3 rounded-full ${
                          connectionStatus === "connected"
                            ? "bg-green-100 text-green-600"
                            : connectionStatus === "connecting" ||
                              connectionStatus === "reconnecting"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {getConnectionStatusIcon()}
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-500">
                          Connection
                        </h4>
                        <p className="text-lg font-bold text-gray-900 capitalize">
                          {connectionStatus}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                      <BiBell className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-500">
                        Notifications
                      </h4>
                      <p className="text-2xl font-bold text-gray-900">
                        {notifications.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                      <BiMessageRounded className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-500">
                        Live Support
                      </h4>
                      <p className="text-lg font-bold text-gray-900">
                        Real-time Chat
                      </p>
                      <button
                        onClick={toggleChat}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        {showChat ? "Close Chat" : "Start Chat"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-600">
                      <BiWallet className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-500">
                        Wallet Balance
                      </h4>
                      <p className="text-lg font-bold text-gray-900">
                        Quick Recharge
                      </p>
                      <button
                        onClick={() => setShowRechargeModal(true)}
                        className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
                      >
                        <BiWallet className="w-4 h-4" />
                        <span>Recharge Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={redirectToMyUsers}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 flex items-center space-x-3 group"
                  >
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <BiUser className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-800">My Users</h4>
                      <p className="text-sm text-gray-600">Manage your users</p>
                    </div>
                  </button>

                  <button
                    onClick={redirectToCustomerHistory}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 flex items-center space-x-3 group"
                  >
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <BiReceipt className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-800">
                        Transaction History
                      </h4>
                      <p className="text-sm text-gray-600">
                        View all your transactions
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowRechargeModal(true)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-300 flex items-center space-x-3 group"
                  >
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <BiWallet className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-800">
                        Recharge Wallet
                      </h4>
                      <p className="text-sm text-gray-600">
                        Add balance to your account
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={toggleChat}
                    className="p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all duration-300 flex items-center space-x-3 group"
                  >
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      <BiMessageRounded className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-800">
                        Live Support
                      </h4>
                      <p className="text-sm text-gray-600">
                        Chat with support team
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Recharge Your Wallet
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Amount (₹)
                </label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {[100, 500, 1000, 2000, 5000, 10000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(amount.toString())}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleRecharge}
                  disabled={!rechargeAmount}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  Proceed to Pay ₹{rechargeAmount || "0"}
                </button>
                <button
                  onClick={() => setShowRechargeModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {showChat && (
        <div
          className={`fixed bottom-4 right-4 z-50 ${
            chatMinimized ? "w-80" : "w-96"
          } transition-all duration-300 bg-white rounded-lg shadow-lg flex flex-col border border-gray-300 max-h-[500px]`}
        >
          {/* Chat Header */}
          <div className="bg-blue-600 p-4 flex items-center justify-between text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${getConnectionStatusColor()} mr-3`}
              ></div>
              <div>
                <h2 className="text-lg font-semibold">Customer Support</h2>
                <p className="text-blue-100 text-xs capitalize">
                  {connectionStatus}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={minimizeChat}
                className="hover:bg-blue-700 p-1 rounded transition-colors"
              >
                <BiMinus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowChat(false)}
                className="hover:bg-blue-700 p-1 rounded transition-colors"
              >
                <BiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 max-h-80 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No messages yet. Start a conversation!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id || msg.tempId}
                  className={`flex ${
                    msg.sender === "customer" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.sender === "customer"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-white text-gray-800 border rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <div
                      className={`flex items-center justify-end space-x-1 mt-1 ${
                        msg.sender === "customer"
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      <span className="text-xs">
                        {formatTime(msg.timestamp)}
                      </span>
                      {getStatusIcon(msg)}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {typingEmployee} is typing...
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-gray-300 bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  connectionStatus === "connected"
                    ? "Type your message..."
                    : "Connecting to chat..."
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={sending || connectionStatus !== "connected"}
              />
              <button
                onClick={sendMessage}
                disabled={
                  !newMessage.trim() ||
                  sending ||
                  connectionStatus !== "connected"
                }
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <BiSend className="w-5 h-5" />
                )}
              </button>
            </div>
            {connectionStatus !== "connected" && (
              <p className="text-xs text-red-500 mt-2 text-center">
                Cannot send messages - {connectionStatus}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Chat Toggle Button */}
      {!showChat && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-40 flex items-center justify-center"
        >
          <BiMessageRounded className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
