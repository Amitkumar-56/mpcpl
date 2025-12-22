"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FaBars,
  FaHome,
  FaSignOutAlt,
  FaTimes,
  FaUser,
} from "react-icons/fa";

export default function AgentSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize agent from localStorage immediately - no useEffect needed
  const [agent] = useState(() => {
    if (typeof window !== 'undefined') {
      const agentData = localStorage.getItem("agent");
      if (agentData) {
        try {
          return JSON.parse(agentData);
        } catch (err) {
          console.error("Error parsing agent data:", err);
        }
      }
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem("agent");
    localStorage.removeItem("agent_token");
    router.push("/agent/login");
  };

  const menuItems = [
    { name: "Dashboard", icon: <FaHome />, path: "/agent/dashboard" },
    { name: "User", icon: <FaUser />, path: "/agent/profile" },
  ];

  return (
    <>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-7 right-12 z-50 p-1 bg-gray-900 text-white rounded"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Red Theme */}
      <aside
        className={`fixed md:relative z-40 w-64 h-screen bg-red-200 text-black flex flex-col transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300`}
      >
        {/* User Info */}
        <div className="p-4 border-b border-gray-300 bg-red-300">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
              {agent?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {agent?.name || 'Agent'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {agent?.agent_id || 'Agent ID'}
              </p>
              <p className="text-xs text-red-600 font-semibold mt-0.5">
                Agent
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-hide">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.name}
                href={item.path}
                prefetch={false}
                onClick={() => setIsOpen(false)}
                className={`flex items-center w-full p-3 mb-2 rounded transition-colors ${
                  isActive
                    ? "bg-red-500 text-white shadow-md"
                    : "text-black hover:bg-red-300 hover:text-gray-900"
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-300 bg-red-300">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full p-3 text-black rounded transition-colors hover:bg-red-500 hover:text-white"
          >
            <FaSignOutAlt className="mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

