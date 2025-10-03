'use client';

import { useState } from 'react';

export default function RoleAccessControl() {
  const roles = [
    'Staff',
    'Incharge',
    'Team Leader',
    'Accountant',
    'Admin',
    'Driver',
  ];

  // Role-wise data (har role ka apna modules & permissions)
  const [roleWiseSettings, setRoleWiseSettings] = useState(
    roles.reduce((acc, role) => {
      acc[role] = {
        modules: {
          'Filling Requests': true,
          'Loading Station': true,
          'Customer': true,
          'Vehicle': true,
          'LR Management': true,
          'Loading History': true,
          'Tanker History': true,
          'Deepo History': true,
          'Items & Products': true,
          'Employees': true,
          'Suppliers': true,
          'Transporters': true,
          'NB Accounts': true,
          'NB Expenses': true,
          'NB Stock': true,
          'Voucher': true,
          'Stock Transfer': true,
          'Remarks': true,
        },
        permissions: {
          'View': true,
          'Edit': true,
          'Delete': false,
          'Approved': false,
          'Generate Reports': true,
        },
      };
      return acc;
    }, {})
  );

  const [selectedRole, setSelectedRole] = useState('Staff');

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
    alert(
      `Permissions saved for role: ${selectedRole}\n` +
        JSON.stringify(roleWiseSettings[selectedRole], null, 2)
    );
  };

  const handleCancel = () => {
    alert('Changes discarded');
  };

  const modules = roleWiseSettings[selectedRole].modules;
  const permissions = roleWiseSettings[selectedRole].permissions;

  return (
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {Object.entries(modules).map(([module, checked]) => (
                  <div key={module} className="flex items-center">
                    <input
                      type="checkbox"
                      id={module}
                      checked={checked}
                      onChange={() => toggleModule(module)}
                      className="h-4 w-4 text-blue-600 rounded mr-2"
                    />
                    <label htmlFor={module} className="text-gray-700">
                      {module}
                    </label>
                  </div>
                ))}
              </div>

              {/* Permissions */}
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Permissions
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(permissions).map(([permission, checked]) => (
                    <div key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        id={permission}
                        checked={checked}
                        onChange={() => togglePermission(permission)}
                        className="h-4 w-4 text-blue-600 rounded mr-2"
                      />
                      <label htmlFor={permission} className="text-gray-700">
                        {permission}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
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
  );
}
