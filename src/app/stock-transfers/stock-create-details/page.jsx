// src/app/stock-transfers/stock-create-details/page.jsx
'use client';

import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/Footer";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
    FiAlertCircle,
    FiArrowLeft,
    FiCheck,
    FiChevronDown,
    FiChevronUp,
    FiClock,
    FiEdit2,
    FiHome,
    FiImage,
    FiInfo,
    FiList,
    FiLoader,
    FiMapPin,
    FiPackage,
    FiRefreshCw,
    FiSave,
    FiTruck,
    FiUpload,
    FiUser,
    FiX
} from 'react-icons/fi';

// Create a loading fallback component
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <FiLoader className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 text-2xl animate-pulse" />
    </div>
    <p className="mt-6 text-lg text-gray-600 font-medium">Loading transfer details...</p>
    <p className="mt-2 text-sm text-gray-500">Please wait while we fetch the data</p>
  </div>
);

// Main component logic
function StockCreateDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [transfer, setTransfer] = useState(null);
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [formData, setFormData] = useState({
    station_from: '',
    station_to: '',
    driver_id: '',
    vehicle_id: '',
    transfer_quantity: '',
    status: '1',
    product: '',
    slip: null
  });
  const [previewImage, setPreviewImage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchTransferDetails();
    }
  }, [id]);

  const fetchTransferDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stock-transfers/stock-create-details?id=${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success && data.error) {
        throw new Error(data.error);
      }
      
      if (data.transfer) {
        setTransfer(data.transfer || {});
        setStations(data.stations || []);
        setProducts(data.products || []);
        setLogs(data.logs || []);
        
        setFormData({
          station_from: data.transfer.station_from || '',
          station_to: data.transfer.station_to || '',
          driver_id: data.transfer.driver_id || '',
          vehicle_id: data.transfer.vehicle_id || '',
          transfer_quantity: data.transfer.transfer_quantity || '',
          status: (data.transfer.status || '1').toString(),
          product: data.transfer.product || '',
          slip: null
        });
        
        if (data.transfer.slip) {
          setPreviewImage(data.transfer.slip);
        }
      } else {
        throw new Error('No transfer data received');
      }
    } catch (error) {
      console.error('Error fetching transfer details:', error);
      setError(error.message || 'Error fetching transfer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Only JPG, JPEG, PNG & GIF files are allowed');
        return;
      }

      setFormData(prev => ({
        ...prev,
        slip: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case '1': return 'Dispatch';
      case '2': return 'Pending';
      case '3': return 'Completed';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case '1': return 'bg-blue-100 text-blue-800';
      case '2': return 'bg-yellow-100 text-yellow-800';
      case '3': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Validation
    if (!formData.station_from || !formData.station_to || !formData.driver_id || 
        !formData.vehicle_id || !formData.transfer_quantity || !formData.product) {
      alert('Please fill all required fields');
      setSubmitting(false);
      return;
    }

    if (parseInt(formData.transfer_quantity) <= 0) {
      alert('Transfer quantity must be greater than 0');
      setSubmitting(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add user ID (you should get this from auth/session)
      formDataToSend.append('user_id', '1');

      const response = await fetch(`/api/stock-transfers/stock-create-details?id=${id}`, {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        if (data.stockUpdated) {
          alert('✅ Stock has been successfully added to the destination station!');
        }
        router.push('/stock-transfers');
      } else {
        alert(data.error || 'Failed to update transfer');
      }
    } catch (error) {
      console.error('Error updating transfer:', error);
      alert('Error updating transfer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <FiLoader className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 text-2xl animate-pulse" />
        </div>
        <p className="mt-6 text-lg text-gray-600 font-medium">Loading transfer details...</p>
        <p className="mt-2 text-sm text-gray-500">Please wait while we fetch the data</p>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <FiArrowLeft className="w-5 h-5 text-blue-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Update Stock Transfer</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <FiAlertCircle className="text-red-500 text-2xl mr-4" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Error Loading Transfer</h3>
                  <p className="text-red-600 mt-1">{error || 'The requested stock transfer record does not exist or has been removed.'}</p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => router.back()}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                    >
                      <FiArrowLeft className="mr-2" />
                      Go Back
                    </button>
                    <button
                      onClick={fetchTransferDetails}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <FiRefreshCw className="mr-2" />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Desktop: Relative, Mobile: Fixed/Overlay */}
      <div className="flex-shrink-0 z-50 lg:relative">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full w-full overflow-hidden relative">
        {/* Header */}
        <div className="flex-shrink-0 z-40 shadow-sm sticky top-0">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-gray-50 scroll-smooth">
          <div className="max-w-6xl mx-auto">
            {/* Page Title & Status */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
                >
                  <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
                    <FiEdit2 className="mr-3 text-blue-600" />
                    Update Stock Transfer
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <p className="text-sm font-bold text-gray-500">ID: #{id}</p>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${getStatusColor(transfer.status)}`}>
                      {getStatusText(transfer.status)}
                    </span>
                    {transfer.created_at && (
                      <p className="text-xs text-gray-400 font-medium">
                        <FiClock className="inline mr-1" />
                        {formatDate(transfer.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <nav className="mb-8">
              <ol className="flex flex-wrap items-center text-xs font-bold text-gray-400 uppercase tracking-wider space-x-2">
                <li><Link href="/" className="hover:text-blue-600 transition-colors">Dashboard</Link></li>
                <li className="text-gray-300">/</li>
                <li><Link href="/stock-transfers" className="hover:text-blue-600 transition-colors">Stock Transfers</Link></li>
                <li className="text-gray-300">/</li>
                <li className="text-blue-600">Update</li>
              </ol>
            </nav>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <FiMapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">From Station</p>
                <p className="text-sm font-bold text-gray-900">
                  {transfer?.from_station_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <FiMapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">To Station</p>
                <p className="text-sm font-bold text-gray-900">
                  {transfer?.to_station_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <FiPackage className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Quantity</p>
                <p className="text-sm font-bold text-gray-900">
                  {transfer?.transfer_quantity || '0'} L
                </p>
                <p className="text-xs text-gray-500">
                  {transfer?.product_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                <FiClock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Last Updated</p>
                <p className="text-sm font-bold text-gray-900">
                  {transfer?.updated_at ? formatDate(transfer.updated_at) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Logs Section */}
        {logs.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="w-full p-5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all flex items-center justify-between"
              >
                <div className="flex items-center">
                  <FiList className="text-gray-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-800">Activity Logs</h3>
                  <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                    {logs.length} entries
                  </span>
                </div>
                {showLogs ? (
                  <FiChevronUp className="text-gray-500" />
                ) : (
                  <FiChevronDown className="text-gray-500" />
                )}
              </button>
              
              {showLogs && (
                <div className="p-5 border-t border-gray-200">
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {logs.map((log, index) => (
                      <div key={log.id || index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              <FiInfo className="text-blue-500 mr-2" />
                              <h4 className="font-medium text-gray-800">{log.action}</h4>
                            </div>
                            {log.changes && (
                              <div className="mt-2 ml-6">
                                {(() => {
                                  try {
                                    const changes = JSON.parse(log.changes);
                                    return changes.map((change, idx) => (
                                      <p key={idx} className="text-sm text-gray-600">
                                        • {change}
                                      </p>
                                    ));
                                  } catch (error) {
                                    return (
                                      <p className="text-sm text-gray-600">
                                        • {log.changes}
                                      </p>
                                    );
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {formatDate(log.created_at)}
                            </p>
                            {log.updated_by_name && (
                              <p className="text-xs text-gray-600 mt-1">
                                By: {log.updated_by_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          {/* Form Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FiEdit2 className="mr-2 text-blue-600" />
                  Edit Transfer Details
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Update the stock transfer information below. 
                  <span className="font-medium text-blue-600 ml-1">
                    Status change to "Completed" will update destination stock.
                  </span>
                </p>
              </div>
              <div className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(transfer.status)}`}>
                {getStatusText(transfer.status)}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Station From */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiMapPin className="mr-2 text-blue-500" />
                      Station From *
                    </label>
                    <select
                      name="station_from"
                      value={formData.station_from}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      required
                    >
                      <option value="">Select Source Station</option>
                      {stations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.station_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Station To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiMapPin className="mr-2 text-green-500" />
                      Station To *
                    </label>
                    <select
                      name="station_to"
                      value={formData.station_to}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      required
                    >
                      <option value="">Select Destination Station</option>
                      {stations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.station_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Driver ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiUser className="mr-2 text-purple-500" />
                      Driver ID *
                    </label>
                    <input
                      type="text"
                      name="driver_id"
                      value={formData.driver_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Enter Driver ID"
                      required
                    />
                  </div>

                  {/* Vehicle ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiTruck className="mr-2 text-orange-500" />
                      Vehicle ID *
                    </label>
                    <input
                      type="text"
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Enter Vehicle ID"
                      required
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Transfer Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiPackage className="mr-2 text-yellow-500" />
                      Transfer Quantity (Liters) *
                    </label>
                    <input
                      type="number"
                      name="transfer_quantity"
                      value={formData.transfer_quantity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>

                  {/* Status - Important Notice */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiCheck className="mr-2 text-green-500" />
                      Status *
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, status: '1'}))}
                        className={`px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
                          formData.status === '1' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white border-gray-300 hover:bg-blue-50'
                        }`}
                      >
                        Dispatch
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, status: '2'}))}
                        className={`px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
                          formData.status === '2' 
                            ? 'bg-yellow-600 text-white border-yellow-600' 
                            : 'bg-white border-gray-300 hover:bg-yellow-50'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, status: '3'}))}
                        className={`px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
                          formData.status === '3' 
                            ? 'bg-green-600 text-white border-green-600' 
                            : 'bg-white border-gray-300 hover:bg-green-50'
                        }`}
                      >
                        Completed
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <FiInfo className="inline text-blue-500 mr-2" />
                      <span className="font-medium">Note:</span> Changing status to "Completed" will 
                      automatically add stock to the destination station and create a stock log.
                    </div>
                  </div>

                  {/* Product */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiPackage className="mr-2 text-red-500" />
                      Product *
                    </label>
                    <select
                      name="product"
                      value={formData.product}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.pname}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Slip Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiImage className="mr-2 text-indigo-500" />
                      Slip Image
                    </label>
                    
                    {previewImage && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Current Slip:</p>
                        <div className="relative group">
                          <img
                            src={previewImage}
                            alt="Slip preview"
                            className="w-full max-w-xs h-48 object-cover rounded-lg border-2 border-gray-300 group-hover:border-blue-500 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-sm font-medium">Click to change</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white hover:bg-gray-50 transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-10 pb-6">
                          <FiUpload className="w-12 h-12 mb-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          <p className="mb-2 text-sm text-gray-600">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 5MB)</p>
                        </div>
                        <input
                          type="file"
                          name="slip"
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  <p className="flex items-center">
                    <FiAlertCircle className="mr-2 text-gray-400" />
                    Fields marked with * are required
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center font-medium"
                  >
                    <FiX className="mr-2" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium ${
                      submitting ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {submitting ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <FiSave className="mr-2" />
                        Update Transfer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} MPCL. All rights reserved. | 
            <span className="mx-2">•</span>
            Stock Transfer Management System
            </p>
          </div>
        </div>
      </main>

        {/* Footer */}
        <div className="flex-shrink-0 z-40 bg-white border-t border-gray-200">
          <Footer />
        </div>
      </div>
    </div>
  );
}

// Main export component wrapped in Suspense
export default function StockCreateDetails() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StockCreateDetailsContent />
    </Suspense>
  );
}
