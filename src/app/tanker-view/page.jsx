'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

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
      {/* Action Buttons Skeleton */}
      <div className="max-w-4xl mx-auto px-4 mb-6 flex justify-center space-x-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
        ))}
      </div>

      {/* A4 Container Skeleton */}
      <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6 border-b-2 border-gray-800 pb-4">
          <div className="h-16 w-16 bg-gray-200 rounded animate-pulse"></div>
          <div className="text-center flex-1 mx-6">
            <div className="h-6 bg-gray-200 rounded w-64 mx-auto mb-2 animate-pulse"></div>
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-80 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-56 mx-auto animate-pulse"></div>
            </div>
          </div>
          <div className="h-16 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Tanker Details Skeleton */}
        <div className="text-center mb-6">
          <div className="h-8 bg-gray-200 rounded-lg w-48 mx-auto animate-pulse"></div>
        </div>

        <div className="mb-8">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Item Checklist Skeleton */}
        <div className="text-center mb-6">
          <div className="h-8 bg-gray-200 rounded-lg w-40 mx-auto animate-pulse"></div>
        </div>

        <div className="mb-8">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr>
                  {[...Array(9)].map((_, i) => (
                    <th key={i} className="border border-gray-300 px-3 py-2">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(3)].map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {[...Array(9)].map((_, cellIndex) => (
                      <td key={cellIndex} className="border border-gray-300 px-3 py-2">
                        <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stamp Skeleton */}
        <div className="text-right mt-8">
          <div className="inline-block w-24 h-24 bg-gray-200 rounded border-2 border-gray-400 animate-pulse"></div>
        </div>
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
function ActionButtons({ onBack, onDownloadPDF, onPrint }) {
  return (
    <div className="max-w-4xl mx-auto px-4 mb-6 flex justify-center space-x-4 print:hidden">
      <button
        onClick={onBack}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Back
      </button>
      <button
        onClick={onDownloadPDF}
        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        Download as PDF
      </button>
      <button
        onClick={onPrint}
        className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
      >
        Print
      </button>
    </div>
  );
}

// Header Component
function PDFHeader() {
  return (
    <div className="flex items-center justify-between mb-6 border-b-2 border-gray-800 pb-4">
      <img 
        src="/LOGO_NEW.jpg" 
        alt="Company Logo" 
        className="h-16 w-auto"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div className="hidden border-2 border-gray-300 h-16 w-16 flex items-center justify-center text-xs text-gray-500">
        LOGO
      </div>
      
      <div className="text-center flex-1 mx-6">
        <h1 className="text-2xl font-bold text-gray-900">GYANTI MULTISERVICES PVT. LTD.</h1>
        <p className="text-gray-600 text-sm mt-2">
          <em><strong>Registered Office</strong></em>: Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007<br />
          E-Mail – accounts@gyanti.in<br />
          GSTIN – 09AAGCG6220R1Z3, CIN No. U15549UP2016PTC088333
        </p>
      </div>
      
      <img 
        src="/LOGO_NEW.jpg" 
        alt="Company Logo" 
        className="h-16 w-auto"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div className="hidden border-2 border-gray-300 h-16 w-16 flex items-center justify-center text-xs text-gray-500">
        LOGO
      </div>
    </div>
  );
}

// Tanker Details Component
function TankerDetails({ tankerData }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
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
      <table className="w-full border-collapse border border-gray-300 text-sm mb-4">
        <tbody>
          <tr>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">First Driver</th>
            <td className="border border-gray-300 px-4 py-2">{tankerData.first_driver || '-'}</td>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">First Mobile</th>
            <td className="border border-gray-300 px-4 py-2">{tankerData.first_mobile || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Licence Plate</th>
            <td className="border border-gray-300 px-4 py-2">{tankerData.licence_plate || '-'}</td>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Diesel LTR</th>
            <td className="border border-gray-300 px-4 py-2">{tankerData.diesel_ltr || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Opening Station</th>
            <td className="border border-gray-300 px-4 py-2">{tankerData.opening_station || '-'}</td>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Closing Station</th>
            <td className="border border-gray-300 px-4 py-2">{tankerData.closing_station || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Opening Meter</th>
            <td className="border border-gray-300 px-4 py-2">{tankerData.opening_meter || '-'}</td>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Closing Meter</th>
            <td className="border border-gray-300 px-4 py-2">{tankerData.closing_meter || '-'}</td>
          </tr>
          <tr>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Start Date</th>
            <td className="border border-gray-300 px-4 py-2">{formatDate(tankerData.first_start_date)}</td>
            {tankerData.closing_date && (
              <>
                <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Closing Date</th>
                <td className="border border-gray-300 px-4 py-2">{formatDate(tankerData.closing_date)}</td>
              </>
            )}
          </tr>
          <tr>
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Remarks</th>
            <td className="border border-gray-300 px-4 py-2" colSpan="3">
              {tankerData.remarks || '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Item Checklist Component
function ItemChecklist({ items }) {
  return (
    <div className="mb-8">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Item Name</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Pcs</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Description</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Opening Status</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Opening Driver Sign</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Opening Checker Sign</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Closing Status</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Closing Driver Sign</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100">Closing Checker Sign</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">{item.item_name || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.pcs || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.description || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.opening_status || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.opening_driver_sign || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.opening_checker_sign || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.closing_status || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.closing_driver_sign || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.closing_checker_sign || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="border border-gray-300 px-3 py-2 text-center text-gray-500">
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

// Company Stamp Component
function CompanyStamp() {
  return (
    <div className="text-right mt-8">
      <div className="inline-block border-2 border-gray-400 p-4 rounded">
        <img 
          src="/mpcl_stamp.jpg" 
          alt="Company Stamp" 
          className="h-24 w-auto"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <div className="hidden border-2 border-dashed border-gray-300 w-24 h-24 flex items-center justify-center text-xs text-gray-500 text-center">
          Company<br />Stamp
        </div>
      </div>
    </div>
  );
}

// PDF Images Component
function PDFImages({ pdfImages }) {
  if (pdfImages.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Attached Documents</h3>
      </div>
      {pdfImages.map((imgPath, index) => (
        <div key={index} className="text-center mb-4">
          <img 
            src={imgPath} 
            alt={`Additional Document ${index + 1}`}
            className="max-w-full h-auto border border-gray-300 rounded-lg mx-auto"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div className="hidden border-2 border-dashed border-gray-300 w-full h-48 flex items-center justify-center text-gray-500">
            Document not available: {imgPath}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main PDF Content Component
function PDFContent({ tankerData, items, pdfImages }) {
  const router = useRouter();

  const generatePDF = async () => {
    if (typeof window === 'undefined') {
      console.error('html2pdf is not available on server');
      return;
    }
    
    const element = document.getElementById('pdf-content');
    if (!element) {
      console.error('PDF content element not found');
      return;
    }
    
    // Dynamically import html2pdf only when needed (client-side only)
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      element.classList.add("scale-fit");
      
      const opt = {
        margin: 0,
        filename: `tanker-details-${tankerData.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          scrollY: 0,
          logging: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: 'avoid-all' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove("scale-fit");
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Action Buttons */}
      <ActionButtons 
        onBack={handleBack}
        onDownloadPDF={generatePDF}
        onPrint={handlePrint}
      />

      {/* A4 Container */}
      <div id="pdf-content" className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
        {/* Header */}
        <Suspense fallback={null}>
          <PDFHeader />
        </Suspense>

        {/* Tanker Details Section */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 bg-gray-100 py-2 rounded-lg">
            Tanker Details
          </h2>
        </div>

        <Suspense fallback={null}>
          <TankerDetails tankerData={tankerData} />
        </Suspense>

        {/* Item Checklist Section */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 bg-gray-100 py-2 rounded-lg">
            Item Checklist
          </h2>
        </div>

        <Suspense fallback={null}>
          <ItemChecklist items={items} />
        </Suspense>

        {/* Company Stamp */}
        <Suspense fallback={null}>
          <CompanyStamp />
        </Suspense>

        {/* PDF Images */}
        <Suspense fallback={null}>
          <PDFImages pdfImages={pdfImages} />
        </Suspense>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:mx-0 {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
        }
        
        .scale-fit {
          transform: scale(0.8);
          transform-origin: top left;
          width: 125%;
        }
      `}</style>
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
  const [pdfImages, setPdfImages] = useState([]);
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

  const handleRetry = () => {
    fetchTankerData();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} />;
  }

  return <PDFContent tankerData={tankerData} items={items} pdfImages={pdfImages} />;
}

// Main component with Suspense boundary
export default function TankerView() {
  return (
    <Suspense fallback={<PDFSkeleton />}>
      <TankerViewContent />
    </Suspense>
  );
}