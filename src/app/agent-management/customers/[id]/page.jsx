"use client";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BiArrowBack, BiChevronDown, BiChevronUp, BiSave } from "react-icons/bi";

export default function AgentAllocation({ params }) {
    const { id: agentId } = params;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
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
            const response = await fetch(`/api/agent-management/allocate?agentId=${agentId}`);
            if (response.ok) {
                const data = await response.json();
                setCustomers(data.customers);
                setProducts(data.products);
                
                // Process existing commissions
                const initialAssignments = {};
                
                // Initialize for all customers first (unselected)
                data.customers.forEach(c => {
                    initialAssignments[c.id] = { selected: false, rates: {} };
                });

                // Apply existing
                data.commissions.forEach(comm => {
                    if (!initialAssignments[comm.customer_id]) {
                        initialAssignments[comm.customer_id] = { selected: true, rates: {} };
                    }
                    initialAssignments[comm.customer_id].selected = true;
                    // Use product_code_id as key for rates
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
        // Auto expand if selected
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
        setSaving(true);
        try {
            const fullPayload = {
                agentId,
                assignments: Object.entries(assignments).map(([customerId, data]) => {
                    // Map rates back to product structure
                    // We need to find which product ID belongs to which code ID
                    // Iterate through all products and their codes
                    const productRates = [];
                    
                    products.forEach(p => {
                        p.codes.forEach(code => {
                            if (data.rates[code.id]) {
                                productRates.push({
                                    productId: p.id,
                                    codeId: code.id,
                                    rate: data.rates[code.id]
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
                alert("Allocations saved successfully!");
                router.push('/agent-management');
            } else {
                alert("Failed to save allocations.");
            }
        } catch (error) {
            console.error("Error saving:", error);
            alert("Error saving allocations.");
        } finally {
            setSaving(false);
        }
    };

    const toggleExpand = (customerId) => {
        setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
    };

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.phone && c.phone.includes(searchTerm))
    );

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <div className="hidden md:block w-64 flex-shrink-0">
                 <Sidebar />
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                
                <main className="flex-1 p-6 overflow-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => router.back()}
                                className="p-2 rounded-full hover:bg-gray-200"
                            >
                                <BiArrowBack className="text-xl" />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-800">Allocate Customers & Commissions</h1>
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <BiSave />
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-4">
                            {filteredCustomers.map(customer => {
                                const isAssigned = assignments[customer.id]?.selected;
                                const isExpanded = expandedCustomer === customer.id;

                                return (
                                    <div key={customer.id} className={`border rounded-lg ${isAssigned ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                                        <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isAssigned}
                                                    onChange={() => handleCustomerToggle(customer.id)}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                                                        {customer.assigned_agent_id && String(customer.assigned_agent_id) !== String(agentId) && (
                                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded border border-yellow-200">
                                                                Assigned to: {customer.assigned_agent_name} {customer.assigned_agent_last_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">{customer.client_type} • {customer.phone}</p>
                                                </div>
                                            </div>
                                            
                                            {isAssigned && (
                                                <button 
                                                    onClick={() => toggleExpand(customer.id)}
                                                    className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                                                >
                                                    {isExpanded ? <BiChevronUp size={24} /> : <BiChevronDown size={24} />}
                                                </button>
                                            )}
                                        </div>

                                        {isAssigned && isExpanded && (
                                            <div className="p-4 border-t border-blue-100 bg-white">
                                                <h4 className="text-sm font-semibold text-gray-600 mb-3">Commission Rates (₹ Per Liter/Unit for each Product Code)</h4>
                                                <div className="space-y-4">
                                                    {products.map(product => (
                                                        <div key={product.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                            <h5 className="text-sm font-bold text-gray-700 mb-2">{product.pname}</h5>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {product.codes && product.codes.map(code => (
                                                                    <div key={code.id} className="flex flex-col">
                                                                        <label className="text-xs text-gray-500 mb-1">{code.pcode}</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-2 text-gray-400">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                min="0"
                                                                                value={assignments[customer.id]?.rates[code.id] || ''}
                                                                                onChange={(e) => handleRateChange(customer.id, code.id, e.target.value)}
                                                                                className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
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
                    </div>
                </main>
            </div>
        </div>
    );
}
