'use client';

import { useEffect, useState, useRef } from 'react';
import { BiMessageRounded, BiSend, BiX, BiUser, BiChevronDown, BiSearch } from 'react-icons/bi';
import { io } from 'socket.io-client';

export default function EmployeeChatBox({ employeeId, employeeName }) {
  const [showChat, setShowChat] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [chatSessions, setChatSessions] = useState([]); // Customers with chat history
  const [messages, setMessages] = useState({}); // Messages per customer: { customerId: [messages] }
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({}); // Unread count per customer
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  // Create notification sound programmatically
  useEffect(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    };

    // Store playBeep function for use
    if (audioRef.current) {
      audioRef.current.playBeep = playBeep;
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Employee chat socket connected');
      newSocket.emit('join_employee_room', { employeeId });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Employee chat socket disconnected');
    });

    // Listen for new customer messages
    newSocket.on('customer_message_notification', (data) => {
      console.log('📨 New customer message:', data);
      
      // Play notification sound
      if (audioRef.current?.playBeep) {
        audioRef.current.playBeep();
      } else {
        // Fallback: create simple beep
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (err) {
          console.log('Audio play failed:', err);
        }
      }

      const customerId = data.customerId;

      // Update unread count for this customer
      setUnreadCounts(prev => ({
        ...prev,
        [customerId]: (prev[customerId] || 0) + 1
      }));

      // Update total unread count
      setTotalUnreadCount(prev => prev + 1);

      // Add message to this customer's thread (with deduplication)
      setMessages(prev => {
        const customerMessages = prev[customerId] || [];
        
        // Check for duplicate by ID or tempId
        const existsById = customerMessages.some(m => m.id === data.messageId);
        const existsByTempId = customerMessages.some(m => 
          m.tempId && m.tempId === data.tempId
        );
        
        if (existsById || existsByTempId) {
          return prev; // Don't add duplicate
        }
        
        return {
          ...prev,
          [customerId]: [...customerMessages, {
            id: data.messageId,
            text: data.text,
            sender: 'customer',
            customer_id: customerId,
            timestamp: data.timestamp,
            status: data.status
          }]
        };
      });

      // If this customer is selected, scroll to bottom
      if (selectedCustomer?.id === customerId) {
        scrollToBottom();
      }

      // Update chat sessions list
      updateChatSessions();
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [employeeId, showChat, selectedCustomer]);

  // Function to update chat sessions
  const updateChatSessions = async () => {
    try {
      const response = await fetch('/api/chat/sessions');
      const data = await response.json();
      if (data.success && data.sessions) {
        setChatSessions(data.sessions);
        
        // Update unread counts
        const unreadMap = {};
        data.sessions.forEach(session => {
          const customerId = session.customerId || session.customer_id;
          const unreadCount = session.unread_count || 0;
          if (unreadCount > 0) {
            unreadMap[customerId] = unreadCount;
          }
        });
        setUnreadCounts(unreadMap);
        
        // Calculate total unread
        const total = Object.values(unreadMap).reduce((sum, count) => sum + count, 0);
        setTotalUnreadCount(total);
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    }
  };

  // Fetch customers list and chat sessions
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all customers
        const customersResponse = await fetch('/api/customers');
        const customersData = await customersResponse.json();
        if (Array.isArray(customersData)) {
          setCustomers(customersData);
        }

        // Fetch chat sessions (customers with chat history)
        await updateChatSessions();
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    
    // Refresh chat sessions every 30 seconds
    const interval = setInterval(updateChatSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages when customer is selected
  useEffect(() => {
    if (selectedCustomer && employeeId) {
      fetchMessages();
      markAsRead();
    }
  }, [selectedCustomer, employeeId]);

  // Reset unread count for selected customer when chat opens
  useEffect(() => {
    if (showChat && selectedCustomer) {
      // Reset unread count for this customer
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[selectedCustomer.id];
        
        // Recalculate total
        const total = Object.values(newCounts).reduce((sum, count) => sum + count, 0);
        setTotalUnreadCount(total);
        
        return newCounts;
      });
      
      markAsRead();
    }
  }, [showChat, selectedCustomer]);

  const fetchMessages = async () => {
    if (!selectedCustomer || !employeeId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/chat/messages?customerId=${selectedCustomer.id}&employeeId=${employeeId}`);
      const data = await response.json();
      if (data.success) {
        const fetchedMessages = data.messages || [];
        
        // Remove duplicates based on message ID
        const seenIds = new Set();
        const uniqueMessages = fetchedMessages.filter(msg => {
          if (!msg.id) return true; // Keep messages without ID (temp messages)
          if (seenIds.has(msg.id)) {
            return false; // Skip duplicate
          }
          seenIds.add(msg.id);
          return true;
        });

        setMessages(prev => {
          const existingMessages = prev[selectedCustomer.id] || [];
          
          // Merge and deduplicate with existing messages
          const allMessages = [...existingMessages, ...uniqueMessages];
          const mergedSeenIds = new Set();
          const mergedUnique = allMessages.filter(msg => {
            const key = msg.id || msg.tempId;
            if (!key) return true;
            if (mergedSeenIds.has(key)) {
              return false;
            }
            mergedSeenIds.add(key);
            return true;
          });

          // Sort by timestamp (newest first)
          mergedUnique.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA;
          });

          return {
            ...prev,
            [selectedCustomer.id]: mergedUnique
          };
        });
        
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!selectedCustomer || !employeeId) return;
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomer.id, employeeId })
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText || !selectedCustomer || !employeeId || !socket) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      tempId,
      text: messageText,
      sender: 'employee',
      customer_id: selectedCustomer.id,
      employee_id: employeeId,
      status: 'sending',
      timestamp: new Date().toISOString(),
    };

    // Check for duplicate before adding
    const existingMessages = messages[selectedCustomer.id] || [];
    const isDuplicate = existingMessages.some(m => 
      m.tempId === tempId || (m.text === messageText && m.sender === 'employee')
    );
    
    if (!isDuplicate) {
      setMessages(prev => ({
        ...prev,
        [selectedCustomer.id]: [...(prev[selectedCustomer.id] || []), tempMessage]
      }));
    }
    
    setNewMessage('');
    scrollToBottom();

    try {
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          text: messageText,
          employeeId: employeeId,
          employeeName: employeeName
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => {
          const customerMessages = prev[selectedCustomer.id] || [];
          
          // Find and update the temp message, remove duplicates
          const updatedMessages = customerMessages.map(msg =>
            msg.tempId === tempId
              ? { ...msg, id: data.messageId, status: 'sent', tempId: undefined }
              : msg
          );

          // Remove any duplicates by ID
          const seenIds = new Set();
          const uniqueMessages = updatedMessages.filter(msg => {
            const key = msg.id || msg.tempId;
            if (!key) return true;
            if (seenIds.has(key)) {
              return false;
            }
            seenIds.add(key);
            return true;
          });

          return {
            ...prev,
            [selectedCustomer.id]: uniqueMessages
          };
        });
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => ({
        ...prev,
        [selectedCustomer.id]: (prev[selectedCustomer.id] || []).map(msg =>
          msg.tempId === tempId ? { ...msg, status: 'failed' } : msg
        )
      }));
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Notification Sound - Programmatic */}
      <div ref={audioRef} style={{ display: 'none' }} />

      {/* Chat Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowChat(!showChat)}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-all relative"
          title="Open Chat"
        >
          <BiMessageRounded className="w-6 h-6" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat Window */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-[800px] h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BiMessageRounded className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Chat with Customer</h3>
                {selectedCustomer && (
                  <p className="text-xs text-blue-100">{selectedCustomer.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="hover:bg-blue-800 rounded-full p-1 transition"
            >
              <BiX className="w-5 h-5" />
            </button>
          </div>

          {/* Customer List Sidebar & Chat Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Customer List Sidebar */}
            <div className="w-64 border-r bg-gray-50 flex flex-col">
              {/* Search */}
              <div className="p-3 border-b">
                <div className="relative">
                  <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Customer List */}
              <div className="flex-1 overflow-y-auto">
                {/* New Chat Button */}
                <div className="p-3 border-b bg-white">
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSearchQuery('');
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <BiMessageRounded className="w-4 h-4" />
                    New Chat
                  </button>
                </div>

                {/* Customers with chat history */}
                {chatSessions.length > 0 ? (
                  chatSessions
                    .filter(session => {
                      const name = (session.customerName || session.customer_name || '').toLowerCase();
                      return name.includes(searchQuery.toLowerCase());
                    })
                    .map(session => {
                      const customerId = session.customerId || session.customer_id;
                      const customerName = session.customerName || session.customer_name;
                      const isSelected = selectedCustomer?.id === customerId;
                      const unread = unreadCounts[customerId] || 0;

                      return (
                        <div
                          key={customerId}
                          onClick={() => {
                            const cust = customers.find(c => c.id == customerId) || {
                              id: customerId,
                              name: customerName,
                              email: session.customerEmail || session.customer_email,
                              phone: session.customerPhone || session.customer_phone
                            };
                            setSelectedCustomer(cust);
                          }}
                          className={`p-3 border-b cursor-pointer hover:bg-gray-100 transition ${
                            isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{customerName}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {session.customerEmail || session.customer_email || session.customerPhone || session.customer_phone}
                              </p>
                            </div>
                            {unread > 0 && (
                              <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {unread > 9 ? '9+' : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No chat history yet
                  </div>
                )}

                {/* All customers dropdown (for new chats when no history) */}
                {!selectedCustomer && (
                  <div className="p-3 border-t bg-white">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Start New Chat
                    </label>
                    <select
                      onChange={(e) => {
                        const cust = customers.find(c => c.id == e.target.value);
                        if (cust) {
                          setSelectedCustomer(cust);
                          updateChatSessions();
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      value=""
                    >
                      <option value="">Select customer...</option>
                      {customers
                        .filter(cust => {
                          const name = (cust.name || '').toLowerCase();
                          return name.includes(searchQuery.toLowerCase());
                        })
                        .map(cust => (
                          <option key={cust.id} value={cust.id}>
                            {cust.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">

              {/* Messages Area */}
              {selectedCustomer ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 flex flex-col-reverse">
                    {loading ? (
                      <div className="text-center text-gray-500 py-8">Loading messages...</div>
                    ) : !messages[selectedCustomer.id] || messages[selectedCustomer.id].length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      [...(messages[selectedCustomer.id] || [])].reverse().map((msg, idx) => (
                    <div
                      key={msg.id || msg.tempId || idx}
                      className={`flex ${msg.sender === 'employee' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          msg.sender === 'employee'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        } ${msg.status === 'failed' ? 'opacity-50' : ''}`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === 'employee'
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={sending}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <BiSend className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-gray-500 text-center">
                  <div>
                    <BiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Select a customer from the list to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

