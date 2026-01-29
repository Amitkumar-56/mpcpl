 'use client';
 
 import Footer from 'components/Footer';
import Header from 'components/Header';
import Sidebar from 'components/sidebar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
 
 function InvoiceHistoryContent() {
   const router = useRouter();
   const searchParams = useSearchParams();
   const id = searchParams.get('id');
 
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [invoice, setInvoice] = useState(null);
   const [payments, setPayments] = useState([]);
   const [auditLogs, setAuditLogs] = useState([]);
 
   useEffect(() => {
     if (!id) {
       setError('Invalid invoice ID');
       setLoading(false);
       return;
     }
     fetchData();
   }, [id]);
 
   const fetchData = async () => {
     try {
       setLoading(true);
       setError(null);
 
       const detailsRes = await fetch(`/api/stock/supply-details?id=${id}`, { credentials: 'include' });
       if (detailsRes.status === 401) {
         router.push('/login');
         return;
       }
      if (!detailsRes.ok) {
        let message = 'Failed to fetch invoice details';
        try {
          const errJson = await detailsRes.json();
          message = errJson?.error || message;
        } catch {
          const errText = await detailsRes.text();
          if (errText) message = errText;
        }
        if (detailsRes.status === 404) {
          message = 'Invoice not found or unavailable';
        }
        throw new Error(message);
      }
      const detailsJson = await detailsRes.json();
      if (!detailsJson.success) {
        throw new Error(detailsJson.error || 'Failed to load invoice');
      }
 
       const data = detailsJson.data;
       setInvoice(data);
       setPayments(Array.isArray(data.paymentHistory) ? data.paymentHistory : []);
 
       // Fetch audit logs for edited-by attribution
       try {
         const logsRes = await fetch(
           `/api/audit-logs?record_type=supplier_invoice&record_id=${id}&limit=200`
         );
         if (logsRes.ok) {
           const logsJson = await logsRes.json();
           setAuditLogs(Array.isArray(logsJson.data) ? logsJson.data : []);
         } else {
           setAuditLogs([]);
         }
       } catch {
         setAuditLogs([]);
       }
     } catch (err) {
       setError(err.message || 'Error loading invoice history');
     } finally {
       setLoading(false);
     }
   };
 
   const openingBalance = useMemo(() => {
     if (!invoice) return 0;
     const paymentTotal = parseFloat(invoice.payment || 0) || 0;
     const currentPayable = parseFloat(invoice.payable || 0) || 0;
     return paymentTotal + currentPayable;
   }, [invoice]);
 
   const findEditorForPayment = (amount, dateStr) => {
     if (!auditLogs || auditLogs.length === 0) return '-';
     const normalizedDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : null);
     const targetDate = normalizedDate(dateStr);
 
     // Try to match logs with 'payment' action and remarks containing amount
     const match = auditLogs.find((log) => {
       const logDate = normalizedDate(log.created_at || log.createdAt);
       const isPayment = (log.action || '').toLowerCase() === 'payment';
       const hasAmount =
         typeof log.remarks === 'string' &&
         (log.remarks.includes(String(amount)) || log.remarks.includes(`₹${amount}`));
       return isPayment && (!targetDate || logDate === targetDate) && hasAmount;
     });
 
    return match?.user_display_name || match?.user_name || match?.userName || '-';
   };
 
   if (loading) {
     return (
       <div className="flex min-h-screen bg-gray-50">
         <Sidebar />
         <div className="flex flex-col flex-1">
           <Header />
           <main className="flex-1 flex items-center justify-center">
             <div className="text-center">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
               <p className="text-gray-600">Loading Invoice History...</p>
             </div>
           </main>
           <Footer />
         </div>
       </div>
     );
   }
 
   if (error) {
     return (
       <div className="flex min-h-screen bg-gray-50">
         <Sidebar />
         <div className="flex flex-col flex-1">
           <Header />
           <main className="flex-1 flex items-center justify-center">
             <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-xl">
               <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
               <p className="text-red-600">{error}</p>
             </div>
           </main>
           <Footer />
         </div>
       </div>
     );
   }
 
   return (
     <div className="flex min-h-screen bg-gray-100">
       <Sidebar />
       <div className="flex flex-col flex-1">
         <Header />
 
         <main className="flex-1 overflow-y-auto p-4 md:p-6">
           <div className="max-w-6xl mx-auto bg-white shadow rounded-lg p-4 sm:p-6">
             <div className="flex items-center justify-between">
               <div>
                 <h1 className="text-xl sm:text-2xl font-bold">Invoice History</h1>
                 {invoice && (
                   <div className="mt-1 text-sm text-gray-600">
                     <p>
                       Supplier: <span className="font-medium">{invoice.supplier_name || '-'}</span>
                       {' • '}Station: <span className="font-medium">{invoice.fs_name || '-'}</span>
                       {' • '}Product: <span className="font-medium">{invoice.product_name || '-'}</span>
                     </p>
                     <p className="mt-0.5">
                       Invoice No: <span className="font-medium">{invoice.invoice_number || '-'}</span>
                       {' • '}Date: <span className="font-medium">{invoice.invoice_date || '-'}</span>
                       {' • '}Opening Balance: <span className="font-medium">₹{openingBalance.toFixed(2)}</span>
                     </p>
                   </div>
                 )}
                 <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
                   <a href="/" className="hover:text-blue-600">Home</a>
                   <span>/</span>
                   <span>Invoice History</span>
                 </nav>
               </div>
               {invoice && (
                 <Link
                   href={`/stock/supply-details?id=${invoice.id}`}
                   className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                 >
                   View Invoice
                 </Link>
               )}
             </div>
 
             <div className="mt-6 overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200 text-sm">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                     <th className="px-4 py-2 text-left font-medium text-gray-700">Bill Amount</th>
                     <th className="px-4 py-2 text-left font-medium text-gray-700">Paid</th>
                     <th className="px-4 py-2 text-left font-medium text-gray-700">Balance</th>
                     <th className="px-4 py-2 text-left font-medium text-gray-700">Payment Mode</th>
                     <th className="px-4 py-2 text-left font-medium text-gray-700">Edited By</th>
                     <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {invoice && (
                     <tr className="bg-blue-50">
                       <td className="px-4 py-2">{invoice.invoice_date || '-'}</td>
                       <td className="px-4 py-2 font-medium">₹{openingBalance.toFixed(2)}</td>
                       <td className="px-4 py-2">-</td>
                       <td className="px-4 py-2 font-medium">₹{openingBalance.toFixed(2)}</td>
                       <td className="px-4 py-2">-</td>
                       <td className="px-4 py-2">-</td>
                       <td className="px-4 py-2">
                         <Link
                           href={`/stock/supply-details?id=${invoice.id}`}
                           className="text-blue-600 hover:underline"
                         >
                           View
                         </Link>
                       </td>
                     </tr>
                   )}
 
                   {payments && payments.length > 0 ? (
                     (() => {
                       let running = openingBalance;
                       return payments
                         .slice()
                         .sort((a, b) => new Date(a.date) - new Date(b.date))
                         .map((p) => {
                           const amt = parseFloat(p.payment || 0) || 0;
                           running = running - amt;
                           const mode =
                             typeof p.remarks === 'string'
                               ? (p.remarks.toLowerCase().includes('cash')
                                   ? 'Cash'
                                   : p.remarks.toLowerCase().includes('neft')
                                   ? 'NEFT'
                                   : p.remarks.toLowerCase().includes('rtgs')
                                   ? 'RTGS'
                                   : p.remarks.toLowerCase().includes('bank')
                                   ? 'Bank'
                                   : '-')
                               : '-';
                           const editor = findEditorForPayment(amt, p.date);
 
                           return (
                             <tr key={p.id}>
                               <td className="px-4 py-2">{p.date || '-'}</td>
                               <td className="px-4 py-2">-</td>
                               <td className="px-4 py-2 text-green-700">₹{amt.toFixed(2)}</td>
                               <td className="px-4 py-2 font-medium">₹{running.toFixed(2)}</td>
                               <td className="px-4 py-2">{mode}</td>
                               <td className="px-4 py-2">{editor}</td>
                               <td className="px-4 py-2">
                                 <Link
                                   href={`/audit-logs?record_type=supplier_invoice&record_id=${id}`}
                                   className="text-blue-600 hover:underline"
                                 >
                                   View Audit
                                 </Link>
                               </td>
                             </tr>
                           );
                         });
                     })()
                   ) : (
                     <tr>
                       <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                         No payments recorded for this invoice yet.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
         </main>
 
         <Footer />
       </div>
     </div>
   );
 }
 
 export default function InvoiceHistoryPage() {
   return (
     <Suspense
       fallback={
         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
           <div className="text-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
             <p className="mt-4 text-gray-600">Loading page...</p>
           </div>
         </div>
       }
     >
       <InvoiceHistoryContent />
     </Suspense>
   );
 }
 
