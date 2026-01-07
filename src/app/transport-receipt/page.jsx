// src/app/transport-receipt/page.jsx
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

// Main Content Component
function TransportReceiptContent() {
  const [shipment, setShipment] = useState(null);
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

  const fetchShipmentData = useCallback(async () => {
    if (!id) {
      setError('Shipment ID is missing in the URL.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/transport-receipt?id=${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.shipment) {
        throw new Error('No shipment data found');
      }
      
      setShipment(data.shipment);
    } catch (err) {
      console.error('Error fetching shipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchShipmentData();
  }, [fetchShipmentData]);

  const printReceipt = () => {
    window.print();
  };

  const downloadPDF = async () => {
    if (!shipment) return;

    try {
      setDownloading(true);
      const response = await fetch('/api/transport-receipt-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shipment }),
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consignment-note-${shipment.lr_id || 'note'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const retryFetch = () => {
    fetchShipmentData();
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading consignment note...</p>
          <p className="text-sm text-gray-500 mt-2">ID: {id}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
            <p className="text-red-700 mb-4">{error}</p>
            <p className="text-sm text-gray-600 mb-4">Consignment ID: {id}</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={retryFetch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use actual shipment data
  const displayData = shipment || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 print:p-0 print:bg-white">
      <div className="max-w-6xl mx-auto">
        
        {/* Action Buttons - Hidden during print */}
        <div className="print:hidden mb-6 p-4 bg-white rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-gray-800">Consignment Note</h1>
              <p className="text-gray-600 text-sm mt-1">
                LR Number: <span className="font-semibold">{displayData.lr_id || 'N/A'}</span> | 
                Date: <span className="font-semibold">{formatDate(displayData.lr_date)}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={printReceipt}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Note
              </button>
              
              <button 
                onClick={downloadPDF}
                disabled={downloading}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-500 text-white px-5 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Consignment Note Content - Optimized for single page print */}
        <div ref={receiptRef} className="print-single-page bg-white rounded-xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:bg-white">
          
          {/* Header Section - Compact for print */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-6 print:p-3 print:bg-gray-800 print:text-black">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center print:flex-row print:items-center">
              <div className="mb-4 md:mb-0 print:mb-0">
                <h1 className="text-3xl font-bold print:text-xl print:font-bold print:text-white">GYANTI MULTISERVICES PVT. LTD.</h1>
                <p className="text-blue-100 mt-2 print:text-xs print:text-gray-300 print:mt-1">
                  NAKHA No.1, MOHARIPUR, GORAKHPUR - 273001
                </p>
                <p className="text-blue-100 print:text-xs print:text-gray-300 print:mt-1">
                  E-mail : accounts@gyanti.in
                </p>
              </div>
              <div className="text-right print:text-right">
                <p className="text-lg font-semibold print:text-sm print:font-semibold print:text-white">Contact Information</p>
                <p className="text-blue-100 print:text-xs print:text-gray-300">{displayData.mobile || '+91 7311112659'}</p>
              </div>
            </div>
          </div>

          {/* GR Details Bar */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200 print:p-2 print:bg-gray-100 print:border-b print:border-gray-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center print:flex-row print:items-center">
              <div>
                <span className="font-bold text-gray-700 text-lg print:text-sm print:font-bold">GR NO: </span>
                <span className="text-blue-600 font-semibold text-lg print:text-sm print:font-bold">{displayData.lr_id || ''}</span>
              </div>
              <div className="mt-2 sm:mt-0 print:mt-0">
                <span className="font-bold text-gray-700 text-lg print:text-sm print:font-bold">DATE: </span>
                <span className="text-gray-800 font-semibold text-lg print:text-sm print:font-bold">{formatDate(displayData.lr_date)}</span>
              </div>
            </div>
          </div>

          {/* Main Content - Compact layout for print */}
          <div className="p-6 print:p-3 print:space-y-2">
            
            {/* Consignor Section - Compact */}
            <div className="mb-4 print:mb-2">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-t-lg border border-gray-200 print:p-2 print:bg-gray-100 print:border print:border-gray-300 print:rounded-t">
                <h3 className="font-bold text-gray-800 text-lg print:text-sm print:font-bold">CONSIGNOR DETAILS</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 border-t-0 rounded-b-lg p-4 print:grid-cols-3 print:gap-2 print:border print:border-t-0 print:border-gray-300 print:p-2 print:rounded-b">
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">Consignor Name</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">{displayData.consigner || ''}</p>
                  {displayData.address_1 && (
                    <p className="text-xs text-gray-600 mt-1 print:text-xs print:text-gray-500">{displayData.address_1}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">Loading Point</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">{displayData.from_location || ''}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">GST Number</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">{displayData.gst || ''}</p>
                </div>
              </div>
            </div>

            {/* Consignee Section - Compact */}
            <div className="mb-4 print:mb-2">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-t-lg border border-gray-200 print:p-2 print:bg-gray-100 print:border print:border-gray-300 print:rounded-t">
                <h3 className="font-bold text-gray-800 text-lg print:text-sm print:font-bold">CONSIGNEE DETAILS</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 border-t-0 rounded-b-lg p-4 print:grid-cols-3 print:gap-2 print:border print:border-t-0 print:border-gray-300 print:p-2 print:rounded-b">
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">Consignee Name</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">{displayData.consignee || ''}</p>
                  {displayData.address_2 && (
                    <p className="text-xs text-gray-600 mt-1 print:text-xs print:text-gray-500">{displayData.address_2}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">Destination</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">{displayData.to_location || ''}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">GST Number</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">{displayData.gst_no || ''}</p>
                </div>
              </div>
            </div>

            {/* Shipment Details - Compact */}
            <div className="mb-4 print:mb-2">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-t-lg border border-gray-200 print:p-2 print:bg-gray-100 print:border print:border-gray-300 print:rounded-t">
                <h3 className="font-bold text-gray-800 text-lg print:text-sm print:font-bold">SHIPMENT DETAILS</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-gray-200 border-t-0 rounded-b-lg p-4 print:grid-cols-4 print:gap-2 print:border print:border-t-0 print:border-gray-300 print:p-2 print:rounded-b">
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">Tank Lorry No.</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">{displayData.tanker_no || ''}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">Product</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">{displayData.products || ''}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">Quantity</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">
                    {displayData.net_wt || ''} {displayData.wt_type || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 print:text-xs print:font-medium print:text-gray-600">Advance</p>
                  <p className="font-semibold text-gray-800 print:text-xs print:font-semibold">-</p>
                </div>
              </div>
            </div>

            {/* Two Column Layout - Optimized for print */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 print:grid-cols-2 print:gap-3 print:mb-2">
              
              {/* Left Column - Loading Details */}
              <div className="border border-gray-200 rounded-lg overflow-hidden print:border print:border-gray-300 print:rounded print:overflow-visible">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 border-b border-gray-200 print:p-2 print:bg-gray-100 print:border-b print:border-gray-300">
                  <h3 className="font-bold text-gray-800 print:text-xs print:font-bold">DATE OF LOADING & DETAILS</h3>
                </div>
                <div className="p-4 print:p-2">
                  <div className="space-y-3 print:space-y-1">
                    <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-1">
                      <div className="col-span-1">
                        <p className="text-sm text-gray-500 print:text-xs print:font-medium print:text-gray-600">Invoice No.</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-semibold print:text-xs print:font-semibold">{displayData.invoice_no || ''}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-1">
                      <div className="col-span-1">
                        <p className="text-sm text-gray-500 print:text-xs print:font-medium print:text-gray-600">Declared Value</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-semibold print:text-xs print:font-semibold">-</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-1">
                      <div className="col-span-1">
                        <p className="text-sm text-gray-500 print:text-xs print:font-medium print:text-gray-600">E-Way Bill No.</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-semibold print:text-xs print:font-semibold">{displayData.gp_no || ''}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-1">
                      <div className="col-span-1">
                        <p className="text-sm text-gray-500 print:text-xs print:font-medium print:text-gray-600">Driver License No.</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-semibold print:text-xs print:font-semibold">{displayData.vessel || ''}</p>
                      </div>
                    </div>
                    
                    {displayData.boe_no && (
                      <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-1">
                        <div className="col-span-1">
                          <p className="text-sm text-gray-500 print:text-xs print:font-medium print:text-gray-600">BOE No.</p>
                        </div>
                        <div className="col-span-2">
                          <p className="font-semibold print:text-xs print:font-semibold">{displayData.boe_no}</p>
                        </div>
                      </div>
                    )}
                    
                    {(displayData.gross_wt || displayData.tare_wt) && (
                      <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-1">
                        <div className="col-span-1">
                          <p className="text-sm text-gray-500 print:text-xs print:font-medium print:text-gray-600">Weight Details</p>
                        </div>
                        <div className="col-span-2">
                          <p className="font-semibold print:text-xs print:font-semibold">
                            {displayData.gross_wt && `Gross: ${displayData.gross_wt}`}
                            {displayData.tare_wt && ` Tare: ${displayData.tare_wt}`}
                            {displayData.wt_type && ` (${displayData.wt_type})`}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {displayData.remarks && (
                      <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-1">
                        <div className="col-span-1">
                          <p className="text-sm text-gray-500 print:text-xs print:font-medium print:text-gray-600">Remarks</p>
                        </div>
                        <div className="col-span-2">
                          <p className="font-semibold print:text-xs print:font-semibold">{displayData.remarks}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Receiving Particulars */}
              <div className="border border-gray-200 rounded-lg overflow-hidden print:border print:border-gray-300 print:rounded print:overflow-visible">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 border-b border-gray-200 print:p-2 print:bg-gray-100 print:border-b print:border-gray-300">
                  <h3 className="font-bold text-gray-800 print:text-xs print:font-bold">RECEIVING PARTICULARS</h3>
                </div>
                <div className="p-4 print:p-2 h-full">
                  <div className="space-y-4 print:space-y-2 h-full flex flex-col justify-between print:justify-start">
                    <div className="border-b border-gray-200 pb-2 print:pb-1 print:border-b print:border-gray-300">
                      <p className="text-gray-600 print:text-xs print:text-gray-700">Received in good condition : ...... {displayData.wt_type || 'QU/MT'}</p>
                    </div>
                    <div className="border-b border-gray-200 pb-2 print:pb-1 print:border-b print:border-gray-300">
                      <p className="text-gray-600 print:text-xs print:text-gray-700">Signature of Consignee/Agent : ......</p>
                    </div>
                    <div className="border-b border-gray-200 pb-2 print:pb-1 print:border-b print:border-gray-300">
                      <p className="text-gray-600 print:text-xs print:text-gray-700">Address : ......</p>
                    </div>
                    <div className="border-b border-gray-200 pb-2 print:pb-1 print:border-b print:border-gray-300">
                      <p className="text-gray-600 print:text-xs print:text-gray-700">Date : ...... Time : ......</p>
                    </div>
                    <div className="pt-2 print:pt-1">
                      <p className="text-gray-600 print:text-xs print:text-gray-700">Driver Signature : ......</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions - Compact */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 print:border print:border-gray-300 print:rounded print:mb-2">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 border-b border-gray-200 print:p-2 print:bg-gray-100 print:border-b print:border-gray-300">
                <h3 className="font-bold text-gray-800 print:text-xs print:font-bold">TERMS & CONDITIONS</h3>
              </div>
              <div className="p-4 print:p-2">
                <div className="space-y-2 print:space-y-1">
                  <div className="flex items-start">
                    <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-center text-xs font-bold mr-2 flex-shrink-0 print:w-4 print:h-4 print:text-xs print:bg-gray-200 print:text-gray-700">1</span>
                    <span className="text-sm print:text-xs print:text-gray-700">GST to be Paid by Consignor or Consignee.</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-center text-xs font-bold mr-2 flex-shrink-0 print:w-4 print:h-4 print:text-xs print:bg-gray-200 print:text-gray-700">2</span>
                    <span className="text-sm print:text-xs print:text-gray-700">The Consignor hereby expressly declares that the above particulars furnished by him or his agent are correct. No Prohibited articles are included and he is aware of & accepts the conditions of carriage. Any disputes subject to Delhi Jurisdiction.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Signature */}
            <div className="border-t border-gray-200 pt-4 print:pt-2 print:border-t print:border-gray-300">
              <div className="flex flex-col md:flex-row justify-between items-center print:flex-row print:justify-between">
                <div className="mb-3 md:mb-0 print:mb-0">
                  <p className="text-sm text-gray-500 print:text-xs print:text-gray-600">Generated on: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-center md:text-right print:text-right">
                  <p className="font-bold text-gray-800 text-lg mb-1 print:text-sm print:font-bold print:mb-0">For Gyanti Multiservices Pvt. Ltd.</p>
                  <div className="mt-2 print:mt-1">
                    <div className="border-t border-gray-300 pt-2 inline-block print:border-t print:border-gray-300 print:pt-1">
                      <p className="text-gray-600 font-semibold print:text-xs print:font-semibold">AUTHORISED SIGNATORY</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section - Hidden in print */}
        <div className="print:hidden mt-6 p-4 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Share this consignment note</p>
            <div className="flex justify-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
                Share Link
              </button>
              <button 
                onClick={printReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles - Optimized for single page */}
      <style jsx global>{`
        @media print {
          /* Reset everything for print */
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Hide all non-print elements */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Force all content to be black and white */
          * {
            color: black !important;
            background: white !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          
          /* Main container adjustments */
          .print-single-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            min-height: auto !important;
          }
          
          /* Page settings */
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          /* Prevent page breaks inside important elements */
          .print-single-page > * {
            page-break-inside: avoid !important;
          }
          
          /* Font size adjustments */
          .print\\:text-xs {
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
          
          .print\\:text-sm {
            font-size: 10px !important;
            line-height: 1.3 !important;
          }
          
          /* Padding and margin reductions */
          .print\\:p-2 {
            padding: 0.25rem !important;
          }
          
          .print\\:p-3 {
            padding: 0.375rem !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.25rem !important;
          }
          
          .print\\:space-y-2 > * + * {
            margin-top: 0.25rem !important;
          }
          
          /* Grid adjustments */
          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.375rem !important;
          }
          
          .print\\:grid-cols-3 {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.375rem !important;
          }
          
          .print\\:grid-cols-4 {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0.375rem !important;
          }
          
          /* Border adjustments */
          .print\\:border {
            border-width: 1px !important;
            border-style: solid !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          /* Background adjustments */
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          .print\\:bg-gray-800 {
            background-color: #1f2937 !important;
            color: white !important;
          }
          
          .print\\:text-white {
            color: white !important;
          }
          
          .print\\:text-gray-300 {
            color: #d1d5db !important;
          }
          
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          
          /* Ensure everything fits on one page */
          .receipt-content {
            max-height: none !important;
            overflow: visible !important;
          }
          
          /* Remove all gradients */
          .bg-gradient-to-r {
            background-image: none !important;
          }
        }

        /* Screen responsive styles */
        @media screen and (max-width: 768px) {
          .grid-cols-4 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          
          .lg\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media screen and (max-width: 640px) {
          .p-6 {
            padding: 1rem !important;
          }
          
          .grid-cols-3 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense
export default function TransportReceipt() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading consignment note...</p>
        </div>
      </div>
    }>
      <TransportReceiptContent />
    </Suspense>
  );
}