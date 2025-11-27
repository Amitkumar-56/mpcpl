// src/app/dashboard/page.js
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
import { io } from "socket.io-client";

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

  // Real-time Chat States
  const [socket, setSocket] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [activeChats, setActiveChats] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [employeeMessages, setEmployeeMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [notifCount, setNotifCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);

  // Helper function to remove duplicates from activeChats based on customerId
  const deduplicateChats = useCallback((chats) => {
    if (!Array.isArray(chats)) return [];
    const seen = new Map();
    const result = [];
    
    // Process in reverse to keep the most recent one
    for (let i = chats.length - 1; i >= 0; i--) {
      const chat = chats[i];
      if (!chat || !chat.customerId) continue;
      
      if (!seen.has(chat.customerId)) {
        seen.set(chat.customerId, chat);
        result.unshift(chat); // Add to beginning to maintain order
      } else {
        // If duplicate found, keep the one with more recent timestamp
        const existing = seen.get(chat.customerId);
        const existingTime = existing.lastMessage?.timestamp || '';
        const currentTime = chat.lastMessage?.timestamp || '';
        if (currentTime > existingTime) {
          // Replace with more recent one
          const index = result.findIndex(c => c.customerId === chat.customerId);
          if (index !== -1) {
            result[index] = chat;
          }
          seen.set(chat.customerId, chat);
        }
      }
    }
    
    return result;
  }, []);

  // Get authentication token
  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  // Fast API request helper
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

  // Fast dashboard data fetch
  const fetchDashboardData = useCallback(async () => {
    try {
      const result = await apiRequest("/api/dashboard");
      if (result.success) {
        setStats(result.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError("Failed to fetch dashboard data");
      console.error("Dashboard data error:", err);
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

  // Load active chat sessions
  const loadActiveChatSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/sessions');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const deduplicated = deduplicateChats(data.sessions || []);
          setActiveChats(deduplicated);
          console.log('Loaded active chat sessions:', deduplicated.length);
        }
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  }, []);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (customerId) => {
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
          userId: sessionUser?.id,
          userType: 'employee'
        })
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [sessionUser]);

  // SINGLE Socket Connection Setup
  useEffect(() => {
    if (!sessionUser?.id) {
      console.log('Dashboard: No session user, skipping socket setup');
      return;
    }

    console.log('Dashboard: Setting up socket connection for employee:', sessionUser.id);
    
    let socketInstance;

    const initializeSocket = async () => {
      try {
        await fetch('/api/socket');
        
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || origin;
        
        console.log('Dashboard: Connecting to socket:', socketUrl);
        socketInstance = io(socketUrl, {
          path: '/api/socket',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
          console.log('Dashboard: Socket connected successfully!');
          setSocket(socketInstance);
          setSocketConnected(true);
          
          socketInstance.emit('employee_join', {
            employeeId: String(sessionUser.id),
            employeeName: sessionUser.name || 'Employee',
            role: sessionUser.role,
          });
        });

        socketInstance.on('employee_joined', (data) => {
          console.log('Dashboard: Employee joined room:', data);
          loadActiveChatSessions();
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Dashboard: Socket connection error:', error);
          setSocketConnected(false);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Dashboard: Socket disconnected:', reason);
          setSocketConnected(false);
        });

        // Handle new messages from customers
        socketInstance.on('customer_message', (data) => {
          console.log('Dashboard: Received customer message:', data);
          
          setNotifCount(prev => prev + 1);
          
          // Update active chats
          setActiveChats(prev => {
            const existingChatIndex = prev.findIndex(chat => chat.customerId === data.customerId);
            const newChatItem = {
              customerId: data.customerId,
              customerName: data.customerName || `Customer ${data.customerId}`,
              lastMessage: {
                text: data.message,
                timestamp: data.timestamp || new Date().toISOString(),
                sender: 'customer'
              },
              unread: true
            };
            
            if (existingChatIndex >= 0) {
              const updatedChats = [...prev];
              updatedChats[existingChatIndex] = newChatItem;
              return deduplicateChats(updatedChats);
            } else {
              return deduplicateChats([newChatItem, ...prev]);
            }
          });

          // Update messages if this customer is selected
          if (selectedCustomer && selectedCustomer.customerId === data.customerId) {
            setEmployeeMessages(prev => {
              const currentMessages = prev[data.customerId] || [];
              return {
                ...prev,
                [data.customerId]: [
                  ...currentMessages,
                  {
                    id: `msg-${Date.now()}`,
                    text: data.message,
                    sender: 'customer',
                    timestamp: data.timestamp || new Date().toISOString(),
                    customer_id: data.customerId
                  }
                ]
              };
            });
            
            // Mark as read automatically when viewing
            markMessagesAsRead(data.customerId);
          }
        });

        // Handle message sent confirmation
        socketInstance.on('message_sent', (data) => {
          console.log('Dashboard: Message sent confirmation:', data);
          
          if (selectedCustomer && data.message) {
            setEmployeeMessages(prev => {
              const customerMessages = prev[selectedCustomer.customerId] || [];
              return {
                ...prev,
                [selectedCustomer.customerId]: customerMessages.map(msg => 
                  msg.id && msg.id.startsWith('temp-') && msg.status === 'sending'
                    ? { ...msg, id: data.message.id, status: 'sent' }
                    : msg
                )
              };
            });
          }
        });

        // Handle chat assignment
        socketInstance.on('chat_assigned', (data) => {
          console.log('Dashboard: Chat assigned:', data);
          loadActiveChatSessions();
        });

      } catch (error) {
        console.error('Dashboard: Socket initialization error:', error);
        setSocketConnected(false);
      }
    };

    initializeSocket();

    return () => {
      console.log('Dashboard: Cleaning up socket connection');
      if (socketInstance) {
        socketInstance.disconnect();
        setSocketConnected(false);
      }
    };
  }, [sessionUser, selectedCustomer, loadActiveChatSessions, markMessagesAsRead]);

  // Load dashboard data
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

  // Load active chats when chat is opened
  useEffect(() => {
    if (showChat) {
      loadActiveChatSessions();
    }
  }, [showChat, loadActiveChatSessions]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [employeeMessages, selectedCustomer]);

  // Fast loading component
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading Dashboard...</p>
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
                    {socketConnected && (
                      <span className="ml-2 text-green-600">● Live</span>
                    )}
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
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifCount}
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

      {/* Chat Widget */}
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
          socketConnected={socketConnected}
          setNotifCount={setNotifCount}
          messagesEndRef={messagesEndRef}
          markMessagesAsRead={markMessagesAsRead}
          deduplicateChats={deduplicateChats}
          setActiveChats={setActiveChats}
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

