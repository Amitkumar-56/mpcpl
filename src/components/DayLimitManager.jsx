// src/components/DayLimitManager.jsx
'use client';
import { useState } from 'react';

export default function DayLimitManager({ customer, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustType, setAdjustType] = useState('increase'); // 'increase' or 'decrease'
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleAdjustDayLimit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!reason.trim()) {
      alert('Please enter a reason for this adjustment');
      return;
    }

    try {
      setLoading(true);
      
      const res = await fetch('/api/customers/day-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'adjust_day_limit',
          customerId: customer.id,
          adjustType,
          amount: parseFloat(amount),
          reason: reason.trim()
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust day limit');
      }

      alert(data.message || 'Day limit adjusted successfully');
      setShowAdjustModal(false);
      setAmount('');
      setReason('');
      
      // Refresh customer data
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error adjusting day limit:', error);
      alert(error.message || 'Failed to adjust day limit');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDayLimit = async () => {
    if (!confirm('Are you sure you want to reset the daily usage? This will set the daily used amount back to zero and cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      const res = await fetch('/api/customers/day-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset_day_limit',
          customerId: customer.id
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset day limit');
      }

      alert(data.message || 'Daily usage reset successfully');
      
      // Refresh customer data
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error resetting day limit:', error);
      alert(error.message || 'Failed to reset daily usage');
    } finally {
      setLoading(false);
    }
  };

  const currentDayLimit = customer.day_limit || 0;
  const usedToday = customer.day_amount || 0;
  const remainingToday = Math.max(0, currentDayLimit - usedToday);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Day Limit Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage customer's daily transaction limits and monitor usage
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
            <button
              onClick={() => {
                setAdjustType('increase');
                setShowAdjustModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Increase Limit</span>
            </button>
            <button
              onClick={() => {
                setAdjustType('decrease');
                setShowAdjustModal(true);
              }}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              <span>Decrease Limit</span>
            </button>
            <button
              onClick={handleResetDayLimit}
              disabled={loading || usedToday === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset Daily Usage</span>
            </button>
          </div>
        </div>

        {/* Day Limit Progress */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600">Days Limit</div>
              <div className="text-2xl font-bold text-gray-900">
                {currentDayLimit}
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-600">Days Used</div>
              <div className="text-2xl font-bold text-blue-900">
                {usedToday}
              </div>
            </div>
            
            <div className={`rounded-lg p-4 ${
              remainingToday > 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`text-sm font-medium ${
                remainingToday > 0 ? 'text-green-600' : 'text-red-600'
              }`}>Remaining Days</div>
              <div className={`text-2xl font-bold ${
                remainingToday > 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                {remainingToday}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Daily Usage Progress</span>
              <span>{((usedToday / currentDayLimit) * 100 || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  (usedToday / currentDayLimit) >= 0.9 ? 'bg-red-600' :
                  (usedToday / currentDayLimit) >= 0.7 ? 'bg-orange-500' : 'bg-green-600'
                }`}
                style={{ 
                  width: `${Math.min(100, (usedToday / currentDayLimit) * 100 || 0)}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Last Reset Info */}
          {customer.last_reset_date && (
            <div className="text-xs text-gray-500 text-center">
              Last reset: {new Date(customer.last_reset_date).toLocaleString('en-IN')}
            </div>
          )}
        </div>
      </div>

      {/* Adjust Day Limit Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {adjustType === 'increase' ? 'Increase' : 'Decrease'} Days Limit
              </h3>
              
              <form onSubmit={handleAdjustDayLimit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days
                  </label>
                  <input 
                    type="number"
                    step="1"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter days"
                    required 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current day limit: {currentDayLimit}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for {adjustType === 'increase' ? 'increase' : 'decrease'}
                  </label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={`Enter reason for ${adjustType === 'increase' ? 'increasing' : 'decreasing'} the days limit`}
                    required 
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAdjustModal(false);
                      setAmount('');
                      setReason('');
                    }}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className={`px-4 py-2 rounded-lg text-white hover:opacity-90 disabled:opacity-50 transition-colors ${
                      adjustType === 'increase' ? 'bg-green-600' : 'bg-orange-600'
                    }`}
                  >
                    {loading ? 'Processing...' : `${adjustType === 'increase' ? 'Increase' : 'Decrease'} Limit`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}