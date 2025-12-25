// src/app/roles/page.jsx
'use client';

import { useSession } from '@/context/SessionContext';
import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RoleAccessControl() {
  const { user, loading: authLoading } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const roles = [
    'Staff',
    'Incharge',
    'Team Leader',
    'Accountant',
    'Admin',
    'Driver',
    'Hard Operation',
  ];

  // All available modules (matching database module names)
  const allModules = [
    'Dashboard',
    'Customers',
    'Filling Requests',
    'Stock',
    'Loading Station',
    'Schedule Prices',
    'Products',
    'Employees',
    'Suppliers',
    'Transporters',
    'NB Accounts',
    'NB Expenses',
    'NB Stock',
    'Stock Transfer',
    'Reports',
    'Retailers',
    'Agent Management',
    'Users',
    'Vehicles',
    'LR Management',
    'Loading History',
    'Tanker History',
    'Deepo History',
    'Vouchers',
    'Remarks',
    'Items'
  ];

  // Role-wise data (har role ka apna modules & permissions)
  const [roleWiseSettings, setRoleWiseSettings] = useState(
    roles.reduce((acc, role) => {
      acc[role] = {
        modules: allModules.reduce((modAcc, mod) => {
          modAcc[mod] = false;
          return modAcc;
        }, {}),
        permissions: {
          'View': false,
          'Edit': false,
          'Delete': false,
        },
      };
      return acc;
    }, {})
  );

  const [selectedRole, setSelectedRole] = useState('Staff');
  const [availableModules, setAvailableModules] = useState(allModules);
  const [saving, setSaving] = useState(false);

  const toggleModule = (module) => {
    setRoleWiseSettings((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        modules: {
          ...prev[selectedRole].modules,
          [module]: !prev[selectedRole].modules[module],
        },
      },
    }));
  };

  const togglePermission = (permission) => {
    setRoleWiseSettings((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        permissions: {
          ...prev[selectedRole].permissions,
          [permission]: !prev[selectedRole].permissions[permission],
        },
      },
    }));
  };

  const handleSave = () => {
    saveRolePermissions();
  };

  const handleCancel = () => {
    alert('Changes discarded');
  };

  // Check if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      // Only admin (role 5) can access this page
      if (Number(user.role) !== 5) {
        router.push('/dashboard');
        return;
      }
      setLoading(false);
      fetchRolePermissions();
    }
  }, [user, authLoading]);

  const fetchRolePermissions = async () => {
    try {
      // Fetch all modules from database
      const modulesRes = await fetch('/api/roles/modules');
      const modulesData = await modulesRes.json();
      
      if (modulesData.success && modulesData.modules) {
        setAvailableModules(modulesData.modules);
      }
      
      // Fetch role permissions from database
      const permsRes = await fetch('/api/roles/permissions');
      const permsData = await permsRes.json();
      
      // Update state with database data
      if (permsData.success && permsData.permissions) {
        const roleMap = {
          1: 'Staff',
          2: 'Incharge',
          3: 'Team Leader',
          4: 'Accountant',
          5: 'Admin',
          6: 'Driver',
          7: 'Hard Operation'
        };

        const updatedSettings = { ...roleWiseSettings };
        
        // Update each role's permissions from database
        Object.keys(permsData.permissions).forEach(roleNum => {
          const roleName = roleMap[Number(roleNum)];
          if (roleName && updatedSettings[roleName]) {
            const rolePerms = permsData.permissions[roleNum];
            const modules = {};
            let hasView = false, hasEdit = false, hasDelete = false;

            Object.keys(rolePerms).forEach(moduleName => {
              modules[moduleName] = true;
              if (rolePerms[moduleName].can_view) hasView = true;
              if (rolePerms[moduleName].can_edit) hasEdit = true;
              if (rolePerms[moduleName].can_delete) hasDelete = true;
            });

            updatedSettings[roleName] = {
              modules: modules,
              permissions: {
                'View': hasView,
                'Edit': hasEdit,
                'Delete': hasDelete
              }
            };
          }
        });

        setRoleWiseSettings(updatedSettings);
      }
    } catch (err) {
      console.error('Error fetching role permissions:', err);
    }
  };

  const saveRolePermissions = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/roles/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          permissions: roleWiseSettings[selectedRole]
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Permissions saved successfully for ${selectedRole}`);
        // Refresh permissions
        fetchRolePermissions();
      } else {
        alert('Error saving permissions: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      alert('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 w-full">
          <div className="sticky top-0 z-10">
            <Header />
          </div>
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Only admin can access
  if (Number(user?.role) !== 5) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 w-full">
          <div className="sticky top-0 z-10">
            <Header />
          </div>
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6">Only administrators can access role permissions.</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const modules = roleWiseSettings[selectedRole].modules;
  const permissions = roleWiseSettings[selectedRole].permissions;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="sticky top-0 h-screen">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 w-full">
        <div className="sticky top-0 z-10">
          <Header />
        </div>
        <main className="flex-1 overflow-auto p-6">
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-800 p-4 text-white">
          <p className="text-sm text-blue-100">Role & Access Settings</p>
        </div>

        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Panel - Roles */}
            <div className="w-full md:w-1/4 bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Roles</h2>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {roles.map((role) => (
                  <div
                    key={role}
                    className={`p-2 rounded cursor-pointer ${
                      selectedRole === role
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    {role}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel */}
            <div className="w-full md:w-3/4">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Module Access
              </h2>

              {/* Modules */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6 max-h-96 overflow-y-auto p-2">
                {availableModules.map((module) => {
                  const checked = modules[module] || false;
                  return (
                    <div key={module} className="flex items-center">
                      <input
                        type="checkbox"
                        id={module}
                        checked={checked}
                        onChange={() => toggleModule(module)}
                        className="h-4 w-4 text-blue-600 rounded mr-2"
                      />
                      <label htmlFor={module} className="text-gray-700 text-sm">
                        {module}
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Permissions */}
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Permissions (Applied to Selected Modules)
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="View"
                      checked={permissions['View'] || false}
                      onChange={() => togglePermission('View')}
                      className="h-4 w-4 text-blue-600 rounded mr-2"
                    />
                    <label htmlFor="View" className="text-gray-700 font-medium">
                      View (can_view)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="Edit"
                      checked={permissions['Edit'] || false}
                      onChange={() => togglePermission('Edit')}
                      className="h-4 w-4 text-blue-600 rounded mr-2"
                    />
                    <label htmlFor="Edit" className="text-gray-700 font-medium">
                      Edit (can_edit)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="Delete"
                      checked={permissions['Delete'] || false}
                      onChange={() => togglePermission('Delete')}
                      className="h-4 w-4 text-blue-600 rounded mr-2"
                    />
                    <label htmlFor="Delete" className="text-gray-700 font-medium">
                      Delete (can_delete)
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Note: These permissions will be applied to all selected modules above.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
                    saving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
        </main>
        <div className="sticky bottom-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
