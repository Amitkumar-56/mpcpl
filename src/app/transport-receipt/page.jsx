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

// Loading Component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading consignment note...</p>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-gray-100 p-2 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto bg-white print:max-w-none print:shadow-none print:mx-0">
        
        {/* Action Buttons - Hidden during print */}
        <div className="print:hidden text-center mb-4 p-3 bg-white rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button 
              onClick={printReceipt}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Note
            </button>
            
            <button 
              onClick={downloadPDF}
              disabled={downloading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating PDF...
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
        </div>

        {/* Consignment Note Content - All in Table Tags */}
        <div ref={receiptRef} className="receipt-content border border-gray-300 print:border-0 bg-white">
          
          {/* Main Table Container */}
          <table className="w-full border-collapse">
            <tbody>
              {/* Header Section */}
              <tr>
                <td colSpan="3" className="border-b border-gray-300 p-4 print:p-3">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="text-right align-top">
                          <table className="ml-auto">
                            <tbody>
                              <tr>
                                <td className="text-sm print:text-xs text-right">{displayData.mobile || '+91 7311112659'}</td>
                              </tr>
                              <tr>
                                <td className="text-sm print:text-xs text-right">{displayData.email || 'accounts@gyanti.in'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center">
                          <table className="w-full">
                            <tbody>
                              <tr>
                                <td className="text-xl font-bold print:text-lg">Gyanti Multiservices Pvt. Ltd.</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center text-xs print:text-xs">
                          <table className="w-full">
                            <tbody>
                              <tr>
                                <td>NAKHA No.1, MOHARIPUR, GORAKHPUR - 273001</td>
                              </tr>
                              <tr>
                                <td>E-mail : accounts@gyanti.in</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* GR NO and DATE */}
              <tr>
                <td colSpan="3" className="border-b border-gray-300 p-3 print:p-2">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td>
                          <span className="font-semibold">GR NO. </span>
                          <span>{displayData.lr_id || ''}</span>
                        </td>
                        <td className="text-right">
                          <span className="font-semibold">DATE </span>
                          <span>{formatDate(displayData.lr_date)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Consignor and Loading Point */}
              <tr>
                <td colSpan="3" className="border-b border-gray-300">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="border-r border-gray-300 p-2 font-semibold bg-gray-50 print:p-1 w-1/3">CONSIGNOR</td>
                        <td className="border-r border-gray-300 p-2 font-semibold bg-gray-50 print:p-1 w-1/3">LOADING POINT</td>
                        <td className="p-2 font-semibold bg-gray-50 print:p-1 w-1/3">GST NO.</td>
                      </tr>
                      <tr>
                        <td className="border-r border-gray-300 p-2 print:p-1 w-1/3">
                          <table>
                            <tbody>
                              <tr>
                                <td>{displayData.consigner || ''}</td>
                              </tr>
                              {displayData.address_1 && (
                                <tr>
                                  <td className="text-xs text-gray-600 mt-1 print:mt-0">{displayData.address_1}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </td>
                        <td className="border-r border-gray-300 p-2 print:p-1 w-1/3">{displayData.from_location || ''}</td>
                        <td className="p-2 print:p-1 w-1/3">{displayData.gst || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Consignee and Destination */}
              <tr>
                <td colSpan="3" className="border-b border-gray-300">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="border-r border-gray-300 p-2 font-semibold bg-gray-50 print:p-1 w-1/3">CONSIGNEE</td>
                        <td className="border-r border-gray-300 p-2 font-semibold bg-gray-50 print:p-1 w-1/3">DESTINATION</td>
                        <td className="p-2 font-semibold bg-gray-50 print:p-1 w-1/3">GST NO.</td>
                      </tr>
                      <tr>
                        <td className="border-r border-gray-300 p-2 print:p-1 w-1/3">
                          <table>
                            <tbody>
                              <tr>
                                <td>{displayData.consignee || ''}</td>
                              </tr>
                              {displayData.address_2 && (
                                <tr>
                                  <td className="text-xs text-gray-600 mt-1 print:mt-0">{displayData.address_2}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </td>
                        <td className="border-r border-gray-300 p-2 print:p-1 w-1/3">{displayData.to_location || ''}</td>
                        <td className="p-2 print:p-1 w-1/3">{displayData.gst_no || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Tank Lorry Details */}
              <tr>
                <td colSpan="3" className="border-b border-gray-300">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="border-r border-gray-300 p-2 font-semibold bg-gray-50 print:p-1 w-1/4">TANK LORRY NO.</td>
                        <td className="border-r border-gray-300 p-2 font-semibold bg-gray-50 print:p-1 w-1/4">PRODUCT</td>
                        <td className="border-r border-gray-300 p-2 font-semibold bg-gray-50 print:p-1 w-1/4">QTY(QTL/MT)</td>
                        <td className="p-2 font-semibold bg-gray-50 print:p-1 w-1/4">ADVANCE</td>
                      </tr>
                      <tr>
                        <td className="border-r border-gray-300 p-2 print:p-1 w-1/4">{displayData.tanker_no || ''}</td>
                        <td className="border-r border-gray-300 p-2 print:p-1 w-1/4">{displayData.products || ''}</td>
                        <td className="border-r border-gray-300 p-2 print:p-1 w-1/4">
                          {displayData.net_wt || ''} {displayData.wt_type || ''}
                        </td>
                        <td className="p-2 print:p-1 w-1/4"></td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Date of Loading and Receiving Particular - CORRECTED VERSION */}
              <tr>
                <td colSpan="3" className="border-b border-gray-300">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="border-r border-gray-300 p-2 font-semibold bg-gray-50 print:p-1 w-1/2">DATE OF LOADING</td>
                        <td className="p-2 font-semibold bg-gray-50 print:p-1 w-1/2">RECEIVING PARTICULARS</td>
                      </tr>
                      
                      <tr>
                        {/* Left Side - All Values */}
                        <td className="border-r border-gray-300 align-top w-1/2">
                          <table className="w-full">
                            <tbody>
                              <tr>
                                <td className="border-b border-gray-300 p-2 font-semibold bg-gray-50 w-2/5">INVOICE NO.</td>
                                <td className="border-b border-gray-300 p-2 w-3/5">{displayData.invoice_no || ''}</td>
                              </tr>
                              <tr>
                                <td className="border-b border-gray-300 p-2 font-semibold bg-gray-50 w-2/5">DECLARED VALUE</td>
                                <td className="border-b border-gray-300 p-2 w-3/5"></td>
                              </tr>
                              <tr>
                                <td className="border-b border-gray-300 p-2 font-semibold bg-gray-50 w-2/5">E-WAY BILL NO.</td>
                                <td className="border-b border-gray-300 p-2 w-3/5">{displayData.gp_no || ''}</td>
                              </tr>
                              <tr>
                                <td className="border-b border-gray-300 p-2 font-semibold bg-gray-50 w-2/5">DRIVER LICENSE NO.</td>
                                <td className="border-b border-gray-300 p-2 w-3/5">{displayData.vessel || ''}</td>
                              </tr>
                              <tr>
                                <td className="border-b border-gray-300 p-2 font-semibold bg-gray-50 w-2/5">DRIVER SIGNATURE</td>
                                <td className="border-b border-gray-300 p-2 w-3/5"></td>
                              </tr>
                              {displayData.boe_no && (
                                <tr>
                                  <td className="border-b border-gray-300 p-2 font-semibold bg-gray-50 w-2/5">BOE NO.</td>
                                  <td className="border-b border-gray-300 p-2 w-3/5">{displayData.boe_no}</td>
                                </tr>
                              )}
                              {(displayData.gross_wt || displayData.tare_wt) && (
                                <tr>
                                  <td className="border-b border-gray-300 p-2 font-semibold bg-gray-50 w-2/5">WEIGHT DETAILS</td>
                                  <td className="border-b border-gray-300 p-2 w-3/5">
                                    {displayData.gross_wt && `Gross: ${displayData.gross_wt} ${displayData.wt_type || ''}`}
                                    {displayData.tare_wt && ` Tare: ${displayData.tare_wt} ${displayData.wt_type || ''}`}
                                  </td>
                                </tr>
                              )}
                              {displayData.remarks && (
                                <tr>
                                  <td className="p-2 font-semibold bg-gray-50 w-2/5">REMARKS</td>
                                  <td className="p-2 w-3/5">{displayData.remarks}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </td>
                        
                        {/* Right Side - Receiving Particulars */}
                        <td className="align-top w-1/2">
                          <table className="w-full h-full border-collapse">
                            <tbody>
                              <tr>
                                <td className="border-b border-gray-300 p-2 print:p-1 h-1/5">Received in good condition : ...... QU/MT</td>
                              </tr>
                              <tr>
                                <td className="border-b border-gray-300 p-2 print:p-1 h-1/5">Signature of Consignee/Agent : ......</td>
                              </tr>
                              <tr>
                                <td className="border-b border-gray-300 p-2 print:p-1 h-1/5">Address : ......</td>
                              </tr>
                              <tr>
                                <td className="border-b border-gray-300 p-2 print:p-1 h-1/5">Date : ...... Time : ......</td>
                              </tr>
                              <tr>
                                <td className="p-2 print:p-1 h-1/5"></td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Terms & Conditions */}
              <tr>
                <td colSpan="3" className="p-3 border-b border-gray-300 print:p-2 print:text-sm">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="font-semibold mb-2 print:mb-1">Terms & Conditions</td>
                      </tr>
                      <tr>
                        <td>
                          <table>
                            <tbody>
                              <tr>
                                <td>1. GST to be Paid by Consignor or Consignee.</td>
                              </tr>
                              <tr>
                                <td>2. The Consignor hereby expressly declares that the above particulars furnished by him or his agent are correct. No Prohibited articles are included and he is aware of & accepts the conditions of carriage. Any disputes subject to Delhi Jurisdiction.</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Footer Signature */}
              <tr>
                <td colSpan="3" className="p-3 print:p-2">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="text-right">
                          <table className="ml-auto">
                            <tbody>
                              <tr>
                                <td className="font-semibold print:text-sm">For Gyanti Multiservices Pvt. Ltd.</td>
                              </tr>
                              <tr>
                                <td className="mt-2 print:mt-1 print:text-sm">AUTHORISED SIGNATORY</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
            font-size: 12px;
            line-height: 1.2;
          }
          
          .receipt-content {
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          button {
            display: none !important;
          }
          
          @page {
            margin: 0.2in;
            size: A4;
          }

          /* Ensure proper page breaks */
          table {
            page-break-inside: avoid;
          }

          /* Reduce spacing for print */
          .print\\:p-1 {
            padding: 0.25rem !important;
          }
          
          .print\\:p-2 {
            padding: 0.5rem !important;
          }
          
          .print\\:p-3 {
            padding: 0.75rem !important;
          }
          
          .print\\:mb-1 {
            margin-bottom: 0.25rem !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          
          .print\\:mt-0 {
            margin-top: 0 !important;
          }
          
          .print\\:mt-1 {
            margin-top: 0.25rem !important;
          }

          .print\\:text-xs {
            font-size: 10px !important;
          }
          
          .print\\:text-sm {
            font-size: 11px !important;
          }
          
          .print\\:text-base {
            font-size: 12px !important;
          }
          
          .print\\:text-lg {
            font-size: 14px !important;
          }
        }

        /* Screen styles */
        @media screen {
          .receipt-content {
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense
export default function TransportReceipt() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TransportReceiptContent />
    </Suspense>
  );
}