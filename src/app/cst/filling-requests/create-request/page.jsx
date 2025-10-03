// src/app/cst/filling-requests/create-request/page.jsx
'use client'

import Footer from "@/components/Footer";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CreateRequest() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    licence_plate: '',
    phone: '',
    product: '', // Changed from products_codes to match backend
    station_id: '',
    request_type: 'Liter',
    qty: '',
    remarks: ''
  })
  const [vehicles, setVehicles] = useState([])
  const [products, setProducts] = useState([])
  const [stations, setStations] = useState([])
  const [customerId, setCustomerId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [createdRequest, setCreatedRequest] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Redirect if not authenticated
  useEffect(() => {
    const savedUser = localStorage.getItem("customer");
    if (!savedUser) {
      router.push('/cst/login');
      return;
    }
    
    const user = JSON.parse(savedUser);
    if (Number(user.roleid) !== 1) {
      router.push('/cst/login');
      return;
    }
    
    setCustomerId(user.id);
    fetchCustomerData(user.id);
  }, [router]);

  const fetchCustomerData = async (cid) => {
    try {
      setFetchLoading(true);
      const response = await fetch(`/api/cst/customer-data?customer_id=${cid}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch customer data: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
        setStations(data.stations || []);
      } else {
        console.error('Error fetching customer data:', data.message);
        alert('Error loading form data: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      alert('Error loading form data. Please refresh the page.');
    } finally {
      setFetchLoading(false);
    }
  }

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.licence_plate.trim()) {
      newErrors.licence_plate = 'Vehicle number is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
    }

    if (!formData.product) {
      newErrors.product = 'Product selection is required';
    }

    if (!formData.station_id) {
      newErrors.station_id = 'Station selection is required';
    }

    if (formData.request_type === 'Liter' && !formData.qty) {
      newErrors.qty = 'Quantity is required for Liter requests';
    }

    if (selectedProduct && formData.qty && formData.qty < selectedProduct.min) {
      newErrors.qty = `Minimum quantity is ${selectedProduct.min}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchVehicles = async (query) => {
    if (query.length > 1 && customerId) {
      setVehicleLoading(true);
      try {
        const response = await fetch(`/api/cst/vehicles?query=${query}&customer_id=${customerId}`)
        const data = await response.json()
        if (data.success) {
          setVehicles(data.vehicles || [])
        } else {
          setVehicles([])
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error)
        setVehicles([])
      } finally {
        setVehicleLoading(false);
      }
    } else {
      setVehicles([])
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }

    if (name === 'product') {
      const product = products.find(p => p.id == value)
      setSelectedProduct(product)
      
      if (product) {
        // Auto-set quantity based on product type
        if (product.type === 'bucket') {
          setFormData(prev => ({
            ...prev,
            qty: '1',
            request_type: 'Liter' // Ensure it's liter for bucket products
          }))
        } else if (product.fullTank && formData.request_type === 'Full tank') {
          setFormData(prev => ({
            ...prev,
            qty: product.fullTank.toString()
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            qty: ''
          }))
        }
      }
    }

    if (name === 'request_type') {
      if (value === 'Full tank' && selectedProduct?.fullTank) {
        setFormData(prev => ({
          ...prev,
          qty: selectedProduct.fullTank.toString()
        }))
      } else if (value === 'Liter') {
        setFormData(prev => ({
          ...prev,
          qty: selectedProduct?.type === 'bucket' ? '1' : ''
        }))
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }

    if (name === 'licence_plate') {
      fetchVehicles(value)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!customerId) {
      alert('Customer information not loaded. Please refresh the page and try again.')
      return
    }
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true)

    try {
      // Check if vehicle has existing pending request
      const checkResponse = await fetch(`/api/cst/check-vehicle?vehicle_number=${formData.licence_plate}&customer_id=${customerId}`)
      const checkData = await checkResponse.json()
      
      if (checkData.exists) {
        alert(`Vehicle ${formData.licence_plate} already has a ${checkData.status} request (RID: ${checkData.rid}). Please wait for it to complete.`)
        setLoading(false)
        return
      }

      // Prepare data for backend - match the field names expected by the API
      const requestData = {
        product: formData.product,
        station_id: formData.station_id,
        licence_plate: formData.licence_plate,
        phone: formData.phone,
        request_type: formData.request_type,
        qty: formData.qty || (selectedProduct?.type === 'bucket' ? '1' : '0'),
        remarks: formData.remarks,
        customer: customerId // This matches the backend expectation
      }

      // Create new request
      const response = await fetch('/api/cst/filling-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setCreatedRequest({
          rid: result.rid,
          otp: result.otp,
          vehicle: formData.licence_plate
        })
        setShowOtpModal(true)
      } else {
        alert(result.error || result.message || 'Error creating request')
      }
    } catch (error) {
      alert('Error creating request. Please try again.')
      console.error('Submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setShowOtpModal(false)
    setCreatedRequest(null)
    router.push('/cst/filling-requests')
  }

  const resetForm = () => {
    setFormData({
      licence_plate: '',
      phone: '',
      product: '',
      station_id: '',
      request_type: 'Liter',
      qty: '',
      remarks: ''
    })
    setSelectedProduct(null)
    setVehicles([])
    setErrors({})
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
  
      <div className="flex flex-col flex-1 overflow-hidden">
        <CstHeader />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* OTP Success Modal */}
          {showOtpModal && createdRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Request Created Successfully! ✅</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-right font-medium">Request ID:</div>
                      <div className="text-blue-600 font-bold">{createdRequest.rid}</div>
                      
                      <div className="text-right font-medium">Vehicle Number:</div>
                      <div className="font-medium">{createdRequest.vehicle}</div>
                      
                      <div className="text-right font-medium">OTP Code:</div>
                      <div className="text-green-600 font-bold text-lg">{createdRequest.otp}</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    Please share this OTP with the driver for verification at the filling station.
                  </p>
                  
                  <button
                    onClick={handleModalClose}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium transition-colors duration-200"
                  >
                    OK, Go to Requests
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="container mx-auto max-w-4xl">
            {/* Header */}
            <div className="flex items-center mb-6">
              <button 
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                aria-label="Go back"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Create Filling Request</h1>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Create New Filling Request</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vehicle Number */}
                  <div className="relative">
                    <label htmlFor="licence_plate" className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      id="licence_plate"
                      name="licence_plate"
                      value={formData.licence_plate}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.licence_plate ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter vehicle number"
                      aria-describedby={errors.licence_plate ? "licence_plate-error" : undefined}
                    />
                    {errors.licence_plate && (
                      <p id="licence_plate-error" className="mt-1 text-sm text-red-600">{errors.licence_plate}</p>
                    )}
                    {vehicleLoading && (
                      <div className="absolute right-3 top-10">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {vehicles.length > 0 && (
                      <div 
                        role="listbox" 
                        aria-label="Vehicle suggestions"
                        className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-md bg-white shadow-lg max-h-40 overflow-y-auto z-10"
                      >
                        {vehicles.map((vehicle, index) => (
                          <div
                            key={vehicle.id}
                            role="option"
                            tabIndex={0}
                            aria-selected="false"
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 focus:bg-gray-100 focus:outline-none"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                licence_plate: vehicle.licence_plate || vehicle.vehicle_number,
                                phone: vehicle.phone || vehicle.driver_number || ''
                              }))
                              setVehicles([])
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setFormData(prev => ({
                                  ...prev,
                                  licence_plate: vehicle.licence_plate || vehicle.vehicle_number,
                                  phone: vehicle.phone || vehicle.driver_number || ''
                                }))
                                setVehicles([])
                              }
                            }}
                          >
                            <div className="font-medium">{vehicle.licence_plate || vehicle.vehicle_number}</div>
                            {vehicle.phone && <div className="text-sm text-gray-600">{vehicle.phone}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Driver Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Phone *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Driver phone number"
                      aria-describedby={errors.phone ? "phone-error" : undefined}
                    />
                    {errors.phone && (
                      <p id="phone-error" className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  {/* Product Selection */}
                  <div>
                    <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Product *
                    </label>
                    <select
                      id="product"
                      name="product"
                      value={formData.product}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.product ? 'border-red-500' : 'border-gray-300'
                      }`}
                      aria-describedby={errors.product ? "product-error" : undefined}
                    >
                      <option value="">Select Product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.pcode} - {product.pname}
                        </option>
                      ))}
                    </select>
                    {errors.product && (
                      <p id="product-error" className="mt-1 text-sm text-red-600">{errors.product}</p>
                    )}
                  </div>

                  {/* Station Selection */}
                  <div>
                    <label htmlFor="station_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Station *
                    </label>
                    <select
                      id="station_id"
                      name="station_id"
                      value={formData.station_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.station_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      aria-describedby={errors.station_id ? "station_id-error" : undefined}
                    >
                      <option value="">Select Station</option>
                      {stations.map(station => (
                        <option key={station.id} value={station.id}>
                          {station.station_name || `Station ${station.id}`}
                        </option>
                      ))}
                    </select>
                    {errors.station_id && (
                      <p id="station_id-error" className="mt-1 text-sm text-red-600">{errors.station_id}</p>
                    )}
                  </div>

                  {/* Request Type */}
                  <div>
                    <label htmlFor="request_type" className="block text-sm font-medium text-gray-700 mb-2">
                      Request Type
                    </label>
                    <select
                      id="request_type"
                      name="request_type"
                      value={formData.request_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Liter">Liter</option>
                      <option value="Full tank">Full Tank</option>
                    </select>
                    {formData.request_type === 'Full tank' && selectedProduct?.fullTank && (
                      <p className="text-sm text-gray-600 mt-1">
                        Full Tank = {selectedProduct.fullTank} Ltr
                      </p>
                    )}
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label htmlFor="qty" className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity {formData.request_type === 'Liter' && '*'}
                      {selectedProduct && selectedProduct.min && ` (Min: ${selectedProduct.min})`}
                    </label>
                    <input
                      type="number"
                      id="qty"
                      name="qty"
                      value={formData.qty}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.qty ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter quantity"
                      required={formData.request_type === 'Liter'}
                      disabled={formData.request_type !== 'Liter'}
                      min={selectedProduct ? selectedProduct.min : 0}
                      step="0.01"
                      aria-describedby={errors.qty ? "qty-error" : undefined}
                    />
                    {errors.qty && (
                      <p id="qty-error" className="mt-1 text-sm text-red-600">{errors.qty}</p>
                    )}
                    {selectedProduct?.type === 'bucket' && formData.qty && (
                      <p className="text-sm text-gray-600 mt-1">
                        Total Liters: {formData.qty * (selectedProduct.bucket_size || 1)} Ltr
                      </p>
                    )}
                  </div>

                  {/* Remarks */}
                  <div className="md:col-span-2">
                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter remarks (optional)"
                      rows="3"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading || !customerId}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-200"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Request...
                      </span>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors duration-200"
                  >
                    Reset Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
    
        <Footer />
      </div>
    </div>
  )
}