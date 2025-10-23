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
    status: 'Processing',
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({
    doc1: null,
    doc2: null,
    doc3: null
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('');

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
          status: data.data.status || 'Processing',
          remarks: data.data.remark || ''
        }));
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
    if (!formData.aqty || parseFloat(formData.aqty) <= 0) {
      alert('Please enter a valid actual quantity');
      return;
    }

    if (parseFloat(formData.aqty) > (requestData.station_stock || 0)) {
      alert(`Actual quantity cannot exceed available stock: ${requestData.station_stock || 0} Ltr`);
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
      submitData.append('billing_type', requestData.billing_type);
      submitData.append('oldstock', requestData.station_stock || 0);
      submitData.append('amtlimit', requestData.amtlimit || 0);
      submitData.append('hold_balance', requestData.hold_balance || 0);
      submitData.append('balance', requestData.balance || 0);
      submitData.append('outstanding', requestData.outstanding || 0);
      submitData.append('cst_limit', requestData.cst_limit || 0);
      submitData.append('price', requestData.fuel_price || requestData.price || 0);

      console.log('📤 Submitting form data with status:', formData.status);

      const response = await fetch('/api/filling-details-admin', {
        method: 'POST',
        body: submitData
      });
      
      console.log('📨 Submit response status:', response.status);

      const result = await response.json();
      console.log('✅ Submit result:', result);
      
      if (result.success) {
        alert(result.message || 'Request updated successfully!');
        await fetchRequestDetails(); // Refresh data
        
        // Redirect if completed or cancelled
        if (formData.status === 'Completed' || formData.status === 'Cancel') {
          setTimeout(() => {
            router.push('/filling-requests-admin');
          }, 1500);
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
      submitData.append('remarks', cancelRemarks);

      const response = await fetch('/api/filling-details-admin', {
        method: 'POST',
        body: submitData
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Request cancelled successfully!');
        setShowCancelModal(false);
        setCancelRemarks('');
        await fetchRequestDetails();
        
        // Redirect back after cancellation
        setTimeout(() => {
          router.push('/filling-requests-admin');
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
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancel': 
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateAmount = () => {
    const aqty = parseFloat(formData.aqty) || 0;
    const price = requestData.fuel_price || requestData.price || 0;
    return (aqty * price).toFixed(2);
  };

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
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusClass(requestData.status)}`}>
                    {requestData.status}
                  </span>
                </div>
              </div>

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
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Billing Type</td>
                          <td className="px-4 py-3 text-sm text-gray-900 capitalize">{requestData.billing_type == 1 ? 'Billing' : 'Non-Billing'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Requested Quantity</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{requestData.qty} Ltr</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Actual Quantity</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{requestData.aqty || 'Not set'} Ltr</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Available Stock</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{requestData.station_stock || 0} Ltr</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Price</td>
                          <td className="px-4 py-3 text-sm text-gray-900">₹{requestData.fuel_price || requestData.price || 0}/Ltr</td>
                        </tr>
                        {formData.aqty && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Calculated Amount</td>
                            <td className="px-4 py-3 text-sm text-green-600 font-bold">₹{calculateAmount()}</td>
                          </tr>
                        )}
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
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
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
                        {requestData.status !== 'Cancel' && requestData.status !== 'Cancelled' && requestData.status !== 'Completed' && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-50"></td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => setShowCancelModal(true)}
                                className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors'
                              >
                                Cancel This Request
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {requestData.status !== 'Cancel' && requestData.status !== 'Cancelled' && requestData.status !== 'Completed' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>Update Request</span>
                      <span className='bg-yellow-400 text-black rounded px-2 py-1 text-sm font-medium'>Available Stock: {requestData.station_stock || 0} Ltr</span>
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
                                {formData.aqty && (
                                  <p className="mt-1 text-sm text-green-600">
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
                                  <option value="Processing">Processing</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancel">Cancel</option>
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
                                  onClick={() => router.back()}
                                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
                                  disabled={submitting}
                                >
                                  Cancel
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
                                      Updating...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      Update Request
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
                        Cancel
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
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}