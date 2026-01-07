'use client';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading Component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading form...</p>
      </div>
    </div>
  );
}

// Main Content Component
function CreateLRContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSession();
  const id = searchParams.get('id');
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  
  const [formData, setFormData] = useState({
    lr_id: '',
    mobile: '+91 7311112659',
    email: 'accounts@gyanti.in',
    pan: 'AAGCG6220R',
    gst: '09AAGCG6220R1Z3',
    lr_date: '',
    consigner: '',
    address_1: '',
    consignee: '',
    address_2: '',
    from_location: '',
    to_location: '',
    tanker_no: '',
    gst_no: '',
    products: '',
    boe_no: '',
    wt_type: '',
    gross_wt: '',
    vessel: '',
    tare_wt: '',
    invoice_no: '',
    net_wt: '',
    gp_no: '',
    remarks: ''
  });

  const [loading, setLoading] = useState(false);
  const [newLr, setNewLr] = useState('');

  // Check permissions
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) {
      setCheckingPermission(false);
      return;
    }

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setCheckingPermission(false);
      fetchLRData();
      return;
    }

    // Check cached permissions
    if (user.permissions && user.permissions['LR Management']) {
      const lrPerms = user.permissions['LR Management'];
      if (lrPerms.can_create) {
        setHasPermission(true);
        setCheckingPermission(false);
        fetchLRData();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_LR Management`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_create) {
        setHasPermission(true);
        setCheckingPermission(false);
        fetchLRData();
        return;
      }
    }

    try {
      const moduleName = 'LR Management';
      const createRes = await fetch(
        `/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`
      );
      const createData = await createRes.json();
      
      if (createData.allowed) {
        setHasPermission(true);
        fetchLRData();
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  useEffect(() => {
    if (hasPermission && !checkingPermission) {
      fetchLRData();
    }
  }, [id, hasPermission, checkingPermission]);

  const fetchLRData = async () => {
    try {
      const url = id ? `/api/create-lr?id=${id}` : '/api/create-lr';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.newLrId) {
        setNewLr(data.newLrId);
        setFormData(prev => ({ ...prev, lr_id: data.newLrId }));
      }
      
      if (data.lrData) {
        setFormData(prev => ({ ...prev, ...data.lrData }));
      }
    } catch (error) {
      console.error('Error fetching LR data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-calculate Net Weight
      if (name === 'gross_wt' || name === 'tare_wt') {
        const gross = parseFloat(name === 'gross_wt' ? value : prev.gross_wt) || 0;
        const tare = parseFloat(name === 'tare_wt' ? value : prev.tare_wt) || 0;
        // Only calculate if both values are present, or allow 0
        if (gross >= 0 && tare >= 0) {
            const net = gross - tare;
            newData.net_wt = net >= 0 ? net.toString() : ''; // Avoid negative weight
        }
      }
      
      return newData;
    });
  };

  if (checkingPermission || authLoading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base">Checking permissions...</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div className="text-center bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-md w-full">
              <div className="text-red-500 text-4xl sm:text-6xl mb-4">🚫</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">You don't have permission to create LR records.</p>
              <button
                onClick={() => router.push('/lr-list')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors text-sm sm:text-base flex items-center gap-2"
              >
                <span className="text-lg">←</span>
                <span>Go Back</span>
              </button>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/create-lr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: id || null
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Record saved successfully');
        router.push('/lr-list');
      } else {
        throw new Error(result.error || 'Failed to save record');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error saving record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Breadcrumb */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center space-x-2 text-sm sm:text-base">
              <Link 
                href="/lr-list"
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to LR List</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Create LR</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">Create LR</h1>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
                  {id ? 'Edit' : 'Create New'} LR Details ({newLr})
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* LR Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    LR No:
                  </label>
                  <input
                    type="text"
                    name="lr_id"
                    value={formData.lr_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    readOnly
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-blue-50 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Mobile:
                    </label>
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Email:
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      PAN:
                    </label>
                    <input
                      type="text"
                      name="pan"
                      value={formData.pan}
                      onChange={handleChange}
                      className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      GST:
                    </label>
                    <input
                      type="text"
                      name="gst"
                      value={formData.gst}
                      onChange={handleChange}
                      className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Shipment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    LR Date:
                  </label>
                  <input
                    type="date"
                    name="lr_date"
                    value={formData.lr_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Tanker No:
                  </label>
                  <input
                    type="text"
                    name="tanker_no"
                    value={formData.tanker_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Consigner Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Consigner:
                  </label>
                  <input
                    type="text"
                    name="consigner"
                    value={formData.consigner}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Consigner Address:
                  </label>
                  <input
                    type="text"
                    name="address_1"
                    value={formData.address_1}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Consignee Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Consignee:
                  </label>
                  <input
                    type="text"
                    name="consignee"
                    value={formData.consignee}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Consignee Address:
                  </label>
                  <input
                    type="text"
                    name="address_2"
                    value={formData.address_2}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    From Location:
                  </label>
                  <input
                    type="text"
                    name="from_location"
                    value={formData.from_location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    To Location:
                  </label>
                  <input
                    type="text"
                    name="to_location"
                    value={formData.to_location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    GST No.:
                  </label>
                  <input
                    type="text"
                    name="gst_no"
                    value={formData.gst_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Products:
                  </label>
                  <textarea
                    name="products"
                    value={formData.products}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Weight Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Weight Type:
                  </label>
                  <select
                    name="wt_type"
                    value={formData.wt_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="">None</option>
                    <option value="kg">KG</option>
                    <option value="ltr">LTR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    DEN No:
                  </label>
                  <input
                    type="text"
                    name="boe_no"
                    value={formData.boe_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Gross Weight:
                  </label>
                  <input
                    type="text"
                    name="gross_wt"
                    value={formData.gross_wt}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Seal No.:
                  </label>
                  <input
                    type="text"
                    name="vessel"
                    value={formData.vessel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Tare Weight:
                  </label>
                  <input
                    type="text"
                    name="tare_wt"
                    value={formData.tare_wt}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Invoice No:
                  </label>
                  <input
                    type="text"
                    name="invoice_no"
                    value={formData.invoice_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Net Weight:
                  </label>
                  <input
                    type="text"
                    name="net_wt"
                    value={formData.net_wt}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Eway Bill No:
                  </label>
                  <input
                    type="text"
                    name="gp_no"
                    value={formData.gp_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks:
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Add Remarks"
                  className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={() => router.push('/lr-list')}
                  className="w-full sm:w-auto bg-gray-400 hover:bg-gray-500 text-white font-medium py-2.5 px-6 rounded-md transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
        </main>

        {/* Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main Component with Suspense
export default function CreateLR() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateLRContent />
    </Suspense>
  );
}