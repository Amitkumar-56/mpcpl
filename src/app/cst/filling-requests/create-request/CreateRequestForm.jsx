'use client'

import Footer from "@/components/Footer";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CreateRequestForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    licence_plate: '',
    phone: '',
    product_id: '',
    station_id: '',
    qty: '',
    aty: '',
    remarks: '',
    products_codes: '' // ✅ Added missing field
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
  const [calculatedBarrels, setCalculatedBarrels] = useState(0)
  const [maxQuantity, setMaxQuantity] = useState(0)
  const [isCustomerDisabled, setIsCustomerDisabled] = useState(false)
  const [productCodes, setProductCodes] = useState([])
  const [selectedSubProductId, setSelectedSubProductId] = useState('')
  const [loadingSubProducts, setLoadingSubProducts] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [dayLimitStatus, setDayLimitStatus] = useState(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false) // ✅ Added authentication state

  // Product configuration based on product_id
  const productConfig = {
    2: { name: "Industrial Oil 40", type: "liter", min: 1, barrelSize: 200, maxQuantity: 5000 },
    3: { name: "Industrial Oil 60", type: "liter", min: 1, barrelSize: 200, maxQuantity: 5000 },
    4: { name: "DEF Lose", type: "liter", min: 1, maxQuantity: 10000 },
    5: { name: "DEF Bucket", type: "bucket", bucketSize: 20, min: 1, maxQuantity: 100 },
  };

  // ================ ALL HOOKS BEFORE ANY CONDITIONAL RETURNS ================

  // ✅ 1. Barrel calculation - 200 liters per barrel
  useEffect(() => {
    if (selectedProduct?.barrelSize && formData.qty) {
      const qty = parseInt(formData.qty) || 0;
      if (qty === 0) {
        setCalculatedBarrels(0);
      } else {
        let barrels = Math.ceil(qty / 200);
        setCalculatedBarrels(barrels);
      }
    } else {
      setCalculatedBarrels(0);
    }
  }, [formData.qty, selectedProduct]);

  // Removed full tank auto-fill logic

  // ✅ 4. AUTO-SWITCH BULK/RETAIL BASED ON QTY
  // ✅ 4. AUTO-SWITCH BULK/RETAIL BASED ON QTY
  useEffect(() => {
    if (!formData.product_id || !productCodes.length || !formData.qty) return;

    const qty = parseInt(formData.qty) || 0;
    const pid = parseInt(formData.product_id);
    let targetType = 'retail';

    if (pid === 2 || pid === 3) { // Ind Oil
      if (qty > 5000) targetType = 'bulk';
    } else if (pid === 4) { // DEF Lose
      if (qty > 3000) targetType = 'bulk';
    } else if (pid === 5) { // DEF Bucket
      // qty is in liters
      if (qty > 3000) targetType = 'bulk';
    }

    // Find matching code
    let targetCode = null;
    if (pid === 2 || pid === 3) {
      targetCode = productCodes.find(c => {
        const pcode = (c.pcode || '').toUpperCase();
        // Strict Retail check: includes "(R)"
        const isRetail = pcode.includes('(R)');
        return targetType === 'retail' ? isRetail : !isRetail;
      });
    } else if (pid === 4) {
      targetCode = productCodes.find(c => {
        // Retail: includes "(R)"
        const isRetail = (c.pcode || '').toUpperCase().includes('(R)');
        return targetType === 'retail' ? isRetail : !isRetail;
      });
    } else if (pid === 5) {
      targetCode = productCodes.find(c => {
        // Retail: includes "(R)"
        const isRetail = (c.pcode || '').toUpperCase().includes('(R)');
        return targetType === 'retail' ? isRetail : !isRetail;
      });
    }

    // Default to first available if no specific type match found (fallback)
    if (!targetCode && productCodes.length > 0) {
      // If we wanted bulk but didn't find specific bulk code, keep current or warn?
      // For now, let's just stick to logic.
    }

    if (targetCode && String(formData.products_codes) !== String(targetCode.id)) {
      console.log(`🔄 Auto-switching to ${targetType} (Code: ${targetCode.pcode}) based on Qty: ${qty}`);
      setFormData(prev => ({ ...prev, products_codes: String(targetCode.id) }));
      setSelectedSubProductId(String(targetCode.id)); // ✅ FIX: Sync UI state
    }
  }, [formData.qty, formData.product_id, productCodes]);

  // ✅ 5. Derive Bulk/Retail from selected sub product code and set minimums dynamically
  useEffect(() => {
    if (!formData.products_codes) return;
    const selectedCode = productCodes.find(p => p.id === parseInt(formData.products_codes));
    if (!selectedCode) return;
    const pcode = (selectedCode.pcode || '').toUpperCase();
    const pid = parseInt(selectedCode.product_id);
    let category = 'retail';
    if (pid === 2 || pid === 3) {
      const norm = pcode.replace(/\s+/g, '');
      const isRetail = norm.endsWith('R') || norm.includes('-R') || pcode.includes('RTL') || pcode.includes('RETAIL');
      category = isRetail ? 'retail' : 'bulk';
    } else if (pid === 4) {
      const norm = pcode.toUpperCase().replace(/\s+/g, '');
      if (norm.includes('BULK') || norm.includes('DEFLB')) category = 'bulk';
      else category = 'retail';
    } else if (pid === 5) {
      if (pcode.includes('BUCKET')) category = 'bulk';
      else category = 'retail';
    }
    let minValue = 1;
    let maxAmount = 0;

    // Get default max from config
    const config = productConfig[pid];
    const defaultMax = config?.maxQuantity || 0;

    if (pid === 2 || pid === 3) {
      minValue = category === 'bulk' ? 1000 : 1;
      maxAmount = category === 'bulk' ? 100000 : defaultMax;
    } else if (pid === 4) {
      minValue = category === 'bulk' ? 1000 : 1;
      maxAmount = category === 'bulk' ? 100000 : defaultMax;
    } else if (pid === 5) {
      minValue = category === 'bulk' ? 25 : 1;
      // For buckets, max quantity in config is 100 buckets (2000L).
      // Bulk should allow more.
      maxAmount = category === 'bulk' ? 100000 : defaultMax;
    }

    setSelectedProduct(prev => prev ? { ...prev, min: minValue, maxQuantity: maxAmount } : prev);
  }, [formData.products_codes, productCodes]);

  // ✅ 6. Derive Bulk/Retail from selected sub product code (original logic)
  useEffect(() => {
    const pid = parseInt(formData.product_id) || null;
    if (!pid || !selectedSubProductId || productCodes.length === 0) return;
    const codeObj = productCodes.find(c => String(c.id) === String(selectedSubProductId));
    const pcode = (codeObj?.pcode || '').toUpperCase();
    let category = 'retail';
    if (pid === 2 || pid === 3) {
      const norm = pcode.replace(/\s+/g, '');
      const isRetail = norm.endsWith('R') || norm.includes('-R') || pcode.includes('RTL') || pcode.includes('RETAIL');
      category = isRetail ? 'retail' : 'bulk';
    } else if (pid === 4) {
      const norm = pcode.toUpperCase().replace(/\s+/g, '');
      if (norm.includes('BULK') || norm.includes('DEFLB')) category = 'bulk';
      else category = 'retail';
    } else if (pid === 5) {
      // DEF Bucket: BUCKET (bulk buckets) vs PACK (retail bucket)
      if (pcode.includes('BUCKET')) category = 'bulk';
      else category = 'retail';
    }
    let minValue = 1;
    let maxAmount = 0;

    // Get default max from config
    const config = productConfig[pid];
    const defaultMax = config?.maxQuantity || 0;

    if (pid === 2 || pid === 3) {
      minValue = category === 'bulk' ? 1000 : 1;
      maxAmount = category === 'bulk' ? 100000 : defaultMax;
    } else if (pid === 4) {
      minValue = category === 'bulk' ? 1000 : 1;
      maxAmount = category === 'bulk' ? 100000 : defaultMax;
    } else if (pid === 5) {
      // bucket min is bucket count, not liters
      minValue = category === 'bulk' ? 25 : 1;
      maxAmount = category === 'bulk' ? 100000 : defaultMax;
    }
    setSelectedProduct(prev => prev ? { ...prev, min: minValue, maxQuantity: maxAmount } : prev);
  }, [selectedSubProductId, productCodes, formData.product_id]);

  // ✅ 7. Fetch product codes
  useEffect(() => {
    const pid = formData.product_id;
    if (!pid) {
      setProductCodes([]);
      setSelectedSubProductId('');
      setLoadingSubProducts(false);
      return;
    }

    setLoadingSubProducts(true);
    (async () => {
      try {
        const res = await fetch(`/api/cst/product-codes?product_id=${pid}`);
        const json = await res.json();
        if (json.success) {
          const codes = json.codes || [];
          setProductCodes(codes);
          setFilterType(json.filter_type || '');
          let retailDefault = '';
          if (codes.length > 0) {
            const retailCode = codes.find(c => {
              const p = (c.pcode || '').toUpperCase();
              return p.includes('(R)') || p.includes('RETAIL') || p.includes('RTL');
            });
            retailDefault = retailCode?.id ? String(retailCode.id) : (codes[0]?.id ? String(codes[0].id) : '');
          }
          setSelectedSubProductId(retailDefault || '');
          setFormData(prev => ({ ...prev, products_codes: retailDefault || '' }));
        } else {
          setProductCodes([]);
          setSelectedSubProductId('');
          setFilterType('');
        }
      } catch (e) {
        console.error('Error fetching product codes:', e);
        setProductCodes([]);
        setSelectedSubProductId('');
      } finally {
        setLoadingSubProducts(false);
      }
    })();
  }, [formData.product_id]);

  // ✅ 8. Fetch price when product or station changes
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
            `/api/cst/deal-price?com_id=${customerId}&station_id=${formData.station_id}&product_id=${selectedProduct.product_id || selectedProduct.id}&sub_product_id=${selectedSubProductId || ''}`
          );
          const data = await response.json();

          console.log('💰 Price API Response:', data);

          if (data.success && data.data) {
            const latestPrice = parseFloat(data.data.price) || 0;
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
  }, [formData.product_id, formData.station_id, formData.qty, customerId, selectedProduct, selectedSubProductId]);

  // ✅ 9. Check eligibility when customerId changes
  useEffect(() => {
    if (customerId) {
      checkEligibility();
    }
  }, [customerId]);

  // ✅ 10. Authentication check - LAST HOOK
  useEffect(() => {
    const savedUser = localStorage.getItem("customer");
    if (!savedUser) {
      router.push('/cst/login');
      return;
    }

    const user = JSON.parse(savedUser);
    const roleId = Number(user.roleid);

    if (roleId !== 1 && roleId !== 2) {
      console.error("CreateRequest: Invalid role", user.roleid);
      alert("Invalid user role. Please login again.");
      router.push('/cst/login');
      return;
    }

    const cid = user.com_id || user.id;
    setCustomerId(cid);
    setCustomerData(user);
    setIsAuthenticated(true);
    fetchCustomerData(cid);
  }, [router]);

  // ================ FUNCTIONS ================

  const checkEligibility = async () => {
    try {
      setCheckingEligibility(true);
      const response = await fetch('/api/cst/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId })
      });

      if (response.ok) {
        const data = await response.json();
        setDayLimitStatus(data);

        if (data.success && !data.isEligible) {
          console.log('⚠️ Customer not eligible:', data.reason);
        }
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const fetchCustomerData = async (cid) => {
    try {
      setFetchLoading(true);

      // First check if customer is active
      const customerStatusResponse = await fetch(`/api/customers/edit?id=${cid}`);
      if (customerStatusResponse.ok) {
        const customerStatusData = await customerStatusResponse.json();
        const customer = customerStatusData.data?.customer || customerStatusData;

        // Check if customer is disabled
        if (customer.status === 0 || customer.status === '0' || customer.status === 'Disable') {
          setIsCustomerDisabled(true);
          setFetchLoading(false);
          alert('❌ Your account is disabled. Please contact administrator to enable your account before creating filling requests.');
          router.push('/cst/cstdashboard');
          return;
        }
        setIsCustomerDisabled(false);
      }

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

    if (!formData.qty) {
      newErrors.qty = 'Quantity is required';
    }

    // Additional validation for selected product
    if (selectedProduct) {
      const quantityLiters = parseInt(formData.qty) || 0;
      const quantityBuckets = parseInt(formData.aty) || 0;

      if (selectedProduct.type === 'bucket') {
        if (quantityBuckets < (selectedProduct.min || 1)) {
          const unit = (selectedProduct.min || 1) === 1 ? 'bucket' : 'buckets';
          newErrors.qty = `Minimum quantity for this product is ${selectedProduct.min} ${unit}`;
        }
      } else {
        if (quantityLiters < (selectedProduct.min || 1)) {
          const unit = (selectedProduct.min || 1) === 1 ? 'liter' : 'liters';
          newErrors.qty = `Minimum quantity for this product is ${selectedProduct.min} ${unit}`;
        }

        if (selectedProduct.maxQuantity && selectedProduct.type !== 'bucket' && quantityLiters > selectedProduct.maxQuantity) {
          const maxUnit = selectedProduct.maxQuantity === 1 ? 'liter' : 'liters';
          newErrors.qty = `Maximum quantity for this product is ${selectedProduct.maxQuantity} ${maxUnit}`;
        }
      }
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

      if (product) {
        const productId = product.id || product.product_id;
        const productConfigData = productConfig[productId] || null;
        console.log('🎯 Product config for product_id', productId, ':', productConfigData);

        setSelectedProduct(prev => ({ ...prev, ...productConfigData, product_id: productId }));
        setMaxQuantity(productConfigData?.maxQuantity || 0);

        // Reset quantity fields when product changes
        setFormData(prev => ({
          ...prev,
          qty: '',
          aty: '',
          products_codes: ''
        }));
        setCalculatedBarrels(0);
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    let qty = formData.qty;
    let aty = formData.aty;

    if (selectedProduct?.type === 'bucket') {
      if (name === 'aty') {
        aty = value;
        qty = (parseInt(value) || 0) * selectedProduct.bucketSize;
      }
    } else {
      if (name === 'aty') {
        aty = value;
        qty = value;
      } else if (name === 'qty') {
        qty = value;
        aty = value;
      }
    }

    let nextValue = value;
    if (name === 'licence_plate') {
      nextValue = value.toUpperCase().replace(/\s+/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: nextValue,
      qty: qty,
      aty: aty
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }

    if (name === 'licence_plate') {
      fetchVehicles(nextValue)
    }

    // Removed full tank state toggling
  }

  // Removed handleFullTank

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!customerId) {
      alert('Customer information not loaded. Please refresh the page and try again.')
      return
    }

    // Check if customer is disabled before submission
    if (isCustomerDisabled) {
      alert('❌ Your account is disabled. Please contact administrator to enable your account.');
      return;
    }

    // STRICT Validation: Station and Product must be selected before submission
    if (!formData.station_id || formData.station_id === '') {
      setErrors(prev => ({ ...prev, station_id: 'Please select a filling station' }));
      alert('❌ Please select a Filling Station before submitting the request.');
      return;
    }

    if (!formData.product_id || formData.product_id === '') {
      setErrors(prev => ({ ...prev, product_id: 'Please select a product' }));
      alert('❌ Please select a Product before submitting the request.');
      return;
    }

    // ✅ Validate sub-product selection
    if (!selectedSubProductId || selectedSubProductId === '') {
      setErrors(prev => ({ ...prev, sub_product_id: 'Please select a product code (sub-product)' }));
      alert('❌ Please select a Product Code (Sub-Product) before submitting the request.');
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    // STRICT Vehicle Number Validation - NO SPACES ALLOWED
    if (formData.licence_plate.includes(' ')) {
      alert('❌ Spaces are not allowed in Vehicle Number! Please remove spaces.');
      return;
    }

    if (formData.licence_plate.length < 3) {
      alert('Please enter a valid vehicle number (minimum 3 characters).');
      return;
    }

    // STRICT Driver Number Validation - NO SPACES ALLOWED
    if (formData.phone.includes(' ')) {
      alert('❌ Spaces are not allowed in Phone Number! Please remove spaces.');
      return;
    }

    // ✅ Enhanced Eligibility pre-check with detailed feedback
    setCheckingEligibility(true);
    try {
      const eligibilityResponse = await fetch('/api/cst/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId })
      });

      if (eligibilityResponse.ok) {
        const eligibility = await eligibilityResponse.json();

        if (eligibility.success && !eligibility.isEligible) {
          const msg = eligibility.reason || 'You are not eligible to create a request right now.';

          // Show detailed alert with payment information
          let alertMsg = `❌ ${msg}`;

          if (eligibility.pendingDays && eligibility.dayLimit) {
            alertMsg += `\n\nPending Days: ${eligibility.pendingDays}/${eligibility.dayLimit}`;
          }

          if (eligibility.creditUsed && eligibility.creditLimit) {
            alertMsg += `\nCredit Used: ₹${eligibility.creditUsed.toFixed(2)} of ₹${eligibility.creditLimit.toFixed(2)}`;
          }

          alert(alertMsg);
          setCheckingEligibility(false);
          return;
        }
      } else {
        console.warn('Eligibility API returned non-OK status:', eligibilityResponse.status);
      }
    } catch (eligError) {
      console.warn('Eligibility check failed:', eligError);
    } finally {
      setCheckingEligibility(false);
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
        sub_product_id: selectedSubProductId,
        station_id: formData.station_id,
        licence_plate: formData.licence_plate,
        phone: formData.phone,
        request_type: 'Liter',
        qty: formData.qty || '0',
        remarks: formData.remarks,
        customer_id: customerId
      }

      console.log('📤 Sending to API:', {
        url: '/api/cst/filling-requests/create-requests',
        data: requestData
      });

      // Create new request
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

      // Handle customer disabled error
      if (!response.ok && result.message && result.message.includes('disabled')) {
        alert(`❌ ${result.message}`);
        setLoading(false);
        return;
      }

      // Handle day limit error
      if (!response.ok && result.message && (result.message.includes('day limit') || result.message.includes('Day limit'))) {
        alert(`❌ ${result.message}`);
        setLoading(false);
        // Refresh eligibility status
        checkEligibility();
        return;
      }

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
        // Refresh eligibility status after successful creation
        checkEligibility();
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
    setFormData({
      licence_plate: '',
      phone: '',
      product_id: '',
      station_id: '',
      qty: '',
      aty: '',
      remarks: '',
      products_codes: ''
    })
    setSelectedProduct(null)
    setVehicles([])
    setErrors({})
    setPriceDetails({ price: 0, totalAmount: 0 })
    setCalculatedBarrels(0)
    setMaxQuantity(0)
    setSelectedSubProductId('')
    setProductCodes([])
  }

  // ================ CONDITIONAL RENDERING ================

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
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

  if (isCustomerDisabled) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <CstHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Disabled</h2>
              <p className="text-gray-600 mb-6">
                Your account has been disabled. Please contact the administrator to enable your account before creating filling requests.
              </p>
              <button
                onClick={() => router.push('/cst/cstdashboard')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // ================ MAIN JSX RENDER ================

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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {customerData && (
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-3">Customer Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-600 mr-2">Name:</span>
                        <span className="text-gray-900">{customerData.name}</span>
                      </div>
                      {customerData.blocklocation && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-600 mr-2">Assigned Stations:</span>
                          <span className="text-gray-900">{customerData.blocklocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Day Limit Status Card */}
                {dayLimitStatus && dayLimitStatus.dayLimit > 0 && (
                  <div className={`rounded-xl p-5 shadow-sm border ${dayLimitStatus.isEligible === false
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                    }`}>
                    <div className="flex items-center mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${dayLimitStatus.isEligible === false
                        ? 'bg-red-100 text-red-600'
                        : 'bg-blue-100 text-blue-600'
                        }`}>
                        {dayLimitStatus.isEligible === false ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-700">Day Limit Status</h3>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Allowed Days:</span>
                        <span className="font-semibold">{dayLimitStatus.dayLimit} days</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Pending Days:</span>
                        <span className={`font-semibold ${dayLimitStatus.pendingDays >= dayLimitStatus.dayLimit
                          ? 'text-red-600'
                          : 'text-green-600'
                          }`}>
                          {dayLimitStatus.pendingDays} days
                        </span>
                      </div>

                      {dayLimitStatus.isEligible === false && dayLimitStatus.reason && (
                        <div className="mt-3 p-3 bg-red-100 rounded-lg">
                          <p className="text-sm text-red-700">{dayLimitStatus.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-white">New Filling Request</h2>
                    <p className="text-blue-100 text-sm mt-1">Fill in the details below to create a new request</p>
                  </div>
                  {checkingEligibility && (
                    <div className="flex items-center text-white text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Checking eligibility...
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Eligibility Warning */}
                  {dayLimitStatus && dayLimitStatus.isEligible === false && (
                    <div className="p-4 bg-red-50 border border-red-300 rounded-xl">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-semibold text-red-700">Cannot Create Request</p>
                          <p className="text-sm text-red-600 mt-1">{dayLimitStatus.reason}</p>
                          <button
                            type="button"
                            onClick={() => router.push('/cst/payments')}
                            className="mt-3 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Go to Payments
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
                        disabled={dayLimitStatus?.isEligible === false}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.licence_plate ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          } ${dayLimitStatus?.isEligible === false ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                  licence_plate: (vehicle.licence_plate || vehicle.vehicle_number || '').toUpperCase().replace(/\s+/g, ''),
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
                        disabled={dayLimitStatus?.isEligible === false}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          } ${dayLimitStatus?.isEligible === false ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          disabled={dayLimitStatus?.isEligible === false}
                          required
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white ${errors.product_id ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            } ${dayLimitStatus?.isEligible === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="">Select Product</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.product_name || product.pname}
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

                      {/* Sub-Product Selection */}
                      {formData.product_id && (
                        <div className="mt-4">
                          <label htmlFor="sub_product_id" className="block text-sm font-semibold text-gray-700 mb-2">
                            Select Product Code (Sub-Product) *
                            {filterType && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                {filterType}
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <select
                              id="sub_product_id"
                              name="sub_product_id"
                              value={selectedSubProductId}
                              disabled={true}
                              required={!!formData.product_id}
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white ${'border-gray-200 bg-gray-50 cursor-not-allowed'
                                } ${errors.sub_product_id ? 'border-red-500 bg-red-50' : ''
                                }`}
                            >
                              {loadingSubProducts ? (
                                <option value="">Loading sub-products...</option>
                              ) : productCodes.length === 0 ? (
                                <option value="">No sub-products available</option>
                              ) : (
                                <>
                                  <option value="">Select Product Code</option>
                                  {productCodes.map(code => (
                                    <option key={code.id} value={code.id}>
                                      {code.pcode} — {code.product_name || 'N/A'}
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                              {loadingSubProducts ? (
                                <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </div>
                          </div>
                          {selectedSubProductId && productCodes.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                              Selected: {productCodes.find(c => String(c.id) === String(selectedSubProductId))?.pcode || 'N/A'} — {productCodes.find(c => String(c.id) === String(selectedSubProductId))?.product_name || 'N/A'}
                            </div>
                          )}
                          {errors.sub_product_id && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              {errors.sub_product_id}
                            </p>
                          )}
                        </div>
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
                          disabled={dayLimitStatus?.isEligible === false}
                          required
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white ${errors.station_id ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            } ${dayLimitStatus?.isEligible === false ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                  {/* Quantity Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quantity Input */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="aty" className="block text-sm font-semibold text-gray-700">
                          {selectedProduct
                            ? selectedProduct.type === "bucket"
                              ? `No. of Buckets (Min ${selectedProduct.min}) *`
                              : `Liters (Min ${selectedProduct.min}) *`
                            : "Enter Quantity *"}
                        </label>
                        {/* Full Tank shortcut removed */}
                      </div>
                      <input
                        type="number"
                        id="aty"
                        name="aty"
                        value={formData.aty}
                        onChange={handleInputChange}
                        disabled={dayLimitStatus?.isEligible === false}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.qty ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          } ${dayLimitStatus?.isEligible === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder={selectedProduct
                          ? selectedProduct.type === "bucket"
                            ? "Enter number of buckets"
                            : "Enter liters"
                          : "Enter quantity"}
                        min={selectedProduct?.min || 1}
                        required
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

                    {/* Total Calculation */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {selectedProduct?.barrelSize ? "Total Barrels" : "Total Liters"}
                      </label>
                      <input
                        type="text"
                        value={
                          selectedProduct?.barrelSize
                            ? `${calculatedBarrels} Barrel${calculatedBarrels > 1 ? "s" : ""} (${formData.qty}L)`
                            : `${formData.qty} Liters`
                        }
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 text-center font-medium cursor-not-allowed opacity-70"
                        disabled
                        placeholder="Auto-calculated"
                      />
                      {selectedProduct?.barrelSize && (
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          Each barrel holds 200L
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price Information */}
                  {priceDetails.price > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Price per Liter</p>
                          <p className="text-xl font-bold text-blue-700">₹{priceDetails.price.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Quantity</p>
                          <p className="text-xl font-bold text-gray-800">{formData.qty || 0} Ltr</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-xl font-bold text-green-700">₹{priceDetails.totalAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Removed Full Tank Message */}

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
                      disabled={dayLimitStatus?.isEligible === false}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 resize-none border-gray-300 ${dayLimitStatus?.isEligible === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder="Add any remarks (optional)"
                      rows="4"
                    />
                    {/* Removed Full Tank helper */}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={loading || !customerId || dayLimitStatus?.isEligible === false || checkingEligibility}
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
                      disabled={dayLimitStatus?.isEligible === false}
                      className="px-8 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50 font-semibold transition-all duration-200 shadow-sm hover:shadow-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <h3 className="font-semibold text-blue-900 mb-2">About Day Limit</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Day limit means you can have unpaid transactions for a certain number of days</li>
                    <li>• Example: If your day limit is 2, you can have unpaid transactions for 2 days</li>
                    <li>• Once you reach the limit, you must clear the oldest day's payment</li>
                    <li>• Each day is counted based on transaction completion date</li>
                    <li>• Multiple transactions on the same day count as 1 day</li>
                    <li>• Clear your pending payments to continue creating requests</li>
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
