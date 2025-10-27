//src/app/customers/customer-details/customerDetailsClients.jsx
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

// Eligibility utility function
const getEligibilityInfo = (eligibility) => {
  if (!eligibility) return { isEligible: false, reason: 'Unknown status' };
  
  return {
    isEligible: eligibility.eligible,
    reason: eligibility.reason || 'Eligible',
    className: eligibility.eligible 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  };
};

// Overdue check function
const checkOverdueAndShowMessage = (customer) => {
  if (customer.eligibility?.hasOverdue) {
    const overdueAmount = customer.eligibility.totalOverdue || 0;
    const message = `OVERDUE ALERT: You have overdue invoices totaling ₹${overdueAmount.toLocaleString('en-IN')}. 
    Your account has been blocked. Please make payment to automatically unblock your account. 
    After payment, your account will be automatically activated.`;
    
    // Show alert
    alert(message);
    
    return true;
  }
  return false;
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
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreditDaysModal, setShowCreditDaysModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
      
      setCustomer(data.customer);
      
      // Check for overdue and show message
      setTimeout(() => {
        checkOverdueAndShowMessage(data.customer);
      }, 1000);
      
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
      fetchCustomerDetails();
    } catch (err) {
      alert(err.message || 'Error clearing hold balance');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBalance = async (formData) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_balance',
          id,
          ...formData
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update balance');
      }
      
      alert(data.message || 'Balance updated successfully');
      setShowBalanceModal(false);
      fetchCustomerDetails();
    } catch (err) {
      alert(err.message || 'Error updating balance');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBillingType = async (billingType, creditDays) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_billing_type',
          id,
          billing_type: billingType,
          credit_days: creditDays
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update billing type');
      }
      
      alert(data.message || 'Billing type updated successfully');
      setShowBillingModal(false);
      fetchCustomerDetails();
    } catch (err) {
      alert(err.message || 'Error updating billing type');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCreditDays = async (creditDays) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_credit_days',
          id,
          credit_days: creditDays
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update credit days');
      }
      
      alert(data.message || 'Credit days updated successfully');
      setShowCreditDaysModal(false);
      fetchCustomerDetails();
    } catch (err) {
      alert(err.message || 'Error updating credit days');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProfile = async (formData) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_customer_profile',
          id,
          ...formData
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      
      alert(data.message || 'Profile updated successfully');
      setShowEditModal(false);
      fetchCustomerDetails();
    } catch (err) {
      alert(err.message || 'Error updating profile');
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
      fetchCustomerDetails();
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
      fetchCustomerDetails();
    } catch (err) {
      alert(err.message || 'Error deleting user');
    }
  };

  const handleProcessPayment = async (paymentData) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/customers/customer-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_payment',
          id,
          ...paymentData
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }
      
      if (data.unblocked) {
        alert(`Payment processed successfully! Your account has been unblocked. New limit: ₹${data.newLimit.toLocaleString('en-IN')}`);
      } else {
        alert('Payment processed successfully!');
      }
      
      setShowPaymentModal(false);
      fetchCustomerDetails();
    } catch (err) {
      alert(err.message || 'Error processing payment');
    } finally {
      setActionLoading(false);
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
  const eligibilityInfo = getEligibilityInfo(customer.eligibility);
  const isOverdue = customer.eligibility?.hasOverdue;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
     
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/customers"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isOverdue && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Make Payment
                      </button>
                    )}
                    <button
                      onClick={() => setShowCreditDaysModal(true)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      Credit Days
                    </button>
                    <button
                      onClick={() => setShowBillingModal(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      Billing Type
                    </button>
                    <button
                      onClick={() => setShowBalanceModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Manage Limit
                    </button>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Overdue Alert */}
              {isOverdue && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <h3 className="text-red-800 font-semibold">Account Blocked Due to Overdue Invoices</h3>
                  </div>
                  <p className="text-red-700 mt-2">
                    Total Overdue: ₹{(customer.eligibility.totalOverdue || 0).toLocaleString('en-IN')} | 
                    Please make payment to automatically unblock your account.
                  </p>
                </div>
              )}

              {/* Customer Summary Card */}
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                    <p className="text-gray-600 mt-1">ID: {customer.id}</p>
                    <p className="text-gray-600">
                      Billing Type: <span className="font-semibold capitalize">{customer.payment_type}</span>
                      {customer.billing_type == 1 && customer.credit_days && (
                        <span className="text-sm text-gray-500 ml-2">
                          (Credit Days: {customer.credit_days})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="mt-4 lg:mt-0 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
                      Status: {statusInfo.displayText}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${eligibilityInfo.className}`}>
                      {eligibilityInfo.reason}
                    </span>
                    {isOverdue && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        Overdue: ₹{(customer.eligibility.totalOverdue || 0).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  <div className={`rounded-lg p-4 ${
                    (customer.cst_limit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className={`text-sm font-medium ${
                      (customer.cst_limit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>Total Limit</div>
                    <div className={`text-2xl font-bold ${
                      (customer.cst_limit || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>₹{(customer.cst_limit || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className={`rounded-lg p-4 ${
                    (customer.amtlimit || 0) >= 0 ? 'bg-purple-50' : 'bg-red-50'
                  }`}>
                    <div className={`text-sm font-medium ${
                      (customer.amtlimit || 0) >= 0 ? 'text-purple-600' : 'text-red-600'
                    }`}>Remaining Limit</div>
                    <div className={`text-2xl font-bold ${
                      (customer.amtlimit || 0) >= 0 ? 'text-purple-900' : 'text-red-900'
                    }`}>₹{(customer.amtlimit || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-yellow-600">Hold Balance</div>
                    <div className="text-2xl font-bold text-yellow-900">₹{(customer.hold_balance || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className={`rounded-lg p-4 ${
                    isOverdue ? 'bg-red-50' : 'bg-blue-50'
                  }`}>
                    <div className={`text-sm font-medium ${
                      isOverdue ? 'text-red-600' : 'text-blue-600'
                    }`}>Available Balance</div>
                    <div className={`text-2xl font-bold ${
                      isOverdue ? 'text-red-900' : 'text-blue-900'
                    }`}>
                      ₹{((customer.amtlimit || 0) - (customer.hold_balance || 0)).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="bg-white rounded-xl shadow-sm border mb-6">
                <nav className="flex overflow-x-auto">
                  {['details', 'users', 'balance', 'outstanding', 'history', 'activity'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-shrink-0 py-4 px-6 border-b-2 font-medium text-sm capitalize transition-colors whitespace-nowrap ${
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
                {activeTab === 'balance' && (
                  <BalanceTab 
                    customer={customer} 
                    onClearHoldBalance={handleClearHoldBalance}
                    actionLoading={actionLoading}
                  />
                )}
                {activeTab === 'outstanding' && (
                  <OutstandingTab customer={customer} />
                )}
                {activeTab === 'history' && (
                  <HistoryTab customer={customer} />
                )}
                {activeTab === 'activity' && (
                  <ActivityTab customer={customer} />
                )}
              </div>
            </main>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Modals */}
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
      {showBalanceModal && (
        <ManageBalanceModal
          customer={customer}
          onClose={() => setShowBalanceModal(false)}
          onSubmit={handleUpdateBalance}
          loading={actionLoading}
        />
      )}
      {showBillingModal && (
        <BillingTypeModal
          customer={customer}
          onClose={() => setShowBillingModal(false)}
          onSubmit={handleUpdateBillingType}
          loading={actionLoading}
        />
      )}
      {showEditModal && (
        <EditProfileModal
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateProfile}
          loading={actionLoading}
        />
      )}
      {showCreditDaysModal && (
        <CreditDaysModal
          customer={customer}
          onClose={() => setShowCreditDaysModal(false)}
          onSubmit={handleUpdateCreditDays}
          loading={actionLoading}
        />
      )}
      {showPaymentModal && (
        <PaymentModal
          customer={customer}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handleProcessPayment}
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
    { label: 'Address', value: customer.address },
    { label: 'City', value: customer.city },
    { label: 'State', value: customer.region },
    { label: 'Country', value: customer.country },
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

function BalanceTab({ customer, onClearHoldBalance, actionLoading }) {
  const availableBalance = (customer.amtlimit || 0) - (customer.hold_balance || 0);
  
  const balanceItems = [
    { 
      label: 'Total Limit (cst_limit)', 
      value: customer.cst_limit || 0, 
      color: customer.cst_limit >= 0 ? 'text-blue-600' : 'text-red-600',
      description: 'Maximum credit limit set for customer'
    },
    { 
      label: 'Remaining Limit (amtlimit)', 
      value: customer.amtlimit || 0, 
      color: customer.amtlimit >= 0 ? 'text-green-600' : 'text-red-600',
      description: 'Remaining available limit (can be negative)'
    },
    { 
      label: 'Hold Balance', 
      value: customer.hold_balance || 0, 
      color: 'text-yellow-600',
      description: 'Amount currently on hold'
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Balance Information</h3>
        <button
          onClick={onClearHoldBalance}
          disabled={actionLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {actionLoading ? 'Clearing...' : 'Clear Hold Balance'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {balanceItems.map((item, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">{item.label}</div>
            <div className={`text-2xl font-bold ${item.color} mb-2`}>
              ₹{item.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400">{item.description}</div>
          </div>
        ))}
        <div className={`rounded-lg p-6 ${
          availableBalance >= 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className={`text-sm font-medium ${
            availableBalance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>Available Balance</div>
          <div className={`text-2xl font-bold ${
            availableBalance >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-400">Remaining Limit - Hold Balance</div>
        </div>
      </div>

      {/* Eligibility Information */}
      {customer.eligibility && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Eligibility Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Eligible for Orders:</span>
                <span className={customer.eligibility.eligible ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {customer.eligibility.eligible ? 'Yes' : 'No'}
                </span>
              </div>
              {!customer.eligibility.eligible && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reason:</span>
                  <span className="text-red-600 font-semibold">{customer.eligibility.reason}</span>
                </div>
              )}
              {customer.eligibility.hasOverdue && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Overdue Amount:</span>
                  <span className="text-red-600 font-semibold">
                    ₹{(customer.eligibility.totalOverdue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {customer.eligibility.availableBalance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Available Balance:</span>
                  <span className={customer.eligibility.availableBalance >= 0 ? 'text-blue-600 font-semibold' : 'text-red-600 font-semibold'}>
                    ₹{customer.eligibility.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {customer.eligibility.totalLimit !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Limit:</span>
                  <span className={customer.eligibility.totalLimit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    ₹{customer.eligibility.totalLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OutstandingTab({ customer }) {
  if (customer.billing_type != 1) {
    return (
      <div className="p-6 text-center text-gray-500">
        This customer is on prepaid billing. No outstanding invoices.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Outstanding Invoices</h3>
      
      {customer.outstandingInvoices && customer.outstandingInvoices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customer.outstandingInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{invoice.total_amount?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{invoice.paid_amount?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                    ₹{invoice.remaining_amount?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No outstanding invoices found.
        </div>
      )}
    </div>
  );
}

function HistoryTab({ customer }) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Transaction History</h3>
      
      {customer.transactionHistory && customer.transactionHistory.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customer.transactionHistory.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.created_date).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{transaction.amount?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {transaction.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No transaction history found.
        </div>
      )}
    </div>
  );
}

function ActivityTab({ customer }) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity Logs</h3>
      
      <div className="space-y-6">
        {Object.entries(customer.logs).map(([action, log]) => (
          <div key={action} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-medium text-gray-900 capitalize">{action}</h4>
                <span className="text-xs text-gray-500">{log.date}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">By: {log.name || 'Not available'}</p>
            </div>
          </div>
        ))}
      </div>
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

function ManageBalanceModal({ customer, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    balance_type: 'cst_limit',
    operation: 'increase',
    amount: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Manage Customer Limit</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Current Balance</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Limit (cst_limit):</span>
                <span className={`font-semibold ${(customer.cst_limit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{(customer.cst_limit || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Remaining Limit (amtlimit):</span>
                <span className={`font-semibold ${(customer.amtlimit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ₹{(customer.amtlimit || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Balance Type</label>
              <select 
                value={formData.balance_type}
                onChange={(e) => setFormData({...formData, balance_type: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cst_limit">Total Limit (cst_limit)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operation</label>
              <select 
                value={formData.operation}
                onChange={(e) => setFormData({...formData, operation: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
              <input 
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="Enter amount"
                required 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <p className="text-xs text-gray-500 mt-1">
                Note: Limit can go negative when decreasing
              </p>
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
                {loading ? 'Updating...' : 'Update Limit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function BillingTypeModal({ customer, onClose, onSubmit, loading }) {
  const [billingType, setBillingType] = useState(customer.billing_type || 2);
  const [creditDays, setCreditDays] = useState(customer.credit_days || 7);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(billingType, creditDays);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Update Billing Type</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Billing Type</label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input 
                    type="radio" 
                    name="billingType" 
                    value={1} 
                    checked={billingType == 1}
                    onChange={(e) => setBillingType(parseInt(e.target.value))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Postpaid</div>
                    <div className="text-sm text-gray-500">Credit facility with payment terms</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input 
                    type="radio" 
                    name="billingType" 
                    value={2} 
                    checked={billingType == 2}
                    onChange={(e) => setBillingType(parseInt(e.target.value))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Prepaid</div>
                    <div className="text-sm text-gray-500">Customer pays in advance</div>
                  </div>
                </label>
              </div>
            </div>

            {billingType == 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Credit Days</label>
                <input 
                  type="number"
                  min="1"
                  max="90"
                  value={creditDays}
                  onChange={(e) => setCreditDays(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter credit days"
                />
                <p className="text-xs text-gray-500 mt-1">Number of days allowed for payment after invoice</p>
              </div>
            )}
            
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
                {loading ? 'Updating...' : 'Update Billing Type'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({ customer, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    gst_name: customer.gst_name || '',
    gst_number: customer.gst_number || '',
    status: customer.status || 1
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Customer Profile</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input 
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input 
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Name</label>
                <input 
                  type="text"
                  name="gst_name"
                  value={formData.gst_name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                <input 
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CreditDaysModal({ customer, onClose, onSubmit, loading }) {
  const [creditDays, setCreditDays] = useState(customer.credit_days || 7);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (creditDays < 1 || creditDays > 90) {
      alert('Credit days must be between 1 and 90');
      return;
    }
    onSubmit(creditDays);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Update Credit Days</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Days</label>
              <input 
                type="number"
                min="1"
                max="90"
                value={creditDays}
                onChange={(e) => setCreditDays(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of days allowed for payment after invoice generation. 
                Customer will be automatically blocked if payment is not received within these days.
              </p>
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
                {loading ? 'Updating...' : 'Update Credit Days'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ customer, onClose, onSubmit, loading }) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const totalOverdue = customer.eligibility?.totalOverdue || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    
    onSubmit({
      paymentAmount: parseFloat(paymentAmount)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Process Payment</h3>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h4 className="text-red-800 font-semibold">Account Blocked Due to Overdue</h4>
            </div>
            <p className="text-red-700 mt-2">
              Total Overdue Amount: ₹{totalOverdue.toLocaleString('en-IN')}
            </p>
            <p className="text-green-600 text-sm mt-2">
              After payment, your account will be automatically unblocked and limit restored.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (₹)</label>
              <input 
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
                required 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: ₹{totalOverdue.toLocaleString('en-IN')} (total overdue amount)
              </p>
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
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : 'Process Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}