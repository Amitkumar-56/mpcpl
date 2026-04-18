'use client';

import { useSession } from '@/context/SessionContext';
import { initializeNotifications, showChatNotification, requestNotificationPermission } from '@/utils/notifications';
import { initializePWANotifications, showChatNotificationPWA, isPWAStandalone } from '@/utils/pwa-notifications';
import { forceInitializeAudio, playBeep } from '@/utils/sound';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BiArrowBack, BiCheck, BiCheckDouble, BiFile, BiImage,
  BiMenu, BiMessageRounded, BiPaperclip, BiSearch,
  BiSend, BiTime, BiX, BiDownload
} from 'react-icons/bi';
import { io } from 'socket.io-client';

const POLL_INTERVAL = 8000;
const SESSION_POLL_INTERVAL = 30000;

// ─── Deduplication Utility ──────────────────────────────
const deduplicateMessages = (msgs) => {
  const seen = new Map();
  const result = [];
  for (const msg of msgs) {
    // Always keep temp messages (they have temp_ prefix)
    if (String(msg.id).startsWith('temp_')) {
      result.push(msg);
      continue;
    }
    // Deduplicate by ID
    const idKey = String(msg.id);
    if (seen.has(idKey)) continue;
    // Also check for content duplicates (same sender + message within 2 seconds)
    const contentKey = `${msg.sender_id}_${msg.message}_${msg.message_type || 'text'}`;
    const existingTime = seen.get(contentKey);
    if (existingTime && Math.abs(new Date(msg.created_at) - existingTime) < 2000) {
      continue; // Skip content duplicate
    }
    seen.set(idKey, true);
    seen.set(contentKey, new Date(msg.created_at));
    result.push(msg);
  }
  return result;
};

// ─── Status Tick Component ──────────────────────────────
const StatusTick = ({ status }) => {
  switch (status) {
    case 'sending': return <BiTime className="inline text-[10px] opacity-60" />;
    case 'sent': return <BiCheck className="inline text-[11px]" />;
    case 'delivered': return <BiCheckDouble className="inline text-[11px]" />;
    case 'read': return <BiCheckDouble className="inline text-[11px] text-blue-400" />;
    case 'failed': return <span className="text-red-400 text-[10px] font-bold">!</span>;
    default: return <BiCheck className="inline text-[10px]" />;
  }
};

// ─── Message Content Renderer ───────────────────────────
const MessageContent = ({ msg }) => {
  if (msg.message_type === 'image' && msg.file_path) {
    return (
      <div>
        <img
          src={msg.file_path}
          alt="Shared"
          className="max-w-full rounded-lg max-h-52 cursor-pointer object-cover hover:opacity-90 transition-opacity"
          onClick={() => window.open(msg.file_path, '_blank')}
          loading="lazy"
        />
        {msg.message && !msg.message.startsWith('temp_') && (
          <p className="mt-1.5 text-xs break-words">{msg.message}</p>
        )}
      </div>
    );
  }

  if (msg.message_type === 'file' && msg.file_path) {
    return (
      <a
        href={msg.file_path}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
          <BiFile className="text-red-500 text-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{msg.message || 'Document'}</p>
          <p className="text-[10px] opacity-60">PDF Document</p>
        </div>
        <BiDownload className="text-sm opacity-50 flex-shrink-0" />
      </a>
    );
  }

  return <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.message}</p>;
};


