'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Inner component that uses useSearchParams
function PdfLoadingUnloadingContent() {
  const searchParams = useSearchParams();
  const shipmentId = searchParams.get('shipment_id');
  
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (shipmentId) {
      fetchShipmentData();
    }
  }, [shipmentId]);

  const fetchShipmentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/loading-unloading/pdf-loading-unloading?shipment_id=${shipmentId}`);
      const result = await response.json();

      if (result.success) {
        setShipment(result.data);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Error fetching shipment data');
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
      
      const opt = {
        margin: 5,
        filename: `shipment-details-${shipmentId}.pdf`,
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
        }
      };
      
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const getFileExtension = (filename) => {
    return filename ? filename.split('.').pop().toLowerCase() : '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shipment data...</p>
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
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No shipment data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mb-6 print:hidden">
        <button
          onClick={generatePDF}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Download as PDF
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Print Directly
        </button>
      </div>

      {/* PDF Content */}
      <div id="pdf-content" className="bg-white rounded-lg shadow-lg p-6 mx-auto max-w-4xl print:shadow-none print:p-0">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 print:flex print:justify-between">
          <div className="w-16 h-16 flex items-center justify-center">
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Company Logo" 
              className="h-12 w-auto max-w-full"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'block';
                }
              }}
            />
            <div className="hidden border-2 border-gray-300 w-12 h-12 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
          </div>
          
          <div className="text-center flex-1 mx-4">
            <h2 className="text-xl font-bold text-gray-800 leading-tight">
              GYANTI MULTISERVICES PVT. LTD.
            </h2>
            <p className="text-gray-600 text-sm mt-1">Tanker Loading & Unloading Checklist</p>
          </div>
          
          <div className="w-16 h-16 flex items-center justify-center">
            <img 
              src="/LOGO_NEW.jpg" 
              alt="Company Logo" 
              className="h-12 w-auto max-w-full"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'block';
                }
              }}
            />
            <div className="hidden border-2 border-gray-300 w-12 h-12 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
          </div>
        </div>

        <hr className="border-gray-300 mb-4" />

        <h3 className="text-lg font-semibold text-center mb-4 text-gray-800">
          Supplier Gyanti Multiservices Pvt Ltd
        </h3>

        {/* Basic Information */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                Trankar No: <span className="font-normal">{shipment.tanker || 'N/A'}</span>
              </td>
              <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                Driver Name: <span className="font-normal">{shipment.driver || 'N/A'}</span>
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold">
                Dispatch From: <span className="font-normal">{shipment.dispatch || 'N/A'}</span>
              </td>
              <td className="border border-gray-400 p-2 font-semibold">
                Driver Mobile No: <span className="font-normal">{shipment.driver_mobile || 'N/A'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Loading Weights */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <thead>
            <tr>
              <th className="border border-gray-400 p-2 bg-gray-100 font-semibold w-1/3">Empty Weight (Kg)</th>
              <th className="border border-gray-400 p-2 bg-gray-100 font-semibold w-1/3">Loaded Weight (Kg)</th>
              <th className="border border-gray-400 p-2 bg-gray-100 font-semibold w-1/3">Net Weight (Kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 text-center">{shipment.empty_weight_loading || 'N/A'}</td>
              <td className="border border-gray-400 p-2 text-center">{shipment.loaded_weight_loading || 'N/A'}</td>
              <td className="border border-gray-400 p-2 text-center">{shipment.net_weight_loading || 'N/A'}</td>
            </tr>
          </tbody>
        </table>

        {/* Loading Details */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                Final Loading date & Time: <span className="font-normal">{shipment.final_loading_datetime || 'N/A'}</span>
              </td>
              <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                Entered By Name: <span className="font-normal">{shipment.entered_by_loading || 'N/A'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Seals */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                Seal No. 01: <span className="font-normal">{shipment.seal1_loading || 'N/A'}</span>
              </td>
              <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                Seal No. 02: <span className="font-normal">{shipment.seal2_loading || 'N/A'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Seal Date and Checked By */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                Seal Date & Time: <span className="font-normal">{shipment.seal_datetime_loading || 'N/A'}</span>
              </td>
              <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                Sealed By: <span className="font-normal">{shipment.sealed_by_loading || 'N/A'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Density, Temperature, Timing */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 w-1/3 font-semibold">
                Density: <span className="font-normal">{shipment.density_loading || 'N/A'}</span>
              </td>
              <td className="border border-gray-400 p-2 w-1/3 font-semibold">
                Temperature: <span className="font-normal">{shipment.temperature_loading || 'N/A'}</span>
              </td>
              <td className="border border-gray-400 p-2 w-1/3 font-semibold">
                Timing: <span className="font-normal">{shipment.timing_loading || 'N/A'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <p className="text-xs font-semibold mb-6">
          Entered by Name & time:
        </p>

        {/* Unloading Section */}
        <div className="mt-8 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
            Tanker Unloading Checklist (Customer)
          </h3>

          <p className="text-xs font-semibold mb-4">
            Customer Name: <span className="font-normal">{shipment.consignee || 'N/A'}</span>
          </p>

          {/* Unloading Weights */}
          <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
            <thead>
              <tr>
                <th className="border border-gray-400 p-2 bg-gray-100 font-semibold w-1/3">Empty Weight (Kg)</th>
                <th className="border border-gray-400 p-2 bg-gray-100 font-semibold w-1/3">Loaded Weight (Kg)</th>
                <th className="border border-gray-400 p-2 bg-gray-100 font-semibold w-1/3">Net Weight (Kg)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 text-center">{shipment.empty_weight_unloading || 'N/A'}</td>
                <td className="border border-gray-400 p-2 text-center">{shipment.loaded_weight_unloading || 'N/A'}</td>
                <td className="border border-gray-400 p-2 text-center">{shipment.net_weight_unloading || 'N/A'}</td>
              </tr>
            </tbody>
          </table>

          {/* Unloading Details */}
          <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                  Final Unloading date & Time: <span className="font-normal">{shipment.final_unloading_datetime || 'N/A'}</span>
                </td>
                <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                  Entered By Name: <span className="font-normal">{shipment.entered_by_unloading || 'N/A'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Unloading Seals */}
          <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                  Seal No. 01: <span className="font-normal">{shipment.seal1_unloading || 'N/A'}</span>
                </td>
                <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                  Seal No. 02: <span className="font-normal">{shipment.seal2_unloading || 'N/A'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Unloading Seal Date and Checked By */}
          <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                  Seal Date & Time: <span className="font-normal">{shipment.seal_datetime_unloading || 'N/A'}</span>
                </td>
                <td className="border border-gray-400 p-2 w-1/2 font-semibold">
                  Sealed By: <span className="font-normal">{shipment.sealed_by_unloading || 'N/A'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Unloading Density, Temperature, Timing */}
          <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 w-1/3 font-semibold">
                  Density: <span className="font-normal">{shipment.density_unloading || 'N/A'}</span>
                </td>
                <td className="border border-gray-400 p-2 w-1/3 font-semibold">
                  Temperature: <span className="font-normal">{shipment.temperature_unloading || 'N/A'}</span>
                </td>
                <td className="border border-gray-400 p-2 w-1/3 font-semibold">
                  Timing: <span className="font-normal">{shipment.timing_unloading || 'N/A'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-semibold">
            Entered by Name & time:
          </p>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6 print:bg-white print:border print:border-gray-300">
          <h4 className="text-sm font-semibold mb-3 text-yellow-800 print:text-gray-800">Important Note</h4>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700 print:text-gray-700 text-xs">
            <li>Please check the seal number and its position before unloading. If there is any seal broken please do not unload, (Some time in rout any department investigation then they may open our team will inform the same not on last moment).</li>
            <li>Our oil measurement will be considered valid only at the same temperature as during loading. If there is a variation in temperature due to weather, please wait until the product temperature stabilizes to the loading temperature. After the temperature matches, if there is any difference in weight, Gyanti Multiservices will accept such variation as temperature difference.</li>
            <li>Differences may arise due to evaporation, temperature variation, handling losses, and weighing scale accuracy. For petroleum products (Industrial Oil, Base Oil, Lubricant Oil), the normal allowable difference is up to <strong>0.5% of Net Weight</strong>. Gyanti Multiservices will not accept any shortage if it is equal to or less than this parameter. However, if the shortage is above this limit, we are ready to accept it. (For reference, you may check Google for <em>TT Club – Contractual Tolerances in Bulk Material Handling</em>.)</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-300 pt-4">
          <p className="font-semibold text-gray-800 text-sm">GYANTI MULTISERVICES PVT. LTD.</p>
          <p className="text-gray-600 text-xs mt-1">
            Registered Office : Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007<br />
            E-Mail – accounts@gyanti.in | GSTIN – 09AAGCGG20R123 | CIN No. U15549UP2016PTC088333
          </p>
        </div>

        {/* Stamp */}
        <div className="text-right mt-4">
          <div className="inline-block border-2 border-gray-400 p-3 rounded">
            <img 
              src="/mpcl_stamp.jpg" 
              alt="Company Stamp" 
              className="h-24 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'block';
                }
              }}
            />
            <div className="hidden border-2 border-dashed border-gray-300 w-24 h-24 flex items-center justify-center text-xs text-gray-500 text-center">
              Company<br />Stamp
            </div>
          </div>
        </div>

        {/* Attached PDF/Image */}
        {shipment.pdf_path && (
          <div className="mt-8 pt-6 border-t border-gray-300">
            <h4 className="text-sm font-semibold mb-4">Attached Document</h4>
            {['jpg', 'jpeg', 'png', 'gif'].includes(getFileExtension(shipment.pdf_path)) ? (
              <img 
                src={shipment.pdf_path} 
                alt="Attached document"
                className="w-full max-h-96 object-contain border border-gray-400 rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'block';
                  }
                }}
              />
            ) : getFileExtension(shipment.pdf_path) === 'pdf' ? (
              <iframe 
                src={shipment.pdf_path} 
                className="w-full h-96 border border-gray-400 rounded"
                title="Attached PDF"
              />
            ) : (
              <div className="text-center py-8 border border-gray-300 rounded bg-gray-50">
                <p className="text-gray-600">Unsupported file type: {getFileExtension(shipment.pdf_path)}</p>
                <a 
                  href={shipment.pdf_path} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        )}
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
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:flex {
            display: flex !important;
          }
          .print\\:justify-between {
            justify-content: space-between !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:border {
            border: 1px solid #d1d5db !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:text-gray-800 {
            color: #1f2937 !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense
export default function PdfLoadingUnloading() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading PDF view...</p>
          </div>
        </div>
      }
    >
      <PdfLoadingUnloadingContent />
    </Suspense>
  );
}