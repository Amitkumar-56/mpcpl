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

  // Get all permissions at once
  const allPerms = await getAllUserPermissions(user);
  
  if (allPerms && allPerms[moduleName]) {
    const modulePerms = allPerms[moduleName];
    if (action === 'can_view') return modulePerms.can_view === true;
    if (action === 'can_edit') return modulePerms.can_edit === true;
    if (action === 'can_create') return modulePerms.can_create === true;
  }
  
  return false;
}

/**
 * Get all permissions for a user at once
 * @param {Object} user - User object from session
 * @returns {Promise<Object>} - Object with all module permissions
 */
export async function getAllUserPermissions(user) {
  if (!user || !user.id) {
    return {};
  }

  // Check sessionStorage cache first
  const cacheKey = `all_perms_${user.id}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
    const fiveMinutes = 5 * 60 * 1000;
    
    if (cacheTime && (Date.now() - Number(cacheTime)) < fiveMinutes) {
      return JSON.parse(cached);
    }
  }

  // Fetch from new API
  try {
    const response = await fetch(`/api/employee-permissions?employee_id=${user.id}`);
    const data = await response.json();
    
    if (data.success && data.permissions) {
      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify(data.permissions));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      return data.permissions;
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching all permissions:', error);
    return {};
  }
}

/**
 * Check all permissions for a module at once
 * @param {Object} user - User object from session
 * @param {string} moduleName - Module name
 * @returns {Promise<Object>} - Object with can_view, can_edit, can_create
 */
export async function checkAllPermissions(user, moduleName) {
  if (!user || !user.id) {
    return { can_view: false, can_edit: false, can_create: false };
  }

  // Admin (role 5) always has access
  if (Number(user.role) === 5) {
    return { can_view: true, can_edit: true, can_create: true };
  }

  // Get all permissions at once
  const allPerms = await getAllUserPermissions(user);
  
  if (allPerms && allPerms[moduleName]) {
    return allPerms[moduleName];
  }
  
  return { can_view: false, can_edit: false, can_create: false };
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

