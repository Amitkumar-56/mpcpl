'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

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
        filename: `tanker-details-${tankerId}.pdf`,
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
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
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Action Buttons */}
      <div className="max-w-4xl mx-auto px-4 mb-6 flex justify-center space-x-4">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back
        </button>
        <button
          onClick={generatePDF}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Download as PDF
        </button>
      </div>

      {/* A4 Container */}
      <div id="pdf-content" className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
        {/* Header */}
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

        {/* Tanker Details Section */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 bg-gray-100 py-2 rounded-lg">
            Tanker Details
          </h2>
        </div>

        {Object.keys(tankerData).length > 0 ? (
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
                {tankerData.status && (
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left">Status</th>
                    <td className="border border-gray-300 px-4 py-2" colSpan="3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tankerData.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tankerData.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-red-600 py-4">
            No tanker data found!
          </div>
        )}

        {/* Item Checklist Section */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 bg-gray-100 py-2 rounded-lg">
            Item Checklist
          </h2>
        </div>

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

        {/* Company Stamp */}
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

        {/* PDF Images */}
        {pdfImages.length > 0 && (
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
        )}
      </div>

      {/* PDF Scaling Styles */}
      <style jsx global>{`
        .scale-fit {
          transform: scale(0.8);
          transform-origin: top left;
          width: 125%;
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense
export default function ApproveTanker() {
  return (
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
  );
}