// Chat Widget Component
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
  socket,
  socketConnected,
  setNotifCount,
  messagesEndRef,
  markMessagesAsRead,
  deduplicateChats,
  setActiveChats
}) => {
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load message history when customer is selected
  useEffect(() => {
    if (selectedCustomer && sessionUser?.id) {
      const loadMessages = async () => {
        setLoadingMessages(true);
        try {
          const response = await fetch(`/api/chat/messages?customerId=${selectedCustomer.customerId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.messages) {
              setEmployeeMessages(prev => ({
                ...prev,
                [selectedCustomer.customerId]: data.messages || []
              }));
              
              // Mark messages as read
              markMessagesAsRead(selectedCustomer.customerId);
              
              setNotifCount(prev => Math.max(0, prev - 1));
              setActiveChats(prev => 
                deduplicateChats(
                  prev.map(chat => 
                    chat.customerId === selectedCustomer.customerId 
                      ? { ...chat, unread: false }
                      : chat
                  )
                )
              );
            }
          } else {
            console.error('Failed to fetch messages:', response.status);
          }
        } catch (error) {
          console.error('Error loading messages:', error);
        } finally {
          setLoadingMessages(false);
        }
      };
      loadMessages();
    }
  }, [selectedCustomer, sessionUser?.id, setEmployeeMessages, setNotifCount, markMessagesAsRead]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedCustomer || !socket || !socketConnected) {
      console.log('Cannot send message - missing requirements');
      return;
    }
    
    const messageText = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}`;
    
    // Create temporary message for immediate UI update
    const tempMessage = {
      id: tempMessageId,
      text: messageText,
      sender: 'employee',
      employee_id: sessionUser.id,
      customer_id: selectedCustomer.customerId,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    
    // Update UI immediately
    setEmployeeMessages(prev => {
      const customerMessages = prev[selectedCustomer.customerId] || [];
      return {
        ...prev,
        [selectedCustomer.customerId]: [...customerMessages, tempMessage]
      };
    });
    
    setNewMessage("");
    
    try {
      // Save message using your send-message API
      const saveResponse = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustomer.customerId,
          employeeId: sessionUser.id,
          employeeName: sessionUser.name,
          text: messageText
        })
      });
      
      const saveResult = await saveResponse.json();
      
      if (saveResult.success) {
        // Update temporary message with real ID
        setEmployeeMessages(prev => {
          const customerMessages = prev[selectedCustomer.customerId] || [];
          return {
            ...prev,
            [selectedCustomer.customerId]: customerMessages.map(msg => 
              msg.id === tempMessageId 
                ? { 
                    ...msg, 
                    id: saveResult.messageId,
                    status: 'delivered' 
                  }
                : msg
            )
          };
        });
        
        // Send via socket
        socket.emit('employee_message', {
          customerId: selectedCustomer.customerId,
          message: messageText,
          employeeId: sessionUser.id,
          employeeName: sessionUser.name || 'Employee',
          messageId: saveResult.messageId
        });
        
        console.log('Message sent successfully via socket');
        
        // Update active chats with new last message
        setActiveChats(prev => 
          deduplicateChats(
            prev.map(chat => 
              chat.customerId === selectedCustomer.customerId 
                ? {
                    ...chat,
                    lastMessage: {
                      text: messageText,
                      sender: 'employee',
                      timestamp: new Date().toISOString()
                    }
                  }
                : chat
            )
          )
        );
      } else {
        throw new Error(saveResult.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark message as failed
      setEmployeeMessages(prev => {
        const customerMessages = prev[selectedCustomer.customerId] || [];
        return {
          ...prev,
          [selectedCustomer.customerId]: customerMessages.map(msg => 
            msg.id === tempMessageId 
              ? { ...msg, status: 'failed' }
              : msg
          )
        };
      });
    }
  };

  const handleCustomerSelect = (chat) => {
    setSelectedCustomer(chat);
    // Mark as read when selected
    markMessagesAsRead(chat.customerId);
    setNotifCount(prev => Math.max(0, prev - 1));
    setActiveChats(prev => 
      deduplicateChats(
        prev.map(c => 
          c.customerId === chat.customerId 
            ? { ...c, unread: false }
            : c
        )
      )
    );
  };

  const acceptChat = async (customerId) => {
    try {
      const response = await fetch('/api/chat/accept-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
          employeeId: sessionUser.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Chat accepted successfully');
        // Reload chat sessions
        const sessionsResponse = await fetch('/api/chat/sessions');
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          if (sessionsData.success) {
            const deduplicated = deduplicateChats(sessionsData.sessions || []);
            setActiveChats(deduplicated);
          }
        }
      } else {
        console.error('Failed to accept chat:', result.message);
      }
    } catch (error) {
      console.error('Error accepting chat:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
      <div className="bg-purple-600 rounded-t-lg p-3 text-white flex justify-between items-center">
        <h3 className="font-bold text-sm">Support Chat</h3>
        <div className="flex items-center space-x-2">
          {socketConnected ? (
            <span className="w-2 h-2 bg-green-400 rounded-full" title="Connected"></span>
          ) : (
            <span className="w-2 h-2 bg-red-400 rounded-full" title="Disconnected"></span>
          )}
          <button 
            onClick={() => setShowChat(false)}
            className="hover:bg-purple-700 rounded p-1"
          >
            <BiX size={16} />
          </button>
        </div>
      </div>
      
      <div className="h-96 overflow-hidden flex flex-col">
        {/* Chat list */}
        <div className="flex-1 flex">
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-2 border-b bg-gray-50">
              <h4 className="font-semibold text-xs">Active Chats ({activeChats.length})</h4>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeChats.length > 0 ? (
                activeChats.map((chat, index) => (
                  <div
                    key={`${chat.customerId}-${chat.lastMessage?.timestamp || index}-${index}`}
                    className={`p-2 border-b cursor-pointer text-xs ${
                      selectedCustomer?.customerId === chat.customerId 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    } ${chat.unread ? 'bg-yellow-50' : ''}`}
                    onClick={() => handleCustomerSelect(chat)}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-medium truncate">{chat.customerName || `Customer ${chat.customerId}`}</p>
                      {chat.unread && (
                        <span className="w-2 h-2 bg-red-500 rounded-full ml-1 flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-gray-600 truncate text-xs mt-1">
                      {chat.lastMessage?.text || 'No messages'}
                    </p>
                    {chat.lastMessage?.timestamp && (
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(chat.lastMessage.timestamp).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    )}
                    {!chat.employeeId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptChat(chat.customerId);
                        }}
                        className="mt-1 w-full bg-green-500 text-white text-xs py-1 rounded hover:bg-green-600"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-xs">
                  No active chats
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="w-2/3 flex flex-col">
            {selectedCustomer ? (
              <>
                <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
                  <p className="font-semibold text-sm">
                    {selectedCustomer.customerName || `Customer ${selectedCustomer.customerId}`}
                  </p>
                  {!selectedCustomer.employeeId && (
                    <button
                      onClick={() => acceptChat(selectedCustomer.customerId)}
                      className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                    >
                      Accept Chat
                    </button>
                  )}
                </div>
                <div className="flex-1 p-2 overflow-y-auto" style={{ maxHeight: '280px' }}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      Loading messages...
                    </div>
                  ) : employeeMessages[selectedCustomer.customerId] && 
                     employeeMessages[selectedCustomer.customerId].length > 0 ? (
                    <>
                      {employeeMessages[selectedCustomer.customerId].map((msg, idx) => (
                        <div
                          key={msg.id || idx}
                          className={`mb-2 p-2 rounded text-sm ${
                            msg.sender === 'employee' 
                              ? 'bg-purple-100 ml-auto text-right max-w-[80%]' 
                              : 'bg-gray-100 mr-auto max-w-[80%]'
                          }`}
                        >
                          <p className="text-xs text-gray-600 mb-1">
                            {msg.sender === 'employee' ? 'You' : selectedCustomer.customerName || 'Customer'}
                          </p>
                          <p className="text-gray-800 break-words">{msg.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString('en-IN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                            {msg.status === 'sending' && ' • Sending...'}
                            {msg.status === 'failed' && ' • Failed'}
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
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={!socketConnected || !selectedCustomer.employeeId}
                    />
                    <button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || !socketConnected || !selectedCustomer.employeeId}
                      className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
                      title={!socketConnected ? 'Socket not connected' : !selectedCustomer.employeeId ? 'Accept chat first' : 'Send message'}
                    >
                      <BiSend size={14} />
                    </button>
                  </div>
                  {!socketConnected && (
                    <p className="text-red-500 text-xs mt-1">Connection lost</p>
                  )}
                  {!selectedCustomer.employeeId && (
                    <p className="text-yellow-600 text-xs mt-1">Accept chat to send messages</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};