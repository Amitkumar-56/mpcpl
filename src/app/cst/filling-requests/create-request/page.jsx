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
    product_id: '',
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
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [customerData, setCustomerData] = useState(null)
  const [priceDetails, setPriceDetails] = useState({ price: 0, totalAmount: 0 })

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
    setCustomerData(user);
    fetchCustomerData(user.id);
  }, [router]);

  const fetchCustomerData = async (cid) => {
    try {
      setFetchLoading(true);
      
      // Fetch stations
      const stationsResponse = await fetch(`/api/cst/customer-stations?customer_id=${cid}`);
      if (!stationsResponse.ok) {
        throw new Error(`Stations API error: ${stationsResponse.status}`);
      }
      const stationsData = await stationsResponse.json();
      
      if (stationsData.success) {
        setStations(stationsData.stations || []);
        
        // Auto-select station if only one
        if (stationsData.stations.length === 1) {
          setFormData(prev => ({
            ...prev,
            station_id: stationsData.stations[0].id
          }));
        }
      } else {
        console.error('Error fetching stations:', stationsData.message);
        setStations([]);
      }

      // Fetch products
      const productsResponse = await fetch(`/api/cst/customer-products?customer_id=${cid}`);
      if (!productsResponse.ok) {
        throw new Error(`Products API error: ${productsResponse.status}`);
      }
      const productsData = await productsResponse.json();
      
      if (productsData.success) {
        setProducts(productsData.products || []);
      } else {
        console.error('Error fetching products:', productsData.message);
        setProducts([]);
      }

    } catch (error) {
      console.error('Error fetching customer data:', error);
      alert('Error loading form data: ' + error.message);
      setStations([]);
      setProducts([]);
    } finally {
      setFetchLoading(false);
    }
  }

  // Fetch price when product or station changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (formData.product_id && formData.station_id && customerId && selectedProduct) {
        try {
          console.log('🔄 Fetching price for:', {
            product_id: formData.product_id,
            selected_product: selectedProduct,
            station_id: formData.station_id,
            customer_id: customerId
          });

          const response = await fetch(
            `/api/cst/deal-prices?customer_id=${customerId}&station_id=${formData.station_id}&product_id=${selectedProduct.product_id}&sub_product_id=${selectedProduct.id}`
          );
          const data = await response.json();
          
          console.log('💰 Price API Response:', data);

          if (data.success && data.data) {
            const latestPrice = data.data.price;
            const total = latestPrice * parseFloat(formData.qty || 0);
            
            setPriceDetails({
              price: latestPrice,
              totalAmount: total
            });
          } else {
            console.log('ℹ️ No deal price found');
            setPriceDetails({ price: 0, totalAmount: 0 });
          }
        } catch (error) {
          console.error('❌ Error fetching price:', error);
          setPriceDetails({ price: 0, totalAmount: 0 });
        }
      }
    };

    fetchPrice();
  }, [formData.product_id, formData.station_id, formData.qty, customerId, selectedProduct]);

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

    if (!formData.product_id) {
      newErrors.product_id = 'Product selection is required';
    }

    if (!formData.station_id) {
      newErrors.station_id = 'Station selection is required';
    }

    if (formData.request_type === 'Liter' && !formData.qty) {
      newErrors.qty = 'Quantity is required for Liter requests';
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

    // When product is selected
    if (name === 'product_id') {
      const product = products.find(p => p.id == value);
      setSelectedProduct(product);
      console.log('🔄 Selected Product:', product);
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
      try {
        const checkResponse = await fetch(`/api/cst/check-vehicle?vehicle_number=${formData.licence_plate}&customer_id=${customerId}`)
        if (checkResponse.ok) {
          const checkData = await checkResponse.json()
          if (checkData.exists) {
            alert(`Vehicle ${formData.licence_plate} already has a ${checkData.status} request (RID: ${checkData.rid}). Please wait for it to complete.`)
            setLoading(false)
            return
          }
        }
      } catch (checkError) {
        console.warn('Vehicle check failed, but continuing...', checkError);
      }

      // Prepare data for backend
      const requestData = {
        product_id: formData.product_id,
        station_id: formData.station_id,
        licence_plate: formData.licence_plate,
        phone: formData.phone,
        request_type: formData.request_type,
        qty: formData.qty || '0',
        remarks: formData.remarks,
        customer_id: customerId
      }

      console.log('📤 Sending to API:', {
        url: '/api/cst/filling-requests/create-requests',
        data: requestData
      });

      // Create new request - CORRECT URL
      const response = await fetch('/api/cst/filling-requests/create-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      console.log('📨 API Response Status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. Check API route.');
      }

      const result = await response.json();
      console.log('📄 API Result:', result);

      if (response.ok && result.success) {
        setCreatedRequest({
          rid: result.rid,
          otp: result.otp,
          vehicle: formData.licence_plate,
          product: result.product,
          station: result.station,
          quantity: result.quantity,
          price: result.price,
          total_amount: result.total_amount
        })
        setShowOtpModal(true)
      } else {
        alert(result.message || 'Error creating request: ' + (result.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Submission error:', error)
      alert('Error creating request. Please try again. Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setShowOtpModal(false)
    setCreatedRequest(null)
    resetForm()
    router.push('/cst/filling-requests')
  }

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      licence_plate: '',
      phone: '',
      product_id: '',
      qty: '',
      remarks: ''
    }))
    setSelectedProduct(null)
    setVehicles([])
    setErrors({})
    setPriceDetails({ price: 0, totalAmount: 0 })
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
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
          {/* OTP Success Modal */}
          {showOtpModal && createdRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-auto shadow-2xl">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Request Created Successfully! ✅</h3>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-5 mb-5 border border-blue-200">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Request ID:</span>
                        <span className="text-blue-600 font-bold text-lg">{createdRequest.rid}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Vehicle Number:</span>
                        <span className="font-medium bg-blue-100 px-2 py-1 rounded">{createdRequest.vehicle}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Product:</span>
                        <span className="font-medium">{createdRequest.product}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Station:</span>
                        <span className="font-medium">{createdRequest.station}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Quantity:</span>
                        <span className="font-medium">{createdRequest.quantity} Ltr</span>
                      </div>

                      {createdRequest.price > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">Price:</span>
                            <span className="font-medium">₹{createdRequest.price}/Ltr</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">Total Amount:</span>
                            <span className="font-medium">₹{createdRequest.total_amount}</span>
                          </div>
                        </>
                      )}
                      
                      <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                        <span className="font-semibold text-gray-700">OTP Code:</span>
                        <span className="text-green-600 font-bold text-xl bg-green-100 px-3 py-1 rounded-lg">
                          {createdRequest.otp}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                    Please share this OTP with the driver for verification at the filling station. 
                    The driver must provide this OTP to complete the filling process.
                  </p>
                  
                  <button
                    onClick={handleModalClose}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    OK, Go to Requests
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="container mx-auto max-w-6xl">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <button 
                  onClick={() => router.back()}
                  className="mr-4 p-3 rounded-xl hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Create Filling Request</h1>
                  <p className="text-gray-600 mt-1">Create a new fuel filling request for your vehicle</p>
                </div>
              </div>

              {/* Customer Info Card */}
              {customerData && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-700 mr-2">Customer:</span>
                      <span className="text-gray-900">{customerData.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-700 mr-2">Company:</span>
                      <span className="text-gray-900">{customerData.company}</span>
                    </div>
                    {customerData.blocklocation && (
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700 mr-2">Assigned Station ID:</span>
                        <span className="text-gray-900">{customerData.blocklocation}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Price Display Card */}
            {(priceDetails.price > 0 || priceDetails.totalAmount > 0) && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-6">
                <h3 className="font-semibold text-green-800 mb-3">Price Calculation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Unit Price</div>
                    <div className="text-lg font-bold text-green-700">₹{priceDetails.price.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Quantity</div>
                    <div className="text-lg font-bold text-blue-700">{formData.qty || 0} Ltr</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Total Amount</div>
                    <div className="text-lg font-bold text-purple-700">₹{priceDetails.totalAmount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">New Filling Request</h2>
                <p className="text-blue-100 text-sm mt-1">Fill in the details below to create a new request</p>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Vehicle & Contact Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vehicle Number */}
                    <div className="relative">
                      <label htmlFor="licence_plate" className="block text-sm font-semibold text-gray-700 mb-2">
                        Vehicle Number *
                      </label>
                      <input
                        type="text"
                        id="licence_plate"
                        name="licence_plate"
                        value={formData.licence_plate}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          errors.licence_plate ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Enter vehicle number (e.g., MP09AB1234)"
                      />
                      {errors.licence_plate && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {errors.licence_plate}
                        </p>
                      )}
                      {vehicleLoading && (
                        <div className="absolute right-4 top-12">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      {vehicles.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 border-2 border-blue-200 rounded-xl bg-white shadow-2xl max-h-48 overflow-y-auto z-20">
                          {vehicles.map((vehicle) => (
                            <div
                              key={vehicle.id}
                              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  licence_plate: vehicle.licence_plate || vehicle.vehicle_number,
                                  phone: vehicle.phone || vehicle.driver_number || ''
                                }))
                                setVehicles([])
                              }}
                            >
                              <div className="font-semibold text-gray-900">{vehicle.licence_plate || vehicle.vehicle_number}</div>
                              {vehicle.phone && (
                                <div className="text-sm text-gray-600 flex items-center mt-1">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                  </svg>
                                  {vehicle.phone}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Driver Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                        Driver Phone *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Driver phone number (10-15 digits)"
                      />
                      {errors.phone && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product & Station Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Product Selection */}
                    <div>
                      <label htmlFor="product_id" className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Product *
                      </label>
                      <div className="relative">
                        <select
                          id="product_id"
                          name="product_id"
                          value={formData.product_id}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white ${
                            errors.product_id ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <option value="">Select Product</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.pcode} - {product.product_name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {errors.product_id && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {errors.product_id}
                        </p>
                      )}
                    </div>

                    {/* Station Selection */}
                    <div>
                      <label htmlFor="station_id" className="block text-sm font-semibold text-gray-700 mb-2">
                        Filling Station *
                      </label>
                      <div className="relative">
                        <select
                          id="station_id"
                          name="station_id"
                          value={formData.station_id}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white ${
                            errors.station_id ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <option value="">Select Filling Station</option>
                          {stations.map(station => (
                            <option key={station.id} value={station.id}>
                              {station.station_name} (ID: {station.id})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {errors.station_id && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {errors.station_id}
                        </p>
                      )}
                      {stations.length === 1 && (
                        <p className="mt-2 text-sm text-green-600">
                          Station auto-selected based on your location
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Request Type & Quantity Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Request Type */}
                    <div>
                      <label htmlFor="request_type" className="block text-sm font-semibold text-gray-700 mb-2">
                        Request Type
                      </label>
                      <div className="relative">
                        <select
                          id="request_type"
                          name="request_type"
                          value={formData.request_type}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white hover:border-gray-400"
                        >
                          <option value="Liter">Liter - Specific Quantity</option>
                          <option value="Full tank">Full Tank - Vehicle Capacity</option>
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label htmlFor="qty" className="block text-sm font-semibold text-gray-700 mb-2">
                        Quantity {formData.request_type === 'Liter' && '*'}
                      </label>
                      <input
                        type="number"
                        id="qty"
                        name="qty"
                        value={formData.qty}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          errors.qty ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Enter quantity in liters"
                        required={formData.request_type === 'Liter'}
                        disabled={formData.request_type !== 'Liter'}
                        min="0"
                        step="0.01"
                      />
                      {errors.qty && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {errors.qty}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Remarks Section */}
                  <div>
                    <label htmlFor="remarks" className="block text-sm font-semibold text-gray-700 mb-2">
                      Additional Remarks
                      <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
                    </label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 resize-none"
                      placeholder="Enter any additional instructions or remarks for the filling station..."
                      rows="4"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Any special instructions or notes for the station staff can be added here.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={loading || !customerId}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating Request...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create Filling Request
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-8 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50 font-semibold transition-all duration-200 shadow-sm hover:shadow-md border border-gray-300"
                    >
                      <span className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset Form
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ensure vehicle number is correct and matches registration</li>
                    <li>• Driver phone number should be active and accessible</li>
                    <li>• Select the appropriate product from the list</li>
                    <li>• Station is auto-selected based on your assigned location</li>
                    <li>• OTP will be generated and must be shared with the driver</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
    
        <Footer />
      </div>
    </div>
  )
}