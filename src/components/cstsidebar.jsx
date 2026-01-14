"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBars, FaFileInvoice, FaHome, FaSignOutAlt, FaTimes, FaTruck } from "react-icons/fa";

export default function Sidebar() {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem("customer");
    if (!savedUser) {
      router.push("/cst/login");
      return;
    }
    setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const logout = () => {
    localStorage.removeItem("customer");
    localStorage.removeItem("cst_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("customer");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("isLoggingOut");
    
    if (typeof window !== 'undefined') {
      window.location.replace("/cst/login");
    } else {
      router.push("/cst/login");
    }
  };

  if (!user) return null;

  const menuItems = [
    { name: "Dashboard", icon: <FaHome />, path: "/cst/cstdashboard" },
    { name: "Filling Requests", icon: <FaFileInvoice />, path: "/cst/filling-requests" },
    { name: "Loading Stations", icon: <FaTruck />, path: "/cst/loading-stations" },
  ];

  return (
    <>
      {/* Mobile toggle button - Left side for right sidebar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Overlay backdrop for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Right-side on mobile */}
      <aside
        className={`fixed md:relative z-50 w-64 h-screen bg-blue-200 text-black flex flex-col transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } md:translate-x-0 transition-transform duration-300 right-0`}
      >
        <div className="p-4 border-b border-gray-300 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Welcome, {user?.name}</h2>
            <p className="text-sm text-gray-600">{user?.station}</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 rounded hover:bg-blue-300 transition-colors"
            aria-label="Close menu"
          >
            <FaTimes className="text-gray-700" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {menuItems.map(item => {
            const isActive = pathname.startsWith(item.path);
            return (
              <button
                key={item.name}
                onClick={() => {
                  window.location.href = item.path;
                  setIsOpen(false);
                }}
                className={`flex items-center w-full p-3 mb-2 rounded transition-colors ${
                  isActive ? "bg-blue-500 text-white" : "text-black hover:bg-blue-300"
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="text-sm">{item.name}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="flex items-center p-3 border-t border-gray-300 text-black hover:bg-red-500 hover:text-white transition-colors"
        >
          <FaSignOutAlt className="mr-3" /> Logout
        </button>
      </aside>
    </>
  );
}