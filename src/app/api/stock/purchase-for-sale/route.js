// src/app/api/stock/purchase-for-sale/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    console.log("=== PURCHASE API CALLED ===");
    
    const data = await request.json();
    console.log("Received data:", JSON.stringify(data, null, 2));

    const {
      supplier_id,
      product_id,
      fs_id,
      invoiceNumber,
      invoiceDate,
      ewayBillNumber,
      ewayBillExpiryDate,
      density,
      quantityInKg,
      quantityInLtr,
      tankerNumber,
      driverNumber,
      lrNo,
      invoiceAmount,
      debitNote = 0,
      creditNote = 0,
      status,
      quantityChanged,
      quantity_change_reason
    } = data;

    // Validate required fields
    const requiredFields = {
      supplier_id: "Supplier",
      product_id: "Product", 
      fs_id: "Station",
      invoiceNumber: "Invoice Number",
      invoiceDate: "Invoice Date",
      invoiceAmount: "Invoice Amount"
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !data[key])
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.log("Missing required fields:", missingFields);
      return NextResponse.json(
        { 
          success: false, 
          message: "Missing required fields",
          missingFields: missingFields 
        },
        { status: 400 }
      );
    }

    // Convert values to numbers
    const invoiceAmountNum = Number(invoiceAmount) || 0;
    const debitNoteNum = Number(debitNote) || 0;
    const creditNoteNum = Number(creditNote) || 0;
    const densityNum = Number(density) || 0;
    const quantityInKgNum = Number(quantityInKg) || 0;
    const quantityInLtrNum = Number(quantityInLtr) || 0;

    // Calculate payable and dncn
    const payable = invoiceAmountNum - debitNoteNum + creditNoteNum;
    const dncn = debitNoteNum - creditNoteNum;

    console.log("Calculated values:", {
      invoiceAmount: invoiceAmountNum,
      debitNote: debitNoteNum,
      creditNote: creditNoteNum,
      payable,
      dncn
    });

    // Insert into stock table
    const stockQuery = `
      INSERT INTO stock (
        supplier_id,
        product_id,
        fs_id,
        invoice_number,
        invoice_date,
        eway_bill_number,
        eway_bill_expiry_date,
        density,
        kg,
        ltr,
        tanker_no,
        driver_no,
        lr_no,
        v_invoice_value,
        dncn,
        payable,
        payment,
        status,
        weight_type,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const stockValues = [
      supplier_id,
      product_id,
      fs_id,
      invoiceNumber,
      invoiceDate,
      ewayBillNumber || null,
      ewayBillExpiryDate || null,
      densityNum,
      quantityInKgNum,
      quantityInLtrNum,
      tankerNumber || null,
      driverNumber || null,
      lrNo || null,
      invoiceAmountNum,
      dncn,
      payable,
      0, // payment default 0
      status || "on_the_way",
      quantityChanged ? "changed" : "normal"
    ];

    console.log("Executing stock query with values:", stockValues);

    const stockResult = await executeQuery(stockQuery, stockValues);
    console.log("Stock database insert successful:", stockResult);

    // Insert into filling_station_stocks table
    const insertStockQuery = `
      INSERT INTO filling_station_stocks (
        fs_id,
        product,
        stock,
        msg,
        remark,
        created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const stockValuesForFS = [
      fs_id,
      product_id, // product_id directly as product
      quantityInLtrNum, // UI se jo Quantity in Ltr aaya wahi stock mein jayega
      `New purchase - Invoice: ${invoiceNumber}`,
      `Tanker: ${tankerNumber || 'N/A'}`
    ];

    console.log("Executing filling_station_stocks query with values:", stockValuesForFS);

    const fsStockResult = await executeQuery(insertStockQuery, stockValuesForFS);
    console.log("Filling station stocks insert successful:", fsStockResult);

    return NextResponse.json({ 
      success: true, 
      message: "Purchase saved into both tables successfully",
      data: {
        stockInsert: stockResult,
        fsStockInsert: fsStockResult
      }
    });

  } catch (error) {
    console.error("❌ Error adding purchase:", error);
    console.error("Error stack:", error.stack);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Add OPTIONS method for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}