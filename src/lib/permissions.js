// src/lib/permissions.js
// Reusable permission checking utility

/**
 * Check if user has permission for a module
 * @param {Object} user - User object from session
 * @param {string} moduleName - Module name (e.g., 'Customers', 'Employees')
 * @param {string} action - Action to check ('can_view', 'can_edit', 'can_delete')
 * @returns {Promise<boolean>} - True if user has permission
 */
export async function checkPermission(user, moduleName, action = 'can_view') {
  if (!user || !user.id) {
    return false;
  }

  // Admin (role 5) always has access
  if (Number(user.role) === 5) {
    return true;
  }

  // Check cached permissions first
  if (user.permissions && user.permissions[moduleName]) {
    const modulePerms = user.permissions[moduleName];
    if (action === 'can_view') return modulePerms.can_view === true;
    if (action === 'can_edit') return modulePerms.can_edit === true;
    if (action === 'can_delete') return modulePerms.can_delete === true;
  }

  // Check sessionStorage cache
  const cacheKey = `perms_${user.id}_${moduleName}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const cachedPerms = JSON.parse(cached);
    const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
    const fiveMinutes = 5 * 60 * 1000;
    
    if (cacheTime && (Date.now() - Number(cacheTime)) < fiveMinutes) {
      if (action === 'can_view') return cachedPerms.can_view === true;
      if (action === 'can_edit') return cachedPerms.can_edit === true;
      if (action === 'can_delete') return cachedPerms.can_delete === true;
    }
  }

  // Fetch from API
  try {
    const response = await fetch(
      `/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=${action}`
    );
    const data = await response.json();
    
    // Cache the result
    if (data.allowed) {
      const perms = {
        can_view: action === 'can_view' ? true : false,
        can_edit: action === 'can_edit' ? true : false,
        can_delete: action === 'can_delete' ? true : false
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    }
    
    return data.allowed === true;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Check all permissions for a module at once
 * @param {Object} user - User object from session
 * @param {string} moduleName - Module name
 * @returns {Promise<Object>} - Object with can_view, can_edit, can_delete
 */
export async function checkAllPermissions(user, moduleName) {
  if (!user || !user.id) {
    return { can_view: false, can_edit: false, can_delete: false };
  }

  // Admin (role 5) always has access
  if (Number(user.role) === 5) {
    return { can_view: true, can_edit: true, can_delete: true };
  }

  // Check cached permissions first
  if (user.permissions && user.permissions[moduleName]) {
    return user.permissions[moduleName];
  }

  // Check sessionStorage cache
  const cacheKey = `perms_${user.id}_${moduleName}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const cachedPerms = JSON.parse(cached);
    const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
    const fiveMinutes = 5 * 60 * 1000;
    
    if (cacheTime && (Date.now() - Number(cacheTime)) < fiveMinutes) {
      return cachedPerms;
    }
  }

  // Fetch from API
  try {
    const [viewRes, editRes, deleteRes] = await Promise.all([
      fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
      fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
      fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`)
    ]);

    const [viewData, editData, deleteData] = await Promise.all([
      viewRes.json(),
      editRes.json(),
      deleteRes.json()
    ]);

    const perms = {
      can_view: viewData.allowed === true,
      can_edit: editData.allowed === true,
      can_delete: deleteData.allowed === true
    };

    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify(perms));
    sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

    return perms;
  } catch (error) {
    console.error('Permission check error:', error);
    return { can_view: false, can_edit: false, can_delete: false };
  }
}

/**
 * Get module name mapping for sidebar modules
 */
export const MODULE_NAMES = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  filling_requests: 'Filling Requests',
  stock: 'Stock',
  stock_history: 'Stock History',
  outstanding_history: 'Outstanding History',
  loading_stations: 'Loading Station',
  schedule_price: 'Schedule Prices',
  products: 'Products',
  employees: 'Employees',
  suppliers: 'Suppliers',
  transporters: 'Transporters',
  nb_balance: 'NB Accounts',
  nb_expenses: 'NB Expenses',
  nb_stock: 'NB Stock',
  stock_transfers: 'Stock Transfer',
  reports: 'Reports',
  retailers: 'Retailers',
  agent_management: 'Agent Management',
  users: 'Users',
  vehicles: 'Vehicles',
  lr_management: 'LR Management',
  history: 'Loading History',
  tanker_history: 'Tanker History',
  deepo_history: 'Deepo History',
  vouchers: 'Vouchers',
  remarks: 'Remarks',
  items: 'Items'
};

