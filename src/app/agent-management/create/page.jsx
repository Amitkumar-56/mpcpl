"use client";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  UserPlus, 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Building2, 
  Lock, 
  ShieldCheck, 
  Users, 
  ArrowRight,
  Plus,
  Info,
  Banknote,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function CreateAgent() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    aadharNumber: "",
    panNumber: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [commissionRates, setCommissionRates] = useState({}); // {customerId: {productId: rate}}
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [customersRes, productsRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products')
        ]);
        
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          let customersList = Array.isArray(customersData) ? customersData : (customersData.customers || []);
          setCustomers(customersList.filter(c => !c.roleid || Number(c.roleid) === 1 || Number(c.roleid) === 3));
        }
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(Array.isArray(productsData) ? productsData : (productsData.products || []));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleCustomerToggle = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        const newRates = { ...commissionRates };
        delete newRates[customerId];
        setCommissionRates(newRates);
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const handleCommissionRateChange = (customerId, productId, rate) => {
    setCommissionRates(prev => ({
      ...prev,
      [customerId]: {
        ...(prev[customerId] || {}),
        [productId]: parseFloat(rate) || 0
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const required = ["firstName", "lastName", "email", "phone", "address", "aadharNumber", "panNumber", "bankName", "accountNumber", "ifscCode", "password"];
    
    required.forEach(field => {
      if (!formData[field]?.trim()) newErrors[field] = "Required";
    });

    if (formData.password?.length < 6) newErrors.password = "Min 6 chars";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Mismatch";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const { confirmPassword, ...submitData } = formData;
      submitData.customers = selectedCustomers;
      submitData.commissionRates = commissionRates;

      const response = await fetch("/api/agent-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        alert("Agent created successfully!");
        router.push("/agent-management");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create agent");
      }
    } catch (error) {
      alert("Network error creating agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50/50 overflow-hidden">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-none animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <button
                  onClick={() => router.back()}
                  className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-100 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Create Agent</h1>
                  <p className="text-sm text-gray-500 font-medium">Onboard a new agent to the MPCL ecosystem.</p>
                </div>
            </div>
            <Link href="/agent-management" className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition mt-2">
              <Users className="w-4 h-4" /> Agent Directory
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="max-w-5xl space-y-8 pb-20">
            {/* Step 1: Profile */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Personal Information</h3>
              </div>
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">First Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                    <input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${errors.firstName ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'} rounded-2xl outline-none transition text-sm font-medium`}
                      placeholder="Enter first name"
                    />
                  </div>
                </div>
                {/* Last Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Last Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                    <input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${errors.lastName ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'} rounded-2xl outline-none transition text-sm font-medium`}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                {/* Email Address */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${errors.email ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'} rounded-2xl outline-none transition text-sm font-medium`}
                      placeholder="agent@example.com"
                    />
                  </div>
                </div>
                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${errors.phone ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'} rounded-2xl outline-none transition text-sm font-medium`}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
                {/* Address - Full width */}
                <div className="md:col-span-2 space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Permanent Address</label>
                   <div className="relative group">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                    <textarea
                      name="address"
                      rows="3"
                      value={formData.address}
                      onChange={handleChange}
                      className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${errors.address ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'} rounded-2xl outline-none transition text-sm font-medium resize-none`}
                      placeholder="Enter full residential address..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: KYC & Bank */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">KYC Documents</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Aadhar Number</label>
                       <input
                          name="aadharNumber"
                          value={formData.aadharNumber}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 bg-gray-50 border ${errors.aadharNumber ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'} rounded-2xl outline-none transition text-sm font-mono`}
                          placeholder="XXXX XXXX XXXX"
                          maxLength="12"
                        />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">PAN Card Number</label>
                       <input
                          name="panNumber"
                          value={formData.panNumber}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 bg-gray-50 border ${errors.panNumber ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'} rounded-2xl outline-none transition text-sm font-mono uppercase`}
                          placeholder="ABCDE1234F"
                          maxLength="10"
                        />
                    </div>
                  </div>
               </div>

               <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Settlement Details</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Bank Name</label>
                       <input
                          name="bankName"
                          value={formData.bankName}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 bg-gray-50 border ${errors.bankName ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'} rounded-2xl outline-none transition text-sm font-medium`}
                          placeholder="State Bank of India"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Account No.</label>
                          <input
                              name="accountNumber"
                              value={formData.accountNumber}
                              onChange={handleChange}
                              className={`w-full px-4 py-3 bg-gray-50 border ${errors.accountNumber ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'} rounded-2xl outline-none transition text-sm font-mono`}
                              placeholder="0000000000"
                            />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">IFSC Code</label>
                          <input
                              name="ifscCode"
                              value={formData.ifscCode}
                              onChange={handleChange}
                              className={`w-full px-4 py-3 bg-gray-50 border ${errors.ifscCode ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'} rounded-2xl outline-none transition text-sm font-mono uppercase`}
                              placeholder="SBIN0001234"
                            />
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Step 3: Allocation Control */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Customer Allocation & Commission</h3>
                 </div>
                 {selectedCustomers.length > 0 && (
                   <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{selectedCustomers.length} SELECTED</span>
                 )}
               </div>
               
               <div className="p-6 md:p-8 space-y-8">
                  {loadingData ? (
                    <div className="py-20 text-center">
                       <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                       <p className="text-gray-400 font-medium italic">Synchronizing customers and product catalog...</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customers.map(customer => {
                          const isSelected = selectedCustomers.includes(customer.id);
                          return (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleCustomerToggle(customer.id)}
                              className={`p-4 rounded-2xl border-2 text-left transition relative overflow-hidden group ${
                                isSelected 
                                ? 'bg-purple-50 border-purple-200 shadow-md shadow-purple-50' 
                                : 'bg-white border-gray-100 hover:border-purple-100 shadow-sm'
                              }`}
                            >
                              {isSelected && <div className="absolute top-0 right-0 p-2"><CheckCircle2 className="w-4 h-4 text-purple-600" /></div>}
                              <p className={`font-bold text-sm ${isSelected ? 'text-purple-900' : 'text-gray-800'}`}>{customer.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Phone className="w-2.5 h-2.5 text-gray-400" />
                                <span className="text-[10px] text-gray-500 font-medium">{customer.phone || 'Phone N/A'}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedCustomers.length > 0 && (
                         <div className="space-y-6 animate-slide-up">
                            <div className="flex items-center gap-2 text-purple-800 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                               <Info className="w-5 h-5 flex-shrink-0" />
                               <p className="text-xs font-semibold">Define commission rates per liter (₹/L) for each assigned customer.</p>
                            </div>
                            
                            <div className="space-y-4">
                               {selectedCustomers.map(cid => {
                                 const customer = customers.find(c => c.id === cid);
                                 return (
                                   <div key={cid} className="bg-gray-50/50 rounded-2xl border border-gray-200 p-6 space-y-4">
                                      <div className="flex items-center gap-2 mb-2">
                                         <div className="w-2 h-6 bg-purple-600 rounded-full"></div>
                                         <h4 className="font-black text-gray-900">{customer?.name}</h4>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                         {products.map(product => (
                                           <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm group hover:border-purple-200 transition">
                                              <p className="text-[10px] uppercase font-black text-gray-400 mb-2 truncate" title={product.pname}>{product.pname}</p>
                                              <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 font-bold" />
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition text-sm font-mono font-bold"
                                                  placeholder="0.00"
                                                  value={commissionRates[cid]?.[product.id] || ''}
                                                  onChange={(e) => handleCommissionRateChange(cid, product.id, e.target.value)}
                                                />
                                              </div>
                                           </div>
                                         ))}
                                      </div>
                                   </div>
                                 );
                               })}
                            </div>
                         </div>
                      )}
                    </>
                  )}
               </div>
            </div>

            {/* Step 4: Security */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                 <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Access Security</h3>
               </div>
               <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Account Password</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 bg-gray-50 border ${errors.password ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'} rounded-2xl outline-none transition text-sm font-medium`}
                        placeholder="••••••••"
                      />
                      {errors.password && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm Identity</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 bg-gray-50 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'} rounded-2xl outline-none transition text-sm font-medium`}
                        placeholder="••••••••"
                      />
                      {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.confirmPassword}</p>}
                  </div>
               </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-gray-200">
               <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto px-8 py-3 text-sm font-extrabold text-gray-500 hover:text-gray-900 transition"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition shadow-xl shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Finalize & Create Agent <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
            </div>
          </form>
        </main>

        <Footer />
      </div>
    </div>
  );
}