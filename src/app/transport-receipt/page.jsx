// src/app/transport-receipt/page.jsx
'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

  // Auto-download if download=true is in URL
  useEffect(() => {
    if (shipment && !loading && searchParams.get('download') === 'true') {
      setTimeout(() => {
        downloadPDF();
      }, 1000); // Wait for rendering
    }
  }, [shipment, loading, searchParams]);

  const printReceipt = () => {
    window.print();
  };

  const downloadPDF = async () => {
    const element = receiptRef.current;
    if (!element) return;

    try {
      setDownloading(true);

      // Create a clone with proper styling
      const clone = element.cloneNode(true);
      
      // Get actual dimensions
      const originalRect = element.getBoundingClientRect();
      
      // Style clone for capture
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = `${originalRect.width}px`;
      clone.style.height = 'auto';
      clone.style.zIndex = '-1';
      clone.style.padding = '20px';
      clone.style.background = 'white';
      clone.style.boxSizing = 'border-box';
      
      // Ensure all grid layouts maintain structure
      clone.style.display = 'block';
      
      // Force proper grid display
      const gridContainers = clone.querySelectorAll('.grid');
      gridContainers.forEach(container => {
        container.style.display = 'grid';
        container.style.width = '100%';
      });
      
      // Fix stamp size - make it larger
      const stampImage = clone.querySelector('img');
      if (stampImage) {
        stampImage.style.width = 'auto';
        stampImage.style.height = '80px'; // Increased height
        stampImage.style.maxHeight = '80px';
        stampImage.style.objectFit = 'contain';
      }
      
      // Fix signature container
      const signatureContainer = clone.querySelector('.signature-container');
      if (signatureContainer) {
        signatureContainer.style.height = 'auto';
        signatureContainer.style.minHeight = '100px';
      }
      
      // Remove all height constraints
      const heightElements = clone.querySelectorAll('[class*="h-"], [class*="min-h"]');
      heightElements.forEach(el => {
        el.style.height = 'auto';
        el.style.minHeight = 'auto';
      });
      
      // Ensure proper text wrapping
      const allElements = clone.querySelectorAll('*');
      allElements.forEach(el => {
        el.style.overflow = 'visible';
        el.style.textOverflow = 'clip';
        el.style.whiteSpace = 'normal';
        el.style.wordWrap = 'break-word';
      });
      
      document.body.appendChild(clone);
      
      // Wait for images to load
      const images = clone.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      
      await new Promise(r => setTimeout(r, 200)); // Reduced wait
      
      const cloneRect = clone.getBoundingClientRect();
      
      // Capture with optimized scale for smaller file size
      const canvas = await html2canvas(clone, {
        scale: 1.2, // Reduced from 3 to save size
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: cloneRect.width,
        windowHeight: cloneRect.height,
        imageTimeout: 15000,
      });
      
      document.body.removeChild(clone);
      
      // Create PDF - Optimized for size
      const imgData = canvas.toDataURL('image/jpeg', 0.75); // Use JPEG with compression
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable jsPDF compression
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const imgRatio = imgWidth / imgHeight;
      const pageRatio = availableWidth / availableHeight;
      
      let finalWidth, finalHeight;
      
      if (imgRatio > pageRatio) {
        finalWidth = availableWidth;
        finalHeight = availableWidth / imgRatio;
      } else {
        finalHeight = availableHeight;
        finalWidth = availableHeight * imgRatio;
      }
      
      const xPos = (pdfWidth - finalWidth) / 2;
      const yPos = (pdfHeight - finalHeight) / 2;
      
      // Use FAST compression for image adding
      pdf.addImage(imgData, 'JPEG', xPos, yPos, finalWidth, finalHeight, undefined, 'FAST');
      pdf.save(`Transport-Receipt-${id}.pdf`);
      
    } catch (err) {
      console.error('PDF Download failed:', err);
      alert('Failed to generate PDF. Please try printing.');
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
  const goods = [
    {
      sr: 1,
      desc: displayData.products || 'Oil',
      pkgType: 'TANKER',
      hsn: '-',
      pkgs: '-',
      actualWt: `${displayData.net_wt || '0.00'}`,
      chargedWt: `${displayData.net_wt || '0.00'}`,
      unit: displayData.wt_type || 'KGS'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white flex justify-center">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            border: 2px solid black !important;
            font-size: 10px !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print-small-text {
            font-size: 9px !important;
          }
          .grid {
            height: auto !important;
            overflow: visible !important;
          }
          [class*="h-"] {
            height: auto !important;
            min-height: auto !important;
          }
          .truncate {
            overflow: visible !important;
            white-space: normal !important;
          }
          .break-words {
            word-wrap: break-word !important;
          }
          /* Fix stamp in print */
          img {
            height: 80px !important;
            width: auto !important;
            max-height: 80px !important;
          }
        }
        
        /* Screen styles */
        .print-container {
          width: 100%;
          max-width: 280mm;
          margin: 0 auto;
        }
        
        .grid {
          display: grid;
        }
        
        .break-words {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* Fix stamp container */
        .signature-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100px;
        }
        
        /* Ensure stamp is properly sized */
        .stamp-image {
          height: 80px;
          width: auto;
          max-width: 100%;
          object-fit: contain;
        }
      `}</style>

      <div className="w-full max-w-[280mm] bg-white shadow-lg print:shadow-none mb-8 print:mb-0">

        {/* Action Buttons */}
        <div className="no-print p-4 flex justify-end gap-4 border-b">
          <button
            onClick={printReceipt}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium ${downloading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {downloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* Receipt Container */}
        <div ref={receiptRef} className="print-container border-2 border-black m-0 text-black font-sans text-[11px] leading-relaxed pb-2">

          {/* 1. Header Section */}
          <div className="text-center p-3 pb-2">
            <h1 className="text-2xl font-extrabold uppercase tracking-wide">GYANTI MULTISERVICES PVT. LTD.</h1>
            <div className="text-xs font-bold mt-1">
              <p>NAKHA No. 1, MOHARIPUR, GORAKHPUR, UTTAR PRADESH – 273007</p>
              <p>Email: accounts@gyanti.in</p>
            </div>
          </div>

          {/* 2. Top Grid: Notice | Owner's Risk | LR Details */}
          <div className="grid grid-cols-12 border-t border-black">
            {/* Notice */}
            <div className="col-span-4 border-r border-black flex flex-col">
              <div className="font-bold text-center border-b border-black py-1">Notice</div>
              <div className="p-2 text-[9px] text-justify leading-snug flex-grow">
                Without the consignee's written permission this consignment will not be diverted, re-routed, or rebooked and it should be delivered at the destination. Lorry Receipt will be delivered to the only consignee. Without prior approval, Lorry Receipt can not be handover to anyone.
              </div>
            </div>

            {/* Owner's Risk */}
            <div className="col-span-3 border-r border-black flex flex-col">
              <div className="font-bold text-left pl-2 py-1 border-b border-black">AT OWNER'S RISK</div>
              <div className="p-2 space-y-1">
                <p><span className="font-bold">GST No.:</span> {displayData.consigner_gst || '09AAGCG6220R1Z3'}</p>
                <p><span className="font-bold">PAN No.:</span> -</p>
              </div>
            </div>

            {/* LR Details */}
            <div className="col-span-5 p-2 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span><span className="font-bold">LR Date:</span> {formatDate(displayData.lr_date)}</span>
                <span><span className="font-bold">LR No:</span> {displayData.lr_id || ''}</span>
              </div>
              <div className="flex justify-between">
                <span><span className="font-bold">Truck/Vehicle No.:</span> {displayData.tanker_no || '-'}</span>
                <span><span className="font-bold">Transport Mode:</span> By Road</span>
              </div>
              <div className="flex justify-between">
                <span><span className="font-bold">From:</span> "{displayData.from_location || '-'}"</span>
                <span><span className="font-bold">To:</span> "{displayData.to_location || '-'}"</span>
              </div>
              <div className="flex justify-between">
                <span><span className="font-bold">Delivery Type:</span> Door</span>
                <span><span className="font-bold">Payment Status:</span> To be Billed</span>
              </div>
            </div>
          </div>

          {/* 3. Consignor | Consignee | Insurance */}
          <div className="grid grid-cols-12 border-t border-black">
            {/* Consignor */}
            <div className="col-span-4 border-r border-black p-2 text-[10px] space-y-0.5">
              <div className="font-bold mb-0.5 break-words">Consignor: {displayData.consigner || '-'}</div>
              <div className="flex justify-between mb-0.5 flex-wrap gap-1">
                <span><span className="font-bold">GST No:</span> {displayData.gst || '-'}</span>
                <span><span className="font-bold">Mobile:</span> {displayData.mobile_1 || '-'}</span>
              </div>
              <div className="mb-0.5 leading-tight break-words"><span className="font-bold">Address:</span> {displayData.address_1 || '-'}</div>
              <div className="mb-0.5 break-words"><span className="font-bold">E-Way Bill:</span> {displayData.gp_no || '-'}</div>
              <div className="mb-0.5"><span className="font-bold">Generated on:</span> {formatDate(displayData.created_at || new Date())}</div>
              <div className="mb-0.5"><span className="font-bold">Invoice:</span> {displayData.invoice_no || '-'}</div>
            </div>

            {/* Consignee */}
            <div className="col-span-5 border-r border-black p-2 text-[10px] space-y-0.5">
              <div className="font-bold mb-0.5 break-words">Consignee: {displayData.consignee || '-'}</div>
              <div className="flex justify-between mb-0.5 flex-wrap gap-1">
                <span><span className="font-bold">GST No:</span> {displayData.gst_no || '-'}</span>
                <span><span className="font-bold">Mobile:</span> {displayData.mobile_2 || '-'}</span>
              </div>
              <div className="mb-0.5 leading-tight break-words"><span className="font-bold">Address:</span> {displayData.address_2 || '-'}</div>
            </div>

            {/* Insurance */}
            <div className="col-span-3 flex items-center justify-center p-3 text-center text-[10px]">
              Insurance details is not available or not insured.
            </div>
          </div>

          {/* 4. Main Table Section */}
          <div className="grid grid-cols-12 border-t border-black">

            {/* LEFT: Goods Table */}
            <div className="col-span-8 border-r border-black flex flex-col">
              {/* Header */}
              <div className="grid grid-cols-12 border-b border-black text-center font-bold text-[10px] bg-gray-50">
                <div className="col-span-1 py-2 border-r border-black">Sr no.</div>
                <div className="col-span-3 py-2 border-r border-black">Product / Material</div>
                <div className="col-span-2 py-2 border-r border-black leading-tight">Packaging Type<br />(LxBxH)</div>
                <div className="col-span-2 py-2 border-r border-black">HSN Code</div>
                <div className="col-span-1 py-2 border-r border-black leading-tight">Articles<br />Packages</div>
                <div className="col-span-1 py-2 border-r border-black leading-tight">Actual<br />Weight</div>
                <div className="col-span-1 py-2 border-r border-black leading-tight">Charge<br />Weight</div>
                <div className="col-span-1 py-2 text-[9px] leading-tight">Freight Rate</div>
              </div>

              {/* Rows */}
              <div>
                {goods.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 text-center text-[10px] py-3 border-b border-black">
                    <div className="col-span-1 border-r border-black px-1 flex items-center justify-center">{item.sr}</div>
                    <div className="col-span-3 border-r border-black font-bold px-1 break-words text-left flex items-center">{item.desc}</div>
                    <div className="col-span-2 border-r border-black px-1 break-words flex items-center justify-center">{item.pkgType}</div>
                    <div className="col-span-2 border-r border-black px-1 flex items-center justify-center">{item.hsn}</div>
                    <div className="col-span-1 border-r border-black px-1 flex items-center justify-center">{item.pkgs}</div>
                    <div className="col-span-1 border-r border-black px-1 flex flex-col items-center justify-center">
                      <span>{item.actualWt}</span>
                      <span className="text-[9px]">{item.unit}</span>
                    </div>
                    <div className="col-span-1 border-r border-black px-1 flex flex-col items-center justify-center">
                      <span>{item.chargedWt}</span>
                      <span className="text-[9px]">{item.unit}</span>
                    </div>
                    <div className="col-span-1 px-1 flex items-center justify-center">-</div>
                  </div>
                ))}
              </div>

              {/* Goods Footer */}
              <div className="grid grid-cols-12 border-t border-black text-[10px]">
                <div className="col-span-8 border-r border-black p-2 font-bold break-words">
                  WEIGHT GUARANTEE: {goods[0].actualWt} {goods[0].unit}
                </div>
                <div className="col-span-1 border-r border-black p-2 text-center flex items-center justify-center">
                  <span className="font-bold">Total:</span> 0
                </div>
                <div className="col-span-1 border-r border-black p-2 text-center font-bold flex flex-col items-center justify-center">
                  <span>Total:</span>
                  <span>{goods[0].actualWt}<br />{goods[0].unit}</span>
                </div>
                <div className="col-span-1 border-r border-black p-2 text-center font-bold flex flex-col items-center justify-center">
                  <span>Total:</span>
                  <span>{goods[0].chargedWt}<br />{goods[0].unit}</span>
                </div>
                <div className="col-span-1 bg-gray-50"></div>
              </div>

              <div className="border-t border-black p-2 font-bold text-[10px] break-words">
                Other Remark: {displayData.remarks || ''}
              </div>
            </div>

            {/* RIGHT: Freight Details */}
            <div className="col-span-4 flex flex-col text-[10px]">
              {/* Total Highlight */}
              <div className="flex justify-between border-b border-black px-3 py-2 font-bold bg-gray-100">
                <span className="text-right flex-1">Total Freight</span>
                <span className="w-16 text-right">0</span>
              </div>

              <div className="flex justify-between border-b border-black px-3 py-2">
                <span className="text-right flex-1">Advance Paid</span>
                <span className="font-bold w-16 text-right">0</span>
              </div>

              <div className="flex justify-between border-b border-black px-3 py-2 font-bold bg-gray-100">
                <span className="text-right flex-1">Remaining Payable Amount</span>
                <span className="w-16 text-right">0</span>
              </div>

              {/* Payable By Section */}
              <div className="px-3 py-2 space-y-1 font-bold border-b border-black">
                <div className="break-words">GST Payable by: Consignee</div>
                <div className="break-words">Remaining Amount to be paid by: Consignor</div>
              </div>

              {/* Signature with larger stamp */}
              <div className="signature-container mt-auto text-center px-3 py-4">
                <div className="text-[10px] mb-3 font-semibold">For GYANTI MULTISERVICES PVT. LTD</div>
                <div className="flex items-center justify-center min-h-[100px]">
                  <img 
                    src="/mpcl_stamp.jpg" 
                    alt="Company Stamp" 
                    className="stamp-image"
                    style={{ height: '80px', width: 'auto', objectFit: 'contain' }}
                  />
                </div>
                <div className="border-t border-black w-2/3 mx-auto mt-3"></div>
                <div className="text-[10px] mt-1 font-medium">Authorized Signatory</div>
              </div>
            </div>
          </div>

          {/* 5. Bottom Section: Disclaimer | Demurrage */}
          <div className="grid grid-cols-12 border-t border-black text-[10px]">
            <div className="col-span-6 border-r border-black p-2 flex items-center justify-center text-center italic">
              <div className="break-words">
                "Total amount of goods as per the invoice"<br />
                This is computer generated LR/ Bilty.
              </div>
            </div>
            <div className="col-span-6 p-2 text-center">
              <div className="font-bold border-b border-black w-max mx-auto mb-1 px-2">Schedule of demurrage charges</div>
              <div>Demurrage charges applicable from reporting time after: <span className="font-bold">1 Hour</span></div>
              <div>Applicable Charge : <span className="font-bold">₹ 0 Per Hour</span></div>
            </div>
          </div>

          {/* 6. Footer */}
          <div className="border-t border-black p-2 text-[10px] font-bold">
            Service Area: All India
            <div className="mt-4 border-t border-black w-1/3 pt-1">
              Receiver's Comments:
            </div>
          </div>

        </div>
      </div>
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