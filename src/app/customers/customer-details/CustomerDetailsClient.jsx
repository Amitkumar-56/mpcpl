'use client';
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Status utility function
const getStatusInfo = (status) => {
  const activeStatuses = ['Yes', 'yes', 'Active', 'active', 'true', true, 1, '1'];
  const isActive = activeStatuses.includes(status);
  
  return {
    isActive,
    displayText: isActive ? 'Active' : 'Inactive',
    className: isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  };
};

export default function CustomerDetailsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerDetails();
    } else {
      setError('Customer ID is missing');
      setLoading(false);
    }
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch(`/api/customers/customer-details?id=${id}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Failed to fetch customer details: ${res.status}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.customer) {
        throw new Error('Customer data not found in response');
      }
      
      // Debugging के लिए
      console.log('Customer Status from API:', data.customer.status);
      console.log('Status Type:', typeof data.customer.status);
      
      setCustomer(data.customer);
    } catch (err) {
      console.error('Error in fetchCustomerDetails:', err);
      setError(err.message || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHoldBalance = async () => {
    if (!confirm('Are you sure you want to clear the holding balance?')) return;
    
    try {
      setActionLoading(true);
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_hold_balance', id }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clear hold balance');
      }
      
      alert(data.message || 'Hold balance cleared successfully');
      fetchCustomerDetails(); // Refresh data
    } catch (err) {
      alert(err.message || 'Error clearing hold balance');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      setActionLoading(true);
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_user',
          com_id: id,
          name: formData.get('client_name'),
          phone: formData.get('phone'),
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add user');
      }
      
      alert(data.message || 'User added successfully');
      setShowAddUserModal(false);
      fetchCustomerDetails(); // Refresh data
    } catch (err) {
      alert(err.message || 'Error adding user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      setActionLoading(true);
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_password',
          userId: selectedUser.id,
          newPassword: formData.get('password'),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      
      alert(data.message || 'Password updated successfully');
      setShowPasswordModal(false);
      setSelectedUser(null);
    } catch (err) {
      alert(err.message || 'Error updating password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', userId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }
      
      alert(data.message || 'User deleted successfully');
      fetchCustomerDetails(); // Refresh data
    } catch (err) {
      alert(err.message || 'Error deleting user');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading customer details...</p>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 text-xl mb-4">Error: {error}</div>
              <div className="space-x-4">
                <button
                  onClick={() => router.back()}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={fetchCustomerDetails}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // No customer found
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-600 text-xl mb-4">Customer not found</div>
              <button
                onClick={() => router.back()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(customer.status);

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar />
     
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        
        {/* Main Content Area - यहाँ scroll होगा */}
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/customers"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
                  </div>
                  <Link
                    href={`/customers/update-customer?id=${customer.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Customer
                  </Link>
                </div>
              </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Customer Summary Card */}
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                    <p className="text-gray-600 mt-1">ID: {customer.id}</p>
                  </div>
                  <div className="mt-4 lg:mt-0 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
                      {statusInfo.displayText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs - अब केवल 2 tabs हैं */}
              <div className="bg-white rounded-xl shadow-sm border mb-6">
                <nav className="flex space-x-8 px-6">
                  {['details', 'users'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.replace('-', ' ')}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="bg-white rounded-xl shadow-sm border">
                {activeTab === 'details' && (
                  <DetailsTab customer={customer} onClearHoldBalance={handleClearHoldBalance} actionLoading={actionLoading} />
                )}
                {activeTab === 'users' && (
                  <UsersTab
                    customer={customer}
                    onAddUser={() => setShowAddUserModal(true)}
                    onEditUser={(user) => {
                      setSelectedUser(user);
                      setShowPasswordModal(true);
                    }}
                    onDeleteUser={handleDeleteUser}
                  />
                )}
              </div>
            </main>
          </div>
        </div>

        {/* Footer - यहाँ fixed रहेगा */}
        <Footer />
      </div>

      {/* Modals - ये overlay में रहेंगे */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onSubmit={handleAddUser}
          loading={actionLoading}
        />
      )}
      {showPasswordModal && selectedUser && (
        <UpdatePasswordModal
          user={selectedUser}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleUpdatePassword}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// --- Tab Components ---

function DetailsTab({ customer, onClearHoldBalance, actionLoading }) {
  const details = [
    { label: 'Phone', value: customer.phone },
    { label: 'Email', value: customer.email },
    { label: 'Supplier', value: customer.address },
    { label: 'GST Name', value: customer.gst_name },
    { label: 'GST Number', value: customer.gst_number },
    { label: 'Products', value: customer.productNames?.join(', ') || 'N/A' },
    {
      label: 'Block Locations',
      value: customer.blockLocations?.length > 0
        ? customer.blockLocations.join(', ')
        : 'No block locations',
    },
    {
      label: 'Hold Balance',
      value: (
        <div className="flex items-center space-x-3">
          <span className="font-semibold">
            ₹{(customer.hold_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {customer.hold_balance > 0 && (
            <button
              onClick={onClearHoldBalance}
              disabled={actionLoading}
              className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? 'Clearing...' : 'Clear Holding Balance'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {details.map((detail, index) => (
          <div key={index} className="space-y-1">
            <label className="text-sm font-medium text-gray-500">{detail.label}</label>
            <div className="text-gray-900">{detail.value || 'N/A'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab({ customer, onAddUser, onEditUser, onDeleteUser }) {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Users</h3>
        <button
          onClick={onAddUser}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add User</span>
        </button>
      </div>

      {customer.users && customer.users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customer.users.map((user, index) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => onEditUser(user)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      Update Password
                    </button>
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No users found for this customer.
        </div>
      )}
    </div>
  );
}

// --- Modal Components ---

function AddUserModal({ onClose, onSubmit, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add User</h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <input 
                name="client_name" 
                placeholder="Full Name" 
                required 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div>
              <input 
                name="email" 
                type="email" 
                placeholder="Email Address" 
                required 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div>
              <input 
                name="phone" 
                placeholder="Phone Number" 
                required 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div>
              <input 
                name="password" 
                type="password" 
                placeholder="Password" 
                required 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function UpdatePasswordModal({ user, onClose, onSubmit, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Update Password for {user.name}</h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <input 
                name="password" 
                type="password" 
                placeholder="New Password" 
                required 
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}