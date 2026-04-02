'use client';

import { useSession } from '@/context/SessionContext';
import { showChatNotification } from '@/utils/notifications';
import { playBeep } from '@/utils/sound';
import { useEffect, useRef, useState } from 'react';
import { BiCheck, BiMessageRounded, BiSearch, BiSend, BiX, BiXCircle } from 'react-icons/bi';
import { io } from 'socket.io-client';

export default function EmployeeChatDashboard({ showChat, setShowChat }) {
  const { user: sessionUser } = useSession();
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Chat sessions and messages
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Employee list for starting new chats
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // UI states
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const [typingIndicators, setTypingIndicators] = useState({});
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!sessionUser?.id) return;

    let socketInstance;

    const initializeSocket = async () => {
      try {
        await fetch('/api/socket');
        
        socketInstance = io({
          path: '/api/socket',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
          console.log('EmployeeChat: Socket connected');
          setSocket(socketInstance);
          setSocketConnected(true);
          
          // Join employee-specific room
          socketInstance.emit('employee_join', {
            employeeId: String(sessionUser.id),
            employeeName: sessionUser.name || 'Employee',
            role: sessionUser.role,
          });
        });

        socketInstance.on('connect_error', (error) => {
          console.error('EmployeeChat: Socket connection error:', error);
          setSocketConnected(false);
        });

        socketInstance.on('disconnect', () => {
          console.log('EmployeeChat: Socket disconnected');
          setSocketConnected(false);
        });

        // Employee chat event listeners
        socketInstance.on('employee_chat_request_received', (sessionData) => {
          console.log('EmployeeChat: Chat request received:', sessionData);
          loadChatSessions();
          playBeep();
          showChatNotification(`${sessionData.requester_name} wants to chat`, 'New chat request');
        });

        socketInstance.on('employee_chat_response_received', (data) => {
          console.log('EmployeeChat: Chat response received:', data);
          loadChatSessions();
          
          if (data.action === 'accept' && selectedSession?.id === data.sessionId) {
            // Load messages for the accepted session
            loadMessages(data.sessionId);
          }
        });

        socketInstance.on('employee_chat_message_received', (messageData) => {
          console.log('EmployeeChat: Message received:', messageData);
          console.log('Current user ID:', sessionUser.id, 'Message sender:', messageData.sender_id, 'Message receiver:', messageData.receiver_id);
          
          // Always update messages in state regardless of current session
          setMessages(prev => {
            const currentMessages = prev[messageData.session_id] || [];
            const messageExists = currentMessages.some(msg => 
              msg.id === messageData.id || 
              (msg.message === messageData.message && 
               msg.sender_id === messageData.sender_id && 
               Math.abs(new Date(msg.created_at) - new Date(messageData.created_at)) < 1000)
            );
            
            if (!messageExists) {
              const updatedMessages = {
                ...prev,
                [messageData.session_id]: [...currentMessages, messageData]
              };
              console.log('EmployeeChat: Updated messages state:', updatedMessages);
              return updatedMessages;
            } else {
              console.log('EmployeeChat: Duplicate message ignored:', messageData.id);
            }
            return prev;
          });
          
          // If this is current session, mark as read immediately
          if (selectedSession?.id === messageData.session_id) {
            console.log('EmployeeChat: Marking message as read immediately');
            markMessagesAsRead(messageData.session_id);
            
            // Update message status to 'read' for sender
            setMessages(prev => ({
              ...prev,
              [messageData.session_id]: prev[messageData.session_id].map(msg => 
                msg.id === messageData.id ? { ...msg, status: 'read', read_at: new Date().toISOString() } : msg
              )
            }));
            
            // Clear notifications when message is read
            setNotificationCount(0);
            setLastNotification(null);
          } else {
            // Show notification with sender name immediately
            const senderName = messageData.sender_name || 'Someone';
            const messageText = messageData.message || 'sent a message';
            showChatNotification(`${senderName}: ${messageText}`, `New message from ${senderName}`);
            
            // Update notification count
            setNotificationCount(prev => prev + 1);
            setLastNotification({ senderName, message: messageText });
            
            // Update unread count
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log('EmployeeChat: Unread count updated:', newCount);
              return newCount;
            });
            loadChatSessions();
            playBeep();
          }
        });

        socketInstance.on('employee_chat_typing_indicator', (data) => {
          setTypingIndicators(prev => ({
            ...prev,
            [data.sessionId]: data.isTyping ? data.senderName : null
          }));
          
          // Clear typing indicator after 3 seconds
          if (data.isTyping) {
            setTimeout(() => {
              setTypingIndicators(prev => ({
                ...prev,
                [data.sessionId]: null
              }));
            }, 3000);
          }
        });

        socketInstance.on('employee_chat_messages_read', (data) => {
          console.log('EmployeeChat: Messages read:', data);
          loadChatSessions();
        });

      } catch (error) {
        console.error('EmployeeChat: Error initializing socket:', error);
        setSocketConnected(false);
      }
    };

    initializeSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        setSocketConnected(false);
      }
    };
  }, [sessionUser]);

  // Load chat sessions
  const loadChatSessions = async () => {
    if (!sessionUser?.id) return [];
    
    try {
      const response = await fetch('/api/employee-chat/sessions');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChatSessions(data.sessions);
          
          // Calculate unread count
          const unreadTotal = data.sessions.reduce((total, session) => 
            total + (session.unread_count || 0), 0
          );
          setUnreadCount(unreadTotal);
          
          return data.sessions;
        }
      }
    } catch (error) {
      console.error('EmployeeChat: Error loading chat sessions:', error);
    }
    return [];
  };

  // Load available employees
  const loadAvailableEmployees = async () => {
    if (!sessionUser?.id) return;
    
    setLoadingEmployees(true);
    try {
      const url = searchEmployee 
        ? `/api/employee-chat/employees?search=${encodeURIComponent(searchEmployee)}`
        : '/api/employee-chat/employees';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('EmployeeChat: Loaded employees:', data.employees);
          // Filter out current user from the list
          const filteredEmployees = (data.employees || []).filter(emp => {
            console.log('Checking employee:', emp.name, 'ID:', emp.id, 'Type:', typeof emp.id, 'Current user ID:', sessionUser.id, 'Type:', typeof sessionUser.id, 'Role:', emp.role, 'Role type:', typeof emp.role);
            // Only filter out current user - show all other employees
            return String(emp.id) !== String(sessionUser.id);
          });
          console.log('EmployeeChat: Filtered employees:', filteredEmployees);
          console.log('EmployeeChat: Current user sessionUser:', sessionUser);
          setAvailableEmployees(filteredEmployees);
        } else {
          console.error('EmployeeChat: API error:', data.error);
          setAvailableEmployees([]);
        }
      } else {
        console.error('EmployeeChat: HTTP error:', response.status);
        setAvailableEmployees([]);
      }
    } catch (error) {
      console.error('EmployeeChat: Error loading employees:', error);
      setAvailableEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    // Immediately create or find existing session and show chat
    sendChatRequest(employee.id, 'Hello! I would like to chat with you.');
  };

  // Load messages for a session
  const loadMessages = async (sessionId) => {
    if (!sessionUser?.id || !sessionId) return;
    
    setLoadingMessages(true);
    try {
      console.log('EmployeeChat: Loading messages for session:', sessionId);
      
      const response = await fetch(`/api/employee-chat/messages?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('EmployeeChat: Messages response:', data);
      
      if (data.success) {
        console.log('EmployeeChat: Setting messages for session', sessionId, ':', data.messages);
        setMessages(prev => ({
          ...prev,
          [sessionId]: data.messages || []
        }));
      } else {
        console.error('EmployeeChat: API returned error:', data.error);
      }
    } catch (error) {
      console.error('EmployeeChat: Error loading messages:', error);
      // Show error message to user
      setMessages(prev => ({
        ...prev,
        [sessionId]: []
      }));
    } finally {
      setLoadingMessages(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (sessionId) => {
    if (!sessionUser?.id || !sessionId) return;
    
    try {
      await fetch('/api/employee-chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          employeeId: sessionUser.id
        })
      });
    } catch (error) {
      console.error('EmployeeChat: Error marking messages as read:', error);
    }
  };

  // Send chat request
  const sendChatRequest = async (employeeId, messageText = '') => {
    if (!sessionUser?.id) return;
    
    // Prevent self-chat
    if (String(employeeId) === String(sessionUser.id)) {
      console.error('Cannot chat with yourself - Employee ID:', employeeId, 'User ID:', sessionUser.id);
      return;
    }
    
    try {
      const response = await fetch('/api/employee-chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responderId: employeeId,
          requestMessage: messageText || 'Would like to start a chat'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('Chat request sent successfully:', result);
        
        // Clear input field
        setNewMessage('');
        
        // If session already exists, load it
        if (result.session) {
          setSelectedSession(result.session);
          setSelectedEmployee(null);
        } else {
          // Load sessions to get the existing session
          const updatedSessions = await loadChatSessions();
          
          // Find and select the existing session
          setTimeout(() => {
            const existingSession = updatedSessions.find(s => 
              (s.requester_id === sessionUser.id && s.responder_id === employeeId) ||
              (s.requester_id === employeeId && s.responder_id === sessionUser.id)
            );
            if (existingSession) {
              console.log('Found existing session:', existingSession);
              setSelectedSession(existingSession);
              setSelectedEmployee(null);
            }
          }, 1000);
        }
        
      } else {
        console.error('Chat request failed:', result.error);
      }
    } catch (error) {
      console.error('EmployeeChat: Error sending chat request:', error);
    }
  };

  // Respond to chat request
  const respondToChatRequest = async (sessionId, action) => {
    if (!sessionUser?.id || !socket) return;
    
    try {
      const response = await fetch('/api/employee-chat/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          action: action
        })
      });
      
      const result = await response.json();
      if (result.success) {
        // Emit socket event for real-time notification
        socket.emit('employee_chat_respond', {
          sessionId: sessionId,
          responderId: sessionUser.id,
          action: action
        });
        
        loadChatSessions();
      }
    } catch (error) {
      console.error('EmployeeChat: Error responding to chat request:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession || !socket) return;
    
    const tempId = `temp_${Date.now()}`;
    const messageData = {
      id: tempId,
      session_id: selectedSession.id,
      sender_id: sessionUser.id,
      receiver_id: selectedSession.requester_id === sessionUser.id 
        ? selectedSession.responder_id 
        : selectedSession.requester_id,
      message: newMessage.trim(),
      status: 'sending',
      created_at: new Date().toISOString()
    };

    // Add message to UI immediately
    setMessages(prev => ({
      ...prev,
      [selectedSession.id]: [...(prev[selectedSession.id] || []), messageData]
    }));
    
    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch('/api/employee-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          message: messageToSend
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update message with real data from server
        if (result.success && result.message) {
          setMessages(prev => {
            const currentMessages = prev[selectedSession.id] || [];
            const messageExists = currentMessages.some(msg => 
              msg.id === result.message.id || 
              (msg.message === result.message.message && 
               msg.sender_id === result.message.sender_id && 
               Math.abs(new Date(msg.created_at) - new Date(result.message.created_at)) < 1000)
            );
            
            if (!messageExists) {
              return {
                ...prev,
                [selectedSession.id]: prev[selectedSession.id].map(msg => 
                  msg.id === tempId 
                    ? { ...result.message, status: 'sent' } // Mark as sent immediately
                    : msg
                )
              };
            } else {
              console.log('EmployeeChat: Sender duplicate message ignored:', result.message.id);
              return prev;
            }
          });

          // Emit socket event to broadcast message
          console.log('EmployeeChat: Emitting message to socket:', {
            sessionId: selectedSession.id,
            senderId: sessionUser.id,
            receiverId: selectedSession.requester_id === sessionUser.id 
              ? selectedSession.responder_id 
              : selectedSession.requester_id,
            message: messageToSend
          });
          
          socket.emit('employee_chat_message', {
            sessionId: selectedSession.id,
            senderId: sessionUser.id,
            receiverId: selectedSession.requester_id === sessionUser.id 
              ? selectedSession.responder_id 
              : selectedSession.requester_id,
            message: messageToSend
          });

          // After socket emit, mark as delivered
          setTimeout(() => {
            setMessages(prev => ({
              ...prev,
              [selectedSession.id]: prev[selectedSession.id].map(msg => 
                msg.id === result.message.id ? { ...msg, status: 'delivered' } : msg
              )
            }));
          }, 1000);

        } else {
          // Handle failed message
          setMessages(prev => ({
            ...prev,
            [selectedSession.id]: prev[selectedSession.id].map(msg => 
              msg.id === tempId 
                ? { ...msg, status: 'failed' }
                : msg
            )
          }));
        }

      } else {
        // Mark as failed
        setMessages(prev => ({
          ...prev,
          [selectedSession.id]: prev[selectedSession.id].map(msg => 
            msg.id === tempId 
              ? { ...msg, status: 'failed' }
              : msg
          )
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark as failed
      setMessages(prev => ({
        ...prev,
        [selectedSession.id]: prev[selectedSession.id].map(msg => 
          msg.id === tempId 
            ? { ...msg, status: 'failed' }
            : msg
        )
      }));
    }
  };

  // Handle typing indicator
  const handleTyping = (isTyping) => {
    if (!selectedSession || !socket) return;
    
    const receiverId = selectedSession.requester_id === sessionUser.id 
      ? selectedSession.responder_id 
      : selectedSession.requester_id;
    
    socket.emit('employee_chat_typing', {
      sessionId: selectedSession.id,
      receiverId: receiverId,
      isTyping: isTyping,
      senderName: sessionUser.name
    });
    
    // Auto-stop typing after 2 seconds
    if (isTyping) {
      setTimeout(() => {
        socket.emit('employee_chat_typing', {
          sessionId: selectedSession.id,
          receiverId: receiverId,
          isTyping: false,
          senderName: sessionUser.name
        });
      }, 2000);
    }
  };

  // Load sessions on mount and when chat is opened
  useEffect(() => {
    if (showChat && sessionUser?.id) {
      console.log('EmployeeChat: Chat opened, loading sessions');
      loadChatSessions();
      loadAvailableEmployees();
      
      // Load messages from localStorage
      const savedMessages = localStorage.getItem(`employee_chat_messages_${sessionUser.id}`);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          console.log('EmployeeChat: Loaded messages from localStorage:', parsedMessages);
          setMessages(parsedMessages);
        } catch (error) {
          console.error('EmployeeChat: Error parsing saved messages:', error);
        }
      }
    }
  }, [showChat, sessionUser?.id]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (sessionUser?.id && Object.keys(messages).length > 0) {
      console.log('EmployeeChat: Saving messages to localStorage');
      localStorage.setItem(`employee_chat_messages_${sessionUser.id}`, JSON.stringify(messages));
    }
  }, [messages, sessionUser?.id]);

  // Load employees when chat is opened or search changes
  useEffect(() => {
    if (showChat && sessionUser?.id) {
      loadAvailableEmployees();
    }
  }, [showChat, sessionUser?.id, searchEmployee]);

  // Load messages when session is selected
  useEffect(() => {
    if (selectedSession && sessionUser?.id) {
      console.log('EmployeeChat: Session selected, loading messages:', selectedSession.id);
      // Always load fresh messages - no caching
      setLoadingMessages(true);
      loadMessages(selectedSession.id);
      markMessagesAsRead(selectedSession.id);
    }
  }, [selectedSession, sessionUser?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedSession]);

  // Auto-refresh sessions
  useEffect(() => {
    if (!sessionUser?.id) return;
    
    const interval = setInterval(() => {
      loadChatSessions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [sessionUser?.id]);

  if (!showChat) return null;

  return (
    <div className="fixed bottom-32 right-4 z-50 w-full sm:w-[500px] h-[400px] bg-white rounded-lg shadow-xl border border-gray-200">
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-3 border-b bg-yellow-500 text-white rounded-t-lg flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <BiMessageRounded size={16} />
            <span className="font-medium text-sm">Employee Chat</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
            {lastNotification && (
              <span className="bg-green-500 text-white text-xs rounded px-2 py-1 animate-pulse">
                {lastNotification.senderName}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setShowChat(false);
              // Clear notifications when chat is closed
              setNotificationCount(0);
              setLastNotification(null);
            }}
            className="text-white hover:text-yellow-200 relative"
          >
            <BiX size={16} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>
        </div>

        {/* Chat Content - Split Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Side - Employee List */}
          <div className="w-2/5 border-r bg-gray-50 flex flex-col">
            <div className="p-3 border-b bg-white flex-shrink-0">
              <h4 className="font-semibold text-sm mb-2">Employees</h4>
              <div className="relative">
                <BiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loadingEmployees ? (
                <div className="text-center py-4 text-xs text-gray-500">Loading employees...</div>
              ) : availableEmployees.length > 0 ? (
                availableEmployees.map(employee => (
                  <div
                    key={employee.id}
                    onClick={() => handleEmployeeSelect(employee)}
                    className={`flex items-center space-x-2 p-3 hover:bg-white cursor-pointer border-b border-gray-200 transition-colors ${
                      selectedEmployee?.id === employee.id ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
                    }`}
                  >
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                      {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{employee.name}</div>
                      <div className="text-xs text-gray-500 truncate">{employee.role || 'Employee'}</div>
                    </div>
                    <BiMessageRounded size={14} className="text-yellow-500 flex-shrink-0" />
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-gray-500">
                  {searchEmployee ? 'No employees found matching your search' : 'No employees found'}
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Chat Area */}
          <div className="flex-1 flex flex-col bg-white min-h-0">
            {selectedEmployee || selectedSession ? (
              <>
                {/* Chat Header */}
                <div className="p-3 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedEmployee(null);
                        setSelectedSession(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1"
                    >
                      ←
                    </button>
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-medium">
                      {(selectedEmployee?.name || selectedSession?.requester_id === sessionUser.id 
                        ? selectedSession?.responder_name 
                        : selectedSession?.requester_name)?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {selectedEmployee?.name || 
                         (selectedSession?.requester_id === sessionUser.id 
                          ? selectedSession?.responder_name 
                          : selectedSession?.requester_name)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedSession ? 
                          (selectedSession.status === 'pending' ? '⏳ Waiting...' : 
                           selectedSession.status === 'active' ? '🟢 Active' : '🔴 Offline')
                          : '💬 Starting chat...'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {socketConnected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
                
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  {selectedSession ? (
                    <>
                      {console.log('EmployeeChat: Rendering messages for session', selectedSession.id, ':', messages[selectedSession.id])}
                      {(messages[selectedSession.id] || []).map((message, index) => {
                        console.log('EmployeeChat: Rendering message:', message);
                        const uniqueKey = `${message.id}_${index}_${message.created_at || Date.now()}`;
                        return (
                          <div
                            key={uniqueKey}
                            className={`flex ${message.sender_id === sessionUser.id ? 'justify-end' : 'justify-start'}`}
                          >
                          <div
                            className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                              message.sender_id === sessionUser.id
                                ? 'bg-yellow-500 text-white'
                                : 'bg-white text-gray-800 border border-gray-200'
                            }`}
                          >
                            <div className="break-words">{message.message}</div>
                            <div className={`text-xs mt-1 ${
                              message.sender_id === sessionUser.id ? 'text-yellow-100' : 'text-gray-400'
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                              {message.status === 'sending' && <span className="text-gray-400"> ⏳</span>}
                              {message.status === 'sent' && <span className="text-gray-400"> ✓</span>}
                              {message.status === 'delivered' && <span className="text-gray-400"> ✓✓</span>}
                              {message.status === 'read' && <span className="text-blue-400"> ✓✓</span>}
                              {message.status === 'failed' && <span className="text-red-400"> ❌</span>}
                            </div>
                          </div>
                          </div>
                        );
                      })}
                      {typingIndicators[selectedSession.id] && (
                        <div className="flex justify-start">
                          <div className="bg-white text-gray-600 px-3 py-2 rounded-lg text-sm border border-gray-200">
                            {typingIndicators[selectedSession.id]} is typing...
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-4xl mb-2">💬</div>
                      <div className="text-sm">Starting chat with {selectedEmployee?.name}...</div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Message Input */}
                <div className="p-3 border-t bg-white flex-shrink-0">
                  {selectedSession?.status === 'active' ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping(true);
                        }}
                        onKeyUp={() => handleTyping(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        disabled={!socketConnected}
                        autoFocus
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !socketConnected}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <BiSend size={18} />
                      </button>
                    </div>
                  ) : selectedSession?.status === 'pending' ? (
                    <div className="text-center text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                      {selectedSession.responder_id === sessionUser.id 
                        ? '⏳ Accept or reject chat request' 
                        : '⏳ Waiting for response...'}
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (newMessage.trim()) {
                              sendChatRequest(selectedEmployee.id, newMessage.trim());
                            }
                          }
                        }}
                        placeholder="Type a message to start chat..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (newMessage.trim()) {
                            sendChatRequest(selectedEmployee.id, newMessage.trim());
                          }
                        }}
                        disabled={!newMessage.trim()}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* No Chat Selected */
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <BiMessageRounded size={48} />
                  </div>
                  <div className="text-gray-600 font-medium">Select an employee to start chatting</div>
                  <div className="text-gray-400 text-sm mt-1">Choose from employee list on the left</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}