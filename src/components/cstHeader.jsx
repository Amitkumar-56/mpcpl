'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaBars, FaBell, FaCog, FaComments, FaKey, FaSignOutAlt, FaTimes, FaUser } from 'react-icons/fa';

export default function CstHeader({ user: propUser }) {
  const [user, setUser] = useState(propUser || null);
  const [notifCount, setNotifCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
      return;
    }
    
    try {
      const userData = localStorage.getItem('customer');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(prevUser => {
          if (JSON.stringify(prevUser) !== JSON.stringify(parsedUser)) {
            return parsedUser;
          }
          return prevUser;
        });
      }
    } catch (error) {
      console.error("Error parsing customer data in Header:", error);
    }

    try {
      const c = parseInt(sessionStorage.getItem('cst_notif_count') || '0', 10);
      setNotifCount(prevCount => (isNaN(c) ? 0 : c));
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const count = e?.detail?.count;
      if (typeof count === 'number') {
        setNotifCount(count);
      } else {
        try {
          const c = parseInt(sessionStorage.getItem('cst_notif_count') || '0', 10);
          setNotifCount(isNaN(c) ? 0 : c);
        } catch (err) {}
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('cst-notif-update', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cst-notif-update', handler);
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('cst_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('customer');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('isLoggingOut');
    
    if (typeof window !== 'undefined') {
      window.location.replace('/cst/login');
    } else {
      router.push('/cst/login');
    }
    
    setShowProfileMenu(false);
    setShowSidebar(false);
  };

  if (pathname === '/cst/login') return null;

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Left Section: Toggle Button and Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSidebar(true)}
            className="p-2 rounded-md hover:bg-gray-100 md:hidden"
            aria-label="Open menu"
          >
            <FaBars className="text-gray-700 text-xl" />
          </button>
          
          <h1 className="text-2xl font-bold text-blue-800">MPCPL</h1>
        </div>

        {/* Center Section: Search - Only show on dashboard */}
        {pathname === '/cst/cstdashboard' && (
          <div className="hidden sm:flex items-center w-1/2 max-w-lg">
            <input
              type="text"
              placeholder="Search"
              className="w-full border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button className="bg-white border border-l-0 border-gray-300 px-3 rounded-r-md text-gray-500">
              <FaComments className="text-lg" />
            </button>
          </div>
        )}

        {/* Right Section: User Profile */}
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <FaBell className="text-gray-600 cursor-pointer text-lg" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 rounded-full">
              {notifCount}
            </span>
          </div>

          <div className="relative hidden sm:block">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-gray-800 font-medium">{user?.name || 'User'}</span>
            </div>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50">
               
                <button
                  onClick={() => { router.push('/cst/cstprofile'); setShowProfileMenu(false); }}
                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-100"
                >
                  <FaUser /> My Profile
                </button>
                <button
                  onClick={() => { router.push('/change-password'); setShowProfileMenu(false); }}
                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-100"
                >
                  <FaKey /> Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-red-600 hover:bg-gray-100"
                >
                  <FaSignOutAlt /> Sign Out
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </div>

      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {showSidebar && (
        <div className="fixed top-0 right-0 w-64 h-full bg-white shadow-lg z-50 flex flex-col md:hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{user?.name || 'User'}</h2>
                <p className="text-xs text-gray-500">Profile</p>
              </div>
            </div>
            <button 
              onClick={() => setShowSidebar(false)}
              className="p-2 rounded hover:bg-gray-100"
            >
              <FaTimes className="text-gray-700 text-xl" />
            </button>
          </div>
          
          <div className="flex flex-col mt-4 gap-2 px-4 py-2">
            <button
              onClick={() => { router.push('/roles'); setShowSidebar(false); }}
              className="flex items-center gap-3 px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <FaCog className="text-gray-500" /> Role Setting
            </button>
            <button
              onClick={() => { router.push('/cst/cstprofile'); setShowSidebar(false); }}
              className="flex items-center gap-3 px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <FaUser className="text-gray-500" /> My Profile
            </button>
            <button
              onClick={() => { router.push('/change-password'); setShowSidebar(false); }}
              className="flex items-center gap-3 px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <FaKey className="text-gray-500" /> Change Password
            </button>
            
            <div className="flex items-center justify-between px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FaBell className="text-gray-500" />
                <span>Notifications</span>
              </div>
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {notifCount}
              </span>
            </div>
            
            <div className="border-t my-2"></div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg mt-2"
            >
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}