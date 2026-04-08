'use client';



import { useSession } from '@/context/SessionContext';

import { useEffect, useRef, useState } from 'react';

import { BiSend, BiX } from 'react-icons/bi';

import { io } from 'socket.io-client';

import { initializeNotifications, showChatNotification, showChatRequestNotification } from '@/utils/notifications';
import { forceInitializeAudio, playBeep, speakMessage } from '@/utils/sound';



export default function ChatWidget({ showChat, setShowChat }) {

  const { user: sessionUser } = useSession();

  const [socket, setSocket] = useState(null);

  const [socketConnected, setSocketConnected] = useState(false);

  const [activeChats, setActiveChats] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [employeeMessages, setEmployeeMessages] = useState({});

  const [newMessage, setNewMessage] = useState('');

  const [loadingMessages, setLoadingMessages] = useState(false);

  const [notifCount, setNotifCount] = useState(() => {
    // Load notification count from localStorage on initial load
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatNotifCount');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // Calculate actual unread message count from active chats
  const calculateActualNotifCount = () => {
    const actualCount = activeChats.filter(chat => chat.unread).length;
    updateNotifCount(actualCount);
  };

  // Save notification count to localStorage whenever it changes
  const updateNotifCount = (newCount) => {
    setNotifCount(newCount);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatNotifCount', newCount.toString());
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('chatNotificationUpdate', { 
        detail: { count: newCount } 
      }));
    }
  };

  // Initialize notifications on component mount
  useEffect(() => {
    initializeNotifications();
    forceInitializeAudio();
  }, []);

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

  // Request notification permission on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      }
    }
  }, []);

  // Show browser notification for new messages
  const showBrowserNotification = (customerName, message) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      // Show notification even if page is visible, but not if actively viewing this chat
      if (selectedCustomer && selectedCustomer.customerName === customerName && showChat && !chatMinimized) return;
      
      // Use PWA notification utility
      showChatNotification(customerName, message);
    }
  };

  const messagesEndRef = useRef(null);

  const ringIntervalRef = useRef(null);

  const audioContextRef = useRef(null);

  const [chatMinimized, setChatMinimized] = useState(false);

  

  // Initialize audio context on first user interaction

  const initAudioContext = () => {

    if (!audioContextRef.current) {

      try {

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      } catch (error) {

        console.log('Audio context initialization failed:', error);

      }

    }

  };

  

  // Play notification sound

  const playNotificationSound = () => {

    try {

      // Try using the imported utility first

      playBeep();

      

      // Also try with audio context if available

      if (audioContextRef.current && audioContextRef.current.state === 'running') {

        const oscillator = audioContextRef.current.createOscillator();

        const gainNode = audioContextRef.current.createGain();

        

        oscillator.connect(gainNode);

        gainNode.connect(audioContextRef.current.destination);

        

        oscillator.frequency.value = 800;

        oscillator.type = 'sine';

        

        gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);

        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2);

        

        oscillator.start();

        oscillator.stop(audioContextRef.current.currentTime + 0.2);

      }

    } catch (error) {

      console.log('Sound play error:', error);

    }

  };



  // Initialize audio context on first user interaction

  useEffect(() => {

    const handleUserInteraction = () => {

      initAudioContext();

      // Remove event listeners after first interaction

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

  

  // Load active chats periodically and when chat is opened

  useEffect(() => {

    if (sessionUser?.id) {

      loadActiveChatSessions();

    }

  }, [showChat, sessionUser?.id]);

  

  // Refresh chat sessions every 30 seconds

  useEffect(() => {

    if (!sessionUser?.id) return;

    

    const interval = setInterval(() => {

      loadActiveChatSessions();

    }, 30000);

    

    return () => clearInterval(interval);

  }, [sessionUser?.id]);



  // Socket connection setup

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

          console.log('ChatWidget: Socket connected');

          setSocket(socketInstance);

          setSocketConnected(true);

          

          socketInstance.emit('employee_join', {

            employeeId: String(sessionUser.id),

            employeeName: sessionUser.name || 'Employee',

            role: sessionUser.role,

          });

        });



        socketInstance.on('employee_joined', () => {

          console.log('ChatWidget: Employee joined, loading sessions');

          loadActiveChatSessions();

        });



        socketInstance.on('connect_error', (error) => {

          console.error('ChatWidget: Socket connection error:', error);

          setSocketConnected(false);

        });



        socketInstance.on('disconnect', () => {

          console.log('ChatWidget: Socket disconnected');

          setSocketConnected(false);

          if (ringIntervalRef.current) {

            clearInterval(ringIntervalRef.current);

            ringIntervalRef.current = null;

          }

        });



        socketInstance.on('customer_message', (data) => {

          try {

            const isCurrentChat = selectedCustomer && selectedCustomer.customerId === data.customerId;

            if (!isCurrentChat) {

              updateNotifCount(prev => prev + 1);

            }

            // Show browser notification for new messages
            if (!isCurrentChat) {
              showBrowserNotification(
                data.customerName || `Customer ${data.customerId}`,
                data.message
              );
            }

            // Always play sound for new messages (unless actively viewing this chat)
            if (!selectedCustomer || selectedCustomer.customerName !== data.customerName || !showChat || chatMinimized) {
              // Play sound immediately
              playNotificationSound();
              
              // Voice announcement
              speakMessage("नया मैसेज आया है", "hi-IN");
              
              // Set up ringing interval
              if (!ringIntervalRef.current) {
                ringIntervalRef.current = setInterval(() => {
                  playNotificationSound();
                  speakMessage("नया मैसेज आया है", "hi-IN");
                }, 4000); // Every 4 seconds for voice
              }
            }

            

            setActiveChats(prev => {

              try {

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

              } catch (error) {

                console.error('ChatWidget: Error updating active chats:', error);

                return prev;

              }

            });



            if (selectedCustomer && selectedCustomer.customerId === data.customerId) {

              try {

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

                updateNotifCount(prev => Math.max(0, prev - 1));

              } catch (error) {

                console.error('ChatWidget: Error adding message to chat:', error);

              }

            }

          } catch (error) {

            console.error('ChatWidget: Error processing customer message:', error);

          }

        });



        socketInstance.on('message_sent', (data) => {

          if (selectedCustomer && data.message) {

            setEmployeeMessages(prev => {

              const customerMessages = prev[selectedCustomer.customerId] || [];

              return {

                ...prev,

                [selectedCustomer.customerId]: customerMessages.map(msg => 

                  msg.id && msg.id.startsWith('temp-') && msg.status === 'sending'

                    ? { ...msg, id: data.message.id, status: 'delivered' }

                    : msg

                )

              };

            });

          }

        });



        socketInstance.on('chat_assigned', (data) => {

          console.log('ChatWidget: Chat assigned:', data);

          loadActiveChatSessions();

        });



        // Admin/Employees broadcast notification listener
        socketInstance.on('customer_message_notification', (data) => {
          console.log('ChatWidget: customer_message_notification:', data);

          // Show PWA notification for new chat request
          if (data.customerName && !showChat) {
            showChatRequestNotification(data.customerName);
          }

          // Increment badge if not viewing the chat
          if (!showChat) {
            setSocketConnected(true);
          }

          loadActiveChatSessions();
        });


      } catch (error) {

        console.error('ChatWidget: Error initializing socket:', error);

        setSocketConnected(false);

      }

    };



    initializeSocket();



    return () => {

      console.log('ChatWidget: Cleaning up socket connection');

      if (socketInstance) {

        socketInstance.disconnect();

        setSocketConnected(false);

      }

      // Clear ring interval

      if (ringIntervalRef.current) {

        clearInterval(ringIntervalRef.current);

        ringIntervalRef.current = null;

      }

    };

  }, [sessionUser]);



  // Load active chat sessions

  const loadActiveChatSessions = async () => {

    if (!sessionUser?.id) return;

    

    try {

      const response = await fetch('/api/chat/sessions');

      if (response.ok) {

        const data = await response.json();

        if (data.success && data.sessions) {

          // API already returns customerId, customerName, etc.

          // Map to ensure structure matches dashboard

          const chats = data.sessions.map(session => ({

            customerId: session.customerId || session.customer_id,

            customerName: session.customerName || session.customer_name || `Customer ${session.customerId || session.customer_id}`,

            lastMessage: session.lastMessage || (session.lastMessageAt ? {

              timestamp: session.lastMessageAt

            } : null),

            unread: session.unread !== undefined ? session.unread : (session.unread_count > 0),

            employeeId: session.employeeId ? (typeof session.employeeId === 'object' ? session.employeeId.id : session.employeeId) : (session.employee_id ? (typeof session.employee_id === 'object' ? session.employee_id.id : session.employee_id) : null)

          }));

          const deduplicated = deduplicateChats(chats);

          setActiveChats(deduplicated);

          // Sync notification count with actual unread chats
          const actualCount = deduplicated.filter(chat => chat.unread).length;
          updateNotifCount(actualCount);

          console.log('ChatWidget: Loaded active chat sessions:', deduplicated.length);

        }

      }

    } catch (error) {

      console.error('ChatWidget: Error loading active sessions:', error);

    }

  };



  // Deduplicate chats

  const deduplicateChats = (chats) => {

    if (!Array.isArray(chats)) return [];

    const seen = new Map();

    const result = [];

    

    for (let i = chats.length - 1; i >= 0; i--) {

      const chat = chats[i];

      if (!chat || !chat.customerId) continue;

      

      if (!seen.has(chat.customerId)) {

        seen.set(chat.customerId, chat);

        result.unshift(chat);

      } else {

        const existing = seen.get(chat.customerId);

        const existingTime = existing.lastMessage?.timestamp || '';

        const newTime = chat.lastMessage?.timestamp || '';

        if (newTime > existingTime) {

          const index = result.findIndex(c => c.customerId === chat.customerId);

          if (index >= 0) {

            result[index] = chat;

            seen.set(chat.customerId, chat);

          }

        }

      }

    }

    

    return result;

  };



  // Mark messages as read

  const markMessagesAsRead = async (customerId) => {

    if (!sessionUser?.id) return;

    

    try {

      await fetch('/api/chat/mark-read', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          customerId: customerId,

          userId: sessionUser.id,

          userType: 'employee'

        })

      });

    } catch (error) {

      console.error('ChatWidget: Error marking messages as read:', error);

    }

  };



  // Load messages when customer is selected

  useEffect(() => {

    if (selectedCustomer && sessionUser?.id && showChat) {

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

              markMessagesAsRead(selectedCustomer.customerId);

              updateNotifCount(prev => Math.max(0, prev - 1));

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

          }

        } catch (error) {

          console.error('ChatWidget: Error loading messages:', error);

        } finally {

          setLoadingMessages(false);

        }

      };

      loadMessages();

    }

  }, [selectedCustomer, sessionUser?.id, showChat]);



  // Scroll to bottom when messages change

  useEffect(() => {

    if (messagesEndRef.current) {

      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });

    }

  }, [employeeMessages, selectedCustomer]);



  // Handle customer select

  const handleCustomerSelect = (chat) => {

    setSelectedCustomer(chat);

    markMessagesAsRead(chat.customerId);

    updateNotifCount(prev => Math.max(0, prev - 1));

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



  // Accept chat

  const acceptChat = async (customerId) => {

    if (!sessionUser?.id) return;

    

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

        console.log('ChatWidget: Chat accepted successfully');

        // Reload chat sessions

        const sessionsResponse = await fetch('/api/chat/sessions');

        if (sessionsResponse.ok) {

          const sessionsData = await sessionsResponse.json();

          if (sessionsData.success) {

            const chats = sessionsData.sessions.map(session => ({

              customerId: session.customerId || session.customer_id,

              customerName: session.customerName || session.customer_name || `Customer ${session.customerId || session.customer_id}`,

              lastMessage: session.lastMessage || (session.lastMessageAt ? {

                timestamp: session.lastMessageAt

              } : null),

              unread: session.unread !== undefined ? session.unread : (session.unread_count > 0),

              employeeId: session.employeeId ? (typeof session.employeeId === 'object' ? session.employeeId.id : session.employeeId) : (session.employee_id ? (typeof session.employee_id === 'object' ? session.employee_id.id : session.employee_id) : null)

            }));

            const deduplicated = deduplicateChats(chats);

            setActiveChats(deduplicated);

          }

        }

      } else {

        console.log('ChatWidget: Chat already accepted by another employee:', result.message);

        // Reload chat sessions to update UI with current employee assignment

        const sessionsResponse = await fetch('/api/chat/sessions');

        if (sessionsResponse.ok) {

          const sessionsData = await sessionsResponse.json();

          if (sessionsData.success) {

            const chats = sessionsData.sessions.map(session => ({

              customerId: session.customerId || session.customer_id,

              customerName: session.customerName || session.customer_name || `Customer ${session.customerId || session.customer_id}`,

              lastMessage: session.lastMessage || (session.lastMessageAt ? {

                timestamp: session.lastMessageAt

              } : null),

              unread: session.unread !== undefined ? session.unread : (session.unread_count > 0),

              employeeId: session.employeeId ? (typeof session.employeeId === 'object' ? session.employeeId.id : session.employeeId) : (session.employee_id ? (typeof session.employee_id === 'object' ? session.employee_id.id : session.employee_id) : null)

            }));

            const deduplicated = deduplicateChats(chats);

            setActiveChats(deduplicated);

          }

        }

      }

    } catch (error) {

      console.error('ChatWidget: Error accepting chat:', error);

    }

  };



  // Send message

  const sendMessage = async () => {

    if (!newMessage.trim() || !selectedCustomer || !socket || !socketConnected) return;

    

    const messageText = newMessage.trim();

    const tempMessageId = `temp-${Date.now()}`;

    

    const tempMessage = {

      id: tempMessageId,

      text: messageText,

      sender: 'employee',

      employee_id: sessionUser.id,

      customer_id: selectedCustomer.customerId,

      timestamp: new Date().toISOString(),

      status: 'sending',

    };

    

    setEmployeeMessages(prev => {

      const customerMessages = prev[selectedCustomer.customerId] || [];

      return {

        ...prev,

        [selectedCustomer.customerId]: [...customerMessages, tempMessage]

      };

    });

    

    setNewMessage('');

    

    try {

      const saveResponse = await fetch('/api/chat/send-message', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          customerId: selectedCustomer.customerId,

          employeeId: sessionUser.id,

          employeeName: sessionUser.name,

          text: messageText

        })

      });

      

      const saveResult = await saveResponse.json();

      

      if (saveResult.success) {

        setEmployeeMessages(prev => {

          const customerMessages = prev[selectedCustomer.customerId] || [];

          return {

            ...prev,

            [selectedCustomer.customerId]: customerMessages.map(msg => 

              msg.id === tempMessageId 

                ? { ...msg, id: saveResult.messageId, status: 'sent' }

                : msg

            )

          };

        });

        

        socket.emit('employee_message', {

          customerId: selectedCustomer.customerId,

          message: messageText,

          employeeId: sessionUser.id,

          employeeName: sessionUser.name || 'Employee',

          messageId: saveResult.messageId

        });

        

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

      }

    } catch (error) {

      console.error('ChatWidget: Error sending message:', error);

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



  if (!showChat) return null;



  return (

    <div className="fixed bottom-4 right-4 z-50 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200">

      <div className="bg-purple-600 rounded-t-lg p-3 text-white flex justify-between items-center">

        <h3 className="font-bold text-sm">Support Chat</h3>

        <div className="flex items-center space-x-2">
          {/* Test voice button */}
          <button 
            onClick={() => speakMessage("नया मैसेज आया है", "hi-IN")}
            className="hover:bg-purple-700 rounded p-1"
            title="Test Voice"
          >
            🗣️
          </button>
          
          {/* Test sound button */}
          <button 
            onClick={playNotificationSound}
            className="hover:bg-purple-700 rounded p-1"
            title="Test Sound"
          >
            🔊
          </button>
          
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

      

      <div className="h-[calc(100vh-12rem)] sm:h-96 overflow-hidden flex flex-col">

        {/* Chat list */}

        <div className="flex-1 flex flex-col sm:flex-row">

          <div className="w-full sm:w-1/3 border-r border-gray-200 flex flex-col">

            <div className="p-2 border-b bg-gray-50">

              <h4 className="font-semibold text-xs">Active Chats ({activeChats.length})</h4>

            </div>

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '300px' }}>

              {activeChats.length > 0 ? (

                activeChats.map((chat, index) => (

                  <div

                    key={`${chat.customerId}-${chat.lastMessage?.timestamp || index}-${index}`}

                    className={`p-2 border-b cursor-pointer text-xs ${

                      selectedCustomer?.customerId === chat.customerId 

                        ? 'bg-blue-50 border-blue-200' 

                        : 'hover:bg-gray-50'

                    } ${chat.unread ? 'bg-yellow-50' : ''}`}

                    onClick={() => handleCustomerSelect(chat)}

                  >

                    <div className="flex justify-between items-start">

                      <p className="font-medium truncate">{chat.customerName || `Customer ${chat.customerId}`}</p>

                      {chat.unread && (

                        <span className="w-2 h-2 bg-red-500 rounded-full ml-1 flex-shrink-0"></span>

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

                    {!chat.employeeId && (

                      <button

                        onClick={(e) => {

                          e.stopPropagation();

                          acceptChat(chat.customerId);

                        }}

                        className="mt-1 w-full bg-green-500 text-white text-xs py-1 rounded hover:bg-green-600"

                      >

                        Accept

                      </button>

                    )}

                  </div>

                ))

              ) : (

                <div className="p-4 text-center text-gray-500 text-xs">

                  No active chats

                </div>

              )}

            </div>

          </div>



          {/* Messages */}

          <div className="w-full sm:w-2/3 flex flex-col">

            {selectedCustomer ? (

              <>

                <div className="p-2 border-b bg-gray-50 flex justify-between items-center">

                  <p className="font-semibold text-sm">

                    {selectedCustomer.customerName || `Customer ${selectedCustomer.customerId}`}

                  </p>

                  {!selectedCustomer.employeeId && (

                    <button

                      onClick={() => acceptChat(selectedCustomer.customerId)}

                      className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"

                    >

                      Accept Chat

                    </button>

                  )}

                </div>

                <div className="flex-1 p-2 overflow-y-auto bg-gray-50" style={{ maxHeight: '280px' }}>

                  {loadingMessages ? (

                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">

                      Loading messages...

                    </div>

                  ) : employeeMessages[selectedCustomer.customerId] && 

                     employeeMessages[selectedCustomer.customerId].length > 0 ? (

                    <>

                      {employeeMessages[selectedCustomer.customerId].map((msg, idx) => (

                        <div

                          key={msg.id || idx}

                          className={`mb-2 p-2 rounded-lg text-sm shadow-sm ${

                            msg.sender === 'employee' 

                              ? 'bg-purple-500 text-white ml-auto text-right max-w-[80%]' 

                              : 'bg-white border border-gray-200 mr-auto max-w-[80%]'

                          }`}

                        >

                          <p className="text-xs opacity-75 mb-1">

                            {msg.sender === 'employee' ? 'You' : selectedCustomer.customerName || 'Customer'}

                          </p>

                          <p className={`${msg.sender === 'employee' ? 'text-white' : 'text-gray-800'} break-words font-medium`}>{msg.text}</p>

                          <p className={`text-xs mt-1 ${msg.sender === 'employee' ? 'text-purple-100' : 'text-gray-500'}`}>

                            {new Date(msg.timestamp).toLocaleTimeString('en-IN', { 

                              hour: '2-digit', 

                              minute: '2-digit' 

                            })}

                            {msg.status === 'sending' && (

                              <span className="ml-1">

                                <svg className="inline w-3 h-3 animate-spin" viewBox="0 0 24 24">

                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>

                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>

                                </svg>

                                Sending...

                              </span>

                            )}

                            {msg.status === 'sent' && (

                              <span className="ml-1">✓ Sent</span>

                            )}

                            {msg.status === 'delivered' && (

                              <span className="ml-1">✓✓ Delivered</span>

                            )}

                            {msg.status === 'failed' && (

                              <span className="ml-1 text-red-500">✗ Failed</span>

                            )}

                          </p>

                        </div>

                      ))}

                      <div ref={messagesEndRef} />

                    </>

                  ) : (

                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">

                      No messages yet. Start the conversation!

                    </div>

                  )}

                </div>

                <div className="p-2 border-t bg-white">

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

}



