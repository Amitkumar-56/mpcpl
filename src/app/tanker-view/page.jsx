'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import AuditLogs from '@/components/AuditLogs';

// Loading components
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading tanker data...</p>
      </div>
    </div>
  );
}

function PDFSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 mb-6 flex justify-center space-x-4">
        <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
      </div>
      <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
        {/* Skeleton content */}
      </div>
    </div>
  );
}

function ErrorDisplay({ error, onRetry }) {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-600 text-xl mb-4">❌</div>
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <div className="space-x-4">
          <button 
            onClick={onRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

// Action Buttons Component
function ActionButtons({ onBack, onDownloadPDF, generatingPDF }) {
  return (
    <div className="max-w-4xl mx-auto px-4 mb-6 flex justify-center space-x-4">
      <button
        onClick={onBack}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        disabled={generatingPDF}
      >
        <span className="text-lg">←</span>
        <span>Back</span>
      </button>
      <button
        onClick={onDownloadPDF}
        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={generatingPDF}
      >
        {generatingPDF ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Generating PDF...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </>
        )}
      </button>
    </div>
  );
}

function TankerDetails({ tankerData }) {
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

  if (Object.keys(tankerData).length === 0) {
    return (
      <div className="text-center text-red-600 py-4">
        No tanker data found!
      </div>
    );
  }

  return (
    <div className="mb-8">
      <table className="w-full border-collapse border border-gray-800 text-xs mb-4">
        <tbody>
          <tr>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold w-1/5">First Driver</th>
            <td className="border border-gray-800 px-3 py-2 w-3/10">{tankerData.first_driver || '-'}</td>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold w-1/5">First Mobile</th>
            <td className="border border-gray-800 px-3 py-2 w-3/10">{tankerData.first_mobile || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Licence Plate</th>
            <td className="border border-gray-800 px-3 py-2">{tankerData.licence_plate || '-'}</td>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Diesel LTR</th>
            <td className="border border-gray-800 px-3 py-2">{tankerData.diesel_ltr || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Opening Station</th>
            <td className="border border-gray-800 px-3 py-2">{tankerData.opening_station || '-'}</td>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Closing Station</th>
            <td className="border border-gray-800 px-3 py-2">{tankerData.closing_station || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Opening Meter</th>
            <td className="border border-gray-800 px-3 py-2">{tankerData.opening_meter || '-'}</td>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Closing Meter</th>
            <td className="border border-gray-800 px-3 py-2">{tankerData.closing_meter || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Start Date</th>
            <td className="border border-gray-800 px-3 py-2">{formatDate(tankerData.first_start_date)}</td>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Closing Date</th>
            <td className="border border-gray-800 px-3 py-2">{formatDate(tankerData.closing_date) || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-800 px-3 py-2 bg-gray-100 font-bold">Remarks</th>
            <td className="border border-gray-800 px-3 py-2" colSpan="3">
              {tankerData.remarks || '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ItemChecklist({ items }) {
  return (
    <div className="mb-8">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-800 text-xs">
          <thead>
            <tr>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold">Item Name</th>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold text-center">Pcs</th>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold">Description</th>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold text-center">Opening Status</th>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold">Opening Driver Sign</th>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold">Opening Checker Sign</th>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold text-center">Closing Status</th>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold">Closing Driver Sign</th>
              <th className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold">Closing Checker Sign</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-800 px-2 py-1">{item.item_name || '-'}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{item.pcs || '-'}</td>
                  <td className="border border-gray-800 px-2 py-1">{item.description || '-'}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{item.opening_status || '-'}</td>
                  <td className="border border-gray-800 px-2 py-1">{item.opening_driver_sign || '-'}</td>
                  <td className="border border-gray-800 px-2 py-1">{item.opening_checker_sign || '-'}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{item.closing_status || '-'}</td>
                  <td className="border border-gray-800 px-2 py-1">{item.closing_driver_sign || '-'}</td>
                  <td className="border border-gray-800 px-2 py-1">{item.closing_checker_sign || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="border border-gray-800 px-2 py-1 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Simple PDF Generation Function
async function generatePDFFromElement(element, fileName) {
  try {
    // Create canvas from element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: function(clonedDoc, clonedElement) {
        // Fix any styling issues in cloned element
        clonedElement.style.width = '210mm';
        clonedElement.style.padding = '15mm';
        clonedElement.style.boxSizing = 'border-box';
        
        // Ensure all content is visible
        const allElements = clonedElement.querySelectorAll('*');
        allElements.forEach(el => {
          el.style.boxSizing = 'border-box';
        });
      }
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image to PDF
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
    
    // Save the PDF
    pdf.save(fileName);
    
    return true;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}

// Main PDF Content Component
function PDFContent({ tankerData, items }) {
  const router = useRouter();
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const downloadPDF = async () => {
    if (!tankerData.id) {
      alert('Tanker ID not found');
      return;
    }

    setGeneratingPDF(true);
    
    try {
      // Get the PDF content element
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('PDF content element not found');
      }

      // Create a temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '0';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm';
      tempContainer.style.minHeight = '297mm';
      tempContainer.style.padding = '15mm';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.boxSizing = 'border-box';
      tempContainer.style.zIndex = '9999';
      tempContainer.style.opacity = '0';
      
      // Copy the content (without action buttons)
      const contentToCopy = element.cloneNode(true);
      
      // Remove action buttons if they exist in the cloned content
      const buttons = contentToCopy.querySelector('.max-w-4xl.mx-auto.px-4.mb-6');
      if (buttons) {
        buttons.remove();
      }
      
      tempContainer.appendChild(contentToCopy);
      document.body.appendChild(tempContainer);
      
      // Generate PDF
      const fileName = `Tanker_${tankerData.licence_plate || tankerData.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
      await generatePDFFromElement(tempContainer, fileName);
      
      // Clean up
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error('Error in downloadPDF:', error);
      
      // Fallback: Try direct generation without temp container
      try {
        const element = document.getElementById('pdf-content');
        if (element) {
          // Hide action buttons temporarily
          const buttons = element.querySelector('.max-w-4xl.mx-auto.px-4.mb-6');
          const originalDisplay = buttons?.style.display;
          if (buttons) {
            buttons.style.display = 'none';
          }
          
          const fileName = `Tanker_${tankerData.licence_plate || tankerData.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
          await generatePDFFromElement(element, fileName);
          
          // Restore buttons
          if (buttons && originalDisplay !== undefined) {
            buttons.style.display = originalDisplay;
          }
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert('Failed to generate PDF. Please check console for details.');
      }
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Action Buttons */}
      <ActionButtons 
        onBack={handleBack}
        onDownloadPDF={downloadPDF}
        generatingPDF={generatingPDF}
      />

      {/* PDF Content */}
      <div 
        id="pdf-content" 
        className="bg-white shadow-lg mx-auto" 
        style={{ 
          width: '210mm', 
          minHeight: '297mm', 
          padding: '15mm',
          boxSizing: 'border-box',
          fontSize: '12px'
        }}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-6 border-b-2 border-gray-800 pb-4">
          <div className="w-16 flex-shrink-0">
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Company Logo" 
              className="w-full h-auto"
              crossOrigin="anonymous"
              onError={(e) => {
                e.target.style.display = 'none';
                const placeholder = e.target.nextElementSibling;
                if (placeholder) {
                  placeholder.classList.remove('hidden');
                }
              }}
            />
            <div className="hidden border-2 border-gray-300 h-16 w-16 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
          </div>
          
          <div className="text-center flex-1 px-6">
            <h1 className="text-lg font-bold text-gray-900 mb-2">GYANTI MULTISERVICES PVT. LTD.</h1>
            <p className="text-xs text-gray-600 leading-tight">
              <strong>Registered Office</strong>: Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007<br />
              E-Mail – accounts@gyanti.in<br />
              GSTIN – 09AAGCG6220R1Z3, CIN No. U15549UP2016PTC088333
            </p>
          </div>
          
          <div className="w-16 flex-shrink-0">
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Company Logo" 
              className="w-full h-auto"
              crossOrigin="anonymous"
              onError={(e) => {
                e.target.style.display = 'none';
                const placeholder = e.target.nextElementSibling;
                if (placeholder) {
                  placeholder.classList.remove('hidden');
                }
              }}
            />
            <div className="hidden border-2 border-gray-300 h-16 w-16 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
          </div>
        </div>

        {/* Tanker Details Section */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-gray-800 bg-gray-100 py-2 px-5 rounded inline-block">
            Tanker Details
          </h2>
        </div>

        <TankerDetails tankerData={tankerData} />

        {/* Item Checklist Section */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-gray-800 bg-gray-100 py-2 px-5 rounded inline-block">
            Item Checklist
          </h2>
        </div>

        <ItemChecklist items={items} />

        {/* Company Stamp */}
        <div className="text-right mt-8">
          <div className="inline-block">
            <img 
              src="/mpcl_stamp.jpg" 
              alt="Stamp" 
              className="h-20 w-auto"
              crossOrigin="anonymous"
              onError={(e) => {
                e.target.style.display = 'none';
                const placeholder = e.target.nextElementSibling;
                if (placeholder) {
                  placeholder.classList.remove('hidden');
                  placeholder.classList.add('flex');
                }
              }}
            />
            <div className="hidden border-2 border-dashed border-gray-400 w-20 h-20 flex items-center justify-center text-xs text-gray-500 text-center">
              Company<br />Stamp
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main content component
function TankerViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tankerId = searchParams.get('id');
  
  const [tankerData, setTankerData] = useState({});
  const [items, setItems] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tankerId) {
      fetchTankerData();
    }
  }, [tankerId]);

  const fetchTankerData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/tanker-view?id=${tankerId}`);
      const result = await response.json();

      if (result.success) {
        setTankerData(result.data.tanker);
        setItems(result.data.items);
        setAuditLogs(result.data.audit_logs || []);
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

  const handleRetry = () => {
    fetchTankerData();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      <PDFContent tankerData={tankerData} items={items} />
      
      {/* Audit Logs Section */}
      {auditLogs && auditLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Logs</h2>
          <AuditLogs logs={auditLogs} title="Activity Logs" recordType="tanker" />
        </div>
      )}
    </div>
  );
}

// Main component with Suspense boundary
export default function TankerView() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Suspense fallback={<PDFSkeleton />}>
            <TankerViewContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
