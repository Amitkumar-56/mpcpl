'use client';

import { useSession } from '@/context/SessionContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Sidebar from '../../components/sidebar';

export default function FillingDetailsAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user, loading: authLoading } = useSession();

  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    doc1: null,
    doc2: null,
    doc3: null,
    aqty: '',
    status: 'Pending',
    remarks: '',
    sub_product_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({
    doc1: null,
    doc2: null,
    doc3: null
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [limitTitle, setLimitTitle] = useState('Credit Limit Overdue');
  const [permissions, setPermissions] = useState({ can_view: false, can_edit: false, can_create: false });
  const [hasPermission, setHasPermission] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState(null);
  const [cropModal, setCropModal] = useState({ open: false, src: null, docKey: null });

  const [brokenImages, setBrokenImages] = useState({ doc1: false, doc2: false, doc3: false });
  const [showPriceModal, setShowPriceModal] = useState(false);

  useEffect(() => {
    if (id) fetchRequestDetails();
  }, [id]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      checkPermissions();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (requestData && user && ['1', '2'].includes(String(user.role))) {
      if (requestData.status === 'Processing') {
        setFormData(prev => ({ ...prev, status: 'Completed' }));
      }
    }
  }, [requestData, user]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_create: true });
      return;
    }
    if (user.permissions && user.permissions['Filling Requests']) {
      const p = user.permissions['Filling Requests'];
      setPermissions({
        can_view: !!p.can_view,
        can_edit: !!p.can_edit,
        can_create: !!p.can_create || !!p.can_edit || false
      });
      setHasPermission(!!p.can_edit);
      return;
    }
    const cacheKey = `perms_${user.id}_Filling Requests`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const c = JSON.parse(cached);
      setPermissions(c);
      setHasPermission(!!c.can_edit);
      return;
    }
    try {
      const moduleName = 'Filling Requests';
      const [viewRes, editRes, createRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`)
      ]);
      const [viewData, editData, createData] = await Promise.all([viewRes.json(), editRes.json(), createRes.json()]);
      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_create: createData.allowed || false
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      setPermissions(perms);
      setHasPermission(!!perms.can_edit);
    } catch {
      setHasPermission(false);
    }
  };

  const openImageModal = (src) => setImageModalSrc(src);
  const closeImageModal = () => setImageModalSrc(null);
  const isImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const u = url.split('?')[0].toLowerCase();
    return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(u);
  };
  const normalizeDocUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    let u = url.replace(/\\/g, '/');
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return u;
    if (u.startsWith('public/')) return '/' + u.substring(7);
    return '/' + u;
  };

  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div>Checking permissions...</div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-red-500 text-4xl mb-2">🚫</div>
              <div>You do not have permission to access Filling Details Admin.</div>
              <p className="text-sm text-gray-500 mt-2">Edit permission is required for Filling Requests module.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  async function fetchRequestDetails() {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching request details for ID:', id);

      const response = await fetch(`/api/filling-details-admin?id=${id}`);
      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        const text = await response.text().catch(() => '<<unreadable response>>');
        console.error('❌ Failed to parse JSON from /api/filling-details-admin GET:', parseErr, text);
        throw new Error('Invalid JSON response from server: ' + text);
      }

      console.log('📡 Response status:', response.status);
      console.log('✅ API response:', data);

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      if (data.success && data.data) {
        setRequestData(data.data);
        setFormData(prev => ({
          ...prev,
          aqty: data.data.aqty || data.data.qty || '',
          status: data.data.status || 'Pending',
          remarks: data.data.remark || '',
          sub_product_id: data.data.sub_product_id || ''
        }));

        console.log('🔄 Current request status from API:', data.data.status);
        console.log('📊 Form data set to:', {
          aqty: data.data.aqty || data.data.qty || '',
          status: data.data.status || 'Pending',
          fuel_price: data.data.fuel_price,
          price: data.data.price
        });
      } else {
        throw new Error(data.error || 'Failed to fetch request details');
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(err.message || 'Failed to fetch request details');
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;

    console.log('🔄 Input changed:', name, value);

    if (files) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));

      if (files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedFiles(prev => ({
            ...prev,
            [name]: e.target.result
          }));
        };
        reader.readAsDataURL(files[0]);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const removeFile = (docName) => {
    setFormData(prev => ({
      ...prev,
      [docName]: null
    }));
    setUploadedFiles(prev => ({
      ...prev,
      [docName]: null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!requestData) {
      alert('No request data available');
      return;
    }

    // Validate actual quantity
    const aqtyValue = parseFloat(formData.aqty);

    if (!formData.aqty || formData.aqty === '' || isNaN(aqtyValue)) {
      alert('Please enter a valid actual quantity');
      return;
    }

    if (aqtyValue <= 0) {
      alert('Actual quantity must be greater than 0');
      return;
    }

    if (aqtyValue > (requestData.station_stock || 0)) {
      alert(`Actual quantity cannot exceed available stock (${requestData.station_stock || 0} Ltr)`);
      return;
    }

    // ✅ Deal price check
    const currentPrice = parseFloat(requestData.fuel_price || requestData.price || 0);
    
    // ✅ Only show price modal for Admin roles (not staff/incharge)
    const isStaffOrIncharge = user && ['1', '2'].includes(String(user.role));
    
    if (currentPrice <= 0 && !isStaffOrIncharge) {
      setShowPriceModal(true);
      return;
    }

    // For staff/incharge, they can proceed even with 0 price
    if (currentPrice <= 0 && isStaffOrIncharge) {
      console.log('⚠️ Staff/Incharge proceeding with 0 price');
    }

    // Pre-check credit/day/daily limit before Processing/Completed
    if ((formData.status === 'Processing' || formData.status === 'Completed') && !isStaffOrIncharge) {
      const requiredAmount = currentPrice * aqtyValue;
      const availAmt = parseFloat(requestData.available_balance || 0);
      const holdBal = parseFloat(requestData.hold_balance || 0);
      
      if (formData.status === 'Processing') {
        if (availAmt <= 0 || availAmt < requiredAmount) {
          setLimitTitle('Credit Limit Overdue');
          setLimitMessage(`Required: ₹${requiredAmount.toFixed(2)}, Available: ₹${availAmt.toFixed(2)}. Please increase limit or reduce quantity.`);
          setShowLimitModal(true);
          return;
        }
      } else {
        const combined = availAmt + holdBal;
        if (combined <= 0 || combined < requiredAmount) {
          setLimitTitle('Credit Limit Overdue');
          setLimitMessage(`Required: ₹${requiredAmount.toFixed(2)}, Available: ₹${combined.toFixed(2)}. Please increase limit or reduce quantity.`);
          setShowLimitModal(true);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const submitData = new FormData();

      // Append files only if they exist
      if (formData.doc1) submitData.append('doc1', formData.doc1);
      if (formData.doc2) submitData.append('doc2', formData.doc2);
      if (formData.doc3) submitData.append('doc3', formData.doc3);

      // Append all required fields
      submitData.append('aqty', formData.aqty);
      submitData.append('status', formData.status);
      submitData.append('remarks', formData.remarks);
      submitData.append('id', id);
      submitData.append('rid', requestData.rid);
      submitData.append('fs_id', requestData.fs_id);
      submitData.append('cl_id', requestData.cid);
      submitData.append('com_id', requestData.cid);
      submitData.append('product_id', requestData.product);

      // Add sub_product_id if selected
      if (formData.sub_product_id) {
        submitData.append('sub_product_id', formData.sub_product_id);
      }

      submitData.append('billing_type', requestData.billing_type);
      submitData.append('oldstock', requestData.station_stock || 0);
      submitData.append('credit_limit', requestData.credit_limit || 0);
      submitData.append('available_balance', requestData.available_balance || 0);
      submitData.append('day_limit', requestData.day_limit || 0);
      submitData.append('price', requestData.fuel_price || requestData.price || 0);

      console.log('📤 Submitting form data with status:', formData.status);
      console.log('🔹 Current page status:', requestData.status);
      console.log('💰 Deal price being sent:', requestData.fuel_price || requestData.price || 0);

      const response = await fetch('/api/filling-details-admin', {
        method: 'POST',
        body: submitData
      });

      console.log('📨 Submit response status:', response.status);

      let result;
      try {
        result = await response.json();
      } catch (parseErr) {
        const text = await response.text().catch(() => '<<unreadable response>>');
        console.error('❌ Failed to parse JSON from /api/filling-details-admin POST (submit):', parseErr, text);
        result = { success: false, error: 'Invalid JSON response from server', raw: text };
      }
      console.log('✅ Submit result:', result);

      if (result.success) {
        if (result.limitOverdue) {
          setLimitMessage(result.message || 'Your limit is over. Please recharge your account.');
          setLimitTitle(result.limitTitle || 'Credit Limit Overdue');
          setShowLimitModal(true);
          setSubmitting(false);
          return;
        }

        // Custom success messages based on status
        let successMessage = '';
        switch (formData.status) {
          case 'Processing':
            successMessage = 'Request marked as Processing! The status has been updated successfully.';
            break;
          case 'Completed':
            successMessage = 'Request Completed Successfully!';
            break;
          case 'Cancel':
            successMessage = 'Request Cancelled Successfully! Hold balance restored to amtlimit.';
            break;
          default:
            successMessage = result.message || 'Request updated successfully!';
        }

        alert(successMessage);

        // IMMEDIATELY update local state to show new status
        setRequestData(prev => ({
          ...prev,
          status: formData.status
        }));

        console.log('🔄 Local state updated to:', formData.status);

        // Refresh data from server to confirm
        await fetchRequestDetails();

        // ✅✅✅ Redirect ONLY for Completed and Cancelled status
        if (formData.status === 'Completed' || formData.status === 'Cancel') {
          console.log('🔀 Redirecting to filling-requests page for Completed/Cancelled status');
          setTimeout(() => {
            router.push('/filling-requests');
          }, 1500);
        } else {
          console.log('📍 Staying on same page for Processing status');
        }

      } else {
        throw new Error(result.error || result.message || 'Unknown error');
      }
    } catch (err) {
      console.error('❌ Submit error:', err);
      alert('Error updating request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelRemarks.trim()) {
      alert('Please provide cancellation remarks');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = new FormData();
      
      submitData.append('id', id);
      submitData.append('rid', requestData.rid);
      submitData.append('status', 'Cancel');
      
      submitData.append('fs_id', requestData.fs_id);
      submitData.append('cl_id', requestData.cid);
      submitData.append('product_id', requestData.product);
      submitData.append('sub_product_id', requestData.sub_product_id || '');
      submitData.append('billing_type', requestData.billing_type);
      submitData.append('oldstock', requestData.station_stock || 0);
      submitData.append('credit_limit', requestData.credit_limit || 0);
      submitData.append('available_balance', requestData.available_balance || 0);
      submitData.append('day_limit', requestData.day_limit || 0);
      submitData.append('price', requestData.fuel_price || requestData.price || 0);
      submitData.append('aqty', requestData.aqty || requestData.qty || 0);
      
      submitData.append('remarks', cancelRemarks);
      
      const emptyBlob = new Blob([], { type: 'application/octet-stream' });
      const emptyFile = new File([emptyBlob], 'empty.txt');
      submitData.append('doc1', emptyFile);
      submitData.append('doc2', emptyFile);
      submitData.append('doc3', emptyFile);
      
      console.log('📤 Sending cancel request:', {
        rid: requestData.rid,
        status: 'Cancel',
        cl_id: requestData.cid,
        remarks: cancelRemarks,
        available_balance: requestData.available_balance,
        hold_balance: requestData.hold_balance
      });

      const response = await fetch('/api/filling-details-admin', {
        method: 'POST',
        body: submitData
      });

      let result;
      try {
        result = await response.json();
      } catch (parseErr) {
        const text = await response.text().catch(() => '<<unreadable response>>');
        console.error('❌ Failed to parse JSON from /api/filling-details-admin POST (cancel):', parseErr, text);
        result = { success: false, error: 'Invalid JSON response from server', raw: text };
      }
      console.log('✅ Cancel API response:', result);

      if (result.success) {
        alert('Request cancelled successfully! Hold balance restored to amtlimit.');
        
        // Immediately update local state
        setRequestData(prev => ({
          ...prev,
          status: 'Cancel'
        }));

        setShowCancelModal(false);
        setCancelRemarks('');
        
        // Refresh data to show updated balances
        await fetchRequestDetails();

        // ✅ Redirect for Cancelled status
        console.log('🔀 Redirecting to filling-requests page for Cancelled status');
        setTimeout(() => {
          router.push('/filling-requests');
        }, 2000);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (err) {
      console.error('❌ Cancel error:', err);
      alert('Error cancelling request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenewLimit = () => {
    router.push(`/credit-limit?id=${requestData.cid}`);
  };

  const calculateAvailableBalance = () => {
    if (!requestData) {
      return {
        availableBalance: 0,
        isInsufficient: false,
        limitType: 'none'
      };
    }

    const dayLimit = parseFloat(requestData.day_limit) || 0;
    const creditLimit = parseFloat(requestData.credit_limit) || 0;
    const rawAvailableBalance = parseFloat(requestData.raw_available_balance) || 0;
    const holdBalance = parseFloat(requestData.hold_balance) || 0;
    
    // ✅ Calculate available balance = raw_available_balance + hold_balance
    const availableBalance = rawAvailableBalance + holdBalance;
    
    const usedAmount = parseFloat(requestData.used_amount) || 0;
    const daysElapsed = parseFloat(requestData.days_elapsed) || 0;
    const remainingDays = parseFloat(requestData.remaining_days) || 0;

    const isDayLimitClient = dayLimit > 0 && creditLimit <= 0;

    if (isDayLimitClient) {
      return {
        availableBalance: null,
        isInsufficient: remainingDays <= 0,
        limitType: 'day',
        dayLimit,
        creditLimit,
        usedAmount,
        daysElapsed,
        remainingDays,
        holdBalance,
        rawAvailableBalance
      };
    }

    if (dayLimit > 0) {
      // Daily limit system active
      return {
        availableBalance,
        isInsufficient: availableBalance <= 0,
        limitType: 'daily',
        dayLimit,
        creditLimit,
        usedAmount,
        daysElapsed,
        remainingDays,
        holdBalance,
        rawAvailableBalance
      };
    } else {
      // Credit limit system active
      return {
        availableBalance,
        isInsufficient: availableBalance <= 0,
        limitType: 'credit',
        dayLimit,
        creditLimit,
        usedAmount,
        daysElapsed,
        remainingDays,
        holdBalance,
        rawAvailableBalance
      };
    }
  };

  const availableBalance = calculateAvailableBalance();
  const formatAmount = (value) => (Number(value || 0)).toLocaleString('en-IN');

  const creditLimitTotal = parseFloat(requestData?.credit_limit) || 0;
  const availableBalanceAmount = parseFloat(requestData?.available_balance) || 0;
  const usedAmount = parseFloat(requestData?.used_amount) || 0;
  const holdBalanceAmount = parseFloat(requestData?.hold_balance) || 0;
  const rawAvailableBalance = parseFloat(requestData?.raw_available_balance) || 0;

  const dailyLimitTotal = parseFloat(requestData?.day_limit) || 0;
  const dailyUsedAmount = 0;
  const dailyAvailableAmount = Math.max(0, dailyLimitTotal - dailyUsedAmount);

  const limitBadgeLabel = availableBalance.limitType === 'daily'
    ? 'Daily Available'
    : availableBalance.limitType === 'credit'
      ? 'Available Balance'
      : availableBalance.limitType === 'day'
        ? 'Day Limit (Days)'
        : 'Limit';

  const limitBadgeValue = availableBalance.limitType === 'day'
    ? `${availableBalance.remainingDays} days remaining`
    : `₹${formatAmount(availableBalance.limitType === 'daily'
      ? dailyAvailableAmount
      : availableBalance.availableBalance)}`;

  const limitExceededLabel = availableBalance.limitType === 'daily'
    ? 'Daily Limit'
    : availableBalance.limitType === 'credit'
      ? 'Credit Limit'
      : 'Day Limit';

  // ✅ Check if user is Staff (1) or Incharge (2)
  const isStaffOrIncharge = user && ['1', '2'].includes(String(user.role));

  const getDealPrice = () => {
    return parseFloat(requestData?.fuel_price || requestData?.price || 0);
  };
  
  const dealPrice = getDealPrice();

  // Loading component
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex flex-col md:flex-row flex-1">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center md:ml-64 p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading request details...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error component
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex flex-col md:flex-row flex-1">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center md:ml-64 p-4">
            <div className="text-center max-w-md w-full">
              <div className="text-red-500 text-lg md:text-xl mb-4">❌ Error</div>
              <p className="text-gray-600 mb-4 text-sm md:text-base">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.back()}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-gray-600 transition-colors text-sm md:text-base"
                >
                  Go Back
                </button>
                <button
                  onClick={fetchRequestDetails}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-colors text-sm md:text-base"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!requestData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center ml-64">
            <div className="text-center">
              <p className="text-gray-600 mb-4">No request data found</p>
              <button
                onClick={() => router.back()}
                className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'Cancel':
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateAmount = () => {
    const aqty = parseFloat(formData.aqty) || 0;
    const price = dealPrice;
    return (aqty * price).toFixed(2);
  };

  const isFinalStatus = requestData.status === 'Cancel' ||
    requestData.status === 'Cancelled' ||
    requestData.status === 'Completed';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto">
          <div className="py-4 md:py-8">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">

              <div className="mb-4 md:mb-6">
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-3 md:mb-4"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm md:text-base">Back to Requests</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    Filling Request: <span className="text-blue-600">{requestData.rid}</span>
                  </h1>
                  <div className="flex flex-col md:items-end space-y-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusClass(requestData.status)}`}>
                      {requestData.status}
                      {requestData.status === 'Processing' && ' 🔄'}
                      {(requestData.status === 'Cancel' || requestData.status === 'Cancelled') && ' ❌'}
                      {requestData.status === 'Completed' && ' ✅'}
                    </span>
                    {requestData.status === 'Processing' && requestData.processing_by_name && (
                      <span className="text-xs text-gray-600">By: {requestData.processing_by_name}</span>
                    )}
                    {requestData.status === 'Completed' && requestData.completed_by_name && (
                      <span className="text-xs text-gray-600">By: {requestData.completed_by_name}</span>
                    )}
                    {requestData.status_updated_by_name && requestData.status !== 'Processing' && requestData.status !== 'Completed' && (
                      <span className="text-xs text-gray-600">By: {requestData.status_updated_by_name}</span>
                    )}
                    
                    {/* ✅ Hide limit exceeded badge for Staff/Incharge */}
                    {availableBalance.isInsufficient && !isStaffOrIncharge && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                        {limitExceededLabel} Exceeded
                      </span>
                    )}
                    
                    {/* ✅ Hide hold balance for Staff/Incharge */}
                    {holdBalanceAmount > 0 && !isStaffOrIncharge && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                        Hold Balance: ₹{formatAmount(holdBalanceAmount)}
                      </span>
                    )}
                    
                  </div>
                </div>
              </div>

              {/* ✅ Hide Limit Alert for Staff/Incharge */}
              {availableBalance.isInsufficient && !isStaffOrIncharge && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-red-700 font-medium">
                        {limitExceededLabel} Exceeded
                      </p>
                      <p className="text-red-600 text-sm">
                        {availableBalance.limitType === 'daily' ? (
                          <>
                            Daily Limit: ₹{formatAmount(dailyLimitTotal)}, Used: ₹{formatAmount(dailyUsedAmount)}, Available: ₹{formatAmount(dailyAvailableAmount)}
                          </>
                        ) : availableBalance.limitType === 'credit' ? (
                          <>
                            Credit Limit: ₹{formatAmount(creditLimitTotal)}, Used: ₹{formatAmount(usedAmount)}, Available: ₹{formatAmount(availableBalanceAmount)}
                          </>
                        ) : (
                          <>
                            Day Limit: {dailyLimitTotal} days, Days Elapsed: {availableBalance.daysElapsed} days, Remaining: {availableBalance.remainingDays} days
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ Hide Hold Balance Alert for Staff/Incharge */}
              {requestData.status === 'Processing' && holdBalanceAmount > 0 && !isStaffOrIncharge && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-orange-700 font-medium">
                        Hold Balance Active: ₹{formatAmount(holdBalanceAmount)}
                      </p>
                      <p className="text-orange-600 text-sm">
                        This amount is reserved from raw available balance. If request is cancelled, this amount will be restored.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Information Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 md:mb-6 overflow-hidden">
                <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Request Information
                  </h2>
                </div>
                <div className="p-3 md:p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-200">
                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide md:w-1/4">Request ID</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 font-mono md:w-3/4 break-words">{requestData.rid}</td>
                        </tr>
                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">{requestData.product_name}</td>
                        </tr>
                       
                        {requestData.sub_product_code && (
                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Sub-Product</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">{requestData.sub_product_code}</td>
                          </tr>
                        )}
                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Station</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">{requestData.station_name}</td>
                        </tr>
                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Client Name</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">{requestData.client_name}</td>
                        </tr>
                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Client Phone</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">{requestData.client_phone}</td>
                        </tr>

                        {/* ✅ Hide Raw Available Balance Display for Staff/Incharge */}
                        {!isStaffOrIncharge && (
                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Raw Available Balance</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm font-medium text-blue-600 break-words">
                              ₹{formatAmount(rawAvailableBalance)}
                            </td>
                          </tr>
                        )}

                        {/* ✅ Hide Hold Balance Display for Staff/Incharge */}
                        {holdBalanceAmount > 0 && !isStaffOrIncharge && (
                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Hold Balance</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm font-medium text-orange-600 break-words">
                              ₹{formatAmount(holdBalanceAmount)}
                              <span className="text-xs text-gray-500 ml-2">(Will be restored to raw available balance if cancelled)</span>
                            </td>
                          </tr>
                        )}

                        {/* ✅ Hide Total Available Balance Display for Staff/Incharge */}
                        {!isStaffOrIncharge && (
                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Total Available Balance</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm font-medium break-words">
                              <span className={availableBalance.isInsufficient ? 'text-red-600' : 'text-green-600'}>
                                ₹{formatAmount(availableBalance.availableBalance)}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">(Raw + Hold)</span>
                            </td>
                          </tr>
                        )}

                        {/* Limit Information - Hide for Staff/Incharge */}
                        {!isStaffOrIncharge && availableBalance.limitType === 'daily' && (
                          <>
                            <tr className="flex flex-col md:table-row">
                              <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Daily Limit</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">₹{formatAmount(dailyLimitTotal)}</td>
                            </tr>
                            <tr className="flex flex-col md:table-row">
                              <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Daily Used</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">₹{formatAmount(dailyUsedAmount)}</td>
                            </tr>
                            <tr className="flex flex-col md:table-row">
                              <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Daily Available</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm font-medium break-words">
                                <span className={availableBalance.isInsufficient ? 'text-red-600' : 'text-green-600'}>
                                  ₹{formatAmount(dailyAvailableAmount)}
                                </span>
                              </td>
                            </tr>
                          </>
                        )}

                        {!isStaffOrIncharge && availableBalance.limitType === 'credit' && (
                          <>
                            <tr className="hidden">
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Credit Limit</td>
                              <td className="px-4 py-3 text-sm text-gray-900">₹{formatAmount(creditLimitTotal)}</td>
                            </tr>
                            <tr className="hidden">
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Used Amount</td>
                              <td className="px-4 py-3 text-sm text-gray-900">₹{formatAmount(usedAmount)}</td>
                            </tr>
                            <tr className="hidden">
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Available Balance</td>
                              <td className="px-4 py-3 text-sm font-medium">
                                <span className={availableBalance.isInsufficient ? 'text-red-600' : 'text-green-600'}>
                                  ₹{formatAmount(availableBalanceAmount)}
                                </span>
                              </td>
                            </tr>
                          </>
                        )}

                        {!isStaffOrIncharge && availableBalance.limitType === 'day' && (
                          <>
                            <tr className="flex flex-col md:table-row">
                              <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Day Limit (Credit Days)</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">{requestData.day_limit || 0} days</td>
                            </tr>
                            <tr className="flex flex-col md:table-row">
                              <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Days Elapsed</td>
                              <td className="px-3 md:px-4 py-2 md-py-3 text-sm text-gray-900 break-words">{availableBalance.daysElapsed} days</td>
                            </tr>
                            <tr className="flex flex-col md:table-row">
                              <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Remaining Days</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm font-medium break-words">
                                <span className={availableBalance.isInsufficient ? 'text-red-600' : 'text-green-600'}>
                                  {availableBalance.remainingDays} days
                                </span>
                              </td>
                            </tr>
                          </>
                        )}

                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Requested Quantity</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 font-medium break-words">{requestData.qty} Ltr</td>
                        </tr>
                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Actual Quantity</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 font-medium break-words">{requestData.aqty || 'Not set'} Ltr</td>
                        </tr>
                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Request Date & Time</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">
                            {new Date(requestData.created).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </td>
                        </tr>
                        {requestData.vehicle_number && (
                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicle Number</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">{requestData.vehicle_number}</td>
                          </tr>
                        )}
                        {requestData.remark && (
                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Remarks</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 break-words">{requestData.remark}</td>
                          </tr>
                        )}
                        <tr className="flex flex-col md:table-row">
                          <td className="px-3 md:px-4 py-3 md:py-4 bg-gray-50 text-xs md:text-sm font-medium text-gray-900 align-top md:align-middle md:w-1/4">
                            Documents
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-900 md:w-3/4">
                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 md:gap-6">
                              {[1, 2, 3].map((docNum) => (
                                <div key={docNum} className="text-center">
                                  <label className="block text-sm font-medium text-gray-500 mb-2">
                                    Document {docNum}
                                  </label>
                                  {requestData[`doc${docNum}`] ? (
                                    (() => {
                                      const rawUrl = requestData[`doc${docNum}`];
                                      const url = normalizeDocUrl(rawUrl);
                                      const showImage = isImageUrl(url) && !brokenImages[`doc${docNum}`];
                                      return showImage ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => openImageModal(url)}
                                            className="block"
                                            aria-label={`Preview Document ${docNum}`}
                                          >
                                            <div className="w-32 h-32 mx-auto">
                                              <img
                                                src={url}
                                                alt={`Document ${docNum}`}
                                                className="w-full h-full object-cover rounded-lg border-2 border-gray-300 bg-white"
                                                onError={() => setBrokenImages(prev => ({ ...prev, [`doc${docNum}`]: true }))}
                                              />
                                            </div>
                                          </button>
                                          <span className="text-xs text-blue-600 mt-1 inline-block">Preview</span>
                                        </>
                                      ) : (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block group"
                                          aria-label={`Open Document ${docNum}`}
                                        >
                                          <div className="w-32 h-32 border-2 border-gray-300 rounded-lg flex items-center justify-center mx-auto bg-gray-50">
                                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                            </svg>
                                          </div>
                                          <span className="text-xs text-blue-600 mt-1 inline-block">Open Document</span>
                                        </a>
                                      );
                                    })()
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Activity Logs Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Activity Logs
                  </h2>
                  <button
                    onClick={() => {
                      const logsSection = document.getElementById('activity-logs-content');
                      if (logsSection) {
                        logsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    View Log History
                  </button>
                </div>
                <div id="activity-logs-content" className="p-6">
                  {requestData.logs && (requestData.logs.created_by_name || requestData.logs.processed_by_name || requestData.logs.completed_by_name || requestData.logs.cancelled_by_name) ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Created By */}
                        {requestData.logs && requestData.logs.created_by_name &&
                          requestData.logs.created_by_name !== 'System' &&
                          requestData.logs.created_by_name.toUpperCase() !== 'SWIFT' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center mb-2">
                                <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-semibold text-blue-900">
                                  {requestData.logs.created_by_type === 'customer' ? 'Created By (Customer)' : 'Created By'}
                                </span>
                                {requestData.logs.created_by_code && (
                                  <span className="text-xs text-blue-600 ml-2">({requestData.logs.created_by_code})</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 font-medium">{requestData.logs.created_by_name}</p>
                              {(requestData.logs.created_date || requestData.logs.created_date_formatted) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {requestData.logs.created_date_formatted || new Date(requestData.logs.created_date).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                              )}
                            </div>
                          )}
                        {/* Processed By */}
                        {requestData.logs && requestData.logs.processed_by_name && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-semibold text-yellow-900">Processed By (Employee)</span>
                              {requestData.logs.processed_by_code && (
                                <span className="text-xs text-yellow-600 ml-2">({requestData.logs.processed_by_code})</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 font-medium">{requestData.logs.processed_by_name}</p>
                            {(requestData.logs.processed_date || requestData.logs.processed_date_formatted) && (
                              <p className="text-xs text-gray-500 mt-1">
                                {requestData.logs.processed_date_formatted || new Date(requestData.logs.processed_date).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Completed By */}
                        {requestData.logs && requestData.logs.completed_by_name && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-semibold text-green-900">Completed By (Employee)</span>
                              {requestData.logs.completed_by_code && (
                                <span className="text-xs text-green-600 ml-2">({requestData.logs.completed_by_code})</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 font-medium">{requestData.logs.completed_by_name}</p>
                            {(requestData.logs.completed_date || requestData.logs.completed_date_formatted) && (
                              <p className="text-xs text-gray-500 mt-1">
                                {requestData.logs.completed_date_formatted || new Date(requestData.logs.completed_date).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Edit History */}
                      {requestData.edit_logs && requestData.edit_logs.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <h3 className="text-md font-semibold text-gray-900 mb-4">Edit History</h3>
                          <div className="space-y-3">
                            {requestData.edit_logs.map((editLog, index) => (
                              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Edited by: {editLog.edited_by_name || 'Unknown'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {editLog.edited_date ? new Date(editLog.edited_date).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    }) : 'N/A'}
                                  </span>
                                </div>
                                {editLog.changes && (() => {
                                  try {
                                    const changes = typeof editLog.changes === 'string' ? JSON.parse(editLog.changes) : editLog.changes;
                                    return (
                                      <div className="text-xs text-gray-600 space-y-1">
                                        {changes.status && (
                                          <div>Status: <span className="font-medium">{changes.status.from}</span> → <span className="font-medium">{changes.status.to}</span></div>
                                        )}
                                        {changes.aqty && (
                                          <div>Quantity: <span className="font-medium">{changes.aqty.from}</span> → <span className="font-medium">{changes.aqty.to}</span></div>
                                        )}
                                        {changes.remarks && (
                                          <div>Remarks: <span className="font-medium">{changes.remarks.from || 'None'}</span> → <span className="font-medium">{changes.remarks.to || 'None'}</span></div>
                                        )}
                                      </div>
                                    );
                                  } catch {
                                    return null;
                                  }
                                })()}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium">No activity logs available</p>
                      <p className="text-sm mt-2">Logs will appear here when the request is processed or completed</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ Hide Update Request form for Completed and ALL Cancelled status variations */}
              {!isFinalStatus && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-base md:text-lg font-semibold text-gray-900 flex flex-col md:flex-row md:items-center gap-2 md:space-x-2">
                      {/* ✅ Hide balance details for staff (1) and incharge (2) */}
                      {!isStaffOrIncharge ? (
                        <>
                          <span>Update Request</span>
                          <span className='bg-yellow-400 text-black rounded px-2 py-1 text-xs md:text-sm font-medium w-fit'>Available Stock: {requestData.station_stock || 0} Ltr</span>
                          <span className={`px-2 py-1 text-xs md:text-sm font-medium rounded w-fit ${availableBalance.isInsufficient ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {limitBadgeLabel}: {limitBadgeValue}
                          </span>
                          {/* ✅ Hide Hold Balance for Staff/Incharge */}
                          {holdBalanceAmount > 0 && (
                            <span className='bg-orange-400 text-black rounded px-2 py-1 text-xs md:text-sm font-medium w-fit'>
                              Hold Balance: ₹{formatAmount(holdBalanceAmount)}
                            </span>
                          )}
                          
                        </>
                      ) : (
                        <>
                          <span>Update Request</span>
                          <span className='bg-yellow-400 text-black rounded px-2 py-1 text-xs md:text-sm font-medium w-fit'>
                            Available Stock: {requestData.station_stock || 0} Ltr
                          </span>
                         
                          
                        </>
                      )}
                    </h2>
                  </div>
                  <div className="p-3 md:p-6">
                    <form onSubmit={handleSubmit}>
                      <table className="min-w-full divide-y divide-gray-200">
                        <tbody className="divide-y divide-gray-200">
                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-3 md:py-4 bg-gray-50 text-xs md:text-sm font-medium text-gray-900 align-top md:w-1/4">
                              Upload Documents
                            </td>
                            <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-900 md:w-3/4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                                {[1, 2, 3].map((docNum) => (
                                  <div key={docNum} className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Document {docNum}
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="file"
                                        name={`doc${docNum}`}
                                        onChange={handleInputChange}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                                        accept="image/*,.pdf,.doc,.docx"
                                      />
                                      {uploadedFiles[`doc${docNum}`] && (
                                        <button
                                          type="button"
                                          onClick={() => removeFile(`doc${docNum}`)}
                                          className="absolute right-0 top-0 mt-2 mr-2 text-red-500 hover:text-red-700"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                    {uploadedFiles[`doc${docNum}`] && (
                                      <div className="mt-2">
                                        <p className="text-xs text-green-600">File selected: {formData[`doc${docNum}`]?.name}</p>
                                        <div className="mt-1 w-20 h-20 border rounded-lg overflow-hidden">
                                          <img
                                            src={uploadedFiles[`doc${docNum}`]}
                                            alt={`Preview doc${docNum}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>

                          {/* Sub-Product Selection */}
                          {requestData.available_sub_products && requestData.available_sub_products.length > 0 && (
                            <tr>
                              <td className="px-4 py-4 bg-gray-50 text-sm font-medium text-gray-900">
                                <label className="block">Sub-Product</label>
                              </td>
                              <td className="px-4 py-4">
                                <div className="max-w-xs">
                                  <select
                                    name="sub_product_id"
                                    value={formData.sub_product_id || ''}
                                    onChange={() => {}}
                                    disabled={true}
                                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-100 cursor-not-allowed"
                                  >
                                    <option value="">Select Sub-Product</option>
                                    {requestData.available_sub_products.map((subProduct) => (
                                      <option key={subProduct.id} value={subProduct.id}>
                                        {subProduct.pcode}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                            </tr>
                          )}

                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-3 md:py-4 bg-gray-50 text-xs md:text-sm font-medium text-gray-900">
                              <label className="block">Actual Quantity (Ltr) *</label>
                            </td>
                            <td className="px-3 md:px-4 py-3 md:py-4">
                              <div className="max-w-xs w-full">
                                <div className="relative">
                                  <input
                                    type="number"
                                    name="aqty"
                                    value={formData.aqty}
                                    onChange={handleInputChange}
                                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    step="0.01"
                                    min="0.01"
                                    max={requestData.station_stock}
                                    required
                                  />
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500">Ltr</span>
                                  </div>
                                </div>
                               
                              </div>
                            </td>
                          </tr>

                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-3 md:py-4 bg-gray-50 text-xs md:text-sm font-medium text-gray-900">
                              <label className="block">Status *</label>
                            </td>
                            <td className="px-3 md:px-4 py-3 md:py-4">
                              <div className="max-w-xs w-full">
                                <select
                                  name="status"
                                  value={formData.status}
                                  onChange={handleInputChange}
                                  className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  {isStaffOrIncharge ? (
                                    <>
                                      {requestData.status === 'Pending' && (
                                        <>
                                          <option value="Pending">Pending</option>
                                          <option value="Processing">Processing</option>
                                          <option value="Completed">Completed</option>
                                        </>
                                      )}
                                      {requestData.status === 'Processing' && (
                                        <option value="Completed">Completed</option>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <option value="Pending">Pending</option>
                                      <option value="Processing">Processing</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Cancel">Cancelled</option>
                                    </>
                                  )}
                                </select>
                                {formData.status === 'Cancel' && !isStaffOrIncharge && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Note: Cancelling will restore hold balance to raw available balance
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-3 md:py-4 bg-gray-50 text-xs md:text-sm font-medium text-gray-900 align-top">
                              <label className="block">Remarks</label>
                            </td>
                            <td className="px-3 md:px-4 py-3 md:py-4">
                              <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleInputChange}
                                rows={3}
                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter any remarks or notes..."
                              />
                            </td>
                          </tr>

                          <tr className="flex flex-col md:table-row">
                            <td className="px-3 md:px-4 py-3 md:py-4 bg-gray-50"></td>
                            <td className="px-3 md:px-4 py-3 md:py-4">
                              <div className="flex flex-col sm:flex-row justify-end gap-3 md:space-x-4">
                                {/* ✅ Hide Cancel button for Staff/Incharge */}
                                {!isStaffOrIncharge && requestData.status === 'Processing' && (
                                  <button
                                    type="button"
                                    onClick={() => setShowCancelModal(true)}
                                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    disabled={submitting}
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Cancel Request
                                  </button>
                                )}
                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  {submitting ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      {formData.status === 'Processing' ? 'Processing...' : 
                                       formData.status === 'Cancel' ? 'Cancelling...' : 
                                       'Updating...'}
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      {formData.status === 'Processing' ? 'Mark as Processing' :
                                        formData.status === 'Completed' ? 'Complete Request' :
                                        formData.status === 'Cancel' ? 'Cancel Request' :
                                        'Update Request'}
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </form>
                  </div>
                </div>
              )}

              {/* Final Status Message */}
              {isFinalStatus && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Request Status
                    </h2>
                  </div>
                  <div className="p-6 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getStatusClass(requestData.status)} mb-4`}>
                      {requestData.status === 'Completed' && (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {(requestData.status === 'Cancel' || requestData.status === 'Cancelled') && (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      This request is {requestData.status.toLowerCase()}
                    </h3>
                    {requestData.status === 'Completed' && requestData.completed_by_name && (
                      <p className="text-sm text-gray-600 mb-2">
                        Completed by: <span className="font-semibold">{requestData.completed_by_name}</span>
                      </p>
                    )}
                    <p className="text-gray-600 mb-4">
                      {requestData.status === 'Completed'
                        ? 'This filling request has been completed successfully.'
                        : 'This filling request has been cancelled.'}
                    </p>
                    <button
                      onClick={() => router.push('/filling-requests')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Back to Requests
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel Modal - Hide for Staff/Incharge */}
              {showCancelModal && !isStaffOrIncharge && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4">Cancel Request</h3>
                    {holdBalanceAmount > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-orange-700">
                          ⚠️ Hold Balance: <span className="font-bold">₹{formatAmount(holdBalanceAmount)}</span>
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          This amount will be restored to raw available balance after cancellation.
                        </p>
                      </div>
                    )}
                    <textarea
                      value={cancelRemarks}
                      onChange={(e) => setCancelRemarks(e.target.value)}
                      placeholder="Enter cancellation reason..."
                      className="w-full border border-gray-300 rounded-lg p-3 mb-4"
                      rows="4"
                    />
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowCancelModal(false)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                        disabled={submitting}
                      >
                        Close
                      </button>
                      <button
                        onClick={handleCancelRequest}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        disabled={submitting}
                      >
                        {submitting ? 'Cancelling...' : 'Confirm Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Limit Overdue Modal - Hide for Staff/Incharge */}
              {showLimitModal && !isStaffOrIncharge && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4 text-red-600">{limitTitle}</h3>
                    <p className="mb-6 text-gray-700">{limitMessage}</p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowLimitModal(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={handleRenewLimit}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Renew Limit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Deal Price Modal - Show only for non-Staff/Incharge */}
              {showPriceModal && !isStaffOrIncharge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                  <div className="bg-white rounded-lg shadow-xl p-6 w-96 border border-gray-200 pointer-events-auto">
                    <h3 className="text-lg font-semibold mb-4 text-red-600">Deal Price Alert</h3>
                    <p className="mb-6 text-gray-700">Deal price not updated. Please contact Admin to update price then complete.</p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowPriceModal(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={handleRenewLimit}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Renew Limit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}