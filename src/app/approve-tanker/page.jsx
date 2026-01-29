'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';

// Inner component that uses useSearchParams
function ApproveTankerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tankerId = searchParams.get('id');
  
  const [tankerData, setTankerData] = useState({});
  const [items, setItems] = useState([]);
  const [pdfImages, setPdfImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    if (tankerId) {
      fetchTankerData();
    }
  }, [tankerId]);

  const fetchTankerData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/approve-tanker?id=${tankerId}`);
      const result = await response.json();

      if (result.success) {
        setTankerData(result.data.tanker);
        setItems(result.data.items);
        setPdfImages(result.data.pdfImages);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Error fetching tanker data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!tankerId) {
      alert('Tanker ID not found');
      return;
    }

    setGeneratingPDF(true);
    
    try {
      // Dynamically import jspdf and html2canvas separately for better control
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.getElementById('pdf-content');
      if (!element) {
        alert('PDF content not found!');
        return;
      }

      // Store original styles
      const originalStyles = {
        width: element.style.width,
        overflow: element.style.overflow
      };

      // Set fixed width for PDF generation
      element.style.width = '794px'; // A4 width in pixels (210mm * 3.78)
      element.style.overflow = 'visible';

      // Use html2canvas to capture the content
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      // Restore original styles
      element.style.width = originalStyles.width;
      element.style.overflow = originalStyles.overflow;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Scale to fit on one page if needed
      if (imgHeight > pageHeight) {
        const scaleFactor = pageHeight / imgHeight;
        // Adjust width to maintain aspect ratio
        // But wait, if we reduce width, we get whitespace on sides.
        // Actually, users usually want "Fit to Page" which might mean shrinking content.
        // Let's force fit height
        // imgWidth = imgWidth * scaleFactor; 
        // No, `addImage` takes width and height.
        // If we want to fit one page, we just set imgHeight to pageHeight (or less) and adjust width?
        // No, we should constrain by height.
        
        const scaledWidth = imgWidth * scaleFactor;
        const xOffset = (imgWidth - scaledWidth) / 2; // Center it? Or just keep left?
        
        // Let's use the scaled dimensions
        pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, pageHeight);
      } else {
        // Fits normally
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      // Save PDF
      pdf.save(`tanker-${tankerId}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Fallback to simple print method
      try {
        window.print();
      } catch (printError) {
        alert('PDF generation failed. You can use Print (Ctrl+P) instead.');
      }
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Fixed print function
  const handlePrint = () => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        alert('Please allow popups to use the print feature');
        return;
      }
      
      // Get the content to print
      const content = document.getElementById('pdf-content');
      
      if (!content) {
        alert('Print content not found!');
        return;
      }
      
      // Clone the content to avoid modifying the original
      const printContent = content.cloneNode(true);
      
      // Create HTML with embedded styles
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Tanker Details - ${tankerId || 'N/A'}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              /* A4 Container */
              .a4-container {
                width: 210mm;
                min-height: 297mm;
                padding: 15mm;
                box-sizing: border-box;
                margin: 0 auto;
                background: white;
                font-family: 'Arial', sans-serif;
              }
              
              /* Header Section */
              .header-section {
                margin-bottom: 20px;
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
              }
              
              .company-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
              }
              
              .logo-section {
                width: 60px;
                flex-shrink: 0;
              }
              
              .company-logo {
                width: 100%;
                height: auto;
                max-height: 60px;
              }
              
              .company-details {
                flex: 1;
                text-align: center;
                padding: 0 20px;
              }
              
              .company-name {
                font-size: 18px;
                font-weight: bold;
                margin: 0 0 10px 0;
                color: #000;
              }
              
              .company-address {
                font-size: 11px;
                margin: 0;
                line-height: 1.4;
                color: #333;
              }
              
              /* Section Titles */
              .section-title {
                text-align: center;
                margin: 25px 0 15px 0;
              }
              
              .section-title h2, .section-title h3 {
                background-color: #f0f0f0;
                padding: 8px 20px;
                border-radius: 4px;
                display: inline-block;
                margin: 0;
                font-size: 16px;
                color: #000;
              }
              
              /* Tables */
              .simple-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 12px;
              }
              
              .simple-table th, .simple-table td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
                vertical-align: top;
              }
              
              .simple-table th {
                background-color: #f8f8f8;
                font-weight: bold;
                width: 20%;
              }
              
              .simple-table td {
                width: 30%;
              }
              
              /* Checklist Table */
              .checklist-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin-bottom: 20px;
              }
              
              .checklist-table th, .checklist-table td {
                border: 1px solid #000;
                padding: 6px 4px;
                text-align: left;
              }
              
              .checklist-table th {
                background-color: #f8f8f8;
                font-weight: bold;
              }
              
              .checklist-table tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              
              /* Status Badge */
              .status-badge {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
              }
              
              .status-badge.approved {
                background-color: #d4edda;
                color: #155724;
              }
              
              .status-badge.pending {
                background-color: #fff3cd;
                color: #856404;
              }
              
              /* Stamp Section */
              .stamp-section {
                text-align: right;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px dashed #ccc;
              }
              
              .company-stamp {
                display: inline-block;
                position: relative;
              }
              
              .stamp-image {
                height: 80px;
                width: auto;
              }
              
              .stamp-placeholder {
                display: none;
                border: 2px dashed #ccc;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 12px;
                min-width: 100px;
                min-height: 100px;
              }
              
              .company-stamp img[style*="display: none"] + .stamp-placeholder {
                display: block;
              }
              
              /* Attachments */
              .attachments-section {
                margin-top: 30px;
              }
              
              .attachment-image {
                margin: 15px 0;
                text-align: center;
              }
              
              .document-image {
                max-width: 100%;
                height: auto;
                border: 1px solid #ccc;
                border-radius: 4px;
              }
              
              /* Utility Classes */
              .text-center { text-align: center; }
              .no-data { 
                text-align: center; 
                color: #dc3545; 
                padding: 20px; 
                font-weight: bold; 
              }
              
              /* Print-specific styles */
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                
                .a4-container {
                  width: 210mm !important;
                  min-height: 297mm !important;
                  padding: 15mm !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  background: white !important;
                }
                
                /* Prevent page breaks inside important elements */
                table { page-break-inside: avoid; }
                .section-title { page-break-after: avoid; }
                
                /* Hide print button */
                .no-print { display: none !important; }
              }
              
              @page {
                size: A4;
                margin: 15mm;
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              // Auto-print and close after printing
              window.onload = function() {
                window.print();
              };
              
              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
    } catch (error) {
      console.error('Print error:', error);
      alert('Error opening print window. You can use Ctrl+P instead.');
      
      // Fallback to browser print
      try {
        window.print();
      } catch (printError) {
        console.error('Fallback print error:', printError);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tanker data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <p className="text-red-600 text-lg">{error}</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Action Buttons - Responsive */}
      <div className="max-w-4xl mx-auto px-4 mb-6 flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
        <button
          onClick={() => router.back()}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          disabled={generatingPDF}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm sm:text-base">Back</span>
        </button>
        <button
          onClick={generatePDF}
          disabled={generatingPDF}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          id="download-pdf-btn"
        >
          {generatingPDF ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span className="text-sm sm:text-base">Generating PDF...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm sm:text-base">Download PDF</span>
            </>
          )}
        </button>
        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center no-print"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span className="text-sm sm:text-base">Print</span>
        </button>
      </div>

      {/* A4 PDF Content - SIMPLIFIED VERSION for better PDF generation */}
      <div id="pdf-content" ref={pdfRef} className="bg-white shadow-lg mx-auto a4-container pdf-optimized">
        {/* Header */}
        <div className="header-section">
          <div className="company-header">
            <div className="logo-section">
              <img 
                src="/logo.jpg" 
                alt="Company Logo" 
                className="company-logo"
                onError={(e) => {
                  e.target.src = '/uploads/1758025854383_LOGO_NEW.jpg';
                  e.target.onerror = () => {
                    e.target.style.display = 'none';
                  };
                }}
              />
            </div>
            
            <div className="company-details">
              <h1 className="company-name">GYANTI MULTISERVICES PVT. LTD.</h1>
              <p className="company-address">
                <strong>Registered Office</strong>: Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007<br />
                E-Mail – accounts@gyanti.in<br />
                GSTIN – 09AAGCG6220R1Z3, CIN No. U15549UP2016PTC088333
              </p>
            </div>
            
            <div className="logo-section">
              <img 
                src="/logo.jpg" 
                alt="Company Logo" 
                className="company-logo"
                onError={(e) => {
                  e.target.src = '/uploads/1758025854383_LOGO_NEW.jpg';
                  e.target.onerror = () => {
                    e.target.style.display = 'none';
                  };
                }}
              />
            </div>
          </div>
        </div>

        {/* Tanker Details Section */}
        <div className="section-title">
          <h2>Tanker Details</h2>
        </div>

        {Object.keys(tankerData).length > 0 ? (
          <div className="details-table">
            <table className="simple-table">
              <tbody>
                <tr>
                  <th>First Driver</th>
                  <td>{tankerData.first_driver || '-'}</td>
                  <th>First Mobile</th>
                  <td>{tankerData.first_mobile || '-'}</td>
                </tr>
                <tr>
                  <th>Licence Plate</th>
                  <td>{tankerData.licence_plate || '-'}</td>
                  <th>Diesel LTR</th>
                  <td>{tankerData.diesel_ltr || '-'}</td>
                </tr>
                <tr>
                  <th>Opening Station</th>
                  <td>{tankerData.opening_station || '-'}</td>
                  <th>Closing Station</th>
                  <td>{tankerData.closing_station || '-'}</td>
                </tr>
                <tr>
                  <th>Opening Meter</th>
                  <td>{tankerData.opening_meter || '-'}</td>
                  <th>Closing Meter</th>
                  <td>{tankerData.closing_meter || '-'}</td>
                </tr>
                <tr>
                  <th>Start Date</th>
                  <td>{formatDate(tankerData.first_start_date)}</td>
                  <th>Closing Date</th>
                  <td>{formatDate(tankerData.closing_date) || '-'}</td>
                </tr>
                <tr>
                  <th>Remarks</th>
                  <td colSpan="3">{tankerData.remarks || '-'}</td>
                </tr>
                {tankerData.status && (
                  <tr>
                    <th>Status</th>
                    <td colSpan="3">
                      <span className={`status-badge ${tankerData.status}`}>
                        {tankerData.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">No tanker data found!</div>
        )}

        {/* Item Checklist Section */}
        <div className="section-title">
          <h2>Item Checklist</h2>
        </div>

        <div className="items-table">
          <table className="checklist-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Pcs</th>
                <th>Description</th>
                <th>Opening Status</th>
                <th>Opening Driver Sign</th>
                <th>Opening Checker Sign</th>
                <th>Closing Status</th>
                <th>Closing Driver Sign</th>
                <th>Closing Checker Sign</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item_name || '-'}</td>
                    <td className="text-center">{item.pcs || '-'}</td>
                    <td>{item.description || '-'}</td>
                    <td className="text-center">{item.opening_status || '-'}</td>
                    <td>{item.opening_driver_sign || '-'}</td>
                    <td>{item.opening_checker_sign || '-'}</td>
                    <td className="text-center">{item.closing_status || '-'}</td>
                    <td>{item.closing_driver_sign || '-'}</td>
                    <td>{item.closing_checker_sign || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center">No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Company Stamp */}
        <div className="stamp-section">
          <div className="company-stamp">
            <img 
              src="/mpcl_stamp.jpg" 
              alt="Stamp" 
              className="stamp-image"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'block';
                }
              }}
            />
            <div className="stamp-placeholder">Stamp</div>
          </div>
        </div>

        {/* PDF Images */}
        {pdfImages.length > 0 && (
          <div className="attachments-section">
            <div className="section-title">
              <h3>Attached Documents</h3>
            </div>
            {pdfImages.map((imgPath, index) => (
              <div key={index} className="attachment-image">
                <img 
                  src={imgPath} 
                  alt={`Document ${index + 1}`}
                  className="document-image"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Optimization Styles */}
      <style jsx global>{`
        /* A4 Container */
        .a4-container {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          box-sizing: border-box;
          margin: auto;
          background: white;
          font-family: 'Arial', sans-serif;
        }
        
        /* Header Section */
        .header-section {
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        
        .company-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .logo-section {
          width: 60px;
          flex-shrink: 0;
        }
        
        .company-logo {
          width: 100%;
          height: auto;
          max-height: 60px;
        }
        
        .company-details {
          flex: 1;
          text-align: center;
          padding: 0 20px;
        }
        
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 10px 0;
          color: #000;
        }
        
        .company-address {
          font-size: 11px;
          margin: 0;
          line-height: 1.4;
          color: #333;
        }
        
        /* Section Titles */
        .section-title {
          text-align: center;
          margin: 25px 0 15px 0;
        }
        
        .section-title h2, .section-title h3 {
          background-color: #f0f0f0;
          padding: 8px 20px;
          border-radius: 4px;
          display: inline-block;
          margin: 0;
          font-size: 16px;
          color: #000;
        }
        
        /* Tables */
        .simple-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        
        .simple-table th, .simple-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        
        .simple-table th {
          background-color: #f8f8f8;
          font-weight: bold;
          width: 20%;
        }
        
        .simple-table td {
          width: 30%;
        }
        
        /* Checklist Table */
        .checklist-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-bottom: 20px;
        }
        
        .checklist-table th, .checklist-table td {
          border: 1px solid #000;
          padding: 6px 4px;
          text-align: left;
        }
        
        .checklist-table th {
          background-color: #f8f8f8;
          font-weight: bold;
        }
        
        .checklist-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        /* Status Badge */
        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }
        
        .status-badge.approved {
          background-color: #d4edda;
          color: #155724;
        }
        
        .status-badge.pending {
          background-color: #fff3cd;
          color: #856404;
        }
        
        /* Stamp Section */
        .stamp-section {
          text-align: right;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px dashed #ccc;
        }
        
        .company-stamp {
          display: inline-block;
          position: relative;
        }
        
        .stamp-image {
          height: 80px;
          width: auto;
        }
        
        .stamp-placeholder {
          display: none;
          border: 2px dashed #ccc;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
          min-width: 100px;
          min-height: 100px;
        }
        
        .company-stamp img[style*="display: none"] + .stamp-placeholder {
          display: block;
        }
        
        /* Attachments */
        .attachments-section {
          margin-top: 30px;
        }
        
        .attachment-image {
          margin: 15px 0;
          text-align: center;
        }
        
        .document-image {
          max-width: 100%;
          height: auto;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        
        /* Utility Classes */
        .text-center { text-align: center; }
        .no-data { 
          text-align: center; 
          color: #dc3545; 
          padding: 20px; 
          font-weight: bold; 
        }
        
        /* Print Styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .a4-container, .a4-container * {
            visibility: visible;
          }
          .a4-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 15mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          
          /* Hide buttons when printing */
          button, .no-print {
            display: none !important;
          }
        }
        
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense
export default function ApproveTanker() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Suspense 
            fallback={
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading tanker details...</p>
                </div>
              </div>
            }
          >
            <ApproveTankerContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
