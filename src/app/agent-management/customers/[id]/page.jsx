"use client";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, use } from 'react';
import { useSession } from "@/context/SessionContext";
import { 
  ChevronLeft, 
  Save, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Package, 
  IndianRupee,
  Activity,
  UserCheck,
  CheckCircle2,
  X,
  Plus,
  ArrowRight,
  Info
} from "lucide-react";

export default function AgentAllocation({ params }) {
    const { id: agentId } = use(params);
    const router = useRouter();
    const { user, loading: authLoading } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
    
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [assignments, setAssignments] = useState({}); // Map: customerId -> { selected, rates: { productId -> rate } }
    const [expandedCustomer, setExpandedCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchData();
    }, [agentId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/agent-management/allocate?agentId=${agentId}`);
            if (response.ok) {
                const data = await response.json();
                
                const rawCustomers = data.customers || [];
                const uniqueCustomers = Array.from(new Map(rawCustomers.map(item => [item.id, item])).values());
                setCustomers(uniqueCustomers);
                setProducts(data.products || []);
                
                const initialAssignments = {};
                (data.customers || []).forEach(c => {
                    initialAssignments[c.id] = { selected: false, rates: {} };
                });

                (data.commissions || []).forEach(comm => {
                    if (!initialAssignments[comm.customer_id]) {
                        initialAssignments[comm.customer_id] = { selected: true, rates: {} };
                    }
                    initialAssignments[comm.customer_id].selected = true;
                    initialAssignments[comm.customer_id].rates[comm.product_code_id] = comm.commission_rate;
                });
                
                setAssignments(initialAssignments);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerToggle = (customerId) => {
        setAssignments(prev => ({
            ...prev,
            [customerId]: {
                ...prev[customerId],
                selected: !prev[customerId].selected
            }
        }));
        if (!assignments[customerId].selected) {
             setExpandedCustomer(customerId);
        }
    };

    const handleRateChange = (customerId, codeId, value) => {
        setAssignments(prev => ({
            ...prev,
            [customerId]: {
                ...prev[customerId],
                rates: {
                    ...prev[customerId].rates,
                    [codeId]: value
                }
            }
        }));
    };

    const handleSave = async () => {
        if (!user || (userPermissions.can_edit !== true && Number(user.role) !== 5)) {
            alert("Access Denied: You do not have permission to modify allocations.");
            return;
        }
        setSaving(true);
        try {
            const fullPayload = {
                agentId,
                assignments: Object.entries(assignments).map(([customerId, data]) => {
                    const productRates = [];
                    products.forEach(p => {
                        (p.codes || []).forEach(code => {
                            const rateValue = data.rates[code.id];
                            if (rateValue !== undefined && rateValue !== null && rateValue !== '') {
                                productRates.push({
                                    productId: p.id,
                                    codeId: code.id,
                                    rate: parseFloat(rateValue) || 0
                                });
                            }
                        });
                    });

                    return {
                        customerId,
                        selected: data.selected,
                        products: productRates
                    };
                })
            };

            const response = await fetch('/api/agent-management/allocate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullPayload)
            });

            if (response.ok) {
                alert("Allocations updated successfully!");
                router.push('/agent-management');
            } else {
                alert("Failed to save changes.");
            }
        } catch (error) {
            alert("Network error.");
        } finally {
            setSaving(false);
        }
    };

    const toggleExpand = (customerId) => {
        setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (c.phone && c.phone.includes(searchTerm))
        );
    }, [customers, searchTerm]);

    const activeCount = Object.values(assignments).filter(a => a.selected).length;

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium italic">Preparing allocation catalog...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50/50 overflow-hidden">
            <div className="hidden md:block w-64 flex-shrink-0">
                 <Sidebar />
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                
                <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-none animate-fade-in relative">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => router.back()}
                                className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-100 transition"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Customer Allocation</h1>
                              <p className="text-sm text-gray-500 font-medium">Link customers and define commission structures.</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                           <div className="hidden sm:flex bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm items-center gap-2">
                              <UserCheck className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs font-black text-gray-900">{activeCount} ALLOCATED</span>
                           </div>
                           <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 disabled:opacity-50"
                            >
                                {saving ? (
                                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <Save className="w-5 h-5" /> Commit Changes
                                  </>
                                )}
                            </button>
                        </div>
                    </div>

                    {(userPermissions.can_edit !== true && Number(user?.role) !== 5) && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl flex items-center gap-3">
                           <X className="w-5 h-5" />
                           <p className="font-bold text-sm">VIEW ONLY MODE: You do not have permission to modify these allocations.</p>
                        </div>
                    )}

                    {/* Search & Stats Card */}
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-5">
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                              type="text"
                              placeholder="Search for customers by name or contact..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition text-sm font-medium"
                          />
                       </div>
                    </div>

                    {/* Customer List Section */}
                    <div className="space-y-4 pb-20">
                      {filteredCustomers.length === 0 ? (
                          <div className="bg-white rounded-3xl p-20 text-center border border-gray-100 shadow-sm">
                              <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                              <p className="text-gray-400 font-medium italic">No matching customers found in your scope.</p>
                              <button onClick={() => setSearchTerm("")} className="text-blue-600 font-bold mt-4 hover:underline text-sm">Clear Filter</button>
                          </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {filteredCustomers.map((customer, idx) => {
                              const isAssigned = assignments[customer.id]?.selected;
                              const isExpanded = expandedCustomer === customer.id;

                              return (
                                  <div key={`${customer.id}-${idx}`} className={`rounded-xl border transition-all ${isAssigned ? 'border-blue-500/30 bg-blue-50/20 shadow-sm' : 'border-gray-100 bg-white shadow-sm hover:border-blue-200'}`}>
                                      <div className="flex items-center justify-between py-1.5 px-3">
                                          <div className="flex items-center gap-3">
                                              <button 
                                                onClick={() => handleCustomerToggle(customer.id)}
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isAssigned ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                              >
                                                <CheckCircle2 className="w-4 h-4" />
                                              </button>
                                              
                                              <div className="flex items-center gap-3">
                                                  <h3 className={`font-black tracking-tight transition-colors ${isAssigned ? 'text-blue-900' : 'text-gray-900'} text-[13px] uppercase`}>{customer.name}</h3>
                                                  
                                                  {customer.assigned_agent_id && String(customer.assigned_agent_id) !== String(agentId) && (
                                                      <span className="bg-orange-50 text-orange-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-orange-100 uppercase tracking-tighter">
                                                          CONFLICT: {customer.assigned_agent_name}
                                                      </span>
                                                  )}
                                                  
                                                  <div className="flex items-center gap-2 border-l border-gray-200 ml-1 pl-3">
                                                     <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                        <Activity className="w-3 h-3 opacity-50" /> {customer.client_type || 'STD'}
                                                     </p>
                                                     <p className="text-[10px] font-mono font-bold text-gray-400">{customer.phone}</p>
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          {isAssigned && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-100/50 px-2 py-0.5 rounded-md">Configured</span>
                                                <button 
                                                    onClick={() => toggleExpand(customer.id)}
                                                    className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-50 text-blue-600 hover:bg-blue-100'}`}
                                                >
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                              </div>
                                          )}
                                      </div>


                                      {isAssigned && isExpanded && (
                                          <div className="p-4 border-t border-blue-100 bg-white/50 backdrop-blur-md rounded-b-[18px] animate-slide-up space-y-4">
                                              <div className="flex items-center gap-2 text-blue-800 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                                 <Info className="w-4 h-4 flex-shrink-0" />
                                                 <p className="text-[10px] font-semibold">Define specific commission rates (₹/Unit) for each product code.</p>
                                              </div>

                                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                  {products.map(product => (
                                                      <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                                          <div className="flex items-center gap-3 border-b border-gray-50 pb-2">
                                                             <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                                                                <Package className="w-3.5 h-3.5" />
                                                             </div>
                                                             <h5 className="text-[11px] font-black text-gray-800 uppercase tracking-tight">{product.pname}</h5>
                                                          </div>
                                                          
                                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                              {(product.codes || []).map(code => (
                                                                  <div key={code.id} className="space-y-1">
                                                                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{code.pcode}</label>
                                                                      <div className="relative group">
                                                                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-500 group-focus-within:text-blue-600 transition" />
                                                                          <input
                                                                              type="number"
                                                                              step="0.01"
                                                                              min="0"
                                                                              value={assignments[customer.id]?.rates[code.id] || ''}
                                                                              onChange={(e) => handleRateChange(customer.id, code.id, e.target.value)}
                                                                              className="w-full pl-8 pr-2 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition text-[13px] font-mono font-bold text-gray-800"
                                                                              placeholder="0.00"
                                                                          />
                                                                      </div>
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                        </div>
                      )}
                    </div>
                </main>
            </div>
        </div>
    );
}
