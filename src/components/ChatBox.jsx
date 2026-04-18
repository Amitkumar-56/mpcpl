'use client';

import { useEffect, useRef, useState } from 'react';
import { BiChevronDown, BiMessageRounded, BiSend, BiUser, BiX, BiImage, BiPaperclip, BiFile, BiDownload } from 'react-icons/bi';
import { io } from 'socket.io-client';
import { playBeep, forceInitializeAudio, speakMessage } from '@/utils/sound';
import { initializeNotifications, showChatNotification, requestNotificationPermission } from '@/utils/notifications';
import { toast } from 'react-hot-toast';

export default function ChatBox({ customerId, customerName, userRole = 'customer' }) {
  const [showChat, setShowChat] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (showChat) scrollToBottom();
  }, [messages, showChat]);

  // Master Socket Effect
  useEffect(() => {
    if (!customerId) return;

    let isMounted = true;
    const init = async () => {
      try {
        await fetch('/api/socket');
        if (!isMounted) return;

        const s = io({
          path: '/api/socket',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          timeout: 20000
        });

        socketRef.current = s;

        s.on('connect', () => {
          console.log('✅ Chat Connected');
          setConnected(true);
          s.emit('customer_join', { customerId, customerName });
        });

        s.on('disconnect', () => {
          console.log('❌ Chat Disconnected');
          setConnected(false);
        });

        // The unified message listener (from HTTP API broadcasts)
        s.on('new_message', (data) => {
          const msg = data.message || data;
          if (!msg) return;

          setMessages(prev => {
            // If we have an optimistic message with same text sent recently, replace it
            const existingIdx = prev.findIndex(m => 
              m.status === 'sending' && m.text === msg.text
            );

            if (existingIdx !== -1) {
              const updated = [...prev];
              updated[existingIdx] = { ...msg, status: 'sent' };
              return updated;
            }

            // Otherwise, check for duplicates by ID
            if (prev.some(m => m.id === msg.id)) return prev;

            // Add new message
            if (msg.sender !== (userRole === 'customer' ? 'customer' : 'employee')) {
              playBeep();
              speakMessage("New message", "en-US");
              showChatNotification(msg.employee_name || 'Staff', msg.text || 'Message');
            }
            return [...prev, { ...msg, status: 'sent' }];
          });
        });

        // Backup listener just in case
        s.on('employee_message', (data) => {
           // Handle if needed
        });
      } catch (err) {
        console.error('Socket init failed', err);
      }
    };

    init();
    return () => {
      isMounted = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [customerId, customerName, userRole]);

  useEffect(() => {
    if (showChat && customerId) {
       // Fetch initial history
       setLoading(true);
       fetch(`/api/chat/get-messages?customerId=${customerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setMessages(data.messages);
          setLoading(false);
        });
    }
  }, [showChat, customerId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !customerId) return;

    const text = newMessage.trim();
    const tempId = Date.now();
    
    // 1. OPTIMISTIC UPDATE (NO DELAY)
    const optimisticMsg = {
      id: tempId,
      text: text,
      sender: userRole === 'customer' ? 'customer' : 'employee',
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setSending(true);

    try {
      const endpoint = userRole === 'customer' ? '/api/chat/send-customer-message' : '/api/chat/send-message';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          text: text,
          employeeId: selectedEmployee?.id || 1, // Default or selected
          customerName: customerName
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error();
      
      // We don't need to manually update state here because 
      // the server's BROADCAST will be caught by the 'new_message' listener
      // and will replace our 'sending' message.
    } catch (err) {
      toast.error('Failed to send');
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
    } finally {
      setSending(false);
    }
  };

  if (!showChat) {
    return (
      <div className="fixed bottom-6 right-6 z-[60]">
        <button onClick={() => { setShowChat(true); forceInitializeAudio(); }} className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform">
          <BiMessageRounded className="text-3xl" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-96 max-w-[95vw] h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
      <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="font-bold">MPCL Support</span>
        </div>
        <button onClick={() => setShowChat(false)}><BiX className="text-2xl" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMe = msg.sender === (userRole === 'customer' ? 'customer' : 'employee');
          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                {msg.text}
                <div className={`text-[9px] mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                  {msg.status === 'sending' ? 'Sending...' : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t flex gap-2">
        <input 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Type message..." 
          className="flex-1 px-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
        />
        <button onClick={handleSend} disabled={sending} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
          <BiSend className="text-xl" />
        </button>
      </div>
    </div>
  );
}
