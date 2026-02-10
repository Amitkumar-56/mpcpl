


'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Inner component that uses useSearchParams
function PdfLoadingUnloadingContent() {
  const searchParams = useSearchParams();
  const shipmentId = searchParams.get('shipment_id');
  const router = useRouter();

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
      const response = await fetch(`/api/loading-unloading-history/pdf-loading-unloading?shipment_id=${shipmentId}`);
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
      alert('PDF generation is only available in the browser');
      return;
    }

    const element = document.getElementById('pdf-content');
    if (!element) {
      alert('PDF content not found. Please refresh the page.');
      return;
    }

    setLoading(true);
    let tempContainer = null;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const { PDFDocument } = await import('pdf-lib');

      if (!html2canvas || !jsPDF || !PDFDocument) {
        throw new Error('Failed to load PDF libraries');
      }

      // 1. Setup container
      tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '0';
      tempContainer.style.left = '0';
      tempContainer.style.width = '794px';
      tempContainer.style.margin = '0';
      tempContainer.style.padding = '0';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.zIndex = '10000';
      document.body.appendChild(tempContainer);

      // Pre-load COMPULSORY stamp image
      let stampBase64 = null;
      try {
        const resp = await fetch('/mpcl_stamp.jpg');
        const blob = await resp.blob();
        stampBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Stamp load failed', e);
      }

      // 2. Clone content
      const clone = element.cloneNode(true);



      // Apply Base64 stamp to clone
      if (stampBase64) {
        const imgs = clone.querySelectorAll('img');
        imgs.forEach(img => {
          if (img.src.includes('mpcl_stamp.jpg') || img.alt === 'Company Stamp') {
            img.src = stampBase64;
          }
        });
      }

      // Clean buttons/iframes
      const buttons = clone.querySelector('.print\\:hidden');
      if (buttons) buttons.remove();
      const pdAtt = clone.querySelector('.pdf-attachment-container');
      if (pdAtt && shipment.pdf_path && shipment.pdf_path.toLowerCase().endsWith('.pdf')) {
        pdAtt.style.display = 'none';
      }
      clone.querySelectorAll('iframe').forEach(el => el.remove());

      // FORCE STYLES
      clone.style.width = '100% !important';
      clone.style.height = 'auto !important';
      clone.style.overflow = 'visible !important';

      // Handle other images
      const images = clone.querySelectorAll('img');
      const imgPromises = [];
      images.forEach(img => {
        if (!img.src.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
          if (!img.complete) {
            imgPromises.push(new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            }));
          }
        }
      });

      tempContainer.appendChild(clone);

      // SANITIZE CSS AFTER APPENDING (So getComputedStyle works)
      // HTML2Canvas doesn't support oklch colors (common in new Tailwind)
      const elementsToSanitize = tempContainer.querySelectorAll('*');
      elementsToSanitize.forEach(el => {
        const style = window.getComputedStyle(el);

        // Helper to check and replace property
        const replaceIfOklch = (prop, fallback) => {
          const val = style.getPropertyValue(prop);
          if (val && val.includes('oklch')) {
            el.style.setProperty(prop, fallback, 'important');
          }
        };

        replaceIfOklch('background-color', '#ffffff');
        replaceIfOklch('color', '#000000');
        replaceIfOklch('border-color', '#d1d5db');
        replaceIfOklch('outline-color', '#d1d5db');

        // Also explicitly fix text-gray-X classes which might be oklch
        if (style.color && style.color.includes('oklch')) {
          el.style.color = '#1f2937'; // gray-800 safe
        }
      });

      // Update stamp on the LIVE container to ensure it sticks
      // Update stamp on the LIVE container to ensure it sticks
      if (stampBase64) {
        const stampEl = tempContainer.querySelector('#stamp-image-el');
        if (stampEl) {
          stampEl.removeAttribute('crossOrigin');
          stampEl.src = stampBase64;
          stampEl.style.display = 'block'; // Force visible
        }
      }

      // Ensure stamp is visible and content fits
      window.scrollTo(0, 0);
      await Promise.all(imgPromises);
      await new Promise(r => setTimeout(r, 1500)); // Increased wait for stamp/layout

      // 3. Capture with slight scale down to fit
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Retain quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        allowTaint: true,
        scrollY: 0,
        onclone: (doc) => {
          // Force fit content if needed
          const el = doc.body.firstChild;
          if (el) {
            el.style.transform = 'scale(0.98)';
            el.style.transformOrigin = 'top left';
          }
        }
      });

      // 4. Generate PDF - FORCE SINGLE PAGE
      const pageWidth = 210;
      const pageHeight = 297;

      // Calculate content dimensions
      const contentRatio = canvas.height / canvas.width;
      let finalPdfHeight = pageWidth * contentRatio;
      let finalPdfWidth = pageWidth;

      // If taller than A4, scale down to fit height
      if (finalPdfHeight > pageHeight) {
        finalPdfHeight = pageHeight;
        finalPdfWidth = pageHeight / contentRatio;
      }

      // Center horizontally
      const xPos = (pageWidth - finalPdfWidth) / 2;

      const reportPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      try {
        reportPdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', xPos, 0, finalPdfWidth, finalPdfHeight);

        // MANUALLY OVERLAY STAMP (Fail-safe)
        if (stampBase64) {
          const stampSize = 25; // mm
          const stampX = xPos + finalPdfWidth - stampSize - 10; // Right aligned
          const stampY = finalPdfHeight - stampSize - 5; // Bottom aligned (approx)
          reportPdf.addImage(stampBase64, 'JPEG', stampX, stampY, stampSize, stampSize);
        }

      } catch (e) {
        console.error('AddImage failed', e);
        throw new Error('Image security policy blocked PDF generation. Please contact support.');
      }

      // 5. Merge Attachment
      if (shipment.pdf_path && shipment.pdf_path.toLowerCase().endsWith('.pdf')) {
        try {
          const reportBytes = reportPdf.output('arraybuffer');
          const finalDoc = await PDFDocument.load(reportBytes);

          const attResp = await fetch(shipment.pdf_path);
          if (attResp.ok) {
            const attBytes = await attResp.arrayBuffer();
            const attDoc = await PDFDocument.load(attBytes);
            const copied = await finalDoc.copyPages(attDoc, attDoc.getPageIndices());
            copied.forEach(p => finalDoc.addPage(p));
          }

          const finalBytes = await finalDoc.save();
          triggerDownload(finalBytes, `shipment-${shipmentId}.pdf`);
        } catch (mergeErr) {
          console.warn('Merge failed, downloading report only', mergeErr);
          reportPdf.save(`shipment-${shipmentId}.pdf`);
        }
      } else {
        reportPdf.save(`shipment-${shipmentId}.pdf`);
      }

    } catch (error) {
      console.error('PDF Gen Error:', error);
      alert(`PDF Error: ${error.message}`);
    } finally {
      // Robust cleanup
      if (tempContainer && document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      setLoading(false);
    }
  };

  const triggerDownload = (bytes, filename) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="min-h-screen bg-gray-50 py-8 print:p-0 print:m-0 print:min-h-0 print:bg-white print:overflow-hidden">
      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mb-6 print:hidden">
        <button
          onClick={() => {
            // Try multiple back navigation methods
            if (window.history.length > 1) {
              window.history.back();
            } else {
              router.push('/loading-unloading-history');
            }
          }}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back
        </button>
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

        {/* Footer with Stamp */}
        <div className="border-t border-gray-300 pt-4 flex flex-row items-end justify-between">
          <div className="w-1/4"></div> {/* Spacer for balance */}

          <div className="text-center flex-1">
            <p className="font-semibold text-gray-800 text-sm">GYANTI MULTISERVICES PVT. LTD.</p>
            <p className="text-gray-600 text-xs mt-1">
              Registered Office : Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007<br />
              E-Mail – accounts@gyanti.in | GSTIN – 09AAGCGG20R123 | CIN No. U15549UP2016PTC088333
            </p>
          </div>

          <div className="w-1/4 text-right">
            <div className="inline-block border-2 border-gray-400 p-2 rounded bg-white">
              <img
                id="stamp-image-el"
                src="/mpcl_stamp.jpg"
                alt="Company Stamp"
                className="h-20 w-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'block';
                  }
                }}
              />
              <div className="hidden border-2 border-dashed border-gray-300 w-20 h-20 flex items-center justify-center text-xs text-gray-500 text-center">
                Company<br />Stamp
              </div>
            </div>
          </div>
        </div>

        {/* Attached PDF/Image */}
        {shipment.pdf_path && (
          <div className="mt-8 pt-6 border-t border-gray-300 pdf-attachment-container">
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
          @page {
            size: A4;
            margin: 0mm;
          }
          
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }
          
          /* Unhide the PDF content and its children */
          #pdf-content, #pdf-content * {
            visibility: visible;
          }

          /* Reset body/html */
          html, body {
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          
          /* Position the content to top-left */
          #pdf-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 10mm !important; /* modest padding for readability */
            
            /* Use zoom for layout-aware scaling (Chrome/Edge) */
            zoom: 75%; 
          }
          
          /* Hide buttons specifically (redundant but safe) */
          .print\\:hidden {
            display: none !important;
          }

          /* Compact spacing */
          h2, h3, h4, p, td, th {
              padding-top: 1px !important;
              padding-bottom: 1px !important;
              margin-bottom: 2px !important;
          }
          hr {
              margin: 4px 0 !important;
          }
          .mb-4, .mb-6 {
              margin-bottom: 8px !important;
          }
          .mt-8 {
              margin-top: 8px !important;
          }
          .pt-4, .pt-6 {
              padding-top: 8px !important;
          }
          .h-16, .w-16 {
              height: 40px !important;
              width: 40px !important;
          }
          .h-20 {
              height: 60px !important;
          }
          
          /* Hide external wrapper background */
          .min-h-screen {
              min-height: 0 !important;
              background-color: white !important;
          }
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense
export default function PdfLoadingUnloading() {
  return (
    <Suspense fallback={null}>
      <PdfLoadingUnloadingContent />
    </Suspense>
  );
}
