'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Separate component that uses useSearchParams
function VoucherItemsContent() {
  const searchParams = useSearchParams();
  const voucher_id = searchParams.get('voucher_id');
  
  const [voucher, setVoucher] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalItemsAmount, setTotalItemsAmount] = useState(0);

  useEffect(() => {
    if (voucher_id) {
      fetchData();
    }
  }, [voucher_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/voucher-items?voucher_id=${voucher_id}`);
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load items');
      }
      
      setVoucher(data.voucher);
      setItems(data.items || []);
      setTotalItemsAmount(data.total_items_amount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Delete this item?')) return;
    
    try {
      const res = await fetch('/api/voucher-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      fetchData();
      alert('Item deleted successfully');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error || !voucher) {
    return <div className="p-8 text-red-600">Error: {error || 'Voucher not found'}</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Voucher Items</h1>
      <p className="text-gray-600 mb-6">Voucher: <span className="font-semibold">{voucher.voucher_no}</span></p>

      {/* Voucher Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Driver</p>
          <p className="font-semibold">{voucher.emp_name || 'N/A'}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Vehicle No</p>
          <p className="font-semibold">{voucher.vehicle_no || 'N/A'}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="font-semibold text-lg">₹{parseFloat(voucher.total_expense || 0).toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Remaining</p>
          <p className={`font-semibold text-lg ${parseFloat(voucher.remaining_amount || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{parseFloat(voucher.remaining_amount || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="border p-3 text-left font-semibold">#</th>
              <th className="border p-3 text-left font-semibold">Item ID</th>
              <th className="border p-3 text-left font-semibold">Description</th>
              <th className="border p-3 text-right font-semibold">Amount</th>
              <th className="border p-3 text-center font-semibold">Date</th>
              <th className="border p-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="border p-6 text-center text-gray-500">No items found</td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.item_id} className="hover:bg-gray-50 border-b">
                  <td className="border p-3">{idx + 1}</td>
                  <td className="border p-3">{item.item_id}</td>
                  <td className="border p-3">{item.item_details}</td>
                  <td className="border p-3 text-right font-semibold">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                  <td className="border p-3 text-center text-sm text-gray-600">
                    {new Date(item.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="border p-3 text-center">
                    <button
                      onClick={() => deleteItem(item.item_id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr className="border-t">
              <td colSpan={3} className="border p-3 text-right">Total Items:</td>
              <td className="border p-3 text-right">₹{totalItemsAmount.toFixed(2)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function VoucherItems() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-5xl mx-auto p-6">
        <div className="p-8 text-center">Loading voucher data...</div>
      </div>
    }>
      <VoucherItemsContent />
    </Suspense>
  );
}