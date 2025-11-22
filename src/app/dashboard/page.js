"use client";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
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
  const [notifSocket, setNotifSocket] = useState(null);
  const [notifCount, setNotifCount] = useState(0);

  // Get authentication token
  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  // Fast API request helper - only essential data
  const apiRequest = useCallback(async (url, options = {}) => {
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
  }, []);

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
  }, [apiRequest]);

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
    
    console.log('Dashboard: Initializing chat socket for employee:', sessionUser.id);
    
    // Initialize Socket.io for chat
    try { 
      await fetch('/api/socket');
    } catch (e) {
      console.error('Dashboard: Error fetching socket endpoint:', e);
    }
    
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || origin;
    
    const chatSocket = io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });
    
    chatSocket.on('connect', () => {
      console.log('Dashboard: Chat socket connected!');
      setSocket(chatSocket);
      if (sessionUser?.id) {
        chatSocket.emit('employee_join', {
          employeeId: String(sessionUser.id),
          employeeName: sessionUser.name || 'Employee',
          role: sessionUser.role,
        });
      }
    });
    
    chatSocket.on('connect_error', (error) => {
      console.error('Dashboard: Chat socket connection error:', error);
    });
    
    chatSocket.on('new_message', (data) => {
      console.log('Dashboard: Received new_message in chat:', data);
      // Handle new messages
      if (data.message) {
        setActiveChats(prev => {
          const existingChat = prev.find(chat => chat.customerId === data.message.customer_id);
          if (existingChat) {
            return prev.map(chat =>
              chat.customerId === data.message.customer_id
                ? { ...chat, lastMessage: data.message, unread: true }
                : chat
            );
          }
          return [...prev, {
            customerId: data.message.customer_id,
            customerName: data.message.customer_name || 'Customer',
            lastMessage: data.message,
            unread: true,
          }];
        });
        
        // Update messages if customer is selected
        if (selectedCustomer && selectedCustomer.customerId === data.message.customer_id) {
          setEmployeeMessages(prev => {
            const customerMessages = prev[data.message.customer_id] || [];
            return {
              ...prev,
              [data.message.customer_id]: [...customerMessages, data.message]
            };
          });
        }
      }
    });
    
    chatSocket.on('message_sent', (data) => {
      console.log('Dashboard: Message sent confirmation:', data);
    });
    
    return () => {
      console.log('Dashboard: Cleaning up chat socket');
      if (chatSocket && chatSocket.connected) {
        chatSocket.disconnect();
      }
    };
  }, [showChat, sessionUser, selectedCustomer]);

  // Socket.io notifications for Support Chat (employees)
  useEffect(() => {
    if (!sessionUser?.id) {
      console.log('Dashboard: No sessionUser, skipping socket setup');
      return;
    }
    
    console.log('Dashboard: Setting up socket connection for employee:', sessionUser.id);
    let s;
    (async () => {
      try { 
        await fetch('/api/socket');
        console.log('Dashboard: Socket API endpoint ready');
      } catch (e) {
        console.error('Dashboard: Error fetching socket endpoint:', e);
      }
      
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || origin;
      
      console.log('Dashboard: Connecting to socket:', socketUrl);
      s = io(socketUrl, {
        path: '/api/socket',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
      });
      
      s.on('connect', () => {
        console.log('Dashboard: Socket connected! Emitting employee_join');
        s.emit('employee_join', {
          employeeId: String(sessionUser.id),
          employeeName: sessionUser.name || 'Employee',
          role: sessionUser.role,
        });
      });
      
      s.on('connect_error', (error) => {
        console.error('Dashboard: Socket connection error:', error);
      });
      
      s.on('disconnect', (reason) => {
        console.log('Dashboard: Socket disconnected:', reason);
      });
      
      s.on('employee_joined', (data) => {
        console.log('Dashboard: Employee joined successfully:', data);
      });
      
      s.on('customer_message_notification', (data) => {
        console.log('Dashboard: Received customer_message_notification:', data);
        setNotifCount((c) => {
          const newCount = c + 1;
          console.log('Dashboard: Notification count updated to:', newCount);
          return newCount;
        });
        setActiveChats((prev) => {
          const idx = prev.findIndex(c => c.customerId === data.customerId);
          const chatItem = {
            customerId: data.customerId,
            customerName: data.customerName,
            lastMessage: { id: data.messageId, text: data.text, timestamp: data.timestamp, sender: 'customer' },
            unread: true,
          };
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...chatItem };
            return copy;
          }
          return [chatItem, ...prev];
        });
        // Auto-open chat widget when notification is received
        if (!showChat) {
          setShowChat(true);
        }
        // Auto-select the customer chat when notification is received
        setSelectedCustomer({
          customerId: data.customerId,
          customerName: data.customerName,
          lastMessage: { id: data.messageId, text: data.text, timestamp: data.timestamp, sender: 'customer' },
          unread: true,
        });
      });
      
      s.on('chat_assigned', (data) => {
        console.log('Dashboard: Chat assigned:', data);
        setActiveChats((prev) => prev.map(c => c.customerId === data.customerId ? { ...c, unread: false } : c));
      });
      
      setNotifSocket(s);
      console.log('Dashboard: Socket setup complete');
    })();
    
    return () => { 
      console.log('Dashboard: Cleaning up socket connection');
      try { 
        if (s) {
          s.disconnect();
        }
      } catch (e) {
        console.error('Dashboard: Error disconnecting socket:', e);
      }
    };
  }, [sessionUser]);

  const acceptChat = (customerId) => {
    if (!notifSocket || !notifSocket.connected) return;
    notifSocket.emit('employee_accept_chat', {
      customerId,
      employeeId: String(sessionUser.id),
      employeeName: sessionUser.name || 'Employee',
    });
  };

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
          setEmployeeMessages={setEmployeeMessages}
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
  setEmployeeMessages,
  newMessage,
  setNewMessage,
  setShowChat,
  sessionUser,
  socket
}) => {
  const messagesEndRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [employeeMessages, selectedCustomer]);

  // Load message history when customer is selected
  useEffect(() => {
    if (selectedCustomer && sessionUser?.id && socket && socket.connected) {
      const loadMessages = async () => {
        setLoadingMessages(true);
        try {
          const response = await fetch(`/api/chat/messages?customerId=${selectedCustomer.customerId}&employeeId=${sessionUser.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.messages) {
              setEmployeeMessages(prev => ({
                ...prev,
                [selectedCustomer.customerId]: data.messages || []
              }));
            }
          }
        } catch (error) {
          console.error('Dashboard: Error loading messages:', error);
        } finally {
          setLoadingMessages(false);
        }
      };
      loadMessages();
    }
  }, [selectedCustomer, sessionUser?.id, socket, setEmployeeMessages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedCustomer || !socket || !socket.connected) {
      console.log('Dashboard: Cannot send message - missing requirements', {
        hasMessage: !!newMessage.trim(),
        hasCustomer: !!selectedCustomer,
        hasSocket: !!socket,
        socketConnected: socket?.connected
      });
      return;
    }
    
    const messageData = {
      customerId: selectedCustomer.customerId,
      text: newMessage.trim(),
      employeeId: sessionUser.id,
      employeeName: sessionUser.name || 'Employee',
    };
    
    console.log('Dashboard: Sending message via socket.emit:', messageData);
    
    // Use socket.emit for Socket.io, not socket.send
    socket.emit('employee_message', messageData);
    
    // Add message to local state immediately for better UX
    const tempMessage = {
      id: `temp-${Date.now()}`,
      text: newMessage.trim(),
      sender: 'employee',
      employee_id: sessionUser.id,
      customer_id: selectedCustomer.customerId,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    
    setEmployeeMessages(prev => {
      const customerMessages = prev[selectedCustomer.customerId] || [];
      return {
        ...prev,
        [selectedCustomer.customerId]: [...customerMessages, tempMessage]
      };
    });
    
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
              <div className="flex-1 p-2 overflow-y-auto" style={{ maxHeight: '300px' }}>
                {/* Messages content */}
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                    Loading messages...
                  </div>
                ) : employeeMessages[selectedCustomer.customerId] && employeeMessages[selectedCustomer.customerId].length > 0 ? (
                  <>
                    {employeeMessages[selectedCustomer.customerId].map((msg, idx) => (
                      <div
                        key={msg.id || msg.tempId || idx}
                        className={`mb-2 p-2 rounded text-sm ${
                          msg.sender === 'employee' 
                            ? 'bg-purple-100 ml-auto text-right max-w-[80%]' 
                            : 'bg-gray-100 mr-auto max-w-[80%]'
                        }`}
                      >
                        <p className="text-xs text-gray-600 mb-1">
                          {msg.sender === 'employee' ? 'You' : selectedCustomer.customerName}
                        </p>
                        <p className="text-gray-800">{msg.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                    No messages yet. Start the conversation!
                  </div>
                )}
              </div>
              <div className="p-2 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type message..."
                    className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={!socket || !socket.connected}
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() || !socket || !socket.connected}
                    className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    title={!socket || !socket.connected ? 'Socket not connected' : 'Send message'}
                  >
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