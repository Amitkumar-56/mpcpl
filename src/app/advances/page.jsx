'use client';
import { CheckCircle, Clock, DollarSign, Edit2, FileText, Plus, Search, XCircle } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Loading skeleton component
const TableSkeleton = () => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <th key={i} className="px-6 py-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={i}>
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
              <td key={j} className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Stats Card Skeleton
const StatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    ))}
  </div>
);

// Main content component that uses Suspense
function AdvancesContent() {
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [addForm, setAddForm] = useState({
    employee_id: '',
    amount: '',
    reason: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const [updateForm, setUpdateForm] = useState({
    status: 'pending',
    repayment_amount: '',
    repayment_date: '',
    remarks: ''
  });

  const paymentMethods = ['cash', 'bank', 'cheque', 'upi'];
  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'approved', label: 'Approved', color: 'blue' },
    { value: 'rejected', label: 'Rejected', color: 'red' },
    { value: 'repaid', label: 'Repaid', color: 'green' }
  ];

  useEffect(() => {
    fetchAdvances();
    fetchEmployees();
  }, []);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/advances');
      const data = await response.json();
      
      if (data.success) {
        setAdvances(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch advances');
        setAdvances([]);
      }
    } catch (error) {
      console.error('Error fetching advances:', error);
      toast.error('Error fetching advances: ' + error.message);
      setAdvances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Try multiple possible endpoints
      let response;
      let data;
      
      // Try the employee profile endpoint first
      try {
        response = await fetch('/api/employee-profile');
        data = await response.json();
        
        if (data.success && data.data) {
          setEmployees(data.data);
          return;
        }
      } catch (err) {
        console.log('Employee profile endpoint failed:', err);
      }
      
      // Try alternative endpoint
      try {
        response = await fetch('/api/get-employees');
        data = await response.json();
        
        if (data.employees && Array.isArray(data.employees)) {
          setEmployees(data.employees);
          return;
        }
      } catch (err) {
        console.log('Get employees endpoint failed:', err);
      }
      
      // Try direct users endpoint
      try {
        response = await fetch('/api/users');
        data = await response.json();
        
        if (data.success && data.users) {
          setEmployees(data.users);
          return;
        }
      } catch (err) {
        console.log('Users endpoint failed:', err);
      }
      
      // If all fail, set empty array
      console.warn('No employee endpoint found, using empty list');
      setEmployees([]);
      
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const addAdvance = async () => {
    if (!addForm.employee_id || !addForm.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate amount
    const amount = parseFloat(addForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          amount: amount
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        toast.error(`Server error: ${response.status}`);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Advance added successfully!');
        setShowAddModal(false);
        setAddForm({
          employee_id: '',
          amount: '',
          reason: '',
          payment_method: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          remarks: ''
        });
        fetchAdvances(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to add advance');
      }
    } catch (error) {
      console.error('Error adding advance:', error);
      toast.error('Error adding advance: ' + error.message);
    }
  };

  const updateAdvance = async () => {
    if (!selectedAdvance) return;

    try {
      const response = await fetch('/api/advances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAdvance.id,
          ...updateForm
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Advance updated successfully!');
        setSelectedAdvance(null);
        fetchAdvances();
      } else {
        toast.error(data.error || 'Failed to update advance');
      }
    } catch (error) {
      console.error('Error updating advance:', error);
      toast.error('Error updating advance');
    }
  };

  const openUpdateModal = (advance) => {
    setSelectedAdvance(advance);
    setUpdateForm({
      status: advance.status || 'pending',
      repayment_amount: advance.repayment_amount || '',
      repayment_date: advance.repayment_date || '',
      remarks: advance.remarks || ''
    });
  };

  const filteredAdvances = advances.filter(advance => {
    const matchesSearch = advance.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         advance.emp_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || advance.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: advances.length,
    pending: advances.filter(a => a.status === 'pending').length,
    approved: advances.filter(a => a.status === 'approved').length,
    rejected: advances.filter(a => a.status === 'rejected').length,
    repaid: advances.filter(a => a.status === 'repaid').length,
    totalAmount: advances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0)
  };

  if (loading) {
    return (
      <>
        <StatsSkeleton />
        <TableSkeleton />
      </>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Total Advances</p>
              <p className="text-2xl font-bold text-purple-900">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Approved</p>
              <p className="text-2xl font-bold text-blue-900">{stats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Repaid</p>
              <p className="text-2xl font-bold text-green-900">{stats.repaid}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Total Amount Card */}
      <div className="px-6 pb-4">
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-600 text-sm font-medium">Total Amount Disbursed</p>
              <p className="text-2xl font-bold text-indigo-900">₹{stats.totalAmount.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="px-6 pb-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Advance
            </button>
          </div>
        </div>
      </div>

      {/* Advances Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAdvances.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No advance records found
                </td>
              </tr>
            ) : (
              filteredAdvances.map((advance) => (
                <tr key={advance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{advance.employee_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{advance.emp_code || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{parseFloat(advance.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={advance.reason}>
                      {advance.reason || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="capitalize">{advance.payment_method || 'cash'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {advance.payment_date ? new Date(advance.payment_date).toLocaleDateString('en-IN') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      advance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      advance.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      advance.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {statusOptions.find(opt => opt.value === advance.status)?.label || advance.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openUpdateModal(advance)}
                      className="text-purple-600 hover:text-purple-900 p-2 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                      title="Update Status"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Advance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Advance</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                <select
                  value={addForm.employee_id}
                  onChange={(e) => setAddForm({...addForm, employee_id: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || emp.employee_name} ({emp.emp_code || emp.employee_code})
                    </option>
                  ))}
                </select>
                {employees.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No employees found. Please check employee data.</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addForm.amount}
                  onChange={(e) => setAddForm({...addForm, amount: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter amount"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <textarea
                  value={addForm.reason}
                  onChange={(e) => setAddForm({...addForm, reason: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter reason for advance"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={addForm.payment_method}
                  onChange={(e) => setAddForm({...addForm, payment_method: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  value={addForm.payment_date}
                  onChange={(e) => setAddForm({...addForm, payment_date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={addForm.remarks}
                  onChange={(e) => setAddForm({...addForm, remarks: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="2"
                  placeholder="Additional remarks"
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addAdvance}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
              >
                Add Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Advance Modal */}
      {selectedAdvance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Update Advance - {selectedAdvance.employee_name}</h3>
              <button
                onClick={() => setSelectedAdvance(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              {updateForm.status === 'repaid' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={updateForm.repayment_amount}
                      onChange={(e) => setUpdateForm({...updateForm, repayment_amount: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter repayment amount"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Date</label>
                    <input
                      type="date"
                      value={updateForm.repayment_date}
                      onChange={(e) => setUpdateForm({...updateForm, repayment_date: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={updateForm.remarks}
                  onChange={(e) => setUpdateForm({...updateForm, remarks: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  placeholder="Update remarks..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedAdvance(null)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={updateAdvance}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
              >
                Update Advance
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Main component with Suspense boundary
export default function AdvancesManagement() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-8 w-8" />
              Advances Management
            </h1>
            <p className="text-purple-100 mt-1">Manage employee advances and repayments</p>
          </div>

          <Suspense fallback={
            <>
              <StatsSkeleton />
              <TableSkeleton />
            </>
          }>
            <AdvancesContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}