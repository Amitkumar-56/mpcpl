/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import React, { lazy, Suspense } from 'react';

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Hold Balance Management</h1>
      <div className="bg-white p-4 rounded shadow border">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  </div>
);

// Lazy load the main content
const HoldBalanceManagementContent = lazy(() => 
  Promise.resolve({
    default: function Component() {
      const [customers, setCustomers] = React.useState([]);
      const [selectedId, setSelectedId] = React.useState(null);
      const [loading, setLoading] = React.useState(false);
      const [reserveAmount, setReserveAmount] = React.useState('');
      const [balanceInfo, setBalanceInfo] = React.useState(null);
      const [error, setError] = React.useState('');

      const fetchCustomers = async () => {
        try {
          const res = await fetch('/api/customers');
          const data = await res.json();
          setCustomers(data || []);
        } catch {
          setError('Failed to load customers');
        }
      };

      const fetchBalance = async (id) => {
        try {
          const res = await fetch(`/api/customers/customer-details?cid=${id}`);
          const data = await res.json();
          setBalanceInfo(data || null);
        } catch {
          setBalanceInfo(null);
        }
      };

      React.useEffect(() => {
        fetchCustomers();
      }, []);

      React.useEffect(() => {
        if (selectedId) fetchBalance(selectedId);
      }, [selectedId]);

      const formatINR = (n) => (Number(n || 0)).toLocaleString('en-IN');

      const onReserve = async () => {
        if (!selectedId) return;
        const amt = Number(reserveAmount || 0);
        if (!amt || amt <= 0) {
          alert('Enter valid amount');
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/api/customers/hold-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reserve', customerId: selectedId, amount: amt })
          });
          const data = await res.json();
          if (data.success) {
            await fetchBalance(selectedId);
            alert('Reserved to hold successfully');
            setReserveAmount('');
          } else {
            alert(data.error || 'Failed to reserve');
          }
        } finally {
          setLoading(false);
        }
      };

      const onReleaseAll = async () => {
        if (!selectedId) return;
        setLoading(true);
        try {
          const res = await fetch('/api/customers/hold-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'release_all', customerId: selectedId })
          });
          const data = await res.json();
          if (data.success) {
            await fetchBalance(selectedId);
            alert('Released hold back to amtlimit');
          } else {
            alert(data.error || 'Failed to release');
          }
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-xl font-semibold mb-4">Hold Balance Management</h1>

            <div className="bg-white p-4 rounded shadow border">
              <label className="block text-sm font-medium mb-2">Select Customer</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={selectedId || ''}
                onChange={(e) => setSelectedId(Number(e.target.value))}
              >
                <option value="">-- Select --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} (ID: {c.id})
                  </option>
                ))}
              </select>

              {balanceInfo && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Amt Limit</div>
                    <div className="text-lg font-semibold">₹{formatINR(balanceInfo?.amtlimit || 0)}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Hold Balance</div>
                    <div className="text-lg font-semibold text-blue-600">₹{formatINR(balanceInfo?.hold_balance || 0)}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Used</div>
                    <div className="text-lg font-semibold">₹{formatINR(balanceInfo?.balance || 0)}</div>
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-2">Reserve Amount</label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full"
                    value={reserveAmount}
                    onChange={(e) => setReserveAmount(e.target.value)}
                    placeholder="₹"
                  />
                </div>
                <button
                  onClick={onReserve}
                  disabled={loading || !selectedId}
                  className="bg-blue-600 text-white px-4 py-2 rounded shadow disabled:opacity-50"
                >
                  Reserve to Hold
                </button>
                <button
                  onClick={onReleaseAll}
                  disabled={loading || !selectedId}
                  className="bg-gray-700 text-white px-4 py-2 rounded shadow disabled:opacity-50"
                >
                  Release All Hold
                </button>
              </div>

              {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
            </div>
          </div>
        </div>
      );
    }
  })
);

// Main component with Suspense
export default function HoldBalanceManagementPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HoldBalanceManagementContent />
    </Suspense>
  );
}