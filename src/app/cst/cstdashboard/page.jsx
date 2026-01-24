// src/app/cst/cstdashboard/page.jsx
"use client";

import ChatBox from "@/components/ChatBox";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import Footer from "@/components/Footer";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BiCheckDouble,
  BiMessageRounded,
  BiMinus,
  BiReceipt,
  BiSend,
  BiTime,
  BiUser,
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
  const [amtLimitStatus, setAmtLimitStatus] = useState(null);
  const [outstandingToday, setOutstandingToday] = useState(0);
  const [outstandingYesterday, setOutstandingYesterday] = useState(0);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const messagesEndRef = useRef(null);

  // Load user data
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("customer");
      console.log("Dashboard: Checking user", savedUser);
      
      if (!savedUser) {
        console.log("Dashboard: No user found, redirecting to login");
        router.push("/cst/login");
        return;
      }
      
      const parsedUser = JSON.parse(savedUser);
      console.log("Dashboard: Parsed user", parsedUser);
      
      // Allow roleid 1 (Main Customer) and 2 (Sub-User)
      const roleId = Number(parsedUser.roleid);
      console.log("Dashboard: Validating role", roleId);
      
      if (roleId !== 1 && roleId !== 2) {
        console.error("Dashboard: Invalid role detected", parsedUser.roleid);
        alert(`Access Error: Invalid User Role (${parsedUser.roleid}). Please login again.`);
        router.push("/cst/login");
        return;
      }
      
      setUser(parsedUser);
      setLoading(false);
    } catch (err) {
      console.error("Dashboard: Error parsing user", err);
      alert("Error reading user data. Please login again.");
      router.push("/cst/login");
    }
  }, [router]);

  // Fetch day limit status
  useEffect(() => {
    if (!user?.id) return;
    
    const customerId = user.com_id || user.id;
    
    const fetchDayLimitStatus = async () => {
      try {
        const response = await fetch(`/api/customers/recharge-request?id=${customerId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.customer) {
            const dayLimit = data.customer.day_limit || 0;
            const amtLimit = data.customer.amtlimit || 0;
            const paymentDaysPending = data.pending?.payment_days_pending || 0;
            const totalUnpaid = data.pending?.total_amount || 0;
            
            if (dayLimit > 0) {
              const isOverdue = paymentDaysPending >= dayLimit;
              const remainingDays = Math.max(0, dayLimit - paymentDaysPending);
              
              setDayLimitStatus({
                dayLimit,
                daysElapsed: paymentDaysPending,
                remainingDays,
                isOverdue,
                totalUnpaid
              });
            }

            if (amtLimit > 0) {
              const isAmtOverdue = totalUnpaid >= amtLimit;
              const remainingAmt = Math.max(0, amtLimit - totalUnpaid);
              
              setAmtLimitStatus({
                amtLimit,
                totalUnpaid,
                remainingAmt,
                isOverdue: isAmtOverdue
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

  // Fetch outstanding
  useEffect(() => {
    if (!user?.id) return;
    const fetchOutstanding = async () => {
      try {
        const response = await fetch(`/api/cst/customer-history?cl_id=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.outstandings) {
            setOutstandingToday(data.outstandings.today || 0);
            setOutstandingYesterday(data.outstandings.yesterday || 0);
            setOutstandingTotal(data.outstandings.total || (data.outstandings.yesterday + data.outstandings.today) || 0);
          }
        }
      } catch (e) {
        console.error('Error fetching outstanding:', e);
      }
    };
    fetchOutstanding();
  }, [user?.id]);

  // Socket connection
  useEffect(() => {
    if (!user?.id) return;
    
    setConnectionStatus('connecting');
    let newSocket = null;
    
    const initAndConnect = async () => {
      try {
        await fetch('/api/socket');
        newSocket = io({
          path: '/api/socket/io',
          addTrailingSlash: false,
        });

        newSocket.on('connect', () => {
          setConnectionStatus('connected');
          
          // Use com_id for sub-users so they join the main customer's room
          const roomId = user.com_id || user.id;
          
          console.log('Socket connected, joining room:', roomId);
          newSocket.emit('customer_join', {
            customerId: roomId.toString(),
            customerName: user.name || 'Customer'
          });
        });

        newSocket.on('disconnect', () => {
          setConnectionStatus('disconnected');
        });
        
        newSocket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setConnectionStatus('error');
        });
        
        newSocket.on('reconnect_attempt', () => {
          setConnectionStatus('reconnecting');
        });
        
        newSocket.on('reconnect', () => {
          setConnectionStatus('connected');
          
          const roomId = user.com_id || user.id;
          newSocket.emit('customer_join', {
            customerId: roomId.toString(),
            customerName: user.name || 'Customer'
          });
        });
        
        newSocket.on('joined_success', (data) => {
          console.log('Joined customer room:', data);
        });
        
        // Message handlers
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
      } catch (error) {
        console.error('Error initializing socket:', error);
        setConnectionStatus('error');
      }
    };
    
    initAndConnect();
    
    return () => {
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
        setSocket(null);
      }
    };
  }, [user?.id, user?.name]);

  // Load messages when chat opens
  useEffect(() => {
    if (user?.id && showChat) {
      fetchCustomerMessages();
    }
  }, [user, showChat]);

  const fetchCustomerMessages = async () => {
    try {
      if (!user?.id) return;
      
      const chatCustomerId = user.com_id || user.id;
      const response = await fetch(`/api/chat/messages?customerId=${chatCustomerId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
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
      case 'reconnecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusIcon = () => {
    switch(connectionStatus) {
      case 'connected': return <BiWifi className="w-4 h-4" />;
      case 'connecting':
      case 'reconnecting': return <BiWifi className="w-4 h-4" />;
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar user={user} activePage={activePage} setActivePage={setActivePage} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <CstHeader user={user} />
        
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          
          {activePage === "Dashboard" && (
            <div className="space-y-6">
              {/* Alerts Section */}
              <div className="space-y-4">
                {/* Day Limit Overdue */}
                {dayLimitStatus && dayLimitStatus.isOverdue && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-3 mt-1"></div>
                        <div>
                          <p className="font-medium text-red-800">Day Limit Exceeded</p>
                          <p className="text-sm text-red-600">
                            Days elapsed: {dayLimitStatus.daysElapsed}/{dayLimitStatus.dayLimit}. 
                            Due: ₹{dayLimitStatus.totalUnpaid.toFixed(2)}
                          </p>
                        </div>
                      </div>
                     
                    </div>
                  </div>
                )}

                {/* Connection Error */}
                {connectionStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
                        <div>
                          <p className="text-sm text-red-800">Chat Connection Issue</p>
                        </div>
                      </div>
                      <button
                        onClick={reconnectSocket}
                        className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Header Card */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="text-gray-600">
                      {connectionStatus === 'connected' 
                        ? 'Live support is available' 
                        : `Connection: ${connectionStatus}`
                      }
                    </p>
                  </div>
                 
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <div className={`p-2 rounded ${connectionStatus === 'connected' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {getConnectionStatusIcon()}
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm text-gray-500">Connection</h4>
                      <p className="font-medium capitalize">{connectionStatus}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded bg-green-100">
                      <BiMessageRounded className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm text-gray-500">Live Support</h4>
                      <button 
                        onClick={toggleChat}
                        className="text-sm text-green-600 hover:text-green-700"
                      >
                        {showChat ? 'Close Chat' : 'Start Chat'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button 
                    onClick={redirectToMyUsers}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-3"
                  >
                    <div className="p-2 bg-blue-100 text-blue-600 rounded">
                      <BiUser className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-medium text-gray-800">My Users</h4>
                      <p className="text-sm text-gray-600">Manage users</p>
                    </div>
                  </button>

                  <button 
                    onClick={redirectToCustomerHistory}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-3"
                  >
                    <div className="p-2 bg-green-100 text-green-600 rounded">
                      <BiReceipt className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-medium text-gray-800">History</h4>
                      <p className="text-sm text-gray-600">View transactions</p>
                    </div>
                  </button>

                 
                 
                </div>
              </div>

              {/* Outstanding Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Outstanding Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Yesterday</div>
                    <div className="text-xl font-bold text-gray-900">₹{outstandingYesterday.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Today</div>
                    <div className="text-xl font-bold text-gray-900">₹{outstandingToday.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Total Outstanding</div>
                    <div className="text-xl font-bold text-purple-900">₹{outstandingTotal.toLocaleString()}</div>
                  </div>
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
              <h3 className="text-lg font-bold text-gray-800 mb-4">Recharge Wallet</h3>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  min="1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {[100, 500, 1000, 2000, 5000, 10000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(amount.toString())}
                    className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRecharge}
                  disabled={!rechargeAmount}
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  Pay ₹{rechargeAmount || '0'}
                </button>
                <button
                  onClick={() => setShowRechargeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
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
        <div className={`fixed bottom-0 right-0 md:bottom-4 md:right-4 z-50 w-full md:w-80 ${chatMinimized ? "h-12" : "h-[60vh] md:h-96"} md:max-h-96 transition-all bg-white rounded-t-lg md:rounded-lg shadow-lg flex flex-col border`}>
          {/* Chat Header */}
          <div className="bg-blue-600 p-3 flex items-center justify-between text-white">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()} mr-2`}></div>
              <h2 className="font-medium">Support</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); minimizeChat(); }}
                className="hover:bg-blue-700 p-1 rounded"
              >
                <BiMinus className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowChat(false); }}
                className="hover:bg-blue-700 p-1 rounded"
              >
                <BiX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!chatMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 p-3 overflow-y-auto bg-gray-50 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id ? `id-${msg.id}` : `temp-${msg.tempId}`} 
                      className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] px-3 py-2 rounded-lg ${
                          msg.sender === 'customer' 
                            ? 'bg-blue-100 text-gray-800' 
                            : 'bg-white text-gray-800 border'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-xs text-gray-500">
                          <span>{formatTime(msg.timestamp)}</span>
                          {getStatusIcon(msg)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border rounded-lg px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border rounded"
                    placeholder={
                      connectionStatus === 'connected' 
                        ? "Type message..." 
                        : "Connecting..."
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={sending || connectionStatus !== 'connected'}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending || connectionStatus !== 'connected'}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <BiSend className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat Toggle Button */}
      {!showChat && (
        <button 
          onClick={toggleChat}
          className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-3 shadow z-40"
        >
          <BiMessageRounded className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ChatBox Component */}
      {user && (
        <ChatBox 
          customerId={user.id} 
          customerName={user.name} 
          userRole="customer"
        />
      )}
      <PWAInstallBanner />
    </div>
  );
}