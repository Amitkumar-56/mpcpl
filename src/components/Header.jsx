'use client';

import { useSession } from '@/context/SessionContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaBell, FaComments, FaKey, FaSignOutAlt, FaTimes, FaUser } from 'react-icons/fa';
import { io } from 'socket.io-client';

export default function Header({ onMenuToggle }) {
  const { user, logout, loading } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [empSocket, setEmpSocket] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      setShowSidebar(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-dropdown')) {
        setShowProfileMenu(false);
      }
      if (showNotifMenu && !event.target.closest('.notif-dropdown')) {
        setShowNotifMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showNotifMenu]);

  // Socket connection effect - must be called before conditional returns
  useEffect(() => {
    const isCustomer = pathname.startsWith('/cst');
    if (!user || isCustomer || pathname === '/login') return;
    
    let s;
    (async () => {
      try { await fetch('/api/socket'); } catch (e) {}
      s = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      s.on('connect', () => {
        s.emit('employee_join', {
          employeeId: String(user.id || user.emp_id || user.emp_code || '0'),
          employeeName: user.name || 'Employee',
          role: user.role,
        });
      });
      s.on('customer_message_notification', (data) => {
        console.log('Header: Received customer_message_notification:', data);
        setNotifCount((c) => c + 1);
        setNotifications((list) => [{
          id: `${data.messageId}`,
          customerId: data.customerId,
          customerName: data.customerName,
          text: data.text,
          timestamp: data.timestamp,
          status: data.status,
        }, ...list].slice(0, 20));
        
        // If not on dashboard, show notification and redirect to dashboard
        if (pathname !== '/dashboard') {
          // Optionally redirect to dashboard with chat open
          // router.push('/dashboard?chat=true&customerId=' + data.customerId);
        }
      });
      s.on('new_customer', (data) => {
        setNotifCount((c) => c + 1);
        setNotifications((list) => [{
          id: `new_customer_${data.customerId}`,
          customerId: data.customerId,
          customerName: data.name,
          text: `New customer registered`,
          timestamp: data.timestamp || Date.now(),
          status: 'new_customer',
        }, ...list].slice(0, 20));
      });
      s.on('chat_assigned', (data) => {
        setNotifications((list) => [{
          id: `assigned-${data.customerId}`,
          customerId: data.customerId,
          customerName: data.employeeName,
          text: 'Chat assigned',
          timestamp: Date.now(),
          status: 'assigned',
        }, ...list].slice(0, 20));
      });
      setEmpSocket(s);
    })();
    return () => { try { s && s.disconnect(); } catch (e) {} };
  }, [user, pathname]);

  // Don't show header on login page
  if (pathname === '/login') return null;

  // Show loading state
  if (loading) {
    return (
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-800">MPCL</h1>
          <div className="flex items-center gap-4">
            <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8"></div>
          </div>
        </div>
      </header>
    );
  }

  // Don't show header if no user
  if (!user) return null;

  const roleNames = {
    1: 'Staff',
    2: 'Incharge',
    3: 'Team Leader',
    4: 'Accountant',
    5: 'Admin',
    6: 'Driver'
  };

  const acceptChat = (customerId) => {
    if (!empSocket || !empSocket.connected) return;
    empSocket.emit('employee_accept_chat', {
      customerId,
      employeeId: String(user.id || user.emp_id || user.emp_code || '0'),
      employeeName: user.name || 'Employee',
    });
    setShowNotifMenu(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-blue-800">MPCL</h1>
          
          {/* Show current page title */}
          {pathname !== '/dashboard' && (
            <div className="hidden md:block">
              <span className="text-gray-500 mx-2">•</span>
              <span className="text-gray-700 font-medium capitalize">
                {pathname.split('/').filter(Boolean).join(' / ')}
              </span>
            </div>
          )}
        </div>

        {/* Search - Only show on dashboard */}
        {pathname === '/dashboard' && (
          <div className="hidden sm:flex items-center w-1/2 max-w-lg">
            <input
              type="text"
              placeholder="Search transactions, customers..."
              className="w-full border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors">
              <FaComments className="text-lg" />
            </button>
          </div>
        )}

        {/* User Profile Section */}
        <div className="flex items-center gap-4">
          {/* Notification with badge */}
          <div className="relative hidden sm:block notif-dropdown">
            <button 
              onClick={() => setShowNotifMenu((v) => !v)}
              className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <FaBell className="text-xl" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {notifCount}
              </span>
            </button>
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Notifications</span>
                  <button 
                    onClick={() => { setNotifCount(0); }}
                    className="text-xs text-blue-600 hover:underline">Clear</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-800">{n.customerName || 'Customer'} • #{n.customerId}</p>
                        <p className="text-xs text-gray-600 mt-1">{n.text}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">{new Date(n.timestamp).toLocaleString()}</span>
                          <button 
                            onClick={() => acceptChat(n.customerId)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Accept</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative profile-dropdown">
            {/* Profile Trigger Button */}
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
                <p className="text-xs text-gray-500">
                  {user.emp_code || user.emp_id || roleNames[user.role] || 'Unknown'}
                </p>
                {user.role === 5 && (
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">Administrator</p>
                )}
                {user.role === 4 && (
                  <p className="text-xs text-green-600 font-semibold mt-0.5">Accountant</p>
                )}
                {user.role === 3 && (
                  <p className="text-xs text-purple-600 font-semibold mt-0.5">Team Leader</p>
                )}
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>

            {/* Desktop Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">{user.name || 'User'}</p>
                  <p className="text-sm text-gray-600 truncate">{user.email || 'No email'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {user.station || 'Main Station'}
                    </p>
                    {user.role === 5 && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                        Admin
                      </span>
                    )}
                    {user.role === 4 && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                        Accountant
                      </span>
                    )}
                    {user.role === 3 && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold">
                        Team Leader
                      </span>
                    )}
                  </div>
                  {user.emp_code && (
                    <p className="text-xs text-gray-400 mt-1">
                      Code: {user.emp_code}
                    </p>
                  )}
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => { 
                      router.push('/profile'); 
                      setShowProfileMenu(false); 
                    }}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <FaUser className="text-gray-400" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => { 
                      router.push('/change-password'); 
                      setShowProfileMenu(false); 
                    }}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <FaKey className="text-gray-400" />
                    <span>Change Password</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FaSignOutAlt />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => {
              if (onMenuToggle) {
                onMenuToggle();
              } else {
                setShowSidebar(true);
              }
            }}
            className="lg:hidden p-2 text-gray-600 hover:text-blue-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 sm:hidden">
          <div className="absolute right-0 top-0 w-80 h-full bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes className="text-gray-600 text-lg" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 py-4">
              <button
                onClick={() => { router.push('/profile'); setShowSidebar(false); }}
                className="flex items-center gap-4 px-6 py-4 w-full text-left text-gray-700 hover:bg-blue-50 border-b border-gray-100"
              >
                <FaUser className="text-gray-400 text-lg" />
                <span className="font-medium">My Profile</span>
              </button>

              <button
                onClick={() => { router.push('/change-password'); setShowSidebar(false); }}
                className="flex items-center gap-4 px-6 py-4 w-full text-left text-gray-700 hover:bg-blue-50 border-b border-gray-100"
              >
                <FaKey className="text-gray-400 text-lg" />
                <span className="font-medium">Change Password</span>
              </button>

              {/* Notifications in mobile */}
              <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
                <FaBell className="text-gray-400 text-lg" />
                <span className="font-medium">Notifications</span>
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{notifCount}</span>
              </div>
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-3 w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                <FaSignOutAlt />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
