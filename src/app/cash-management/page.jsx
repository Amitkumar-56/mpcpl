'use client';

import { useSession } from '@/context/SessionContext';
import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Main Content Component
function CashManagementContent() {
  const { user, isAuthenticated } = useSession();
  const router = useRouter();
  
  const [expenses, setExpenses] = useState([]);
  const [totalCash, setTotalCash] = useState(0);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchCashData();
  }, [isAuthenticated, router]);

  const fetchCashData = async () => {
    try {
      const response = await fetch('/api/cash-management');
      
      if (!response.ok) {
        throw new Error('Failed to fetch cash data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setExpenses(result.data.expenses || []);
        setTotalCash(result.data.totalCash || 0);
      } else {
        throw new Error(result.error || 'Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching cash data:', error);
      setError('Failed to load cash data: ' + error.message);
    }
  };

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 z-30">
        <Sidebar activePage="CashManagement" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-64 z-20">
          <Header />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 mt-16 overflow-auto">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <button 
                      onClick={() => router.back()}
                      className="mr-4 text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Cash History</h1>
                  </div>
                </div>

                <div className="p-6">
                  {error && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <div className="flex justify-between items-center mb-6">
                      <h5 className="text-lg font-semibold text-gray-900">Cash List</h5>
                      <button
                        onClick={() => router.push('/create-expense')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Create Expense
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                              #
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                              Payment Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                              Title/ Desc
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                              Paid to
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                              Reason
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {expenses.length > 0 ? (
                            expenses.map((expense, index) => (
                              <tr key={expense.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                                  {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                                  {new Date(expense.payment_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 border border-gray-200">
                                  <div className="font-medium">{expense.title}</div>
                                  {expense.details && (
                                    <div className="text-gray-500 text-xs mt-1">{expense.details}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                                  {expense.paid_to}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                                  {expense.reason}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                                  ₹{parseFloat(expense.amount).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 border border-gray-200">
                                No records found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-gray-900">
                        Total Cash: <span className="text-blue-600">₹{parseFloat(totalCash).toLocaleString('en-IN')}</span>
                      </p>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden">
                    <div className="flex justify-between items-center mb-6">
                      <h5 className="text-lg font-semibold text-gray-900">Cash List</h5>
                      <button
                        onClick={() => router.push('/create-expense')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                      >
                        Create Expense
                      </button>
                    </div>

                    <div className="space-y-4">
                      {expenses.length > 0 ? (
                        expenses.map((expense, index) => (
                          <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="font-medium text-gray-500">#</div>
                              <div>{index + 1}</div>
                              
                              <div className="font-medium text-gray-500">Payment Date</div>
                              <div>{new Date(expense.payment_date).toLocaleDateString()}</div>
                              
                              <div className="font-medium text-gray-500">Title</div>
                              <div className="font-medium">{expense.title}</div>
                              
                              {expense.details && (
                                <>
                                  <div className="font-medium text-gray-500">Description</div>
                                  <div className="text-gray-600">{expense.details}</div>
                                </>
                              )}
                              
                              <div className="font-medium text-gray-500">Paid to</div>
                              <div>{expense.paid_to}</div>
                              
                              <div className="font-medium text-gray-500">Reason</div>
                              <div>{expense.reason}</div>
                              
                              <div className="font-medium text-gray-500">Amount</div>
                              <div className="font-semibold text-green-600">
                                ₹{parseFloat(expense.amount).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No records found
                        </div>
                      )}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-gray-900 text-center">
                        Total Cash: <span className="text-blue-600">₹{parseFloat(totalCash).toLocaleString('en-IN')}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="fixed bottom-0 right-0 left-64 z-10">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function CashManagement() {
  return (
    <Suspense fallback={null}>
      <CashManagementContent />
    </Suspense>
  );
}