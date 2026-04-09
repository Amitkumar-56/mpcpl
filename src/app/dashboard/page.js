// src/app/dashboard/page.js
"use client";

import EmployeeChatDashboard from "@/components/EmployeeChatDashboard";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { useSession } from "@/context/SessionContext";
import { initializeNotifications, showChatNotification } from "@/utils/notifications";
import { forceInitializeAudio, playBeep, speakMessage } from "@/utils/sound";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  BiCalendar,
  BiChart,
  BiCheckCircle,
  BiDollar,
  BiError,
  BiGroup,
  BiHide,
  BiMessageRounded,
  BiPackage,
  BiRefresh,
  BiSend,
  BiShoppingBag,
  BiShow,
  BiUser,
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

// Skeleton Loader Component
function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-white shadow-lg hidden md:block">
        <div className="p-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-8"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 p-4 bg-white shadow-sm">
          <div className="h-10 bg-gray-200 rounded animate-pulse w-1/4"></div>
        </div>
        
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>

          {/* Cards Skeleton */}
          <div className="mb-6">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="mb-6">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Main Dashboard Component
function DashboardContent() {
  const { user: sessionUser, logout, checkAuth, loading } = useSession();
  const router = useRouter();
  const [activePage, setActivePage] = useState("Dashboard");
  const [stockPermissions, setStockPermissions] = useState({ can_view: false, can_edit: false, can_delete: false });
  const [hasStockView, setHasStockView] = useState(false);
  const [stats, setStats] = useState({
    vendorYesterdayOutstanding: 0,
    vendorTodayOutstanding: 0,
    clientYesterdayOutstanding: 0,
    clientTodayOutstanding: 0,
    totalVendors: 0,
    totalClients: 0,
    totalTransactions: 0,
    totalStockHistory: 0,
    collectionEfficiency: 0,
    pendingPayments: 0,
    clearedPayments: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(0);

  // Initialize audio on component mount and user interactions
  useEffect(() => {
    // Force initialize audio on first user interaction
    const handleUserInteraction = () => {
      forceInitializeAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('mousemove', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('scroll', handleUserInteraction);
    document.addEventListener('mousemove', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('mousemove', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (!sessionUser) return;

    initializeNotifications().then((granted) => {
      if (!granted) {
        console.log('🔔 Notifications permission not granted; chat notifications may not appear.');
      }
    });
  }, [sessionUser]);

  // Real-time Chat States
  const [socket, setSocket] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showEmployeeChat, setShowEmployeeChat] = useState(false);
  const [activeChats, setActiveChats] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [employeeMessages, setEmployeeMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [notifCount, setNotifCount] = useState(0);
  const [employeeChatNotifCount, setEmployeeChatNotifCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const ringIntervalRef = useRef(null);

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
      const userRole = sessionUser?.role ? Number(sessionUser.role) : null;

      // For staff/incharge: Don't fetch anything (blank dashboard)
      if (userRole === 1 || userRole === 2) {
        return;
      }

      // For other roles: Fetch full dashboard data
      const result = await apiRequest("/api/dashboard");
      if (result.success) {
        console.log('📊 Dashboard data received:', result.data);
        console.log('🏢 Total stations:', result.data.totalStations);
        console.log('📦 Total stocks:', result.data.totalStocks);
        console.log('📋 Total stock requests:', result.data.totalStockRequests);
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
  }, [apiRequest, sessionUser]);

  // Quick refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!sessionUser) return;
    const checkPermissions = async () => {
      if (Number(sessionUser.role) === 5) {
        setHasStockView(true);
        setStockPermissions({ can_view: true, can_edit: true, can_delete: true });
        return;
      }
      if (sessionUser.permissions && sessionUser.permissions['Stock']) {
        const p = sessionUser.permissions['Stock'];
        setStockPermissions({ can_view: !!p.can_view, can_edit: !!p.can_edit, can_delete: !!p.can_delete });
        setHasStockView(!!p.can_view);
        return;
      }
      const cacheKey = `perms_${sessionUser.id}_Stock`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const c = JSON.parse(cached);
        setStockPermissions(c);
        setHasStockView(!!c.can_view);
        return;
      }
      try {
        const moduleName = 'Stock';
        const [viewRes, editRes, deleteRes] = await Promise.all([
          fetch(`/api/check-permissions?employee_id=${sessionUser.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
          fetch(`/api/check-permissions?employee_id=${sessionUser.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
          fetch(`/api/check-permissions?employee_id=${sessionUser.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`)
        ]);
        const [viewData, editData, deleteData] = await Promise.all([viewRes.json(), editRes.json(), deleteRes.json()]);
        const perms = { can_view: viewData.allowed, can_edit: editData.allowed, can_delete: deleteData.allowed };
        sessionStorage.setItem(cacheKey, JSON.stringify(perms));
        sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        setStockPermissions(perms);
        setHasStockView(!!perms.can_view);
      } catch {
        setHasStockView(false);
      }
    };
    checkPermissions();
  }, [sessionUser]);

  // Navigation handlers
  const handleViewStockHistory = () => {
    router.push('/stock-history');
  };

  const handleViewAllStocks = () => {
    router.push('/all-stock');
  };

  const handleViewStockRequest = () => {
    router.push('/stock-requests');
  };

  // Load active chat sessions
  const loadActiveChatSessions = useCallback(async () => {
    if (!sessionUser?.id) return;
    
    try {
      const response = await fetch(`/api/chat/sessions?employeeRole=${sessionUser.role}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sessions) {
          const deduplicated = deduplicateChats(data.sessions || []);
          setActiveChats(deduplicated);
          console.log('Dashboard: Loaded active chat sessions:', deduplicated.length);
        }
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  }, [deduplicateChats, sessionUser?.role]);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [employeeMessages, selectedCustomer]);

  // Socket Connection Setup
  useEffect(() => {
    if (!sessionUser?.id) {
      console.log('Dashboard: No session user, skipping socket setup');
      return;
    }

    console.log('Dashboard: Setting up socket connection for employee:', sessionUser.id);

    let socketInstance;

    const initializeSocket = async () => {
      try {
        console.log('Dashboard: Initializing socket connection...');
        
        // First, initialize the socket server
        const socketInitResponse = await fetch('/api/socket');
        console.log('Dashboard: Socket init response:', socketInitResponse.status);
        
        if (!socketInitResponse.ok) {
          throw new Error('Socket initialization failed');
        }

        console.log('Dashboard: Creating socket client...');
        socketInstance = io({
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
          
          // Driver-specific debugging
          if (sessionUser?.role === 6 || (sessionUser?.name && sessionUser.name.toLowerCase().includes('driver'))) {
            console.log('🚛 Driver joined chat system:', sessionUser.name, 'Role:', sessionUser.role);
          }
          
          loadActiveChatSessions();
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Dashboard: Socket connection error:', error);
          console.error('Dashboard: Error details:', error.message, error.description);
          setSocketConnected(false);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Dashboard: Socket disconnected:', reason);
          setSocketConnected(false);
        });

        // Handle new messages from customers
        socketInstance.on('customer_message', (data) => {
          console.log('Dashboard: Received customer message:', data);

          // Only increment notification if chat is not currently selected
          const isCurrentChat = selectedCustomer && selectedCustomer.customerId === data.customerId;
          
          if (!isCurrentChat) {
            setNotifCount(prev => prev + 1);
          }

          // Play notification sound and voice
          if (!isCurrentChat) {
            playBeep();
            speakMessage("नया मैसेज आया है", "hi-IN");
          }

          // Set up ringing for unread messages
          if (!showChat && !ringIntervalRef.current) {
            ringIntervalRef.current = setInterval(() => {
              playBeep();
              speakMessage("नया मैसेज आया है", "hi-IN");
            }, 4000); // Every 4 seconds for voice
          }

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
              unread: !isCurrentChat
            };

            if (existingChatIndex >= 0) {
              const updatedChats = [...prev];
              updatedChats[existingChatIndex] = newChatItem;
              return deduplicateChats(updatedChats);
            } else {
              return deduplicateChats([newChatItem, ...prev]);
            }
          });

          // Update messages for current chat
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

            markMessagesAsRead(data.customerId);
            setNotifCount(prev => Math.max(0, prev - 1));
          }
        });

        socketInstance.on('customer_message_notification', (data) => {
          console.log('Dashboard: Received customer_message_notification:', data);
          
          // Driver-specific debugging
          if (sessionUser?.role === 6 || (sessionUser?.name && sessionUser.name.toLowerCase().includes('driver'))) {
            console.log('🚛 Driver received customer message:', data.customerName, 'from', data.customerId);
          }
          
          const isCurrentChat = selectedCustomer && selectedCustomer.customerId === data.customerId;
          if (!isCurrentChat) {
            setNotifCount(prev => prev + 1);
          }
          setActiveChats(prev => {
            const existingChatIndex = prev.findIndex(chat => chat.customerId === data.customerId);
            const newChatItem = {
              customerId: data.customerId,
              customerName: data.customerName,
              lastMessage: {
                text: data.text,
                sender: 'customer',
                timestamp: data.timestamp
              },
              unreadCount: (prev[existingChatIndex]?.unreadCount || 0) + 1
            };
            if (existingChatIndex !== -1) {
              const updated = [...prev];
              updated[existingChatIndex] = newChatItem;
              return updated;
            } else {
              return [newChatItem, ...prev];
            }
          });

          if (!isCurrentChat) {
            showChatNotification(
              data.customerName || 'Customer',
              data.message || data.text || 'You have a new chat message'
            );
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
          
          // Update active chats with employee info
          setActiveChats(prev => 
            deduplicateChats(
              prev.map(chat => 
                chat.customerId === data.customerId 
                  ? {
                      ...chat,
                      employeeId: {
                        id: data.employeeId,
                        name: data.employeeName
                      }
                    }
                  : chat
              )
            )
          );
          
          // Update selected customer if it's the current one
          if (selectedCustomer?.customerId === data.customerId) {
            setSelectedCustomer(prev => prev ? {
              ...prev,
              employeeId: {
                id: data.employeeId,
                name: data.employeeName
              }
            } : null);
          }
        });

        // Handle chat accept success
        socketInstance.on('chat_accept_success', (data) => {
          console.log('Dashboard: Chat accept success:', data);
          
          // Update selected customer with employee info
          setSelectedCustomer(prev => prev && prev.customerId === data.customerId 
            ? {...prev, employeeId: {
              id: data.employeeId,
              name: sessionUser.name // Use current user's name
            }} 
            : prev
          );
          
          // Update active chats list
          setActiveChats(prev => 
            deduplicateChats(
              prev.map(chat => 
                chat.customerId === data.customerId 
                  ? {
                      ...chat,
                      employeeId: {
                        id: data.employeeId,
                        name: sessionUser.name
                      }
                    }
                  : chat
              )
            )
          );
        });

        // Handle chat accept failure
        socketInstance.on('chat_accept_failed', (data) => {
          console.log('Dashboard: Chat accept failed:', data);
          // Remove chat from active list since it's taken
          setActiveChats(prev => prev.filter(chat => chat.customerId !== data.customerId));
          
          // If this was the selected chat, deselect it
          if (selectedCustomer?.customerId === data.customerId) {
            setSelectedCustomer(null);
          }
          
          // Show notification to user
          alert('Chat already taken by another employee');
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
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [sessionUser, selectedCustomer, loadActiveChatSessions, markMessagesAsRead, deduplicateChats]);

  // Load dashboard data
  useEffect(() => {
    // Wait for loading to finish before making decisions
    if (loading) return;

    if (!sessionUser) {
      return;
    }

    // Load data immediately - no loading state
    fetchDashboardData();
  }, [sessionUser, router, fetchDashboardData, loading]);

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

  // Show loading state while session is being checked
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Fixed Header on Mobile */}
        <div className="flex-shrink-0">
          <Header user={sessionUser} />
        </div>

        {/* Chat Button - Below Header */}
        <div className="fixed top-20 right-4 z-50">
          <button
            onClick={() => setShowChat(!showChat)}
            className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 transition-all relative"
            title="Customer Chat"
          >
            <BiMessageRounded className="w-6 h-6" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
        </div>

        {/* Employee Chat Button - Bottom Right */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => {
              console.log('Employee chat button clicked!');
              const willOpen = !showEmployeeChat;
              setShowEmployeeChat(willOpen);
              if (willOpen) {
                setEmployeeChatNotifCount(0);
              }
            }}
            className="bg-green-500 text-white rounded-full p-3 shadow-lg hover:bg-green-600 transition-all relative"
            title="Employee Chat"
            style={{ width: '3rem', height: '3rem' }}
          >
            <BiGroup className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
            {employeeChatNotifCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[1.35rem] h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1.5">
                {employeeChatNotifCount > 9 ? '9+' : employeeChatNotifCount}
              </span>
            )}
          </button>
        </div>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Error Alert (Hidden for Staff/Incharge) */}
          {error && !(sessionUser?.role === 1 || sessionUser?.role === 2) && (
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
                  {((sessionUser?.role === 1 || sessionUser?.role === 2))
                    ? "Chat and Support Dashboard"
                    : (sessionUser?.role === 6 || (sessionUser?.name && sessionUser.name.toLowerCase().includes('driver')) || (sessionUser?.role && sessionUser.role.toString().toLowerCase().includes('driver')))
                    ? "Driver Dashboard - Chat Support Available"
                    : "Real-time outstanding balances overview"}
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
                  onClick={() => speakMessage("नया मैसेज आया है", "hi-IN")}
                  className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
                  title="Test Voice"
                >
                  🗣️
                </button>
                <button
                  onClick={playBeep}
                  className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
                  title="Test Sound"
                >
                  🔊
                </button>
                
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
              </div>
            </div>
          </div>

          {/* Dashboard Content - Available for All Employees */}
          {(sessionUser?.role === 1 || sessionUser?.role === 2) ? (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Staff Dashboard</h2>
              <p className="text-gray-600">Access your modules and chat support from here.</p>
            </div>
          ) : (sessionUser?.role === 6 || (sessionUser?.name && sessionUser.name.toLowerCase().includes('driver')) || (sessionUser?.role && sessionUser.role.toString().toLowerCase().includes('driver'))) ? (
            /* Driver Dashboard Modules */
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Driver Modules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <a href="/driver-dashboard" className="block">
                  <InfoCard
                    title="Driver Dashboard"
                    value="Access"
                    icon={<BiUser />}
                    color="blue"
                  />
                </a>
                <a href="/driver-history" className="block">
                  <InfoCard
                    title="My History"
                    value="View"
                    icon={<BiCalendar />}
                    color="green"
                  />
                </a>
                {/* Chat Support Module for Drivers */}
                <a href="/driver-chat" className="block">
                  <InfoCard
                    title="Driver Chat"
                    value="Open"
                    icon={<BiMessageRounded />}
                    color="purple"
                  />
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Outstanding Group */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Outstandings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <StatCard
                    title="Til Yesterday Outstanding"
                    amount={stats.clientYesterdayOutstanding}
                    icon={<BiDollar />}
                    gradient="from-blue-500 to-blue-600"
                    showDetails={false}
                  />

                  <StatCard
                    title="Today Outstanding"
                    amount={stats.clientTodayOutstanding}
                    icon={<BiChart />}
                    gradient="from-green-500 to-green-600"
                    showDetails={false}
                  />
                </div>
              </div>

              {/* Stock Group */}
              {hasStockView && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Stock Management</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a href="/stock-history" className="block">
                      <InfoCard
                        title="Stock History"
                        value={stats.totalStockHistory || 0}
                        icon={<BiCalendar />}
                        color="purple"
                      />
                    </a>
                    <a href="/all-stock" className="block">
                      <InfoCard
                        title="All Stocks"
                        value={stats.totalStocks || 0}
                        icon={<BiShoppingBag />}
                        color="blue"
                      />
                    </a>
                    <a href="/stock-requests" className="block">
                      <InfoCard
                        title="Stock Requests"
                        value={stats.totalStockRequests || 0}
                        icon={<BiPackage />}
                        color="yellow"
                      />
                    </a>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Stats</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <a href="/customers" className="block">
                    <InfoCard
                      title="Total Clients"
                      value={stats.totalClients}
                      icon={<BiGroup />}
                      color="purple"
                    />
                  </a>
                  {(sessionUser?.role === 5 || sessionUser?.role === 4 || sessionUser?.role === 3 || sessionUser?.role === 7) && (
                    <a href="/old-filling-requests" className="block">
                      <InfoCard
                        title="Old Requests"
                        value={stats.totalOldRequests || 0}
                        icon={<BiCalendar />}
                        color="yellow"
                      />
                    </a>
                  )}
                  {/* Staff can view their own attendance and leave */}
                  {sessionUser?.role === 1 && (
                    <>
                      <a href="/attendance/monthly-summary" className="block">
                        <InfoCard
                          title="My Attendance"
                          value="View"
                          icon={<BiCalendar />}
                          color="blue"
                        />
                      </a>
                      <a href="/leave" className="block">
                        <InfoCard
                          title="My Leave"
                          value="Apply"
                          icon={<BiCalendar />}
                          color="purple"
                        />
                      </a>
                    </>
                  )}
                </div>
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
            </>
          )}
        </main>

        <Footer />
        <PWAInstallBanner />
      </div>

      {/* Chat Widget - Available for All Employees */}
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

      {/* Employee Chat Widget */}
      {showEmployeeChat && (
        <EmployeeChatDashboard
          showChat={showEmployeeChat}
          setShowChat={setShowEmployeeChat}
          setEmployeeChatNotifCount={setEmployeeChatNotifCount}
        />
      )}
    </div>
  );
}

// Optimized Stat Card Component
const StatCard = ({ title, amount, icon, gradient, change, showDetails }) => (
  <div className={`bg-gradient-to-br ${gradient} text-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm opacity-90">{title}</p>
        <p className="text-2xl font-bold mt-2">{formatIndianRupees(amount)}</p>
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
    purple: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
    green: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]} shadow-sm transition-colors cursor-pointer`}>
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
  }, [selectedCustomer, sessionUser?.id, setEmployeeMessages, setNotifCount, markMessagesAsRead, deduplicateChats, setActiveChats]);

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
        
        // Update selected customer with employee info immediately
        const employeeInfo = {
          id: sessionUser.id,
          name: sessionUser.name
        };
        
        setSelectedCustomer(prev => prev ? {...prev, employeeId: employeeInfo} : null);
        
        // Update active chats list immediately
        setActiveChats(prev => 
          deduplicateChats(
            prev.map(chat => 
              chat.customerId === customerId 
                ? {...chat, employeeId: employeeInfo}
                : chat
            )
          )
        );
        
        // Also reload from server to ensure consistency
        const sessionsResponse = await fetch('/api/chat/sessions');
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          if (sessionsData.success) {
            const deduplicated = deduplicateChats(sessionsData.sessions || []);
            setActiveChats(deduplicated);
          }
        }
      } else {
        if (result.alreadyAssigned) {
          console.log('Chat already taken by another employee');
          // Remove chat from active list since it's taken
          setActiveChats(prev => prev.filter(chat => chat.customerId !== customerId));
          
          // If this was selected chat, deselect it
          if (selectedCustomer?.customerId === customerId) {
            setSelectedCustomer(null);
          }
        } else {
          console.error('Failed to accept chat:', result.message);
        }
      }
    } catch (error) {
      console.error('Error accepting chat:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200">
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

      <div className="h-[400px] sm:h-[450px] overflow-hidden flex flex-col border border-gray-200 rounded-lg shadow-lg">
        {/* Chat list */}
        <div className="flex-1 flex flex-col sm:flex-row">
          <div className="w-full sm:w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-2 border-b bg-gray-50 flex-shrink-0">
              <h4 className="font-semibold text-xs">Active Chats ({activeChats.length})</h4>
            </div>
            <div className="flex-1 overflow-y-auto bg-white" style={{ maxHeight: '350px', minHeight: '150px' }}>
              {activeChats.length > 0 ? (
                activeChats.map((chat, index) => (
                  <div
                    key={`${chat.customerId}-${chat.lastMessage?.timestamp || index}-${index}`}
                    className={`p-3 border-b cursor-pointer text-xs hover:bg-gray-50 transition-colors ${
                      selectedCustomer?.customerId === chat.customerId
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    } ${chat.unread ? 'bg-yellow-50' : ''}`}
                    onClick={() => handleCustomerSelect(chat)}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-xs flex-1 pr-2 break-words font-semibold">
                        {chat.customerName || `Customer ${chat.customerId}`}
                      </p>
                      {chat.unread && (
                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse"></span>
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
                    {chat.employeeId ? (
                      <div className="mt-2 text-xs">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          👤 {chat.employeeId?.name || 'Employee'}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptChat(chat.customerId);
                        }}
                        className="mt-2 w-full bg-green-500 text-white text-xs py-2 rounded hover:bg-green-600 transition-colors"
                      >
                        Accept Chat
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs">
                  <div className="mb-2">📭</div>
                  <div>No active chats</div>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="w-full sm:w-2/3 flex flex-col">
            {selectedCustomer ? (
              <>
                <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">
                      {selectedCustomer.customerName || `Customer ${selectedCustomer.customerId}`}
                    </p>
                    {selectedCustomer.employeeId && (
                      <p className="text-xs text-blue-600 mt-1">
                        👤 {selectedCustomer.employeeId?.name || 'Employee'} is handling this chat
                      </p>
                    )}
                  </div>
                  {!selectedCustomer.employeeId && (
                    <button
                      onClick={() => acceptChat(selectedCustomer.customerId)}
                      className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                    >
                      Accept Chat
                    </button>
                  )}
                </div>
                <div className="flex-1 p-2 overflow-y-auto bg-white" style={{ maxHeight: '300px', minHeight: '200px' }}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      Loading messages...
                    </div>
                  ) : employeeMessages[selectedCustomer.customerId] &&
                    employeeMessages[selectedCustomer.customerId].length > 0 ? (
                    <div className="space-y-2 flex flex-col">
                      {employeeMessages[selectedCustomer.customerId]
                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                        .map((msg, idx) => (
                        <div
                          key={msg.id || idx}
                          className={`flex ${msg.sender === 'employee' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 ${
                              msg.sender === 'employee'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-800'
                            } ${msg.status === 'failed' ? 'opacity-50' : ''}`}
                          >
                            <p className="text-xs font-medium mb-1">
                              {msg.sender === 'employee' ? (msg.employee_name || sessionUser?.name || 'You') : (selectedCustomer.customerName || 'Customer')}
                            </p>
                            <p className="text-sm break-words">{msg.text}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender === 'employee'
                                ? 'text-purple-200'
                                : 'text-gray-500'
                            }`}>
                              {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {msg.status === 'sending' && ' • Sending...'}
                              {msg.status === 'failed' && ' • Failed'}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm py-8">
                      <div className="text-center">
                        <div className="mb-2">💬</div>
                        <div>No messages yet. Start the conversation!</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2 border-t bg-gray-50 flex-shrink-0">
                  <div className="flex space-x-2 items-center">
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
                      className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-0"
                      disabled={!socketConnected || !selectedCustomer.employeeId}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || !socketConnected || !selectedCustomer.employeeId}
                      className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 min-w-[50px] gap-2"
                      title={!socketConnected ? 'Socket not connected' : !selectedCustomer.employeeId ? 'Accept chat first' : 'Send message'}
                    >
                      <BiSend size={18} className="sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline text-sm">Send</span>
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

// Export wrapped component with Suspense
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}