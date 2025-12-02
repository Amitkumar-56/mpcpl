"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import jsPDF from "jspdf";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Main PDF Generation Component wrapped with Suspense
function PDFGenerationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);
  const [request, setRequest] = useState(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [error, setError] = useState(null);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  // Fetch request data
  useEffect(() => {
    const fetchRequest = async () => {
      if (!requestId || !user) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log("🔍 Fetching request for PDF:", requestId);
        
        const response = await fetch(`/api/generate-pdf?request_id=${requestId}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log("📦 Request data for PDF:", result);
          
          if (result.success) {
            setRequest(result.request);
          } else {
            throw new Error(result.error || "Failed to fetch request data");
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error("❌ Error fetching request:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user && requestId) {
      fetchRequest();
    }
  }, [requestId, user]);

  // PDF Generation Function
  const generatePDF = () => {
    if (!request) return;

    try {
      setGenerating(true);
      setError(null);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors
      const primaryColor = [41, 128, 185];
      const secondaryColor = [52, 152, 219];
      const darkColor = [44, 62, 80];
      const lightColor = [236, 240, 241];
      const successColor = [39, 174, 96];
      
      // Add header with background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("PETROLEUM COMPANY LTD", pageWidth / 2, 15, { align: "center" });
      
      // Invoice Title
      doc.setFontSize(16);
      doc.text("FILLING REQUEST INVOICE", pageWidth / 2, 28, { align: "center" });
      
      let yPosition = 50;
      
      // Request ID and Dates section
      doc.setFillColor(...lightColor);
      doc.rect(20, yPosition, pageWidth - 40, 20, 'F');
      
      doc.setTextColor(...darkColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`REQUEST ID: ${request.rid || request.id}`, 25, yPosition + 8);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Created: ${request.formatted_created || 'N/A'}`, 25, yPosition + 15);
      
      if (request.formatted_completed && request.formatted_completed !== "0000-00-00 00:00:00") {
        doc.text(`Completed: ${request.formatted_completed}`, 110, yPosition + 15);
      }
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...successColor);
      doc.text(`Status: ${request.status || 'N/A'}`, pageWidth - 25, yPosition + 8, { align: "right" });
      
      yPosition += 30;
      
      // Customer Information Section
      doc.setTextColor(...darkColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CUSTOMER INFORMATION", 20, yPosition);
      
      doc.setDrawColor(...secondaryColor);
      doc.line(20, yPosition + 2, 85, yPosition + 2);
      
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${request.customer_name || 'N/A'}`, 25, yPosition);
      doc.text(`Phone: ${request.customer_phone || 'N/A'}`, 25, yPosition + 6);
      
      if (request.customer_address) {
        const addressLines = doc.splitTextToSize(`Address: ${request.customer_address}`, 160);
        doc.text(addressLines, 25, yPosition + 12);
        yPosition += (addressLines.length * 4) + 12;
      } else {
        yPosition += 18;
      }
      
      // Filling Details Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("FILLING DETAILS", 20, yPosition);
      doc.line(20, yPosition + 2, 60, yPosition + 2);
      
      yPosition += 10;
      
      // Create a table for filling details
      doc.setFillColor(...lightColor);
      doc.rect(20, yPosition, pageWidth - 40, 25, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Product", 25, yPosition + 8);
      doc.text("Quantity", 80, yPosition + 8);
      doc.text("Vehicle Number", 120, yPosition + 8);
      doc.text("Driver Phone", 170, yPosition + 8);
      
      doc.setFont("helvetica", "normal");
      doc.text(request.product_name || 'N/A', 25, yPosition + 16);
      doc.text(`${request.qty || 0} liters`, 80, yPosition + 16);
      doc.text(request.vehicle_number || 'N/A', 120, yPosition + 16);
      doc.text(request.driver_number || 'N/A', 170, yPosition + 16);
      
      yPosition += 35;
      
      // Station Information
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("STATION INFORMATION", 20, yPosition);
      doc.line(20, yPosition + 2, 75, yPosition + 2);
      
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Station Name: ${request.loading_station || 'N/A'}`, 25, yPosition);
      
      if (request.station_address) {
        const stationAddress = doc.splitTextToSize(`Address: ${request.station_address}`, 160);
        doc.text(stationAddress, 25, yPosition + 6);
        yPosition += (stationAddress.length * 4) + 10;
      } else {
        yPosition += 16;
      }
      
      // Financial Information
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("FINANCIAL INFORMATION", 20, yPosition);
      doc.line(20, yPosition + 2, 85, yPosition + 2);
      
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 100, 0); // Dark green for financial info
      doc.text(`Customer Balance: ₹${request.customer_balance || '0'}`, 25, yPosition);
      
      yPosition += 15;
      
      // Staff Information
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkColor);
      doc.text("PROCESSED BY", 20, yPosition);
      doc.line(20, yPosition + 2, 55, yPosition + 2);
      
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(request.staff_name || '-', 25, yPosition);
      
      yPosition += 15;
      
      // Remarks Section
      if (request.remark) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("REMARKS", 20, yPosition);
        doc.line(20, yPosition + 2, 45, yPosition + 2);
        
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const remarks = doc.splitTextToSize(request.remark, 160);
        doc.text(remarks, 25, yPosition);
        yPosition += (remarks.length * 4) + 15;
      }
      
      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 270, pageWidth - 20, 270);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text("This is a computer generated invoice. No signature required.", pageWidth / 2, 275, { align: "center" });
      doc.text(`Generated on: ${request.current_date}`, pageWidth / 2, 280, { align: "center" });
      
      // Save PDF
      const fileName = `Filling_Request_${request.rid || request.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      setPdfGenerated(true);
      
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      setError("Error generating PDF: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate PDF when request data is loaded
  useEffect(() => {
    if (request && !pdfGenerated && !generating && !error) {
      generatePDF();
    }
  }, [request, pdfGenerated, generating, error]);

  const handleBack = () => {
    router.back();
  };

  const handleRegenerate = () => {
    generatePDF();
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Reload the page to retry
    window.location.reload();
  };

  // Loading states
  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading user data...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3">Loading request data...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Error Generating PDF</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleRetry}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-yellow-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Request Not Found</h2>
              <p className="text-gray-600 mb-6">The requested filling request could not be found.</p>
              <button 
                onClick={handleBack}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back to Requests
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button 
                onClick={handleBack}
                className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Requests
              </button>
              <h1 className="text-2xl font-bold text-gray-800">
                PDF Generation - {request.rid || request.id}
              </h1>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6">
              {/* PDF Preview Card */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 bg-gray-50">
                <div className="text-center">
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-lg font-semibold text-gray-700">Generating PDF...</p>
                      <p className="text-gray-500">Please wait while we create your invoice</p>
                    </>
                  ) : pdfGenerated ? (
                    <>
                      <div className="text-green-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-gray-700 mb-2">PDF Generated Successfully!</p>
                      <p className="text-gray-500 mb-4">Your PDF has been downloaded automatically</p>
                    </>
                  ) : (
                    <>
                      <div className="text-blue-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-gray-700">Ready to Generate PDF</p>
                      <p className="text-gray-500">Click the button below to generate your invoice</p>
                    </>
                  )}
                </div>
              </div>

              {/* Request Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-blue-800 mb-2">Request Summary</h3>
                  <p className="mb-1"><strong>ID:</strong> {request.rid || request.id}</p>
                  <p className="mb-1"><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      request.status === "Completed" ? "bg-green-100 text-green-800" :
                      request.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {request.status || "N/A"}
                    </span>
                  </p>
                  <p className="mb-1"><strong>Client:</strong> {request.customer_name || "N/A"}</p>
                  <p><strong>Created:</strong> {request.formatted_created || "N/A"}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h3 className="font-semibold text-green-800 mb-2">Filling Details</h3>
                  <p className="mb-1"><strong>Product:</strong> {request.product_name || "N/A"}</p>
                  <p className="mb-1"><strong>Quantity:</strong> {request.qty || 0} liters</p>
                  <p className="mb-1"><strong>Vehicle:</strong> {request.vehicle_number || "N/A"}</p>
                  <p><strong>Driver:</strong> {request.driver_number || "N/A"}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Requests
                </button>
                
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download PDF Again
                    </>
                  )}
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-6 text-center text-sm text-gray-500">
                <p>If the PDF doesn't download automatically, click the "Download PDF Again" button.</p>
                <p>Check your browser's download folder for the generated PDF file.</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Loading Component for Suspense
function PDFLoading() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Loading PDF Generator...</span>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function PDFGenerationPage() {
  return (
    <Suspense fallback={<PDFLoading />}>
      <PDFGenerationContent />
    </Suspense>
  );
}