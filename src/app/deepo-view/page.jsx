'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Inner component that uses useSearchParams
function DeepoViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [deepoData, setDeepoData] = useState(null);
  const [items, setItems] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchDeepoData();
    }
  }, [id]);

  const fetchDeepoData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/deepo-view?id=${id}`);
      const result = await response.json();

      if (result.success) {
        setDeepoData(result.data.deepo);
        setItems(result.data.items);
        setPdfFiles(result.data.pdfFiles);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to load deepo data');
    } finally {
      setLoading(false);
    }
  };

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
      
      // Add scaling class
      element.classList.add("scale-80", "origin-top-left", "w-[125%]");
      
      const opt = {
        margin: 0,
        filename: `deepo-details-${id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          scrollY: 0,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: 'avoid-all' }
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          // Remove scaling class after PDF generation
          element.classList.remove("scale-80", "origin-top-left", "w-[125%]");
        });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deepo details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={goBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!deepoData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No deepo data found</p>
          <button
            onClick={goBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="overflow-x-auto">
          <div 
            id="pdf-content"
            className="bg-white shadow-sm border border-gray-200 transition-all duration-200"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              padding: '15mm',
              boxSizing: 'border-box'
            }}
          >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Left Logo" 
              className="h-16 w-auto"
            />
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold text-gray-800">
                GYANTI MULTISERVICES PVT. LTD.
              </h2>
              <div className="text-xs text-gray-600 mt-1 leading-tight">
                <div>
                  <em><strong>Registered Office</strong></em>: Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007
                </div>
                <div>E-Mail – accounts@gyanti.in</div>
                <div>GSTIN – 09AAGCG6220R1Z3, CIN No. U15549UP2016PTC088333</div>
              </div>
            </div>
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Right Logo" 
              className="h-16 w-auto"
            />
          </div>

          {/* Deepo Details */}
          <div className="text-center font-bold text-lg bg-gray-100 py-2 rounded mb-4">
            Deepo Details
          </div>

          <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
            <tbody>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium w-1/4">
                  First Driver
                </th>
                <td className="border border-gray-300 px-3 py-2 w-1/4">
                  {deepoData.first_driver}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium w-1/4">
                  First Mobile
                </th>
                <td className="border border-gray-300 px-3 py-2 w-1/4">
                  {deepoData.first_mobile}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Licence Plate
                </th>
                <td className="border border-gray-300 px-3 py-2">
                  {deepoData.licence_plate}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Diesel LTR
                </th>
                <td className="border border-gray-300 px-3 py-2">
                  {deepoData.diesel_ltr}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Opening Station
                </th>
                <td className="border border-gray-300 px-3 py-2">
                  {deepoData.opening_station}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Closing Station
                </th>
                <td className="border border-gray-300 px-3 py-2">
                  {deepoData.closing_station}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Start Date
                </th>
                <td className="border border-gray-300 px-3 py-2">
                  {deepoData.first_start_date}
                </td>
                {deepoData.closing_date && (
                  <>
                    <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                      Closing Date
                    </th>
                    <td className="border border-gray-300 px-3 py-2">
                      {deepoData.closing_date}
                    </td>
                  </>
                )}
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Remarks
                </th>
                <td className="border border-gray-300 px-3 py-2" colSpan="3">
                  {deepoData.remarks}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Item Checklist */}
          <div className="text-center font-bold text-lg bg-gray-100 py-2 rounded mb-4">
            Item Checklist
          </div>

          <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Item Name
                </th>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Pcs
                </th>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Description
                </th>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Opening Status
                </th>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                  Closing Status
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2">
                      {item.item_name}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {item.pcs}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {item.description}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {item.opening_status}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {item.closing_status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td 
                    className="border border-gray-300 px-3 py-2 text-center" 
                    colSpan="9"
                  >
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Company Stamp */}
          <div className="text-right mt-8">
            <img 
              src="/mpcl_stamp.jpg" 
              alt="Company Stamp" 
              className="h-32 w-auto inline-block"
            />
          </div>

          {/* Attachments */}
          <div className="text-center font-bold text-lg bg-gray-100 py-2 rounded mb-4 mt-8">
            Attachments
          </div>

          {pdfFiles.length > 0 ? (
            <div className="space-y-4">
              {pdfFiles.map((file, index) => {
                const fileExtension = file.split('.').pop()?.toLowerCase();
                const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);
                const isPDF = fileExtension === 'pdf';
                
                return (
                  <div 
                    key={index}
                    className="border border-gray-300 rounded p-3"
                  >
                    {isImage ? (
                      <img 
                        src={file} 
                        alt={`Attachment ${index + 1}`}
                        className="max-w-full h-auto border border-gray-200 rounded"
                        crossOrigin="anonymous"
                      />
                    ) : isPDF ? (
                      <div>
                        {/* Optional: PDF preview image if available */}
                        {file.replace('.pdf', '.jpg') && (
                          <img 
                            src={file.replace('.pdf', '.jpg')}
                            alt="PDF Preview"
                            className="max-w-full h-auto border border-gray-200 rounded mb-2"
                          />
                        )}
                        <embed 
                          src={file}
                          type="application/pdf"
                          width="100%"
                          height="500"
                          className="border border-gray-200 rounded"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        Unsupported file type: {fileExtension}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No attachments found
            </p>
          )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-6 print:hidden">
          <button
            onClick={goBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Back
          </button>
          <button
            onClick={generatePDF}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Download as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function DeepoView() {
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
                  <p className="mt-4 text-gray-600">Loading deepo view...</p>
                </div>
              </div>
            }
          >
            <DeepoViewContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
