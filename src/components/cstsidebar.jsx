"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBars, FaFileInvoice, FaHome, FaSignOutAlt, FaTag, FaTags, FaTimes, FaTruck } from "react-icons/fa";

export default function Sidebar({ user: propUser }) {
  const [user, setUser] = useState(propUser || null);
  const [isOpen, setIsOpen] = useState(false);
  const [permissions, setPermissions] = useState({});
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If user passed via props, use it
    if (propUser) {
      setUser(propUser);
      fetchPermissions(propUser.id);
      return;
    }

    // Otherwise load from localStorage
    try {
      const savedUser = localStorage.getItem("customer");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        fetchPermissions(parsedUser.id);
      }
    } catch (error) {
      console.error("Error parsing customer data in Sidebar:", error);
    }
  }, [propUser]);

  const fetchPermissions = async (userId) => {
    try {
      const res = await fetch(`/api/cst/customer-permission?customer_id=${userId}`);
      const data = await res.json();
      if (data.success && data.permissions) {
        setPermissions(data.permissions);
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
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

  // Don't render sidebar content until user is loaded, but return empty fragment instead of null
  // so we don't break layout if it expects an element
  // if (!user) return <div className="hidden md:block w-64 bg-blue-200 h-screen"></div>;

  const menuItems = [
    { name: "Dashboard", icon: <FaHome />, path: "/cst/cstdashboard" },
    { name: "Filling Requests", icon: <FaFileInvoice />, path: "/cst/filling-requests" },
    { name: "Loading Stations", icon: <FaTruck />, path: "/cst/loading-stations" },
    {
      name: "Deal Price",
      icon: <FaTag />,
      path: user && user.id ? `/cst/deal-price` : "/cst/deal-price",
    },
  ];

  // Filter menu items based on permissions
  // If no permissions loaded yet, show all or default safe ones?
  // Current logic: If permissions exist, filter. If not, show all (or assume allowed for backward compat)
  // Adjust logic as per strict requirements. Here assuming "can_view" controls visibility.
  const filteredMenuItems = menuItems.filter(item => {
    // Dashboard is always visible
    if (item.path === "/cst/cstdashboard") return true;

    // Deal Price - Only for main customers (roleid != 2)
    if (item.path.startsWith("/cst/deal-price")) {
      return user && user.roleid !== 2;
    }
    
    // Map paths to module names (matching DB snake_case)
    let moduleName = "";
    if (item.path === "/cst/filling-requests") moduleName = "filling_requests";
    if (item.path === "/cst/loading-stations") moduleName = "loading_stations";
    if (item.path === "/cst/customer-history") moduleName = "customer_history";
    if (item.path === "/cst/user") moduleName = "my_users";

    // If it's a dashboard link, always show
    if (item.path === "/cst/cstdashboard") return true;

    // If we have permissions data and the module exists in it
    if (permissions && permissions[moduleName]) {
      // console.log(`Sidebar: Permission check for ${moduleName}:`, permissions[moduleName]);
      return permissions[moduleName].can_view;
    }
    
    // Fallback: If no specific permission found (or permission not loaded yet), allow it
    // console.log(`Sidebar: No permission found for ${moduleName}, defaulting to visible`);
    return true; 
  });

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
          {filteredMenuItems.map(item => {
            const basePath = item.path.split("?")[0];
            const isActive = pathname.startsWith(basePath);
            return (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.path);
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
