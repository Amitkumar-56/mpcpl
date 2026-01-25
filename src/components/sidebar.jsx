// src/components/sidebar.jsx
"use client";
import { useSession } from '@/context/SessionContext';
import { usePathname, useRouter } from "next/navigation";
import { memo, startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  FaBars,
  FaBox,
  FaBuilding,
  FaClipboard,
  FaClock,
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
  FaUserTie
} from "react-icons/fa";

const Sidebar = memo(function Sidebar({ onClose }) {
  const { user, logout } = useSession();
  
  // SSR के लिए default state
  const [isCollapsed, setIsCollapsed] = useState(true); // SSR के लिए हमेशा collapsed
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef(null);
  
  // ✅ Client-side initialization only
  useEffect(() => {
    const initializeSidebar = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // localStorage से collapsed state retrieve करें
      const saved = localStorage.getItem('sidebar-collapsed');
      
      if (mobile) {
        // Mobile पर हमेशा collapsed रखें
        setIsCollapsed(true);
      } else {
        // Desktop पर: अगर saved state है तो वो use करें, नहीं तो expanded (false)
        if (saved !== null) {
          setIsCollapsed(JSON.parse(saved));
        } else {
          setIsCollapsed(false); // Desktop पर default expanded
        }
      }
      
      setIsInitialized(true);
    };
    
    initializeSidebar();
    
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        // Mobile पर collapsed रखें
        setIsCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ localStorage में collapsed state save करें (client-side only)
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isInitialized]);

  // ✅ साइडबार के बाहर क्लिक करने पर बंद करें (मोबाइल के लिए)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCollapsed, isMobile]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Menu items
  const menuItems = useMemo(() => [
    { name: "Dashboard", icon: <FaHome />, module: "dashboard", path: "/dashboard" },
    { name: "Customers", icon: <FaUsers />, module: "customers", path: "/customers" },
    { name: "Purchase Request", icon: <FaFileInvoice />, module: "filling_requests", path: "/filling-requests" },
    { name: "Stock", icon: <FaUsers />, module: "stock", path: "/stock" },
    { name: "Stock History", icon: <FaHistory />, module: "stock_history", path: "/stock-history" },
    { name: "Stock Requests", icon: <FaClipboard />, module: "stock_requests", path: "/stock-requests" },
    { name: "Stock Transfer", icon: <FaExchangeAlt />, module: "stock_transfers", path: "/stock-transfers" },

    { name: "Loading Stations", icon: <FaTruck />, module: "loading_stations", path: "/loading-stations" },
    { name: "Schedule Prices", icon: <FaMoneyBill />, module: "schedule_price", path: "/schedule-price" },
    { name: "Products", icon: <FaBox />, module: "products", path: "/products" },
    { name: "Employees", icon: <FaUserTie />, module: "employees", path: "/employees" },
    { name: "Attendance", icon: <FaClock />, module: "attendance", path: "/attendance" },
    { name: "Suppliers", icon: <FaBuilding />, module: "suppliers", path: "/suppliers" },
    { name: "Transporters", icon: <FaTruck />, module: "transporters", path: "/transporters" },
    { name: "NB Accounts", icon: <FaClipboard />, module: "nb_balance", path: "/nb-balance" },
    { name: "NB Expenses", icon: <FaMoneyBill />, module: "nb_expenses", path: "/nb-expenses" },
    { name: "NB Stock", icon: <FaBox />, module: "nb_stock", path: "/nb-stock" },
    { name: "Reports", icon: <FaFileAlt />, module: "reports", path: "/reports" },
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
    reports: "Reports",
    filling_requests: "Filling Requests",
     customers: "Customer",
    stock: "Stock",
    stock_history: "Stock History",
     stock_requests: "Stock Requests",
    stock_transfers: "Stock Transfer",
    stock_transfer_logs: "Transfer Logs",
    loading_stations: "Loading Station",
    products: "Items & Products",
    employees: "Employees",
    attendance: "Attendance",
    vehicles: "Vehicle",
    schedule_price: "Schedule Prices",
    lr_management: "LR Management",
    history: "Loading History",
    suppliers: "Suppliers",
      outstanding_history: "Outstanding History",
    transporters: "Transporters",
    nb_balance: "NB Accounts",
    nb_stock: "NB Stock",
    nb_expenses: "NB Expenses",
    vouchers: "Voucher",
    remarks: "Remarks",
    items: "Items",
    tanker_history: "Tanker History",
    deepo_history: "Deepo History",
    agent_management: "Agent Management",
      users: "Users",
  }), []);

  // ✅ Role-based menu filtering
  const allowedMenu = useMemo(() => {
    if (!user) return [];
    
    const userRole = Number(user.role);
    
    // ✅ Head Operation (role 5) - All Accountant modules + everything
    if (userRole === 5) {
      return menuItems;
    }
    
    // ✅ Accountant (role 4) - Multi branch, Create request, Tanker movement (stock), Stock update, NB modules
    if (userRole === 4) {
      return menuItems.filter((item) => {
        // Hide most history items, but keep Tanker History for movement tracking
        const historyItems = ['history', 'stock_history', 'outstanding_history', 'deepo_history'];
        if (historyItems.includes(item.module)) {
          return false;
        }
        
        // Show: Dashboard, Purchase Request, Stock, NB modules, Tanker History (for movement), Stock Transfer, Transfer Logs, Attendance
        const allowedModules = [
          'dashboard', 'filling_requests','stock_transfers', 'stock','products' ,'nb_balance', 'nb_expenses', 'nb_stock',
          'tanker_history', 'loading_stations',  'attendance'
        ];
        return allowedModules.includes(item.module);
      });
    }
    
    // ✅ Team Leader (role 3) - Multi branch, Purchase request (full), Tanker movement, Attendance (branch team), Customer recharge, Stock update
    if (userRole === 3) {
      return menuItems.filter((item) => {
        // Hide: NB modules, Users, Agent Management (admin only)
        const hiddenModules = ['nb_balance', 'nb_expenses', 'nb_stock', 'users', 'agent_management'];
        if (hiddenModules.includes(item.module)) {
          return false;
        }
        
        // Show: Dashboard, Purchase Request (full), Stock, Tanker History, Customers (for recharge), etc.
        // Filter by permissions if available
        if (user.permissions && typeof user.permissions === 'object') {
          const backendModuleName = moduleMapping[item.module];
          if (backendModuleName) {
            const modulePermission = user.permissions[backendModuleName];
            if (modulePermission && typeof modulePermission === 'object') {
              return modulePermission.can_view === true;
            }
          }
        }
        return true; // Default show if no permission check
      });
    }
    
    // ✅ Incharge (role 2) - Single branch, Purchase request (search only), NO history, Attendance (all)
    if (userRole === 2) {
      return menuItems.filter((item) => {
        // Hide ALL history items
        const historyItems = ['history', 'stock_history', 'outstanding_history', 'tanker_history', 'deepo_history'];
        if (historyItems.includes(item.module)) {
          return false;
        }
        
        // Hide: NB modules, Users, Agent Management, Reports, etc.
        const hiddenModules = ['nb_balance', 'nb_expenses', 'nb_stock', 'users', 'agent_management', 'reports'];
        if (hiddenModules.includes(item.module)) {
          return false;
        }
        
        // Show: Dashboard, Purchase Request, Stock (optional), Loading Stations, Attendance
        const allowedModules = ['dashboard', 'filling_requests', 'stock', 'loading_stations', 'attendance'];
        if (allowedModules.includes(item.module)) {
          // Check permissions if available
          if (user.permissions && typeof user.permissions === 'object') {
            const backendModuleName = moduleMapping[item.module];
            if (backendModuleName) {
              const modulePermission = user.permissions[backendModuleName];
              if (modulePermission && typeof modulePermission === 'object') {
                return modulePermission.can_view === true;
              }
            }
          }
          return true;
        }
        return false;
      });
    }
    
    // ✅ Staff (role 1) - Single branch, Purchase request (search only), Stock (optional), NO Attendance access
    if (userRole === 1) {
      return menuItems.filter((item) => {
        // Hide: History items (except if needed for attendance), NB modules, Users, etc.
        const historyItems = ['history', 'stock_history', 'outstanding_history', 'tanker_history', 'deepo_history'];
        if (historyItems.includes(item.module)) {
          return false;
        }
        
        const hiddenModules = ['nb_balance', 'nb_expenses', 'nb_stock', 'users', 'agent_management', 'reports', 'customers', 'employees', 'suppliers', 'transporters', 'attendance'];
        if (hiddenModules.includes(item.module)) {
          return false;
        }
        
        // Show: Dashboard, Purchase Request, Stock (optional), Loading Stations
        const allowedModules = ['dashboard', 'filling_requests', 'stock', 'loading_stations'];
        if (allowedModules.includes(item.module)) {
          // Check permissions if available
          if (user.permissions && typeof user.permissions === 'object') {
            const backendModuleName = moduleMapping[item.module];
            if (backendModuleName) {
              const modulePermission = user.permissions[backendModuleName];
              if (modulePermission && typeof modulePermission === 'object') {
                return modulePermission.can_view === true;
              }
            }
          }
          return true;
        }
        return false;
      });
    }
    
    // ✅ Default: Check permissions for other roles
    if (!user.permissions || typeof user.permissions !== 'object' || Object.keys(user.permissions).length === 0) {
      return [];
    }
    
    // ✅ Filter menu items based on can_view permission
    const filtered = menuItems.filter((item) => {
      if (item.adminOnly && userRole !== 5) {
        return false;
      }
      
      const backendModuleName = moduleMapping[item.module];
      if (!backendModuleName) {
        return false;
      }
      
      const modulePermission = user.permissions[backendModuleName];
      if (!modulePermission || typeof modulePermission !== 'object') {
        return false;
      }
      
      return modulePermission.can_view === true;
    });
    
    return filtered;
  }, [user, menuItems, moduleMapping]);

  return (
    <>
      {/* Mobile Toggle Button - Fixed position (only render after initialization) */}
      {isInitialized && isMobile && (
        <button
          onClick={handleToggle}
          style={{
            position: 'fixed',
            top: '20px',
            right: '7.5rem',
            zIndex: 9999,
            pointerEvents: 'auto',
            transform: 'none',
            transition: 'background-color 0.2s ease',
          }}
          className="p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 flex items-center justify-center"
          title={isCollapsed ? "Open Sidebar" : "Close Sidebar"}
        >
          {isCollapsed ? (
            <FaBars className="w-5 h-5" />
          ) : (
            <FaTimes className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Overlay for mobile when sidebar is open */}
      {isInitialized && isMobile && !isCollapsed && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998,
          }}
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        style={{
          height: '100vh',
          backgroundColor: '#dbeafe',
          color: 'black',
          display: 'flex',
          flexDirection: 'column',
          transition: isInitialized ? 'all 0.3s ease' : 'none', // SSR के समय transition नहीं
          zIndex: 9999,
          position: isInitialized ? (isMobile ? 'fixed' : 'relative') : 'relative',
          width: isInitialized ? (isCollapsed ? (isMobile ? '0' : '4rem') : '16rem') : '4rem', // SSR के लिए collapsed
          overflow: 'hidden',
          left: 0,
          top: 0,
          minWidth: isInitialized && isMobile ? (isCollapsed ? '0' : '16rem') : undefined,
        }}
      >
        {/* User Info */}
        <div style={{
          padding: isInitialized && !isCollapsed ? '1rem' : '0.5rem',
          borderBottom: '1px solid #d1d5db',
          backgroundColor: '#93c5fd',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isInitialized && !isCollapsed ? 'flex-start' : 'center',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#2563eb',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            flexShrink: 0,
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          {/* User details - only show when not collapsed AND initialized */}
          {isInitialized && !isCollapsed && (
            <div style={{ marginLeft: '0.75rem', flex: 1, minWidth: 0 }}>
              <p style={{ 
                fontSize: '0.875rem', 
                fontWeight: 500, 
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.name || 'User'}
              </p>
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#4b5563',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {Number(user?.role) === 5 
                  ? 'Admin' 
                  : (user?.role_name || 'Employee')}
              </p>
              {Number(user?.role) === 5 && (
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#2563eb',
                  fontWeight: 600,
                  marginTop: '2px',
                }}>
                  Administrator
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem 0.5rem',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}>
          {allowedMenu.length > 0 ? (
            allowedMenu.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              const handleNavClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (item.path === pathname) {
                  return;
                }
                
                // Mobile पर navigation के बाद sidebar बंद करें
                if (isInitialized && isMobile) {
                  setIsCollapsed(true);
                }
                
                startTransition(() => {
                  router.push(item.path);
                });
              };
              
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={handleNavClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    justifyContent: isInitialized && isCollapsed ? 'center' : 'flex-start',
                    backgroundColor: isActive ? '#3b82f6' : 'transparent',
                    color: isActive ? 'white' : 'black',
                    boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && isInitialized) {
                      e.currentTarget.style.backgroundColor = '#93c5fd';
                      e.currentTarget.style.color = '#111827';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && isInitialized) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'black';
                    }
                  }}
                  title={isInitialized && isCollapsed ? item.name : ''}
                >
                  <span style={{ 
                    fontSize: '1.125rem', 
                    display: 'flex',
                    flexShrink: 0,
                  }}>
                    {item.icon}
                  </span>
                  
                  {/* Menu item name - only show when not collapsed AND initialized */}
                  {isInitialized && !isCollapsed && (
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 500,
                      marginLeft: '0.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.name}
                    </span>
                  )}
                </button>
              );
            })
          ) : user ? (
            <div style={{ 
              padding: '0.75rem', 
              textAlign: 'center', 
              color: '#4b5563',
              fontSize: '0.875rem',
            }}>
              <p style={{ fontWeight: 600 }}>No modules available</p>
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280',
                marginTop: '0.25rem',
              }}>
                Contact admin for permissions
              </p>
            </div>
          ) : null}
        </nav>

        {/* Logout Button */}
        <div style={{
          padding: isInitialized && isCollapsed ? '0.5rem' : '0.75rem',
          borderTop: '1px solid #d1d5db',
          backgroundColor: '#93c5fd',
        }}>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isInitialized && isCollapsed ? 'center' : 'center',
              width: '100%',
              padding: '0.75rem',
              color: 'black',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: isLoggingOut ? 'not-allowed' : 'pointer',
              backgroundColor: isLoggingOut ? '#9ca3af' : 'transparent',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoggingOut && isInitialized) {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoggingOut && isInitialized) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'black';
              }
            }}
            title={isInitialized && isCollapsed ? 'Logout' : ''}
          >
            {isLoggingOut ? (
              <>
                <div style={{
                  animation: 'spin 1s linear infinite',
                  borderRadius: '50%',
                  width: '1rem',
                  height: '1rem',
                  border: '2px solid transparent',
                  borderTopColor: 'white',
                  borderRightColor: 'white',
                  flexShrink: 0,
                }} />
                {isInitialized && !isCollapsed && (
                  <span style={{ 
                    fontWeight: 500, 
                    marginLeft: '0.75rem' 
                  }}>
                    Logging out...
                  </span>
                )}
              </>
            ) : (
              <>
                <FaSignOutAlt style={{ 
                  flexShrink: 0,
                  marginRight: isInitialized && !isCollapsed ? '0.75rem' : 0 
                }} /> 
                {isInitialized && !isCollapsed && (
                  <span style={{ fontWeight: 500 }}>Logout</span>
                )}
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;