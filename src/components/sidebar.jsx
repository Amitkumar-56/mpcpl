
//src/components/sidebar.jsx
"use client";
import { useSession } from '@/context/SessionContext';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FaBars,
  FaBox,
  FaBuilding,
  FaClipboard,
  FaCog,
  FaExchangeAlt,
  FaFileAlt,
  FaFileInvoice,
  FaHistory,
  FaHome,
  FaMoneyBill,
  FaSignOutAlt,
  FaStickyNote,
  FaTimes,
  FaTruck,
  FaTruckMoving,
  FaUsers,
  FaUserTie,
} from "react-icons/fa";

export default function Sidebar({ onClose }) {
  const { user, logout } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Memoized menu items to prevent unnecessary re-renders
  const menuItems = useMemo(() => [
    { name: "Dashboard", icon: <FaHome />, module: "dashboard", path: "/dashboard" },
    { name: "Customers", icon: <FaUsers />, module: "customers", path: "/customers" },
    { name: "Purchese Request", icon: <FaFileInvoice />, module: "filling_requests", path: "/filling-requests" },
    { name: "Stock", icon: <FaUsers />, module: "stock", path: "/stock" },
    { name: "Stock History", icon: <FaHistory />, module: "stock_history", path: "/stock-history" },
    { name: "Outstanding History", icon: <FaFileInvoice />, module: "outstanding_history", path: "/outstanding-history" },
    { name: "Loading Stations", icon: <FaTruck />, module: "loading_stations", path: "/loading-stations" },
    { name: "Schedule Prices", icon: <FaMoneyBill />, module: "schedule_price", path: "/schedule-price" },
    { name: "Products", icon: <FaBox />, module: "products", path: "/products" },
    { name: "Employees", icon: <FaUserTie />, module: "employees", path: "/employees" },
    { name: "Suppliers", icon: <FaBuilding />, module: "suppliers", path: "/suppliers" },
    { name: "Transporters", icon: <FaTruck />, module: "transporters", path: "/transporters" },
    { name: "NB Accounts", icon: <FaClipboard />, module: "nb_balance", path: "/nb-balance" },
    { name: "NB Expenses", icon: <FaMoneyBill />, module: "nb_expenses", path: "/nb-expenses" },
    { name: "NB Stock", icon: <FaBox />, module: "nb_stock", path: "/nb-stock" },
    { name: "Stock Transfer", icon: <FaExchangeAlt />, module: "stock_transfers", path: "/stock-transfers" },
    { name: "Reports", icon: <FaFileAlt />, module: "reports", path: "/reports" },
    { name: "Retailers", icon: <FaUsers />, module: "retailers", path: "/retailers" },
    { name: "Agent Management", icon: <FaUserTie />, module: "agent_management", path: "/agent-management" },
    { name: "Users", icon: <FaUsers />, module: "users", path: "/users" },
    { name: "Vehicles", icon: <FaTruckMoving />, module: "vehicles", path: "/vehicles" },
    { name: "LR Management", icon: <FaClipboard />, module: "lr_management", path: "/lr-list" },
    { name: "Loading History", icon: <FaHistory />, module: "history", path: "/loading-unloading-history" },
    { name: "Tanker History", icon: <FaHistory />, module: "tanker_history", path: "/tanker-history" },
    { name: "Deepo History", icon: <FaHistory />, module: "deepo_history", path: "/deepo-history" },
    { name: "Vouchers", icon: <FaFileInvoice />, module: "vouchers", path: "/voucher-wallet-driver" },
    { name: "Remarks", icon: <FaStickyNote />, module: "remarks", path: "/deepo-items" },
    { name: "Items", icon: <FaCog />, module: "items", path: "/items" },
    { name: "Roles", icon: <FaUserTie />, module: "roles", path: "/roles", adminOnly: true },
  ], []);

  const moduleMapping = useMemo(() => ({
    dashboard: "Dashboard",
    users: "Users",
    reports: "Reports",
    filling_requests: "Filling Requests",
    stock: "Stock", // ✅ FIX: "Stock" module (not "Stock Transfer")
    loading_stations: "Loading Station",
    vehicles: "Vehicle",
    schedule_price: "Schedule Prices",
    lr_management: "LR Management",
    history: "Loading History",
    products: "Items & Products",
    employees: "Employees",
    suppliers: "Suppliers",
    transporters: "Transporters",
    nb_balance: "NB Accounts", // ✅ FIX: Added missing mapping
    vouchers: "Voucher",
    stock_transfers: "Stock Transfer", // ✅ FIX: "Stock Transfer" module
    stock_history: "Stock History", // ✅ Added stock history mapping
    stock_requests: "Stock Requests", // ✅ Added stock requests mapping
    outstanding_history: "Outstanding History", // ✅ Added outstanding history mapping
    remarks: "Remarks",
    items: "Items",
    customers: "Customer",
    tanker_history: "Tanker History",
    deepo_history: "Deepo History",
    nb_expenses: "NB Expenses",
    nb_stock: "NB Stock",
    retailers: "Retailers", // ✅ FIX: Added missing mapping
    agent_management: "Agent Management", // ✅ FIX: Added missing mapping
  }), []);

  // ✅ FIX: Enhanced permission filtering - only show items with can_view permission
  const allowedMenu = useMemo(() => {
    if (!user) return [];
    
    // ✅ Admin (role 5) gets full access - instant return
    if (Number(user.role) === 5) {
      return menuItems;
    }
    
    // ✅ Check if permissions exist - if not, return empty array (no menu items)
    if (!user.permissions || typeof user.permissions !== 'object' || Object.keys(user.permissions).length === 0) {
      return [];
    }
    
    // ✅ Filter menu items based on can_view permission
    const filtered = menuItems.filter((item) => {
      // ✅ Admin-only items (like Roles) - only show to admin
      if (item.adminOnly && Number(user.role) !== 5) {
        return false;
      }
      
      // ✅ Admin gets all items (except adminOnly is handled above)
      if (Number(user.role) === 5 && !item.adminOnly) {
        return true;
      }
      
      const backendModuleName = moduleMapping[item.module];
      
      // If module mapping not found, hide the item
      if (!backendModuleName) {
        return false;
      }
      
      // Check if user has permission for this module
      const modulePermission = user.permissions[backendModuleName];
      
      // If no permission record exists, hide the item
      if (!modulePermission || typeof modulePermission !== 'object') {
        return false;
      }
      
      // ✅ CRITICAL: Only show if can_view is explicitly true (strict check)
      // This ensures menu items only show when user has view permission
      return modulePermission.can_view === true;
    });
    
    return filtered;
  }, [user, menuItems, moduleMapping]);

  // Improved navigation handler
  const handleNavigation = (path) => {
    router.push(path);
    setIsOpen(false);
  };

  // Always render sidebar - don't wait for loading
  // Show empty state if no user yet

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
        className="md:hidden fixed top-7 right-60 z-50 p-1 bg-gray-900 text-white rounded"
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

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-40 w-64 h-screen bg-blue-200 text-black flex flex-col transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300`}
      >
        {/* User Info */}
        <div className="p-4 border-b border-gray-300 bg-blue-300">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {Number(user?.role) === 5 
                  ? 'Admin' 
                  : (user?.role_name || 'Employee')}
              </p>
              {Number(user?.role) === 5 && (
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  Administrator
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-hide">
          {allowedMenu.length > 0 ? (
            allowedMenu.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  prefetch={false}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center w-full p-3 mb-2 rounded transition-colors ${
                    isActive
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-black hover:bg-blue-300 hover:text-gray-900"
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })
          ) : user ? (
            <div className="p-3 text-center text-gray-600 text-sm">
              <p className="font-semibold">No modules available</p>
              <p className="text-xs text-gray-500 mt-1">
                Contact admin for permissions
              </p>
            </div>
          ) : null}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-300 bg-blue-300">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`flex items-center justify-center w-full p-3 text-black rounded transition-colors ${
              isLoggingOut
                ? "bg-gray-400 cursor-not-allowed" 
                : "hover:bg-red-500 hover:text-white"
            }`}
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
                <span className="font-medium">Logging out...</span>
              </>
            ) : (
              <>
                <FaSignOutAlt className="mr-3" /> 
                <span className="font-medium">Logout</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
