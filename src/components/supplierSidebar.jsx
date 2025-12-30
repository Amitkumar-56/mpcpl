// src/components/supplierSidebar.jsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBars, FaFileInvoice, FaHome, FaSignOutAlt, FaTimes, FaBox, FaHistory } from "react-icons/fa";

export default function SupplierSidebar() {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem("supplier");
    if (!savedUser) {
      router.push("/supplier/login");
      return;
    }
    setUser(JSON.parse(savedUser));
  }, [router]);

  const logout = () => {
    // Clear all storage items
    localStorage.removeItem("supplier");
    localStorage.removeItem("supplier_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("supplier");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("isLoggingOut");
    
    // Use window.location.replace for hard redirect
    if (typeof window !== 'undefined') {
      window.location.replace("/supplier/login");
    } else {
      router.push("/supplier/login");
    }
  };

  if (!user) return null;

  const menuItems = [
    { name: "Dashboard", icon: <FaHome />, path: "/supplier/dashboard" },
    { name: "Invoices", icon: <FaFileInvoice />, path: "/supplier/invoices" },
    { name: "History", icon: <FaHistory />, path: "/supplier/history" },
  ];

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-green-600 text-white rounded-full shadow-lg"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-40 w-64 h-screen bg-green-200 text-black flex flex-col shadow-lg transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-gray-300">
          <h2 className="text-lg font-semibold">Welcome, {user?.name}</h2>
          <p className="text-sm text-gray-600">{user?.email}</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {menuItems.map(item => {
            const basePath = item.path.split('?')[0];
            const isActive = pathname === item.path || pathname.startsWith(basePath);
            return (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.path);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full p-3 mb-2 rounded transition-colors text-sm sm:text-base ${
                  isActive ? "bg-green-500 text-white" : "text-black hover:bg-green-300"
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span>{item.name}</span>
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

