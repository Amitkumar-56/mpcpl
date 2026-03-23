'use client';
import { AlertCircle, Banknote, CreditCard, DollarSign, Play, RefreshCw, Search, Users } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Loading skeleton component
function PaymentReleaseSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4">
            <div className="h-8 bg-green-500 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-green-400 rounded w-64 mt-1 animate-pulse"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters Skeleton */}
          <div className="px-6 pb-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <th key={i} className="px-6 py-3">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with all the logic
function PaymentReleaseContent() {
  const [pendingSalaries, setPendingSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const [releaseForm, setReleaseForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank',
    remarks: ''
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const paymentMethods = ['bank', 'cash', 'cheque', 'upi'];

  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalNetSalary: 0,
    totalAdvances: 0,
    finalTotal: 0
  });

  useEffect(() => {
    fetchPendingSalaries();
  }, [selectedMonth, selectedYear]);

  const fetchPendingSalaries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payment-release?month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      
      console.log('Connected payment data response:', data);
      
      if (data.success) {
        setPendingSalaries(data.data);
        
        const stats = {
          totalEmployees: data.data.length,
          totalNetSalary: data.data.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0),
          totalAdvances: data.data.reduce((sum, s) => sum + s.totalAdvanceAmount, 0),
          finalTotal: data.data.reduce((sum, s) => sum + s.finalNetSalary, 0)
        };
        
        setStats(stats);
        setSelectedEmployees([]);
      } else {
        toast.error(data.error || 'Failed to fetch payment data');
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Error fetching payment data');
    } finally {
      setLoading(false);
    }
  };

  const releasePayments = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    try {
      setReleasing(true);
      const response = await fetch('/api/payment-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          payment_date: releaseForm.payment_date,
          payment_method: releaseForm.payment_method,
          remarks: releaseForm.remarks,
          selected_employees: selectedEmployees
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowReleaseModal(false);
        setSelectedEmployees([]);
        fetchPendingSalaries();
        
        generatePaymentSummary(data.data.releasedEmployees);
      } else {
        toast.error(data.error || 'Failed to release payments');
      }
    } catch (error) {
      toast.error('Error releasing payments');
    } finally {
      setReleasing(false);
    }
  };

  const generatePaymentSummary = (releasedEmployees) => {
    const summary = `
PAYMENT RELEASE SUMMARY
=======================
Date: ${new Date().toLocaleDateString('en-IN')}
Month: ${months[selectedMonth - 1]} ${selectedYear}
Payment Method: ${releaseForm.payment_method.toUpperCase()}
Payment Date: ${releaseForm.payment_date}

Employees Paid: ${releasedEmployees.length}
${releasedEmployees.map(emp => 
  `${emp.employee_name}: ₹${parseFloat(emp.net_salary).toFixed(2)}`
).join('\n')}

Total Amount: ₹${releasedEmployees.reduce((sum, emp) => sum + parseFloat(emp.net_salary), 0).toFixed(2)}

Remarks: ${releaseForm.remarks || 'None'}

Generated by: Payment Release System
    `.trim();

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_summary_${selectedMonth}_${selectedYear}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(pendingSalaries.map(s => s.employee_id));
  };

  const deselectAllEmployees = () => {
    setSelectedEmployees([]);
  };

  const filteredSalaries = pendingSalaries.filter(salary => {
    const matchesSearch = salary.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         salary.emp_code?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const selectedCount = selectedEmployees.length;
  const selectedTotal = pendingSalaries
    .filter(s => selectedEmployees.includes(s.employee_id))
    .reduce((sum, s) => sum + s.finalNetSalary, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Payment Release
            </h1>
            <p className="text-green-100 mt-1">Bulk salary payment release with advance deductions</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Pending Employees</p>
                  <p className="text-2xl font-bold text-green-900">{stats.totalEmployees}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Net Salary</p>
                  <p className="text-2xl font-bold text-blue-900">₹{stats.totalNetSalary.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">Total Advances</p>
                  <p className="text-2xl font-bold text-yellow-900">₹{stats.totalAdvances.toFixed(2)}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Final Total</p>
                  <p className="text-2xl font-bold text-purple-900">₹{stats.finalTotal.toFixed(2)}</p>
                </div>
                <Banknote className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="px-6 pb-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {months.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
                
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllEmployees}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={deselectAllEmployees}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Selection Summary */}
            {selectedCount > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-800 font-medium">
                      {selectedCount} employee{selectedCount > 1 ? 's' : ''} selected
                    </p>
                    <p className="text-green-600 text-sm">
                      Total payment: ₹{selectedTotal.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReleaseModal(true)}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Release Payments
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Salaries Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === filteredSalaries.length && filteredSalaries.length > 0}
                      onChange={(e) => e.target.checked ? selectAllEmployees() : deselectAllEmployees()}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advances</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No pending salaries found for {months[selectedMonth - 1]} {selectedYear}
                    </td>
                  </tr>
                ) : (
                  filteredSalaries.map((salary) => (
                    <tr key={salary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(salary.employee_id)}
                          onChange={() => toggleEmployeeSelection(salary.employee_id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{salary.employee_name}</div>
                          <div className="text-sm text-gray-500">{salary.emp_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {months[salary.month - 1]} {salary.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(salary.net_salary || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">₹{salary.totalAdvanceAmount.toFixed(2)}</div>
                          {salary.advances.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {salary.advances.length} advance{salary.advances.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{salary.finalNetSalary.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          {salary.account_details ? (
                            <div className="text-gray-600">{salary.account_details}</div>
                          ) : (
                            <span className="text-red-600">No bank details</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Release Modal */}
        {showReleaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Release Payments</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800 font-medium">
                    {selectedCount} employee{selectedCount > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-green-600 text-sm">
                    Total amount: ₹{selectedTotal.toFixed(2)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                  <input
                    type="date"
                    value={releaseForm.payment_date}
                    onChange={(e) => setReleaseForm({...releaseForm, payment_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={releaseForm.payment_method}
                    onChange={(e) => setReleaseForm({...releaseForm, payment_method: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <textarea
                    value={releaseForm.remarks}
                    onChange={(e) => setReleaseForm({...releaseForm, remarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Payment release remarks..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowReleaseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={releasing}
                >
                  Cancel
                </button>
                <button
                  onClick={releasePayments}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                  disabled={releasing}
                >
                  {releasing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Releasing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Release Payments
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main export with Suspense
export default function PaymentRelease() {
  return (
    <Suspense fallback={<PaymentReleaseSkeleton />}>
      <PaymentReleaseContent />
    </Suspense>
  );
}