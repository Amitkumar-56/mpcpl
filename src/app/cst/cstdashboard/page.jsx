// src/app/cst/cstdashboard/page.jsx
"use client";

import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import Footer from "@/components/Footer";
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
    BiX
} from "react-icons/bi";
import { io } from "socket.io-client";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notifications, setNotifications] = useState([]);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [dayLimitStatus, setDayLimitStatus] = useState(null);
  const messagesEndRef = useRef(null);

  // Load user data
  useEffect(() => {
    const savedUser = localStorage.getItem("customer");
    if (!savedUser) {
      router.push("/cst/login");
      return;
    }
    
    const parsedUser = JSON.parse(savedUser);
    if (Number(parsedUser.roleid) !== 1) {
      router.push("/cst/login");
      return;
    }
    
    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  // Fetch day limit status
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchDayLimitStatus = async () => {
      try {
        const response = await fetch(`/api/customers/recharge-request?id=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.customer) {
            // Check if customer has day limit and calculate status
            const dayLimit = data.customer.day_limit || 0;
            const paymentDaysPending = data.pending?.payment_days_pending || 0;
            
            if (dayLimit > 0) {
              const isOverdue = paymentDaysPending >= dayLimit;
              const remainingDays = Math.max(0, dayLimit - paymentDaysPending);
              
              setDayLimitStatus({
                dayLimit,
                daysElapsed: paymentDaysPending,
                remainingDays,
                isOverdue,
                totalUnpaid: data.pending?.total_amount || 0
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching day limit status:', error);
      }
    };
    
    fetchDayLimitStatus();
  }, [user?.id]);

  // 🔥 SIMPLIFIED SOCKET CONNECTION
  useEffect(() => {
    if (!user?.id) return;
    setConnectionStatus('connecting');
    const initAndConnect = async () => {
      try {
        await fetch('/api/socket');
      } catch (e) {}
      const newSocket = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
      });
      newSocket.on('connect', () => {
        setConnectionStatus('connected');
        newSocket.emit('customer_join', {
          customerId: user.id.toString(),
          customerName: user.name || 'Customer'
        });
      });
      newSocket.on('disconnect', () => {
        setConnectionStatus('disconnected');
      });
      newSocket.on('connect_error', (err) => {
        console.error('Socket connect_error:', err?.message || err);
        setConnectionStatus('error');
      });
      newSocket.on('reconnect_attempt', () => {
        setConnectionStatus('reconnecting');
      });
      newSocket.on('joined_success', () => {});
      const mergeMessages = (prev, incoming) => {
        const byId = incoming.id;
        const byTemp = incoming.tempId;
        const next = [];
        let replaced = false;
        for (const m of prev) {
          if (byId && m.id === byId) {
            next.push({ ...m, ...incoming });
            replaced = true;
          } else if (byTemp && m.tempId === byTemp) {
            next.push({ ...m, ...incoming });
            replaced = true;
          } else {
            next.push(m);
          }
        }
        if (!replaced) next.push(incoming);
        // Deduplicate by id/tempId
        const seen = new Set();
        return next.filter(m => {
          const key = m.id ? `id:${m.id}` : `temp:${m.tempId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      newSocket.on('new_message', (data) => {
        const { message } = data;
        setMessages(prev => mergeMessages(prev, message));
        if (!showChat) {
          setUnreadCount(prev => prev + 1);
          try {
            if (message && message.sender === 'employee') {
              setNotifications(prev => ([{
                id: message.id,
                text: message.text,
                timestamp: message.timestamp,
                employeeName: message.employee_name
              }, ...prev]).slice(0, 50));
              const prevCount = parseInt(sessionStorage.getItem('cst_notif_count') || '0', 10);
              const nextCount = prevCount + 1;
              sessionStorage.setItem('cst_notif_count', String(nextCount));
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('cst-notif-update', { detail: { count: nextCount } }));
              }
            }
          } catch (e) {}
        }
        scrollToBottom();
      });
      newSocket.on('message_sent', (data) => {
        setMessages(prev => {
          const updated = prev.map(msg =>
            msg.tempId === data.tempId
              ? { ...msg, id: data.messageId, status: data.status, tempId: undefined }
              : msg
          );
          // Remove any duplicate entries that already have same id
          const seen = new Set();
          return updated.filter(m => {
            const key = m.id ? `id:${m.id}` : `temp:${m.tempId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      });
      newSocket.on('employee_typing', (data) => {
        setIsTyping(data.typing);
        setTypingEmployee(data.typing ? data.employeeName : "");
      });
      setSocket(newSocket);
      return () => {
        newSocket.disconnect();
      };
    };
    const cleanup = initAndConnect();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [user?.id]);

  // Load messages when chat opens
  useEffect(() => {
    if (user?.id && showChat) {
      fetchCustomerMessages();
    }
  }, [user, showChat]);

  const fetchCustomerMessages = async () => {
    try {
      if (!user?.id) return;
      
      console.log('📥 Fetching messages...');
      const response = await fetch(`/api/chat/messages?customerId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Ensure uniqueness when loading history
          const loaded = data.messages || [];
          const seen = new Set();
          const unique = loaded.filter(m => {
            const key = m.id ? `id:${m.id}` : `temp:${m.tempId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setMessages(unique);
          scrollToBottom();
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    const messageText = newMessage.trim();
    
    if (!messageText || !user || !socket || !socket.connected) {
      return;
    }

    console.log('🚀 Sending message...');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      tempId,
      text: messageText,
      sender: 'customer',
      customer_id: user.id,
      status: 'sending',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage("");
    scrollToBottom();

    try {
      socket.emit('customer_message', {
        customerId: user.id.toString(),
        text: messageText,
        customerName: user.name || 'Customer',
        tempId: tempId
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  const reconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setTimeout(() => {
        socket.connect();
      }, 1000);
    } else {
      window.location.reload();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    setChatMinimized(false);
    try {
      if (!showChat) {
        sessionStorage.setItem('cst_notif_count', '0');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cst-notif-update', { detail: { count: 0 } }));
        }
      }
    } catch (e) {}
  };

  const minimizeChat = () => {
    setChatMinimized(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '--:--';
    }
  };

  const getStatusIcon = (message) => {
    if (message.sender !== 'customer') return null;
    
    switch (message.status) {
      case 'sending':
        return <BiTime className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <BiCheckDouble className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <BiCheckDouble className="w-3 h-3 text-blue-500" />;
      case 'read':
        return <BiCheckDouble className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <BiTime className="w-3 h-3 text-red-500" />;
      default:
        return <BiTime className="w-3 h-3 text-gray-400" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch(connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': 
      case 'reconnecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusIcon = () => {
    switch(connectionStatus) {
      case 'connected': return <BiWifi className="w-4 h-4" />;
      case 'connecting':
      case 'reconnecting': return <BiWifi className="w-4 h-4 animate-spin" />;
      default: return <BiWifiOff className="w-4 h-4" />;
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
      alert('Please enter a valid recharge amount');
      return;
    }

    try {
      const response = await fetch('/api/customer/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          amount: parseFloat(rechargeAmount)
        })
      });

      if (response.ok) {
        alert(`Recharge of ₹${rechargeAmount} initiated successfully!`);
        setShowRechargeModal(false);
        setRechargeAmount("");
      } else {
        throw new Error('Recharge failed');
      }
    } catch (error) {
      console.error('Recharge error:', error);
      alert('Recharge failed. Please try again.');
    }
  };

  if (!user || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed z-40 h-full transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <CstHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        
        {/* Scrollable Main Content */}
        <main className="pt-16 lg:pt-20 flex-1 p-4 lg:p-6 overflow-auto">
          
          {activePage === "Dashboard" && (
            <div className="space-y-6">
              {/* Day Limit Overdue Warning Banner */}
              {dayLimitStatus && dayLimitStatus.isOverdue && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
                      <div>
                        <p className="font-medium text-red-800">
                          Day Limit Exceeded - Please Recharge
                        </p>
                        <p className="text-sm text-red-600">
                          Your day limit has been exceeded. Days elapsed: {dayLimitStatus.daysElapsed} days (Limit: {dayLimitStatus.dayLimit} days). 
                          Total unpaid amount: ₹{dayLimitStatus.totalUnpaid.toFixed(2)}. Please recharge your account to continue.
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 w-full md:w-auto">
                      <button 
                        onClick={() => setShowRechargeModal(true)}
                        className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors font-semibold text-center"
                      >
                        Recharge Now
                      </button>
                      <button 
                        onClick={redirectToCustomerHistory}
                        className="flex-1 md:flex-none bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg text-sm transition-colors text-center"
                      >
                        View History
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Day Limit Warning (Not Overdue Yet) */}
              {dayLimitStatus && !dayLimitStatus.isOverdue && dayLimitStatus.remainingDays <= 3 && dayLimitStatus.remainingDays > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mr-3"></div>
                      <div>
                        <p className="font-medium text-yellow-800">
                          Day Limit Warning
                        </p>
                        <p className="text-sm text-yellow-600">
                          Only {dayLimitStatus.remainingDays} day(s) remaining before limit expires. Please recharge to avoid service interruption.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowRechargeModal(true)}
                      className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors font-semibold"
                    >
                      Recharge Now
                    </button>
                  </div>
                </div>
              )}

              {/* Connection Status Banner - Only show error, not connecting/reconnecting */}
              {connectionStatus === 'error' && (
                <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()} mr-3`}></div>
                      <div>
                        <p className="font-medium text-red-800">
                          Chat Connection Issue
                        </p>
                        <p className="text-sm text-red-600">
                          Status: {connectionStatus} - Please check your internet connection
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 w-full md:w-auto">
                      <button
                        onClick={reconnectSocket}
                        className="flex-1 md:flex-none justify-center px-3 py-1 rounded-lg text-sm transition-colors flex items-center bg-red-100 hover:bg-red-200 text-red-800"
                      >
                        <BiRefresh className="mr-1" /> 
                        Retry
                      </button>
                      <button 
                        onClick={() => window.location.reload()}
                        className="flex-1 md:flex-none justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-sm transition-colors"
                      >
                        Refresh Page
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Rest of your dashboard UI remains the same */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name || 'Customer'}!</h1>
                    <p className="text-blue-100">
                      {connectionStatus === 'connected' 
                        ? 'Live support is available' 
                        : `Connection: ${connectionStatus}`
                      }
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
                    <button
                      onClick={redirectToMyUsers}
                      className="flex-1 md:flex-none justify-center bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      <BiUser className="w-5 h-5" />
                      <span>My Users</span>
                    </button>
                    
                    <button 
                      onClick={redirectToCustomerHistory}
                      className="flex-1 md:flex-none justify-center bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
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
                      <div className={`p-3 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-100 text-green-600' :
                        connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {getConnectionStatusIcon()}
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-500">Connection</h4>
                        <p className="text-lg font-bold text-gray-900 capitalize">{connectionStatus}</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                      <BiBell className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-500">Notifications</h4>
                      <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                      <BiMessageRounded className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-500">Live Support</h4>
                      <p className="text-lg font-bold text-gray-900">Real-time Chat</p>
                      <button 
                        onClick={toggleChat}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        {showChat ? 'Close Chat' : 'Start Chat'}
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
                      <h4 className="text-sm font-medium text-gray-500">Wallet Balance</h4>
                      <p className="text-lg font-bold text-gray-900">Quick Recharge</p>
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
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Quick Actions</h3>
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
                      <h4 className="font-semibold text-gray-800">Transaction History</h4>
                      <p className="text-sm text-gray-600">View all your transactions</p>
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
                      <h4 className="font-semibold text-gray-800">Recharge Wallet</h4>
                      <p className="text-sm text-gray-600">Add balance to your account</p>
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
                      <h4 className="font-semibold text-gray-800">Live Support</h4>
                      <p className="text-sm text-gray-600">Chat with support team</p>
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
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recharge Your Wallet</h3>
              
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

              <div className="flex flex-col-reverse md:flex-row gap-3">
                <button
                  onClick={handleRecharge}
                  disabled={!rechargeAmount}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  Proceed to Pay ₹{rechargeAmount || '0'}
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
        <div className={`fixed bottom-0 right-0 md:bottom-4 md:right-4 z-50 w-full md:w-96 ${chatMinimized ? "h-14" : "h-[80vh] md:h-auto"} md:max-h-[600px] transition-all duration-300 bg-white rounded-t-xl md:rounded-lg shadow-2xl flex flex-col border border-gray-300`}>
          {/* Chat Header */}
          <div className="bg-blue-600 p-4 flex items-center justify-between text-white rounded-t-lg">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()} mr-3`}></div>
              <div>
                <h2 className="text-lg font-semibold">Customer Support</h2>
                <p className="text-blue-100 text-xs capitalize">{connectionStatus}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={(e) => { e.stopPropagation(); minimizeChat(); }}
                className="hover:bg-blue-700 p-1 rounded transition-colors"
              >
                <BiMinus className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowChat(false); }}
                className="hover:bg-blue-700 p-1 rounded transition-colors"
              >
                <BiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!chatMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50 max-h-80 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages yet. Start a conversation!</p>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id ? `id-${msg.id}` : `temp-${msg.tempId}`} 
                      className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                          msg.sender === 'customer' 
                            ? 'bg-blue-500 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 border rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <div className={`flex items-center justify-end space-x-1 mt-1 ${
                          msg.sender === 'customer' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">{formatTime(msg.timestamp)}</span>
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
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{typingEmployee} is typing...</p>
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
                      connectionStatus === 'connected' 
                        ? "Type your message..." 
                        : "Connecting to chat..."
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={sending || connectionStatus !== 'connected'}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending || connectionStatus !== 'connected'}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <BiSend className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {connectionStatus !== 'connected' && (
                  <p className="text-xs text-red-500 mt-2 text-center">
                    Cannot send messages - {connectionStatus}
                  </p>
                )}
              </div>
            </>
          )}
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

      {/* ChatBox Component - Commented out as we have inline chat */}
      {/* {user && (
        <ChatBox 
          customerId={user.id} 
          customerName={user.name} 
          userRole="customer"
        />
      )} */}
    </div>
  );
}
