// app/customers/client-history/page.jsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// --- MOCK COMPONENTS (Replace with your actual components) ---
const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};
// ----------------------------------------------------------

export default function ClientHistory() {
    const [transactions, setTransactions] = useState([]);
    const [products, setProducts] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // NEW STATES FOR PAYMENT PROCESSING
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentResult, setPaymentResult] = useState(null);
    const [error, setError] = useState('');
    const [customerName, setCustomerName] = useState('');

    const searchParams = useSearchParams();
    const router = useRouter();
    const cid = searchParams.get('id');

    // Filter transactions based on search
    const filteredTransactions = transactions.filter(transaction => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return (
            (transaction.station_name?.toLowerCase().includes(searchLower)) ||
            (transaction.pname?.toLowerCase().includes(searchLower)) ||
            (transaction.vehicle_number?.toLowerCase().includes(searchLower)) ||
            (transaction.trans_type?.toLowerCase().includes(searchLower)) ||
            (transaction.updated_by_name?.toLowerCase().includes(searchLower))
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const displayTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        if (cid) {
            fetchTransactions();
        }
    }, [cid, filter]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            setError('');
            
            const params = new URLSearchParams({ id: cid });
            if (filter) params.append('pname', filter);

            const response = await fetch(`/api/customers/client-history?${params}`);
            
            const result = await response.json();

            if (result.success) {
                setTransactions(result.data.transactions || []);
                setProducts(result.data.products || []);
                setBalance(result.data.balance || 0);
                setPendingTransactions(result.data.pendingTransactions || []);
                setCustomerName(result.data.customerName || `Customer ${cid}`);
            } else {
                setError(result.error || 'Failed to fetch data');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // New Payment Handlers
    const handleRechargeClick = () => {
        setShowPaymentModal(true);
        setRechargeAmount('');
        setPaymentResult(null);
    };

    const handleProcessPayment = async () => {
        const amount = parseFloat(rechargeAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid recharge amount.');
            return;
        }

        try {
            setProcessingPayment(true);
            
            // NOTE: Using PATCH for idempotent update/resource modification
            const response = await fetch('/api/customers/client-history', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: cid,
                    rechargeAmount: amount,
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                setPaymentResult(result);
                // Re-fetch data to update balance, transactions, and pending lists
                fetchTransactions(); 
                
                setTimeout(() => {
                    setShowPaymentModal(false);
                    setPaymentResult(null);
                }, 3000);
            } else {
                alert(result.error || 'Payment processing failed.');
                setPaymentResult({ success: false, message: result.error || 'Payment failed' });
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            alert('Payment processing failed.');
            setPaymentResult({ success: false, message: 'Network error.' });
        } finally {
            setProcessingPayment(false);
        }
    };
    
    // Existing helper functions
    const handleExport = async () => { /* ... existing export logic ... */ };
    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN').format(amount || 0);
    const formatDate = (dateString) => { /* ... existing format date logic ... */ };
    const formatDateTime = (dateString) => { /* ... existing format date time logic ... */ };

    // Calculate transaction status
    const getTransactionStatus = (transaction) => {
        if (transaction.trans_type === 'inward') {
            return { status: 'Recharge', color: 'green' };
        }
        
        // Use payment_status field from DB if available.
        // For compatibility with the API's current history query:
        // Assume 'payment_status' is included in the main transactions fetch.
        if (transaction.payment_status === 1) {
            return { status: 'Paid', color: 'green' };
        }
        
        // If payment_status is 0 (Unpaid/Pending), check for overdue time
        const transactionDate = new Date(transaction.filling_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (transactionDate < thirtyDaysAgo) {
            return { status: 'Overdue', color: 'red' };
        } else {
            return { status: 'Pending', color: 'orange' };
        }
    };

    const PaymentStatusBadge = ({ status, transactionType }) => {
        const styles = {
            paid: 'bg-green-100 text-green-800 border-green-200',
            overdue: 'bg-red-100 text-red-800 border-red-200',
            pending: 'bg-orange-100 text-orange-800 border-orange-200',
            recharge: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        
        const style = transactionType === 'inward' ? 
            styles.recharge : 
            styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
        
        const displayStatus = transactionType === 'inward' ? 'Recharge' : status;
        
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${style}`}>
                {displayStatus || 'N/A'}
            </span>
        );
    };

    const TransactionTypeBadge = ({ type }) => {
        const styles = {
            outward: 'bg-red-100 text-red-800 border-red-200',
            inward: 'bg-green-100 text-green-800 border-green-200'
        };
        
        const style = styles[type?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
        const displayText = type === 'outward' ? 'Fuel' : (type === 'inward' ? 'Recharge' : type);
        
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${style}`}>
                {displayText}
            </span>
        );
    };

    // Mobile Card View
    const TransactionCard = ({ transaction }) => {
        const statusInfo = getTransactionStatus(transaction);
        
        return (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-3 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* ... (Existing card fields) ... */}
                     <div>
                        <p className="text-gray-500 text-xs font-medium">ID</p>
                        <p className="font-medium">{transaction.id}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Type</p>
                        <TransactionTypeBadge type={transaction.trans_type} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Station</p>
                        <p className="font-medium truncate">{transaction.station_name || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Date</p>
                        <p className="font-medium">{formatDateTime(transaction.filling_date)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Product</p>
                        <p className="font-medium">{transaction.pname || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Vehicle</p>
                        <p className="font-medium">{transaction.vehicle_number || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Amount</p>
                        <p className={`font-bold ${
                            transaction.trans_type === 'inward' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                            ₹{formatCurrency(transaction.amount)}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Due Amount</p>
                         <p className={`font-bold ${
                           (transaction.payment_status === 0 && transaction.trans_type === 'outward') ? 'text-red-600' : 'text-green-600'
                        }`}>
                            ₹{formatCurrency(transaction.amount)} {/* Display full amount as 'due' if unpaid */}
                        </p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-gray-500 text-xs font-medium">Status</p>
                        <PaymentStatusBadge 
                            status={statusInfo.status} 
                            transactionType={transaction.trans_type} 
                        />
                    </div>
                    <div className="col-span-2">
                        <p className="text-gray-500 text-xs font-medium">Updated By</p>
                        <p className="font-medium">{transaction.updated_by_name || 'Unknown'}</p>
                    </div>
                </div>
            </div>
        );
    };

    if (!cid) {
        // ... (Existing CID missing logic) ...
         return (
             <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                 <div className="text-center">
                     <div className="text-red-500 text-lg">Customer ID is required</div>
                     <button 
                         onClick={() => router.back()}
                         className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                     >
                         Go Back
                     </button>
                 </div>
             </div>
         );
    }

    // Calculate total pending amount for display in modal/header
    const totalPendingAmount = pendingTransactions.reduce((sum, t) => sum + parseFloat(t.due_amount || t.amount), 0);


    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => router.back()}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Transaction History
                                </h1>
                                <p className="text-gray-500">Customer: {customerName} (ID: {cid})</p>
                                {error && (
                                    <p className="text-red-500 text-sm mt-1">{error}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Available Balance</p>
                                <p className={`text-lg font-bold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{formatCurrency(balance)}
                                </p>
                            </div>
                            
                            <button
                                onClick={handleRechargeClick}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Recharge/Pay</span>
                            </button>

                            <button
                                onClick={handleExport}
                                disabled={exportLoading || transactions.length === 0}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {exportLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Exporting...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>Export CSV</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters Section (Existing) */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Product Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filter by Product
                            </label>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Products</option>
                                {products.map((product, index) => (
                                    <option key={index} value={product}>
                                        {product}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search Transactions
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Items Per Page */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Items per page
                            </label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        {/* Stats (Updated to reflect total pending amount) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quick Stats
                            </label>
                            <div className="text-sm text-gray-600">
                                <div>Total Records: {filteredTransactions.length}</div>
                                <div className="text-red-600 font-semibold">Total Due: ₹{formatCurrency(totalPendingAmount)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="bg-white rounded-lg shadow-sm border">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="mt-3 text-gray-600">Loading transactions...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="text-red-500 text-lg mb-4">Error: {error}</div>
                            <button 
                                onClick={fetchTransactions}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile View */}
                            <div className="md:hidden p-4">
                                {displayTransactions.length > 0 ? (
                                    displayTransactions.map((transaction) => (
                                        <TransactionCard 
                                            key={transaction.id} 
                                            transaction={transaction} 
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="mt-4 text-gray-600">No transactions found</p>
                                        <p className="text-sm text-gray-500">Try adjusting your filters or search terms</p>
                                        <button 
                                            onClick={fetchTransactions}
                                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                        >
                                            Refresh Data
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {displayTransactions.length > 0 ? (
                                            displayTransactions.map((transaction) => {
                                                const statusInfo = getTransactionStatus(transaction);
                                                
                                                return (
                                                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {transaction.id}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <TransactionTypeBadge type={transaction.trans_type} />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {transaction.station_name || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatDateTime(transaction.filling_date)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {transaction.pname || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {transaction.vehicle_number || 'N/A'}
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                                                            transaction.trans_type === 'inward' ? 'text-green-600' : 'text-blue-600'
                                                        }`}>
                                                            ₹{formatCurrency(transaction.amount)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <PaymentStatusBadge 
                                                                status={statusInfo.status} 
                                                                transactionType={transaction.trans_type} 
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {transaction.updated_by_name || 'Unknown'}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="9" className="px-6 py-8 text-center">
                                                    <div className="flex flex-col items-center text-gray-500">
                                                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <p className="text-lg font-medium">No transactions found</p>
                                                        <p className="text-sm mb-4">Try adjusting your filters or search terms</p>
                                                        <button 
                                                            onClick={fetchTransactions}
                                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                                        >
                                                            Refresh Data
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination (Missing part completed here) */}
                            {filteredTransactions.length > 0 && (
                                <div className="px-6 py-4 flex justify-between items-center border-t">
                                    <p className="text-sm text-gray-600">
                                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} results
                                    </p>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 text-sm rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 text-sm rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            <Modal 
                show={showPaymentModal} 
                onClose={() => setShowPaymentModal(false)} 
                title="Process Payment / Recharge"
            >
                {paymentResult && (
                    <div className={`p-3 mb-4 rounded-lg text-center ${paymentResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <p className="font-semibold">{paymentResult.message}</p>
                        {paymentResult.success && <p className="text-sm mt-1">Invoices Paid: {paymentResult.invoicesPaid}</p>}
                    </div>
                )}
                
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">Total Outstanding Due:</p>
                    <p className="text-xl font-bold text-red-600">₹{formatCurrency(totalPendingAmount)}</p>
                    <p className="text-xs text-gray-600 mt-1">Payment will deduct the total balance, reset Day Limit counter, and extend validity days.</p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Amount Paid (₹)
                </label>
                <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="e.g., 100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                    disabled={processingPayment || paymentResult?.success}
                />
                
                <button
                    onClick={handleProcessPayment}
                    disabled={processingPayment || paymentResult?.success || parseFloat(rechargeAmount) <= 0}
                    className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    {processingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-3">
                    Payment will automatically cover the oldest outstanding invoices first.
                </p>

            </Modal>
        </div>
    );
}