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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingItems, setEditingItems] = useState(false);
  const [itemsSaving, setItemsSaving] = useState(false);
  
  const formatINR = (n) => {
    const num = parseFloat(n || 0);
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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
      setTotalExpense(parseFloat(data.voucher.total_expense || 0).toFixed(2));
      setAdvance(parseFloat(data.voucher.advance || 0).toFixed(2));
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const newRemaining = totalExpense - advance;
      
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
      
      showToast('Voucher updated successfully', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    if (field === 'amount') {
      updatedItems[index][field] = parseFloat(value || 0).toFixed(2);
    } else {
      updatedItems[index][field] = value;
    }
    setItems(updatedItems);
    
    // Auto-update total expense when items change
    const newTotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0).toFixed(2);
    setTotalExpense(newTotal);
  };

  const handleAddItem = () => {
    const newItem = {
      item_id: null,
      item_details: '',
      amount: '0.00',
      isNew: true
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setEditingItems(true);
    
    // Auto-update total expense
    const newTotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0).toFixed(2);
    setTotalExpense(newTotal);
  };

  const handleDeleteItem = async (index) => {
    const itemToDelete = items[index];
    
    if (!itemToDelete.isNew && itemToDelete.item_id) {
      try {
        const res = await fetch('/api/voucher-items', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: itemToDelete.item_id,
            voucher_id: voucher_id
          })
        });
        
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        
        showToast('Item deleted successfully', 'success');
      } catch (err) {
        showToast('Error deleting item: ' + err.message, 'error');
        return;
      }
    }
    
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    
    // Auto-update total expense
    const newTotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0).toFixed(2);
    setTotalExpense(newTotal);
  };

  const handleSaveItems = async () => {
    try {
      setItemsSaving(true);
      
      const res = await fetch('/api/voucher-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_id: voucher_id,
          items: items
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      // Refresh items data
      const itemsRes = await fetch(`/api/voucher-items?voucher_id=${voucher_id}`);
      const itemsData = await itemsRes.json();
      if (itemsData.success) {
        setItems(itemsData.items || []);
        // Update total expense from saved items
        const newTotal = itemsData.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0).toFixed(2);
        setTotalExpense(newTotal);
      }
      
      setEditingItems(false);
      showToast('Items updated successfully', 'success');
    } catch (err) {
      showToast('Error saving items: ' + err.message, 'error');
    } finally {
      setItemsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading voucher details...</p>
        </div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Voucher not found'}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const remaining = (parseFloat(totalExpense || 0) - parseFloat(advance || 0)).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? '✗ ' : '✓ '}{toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Voucher</h1>
          </div>
        </div>

        {/* Voucher Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Voucher Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Voucher No</label>
                <div className="text-lg font-semibold text-gray-900">{voucher.voucher_no || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                <div className="text-lg font-semibold text-gray-900">
                  {voucher.exp_date ? new Date(voucher.exp_date).toLocaleDateString('en-IN') : 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Driver Name</label>
                <div className="text-lg font-semibold text-gray-900">{voucher.emp_name || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Vehicle No</label>
                <div className="text-lg font-semibold text-gray-900">{voucher.vehicle_no || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Station</label>
                <div className="text-lg font-semibold text-gray-900">{voucher.station_name || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Status</label>
                <div className="flex items-center">
                  {voucher.status == 1 ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Approved {voucher.approved_by_name ? `by ${voucher.approved_by_name}` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Pending Approval
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Amounts Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Amounts</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Expense <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input 
                    type="number" 
                    value={totalExpense} 
                    onChange={(e) => setTotalExpense(parseFloat(e.target.value || 0).toFixed(2))}
                    className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">{formatINR(totalExpense)}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input 
                    type="number" 
                    value={advance} 
                    onChange={(e) => setAdvance(parseFloat(e.target.value || 0).toFixed(2))}
                    className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">{formatINR(advance)}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input 
                    type="text" 
                    value={remaining} 
                    disabled 
                    className={`w-full pl-8 pr-3 py-3 border rounded-lg font-bold text-lg bg-gray-100 ${
                      remaining < 0 ? 'text-red-600 border-red-300 bg-red-50' : 'text-green-600 border-green-300 bg-green-50'
                    }`}
                  />
                </div>
                <div className={`mt-2 text-sm font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {remaining < 0 ? 'Over-expense: ' : 'Balance: '}
                  {formatINR(Math.abs(remaining))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Voucher Items Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Voucher Items</h2>
              <div className="flex items-center gap-2">
                {editingItems && (
                  <>
                    <button
                      onClick={() => setEditingItems(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveItems}
                      disabled={itemsSaving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors flex items-center gap-2"
                    >
                      {itemsSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Items
                        </>
                      )}
                    </button>
                  </>
                )}
                {!editingItems && (
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Item
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
            {items.length === 0 && !editingItems ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-3">📋</div>
                <p className="text-gray-500 mb-4">No items found for this voucher</p>
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">#</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Item ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.item_id || index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {item.item_id || (
                            <span className="text-yellow-600 font-medium">New Item</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editingItems ? (
                            <input
                              type="text"
                              value={item.item_details || ''}
                              onChange={(e) => handleItemChange(index, 'item_details', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter item description"
                            />
                          ) : (
                            <span className="text-gray-900">{item.item_details || 'N/A'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingItems ? (
                            <div className="flex items-center justify-end">
                              <span className="text-gray-500 mr-2">₹</span>
                              <input
                                type="number"
                                value={item.amount || ''}
                                onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                placeholder="0.00"
                                step="0.01"
                              />
                            </div>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              {formatINR(item.amount || 0)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {editingItems ? (
                            <button
                              onClick={() => handleDeleteItem(index)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Delete item"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right font-semibold text-gray-700">
                        Total Items Amount:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {formatINR(items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
