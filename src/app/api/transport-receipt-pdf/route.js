// src/app/api/transport-receipt-pdf/route.js
import { jsPDF } from 'jspdf';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { shipment } = await request.json();

    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment data is required' },
        { status: 400 }
      );
    }

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;
    
    // Helper function to format date
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        return dateString;
      }
    };

    // Set font
    doc.setFont('helvetica');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);

    // Header Section with border
    const headerHeight = 25;
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, pageWidth - 2 * margin, headerHeight);
    
    // Top row: H.T.C. | CONSIGNMENT NOTE | Phone numbers
    doc.setFontSize(14);
   

    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const phoneText = shipment.mobile || '';
    const emailText = shipment.email || '';
    doc.text(phoneText, pageWidth - margin - 3, yPos + 5, { align: 'right' });
    doc.text(emailText, pageWidth - margin - 3, yPos + 9, { align: 'right' });
    
    yPos += 10;
    
    // Company Name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Gyanti Multiservices Pvt. Ltd.', pageWidth / 2, yPos, { align: 'center' });

    yPos += 6;
    doc.setFontSize(7);
    doc.text('NAKHA No.1, MOHARIPUR, GORAKHPUR - 273001', pageWidth / 2, yPos, { align: 'center' });
    yPos += 3.5;
    doc.text('E-mail :accounts@gyanti.in', pageWidth / 2, yPos, { align: 'center' });
    
    yPos = margin + headerHeight + 3;

    // GR NO and DATE section
    const grDateHeight = 8;
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, pageWidth - 2 * margin, grDateHeight);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('GR NO.', margin + 3, yPos + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(shipment.lr_id || '5608', margin + 25, yPos + 5.5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', pageWidth - margin - 45, yPos + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(shipment.lr_date) || '', pageWidth - margin - 20, yPos + 5.5);
    
    yPos += grDateHeight + 2;

    // Consignor and Loading Point section
    const colWidth = (pageWidth - 2 * margin) / 3;
    const rowHeight = 8;
    
    // Header row
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, colWidth, rowHeight);
    doc.rect(margin + colWidth, yPos, colWidth, rowHeight);
    doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth, yPos, colWidth, rowHeight, 'F');
    doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSIGNOR', margin + colWidth / 2, yPos + 5, { align: 'center' });
    doc.text('LOADING POINT', margin + colWidth + colWidth / 2, yPos + 5, { align: 'center' });
    
    yPos += rowHeight;
    
    // Data row - increased height for address
    const dataRowHeight = shipment.address_1 ? 12 : rowHeight;
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, colWidth, dataRowHeight);
    doc.rect(margin + colWidth, yPos, colWidth, dataRowHeight);
    doc.rect(margin + 2 * colWidth, yPos, colWidth, dataRowHeight);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const consignerName = shipment.consigner || 'Jain sons india';
    doc.text(consignerName, margin + 3, yPos + 4.5, { maxWidth: colWidth - 6 });
    if (shipment.address_1) {
      doc.setFontSize(7);
      doc.text(shipment.address_1, margin + 3, yPos + 9, { maxWidth: colWidth - 6 });
    }
    doc.setFontSize(9);
    doc.text(shipment.from_location || 'Palasa', margin + colWidth + 3, yPos + 5);
    
    yPos += dataRowHeight;
    
    // GST NO row
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, colWidth, rowHeight);
    doc.rect(margin + colWidth, yPos, colWidth, rowHeight);
    doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth, yPos, colWidth, rowHeight, 'F');
    doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GST NO.', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(shipment.gst || '', margin + 25, yPos + 5);
    
    yPos += rowHeight + 2;

    // Consignee and Destination section
    // Header row
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, colWidth, rowHeight);
    doc.rect(margin + colWidth, yPos, colWidth, rowHeight);
    doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth, yPos, colWidth, rowHeight, 'F');
    doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSIGNEE', margin + colWidth / 2, yPos + 5, { align: 'center' });
    doc.text('DESTINATION', margin + colWidth + colWidth / 2, yPos + 5, { align: 'center' });
    
    yPos += rowHeight;
    
    // Data row - increased height for address
    const consigneeDataRowHeight = shipment.address_2 ? 12 : rowHeight;
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, colWidth, consigneeDataRowHeight);
    doc.rect(margin + colWidth, yPos, colWidth, consigneeDataRowHeight);
    doc.rect(margin + 2 * colWidth, yPos, colWidth, consigneeDataRowHeight);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const consigneeName = shipment.consignee || 'Greenergy Bio refineries Pvt Ltd';
    doc.text(consigneeName, margin + 3, yPos + 4.5, { maxWidth: colWidth - 6 });
    if (shipment.address_2) {
      doc.setFontSize(7);
      doc.text(shipment.address_2, margin + 3, yPos + 9, { maxWidth: colWidth - 6 });
    }
    doc.setFontSize(9);
    doc.text(shipment.to_location || 'Haveri', margin + colWidth + 3, yPos + 5);
    
    yPos += consigneeDataRowHeight;
    
    // GST NO row
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, colWidth, rowHeight);
    doc.rect(margin + colWidth, yPos, colWidth, rowHeight);
    doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth, yPos, colWidth, rowHeight, 'F');
    doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GST NO.', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(shipment.gst_no || '', margin + 25, yPos + 5);
    
    yPos += rowHeight + 2;

    // Tank Lorry Details section (4 columns)
    const tankColWidth = (pageWidth - 2 * margin) / 4;
    
    // Header row
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, tankColWidth, rowHeight);
    doc.rect(margin + tankColWidth, yPos, tankColWidth, rowHeight);
    doc.rect(margin + 2 * tankColWidth, yPos, tankColWidth, rowHeight);
    doc.rect(margin + 3 * tankColWidth, yPos, tankColWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, tankColWidth, rowHeight, 'F');
    doc.rect(margin + tankColWidth, yPos, tankColWidth, rowHeight, 'F');
    doc.rect(margin + 2 * tankColWidth, yPos, tankColWidth, rowHeight, 'F');
    doc.rect(margin + 3 * tankColWidth, yPos, tankColWidth, rowHeight, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TANK LORRY NO.', margin + tankColWidth / 2, yPos + 5, { align: 'center' });
    doc.text('PRODUCT', margin + tankColWidth + tankColWidth / 2, yPos + 5, { align: 'center' });
    doc.text('QTY(QTL/MT)', margin + 2 * tankColWidth + tankColWidth / 2, yPos + 5, { align: 'center' });
    doc.text('ADVANCE', margin + 3 * tankColWidth + tankColWidth / 2, yPos + 5, { align: 'center' });
    
    yPos += rowHeight;
    
    // Data row
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, tankColWidth, rowHeight);
    doc.rect(margin + tankColWidth, yPos, tankColWidth, rowHeight);
    doc.rect(margin + 2 * tankColWidth, yPos, tankColWidth, rowHeight);
    doc.rect(margin + 3 * tankColWidth, yPos, tankColWidth, rowHeight);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(shipment.tanker_no || '', margin + 3, yPos + 5);
    doc.text(shipment.products || '', margin + tankColWidth + 3, yPos + 5);
    doc.text(`${shipment.net_wt || ''} ${shipment.wt_type || 'ltr'}`, margin + 2 * tankColWidth + 3, yPos + 5);
    
    yPos += rowHeight + 2;

    // Date of Loading and Receiving Particular section
    const halfWidth = (pageWidth - 2 * margin) / 2;
    
    // DATE OF LOADING | RECEIVING PARTICULARS
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, halfWidth, rowHeight);
    doc.rect(margin + halfWidth, yPos, halfWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, halfWidth, rowHeight, 'F');
    doc.rect(margin + halfWidth, yPos, halfWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE OF LOADING', margin + halfWidth / 2, yPos + 5, { align: 'center' });
    doc.text('RECEIVING PARTICULARS', margin + halfWidth + halfWidth / 2, yPos + 5, { align: 'center' });
    
    yPos += rowHeight;
    
    // INVOICE NO.
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, halfWidth, rowHeight);
    doc.rect(margin + halfWidth, yPos, halfWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, halfWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE NO.', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(shipment.invoice_no || '', margin + 40, yPos + 5);
    
    yPos += rowHeight;
    
    // DECLARED VALUE
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, halfWidth, rowHeight);
    doc.rect(margin + halfWidth, yPos, halfWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, halfWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARED VALUE', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Received in good condition : ...... QU/MT', margin + halfWidth + 3, yPos + 5);
    
    yPos += rowHeight;
    
    // E-WAY BILL NO.
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, halfWidth, rowHeight);
    doc.rect(margin + halfWidth, yPos, halfWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, halfWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('E-WAY BILL NO.', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (shipment.gp_no) {
      doc.text(shipment.gp_no, margin + 45, yPos + 5);
    }
    doc.text('Signature of Consignee/Agent : ......', margin + halfWidth + 3, yPos + 5);
    
    yPos += rowHeight;
    
    // DRIVER LICENSE NO.
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, halfWidth, rowHeight);
    doc.rect(margin + halfWidth, yPos, halfWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, halfWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DRIVER LICENSE NO.', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    if (shipment.vessel) {
      doc.setFontSize(8);
      doc.text(shipment.vessel, margin + 55, yPos + 5);
    }
    doc.setFontSize(8);
    doc.text('Address : ......', margin + halfWidth + 3, yPos + 5);
    
    yPos += rowHeight;
    
    // DRIVER SIGNATURE
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, halfWidth, rowHeight);
    doc.rect(margin + halfWidth, yPos, halfWidth, rowHeight);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, halfWidth, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DRIVER SIGNATURE', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Date : ......    Time : ......', margin + halfWidth + 3, yPos + 5);
    
    // Add BOE NO if available
    if (shipment.boe_no) {
      yPos += rowHeight;
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, halfWidth, rowHeight);
      doc.rect(margin + halfWidth, yPos, halfWidth, rowHeight);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, halfWidth, rowHeight, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('BOE NO.', margin + 3, yPos + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(shipment.boe_no, margin + 35, yPos + 5);
    }
    
    yPos += rowHeight + 3;

    // Terms & Conditions
    const termsHeight = 22;
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, pageWidth - 2 * margin, termsHeight);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions', margin + 3, yPos + 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('1. GST to be Paid by Consignor or Consignee.', margin + 3, yPos + 10);
    doc.text('2. The Consignor hereby expressly declares that the above particulars furnished by him or his agent are correct. No Prohibited articles are included and he is aware of & accepts the conditions of carriage. Any disputes subject to Delhi Jurisdiction.', margin + 3, yPos + 15, { maxWidth: pageWidth - 2 * margin - 6 });
    
    yPos += termsHeight + 4;

    // Footer Signature
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('For Gyanti Multiservices Pvt. Ltd', pageWidth - margin - 3, yPos, { align: 'right' });
    yPos += 5;
    doc.text('AUTHORISED SIGNATORY', pageWidth - margin - 3, yPos, { align: 'right' });
    
    const pdfBlob = doc.output('blob');
    
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="consignment-note-${shipment.lr_id || 'note'}.pdf"`,
      },
    });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}


