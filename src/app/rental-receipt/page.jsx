// src/app/rental-receipt/page.jsx
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (amount) => {
  if (!amount || amount === 0) return '₹0';
  return `₹${parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Main Content Component
function RentalReceiptContent() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const receiptRef = useRef(null);

  // Auth bypass for public access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bypassAuth', 'true');
    }
  }, []);

  const fetchTripData = useCallback(async () => {
    if (!id) {
      setError('Trip ID is missing in the URL.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/rental-receipt?id=${id}`);

      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }

      const data = await response.json();

      if (!data.trip) {
        throw new Error('No trip data found');
      }

      setTrip(data.trip);
    } catch (err) {
      console.error('Error fetching trip:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTripData();
  }, [fetchTripData]);

  // Auto-download if download=true is in URL
  useEffect(() => {
    if (trip && !loading && searchParams.get('download') === 'true') {
      setTimeout(() => {
        downloadPDF();
      }, 1000); // Wait for rendering
    }
  }, [trip, loading, searchParams]);

  const printReceipt = () => {
    window.print();
  };

  const downloadPDF = async () => {
    const element = receiptRef.current;
    if (!element) return;

    try {
      setDownloading(true);

      // Temporarily override problematic CSS
      const originalStyle = document.createElement('style');
      originalStyle.textContent = `
        * {
          color: #000000 !important;
          background-color: #ffffff !important;
          border-color: #000000 !important;
        }
        .text-green-600, .text-green-700 { color: #16a34a !important; }
        .text-red-600, .text-red-700 { color: #dc2626 !important; }
        .text-blue-600 { color: #2563eb !important; }
        .text-orange-600 { color: #ea580c !important; }
      `;
      document.head.appendChild(originalStyle);

      // Dynamically import libraries
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Simple canvas capture
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Ensure all elements in clone have safe colors
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            el.style.color = '#000000';
            el.style.backgroundColor = '#ffffff';
            el.style.borderColor = '#000000';
          });
        }
      });

      // Remove temporary style
      document.head.removeChild(originalStyle);

      // Create PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth - 20; // 10mm margin each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      // Add image to PDF
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content is longer
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      pdf.save(`Rental-Trip-Receipt-${id}.pdf`);
      
    } catch (err) {
      console.error('PDF Download failed:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rental receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action Buttons */}
      <div className="no-print p-4 flex justify-end gap-4 border-b bg-white">
        <button
          onClick={printReceipt}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium disabled:opacity-50"
        >
          {downloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>

      {/* Receipt Container */}
      <div ref={receiptRef} className="print-container border-2 border-black m-4 text-black font-sans text-[11px] leading-relaxed pb-2 bg-white">

        {/* Header Section */}
        <div className="text-center p-3 pb-2 border-b-2 border-black">
          <div className="text-2xl font-bold">RENTAL TRIP RECEIPT</div>
          <div className="text-sm mt-1">Trip ID: #{trip.id}</div>
        </div>

        {/* Trip Information */}
        <div className="grid grid-cols-2 gap-0 border-b border-black">
          <div className="border-r border-black p-2">
            <div className="font-bold border-b border-black pb-1 mb-1">Trip Details</div>
            <div className="space-y-1">
              <div><span className="font-semibold">Vehicle No:</span> {trip.vehicle_no || 'N/A'}</div>
              <div><span className="font-semibold">Driver:</span> {trip.driver_name || 'N/A'}</div>
              <div><span className="font-semibold">Driver Phone:</span> {trip.driver_number || 'N/A'}</div>
              <div><span className="font-semibold">Status:</span> <span className={`font-bold ${trip.status === 'Completed' ? 'text-green-600' : 'text-orange-600'}`}>{trip.status}</span></div>
            </div>
          </div>
          <div className="p-2">
            <div className="font-bold border-b border-black pb-1 mb-1">Route Information</div>
            <div className="space-y-1">
              <div><span className="font-semibold">Source:</span> {trip.source || 'N/A'}</div>
              <div><span className="font-semibold">Destination:</span> {trip.destination || 'N/A'}</div>
              <div><span className="font-semibold">State:</span> {trip.state || 'N/A'}</div>
              <div><span className="font-semibold">Trip Date:</span> {formatDate(trip.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="border-b border-black p-2">
          <div className="font-bold border-b border-black pb-1 mb-1">Customer Information</div>
          <div className="grid grid-cols-2 gap-0">
            <div className="border-r border-black pr-2">
              <div><span className="font-semibold">Name:</span> {trip.customer_name || 'N/A'}</div>
              <div><span className="font-semibold">Company:</span> {trip.customer_company || 'N/A'}</div>
            </div>
            <div className="pl-2">
              <div><span className="font-semibold">Phone:</span> {trip.customer_phone || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-0 border-b border-black">
          <div className="border-r border-black p-2 text-center">
            <div className="font-bold border-b border-black pb-1 mb-1">Total Revenue</div>
            <div className="text-lg font-bold text-green-600">{formatCurrency(trip.received_amount)}</div>
          </div>
          <div className="border-r border-black p-2 text-center">
            <div className="font-bold border-b border-black pb-1 mb-1">Total Expenses</div>
            <div className="text-lg font-bold text-red-600">{formatCurrency(trip.total_expense)}</div>
          </div>
          <div className="p-2 text-center">
            <div className="font-bold border-b border-black pb-1 mb-1">Profit/Loss</div>
            <div className={`text-lg font-bold ${trip.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(trip.profit_loss)}
            </div>
          </div>
        </div>

        {/* Expenses Details */}
        {trip.expenses && trip.expenses.length > 0 && (
          <div className="border-b border-black p-2">
            <div className="font-bold border-b border-black pb-1 mb-1">Expense Details</div>
            <div className="space-y-1">
              {trip.expenses.map((expense, index) => (
                <div key={index} className="flex justify-between">
                  <span>{expense.type}: {expense.description || ''}</span>
                  <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advances Details */}
        {trip.advances && trip.advances.length > 0 && (
          <div className="border-b border-black p-2">
            <div className="font-bold border-b border-black pb-1 mb-1">Advance Payments</div>
            <div className="space-y-1">
              {trip.advances.map((advance, index) => (
                <div key={index} className="flex justify-between">
                  <span>Advance Payment {index + 1}: {advance.remarks || ''}</span>
                  <span className="font-semibold">{formatCurrency(advance.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remarks */}
        {trip.remarks && (
          <div className="p-2">
            <div className="font-bold border-b border-black pb-1 mb-1">Remarks</div>
            <div>{trip.remarks}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center p-2 text-xs text-gray-600 border-t border-black">
          <div>This is a computer-generated receipt</div>
          <div>Generated on: {new Date().toLocaleString('en-IN')}</div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense
export default function RentalReceipt() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RentalReceiptContent />
    </Suspense>
  );
}
