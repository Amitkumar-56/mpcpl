'use client';

import { useSession } from '@/context/SessionContext';
import { initializeNotifications, showChatNotification, requestNotificationPermission } from '@/utils/notifications';
import { initializePWANotifications, showChatNotificationPWA, isPWAStandalone } from '@/utils/pwa-notifications';
import { forceInitializeAudio, playBeep } from '@/utils/sound';
import { useEffect, useRef, useState } from 'react';
import { BiMenu, BiMessageRounded, BiSearch, BiSend, BiX } from 'react-icons/bi';
import { io } from 'socket.io-client';

export default function EmployeeChatDashboard({ showChat, setShowChat, setEmployeeChatNotifCount }) {
  const { user: sessionUser } = useSession();
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Sidebar: mobile default hidden, desktop always visible
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const [typingIndicators, setTypingIndicators] = useState({});

  useEffect(() => {
    if (typeof setEmployeeChatNotifCount === 'function') {
      setEmployeeChatNotifCount(unreadCount);
    }
  }, [unreadCount, setEmployeeChatNotifCount]);

  const messagesEndRef = useRef(null);

  // Handle user interaction for audio initialization
  useEffect(() => {
    const handleUserInteraction = () => {
      forceInitializeAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // ── Socket ──────────────────────────────────────────────────
  useEffect(() => {
    const initNotifs = async () => {
      if (typeof window !== 'undefined') {
        // Use PWA enhanced notifications if available
        if (isPWAStandalone()) {
          await initializePWANotifications();
        } else {
          await requestNotificationPermission();
          await initializeNotifications();
        }
        forceInitializeAudio();
      }
    };
    initNotifs();
    if (!sessionUser?.id) return;
    let socketInstance;

    const init = async () => {
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
          setSocket(socketInstance);
          setSocketConnected(true);
          socketInstance.emit('employee_join', {
            employeeId: String(sessionUser.id),
            employeeName: sessionUser.name || 'Employee',
            role: sessionUser.role,
          });
        });

        socketInstance.on('connect_error', () => setSocketConnected(false));
        socketInstance.on('disconnect', () => setSocketConnected(false));

        socketInstance.on('employee_chat_request_received', (s) => {
          loadChatSessions(); playBeep();
          if (isPWAStandalone()) {
            showChatNotificationPWA(s.requester_name, 'wants to chat', { 
              body: 'New chat request',
              tag: 'chat-request'
            }).catch(e => console.log('Notif error:', e));
          } else {
            showChatNotification(`${s.requester_name} wants to chat`, 'New chat request')
              .catch(e => console.log('Notif error:', e));
          }
        });

        socketInstance.on('employee_chat_response_received', (d) => {
          loadChatSessions();
          if (d.action === 'accept' && selectedSession?.id === d.sessionId) loadMessages(d.sessionId);
        });

        socketInstance.on('employee_chat_message_received', (msg) => {
          setMessages(prev => {
            const cur = prev[msg.session_id] || [];
            const exists = cur.some(m =>
              m.id === msg.id ||
              (m.message === msg.message && m.sender_id === msg.sender_id &&
               Math.abs(new Date(m.created_at) - new Date(msg.created_at)) < 1000)
            );
            return exists ? prev : { ...prev, [msg.session_id]: [...cur, msg] };
          });

          const senderName = msg.sender_name || 'Someone';
          const messageText = msg.message || 'New message received';

          if (selectedSession?.id === msg.session_id) {
            markMessagesAsRead(msg.session_id);
            setNotificationCount(0); setLastNotification(null);
          } else {
            // Use PWA enhanced notifications in standalone mode
            if (isPWAStandalone()) {
              showChatNotificationPWA(senderName, messageText, {
                tag: `chat-${senderName}`,
                renotify: true
              }).catch(e => console.log('Notif error:', e));
            } else {
              showChatNotification(senderName, messageText)
                .catch(e => console.log('Notif error:', e));
            }
            setNotificationCount(p => p + 1);
            setLastNotification({ senderName, message: messageText });
            setUnreadCount(p => p + 1);
            loadChatSessions();
            playBeep();
          }
        });

        socketInstance.on('employee_chat_typing_indicator', (d) => {
          setTypingIndicators(p => ({ ...p, [d.sessionId]: d.isTyping ? d.senderName : null }));
          if (d.isTyping) setTimeout(() => setTypingIndicators(p => ({ ...p, [d.sessionId]: null })), 3000);
        });

        socketInstance.on('employee_chat_messages_read', () => loadChatSessions());
      } catch { setSocketConnected(false); }
    };

    init();
    return () => { if (socketInstance) { socketInstance.disconnect(); setSocketConnected(false); } };
  }, [sessionUser]);

  // ── API helpers ─────────────────────────────────────────────
  const loadChatSessions = async () => {
    if (!sessionUser?.id) return [];
    try {
      const res = await fetch('/api/employee-chat/sessions');
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setChatSessions(d.sessions);
          setUnreadCount(d.sessions.reduce((t, s) => t + (s.unread_count || 0), 0));
          return d.sessions;
        }
      }
    } catch {}
    return [];
  };

  const loadAvailableEmployees = async () => {
    if (!sessionUser?.id) return;
    setLoadingEmployees(true);
    try {
      const url = searchEmployee
        ? `/api/employee-chat/employees?search=${encodeURIComponent(searchEmployee)}`
        : '/api/employee-chat/employees';
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setAvailableEmployees((d.employees || []).filter(e => String(e.id) !== String(sessionUser.id)));
        else setAvailableEmployees([]);
      } else setAvailableEmployees([]);
    } catch { setAvailableEmployees([]); }
    finally { setLoadingEmployees(false); }
  };

  const loadMessages = async (sessionId) => {
    if (!sessionUser?.id || !sessionId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/employee-chat/messages?sessionId=${sessionId}`, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
      });
      const d = await res.json();
      if (d.success) setMessages(p => ({ ...p, [sessionId]: d.messages || [] }));
    } catch { setMessages(p => ({ ...p, [sessionId]: [] })); }
    finally { setLoadingMessages(false); }
  };

  const markMessagesAsRead = async (sessionId) => {
    if (!sessionUser?.id || !sessionId) return;
    try {
      const res = await fetch('/api/employee-chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, employeeId: sessionUser.id })
      });
      const result = res.ok ? await res.json() : null;
      if (result?.success) {
        await loadChatSessions();
        setNotificationCount(0);
        setLastNotification(null);
      }
    } catch {}
  };

  const sendChatRequest = async (employeeId, messageText = '') => {
    if (!sessionUser?.id || String(employeeId) === String(sessionUser.id)) return;
    try {
      const res = await fetch('/api/employee-chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responderId: employeeId, requestMessage: messageText || 'Would like to start a chat' })
      });
      const result = await res.json();
      if (result.success) {
        setNewMessage('');
        if (result.session) {
          setSelectedSession(result.session);
          setSelectedEmployee(null);
        } else {
          const sessions = await loadChatSessions();
          setTimeout(() => {
            const s = sessions.find(s =>
              (s.requester_id === sessionUser.id && s.responder_id === employeeId) ||
              (s.requester_id === employeeId && s.responder_id === sessionUser.id)
            );
            if (s) { setSelectedSession(s); setSelectedEmployee(null); }
          }, 1000);
        }
      }
    } catch {}
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession || !socket) return;
    const tempId = `temp_${Date.now()}`;
    const receiverId = selectedSession.requester_id === sessionUser.id
      ? selectedSession.responder_id : selectedSession.requester_id;

    setMessages(p => ({
      ...p,
      [selectedSession.id]: [...(p[selectedSession.id] || []), {
        id: tempId, session_id: selectedSession.id, sender_id: sessionUser.id,
        receiver_id: receiverId, message: newMessage.trim(),
        status: 'sending', created_at: new Date().toISOString()
      }]
    }));
    const toSend = newMessage.trim();
    setNewMessage('');

    try {
      const res = await fetch('/api/employee-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSession.id, message: toSend })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.message) {
          setMessages(p => {
            const cur = p[selectedSession.id] || [];
            const exists = cur.some(m =>
              m.id === result.message.id ||
              (m.message === result.message.message && m.sender_id === result.message.sender_id &&
               Math.abs(new Date(m.created_at) - new Date(result.message.created_at)) < 1000)
            );
            if (exists) return p;
            return { ...p, [selectedSession.id]: cur.map(m => m.id === tempId ? { ...result.message, status: 'sent' } : m) };
          });
          socket.emit('employee_chat_message', { sessionId: selectedSession.id, senderId: sessionUser.id, receiverId, message: toSend });
          setTimeout(() => {
            setMessages(p => ({
              ...p,
              [selectedSession.id]: p[selectedSession.id].map(m =>
                m.id === result.message.id ? { ...m, status: 'delivered' } : m)
            }));
          }, 1000);
        } else {
          setMessages(p => ({ ...p, [selectedSession.id]: p[selectedSession.id].map(m => m.id === tempId ? { ...m, status: 'failed' } : m) }));
        }
      }
    } catch {
      setMessages(p => ({ ...p, [selectedSession.id]: p[selectedSession.id].map(m => m.id === tempId ? { ...m, status: 'failed' } : m) }));
    }
  };

  const handleTyping = (isTyping) => {
    if (!selectedSession || !socket) return;
    const receiverId = selectedSession.requester_id === sessionUser.id
      ? selectedSession.responder_id : selectedSession.requester_id;
    socket.emit('employee_chat_typing', { sessionId: selectedSession.id, receiverId, isTyping, senderName: sessionUser.name });
    if (isTyping) setTimeout(() => socket.emit('employee_chat_typing', { sessionId: selectedSession.id, receiverId, isTyping: false, senderName: sessionUser.name }), 2000);
  };

  const handleEmployeeSelect = (emp) => {
    setSelectedEmployee(emp);
    setSidebarOpen(false); // Close sidebar after selection on mobile
    sendChatRequest(emp.id, 'Hello! I would like to chat with you.');
  };

  // ── Effects ─────────────────────────────────────────────────
  useEffect(() => {
    if (showChat && sessionUser?.id) {
      loadChatSessions();
      loadAvailableEmployees();
      const saved = localStorage.getItem(`employee_chat_messages_${sessionUser.id}`);
      if (saved) { try { setMessages(JSON.parse(saved)); } catch {} }
    }
  }, [showChat, sessionUser?.id]);

  useEffect(() => {
    if (sessionUser?.id && Object.keys(messages).length > 0)
      localStorage.setItem(`employee_chat_messages_${sessionUser.id}`, JSON.stringify(messages));
  }, [messages, sessionUser?.id]);

  useEffect(() => {
    if (showChat && sessionUser?.id) loadAvailableEmployees();
  }, [showChat, sessionUser?.id, searchEmployee]);

  useEffect(() => {
    if (selectedSession && sessionUser?.id) {
      loadMessages(selectedSession.id);
      markMessagesAsRead(selectedSession.id);
      setNotificationCount(0);
      setLastNotification(null);
    }
  }, [selectedSession, sessionUser?.id]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedSession]);

  useEffect(() => {
    if (!sessionUser?.id) return;
    const iv = setInterval(loadChatSessions, 30000);
    return () => clearInterval(iv);
  }, [sessionUser?.id]);

  // Listen for 'openEmployeeChat' event from Header notification click
  useEffect(() => {
    const handleOpenFromNotif = (e) => {
      console.log('EmployeeChatDashboard: Opening from notification click', e.detail);
      if (!showChat) setShowChat(true);
      // If sessionId provided, find and select that session
      if (e.detail?.sessionId) {
        const session = chatSessions.find(s => s.id === e.detail.sessionId);
        if (session) {
          setSelectedSession(session);
          setSelectedEmployee(null);
          setSidebarOpen(false);
        }
      } else if (e.detail?.senderId) {
        // Find session with this sender
        const session = chatSessions.find(s => 
          s.requester_id === e.detail.senderId || s.responder_id === e.detail.senderId
        );
        if (session) {
          setSelectedSession(session);
          setSelectedEmployee(null);
          setSidebarOpen(false);
        }
      }
    };
    window.addEventListener('openEmployeeChat', handleOpenFromNotif);
    return () => window.removeEventListener('openEmployeeChat', handleOpenFromNotif);
  }, [showChat, chatSessions, setShowChat]);

  if (!showChat) return null;

  const chatPartnerName = selectedEmployee?.name ||
    (selectedSession?.requester_id === sessionUser?.id
      ? selectedSession?.responder_name
      : selectedSession?.requester_name);

  const isChatOpen = selectedEmployee || selectedSession;

  return (
    <>
      {/* Backdrop — closes sidebar on mobile tap outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/*
        Chat window:
          Mobile  → bottom sheet, full width, 58vh tall, rounded top corners
          Desktop → fixed bottom-right, 500px × 480px, fully rounded
      */}
      <div className="
        fixed z-50
        bottom-0 left-0 right-0
        sm:bottom-4 sm:right-4 sm:left-auto
        w-full sm:w-[500px]
        h-[70vh] sm:h-[480px]
        bg-white rounded-t-2xl sm:rounded-2xl
        shadow-2xl border border-gray-200
        flex flex-col overflow-hidden
      ">

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 bg-yellow-500 text-white">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 rounded-lg hover:bg-yellow-600 transition-colors flex-shrink-0"
              aria-label="Toggle employee list"
            >
              <BiMenu size={18} />
            </button>

            <BiMessageRounded size={16} className="flex-shrink-0" />

            <span className="font-semibold text-sm truncate">
              {isChatOpen && chatPartnerName ? chatPartnerName : 'Employee Chat'}
            </span>

            {unreadCount > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Find the first session with unread messages and open it
                  const unreadSession = chatSessions.find(s => (s.unread_count || 0) > 0);
                  if (unreadSession) {
                    setSelectedSession(unreadSession);
                    setSelectedEmployee(null);
                    setSidebarOpen(false);
                  } else {
                    setSidebarOpen(true);
                  }
                }}
                className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center flex-shrink-0 animate-pulse hover:bg-red-600 transition-colors"
              >
                {unreadCount} new
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-300' : 'bg-red-400'}`}
              title={socketConnected ? 'Connected' : 'Disconnected'}
            />
            <button
              onClick={() => { setShowChat(false); setNotificationCount(0); setLastNotification(null); }}
              className="p-1.5 rounded-lg hover:bg-yellow-600 transition-colors relative"
              aria-label="Close"
            >
              <BiX size={18} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">

          {/*
            ══ SIDEBAR ══
            Mobile  : absolute overlay, slides in from left on toggle
            Desktop : always visible, fixed 190px width
          */}
          <div className={`
            flex-col bg-gray-50 border-r border-gray-200 z-30
            absolute inset-y-0 left-0
            w-[210px]
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}
            sm:relative sm:flex sm:translate-x-0 sm:w-[185px]
          `}>
            <div className="p-2.5 border-b bg-white flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs text-gray-700">Employees</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="sm:hidden text-gray-400 hover:text-gray-600"
                  aria-label="Close sidebar"
                >
                  <BiX size={14} />
                </button>
              </div>
              <div className="relative">
                <BiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchEmployee}
                  onChange={e => setSearchEmployee(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Available Employees */}
              {availableEmployees.length > 0 && (
                <div>
                  <div className="px-2.5 py-1.5 bg-gray-100">
                    <span className="text-[10px] font-semibold text-gray-600">All Employees</span>
                  </div>
                  {availableEmployees.filter(emp => {
                    // Filter out employees who are already in active chats
                    const isInActiveChat = chatSessions.some(session => 
                      (session.requester_id === emp.id || session.responder_id === emp.id)
                    );
                    return !isInActiveChat;
                  }).map(emp => {
                    const isActive =
                      selectedEmployee?.id === emp.id ||
                      selectedSession?.requester_id === emp.id ||
                      selectedSession?.responder_id === emp.id;
                    return (
                      <button
                        key={emp.id}
                        onClick={() => handleEmployeeSelect(emp)}
                        className={`
                          w-full flex items-center gap-2 px-2.5 py-2.5
                          hover:bg-white border-b border-gray-100 transition-colors text-left
                          ${isActive ? 'bg-yellow-50 border-l-[3px] border-l-yellow-500' : ''}
                        `}
                      >
                        <div className="w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate text-gray-800">{emp.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{emp.role || 'Employee'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Chat Sessions with Unread Count */}
              {chatSessions.length > 0 && (
                <div className="border-t border-gray-200">
                  <div className="px-2.5 py-1.5 bg-gray-100">
                    <span className="text-[10px] font-semibold text-gray-600">Active Chats</span>
                  </div>
                  {chatSessions.map(session => {
                    const partnerName = session.requester_id === sessionUser?.id 
                      ? session.responder_name 
                      : session.requester_name;
                    const partnerId = session.requester_id === sessionUser?.id 
                      ? session.responder_id 
                      : session.requester_id;
                    const isActive = selectedSession?.id === session.id;
                    const unreadCount = session.unread_count || 0;
                    
                    return (
                      <button
                        key={session.id}
                        onClick={() => {
                          setSelectedSession(session);
                          setSelectedEmployee(null);
                          setSidebarOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-2 px-2.5 py-2
                          hover:bg-white border-b border-gray-100 transition-colors text-left
                          ${isActive ? 'bg-yellow-50 border-l-[3px] border-l-yellow-500' : ''}
                        `}
                      >
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                          {partnerName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate text-gray-800">{partnerName}</div>
                          <div className="text-[9px] text-gray-400 truncate">
                            {session.last_message?.substring(0, 20) || 'No messages'}...
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center flex-shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {loadingEmployees ? (
                <p className="text-center py-5 text-xs text-gray-400">Loading...</p>
              ) : chatSessions.length === 0 && availableEmployees.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-400 px-3">
                  {searchEmployee ? 'No results' : 'No employees'}
                </p>
              ) : null}
            </div>
          </div>

          {/* ══ CHAT AREA ══ */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            {isChatOpen ? (
              <>
                {/* Sub-header */}
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b bg-gray-50">
                  <div className="w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {chatPartnerName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate">{chatPartnerName}</div>
                    <div className="text-[10px] text-gray-400">
                      {selectedSession?.status === 'pending' ? '⏳ Pending'
                        : selectedSession?.status === 'active' ? '🟢 Active'
                        : '💬 Starting...'}
                    </div>
                  </div>
                  {/* Back button — clear selection */}
                  <button
                    onClick={() => { setSelectedEmployee(null); setSelectedSession(null); }}
                    className="text-gray-400 hover:text-gray-600 text-xs px-3 py-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0 font-medium"
                    aria-label="Back to employee list"
                  >
                    Back
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-gray-50">
                  {loadingMessages && (
                    <p className="text-center py-3 text-xs text-gray-400">Loading messages...</p>
                  )}
                  {selectedSession && (messages[selectedSession.id] || []).map((msg, i) => {
                    const isMine = msg.sender_id === sessionUser.id;
                    return (
                      <div key={`${msg.id}_${i}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                          max-w-[80%] px-3 py-1.5 rounded-2xl text-xs shadow-sm
                          ${isMine
                            ? 'bg-yellow-500 text-white rounded-br-sm'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}
                        `}>
                          <div className="break-words leading-relaxed">{msg.message}</div>
                          <div className={`text-[9px] mt-0.5 flex items-center gap-0.5 justify-end ${isMine ? 'text-yellow-100' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMine && (
                              <span className="ml-0.5">
                                {msg.status === 'sending' && '⏳'}
                                {msg.status === 'sent' && '✓'}
                                {msg.status === 'delivered' && '✓✓'}
                                {msg.status === 'read' && <span className="text-blue-200">✓✓</span>}
                                {msg.status === 'failed' && <span className="text-red-300">✕</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedSession && typingIndicators[selectedSession.id] && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-400 px-3 py-1.5 rounded-2xl text-xs border border-gray-200 italic">
                        {typingIndicators[selectedSession.id]} typing…
                      </div>
                    </div>
                  )}
                  {!selectedSession && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-gray-400">
                      <span className="text-3xl">💬</span>
                      <span className="text-xs">Starting chat with {selectedEmployee?.name}…</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0 p-2.5 border-t bg-white">
                  {selectedSession?.status === 'active' ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={e => { setNewMessage(e.target.value); handleTyping(true); }}
                        onKeyUp={() => handleTyping(false)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type a message…"
                        disabled={!socketConnected}
                        autoFocus
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !socketConnected}
                        className="bg-yellow-500 text-white p-2 rounded-full hover:bg-yellow-600 disabled:opacity-40 transition-colors flex-shrink-0"
                      >
                        <BiSend size={15} />
                      </button>
                    </div>
                  ) : selectedSession?.status === 'pending' ? (
                    <div className="text-center text-xs text-gray-500 py-2 bg-gray-50 rounded-xl px-3">
                      {selectedSession.responder_id === sessionUser?.id
                        ? '⏳ Accept or reject this request'
                        : '⏳ Waiting for response…'}
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && newMessage.trim() && selectedEmployee) {
                            e.preventDefault();
                            sendChatRequest(selectedEmployee.id, newMessage.trim());
                          }
                        }}
                        placeholder="Type to start chat…"
                        autoFocus
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
                      />
                      <button
                        onClick={() => { if (newMessage.trim() && selectedEmployee) sendChatRequest(selectedEmployee.id, newMessage.trim()); }}
                        disabled={!newMessage.trim()}
                        className="bg-yellow-500 text-white p-2 rounded-full hover:bg-yellow-600 disabled:opacity-40 transition-colors flex-shrink-0"
                      >
                        <BiSend size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* No chat selected — prompt to open sidebar */
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-4 bg-gray-50">
                <BiMessageRounded size={36} className="text-gray-300" />
                <p className="text-gray-500 text-xs font-medium">Select an employee to start chatting</p>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mt-1 px-4 py-2 bg-yellow-500 text-white text-xs rounded-full hover:bg-yellow-600 transition-colors font-semibold"
                >
                  👥 Open Employee List
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}