export default function EmployeeChatDashboard({ showChat, setShowChat, setEmployeeChatNotifCount }) {
  const { user } = useSession();

  // ── State ─────────────────────────────────────────────
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [typingMap, setTypingMap] = useState({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // ── Refs ───────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pollingRef = useRef(null);
  const sessionPollingRef = useRef(null);
  const activeSessionRef = useRef(null);
  const showChatRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  // Forward unread count to parent
  useEffect(() => {
    if (typeof setEmployeeChatNotifCount === 'function') {
      setEmployeeChatNotifCount(unreadCount);
    }
  }, [unreadCount, setEmployeeChatNotifCount]);

  // ── SCROLLING ──────────────────────────────────────────
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Scroll on session change or new messages
  useEffect(() => {
    if (activeSession) {
      scrollToBottom(messages[activeSession.id]?.length > 20 ? 'auto' : 'smooth');
    }
  }, [activeSession, messages, scrollToBottom]);

  // Audio initialization on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      forceInitializeAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // ── API HELPERS ────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return [];
    try {
      const res = await fetch('/api/employee-chat/sessions');
      if (!res.ok) return [];
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
        const total = (data.sessions || []).reduce((sum, s) => sum + (s.unread_count || 0), 0);
        setUnreadCount(total);
        return data.sessions;
      }
    } catch { /* ignore */ }
    return [];
  }, [user?.id]);

  const fetchMessages = useCallback(async (sessionId) => {
    if (!user?.id || !sessionId) return [];
    try {
      const res = await fetch(`/api/employee-chat/messages?sessionId=${sessionId}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (data.success) return data.messages || [];
    } catch { /* ignore */ }
    return [];
  }, [user?.id]);

  const fetchEmployees = useCallback(async () => {
    if (!user?.id) return;
    setLoadingEmployees(true);
    try {
      const url = search
        ? `/api/employee-chat/employees?search=${encodeURIComponent(search)}`
        : '/api/employee-chat/employees';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmployees((data.employees || []).filter(e => String(e.id) !== String(user.id)));
        }
      }
    } catch { /* ignore */ }
    setLoadingEmployees(false);
  }, [user?.id, search]);

  const markAsRead = useCallback(async (sessionId) => {
    if (!user?.id || !sessionId) return;
    try {
      const res = await fetch('/api/employee-chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, employeeId: user.id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          fetchSessions();
          // Emit via socket so sender gets blue ticks
          if (socket?.connected) {
            socket.emit('employee_chat_mark_read', {
              sessionId,
              employeeId: String(user.id)
            });
          }
        }
      }
    } catch { /* ignore */ }
  }, [user?.id, socket, fetchSessions]);

  // ── LOAD MESSAGES ──────────────────────────────────────

  const loadMessagesForSession = useCallback(async (sessionId) => {
    setLoadingMessages(true);
    const msgs = await fetchMessages(sessionId);
    setMessages(prev => {
      const tempMsgs = (prev[sessionId] || []).filter(m => String(m.id).startsWith('temp_'));
      const filteredTemps = tempMsgs.filter(temp =>
        !msgs.some(f => f.message === temp.message && String(f.sender_id) === String(temp.sender_id))
      );
      return { ...prev, [sessionId]: [...msgs, ...filteredTemps] };
    });
    setLoadingMessages(false);
  }, [fetchMessages]);

  // ── SOCKET SETUP ───────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    // Initialize notifications (only SW registration, don't request permission here as it will be blocked)
    (async () => {
      if (typeof window !== 'undefined') {
        await initializeNotifications();
        forceInitializeAudio();
      }
    })();

    let socketInstance;

    const init = async () => {
      try {
        await fetch('/api/socket');
        socketInstance = io({
          path: '/api/socket',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        socketInstance.on('connect', () => {
          console.log('🟢 Chat socket connected:', socketInstance.id);
          setSocket(socketInstance);
          setConnected(true);
          socketInstance.emit('employee_join', {
            employeeId: String(user.id),
            employeeName: user.name || 'Employee',
            role: user.role,
          });
        });

        socketInstance.on('connect_error', () => setConnected(false));
        socketInstance.on('disconnect', () => setConnected(false));

        // ── Real-time message from another employee ──
        socketInstance.on('employee_chat_message_received', (msg) => {
          console.log('📨 Chat message received:', msg);
          const sessionId = msg.session_id;
          const senderName = msg.sender_name || 'Employee';
          const text = msg.message || 'New message';

          // Deduplicate and add message to state
          setMessages(prev => {
            const current = prev[sessionId] || [];
            const exists = current.some(m =>
              m.id === msg.id ||
              (m.message === msg.message && String(m.sender_id) === String(msg.sender_id) &&
                Math.abs(new Date(m.created_at) - new Date(msg.created_at)) < 2000)
            );
            if (exists) return prev;
            return { ...prev, [sessionId]: [...current, msg] };
          });

          // Send delivery confirmation
          socketInstance.emit('employee_chat_delivered', {
            messageIds: [msg.id],
            senderId: String(msg.sender_id),
            sessionId: sessionId
          });

          // ALWAYS play notification sound for incoming messages (debounce prevents double from Header)
          playBeep();

          // Show browser notification
          if (isPWAStandalone()) {
            showChatNotificationPWA(senderName, text, {
              tag: `emp-chat-${senderName}`,
              renotify: true
            }).catch(() => { });
          } else {
            showChatNotification(senderName, text).catch(() => { });
          }

          // If viewing this session, mark as read; otherwise increment unread
          if (activeSessionRef.current?.id === sessionId && showChatRef.current) {
            markAsRead(sessionId);
          } else {
            setUnreadCount(p => p + 1);
          }

          // Refresh sessions list
          fetchSessions();
        });

        // ── Message status updates (delivered / read) ──
        socketInstance.on('employee_chat_status_update', (data) => {
          const { sessionId, messageIds, status } = data;
          if (!messageIds || !sessionId) return;
          setMessages(prev => {
            const current = prev[sessionId];
            if (!current) return prev;
            return {
              ...prev,
              [sessionId]: current.map(m =>
                messageIds.includes(m.id) ? { ...m, status } : m
              )
            };
          });
        });

        // ── Messages read by other party (blue ticks) ──
        socketInstance.on('employee_chat_messages_read', (data) => {
          const { sessionId, readBy } = data;
          if (!sessionId) return;
          setMessages(prev => {
            const current = prev[sessionId];
            if (!current) return prev;
            return {
              ...prev,
              [sessionId]: current.map(m =>
                String(m.sender_id) === String(user.id) && String(m.receiver_id) === String(readBy)
                  ? { ...m, status: 'read' }
                  : m
              )
            };
          });
          fetchSessions();
        });

        // ── Chat request received ──
        socketInstance.on('employee_chat_request_received', (session) => {
          fetchSessions();
          playBeep();
          const name = session.requester_name || 'Employee';
          if (isPWAStandalone()) {
            showChatNotificationPWA(name, 'Wants to chat with you', { tag: 'chat-request', renotify: true }).catch(() => { });
          } else {
            showChatNotification(name, 'Wants to chat with you').catch(() => { });
          }
        });

        // ── Chat response received ──
        socketInstance.on('employee_chat_response_received', (data) => {
          fetchSessions();
          if (data.action === 'accept' && activeSessionRef.current?.id === data.sessionId) {
            loadMessagesForSession(data.sessionId);
          }
        });

        // ── Typing indicators ──
        socketInstance.on('employee_chat_typing_indicator', (data) => {
          setTypingMap(p => ({ ...p, [data.sessionId]: data.isTyping ? data.senderName : null }));
          if (data.isTyping) {
            setTimeout(() => setTypingMap(p => ({ ...p, [data.sessionId]: null })), 3000);
          }
        });

      } catch (err) {
        console.error('Socket init error:', err);
        setConnected(false);
      }
    };

    init();
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        setConnected(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── POLLING ────────────────────────────────────────────

  // Poll messages for active session (real-time fallback)
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    if (showChat && activeSession?.id && user?.id) {
      const poll = async () => {
        const fresh = await fetchMessages(activeSession.id);
        if (fresh.length > 0) {
          setMessages(prev => {
            const current = prev[activeSession.id] || [];
            const tempMsgs = current.filter(m => String(m.id).startsWith('temp_'));
            const filteredTemps = tempMsgs.filter(temp =>
              !fresh.some(f => f.message === temp.message && String(f.sender_id) === String(temp.sender_id))
            );
            return { ...prev, [activeSession.id]: [...fresh, ...filteredTemps] };
          });
        }
      };
      pollingRef.current = setInterval(poll, POLL_INTERVAL);
    }

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [showChat, activeSession?.id, user?.id, fetchMessages]);

  // Poll sessions periodically
  useEffect(() => {
    if (sessionPollingRef.current) clearInterval(sessionPollingRef.current);
    if (user?.id) {
      sessionPollingRef.current = setInterval(fetchSessions, SESSION_POLL_INTERVAL);
    }
    return () => { if (sessionPollingRef.current) clearInterval(sessionPollingRef.current); };
  }, [user?.id, fetchSessions]);

  // ── SEND MESSAGE ───────────────────────────────────────

  const sendMessage = async (messageText, messageType = 'text', filePath = null) => {
    const text = messageText?.trim();
    if (!text || !activeSession || !user?.id) return;

    const receiverId = activeSession.requester_id === user.id
      ? activeSession.responder_id
      : activeSession.requester_id;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Optimistic update
    const optimisticMsg = {
      id: tempId,
      session_id: activeSession.id,
      sender_id: user.id,
      receiver_id: receiverId,
      message: text,
      message_type: messageType,
      file_path: filePath,
      status: 'sending',
      created_at: new Date().toISOString(),
      sender_name: user.name,
    };

    setMessages(prev => ({
      ...prev,
      [activeSession.id]: [...(prev[activeSession.id] || []), optimisticMsg]
    }));
    setInput('');

    try {
      // Save via HTTP POST (single source of truth)
      const res = await fetch('/api/employee-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          message: text,
          messageType,
          filePath
        })
      });

      if (!res.ok) throw new Error('Failed to send');

      const result = await res.json();
      if (!result.success || !result.message) throw new Error('Failed to send');

      const savedMsg = result.message;

      // Replace temp message with saved one (status: sent = single tick)
      setMessages(prev => ({
        ...prev,
        [activeSession.id]: (prev[activeSession.id] || []).map(m =>
          m.id === tempId ? { ...savedMsg, status: 'sent' } : m
        )
      }));

      // Broadcast via socket for instant delivery to receiver
      if (socket?.connected) {
        socket.emit('employee_chat_message', {
          sessionId: activeSession.id,
          senderId: String(user.id),
          receiverId: String(receiverId),
          message: text,
          messageType,
          savedMessageId: savedMsg.id,
          savedMessage: { ...savedMsg, status: 'sent', sender_name: user.name }
        });
      }

    } catch (error) {
      console.error('Send message failed:', error);
      setMessages(prev => ({
        ...prev,
        [activeSession.id]: (prev[activeSession.id] || []).map(m =>
          m.id === tempId ? { ...m, status: 'failed' } : m
        )
      }));
    }
  };

  // ── FILE UPLOAD ────────────────────────────────────────

  const handleFileUpload = async (file, type) => {
    if (!file || !activeSession) return;
    setUploadingFile(true);
    setShowAttachMenu(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', String(activeSession.id));

      const res = await fetch('/api/employee-chat/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (!data.success) throw new Error('Upload failed');

      const msgType = type === 'image' ? 'image' : 'file';
      await sendMessage(data.fileName || file.name, msgType, data.filePath);

    } catch (error) {
      console.error('Upload error:', error);
      alert('File upload failed. Please try again.');
    }
    setUploadingFile(false);
  };

  // ── START CHAT ─────────────────────────────────────────

  const startChat = async (employeeId) => {
    if (!user?.id || String(employeeId) === String(user.id)) return;
    try {
      const res = await fetch('/api/employee-chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responderId: employeeId, requestMessage: 'Hello!' })
      });
      const result = await res.json();
      if (result.success && result.session) {
        setActiveSession(result.session);
        setSidebarOpen(false);
        await fetchSessions();
      }
    } catch (error) {
      console.error('Start chat error:', error);
    }
  };

  // ── TYPING ─────────────────────────────────────────────

  const handleTyping = () => {
    if (!activeSession || !socket?.connected) return;
    const receiverId = activeSession.requester_id === user.id
      ? activeSession.responder_id
      : activeSession.requester_id;

    socket.emit('employee_chat_typing', {
      sessionId: activeSession.id,
      receiverId: String(receiverId),
      isTyping: true,
      senderName: user.name
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('employee_chat_typing', {
        sessionId: activeSession.id,
        receiverId: String(receiverId),
        isTyping: false,
        senderName: user.name
      });
    }, 2000);
  };

  // ── EFFECTS ────────────────────────────────────────────

  // Load data when chat opens
  useEffect(() => {
    if (showChat && user?.id) {
      fetchSessions();
      fetchEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChat, user?.id]);

  // Reload employees on search change
  useEffect(() => {
    if (showChat && user?.id) fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Load messages when active session changes
  useEffect(() => {
    if (activeSession?.id && user?.id) {
      loadMessagesForSession(activeSession.id);
      markAsRead(activeSession.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSession?.id]);

  // Listen for notification click events to open specific chat
  useEffect(() => {
    const handleOpenChat = (e) => {
      if (!showChat) setShowChat(true);
      if (e.detail?.sessionId) {
        const session = sessions.find(s => s.id === e.detail.sessionId);
        if (session) { setActiveSession(session); setSidebarOpen(false); }
      } else if (e.detail?.senderId) {
        const session = sessions.find(s =>
          s.requester_id === e.detail.senderId || s.responder_id === e.detail.senderId
        );
        if (session) { setActiveSession(session); setSidebarOpen(false); }
      }
    };
    window.addEventListener('openEmployeeChat', handleOpenChat);
    return () => window.removeEventListener('openEmployeeChat', handleOpenChat);
  }, [showChat, sessions, setShowChat]);

  // ── RENDER ─────────────────────────────────────────────

  if (!showChat) return null;

  const chatPartner = activeSession
    ? (activeSession.requester_id === user?.id
      ? { name: activeSession.responder_name, id: activeSession.responder_id }
      : { name: activeSession.requester_name, id: activeSession.requester_id })
    : null;

  const activeMessages = activeSession ? deduplicateMessages(messages[activeSession.id] || []) : [];
  const isChatActive = activeSession?.status === 'active';

  return (
    <>
      {/* Backdrop on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Hidden file inputs ── */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={e => {
          if (e.target.files[0]) handleFileUpload(e.target.files[0], 'image');
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => {
          if (e.target.files[0]) handleFileUpload(e.target.files[0], 'file');
          e.target.value = '';
        }}
      />

      {/* ── MAIN CHAT WINDOW ── */}
      <div className="
        fixed z-50
        bottom-0 left-0 right-0
        sm:bottom-4 sm:right-4 sm:left-auto
        w-full sm:w-[460px]
        h-[75vh] sm:h-[540px]
        bg-white rounded-t-2xl sm:rounded-2xl
        shadow-2xl border border-gray-200/80
        flex flex-col overflow-hidden
      " style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-4"
          style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex-shrink-0 text-white shadow-inner"
              aria-label="Toggle employee list"
            >
              <BiMenu size={20} />
            </button>

            {activeSession && chatPartner ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-sm flex-shrink-0 ring-2 ring-white/30 shadow-lg">
                  {chatPartner.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm text-white truncate tracking-tight">{chatPartner.name}</p>
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-0.5">
                    {typingMap[activeSession.id]
                      ? <span className="animate-pulse">typing...</span>
                      : connected ? 'Interactive' : 'Connecting'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <BiMessageRounded size={20} />
                </div>
                <span className="font-black text-sm text-white uppercase tracking-widest">Colleagues</span>
              </div>
            )}

            {unreadCount > 0 && !activeSession && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const unreadSession = sessions.find(s => (s.unread_count || 0) > 0);
                  if (unreadSession) {
                    setActiveSession(unreadSession);
                    setSidebarOpen(false);
                  } else {
                    setSidebarOpen(true);
                  }
                }}
                className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0 animate-pulse hover:bg-red-600 transition-colors"
              >
                {unreadCount}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'} border-2 border-white/20 shadow-sm`}></div>
            <button
              onClick={() => { setShowChat(false); }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-white"
              aria-label="Close chat"
            >
              <BiX size={24} />
            </button>
          </div>
        </div>

        {/* ── Notification Permission Banner ── */}
        {typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission !== 'granted' && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">🔔</span>
              <p className="text-[11px] text-yellow-800 font-medium leading-tight truncate">
                {window.Notification.permission === 'denied'
                  ? 'Notifications are blocked in browser'
                  : 'Enable notifications for chat alerts'}
              </p>
            </div>
            <button
              onClick={async () => {
                if (window.Notification.permission === 'denied') {
                  alert("Notifications are blocked. Please click the Lock icon in your browser address bar to allow them.");
                } else {
                  await requestNotificationPermission();
                  window.location.reload(); // Refresh to update all states
                }
              }}
              className="px-2 py-1 bg-yellow-600 text-white text-[10px] font-bold rounded hover:bg-yellow-700 whitespace-nowrap"
            >
              {window.Notification.permission === 'denied' ? 'Details' : 'Enable'}
            </button>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">

          {/* ══ SIDEBAR ══ */}
          <div className={`
            flex-col bg-gray-50 border-r border-gray-200 z-30
            absolute inset-y-0 left-0
            w-[220px]
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}
            sm:relative sm:flex sm:translate-x-0 sm:w-[190px]
          `}>
            {/* Sidebar Header */}
            <div className="p-2.5 border-b bg-white flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs text-gray-700">Contacts</span>
                <button onClick={() => setSidebarOpen(false)} className="sm:hidden text-gray-400 hover:text-gray-600" aria-label="Close sidebar">
                  <BiX size={16} />
                </button>
              </div>
              <div className="relative">
                <BiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                />
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">

              {/* Active Chats Section */}
              {sessions.length > 0 && (
                <div>
                  <div className="px-2.5 py-1.5 bg-emerald-50 border-b">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Recent Chats</span>
                  </div>
                  {sessions.map(session => {
                    const partnerName = session.requester_id === user?.id ? session.responder_name : session.requester_name;
                    const isActive = activeSession?.id === session.id;
                    const unread = session.unread_count || 0;
                    const lastMsg = session.last_message;

                    return (
                      <button
                        key={session.id}
                        onClick={() => {
                          setActiveSession(session);
                          setSidebarOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-2.5 px-2.5 py-3
                          border-b border-gray-100/80 transition-all text-left
                          ${isActive ? 'bg-emerald-50 border-l-[3px] border-l-emerald-500' : 'hover:bg-gray-100'}
                          ${unread > 0 ? 'bg-emerald-50/50' : ''}
                        `}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${isActive ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-emerald-500'}`}>
                          {partnerName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{partnerName}</p>
                            {unread > 0 && (
                              <span className="bg-emerald-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center flex-shrink-0 ml-1">
                                {unread}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {lastMsg ? lastMsg.substring(0, 25) + (lastMsg.length > 25 ? '...' : '') : 'No messages yet'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* All Employees Section */}
              {(() => {
                const filteredEmps = employees.filter(emp => {
                  return !sessions.some(session =>
                    session.requester_id === emp.id || session.responder_id === emp.id
                  );
                });

                return filteredEmps.length > 0 && (
                  <div>
                    <div className="px-2.5 py-1.5 bg-gray-100 border-b">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">All Employees</span>
                    </div>
                    {filteredEmps.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          startChat(emp.id);
                          setSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2.5 hover:bg-emerald-50 border-b border-gray-100/60 transition-colors text-left"
                      >
                        <div className="w-7 h-7 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate text-gray-800">{emp.name}</p>
                          <p className="text-[10px] text-gray-400">{emp.role || 'Employee'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {loadingEmployees && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {!loadingEmployees && sessions.length === 0 && employees.length === 0 && (
                <p className="text-center py-8 text-xs text-gray-400 px-3">
                  {search ? 'No results found' : 'No employees available'}
                </p>
              )}
            </div>
          </div>

          {/* ══ CHAT AREA ══ */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            {activeSession ? (
              <>
                {/* Chat sub-header */}
                <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b bg-gray-50/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {chatPartner?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate text-gray-900">{chatPartner?.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {activeSession.status === 'pending' ? '⏳ Pending approval'
                          : activeSession.status === 'active' ? '🟢 Active chat'
                            : '💬 Chat'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveSession(null); }}
                    className="text-gray-400 hover:text-gray-600 text-xs px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0 font-medium flex items-center gap-1"
                    aria-label="Back"
                  >
                    <BiArrowBack size={12} />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 50% 50%, #f0fdf4 0%, #f9fafb 100%)',
                    backgroundSize: '100% 100%'
                  }}>

                  {loadingMessages && (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  {activeMessages.length === 0 && !loadingMessages && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-gray-400">
                      <span className="text-4xl">💬</span>
                      <span className="text-xs">No messages yet. Say hello!</span>
                    </div>
                  )}

                  {activeMessages.map((msg, i) => {
                    const isMine = String(msg.sender_id) === String(user.id);
                    return (
                      <div key={`${msg.id}_${i}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                          max-w-[78%] px-3 py-2 rounded-2xl text-xs relative
                          ${isMine
                            ? 'bg-emerald-500 text-white rounded-br-md shadow-sm'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'}
                          ${msg.status === 'failed' ? 'opacity-60 border-2 border-red-300' : ''}
                          ${msg.message_type === 'image' || msg.message_type === 'file' ? 'p-1.5' : ''}
                        `}>
                          <MessageContent msg={msg} />
                          <div className={`flex items-center gap-1 justify-end mt-1 ${isMine ? 'text-emerald-100' : 'text-gray-400'}`}>
                            <span className="text-[9px]">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMine && (
                              <span className="ml-0.5">
                                <StatusTick status={msg.status} />
                              </span>
                            )}
                          </div>
                          {msg.status === 'failed' && (
                            <button
                              onClick={() => sendMessage(msg.message, msg.message_type, msg.file_path)}
                              className="text-[9px] text-red-200 underline mt-0.5 hover:text-white"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {activeSession && typingMap[activeSession.id] && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-400 px-3 py-2 rounded-2xl text-xs border border-gray-200 rounded-bl-md shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="italic">{typingMap[activeSession.id]}</span>
                          <span className="flex gap-0.5">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* ── Message Input ── */}
                <div className="flex-shrink-0 p-2.5 border-t bg-white">
                  {isChatActive ? (
                    <div className="flex gap-2 items-end">
                      {/* Attachment button */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setShowAttachMenu(p => !p)}
                          disabled={uploadingFile}
                          className={`p-2 rounded-full transition-colors ${showAttachMenu ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400 hover:text-emerald-500 hover:bg-gray-100'}`}
                          aria-label="Attach file"
                        >
                          {uploadingFile ? (
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <BiPaperclip size={18} className="rotate-45" />
                          )}
                        </button>

                        {/* Attachment menu popup */}
                        {showAttachMenu && (
                          <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 w-36 z-10 animate-in fade-in">
                            <button
                              onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-gray-700 hover:bg-emerald-50 transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                                <BiImage className="text-blue-500 text-sm" />
                              </div>
                              <span className="font-medium">Photo</span>
                            </button>
                            <button
                              onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-gray-700 hover:bg-emerald-50 transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                                <BiFile className="text-red-500 text-sm" />
                              </div>
                              <span className="font-medium">PDF</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Text input */}
                      <input
                        type="text"
                        value={input}
                        onChange={e => { setInput(e.target.value); handleTyping(); }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                            e.preventDefault();
                            sendMessage(input);
                          }
                        }}
                        placeholder="Type a message..."
                        disabled={!connected}
                        autoFocus
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 disabled:opacity-50"
                      />

                      {/* Send button */}
                      <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || !connected}
                        className="bg-emerald-500 text-white p-2.5 rounded-full hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 transition-all flex-shrink-0 shadow-sm active:scale-95"
                      >
                        <BiSend size={16} />
                      </button>
                    </div>
                  ) : activeSession?.status === 'pending' ? (
                    <div className="text-center text-xs text-gray-500 py-3 bg-amber-50 rounded-xl px-3 border border-amber-200">
                      {activeSession.responder_id === user?.id
                        ? '⏳ Accept this chat request to start messaging'
                        : '⏳ Waiting for the other person to accept...'}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-gray-400 py-3">
                      Chat session not active
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── No chat selected ── */
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6"
                style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #f9fafb 100%)' }}>
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <BiMessageRounded size={28} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-gray-700 text-sm font-semibold">Employee Chat</p>
                  <p className="text-gray-400 text-xs mt-1">Select a contact to start chatting</p>
                </div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mt-2 px-5 py-2.5 bg-emerald-500 text-white text-xs rounded-full hover:bg-emerald-600 transition-all font-semibold shadow-sm active:scale-95"
                >
                  👥 Browse Contacts
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}