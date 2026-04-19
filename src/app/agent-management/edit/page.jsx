"use client";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useSession } from "@/context/SessionContext";
import { 
  UserEdit, 
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
  Info,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Activity,
  UserCheck,
  UserX
} from "lucide-react";

function EditAgentContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('id');
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [userPermissions, setUserPermissions] = useState({});

  useEffect(() => {
    const checkPerms = async () => {
      if (authLoading || !user) return;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/check-permissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token?.trim()}`,
          },
          credentials: 'include',
          body: JSON.stringify({ 
            module_name: "Agent Management",
            user_id: user.id,
            user_role: user.role 
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setUserPermissions(data.permissions || {});
          if (data.permissions?.can_view !== true && Number(user.role) !== 5) {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    };
    checkPerms();
  }, [user, authLoading]);
  
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
    confirmPassword: "",
    status: 1
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [commissionRates, setCommissionRates] = useState({});
  const [agentData, setAgentData] = useState(null);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(false);

  useEffect(() => {
    if (!agentId) {
      router.push("/agent-management");
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [agentRes, customersRes, productsRes] = await Promise.all([
          fetch(`/api/agent-management?id=${agentId}`),
          fetch('/api/customers'),
          fetch('/api/products')
        ]);
        
        if (agentRes.ok) {
          const resData = await agentRes.json();
          const agent = Array.isArray(resData) ? resData[0] : (resData.agent || resData);
          
          if (agent) {
            setAgentData(agent);
            setFormData({
              firstName: agent.first_name || "",
              lastName: agent.last_name || "",
              email: agent.email || "",
              phone: agent.phone || "",
              address: agent.address || "",
              aadharNumber: agent.aadhar_number || "",
              panNumber: agent.pan_number || "",
              bankName: agent.bank_name || "",
              accountNumber: agent.account_number || "",
              ifscCode: agent.ifsc_code || "",
              password: "",
              confirmPassword: "",
              status: agent.status || 0
            });
            
            const assignedRes = await fetch(`/api/agent-management/customers?id=${agentId}`);
            if (assignedRes.ok) {
              const assignedData = await assignedRes.json();
              setSelectedCustomers((assignedData.customers || []).map(c => c.customer_id || c.id));
              setCommissionRates(assignedData.commissionRates || {});
            }
            fetchCommissionHistory();
          } else {
             router.push("/agent-management");
          }
        }
        
        if (customersRes.ok) {
          const cData = await customersRes.json();
          const cList = Array.isArray(cData) ? cData : (cData.customers || []);
          setCustomers(cList.filter(c => !c.roleid || [1, 3].includes(Number(c.roleid))));
        }
        
        if (productsRes.ok) {
          const pData = await productsRes.json();
          setProducts(Array.isArray(pData) ? pData : (pData.products || []));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchData();
  }, [agentId]);

  const fetchCommissionHistory = async () => {
    try {
      setCommissionLoading(true);
      const res = await fetch(`/api/agent/commission-history?agentId=${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setCommissionHistory(data.history || []);
      }
    } catch (error) {
       console.error(error);
    } finally {
      setCommissionLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleCustomerToggle = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        const nr = { ...commissionRates };
        delete nr[customerId];
        setCommissionRates(nr);
        return prev.filter(id => id !== customerId);
      }
      return [...prev, customerId];
    });
  };

  const handleCommissionRateChange = (customerId, productId, rate) => {
    setCommissionRates(prev => ({
      ...prev,
      [customerId]: { ...(prev[customerId] || {}), [productId]: parseFloat(rate) || 0 }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    ["firstName", "lastName", "email", "phone", "address", "aadharNumber", "panNumber", "bankName", "accountNumber", "ifscCode"].forEach(f => {
      if (!formData[f]?.trim()) newErrors[f] = "Required";
    });
    if (formData.password && formData.password.length < 6) newErrors.password = "Min 6 chars";
    if (formData.password && formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Mismatch";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || (userPermissions.can_edit !== true && Number(user.role) !== 5)) {
        alert("Access Denied: You do not have permission to modify agent profiles.");
        return;
    }
    if (!validateForm()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const { confirmPassword, ...submitData } = formData;
      if (!submitData.password) delete submitData.password;
      submitData.id = agentId;
      submitData.customers = selectedCustomers;
      submitData.commissionRates = commissionRates;

      const response = await fetch("/api/agent-management", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        alert("Agent updated successfully!");
        router.push("/agent-management");
      } else {
        const data = await response.json();
        alert(data.error || "Update failed");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium italic">Retreiving agent profile...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <button
                  onClick={() => router.back()}
                  className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-100 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Edit Agent</h1>
                  <p className="text-sm text-gray-500 font-medium">Modifying profile for <span className="text-blue-600 font-bold">{formData.firstName} {formData.lastName}</span></p>
                </div>
            </div>
            
            <div className="flex items-center bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({...p, status: 1}))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${formData.status === 1 || formData.status === true ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <UserCheck className="w-4 h-4" /> ACTIVE
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({...p, status: 0}))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${formData.status === 0 || formData.status === false ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <UserX className="w-4 h-4" /> INACTIVE
                </button>
            </div>
          </div>

          {(userPermissions.can_edit !== true && Number(user?.role) !== 5) && (
              <div className="max-w-5xl bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl flex items-center gap-3 mb-8">
                 <XCircle className="w-5 h-5" />
                 <p className="font-bold text-sm tracking-tight px-1">VIEW ONLY MODE: You do not have permission to save changes to this profile.</p>
              </div>
          )}

          <form onSubmit={handleSubmit} className="max-w-5xl space-y-8 pb-20">
             {/* Section 1: Core Profile */}
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><User className="w-5 h-5" /></div>
                  <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Profile Overview</h3>
                </div>
                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">First Name</label>
                      <input name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full px-4 py-3 bg-gray-50 border rounded-2xl outline-none transition text-sm font-medium ${errors.firstName ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'}`} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Last Name</label>
                      <input name="lastName" value={formData.lastName} onChange={handleChange} className={`w-full px-4 py-3 bg-gray-50 border rounded-2xl outline-none transition text-sm font-medium ${errors.lastName ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'}`} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Official Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:border-blue-500 outline-none transition text-sm font-medium" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Registry Phone</label>
                      <div className="relative">
                         <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <input name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:border-blue-500 outline-none transition text-sm font-medium" />
                      </div>
                   </div>
                   <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Address</label>
                      <textarea name="address" rows="3" value={formData.address} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:border-blue-500 outline-none transition text-sm font-medium resize-none" />
                   </div>
                </div>
             </div>

             {/* Section 2: KYC & Banking */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
                      <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Identity Verification</h3>
                   </div>
                   <div className="p-6 space-y-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500 uppercase ml-1">Aadhar Number</label>
                         <input name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-mono tracking-widest" maxLength="12" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500 uppercase ml-1">PAN Account</label>
                         <input name="panNumber" value={formData.panNumber} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-mono uppercase tracking-widest" maxLength="10" />
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Building2 className="w-5 h-5" /></div>
                      <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Banking Details</h3>
                   </div>
                   <div className="p-6 space-y-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500 uppercase ml-1">Bank Name</label>
                         <input name="bankName" value={formData.bankName} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-medium" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">A/C Number</label>
                            <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-blue-500 text-xs font-mono" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">IFSC Code</label>
                            <input name="ifscCode" value={formData.ifscCode} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-blue-500 text-xs font-mono uppercase" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Section 3: Allocations */}
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Users className="w-5 h-5" /></div>
                      <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Customer Allocations</h3>
                   </div>
                   <div className="flex gap-2">
                      <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{selectedCustomers.length} ACTIVE</span>
                   </div>
                </div>
                <div className="p-6 md:p-8 space-y-8">
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {customers.map(c => {
                         const active = selectedCustomers.includes(c.id);
                         return (
                           <button key={c.id} type="button" onClick={() => handleCustomerToggle(c.id)} className={`p-4 rounded-2xl border-2 text-left transition select-none ${active ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100 hover:border-purple-100 opacity-60'}`}>
                              <p className={`font-black text-xs truncate ${active ? 'text-purple-900' : 'text-gray-400'}`}>{c.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-1">ID: {c.id}</p>
                           </button>
                         );
                      })}
                   </div>

                   {selectedCustomers.length > 0 && (
                      <div className="space-y-6 animate-slide-up">
                         {selectedCustomers.map(cid => {
                            const c = customers.find(x => x.id === cid);
                            return (
                               <div key={cid} className="bg-gray-50/50 border border-gray-200 rounded-2xl p-6">
                                  <h4 className="font-black text-xs text-gray-900 mb-4 flex items-center gap-2">
                                     <Activity className="w-3.5 h-3.5 text-purple-600" /> {c?.name}
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                     {products.map(p => (
                                       <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                          <p className="text-[9px] font-black text-gray-400 uppercase truncate mb-2">{p.pname}</p>
                                          <div className="relative">
                                             <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-500" />
                                             <input type="number" step="0.01" className="w-full pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg outline-none text-xs font-mono font-bold" value={commissionRates[cid]?.[p.id] || ''} onChange={(e) => handleCommissionRateChange(cid, p.id, e.target.value)} />
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   )}
                </div>
             </div>

             {/* Section 4: History */}
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                   <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clock className="w-5 h-5" /></div>
                   <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Recent Commissions</h3>
                </div>
                <div className="p-6 overflow-hidden">
                   {commissionLoading ? (
                      <div className="py-10 text-center text-gray-400 font-medium italic">Scanning ledger...</div>
                   ) : commissionHistory.length === 0 ? (
                      <div className="py-10 text-center text-gray-400 font-medium italic">No recorded commissions found.</div>
                   ) : (
                      <div className="overflow-x-auto rounded-2xl border border-gray-100">
                         <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-400 font-bold uppercase tracking-tighter">
                               <tr>
                                  <th className="px-4 py-3">Date</th>
                                  <th className="px-4 py-3">Client/Product</th>
                                  <th className="px-4 py-3 text-right">Qty</th>
                                  <th className="px-4 py-3 text-right">Commission</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                               {commissionHistory.slice(0, 5).map((h, i) => (
                                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                     <td className="px-4 py-3 text-gray-500 font-mono">{new Date(h.earned_at || h.completed_date).toLocaleDateString('en-IN')}</td>
                                     <td className="px-4 py-3">
                                        <p className="font-bold text-gray-900">{h.client_name}</p>
                                        <p className="text-[10px] text-blue-600 font-medium">{h.product_name}</p>
                                     </td>
                                     <td className="px-4 py-3 text-right font-mono text-gray-500">{parseFloat(h.quantity).toFixed(0)}L</td>
                                     <td className="px-4 py-3 text-right font-black text-emerald-600">₹{parseFloat(h.commission_amount).toFixed(2)}</td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   )}
                   <div className="mt-4 text-center">
                      <Link href={`/agent-management/${agentId}/commissions`} className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">View Detailed Ledger <ArrowRight className="w-3 h-3 inline ml-1" /></Link>
                   </div>
                </div>
             </div>

             {/* Section 5: Security */}
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                   <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Settings className="w-5 h-5" /></div>
                   <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Security Settings</h3>
                </div>
                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase ml-1">New Password <span className="text-[9px] lowercase italic font-normal text-gray-400">(leave blank to keep current)</span></label>
                       <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-blue-500 text-sm" placeholder="••••••••" />
                   </div>
                   <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirm Changes</label>
                       <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-blue-500 text-sm" placeholder="••••••••" />
                   </div>
                </div>
             </div>

             {/* Actions */}
             <div className="flex flex-col sm:flex-row items-center justify-end gap-4 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-gray-200">
               <button type="button" onClick={() => router.back()} className="w-full sm:w-auto px-8 py-3 text-sm font-extrabold text-gray-400 hover:text-gray-900 transition">Cancel Revision</button>
               <button type="submit" disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-3 px-12 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition shadow-xl shadow-blue-200 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Update Agent Profile <ArrowRight className="w-5 h-5" /></>}
               </button>
            </div>
          </form>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function EditAgent() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <EditAgentContent />
    </Suspense>
  );
}
