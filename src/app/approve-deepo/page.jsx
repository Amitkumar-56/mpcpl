'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Inner component that uses useSearchParams
function AttachmentItem({ file, index, pdfGenerating }) {
  const [status, setStatus] = useState('checking'); // checking, valid, error

  useEffect(() => {
    // Verify file existence to avoid showing 404 iframe
    fetch(file, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) setStatus('valid');
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [file]);

  if (status === 'checking') {
    return <div className="p-4 text-center text-sm text-[#6b7280]">Loading attachment...</div>;
  }

  if (status === 'error') {
    return null;
  }

  const fileExtension = file.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);
  const isPDF = fileExtension === 'pdf';

  // If it's a PDF and we are generating, don't render anything in the HTML report
  if (isPDF && pdfGenerating) {
    return null;
  }

  return (
    <div className="border border-[#d1d5db] rounded p-3">
      {isImage ? (
        <img
          src={file}
          alt={`Attachment ${index + 1}`}
          className="max-w-full h-auto border border-[#e5e7eb] rounded"
          crossOrigin="anonymous"
        />
      ) : isPDF ? (
        <div>
          {pdfGenerating ? (
            <div className="border border-[#e5e7eb] rounded p-12 text-center bg-[#f9fafb]">
              <svg className="w-12 h-12 text-[#9ca3af] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              <div className="text-[#111827] font-medium">PDF Attachment</div>
              <div className="text-sm text-[#6b7280] mt-1">
                {file.split('/').pop()}
              </div>
              <div className="text-xs text-[#d97706] mt-3 font-medium bg-[#fffbeb] inline-block px-2 py-1 rounded">
                Preview not available in PDF export
              </div>
            </div>
          ) : (
            <embed
              src={file}
              type="application/pdf"
              width="100%"
              height="500"
              className="border border-[#e5e7eb] rounded"
            />
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-[#6b7280]">
          Unsupported file type: {fileExtension}
        </div>
      )}
    </div>
  );
}

function ApproveDeepoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [deepoData, setDeepoData] = useState(null);
  const [items, setItems] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDeepoData();
    }
  }, [id]);

  const fetchDeepoData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/approve-deepo?id=${id}`);
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

  const handleApproveReject = (action) => {
    setSelectedAction(action);
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    if (!selectedAction) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/approve-deepo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action: selectedAction,
          remarks: remarks
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Deepo ${selectedAction}d successfully!`);
        router.push('/deepo-history');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to process action');
    } finally {
      setActionLoading(false);
      setShowActionModal(false);
      setRemarks('');
    }
  };

  const generatePDF = async () => {
    if (typeof window === 'undefined') {
      console.error('PDF generation is not available on server');
      alert('PDF generation is only available in the browser');
      return;
    }

    const element = document.getElementById('pdf-content');
    if (!element) {
      console.error('PDF content element not found');
      alert('PDF content not found. Please refresh the page and try again.');
      return;
    }

    setPdfGenerating(true);

    try {
      // Import libraries dynamically
      const html2canvas = (await import('html2canvas')).default;
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      // Import pdf-lib for merging
      const { PDFDocument } = await import('pdf-lib');

      if (!html2canvas || !jsPDF || !PDFDocument) {
        throw new Error('Failed to load PDF libraries');
      }

      // Wait a bit to ensure DOM is ready and placeholders are rendered
      await new Promise(resolve => setTimeout(resolve, 800));

      // 1. Create the Main Report PDF (HTML -> Canvas -> PDF)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        allowTaint: false
      });

      const imgWidth = 210; // A4 width in mm
      // Calculate actual content height in mm
      const contentHeightMm = (canvas.height * imgWidth) / canvas.width;

      // If content is less than A4 height, use custom height to avoid blank space
      // standard A4 height is 297mm
      const isSinglePage = contentHeightMm <= 297;
      const initialPageHeight = isSinglePage ? contentHeightMm : 297;

      const reportPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isSinglePage ? [210, contentHeightMm] : 'a4'
      });

      const pageHeight = initialPageHeight;
      const imgHeight = contentHeightMm;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page of report
      reportPdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        reportPdf.addPage();
        reportPdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const reportPdfBytes = reportPdf.output('arraybuffer');

      // 2. Load the report into pdf-lib to prepare for merging
      const finalPdfDoc = await PDFDocument.load(reportPdfBytes);
      const failedAttachments = [];

      // 3. Merge existing PDF attachments
      if (pdfFiles && pdfFiles.length > 0) {
        for (const fileUrl of pdfFiles) {
          // Check if file is a PDF
          if (fileUrl.toLowerCase().endsWith('.pdf')) {
            try {
              // Fetch the PDF file
              const response = await fetch(fileUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch ${fileUrl}: ${response.status} ${response.statusText}`);
              }
              const attachmentBytes = await response.arrayBuffer();

              // Load and copy pages
              const attachmentDoc = await PDFDocument.load(attachmentBytes);
              const copiedPages = await finalPdfDoc.copyPages(attachmentDoc, attachmentDoc.getPageIndices());

              copiedPages.forEach((page) => {
                finalPdfDoc.addPage(page);
              });
            } catch (mergeError) {
              // Silently ignore missing or corrupt PDF attachments
              // failedAttachments.push(fileUrl.split('/').pop());
            }
          }
          // Note: Image attachments are already captured in the main report screenshot logic
        }
      }

      // 4. Save and Download the final PDF
      const finalPdfBytes = await finalPdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `deepo-details-${id || 'unknown'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link); // Clean up


    } catch (error) {
      console.error('Error generating PDF:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Failed to generate PDF: ${errorMessage}. Please check the console for details.`);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-[#4b5563]">Loading deepo details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#dc2626] text-xl mb-4">Error</div>
          <p className="text-[#4b5563] mb-4">{error}</p>
          <button
            onClick={goBack}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 py-2 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!deepoData) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#4b5563] mb-4">No deepo data found</p>
          <button
            onClick={goBack}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 py-2 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] py-8">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pdf-content, #pdf-content * {
            visibility: visible;
          }
          #pdf-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Hide buttons and other no-print elements explicitly */
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={goBack}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Back
          </button>

          <div className="flex space-x-4">
            <button
              onClick={handlePrint}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Print
            </button>
            <button
              onClick={generatePDF}
              disabled={pdfGenerating}
              className={`bg-[#4b5563] hover:bg-[#374151] text-white px-6 py-2 rounded-md font-medium transition-colors ${pdfGenerating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {pdfGenerating ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Current Status */}


        {/* PDF Content */}
        <div
          id="pdf-content"
          className="bg-[#ffffff] shadow-sm border border-[#e5e7eb]"
          style={{
            width: '210mm',
            minHeight: 'auto', // Allow height to adjust to content
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
              <h2 className="text-xl font-bold text-[#1f2937]">
                GYANTI MULTISERVICES PVT. LTD.
              </h2>
              <div className="text-xs text-[#4b5563] mt-1 leading-tight">
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
          <div className="text-center font-bold text-lg bg-[#f3f4f6] py-2 rounded mb-4">
            Deepo Details
          </div>

          <table className="w-full border-collapse border border-[#d1d5db] text-sm mb-6">
            <tbody>
              <tr>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium w-1/4">
                  First Driver
                </th>
                <td className="border border-[#d1d5db] px-3 py-2 w-1/4">
                  {deepoData.first_driver}
                </td>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium w-1/4">
                  First Mobile
                </th>
                <td className="border border-[#d1d5db] px-3 py-2 w-1/4">
                  {deepoData.first_mobile}
                </td>
              </tr>
              <tr>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Licence Plate
                </th>
                <td className="border border-[#d1d5db] px-3 py-2">
                  {deepoData.licence_plate}
                </td>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Diesel LTR
                </th>
                <td className="border border-[#d1d5db] px-3 py-2">
                  {deepoData.diesel_ltr}
                </td>
              </tr>
              <tr>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Opening Station
                </th>
                <td className="border border-[#d1d5db] px-3 py-2">
                  {deepoData.opening_station}
                </td>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Closing Station
                </th>
                <td className="border border-[#d1d5db] px-3 py-2">
                  {deepoData.closing_station}
                </td>
              </tr>
              <tr>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Start Date
                </th>
                <td className="border border-[#d1d5db] px-3 py-2">
                  {deepoData.first_start_date}
                </td>
                {deepoData.closing_date && (
                  <>
                    <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                      Closing Date
                    </th>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      {deepoData.closing_date}
                    </td>
                  </>
                )}
              </tr>
              <tr>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Remarks
                </th>
                <td className="border border-[#d1d5db] px-3 py-2" colSpan="3">
                  {deepoData.remarks}
                </td>
              </tr>
              {deepoData.status && (
                <tr>
                  <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                    Status
                  </th>
                  <td className="border border-[#d1d5db] px-3 py-2 font-bold" colSpan="3">
                    <span className={
                      deepoData.status === 'approved' ? 'text-[#16a34a]' :
                        deepoData.status === 'rejected' ? 'text-[#dc2626]' :
                          'text-[#ca8a04]'
                    }>
                      {deepoData.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Item Checklist */}
          <div className="text-center font-bold text-lg bg-[#f3f4f6] py-2 rounded mb-4">
            Item Checklist
          </div>

          <table className="w-full border-collapse border border-[#d1d5db] text-sm mb-6">
            <thead>
              <tr>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Item Name
                </th>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Pcs
                </th>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Description
                </th>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Opening Status
                </th>
                <th className="border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  Closing Status
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      {item.item_name}
                    </td>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      {item.pcs}
                    </td>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      {item.description}
                    </td>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      {item.opening_status}
                    </td>
                    <td className="border border-[#d1d5db] px-3 py-2">
                      {item.closing_status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="border border-[#d1d5db] px-3 py-2 text-center"
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

          {/* Attachments Section */}
          {(() => {
            // Determine if there are image attachments that will be rendered in the PDF
            const hasRenderableImages = pdfFiles.some(file => {
              const ext = file.split('.').pop()?.toLowerCase();
              return ['jpg', 'jpeg', 'png', 'gif'].includes(ext);
            });

            // If generating PDF, hide the section entirely if there are no images
            // (PDFs are merged separately, so we don't want an empty section)
            if (pdfGenerating && !hasRenderableImages) {
              return null;
            }

            return (
              <>
                <div className="text-center font-bold text-lg bg-[#f3f4f6] py-2 rounded mb-4 mt-8">
                  Attachments
                </div>

                {pdfFiles.length > 0 ? (
                  <div className="space-y-4">
                    {pdfFiles.map((file, index) => (
                      <AttachmentItem
                        key={index}
                        file={file}
                        index={index}
                        pdfGenerating={pdfGenerating}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#6b7280] py-4">
                    No attachments found
                  </p>
                )}
              </>
            );
          })()}
        </div>

        {/* Action Modal */}
        {showActionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {selectedAction === 'approve' ? 'Approve Deepo' : 'Reject Deepo'}
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter remarks for this action..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setRemarks('');
                  }}
                  className="px-4 py-2 text-[#4b5563] hover:text-[#1f2937]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-white rounded-md ${selectedAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-50`}
                >
                  {actionLoading ? 'Processing...' :
                    selectedAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense
export default function ApproveDeepo() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-[#4b5563]">Loading...</p>
          </div>
        </div>
      }
    >
      <ApproveDeepoContent />
    </Suspense>
  );
}