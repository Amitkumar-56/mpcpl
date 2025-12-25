// src/app/api/stock/purchase-for-sale/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/auth";

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
      status || "pending", // ✅ Changed default to "pending"
      quantityChanged ? "changed" : "normal"
    ];

    console.log("Executing stock query with values:", stockValues);

    const stockResult = await executeQuery(stockQuery, stockValues);
    console.log("Stock database insert successful:", stockResult);

    // ✅ NEW: Only add to filling_station_stocks if status is "delivered"
    // If status is "pending" or "on_the_way", stock will be added when status changes to "delivered"
    const finalStatus = status || "pending";
    
    if (finalStatus === "delivered" || finalStatus === "3") {
      // Check if stock record exists
      const checkStockQuery = `
        SELECT stock FROM filling_station_stocks 
        WHERE fs_id = ? AND product = ?
      `;
      const existingStock = await executeQuery(checkStockQuery, [fs_id, product_id]);
      
      if (existingStock.length > 0) {
        // Update existing stock
        const updateStockQuery = `
          UPDATE filling_station_stocks 
          SET stock = stock + ?, 
              msg = ?, 
              remark = ?, 
              created_at = NOW()
          WHERE fs_id = ? AND product = ?
        `;
        await executeQuery(updateStockQuery, [
          quantityInLtrNum,
          `New purchase - Invoice: ${invoiceNumber}`,
          `Tanker: ${tankerNumber || 'N/A'}`,
          fs_id,
          product_id
        ]);
      } else {
        // Insert new stock record
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
        await executeQuery(insertStockQuery, [
          fs_id,
          product_id,
          quantityInLtrNum,
          `New purchase - Invoice: ${invoiceNumber}`,
          `Tanker: ${tankerNumber || 'N/A'}`
        ]);
      }

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

      // Insert into filling_history with Inward trans_type
      try {
        const currentUser = await getCurrentUser();
        const userId = currentUser?.userId || null;
        
        // Get old stock before update
        const oldStock = existingStock.length > 0 ? parseFloat(existingStock[0].stock) || 0 : 0;
        const newStock = oldStock + quantityInLtrNum;
        
        await executeQuery(
          `INSERT INTO filling_history 
           (fs_id, product_id, filling_qty, trans_type, current_stock, available_stock, filling_date, created_by, created_at) 
           VALUES (?, ?, ?, 'Inward', ?, ?, NOW(), ?, NOW())`,
          [
            fs_id,
            product_id,
            quantityInLtrNum, // Positive quantity for Inward
            oldStock, // Current stock before addition
            newStock, // Available stock after addition
            userId || null
          ]
        );
        console.log('✅ Filling history entry created for stock purchase:', { oldStock, newStock, quantity: quantityInLtrNum });
      } catch (historyError) {
        console.log('⚠️ filling_history insert failed:', historyError);
      }
    } else {
      console.log(`⚠️ Stock not added to filling_station_stocks yet (status: ${finalStatus}). Will be added when status changes to "delivered".`);
    }

    // Get current user for audit log
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || null;
    let userName = currentUser?.userName || null;
    
    // If no userName, try to fetch from database
    if (!userName && userId) {
      try {
        const users = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (users.length > 0 && users[0].name) {
          userName = users[0].name;
        }
      } catch (err) {
        console.error('Error fetching employee name:', err);
      }
    }

    // Create audit log
    await createAuditLog({
      page: 'Stock Management',
      uniqueCode: `PURCHASE-${invoiceNumber}`,
      section: 'Purchase for Sale',
      userId: userId,
      userName: userName,
      action: 'add',
      remarks: `Purchase added: ${quantityInLtrNum} Ltr (Invoice: ${invoiceNumber}, Tanker: ${tankerNumber || 'N/A'})`,
      oldValue: { quantity: 0 },
      newValue: { quantity: quantityInLtrNum },
      recordType: 'stock_purchase',
      recordId: stockResult.insertId
    });

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