'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Create a separate client component for the main content
function EditStockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user, loading: sessionLoading } = useSession();

  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [permissions, setPermissions] = useState({
    can_edit: false,
    can_delete: false
  });
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    supplier_id: '',
    product_id: '',
    fs_id: '',
    density: '',
    kg: '',
    ltr: '',
    tanker_no: '',
    driver_no: '',
    lr_no: '',
    v_invoice_value: '',
    dncn: '',
    t_dncn: '',
    payable: '',
    t_payable: '',
    payment: '',
    t_payment: '',
    status: '',
    weight_type: '',
    quantity_change_reason: '',
    quantity_changed: ''
  });
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check permissions
    checkPermissions();
    
    if (id) {
      fetchStock();
    } else {
      setError('No stock ID provided');
      setLoading(false);
    }
  }, [id, user, sessionLoading]);

  const checkPermissions = () => {
    if (!user) {
      setPermissions({ can_edit: false, can_delete: false });
      return;
    }

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setPermissions({ can_edit: true, can_delete: true });
      return;
    }

    // Check cached permissions
    if (user.permissions && user.permissions['Stock']) {
      const stockPerms = user.permissions['Stock'];
      setPermissions({
        can_edit: stockPerms.can_edit === true,
        can_delete: stockPerms.can_delete === true
      });
      return;
    }

    // Default: no permissions
    setPermissions({ can_edit: false, can_delete: false });
  };

  const fetchStock = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching stock with ID:', id);

      // Fetch stock data and dropdown data in parallel
      const [stockResponse, stationsResponse, productsResponse, suppliersResponse] = await Promise.all([
        fetch(`/api/stock/edit?id=${id}`),
        fetch('/api/stations'),
        fetch('/api/products'),
        fetch('/api/suppliers')
      ]);

      const result = await stockResponse.json();
      const stationsData = await stationsResponse.json();
      const productsData = await productsResponse.json();
      const suppliersData = await suppliersResponse.json();

      console.log('API response:', result);
      console.log('Stations:', stationsData);
      console.log('Products:', productsData);

      // Set dropdown data
      setStations(stationsData || []);
      setProducts(productsData || []);
      setSuppliers(suppliersData || []);

      if (result.success) {
        setStock(result.data);
        
        // Format date for input field
        const formattedDate = result.data.invoice_date ? 
          new Date(result.data.invoice_date).toISOString().split('T')[0] : '';
        
        setFormData({
          invoice_number: result.data.invoice_number || '',
          invoice_date: formattedDate,
          supplier_id: result.data.supplier_id || '',
          product_id: result.data.product_id || '',
          fs_id: result.data.fs_id || '',
          density: result.data.density || '',
          kg: result.data.kg || '',
          ltr: result.data.ltr || '',
          tanker_no: result.data.tanker_no || '',
          driver_no: result.data.driver_no || '',
          lr_no: result.data.lr_no || '',
          v_invoice_value: result.data.v_invoice_value || '',
          dncn: result.data.dncn || '',
          t_dncn: result.data.t_dncn || '',
          payable: result.data.payable || '',
          t_payable: result.data.t_payable || '',
          payment: result.data.payment || '',
          t_payment: result.data.t_payment || '',
          status: result.data.status || 'pending',
          weight_type: result.data.weight_type || '',
          quantity_change_reason: result.data.quantity_change_reason || '',
          quantity_changed: result.data.quantity_changed || ''
        });
      } else {
        setError(result.error || 'No record found for provided ID.');
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
      setError('Error fetching stock data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLogs = async () => {
    if (!id) return;
    try {
      setLogsLoading(true);
      const res = await fetch(`/api/audit-logs?record_type=stock&record_id=${id}&limit=50`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(Array.isArray(data.data) ? data.data : []);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      console.log('Submitting form data:', { id, ...formData });

      const response = await fetch('/api/stock/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData }),
      });

      const data = await response.json();
      console.log('Update response:', data);

      if (data.success) {
        alert('Stock updated successfully!');
        router.push('/stock');
      } else {
        setError(data.error || 'Error updating stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      setError('Error updating stock: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderChanges = (log) => {
    let oldVal = log.old_value;
    let newVal = log.new_value;
    try {
      if (typeof oldVal === 'string') oldVal = JSON.parse(oldVal);
    } catch {}
    try {
      if (typeof newVal === 'string') newVal = JSON.parse(newVal);
    } catch {}
    if (!oldVal || !newVal || typeof oldVal !== 'object' || typeof newVal !== 'object') {
      return null;
    }
    const keys = [
      'status','fs_id','product_id','invoice_number','invoice_date','density','kg','ltr',
      'tanker_no','driver_no','lr_no','v_invoice_value','dncn','t_dncn','payable',
      't_payable','payment','t_payment','weight_type','quantity_change_reason','quantity_changed'
    ];
    const items = [];
    keys.forEach((k) => {
      const ov = oldVal[k];
      const nv = newVal[k];
      if (String(ov) !== String(nv)) {
        items.push({ k, ov, nv });
      }
    });
    if (items.length === 0) return null;
    return (
      <div className="mt-2 space-y-1 text-sm">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-gray-600">{it.k}:</span>
            <span className="text-gray-900">{String(it.ov ?? '')}</span>
            <span className="text-gray-500">→</span>
            <span className="text-gray-900">{String(it.nv ?? '')}</span>
          </div>
        ))}
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error && !stock) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <Link href="/stock" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Stock
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Edit Stock</h1>
            <div className="flex gap-2">
              <Link
                href="/stock"
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  name="invoice_date"
                  value={formData.invoice_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product
              </label>
              <select
                name="product_id"
                value={formData.product_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.pname}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Station
              </label>
              <select
                name="fs_id"
                value={formData.fs_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Station</option>
                {stations.map(station => (
                  <option key={station.id} value={station.id}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Density
              </label>
              <input
                type="number"
                step="0.01"
                name="density"
                value={formData.density}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KG
              </label>
              <input
                type="number"
                step="0.01"
                name="kg"
                value={formData.kg}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Liter
              </label>
              <input
                type="number"
                step="0.01"
                name="ltr"
                value={formData.ltr}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanker No
                </label>
                <input
                  type="text"
                  name="tanker_no"
                  value={formData.tanker_no}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver No
                </label>
                <input
                  type="text"
                  name="driver_no"
                  value={formData.driver_no}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LR No
                </label>
                <input
                  type="text"
                  name="lr_no"
                  value={formData.lr_no}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Value
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="v_invoice_value"
                  value={formData.v_invoice_value}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DN/CN
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="dncn"
                  value={formData.dncn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  T DN/CN
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="t_dncn"
                  value={formData.t_dncn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payable
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="payable"
                  value={formData.payable}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  T Payable
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="t_payable"
                  value={formData.t_payable}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="payment"
                  value={formData.payment}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  T Payment
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="t_payment"
                  value={formData.t_payment}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="pending">Pending</option>
                  <option value="on_the_way">On The Way</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight Type
                </label>
                <input
                  type="text"
                  name="weight_type"
                  value={formData.weight_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Change Reason
                </label>
                <input
                  type="text"
                  name="quantity_change_reason"
                  value={formData.quantity_change_reason}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Changed
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="quantity_changed"
                  value={formData.quantity_changed}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/stock')}
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              {permissions.can_edit && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Stock'}
                </button>
              )}
              {!permissions.can_edit && (
                <div className="px-6 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed">
                  No Edit Permission
                </div>
              )}
            </div>
          </form>
          
          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Recent Changes</h2>
              <button
                onClick={() => {
                  const next = !showLogs;
                  setShowLogs(next);
                  if (next && logs.length === 0) fetchLogs();
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
              >
                {showLogs ? 'Hide' : 'Show'}
              </button>
            </div>
            {showLogs && (
              <div className="mt-4">
                {logsLoading ? (
                  <div className="text-gray-600">Loading logs...</div>
                ) : logs.length === 0 ? (
                  <div className="text-gray-500">No logs found</div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log, idx) => (
                      <div key={idx} className="border rounded p-3">
                        <div className="flex justify-between">
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">{log.action}</span>
                            <span className="ml-2">{log.user_name || 'Unknown User'}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.created_at || `${log.action_date || ''} ${log.action_time || ''}`}
                          </div>
                        </div>
                        {log.remarks ? (
                          <div className="text-xs text-gray-600 mt-1">{log.remarks}</div>
                        ) : null}
                        {renderChanges(log)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function EditStock() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto min-h-0">
          <Suspense fallback={
            <div className="p-4">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }>
            <EditStockContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
