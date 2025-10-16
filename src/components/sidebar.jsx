
//src/components/sidebar.jsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setPermissions(parsedUser.permissions || {});
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) return <p className="p-4">Loading...</p>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const moduleMapping = {
    dashboard: "Dashboard",
    users: "Users",
    reports: "Reports",
    filling_requests: "Filling Requests",
     stock: "stock",
    loading_stations: "Loading Station",
    vehicles: "Vehicle",
    schedule_price: "Schedule Prices",

    lr_management: "LR Management",
    history: "Loading History",
    products: "Items & Products",
    employees: "Employees",
    suppliers: "Suppliers",
    transporters: "Transporters",
    nb_management: "NB Accounts",
    vouchers: "Voucher",
    stock: "Stock Transfer",
    remarks: "Remarks",
    settings: "Settings",
    customers: "Customer",
    tanker_history: "Tanker History",
    deepo_history: "Deepo History",
    nb_expenses: "NB Expenses",
    nb_stock: "NB Stock",
  };

  const menuItems = [
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
    { name: "NB Accounts", icon: <FaClipboard />, module: "nb_management", path: "/nb-management" },
    { name: "NB Expenses", icon: <FaMoneyBill />, module: "nb_expenses", path: "/nb-expenses" },
    { name: "NB Stock", icon: <FaBox />, module: "nb_stock", path: "/nb-stock" },
    { name: "Stock Transfer", icon: <FaExchangeAlt />, module: "stock", path: "/stock" },
    { name: "Reports", icon: <FaFileAlt />, module: "reports", path: "/reports" },
    { name: "Retailers", icon: <FaUsers />, module: "retailers", path: "/retailers" },
    { name: "Agent Management", icon: <FaUserTie />, module: "agent_management", path: "/agent-management" },
    { name: "Users", icon: <FaUsers />, module: "users", path: "/users" },
    { name: "Vehicles", icon: <FaTruckMoving />, module: "vehicles", path: "/vehicles" },
    { name: "LR Management", icon: <FaClipboard />, module: "lr_management", path: "/lr-management" },
    { name: "Loading History", icon: <FaHistory />, module: "history", path: "/history" },
    { name: "Tanker History", icon: <FaHistory />, module: "tanker_history", path: "/tanker-history" },
    { name: "Deepo History", icon: <FaHistory />, module: "deepo_history", path: "/deepo-history" },
    { name: "Vouchers", icon: <FaFileInvoice />, module: "vouchers", path: "/vouchers" },
    { name: "Remarks", icon: <FaStickyNote />, module: "remarks", path: "/remarks" },
    { name: "Settings", icon: <FaCog />, module: "settings", path: "/settings" },
  ];

  // ✅ Admin (role 5) gets full access
  const allowedMenu =
    user.role === 5
      ? menuItems
      : menuItems.filter((item) => {
          const backendModuleName = moduleMapping[item.module];
          return permissions[backendModuleName] && permissions[backendModuleName].can_view;
        });

  return (
    <>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Chrome, Safari */
        }
        .scrollbar-hide {
          -ms-overflow-style: none; /* IE, Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>

      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-16 z-50 p-2 bg-gray-900 text-white rounded"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-40 w-64 h-screen bg-blue-200 text-black flex flex-col transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300`}
      >
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-hide">
          {allowedMenu.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.path);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full p-3 mb-2 rounded transition-colors ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : "text-black hover:bg-gray-700 hover:text-white"
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="text-sm">{item.name}</span>
              </button>
            );
          })}

          {allowedMenu.length === 0 && (
            <div className="p-3 text-center text-gray-400">
              No modules available for your role
            </div>
          )}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center p-3 border-t border-gray-700 text-black hover:bg-red-600 hover:text-white transition-colors"
        >
          <FaSignOutAlt className="mr-3" /> Logout
        </button>
      </aside>
    </>
  );
}
