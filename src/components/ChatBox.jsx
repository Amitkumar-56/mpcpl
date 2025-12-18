'use client';

import { useEffect, useRef, useState } from 'react';
import { BiChevronDown, BiMessageRounded, BiSend, BiUser, BiX } from 'react-icons/bi';
import { io } from 'socket.io-client';

export default function ChatBox({ customerId, customerName, userRole = 'customer' }) {
  const [showChat, setShowChat] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || origin;
    const newSocket = io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('✅ Chat socket connected');
      if (customerId) {
        newSocket.emit('join_customer_room', { customerId });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Chat socket disconnected');
    });

    // Listen for new messages
    newSocket.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      
      // Play notification sound
      if (audioRef.current?.playBeep) {
        audioRef.current.playBeep();
      } else if (audioRef.current) {
        audioRef.current.play().catch(err => {
          // Fallback: create simple beep
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
        });
      }

      // Add message to state (with deduplication)
      setMessages(prev => {
        const message = data.message;
        if (!message) return prev;
        
        // Check for duplicate by ID or tempId
        const existsById = message.id && prev.some(m => m.id === message.id);
        const existsByTempId = message.tempId && prev.some(m => m.tempId === message.tempId);
        
        if (existsById || existsByTempId) {
          return prev; // Don't add duplicate
        }
        
        return [...prev, message];
      });

      // Update unread count if chat is closed
      if (!showChat) {
        setUnreadCount(prev => prev + 1);
      }

      scrollToBottom();
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [customerId]);

  // Fetch employees list
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/chat/employees');
        const data = await response.json();
        if (data.success) {
          setEmployees(data.employees || []);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch messages when employee is selected
  useEffect(() => {
    if (selectedEmployee && customerId) {
      fetchMessages();
    }
  }, [selectedEmployee, customerId]);

  // Reset unread count when chat opens
  useEffect(() => {
    if (showChat) {
      setUnreadCount(0);
      markAsRead();
    }
  }, [showChat]);

  const fetchMessages = async () => {
    if (!selectedEmployee || !customerId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/chat/messages?customerId=${customerId}&employeeId=${selectedEmployee.id}`);
      const data = await response.json();
      if (data.success) {
        const fetchedMessages = data.messages || [];
        
        // Remove duplicates based on message ID
        const seenIds = new Set();
        const uniqueMessages = fetchedMessages.filter(msg => {
          const key = msg.id || msg.tempId;
          if (!key) return true; // Keep messages without ID
          if (seenIds.has(key)) {
            return false; // Skip duplicate
          }
          seenIds.add(key);
          return true;
        });

        // Merge with existing messages and remove duplicates
        setMessages(prev => {
          const allMessages = [...prev, ...uniqueMessages];
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

          return mergedUnique;
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
    if (!customerId || !selectedEmployee) return;
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, employeeId: selectedEmployee.id })
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText || !selectedEmployee || !customerId || !socket) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      tempId,
      text: messageText,
      sender: userRole === 'customer' ? 'customer' : 'employee',
      customer_id: customerId,
      employee_id: selectedEmployee.id,
      status: 'sending',
      timestamp: new Date().toISOString(),
    };

    // Check for duplicate before adding
    const isDuplicate = messages.some(m => 
      m.tempId === tempId || (m.text === messageText && m.sender === (userRole === 'customer' ? 'customer' : 'employee'))
    );
    
    if (!isDuplicate) {
      setMessages(prev => [...prev, tempMessage]);
    }
    
    setNewMessage('');
    scrollToBottom();

    try {
      if (userRole === 'customer') {
        // Customer sending to employee
        const response = await fetch('/api/chat/send-customer-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            text: messageText,
            employeeId: selectedEmployee.id
          })
        });

        const data = await response.json();
        if (data.success) {
          // Update temp message with real ID and remove duplicates
          setMessages(prev => {
            const updated = prev.map(msg =>
              msg.tempId === tempId
                ? { ...msg, id: data.messageId, status: 'sent', tempId: undefined }
                : msg
            );

            // Remove duplicates by ID
            const seenIds = new Set();
            return updated.filter(msg => {
              const key = msg.id || msg.tempId;
              if (!key) return true;
              if (seenIds.has(key)) {
                return false;
              }
              seenIds.add(key);
              return true;
            });
          });
        } else {
          throw new Error(data.error || 'Failed to send message');
        }
      } else {
        // Employee sending to customer
        const response = await fetch('/api/chat/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            text: messageText,
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.name
          })
        });

        const data = await response.json();
        if (data.success) {
          setMessages(prev =>
            prev.map(msg =>
              msg.tempId === tempId
                ? { ...msg, id: data.messageId, status: 'sent', tempId: undefined }
                : msg
            )
          );
        } else {
          throw new Error(data.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.tempId === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
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
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat Window */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BiMessageRounded className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Chat</h3>
                {selectedEmployee && (
                  <p className="text-xs text-blue-100">
                    {selectedEmployee.name} ({selectedEmployee.role_name})
                  </p>
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

          {/* Employee Selection Dropdown */}
          {!selectedEmployee && (
            <div className="p-4 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee to Chat
              </label>
              <div className="relative">
                <select
                  onChange={(e) => {
                    const emp = employees.find(em => em.id == e.target.value);
                    setSelectedEmployee(emp);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.role_name}
                    </option>
                  ))}
                </select>
                <BiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Messages Area */}
          {selectedEmployee && (
            <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 flex flex-col-reverse">
                  {loading ? (
                    <div className="text-center text-gray-500 py-8">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    [...messages].reverse().map((msg, idx) => (
                    <div
                      key={msg.id || msg.tempId || idx}
                      className={`flex ${msg.sender === (userRole === 'customer' ? 'customer' : 'employee') ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          msg.sender === (userRole === 'customer' ? 'customer' : 'employee')
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        } ${msg.status === 'failed' ? 'opacity-50' : ''}`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === (userRole === 'customer' ? 'customer' : 'employee')
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
          )}

          {/* No Employee Selected Message */}
          {!selectedEmployee && (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-500 text-center">
              <div>
                <BiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Please select an employee to start chatting</p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

