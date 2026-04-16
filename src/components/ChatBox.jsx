'use client';

import { useEffect, useRef, useState } from 'react';
import { BiChevronDown, BiMessageRounded, BiSend, BiUser, BiX, BiImage, BiPaperclip, BiFile, BiDownload } from 'react-icons/bi';
import { io } from 'socket.io-client';
import { playBeep, forceInitializeAudio, speakMessage } from '@/utils/sound';
import { initializeNotifications, showChatNotification, requestNotificationPermission } from '@/utils/notifications';
import { initializePWANotifications, showChatNotificationPWA, isPWAStandalone } from '@/utils/pwa-notifications';

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
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [ringing, setRinging] = useState(false);
  const ringIntervalRef = useRef(null);
  const pollingRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Initialize notifications on component mount
  useEffect(() => {
    if (isPWAStandalone()) {
      initializePWANotifications();
    } else {
      requestNotificationPermission();
      initializeNotifications();
    }
  }, []);

  // Initialize audio on component mount and user interactions
  useEffect(() => {
    const handleUserInteraction = () => {
      forceInitializeAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Stable Socket Connection
  useEffect(() => {
    if (!customerId) return;

    let socketInstance;

    const initialize = async () => {
      try { await fetch('/api/socket'); } catch (e) { }
      
      socketInstance = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        console.log('✅ Chat socket connected:', socketInstance.id);
        setConnected(true);
        socketInstance.emit('customer_join', { customerId, customerName });
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Chat socket disconnected');
        setConnected(false);
      });

      // Unified Message Handler
      const handleNewMessage = (data) => {
        const message = data.message || data;
        if (!message) return;

        console.log('📨 Message received via socket:', message);

        setMessages(prev => {
          // Robust deduplication
          const id = message.id || message.messageId;
          const tempId = message.tempId;
          
          const exists = prev.some(m => 
            (id && m.id === id) || 
            (tempId && m.tempId === tempId) ||
            (m.text === message.text && m.sender === message.sender && Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 1000)
          );

          if (exists) return prev;
          return [...prev, {
            ...message,
            id: id || message.id,
            text: message.text || message.message,
          }];
        });

        // Notifications
        if (!showChat) {
          playBeep();
          speakMessage("नया मैसेज आया है", "hi-IN");
          setUnreadCount(prev => prev + 1);
          
          const senderName = message.sender === 'employee' 
            ? (message.employee_name || 'Employee') 
            : (customerName || 'Customer');

          showChatNotification(senderName, message.text || message.message || 'New message')
            .catch(err => console.log('Notification error:', err));

          if (!ringing) {
            setRinging(true);
            if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
            ringIntervalRef.current = setInterval(() => {
              playBeep();
              speakMessage("नया मैसेज आया है", "hi-IN");
            }, 5000);
          }
        }
        
        scrollToBottom();
      };

      socketInstance.on('new_message', handleNewMessage);
      socketInstance.on('employee_message', handleNewMessage);
      
      setSocket(socketInstance);
    };

    initialize();

    return () => {
      if (socketInstance) socketInstance.disconnect();
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    };
  }, [customerId, customerName]);

  // Polling Fallback (Keep sync even if socket drops)
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    if (selectedEmployee && customerId) {
      pollingRef.current = setInterval(fetchMessages, 10000); // Every 10 seconds fallback
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedEmployee, customerId]);

  // Handle ringing stop
  useEffect(() => {
    if (showChat || unreadCount === 0) {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      setRinging(false);
    }
  }, [showChat, unreadCount]);

  // Listen for notification clicks to open chat
  useEffect(() => {
    const handleOpenChat = (e) => {
      setShowChat(true);
      if (e.detail?.customerId && e.detail.customerId === customerId) {
        // Already on this customer's chat
      }
    };
    window.addEventListener('openChatFromNotification', handleOpenChat);
    window.addEventListener('openEmployeeChat', handleOpenChat);
    return () => {
      window.removeEventListener('openChatFromNotification', handleOpenChat);
      window.removeEventListener('openEmployeeChat', handleOpenChat);
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
      markAsRead();
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
    try {
      const response = await fetch(`/api/chat/messages?customerId=${customerId}&employeeId=${selectedEmployee.id}`);
      const data = await response.json();
      if (data.success) {
        setMessages(prev => {
          const fresh = data.messages || [];
          const combined = [...prev, ...fresh];
          const seen = new Set();
          const unique = combined.filter(m => {
            const key = m.id || m.tempId;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
        scrollToBottom();
      }
    } catch (e) { console.error(e); }
  };

  const markAsRead = async () => {
    if (!customerId || !selectedEmployee) return;
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, userId: selectedEmployee.id, userType: 'customer' })
      });
    } catch (e) { }
  };

  const sendMessage = async (overrideText = null, isFile = false, filePath = null, fileType = 'text') => {
    const messageText = overrideText || newMessage.trim();
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
      message_type: fileType,
      file_path: filePath
    };

    setMessages(prev => [...prev, tempMessage]);
    if (!overrideText) setNewMessage('');
    scrollToBottom();

    try {
      const apiEndpoint = userRole === 'customer' ? '/api/chat/send-customer-message' : '/api/chat/send-message';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          text: messageText,
          employeeId: selectedEmployee.id,
          employeeName: userRole === 'employee' ? selectedEmployee.name : undefined,
          messageType: fileType,
          filePath: filePath
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => prev.map(msg => 
          msg.tempId === tempId ? { ...msg, id: data.messageId, status: 'sent', tempId: undefined } : msg
        ));
        
        socket.emit(userRole === 'customer' ? 'customer_message' : 'employee_message', {
          customerId,
          text: messageText,
          customerName,
          employeeId: selectedEmployee.id,
          employeeName: selectedEmployee.name,
          tempId: tempId,
          messageId: data.messageId,
          messageType: fileType,
          filePath: filePath
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => msg.tempId === tempId ? { ...msg, status: 'failed' } : msg));
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file || !selectedEmployee || !customerId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerId', customerId);

      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        const msgType = type === 'image' ? 'image' : 'file';
        await sendMessage(data.fileName || file.name, true, data.filePath, msgType);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('File upload failed');
    }
    setUploading(false);
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

  // Message Content Renderer
  const MessageContent = ({ msg }) => {
    const isMe = msg.sender === (userRole === 'customer' ? 'customer' : 'employee');
    
    if (msg.message_type === 'image' && msg.file_path) {
      return (
        <div className="space-y-1">
          <img 
            src={msg.file_path} 
            alt="Shared" 
            className="rounded-lg max-w-full max-h-48 cursor-pointer hover:opacity-90"
            onClick={() => window.open(msg.file_path, '_blank')}
          />
          {msg.text && <p className="text-sm">{msg.text}</p>}
        </div>
      );
    }

    if (msg.message_type === 'file' && msg.file_path) {
      return (
        <a 
          href={msg.file_path} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`flex items-center gap-2 p-2 rounded ${isMe ? 'bg-blue-700' : 'bg-gray-300'}`}
        >
          <BiFile className="text-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs truncate font-medium">{msg.text || 'File'}</p>
          </div>
          <BiDownload className="text-lg" />
        </a>
      );
    }

    return <p className="text-sm border-spacing-2">{msg.text}</p>;
  };

  return (
    <>
      {/* Hidden Inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0], 'image')} />
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0], 'file')} />

      {/* Chat Toggle */}
      <div className="fixed bottom-20 right-20 z-50">
        <button
          onClick={() => setShowChat(!showChat)}
          className="bg-blue-600 text-white rounded-full p-4 shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-110 relative"
        >
          <BiMessageRounded className="w-7 h-7" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce shadow-md">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat Window */}
      {showChat && (
        <div className="fixed bottom-32 right-6 sm:right-20 w-[calc(100vw-3rem)] sm:w-80 h-[500px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-50 flex flex-col overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {selectedEmployee ? selectedEmployee.name.charAt(0) : '?'}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{selectedEmployee ? selectedEmployee.name : 'MPCL Chat'}</h3>
                <p className="text-[10px] text-blue-100 uppercase tracking-wider">{connected ? 'Online' : 'Reconnecting...'}</p>
              </div>
            </div>
            <button onClick={() => setShowChat(false)} className="hover:bg-white/20 rounded-full p-1 transition"><BiX className="w-5 h-5" /></button>
          </div>

          {/* Employee Selection */}
          {!selectedEmployee && (
            <div className="p-6 flex-1 flex flex-col justify-center text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BiUser className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">Connect with Us</h4>
              <p className="text-sm text-gray-500 mb-6">Select an employee to start a conversation</p>
              <div className="relative">
                <select
                  onChange={(e) => {
                    const emp = employees.find(em => em.id == e.target.value);
                    if (emp) setSelectedEmployee(emp);
                  }}
                  className="w-full p-3 pl-4 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none bg-gray-50 text-gray-700"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
                <BiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {selectedEmployee && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col">
                {loading ? (
                  <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 px-4">
                    <p className="text-sm">No messages yet. Say hi! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender === (userRole === 'customer' ? 'customer' : 'employee');
                    return (
                      <div key={msg.id || msg.tempId || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                          isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                        }`}>
                          <MessageContent msg={msg} />
                          <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'text-blue-100 justify-end' : 'text-gray-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && <span className="text-[8px]">{msg.status === 'sending' ? '⌛' : '✓'}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-2">
                     <button 
                      onClick={() => imageInputRef.current.click()}
                      className="p-2 text-gray-400 hover:text-blue-600 transition"
                      title="Send Image"
                    >
                      <BiImage className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      rows={1}
                      placeholder="Type message..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 resize-none max-h-32 text-sm"
                      disabled={sending || uploading}
                    />
                  </div>
                  <button
                    onClick={() => sendMessage()}
                    disabled={(!newMessage.trim() && !uploading) || sending}
                    className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200"
                  >
                    <BiSend className="w-5 h-5" />
                  </button>
                </div>
                {uploading && <div className="mt-2 h-1 w-full bg-blue-100 rounded-full overflow-hidden leading-snug"><div className="h-full bg-blue-600 animate-progress"></div></div>}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
