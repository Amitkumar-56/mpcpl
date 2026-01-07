'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditVoucherContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const voucher_id = searchParams.get('voucher_id');
  
  const [voucher, setVoucher] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalExpense, setTotalExpense] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const formatINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(n || 0));

  useEffect(() => {
    if (voucher_id) {
      fetchVoucherData();
    }
  }, [voucher_id]);

  const fetchVoucherData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/edit-voucher?voucher_id=${voucher_id}`);
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load voucher');
      }
      
      setVoucher(data.voucher);
      setItems(data.items || []);
      setTotalExpense(parseFloat(data.voucher.total_expense || 0));
      setAdvance(parseFloat(data.voucher.advance || 0));
      setRemaining(parseFloat(data.voucher.remaining_amount || 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const newRemaining = advance - totalExpense;
      
      const res = await fetch('/api/edit-voucher', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_id,
          total_expense: totalExpense,
          advance: advance
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      setRemaining(newRemaining);
      alert('Voucher updated successfully');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId) => {
    // ✅ DELETE functionality removed - voucher items cannot be deleted
    alert('Delete operation is not allowed. Please contact administrator.');
    return;
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !voucher) {
    return <div className="p-8 text-red-600">Error: {error || 'Voucher not found'}</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
          title="Go Back"
        >
          ←
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-6">Edit Voucher</h1>

      {/* Voucher Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Voucher No</label>
            <input type="text" value={voucher.voucher_no || ''} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input type="text" value={voucher.exp_date ? new Date(voucher.exp_date).toLocaleDateString() : ''} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Driver</label>
            <input type="text" value={voucher.emp_name || ''} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle</label>
            <input type="text" value={voucher.vehicle_no || ''} disabled className="w-full border px-3 py-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Approval Status</label>
            <div className="flex items-center">
              {voucher.approved_by_name ? (
                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Approved by {voucher.approved_by_name}
                </span>
              ) : (
                <span className="bg-red-100 text-red-800 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Not Approved Yet
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
            <input 
              type="number" 
              value={totalExpense} 
              onChange={(e) => setTotalExpense(parseFloat(e.target.value) || 0)}
              className="w-full border px-3 py-2 rounded"
            />
            <div className="text-xs text-gray-500 mt-1">{formatINR(totalExpense)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Advance</label>
            <input 
              type="number" 
              value={advance} 
              onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)}
              className="w-full border px-3 py-2 rounded"
            />
            <div className="text-xs text-gray-500 mt-1">{formatINR(advance)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remaining</label>
            <input 
              type="text" 
              value={(advance - totalExpense).toFixed(2)} 
              disabled 
              className={`w-full border px-3 py-2 rounded bg-gray-100 font-bold ${(advance - totalExpense) < 0 ? 'text-red-600' : 'text-green-600'}`}
            />
            <div className={`text-xs mt-1 ${(advance - totalExpense) < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatINR(Math.abs(advance - totalExpense))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Voucher Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">Item ID</th>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-right">Amount</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border p-4 text-center text-gray-500">No items</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.item_id} className="hover:bg-gray-50">
                    <td className="border p-2">{item.item_id}</td>
                    <td className="border p-2">{item.item_details}</td>
                    <td className="border p-2 text-right font-semibold">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                    <td className="border p-2 text-center">
                      {/* ✅ Delete button removed - voucher items cannot be deleted */}
                      <span className="text-gray-400 text-sm">-</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
