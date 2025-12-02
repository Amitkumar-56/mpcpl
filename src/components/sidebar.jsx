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

export default function Sidebar() {
  const { user, logout, loading: authLoading } = useSession();
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

  // Optimized permission filtering
  const allowedMenu = useMemo(() => {
    if (!user) return [];
    
    // ✅ Admin (role 5) gets full access
    if (user.role === 5) {
      console.log('✅ Admin user - Full access granted');
      return menuItems;
    }
    
    // ✅ FIX: Log user permissions for debugging
    console.log('🔐 User permissions check:', {
      userId: user.id,
      role: user.role,
      hasPermissionsObject: !!user.permissions,
      permissionsCount: Object.keys(user.permissions || {}).length,
      availableModules: Object.keys(user.permissions || {}),
      permissionsObject: user.permissions
    });
    
    // ✅ FIX: If permissions object is missing, log warning
    if (!user.permissions || Object.keys(user.permissions).length === 0) {
      console.warn('⚠️ User has no permissions object or empty permissions!', {
        userId: user.id,
        role: user.role,
        permissions: user.permissions
      });
    }
    
    const filtered = menuItems.filter((item) => {
      const backendModuleName = moduleMapping[item.module];
      
      // ✅ FIX: Debug logging to see what's happening
      if (!backendModuleName) {
        console.warn(`⚠️ No module mapping found for: ${item.module} (${item.name})`);
        return false;
      }
      
      const hasPermission = user.permissions?.[backendModuleName]?.can_view;
      
      // ✅ FIX: Debug logging
      if (!hasPermission) {
        console.log(`❌ No permission for: ${item.name}`, {
          module: item.module,
          backendModuleName: backendModuleName,
          path: item.path,
          permissionExists: !!user.permissions?.[backendModuleName],
          can_view: user.permissions?.[backendModuleName]?.can_view
        });
      } else {
        console.log(`✅ Permission granted for: ${item.name} (${backendModuleName})`);
      }
      
      return hasPermission;
    });
    
    console.log(`📊 Menu filtering result: ${filtered.length}/${menuItems.length} items allowed`);
    
    return filtered;
  }, [user, menuItems, moduleMapping]);

  // Improved navigation handler
  const handleNavigation = (path) => {
    router.push(path);
    setIsOpen(false);
  };

  // Don't render sidebar if no user and not loading
  if (!user && !authLoading) {
    return null;
  }

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
                {user?.name || 'Loading...'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {user?.emp_code || (user?.role === 5 ? 'Admin' : 'Employee')}
              </p>
              {user?.role === 5 && (
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  Administrator
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-hide">
          {authLoading ? (
            <div className="flex flex-col items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-gray-600 text-sm">Loading menu...</p>
            </div>
          ) : (
            <>
              {allowedMenu.map((item) => {
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
              })}

              {allowedMenu.length === 0 && (
                <div className="p-3 text-center text-gray-600 text-sm space-y-2">
                  <p className="font-semibold">No modules available for your role</p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 5 
                      ? 'Admin should have full access. Please check console for errors.'
                      : `Role: ${user?.role || 'Unknown'}. Please contact admin to assign permissions.`
                    }
                  </p>
                  {user?.permissions && Object.keys(user.permissions).length === 0 && (
                    <p className="text-xs text-red-500 mt-2">
                      ⚠️ No permissions found in database. Check role_permissions table.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-300 bg-blue-300">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut || authLoading}
            className={`flex items-center justify-center w-full p-3 text-black rounded transition-colors ${
              isLoggingOut || authLoading
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