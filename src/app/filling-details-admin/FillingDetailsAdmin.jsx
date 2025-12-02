'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Sidebar from '../../components/sidebar';

export default function FillingDetailsAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

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

  useEffect(() => {
    if (id) fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching request details for ID:', id);

      const response = await fetch(`/api/filling-details-admin?id=${id}`);
      const data = await response.json();

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
          status: data.data.status || 'Pending'
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
  };

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

      const response = await fetch('/api/filling-details-admin', {
        method: 'POST',
        body: submitData
      });
      
      console.log('📨 Submit response status:', response.status);

      const result = await response.json();
      console.log('✅ Submit result:', result);
      
      if (result.success) {
        if (result.limitOverdue) {
          setLimitMessage(result.message || 'Your limit is over. Please recharge your account.');
          setShowLimitModal(true);
          setSubmitting(false);
          return;
        }
        
        // Custom success messages based on status
        let successMessage = '';
        switch(formData.status) {
          case 'Processing':
            successMessage = 'Request marked as Processing! The status has been updated successfully.';
            break;
          case 'Completed':
            successMessage = 'Request Completed Successfully!';
            break;
          case 'Cancelled':
            successMessage = 'Request Cancelled Successfully!';
            break;
          default:
            successMessage = result.message || 'Request updated successfully!';
        }
        
        alert(successMessage);
        
        // IMMEDIATELY update local state to show new status
        setRequestData(prev => ({
          ...prev,
          status: formData.status // Use the status from form
        }));
        
        console.log('🔄 Local state updated to:', formData.status);
        
        // Refresh data from server to confirm
        await fetchRequestDetails();
        
        // ✅✅✅ FIXED: Redirect ONLY for Completed and Cancelled status
        if (formData.status === 'Completed' || formData.status === 'Cancelled') {
          console.log('🔀 Redirecting to filling-requests page for Completed/Cancelled status');
          setTimeout(() => {
            router.push('/filling-requests');
          }, 1500);
        } else {
          console.log('📍 Staying on same page for Processing status');
          // Stay on the same page for Processing status
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
      submitData.append('status', 'Cancelled'); // ✅ FIXED: Use 'Cancelled' instead of 'Cancel'
      submitData.append('remarks', cancelRemarks);

      const response = await fetch('/api/filling-details-admin', {
        method: 'POST',
        body: submitData
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Request cancelled successfully!');
        
        // Immediately update local state
        setRequestData(prev => ({
          ...prev,
          status: 'Cancelled'
        }));
        
        setShowCancelModal(false);
        setCancelRemarks('');
        await fetchRequestDetails();
        
        // ✅✅✅ FIXED: Redirect for Cancelled status
        console.log('🔀 Redirecting to filling-requests page for Cancelled status');
        setTimeout(() => {
          router.push('/filling-requests');
        }, 1500);
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
    // Redirect to credit limit page for this customer
    router.push(`/credit-limit?id=${requestData.cid}`);
  };

  // Calculate available balance with CORRECTED logic including day limit
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
    const availableBalance = parseFloat(requestData.available_balance) || 0;
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
        remainingDays
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
        remainingDays
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
        remainingDays
      };
    }
  };

  const availableBalance = calculateAvailableBalance();
  const formatAmount = (value) => (Number(value || 0)).toLocaleString('en-IN');
  
  // Calculate values for display
  const creditLimitTotal = parseFloat(requestData?.credit_limit) || 0;
  const availableBalanceAmount = parseFloat(requestData?.available_balance) || 0;
  const usedAmount = parseFloat(requestData?.used_amount) || 0;
  
  const dailyLimitTotal = parseFloat(requestData?.day_limit) || 0;
  // ✅ FIXED: Since day_amount doesn't exist, set to 0
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
        : availableBalanceAmount)}`;
    
  const limitExceededLabel = availableBalance.limitType === 'daily'
    ? 'Daily Limit'
    : availableBalance.limitType === 'credit'
      ? 'Credit Limit'
      : 'Day Limit';

  // Loading component
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center ml-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
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
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center ml-64">
            <div className="text-center max-w-md">
              <div className="text-red-500 text-xl mb-4">❌ Error</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex space-x-4 justify-center">
                <button 
                  onClick={() => router.back()} 
                  className="bg-gray-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-gray-600 transition-colors"
                >
                  Go Back
                </button>
                <button 
                  onClick={fetchRequestDetails} 
                  className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-colors"
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
    const price = requestData.fuel_price || requestData.price || 0;
    return (aqty * price).toFixed(2);
  };

  // ✅ FIXED: Check for all cancelled status variations
  const isFinalStatus = requestData.status === 'Cancel' || 
                       requestData.status === 'Cancelled' || 
                       requestData.status === 'Completed';

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar />
 
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header/>
 
        <main className="flex-1 overflow-auto">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              <div className="mb-6">
                <button 
                  onClick={() => router.back()} 
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to Requests
                </button>
                
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Filling Request: <span className="text-blue-600">{requestData.rid}</span>
                  </h1>
                  <div className="flex flex-col items-end space-y-1">
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
                    {availableBalance.isInsufficient && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                        {limitExceededLabel} Exceeded
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Limit Alert */}
              {availableBalance.isInsufficient && (
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

              {/* Request Information Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Request Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide w-1/4">Request ID</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono w-3/4">{requestData.rid}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{requestData.product_name}</td>
                        </tr>
                        {requestData.sub_product_code && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Sub-Product</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{requestData.sub_product_code}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Station</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{requestData.station_name}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Client Name</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{requestData.client_name}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Client Phone</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{requestData.client_phone}</td>
                        </tr>
                        
                        {/* Limit Information - CORRECTED with Day Limit Details */}
                        {availableBalance.limitType === 'daily' && (
                          <>
                            <tr>
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Daily Limit</td>
                              <td className="px-4 py-3 text-sm text-gray-900">₹{formatAmount(dailyLimitTotal)}</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Daily Used</td>
                              <td className="px-4 py-3 text-sm text-gray-900">₹{formatAmount(dailyUsedAmount)}</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Daily Available</td>
                              <td className="px-4 py-3 text-sm font-medium">
                                <span className={availableBalance.isInsufficient ? 'text-red-600' : 'text-green-600'}>
                                  ₹{formatAmount(dailyAvailableAmount)}
                                </span>
                              </td>
                            </tr>
                          </>
                        )}
              
                        {availableBalance.limitType === 'credit' && (
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
                        
                        {availableBalance.limitType === 'day' && (
                          <>
                            <tr>
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Day Limit (Credit Days)</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{requestData.day_limit || 0} days</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Days Elapsed</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{availableBalance.daysElapsed} days</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Remaining Days</td>
                              <td className="px-4 py-3 text-sm font-medium">
                                <span className={availableBalance.isInsufficient ? 'text-red-600' : 'text-green-600'}>
                                  {availableBalance.remainingDays} days
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">First Transaction Date</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {requestData.first_completed_date ? 
                                  new Date(requestData.first_completed_date).toLocaleDateString('en-IN') : 
                                  'No completed transactions'
                                }
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Limit Mode</td>
                              <td className="px-4 py-3 text-sm text-gray-900">Unlimited requests within credit days window</td>
                            </tr>
                          </>
                        )}

                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Requested Quantity</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{requestData.qty} Ltr</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Actual Quantity</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{requestData.aqty || 'Not set'} Ltr</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Request Date & Time</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
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
                          <tr>
                            <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicle Number</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{requestData.vehicle_number}</td>
                          </tr>
                        )}
                        {requestData.remark && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Remarks</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{requestData.remark}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-4 py-4 bg-gray-50 text-sm font-medium text-gray-900 align-middle w-1/4">
                            Documents
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 w-3/4">
                            <div className="flex flex-wrap gap-6">
                              {[1, 2, 3].map((docNum) => (
                                <div key={docNum} className="text-center">
                                  <label className="block text-sm font-medium text-gray-500 mb-2">
                                    Document {docNum}
                                  </label>
                                  {requestData[`doc${docNum}`] ? (
                                    <a 
                                      href={requestData[`doc${docNum}`]} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block group"
                                    >
                                      <div className="relative w-32 h-32 mx-auto">
                                        <img 
                                          src={requestData[`doc${docNum}`]} 
                                          alt={`Document ${docNum}`} 
                                          className="w-full h-full object-cover rounded-lg border-2 border-gray-300 group-hover:border-blue-500 transition-colors"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                          <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      </div>
                                      <span className="text-xs text-blue-600 mt-1 inline-block group-hover:text-blue-800 transition-colors">View Document</span>
                                    </a>
                                  ) : (
                                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto">
                                      <span className="text-gray-400 text-sm">No document</span>
                                    </div>
                                  )}
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

              {/* Activity Logs Section - Always show with button to view logs */}
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
                  {requestData.logs ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {requestData.logs.created_by_name && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold text-blue-900">Created By</span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium">{requestData.logs.created_by_name}</p>
                          {requestData.logs.created_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(requestData.logs.created_date).toLocaleString('en-IN', {
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
                      {requestData.logs.processed_by_name && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold text-yellow-900">Processed By</span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium">{requestData.logs.processed_by_name}</p>
                          {requestData.logs.processed_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(requestData.logs.processed_date).toLocaleString('en-IN', {
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
                      {requestData.logs.completed_by_name && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold text-green-900">Completed By</span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium">{requestData.logs.completed_by_name}</p>
                          {requestData.logs.completed_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(requestData.logs.completed_date).toLocaleString('en-IN', {
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
                      {requestData.logs.cancelled_by_name && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold text-red-900">Cancelled By</span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium">{requestData.logs.cancelled_by_name}</p>
                          {requestData.logs.cancelled_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(requestData.logs.cancelled_date).toLocaleString('en-IN', {
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

              {/* ✅✅✅ FIXED: Hide Update Request form for Completed and ALL Cancelled status variations */}
              {!isFinalStatus && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>Update Request</span>
                      <span className='bg-yellow-400 text-black rounded px-2 py-1 text-sm font-medium'>Available Stock: {requestData.station_stock || 0} Ltr</span>
                      <span className={`px-2 py-1 text-sm font-medium rounded ${availableBalance.isInsufficient ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {limitBadgeLabel}: {limitBadgeValue}
                      </span>
                    </h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleSubmit}>
                      <table className="min-w-full divide-y divide-gray-200">
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-4 bg-gray-50 text-sm font-medium text-gray-900 align-top w-1/4">
                              Upload Documents
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 w-3/4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    onChange={handleInputChange}
                                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

                          <tr>
                            <td className="px-4 py-4 bg-gray-50 text-sm font-medium text-gray-900">
                              <label className="block">Actual Quantity (Ltr) *</label>
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-xs">
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
                                <p className="mt-1 text-sm text-gray-500">
                                  Available stock: <span className="font-medium">{requestData.station_stock || 0} Ltr</span>
                                </p>
                                {formData.aqty && !isNaN(parseFloat(formData.aqty)) && (
                                  <p className="mt-1 text-sm text-green-600 hidden">
                                    Calculated Amount: <span className="font-bold">₹{calculateAmount()}</span>
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td className="px-4 py-4 bg-gray-50 text-sm font-medium text-gray-900">
                              <label className="block">Status *</label>
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-xs">
                                <select 
                                  name="status"
                                  value={formData.status}
                                  onChange={handleInputChange}
                                  className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td className="px-4 py-4 bg-gray-50 text-sm font-medium text-gray-900 align-top">
                              <label className="block">Remarks</label>
                            </td>
                            <td className="px-4 py-4">
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

                          <tr>
                            <td className="px-4 py-4 bg-gray-50"></td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end space-x-4">
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
                                      {formData.status === 'Processing' ? 'Processing...' : 'Updating...'}
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      {formData.status === 'Processing' ? 'Mark as Processing' : 
                                       formData.status === 'Completed' ? 'Complete Request' : 
                                       formData.status === 'Cancelled' ? 'Cancel Request' : 
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
                    {requestData.status === 'Processing' && requestData.processing_by_name && (
                      <p className="text-sm text-gray-600 mb-2">
                        Processing by: <span className="font-semibold">{requestData.processing_by_name}</span>
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

              {/* Cancel Modal */}
              {showCancelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4">Cancel Request</h3>
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

              {/* Limit Overdue Modal */}
              {showLimitModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4 text-red-600">Credit Limit Overdue</h3>
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
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}