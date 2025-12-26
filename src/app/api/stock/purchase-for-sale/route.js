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
      transporter_id,
      invoiceAmount,
      debitNote = 0,
      creditNote = 0,
      tds_cutting = 0,
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
    const tdsCuttingNum = Number(tds_cutting) || 0;
    const densityNum = Number(density) || 0;
    const quantityInKgNum = Number(quantityInKg) || 0;
    const quantityInLtrNum = Number(quantityInLtr) || 0;

    // Calculate payable and dncn (including TDS)
    // Payable = Invoice Amount - Debit Note + Credit Note - TDS
    const payable = invoiceAmountNum - debitNoteNum + creditNoteNum - tdsCuttingNum;
    const dncn = debitNoteNum - creditNoteNum;

    console.log("Calculated values:", {
      invoiceAmount: invoiceAmountNum,
      debitNote: debitNoteNum,
      creditNote: creditNoteNum,
      tdsCutting: tdsCuttingNum,
      payable,
      dncn
    });

    // Check if transporter_id column exists in stock table
    let hasTransporterId = false;
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM stock');
      const colSet = new Set(colsInfo.map(r => r.Field));
      hasTransporterId = colSet.has('transporter_id');
    } catch (err) {
      console.log('⚠️ Could not check stock table columns:', err.message);
    }

    // Insert into stock table (with optional transporter_id)
    const stockQuery = hasTransporterId ? `
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
        transporter_id,
        v_invoice_value,
        dncn,
        payable,
        payment,
        status,
        weight_type,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ` : `
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

    const stockValues = hasTransporterId ? [
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
      transporter_id || null,
      invoiceAmountNum,
      dncn,
      payable,
      0, // payment default 0
      status || "pending",
      quantityChanged ? "changed" : "normal"
    ] : [
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
      status || "pending",
      quantityChanged ? "changed" : "normal"
    ];

    console.log("Executing stock query with values:", stockValues);

    const stockResult = await executeQuery(stockQuery, stockValues);
    console.log("Stock database insert successful:", stockResult);

    // ✅ Get current user once for all operations
    // getCurrentUser() returns employee_profile.id as userId
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || null; // This is employee_profile.id
    
    // ✅ Verify userId exists in employee_profile table
    if (userId) {
      try {
        const verifyUser = await executeQuery(
          `SELECT id FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (verifyUser.length === 0) {
          console.error(`❌ User ID ${userId} not found in employee_profile table`);
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid user. Please login again.' 
          }, { status: 401 });
        }
      } catch (verifyError) {
        console.error('❌ Error verifying user in employee_profile:', verifyError);
      }
    }
    
    // ✅ Fetch user name from database if not available
    let userName = currentUser?.userName || null;
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
    
    console.log('✅ User info for purchase (employee_profile.id):', { userId, userName });

    // ✅ Handle stock addition only if initial status is "delivered"
    // If status is "delivered" (or "3"), add stock immediately and create filling_history entry
    const finalStatus = status || "pending";
    const isDelivered = finalStatus === 'delivered' || finalStatus === '3';
    
    if (isDelivered) {
      // Check if stock record exists
      const checkStockQuery = `
        SELECT stock FROM filling_station_stocks 
        WHERE fs_id = ? AND product = ?
      `;
      const existingStock = await executeQuery(checkStockQuery, [fs_id, product_id]);
      
      const currentStock = existingStock.length > 0 ? parseFloat(existingStock[0].stock) || 0 : 0;
      const availableStock = currentStock + quantityInLtrNum;
      
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
          `Purchase delivered - Invoice: ${invoiceNumber}`,
          `Tanker: ${tankerNumber || 'N/A'}`,
          fs_id,
          product_id
        ]);
        console.log("✅ Filling station stocks updated (delivered status):", {
          fs_id,
          product_id,
          oldStock: currentStock,
          added: quantityInLtrNum,
          newStock: availableStock
        });
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
          `Purchase delivered - Invoice: ${invoiceNumber}`,
          `Tanker: ${tankerNumber || 'N/A'}`
        ]);
        console.log("✅ Filling station stocks inserted (delivered status):", {
          fs_id,
          product_id,
          stock: quantityInLtrNum
        });
      }
      
      // Insert into filling_history when status is delivered
      // ✅ Note: userId here is the original purchase creator (employee_profile.id) since we're in the create flow
      try {
        // Check if stock_type column exists
        const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
        const colSet = new Set(colsInfo.map(r => r.Field));
        const hasStockType = colSet.has('stock_type');
        
        if (hasStockType) {
          await executeQuery(
            `INSERT INTO filling_history 
             (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at) 
             VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())`,
            [
              fs_id,
              product_id,
              currentStock,
              quantityInLtrNum,
              availableStock,
              userId || null // Original purchase creator's ID (employee_profile.id)
            ]
          );
        } else {
          await executeQuery(
            `INSERT INTO filling_history 
             (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at) 
             VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())`,
            [
              fs_id,
              product_id,
              currentStock,
              quantityInLtrNum,
              availableStock,
              userId || null // Original purchase creator's ID (employee_profile.id)
            ]
          );
        }
        console.log('✅ Filling history entry created (delivered status) with creator ID:', {
          fs_id,
          product_id,
          trans_type: 'Inward',
          current_stock: currentStock,
          filling_qty: quantityInLtrNum,
          available_stock: availableStock,
          created_by: userId
        });
      } catch (historyError) {
        console.error('❌ filling_history insert failed:', historyError);
        // Don't throw - continue even if history insert fails
      }
      
      // ✅ Stock record remains in stock table with status "delivered"
      // Staff and Incharge will not see delivered items (filtered in GET route)
      console.log(`✅ Stock record created with delivered status (ID: ${stockResult.insertId}). Record remains in stock table.`);
    } else {
      // ✅ NOTE: Stock will NOT be added if status is not "delivered"
      // Stock will only be added when status changes to "delivered" (handled in stock/edit route)
      console.log("✅ Purchase created with status:", finalStatus, "- Stock will be added when status becomes 'delivered'");
    }

    // ✅ Create audit log with user info
    try {
      await createAuditLog({
        page: 'Stock Management',
        uniqueCode: `PURCHASE-${invoiceNumber}`,
        section: 'Purchase for Sale',
        userId: userId,
        userName: userName || 'System',
        action: 'add',
        remarks: `Purchase added: ${quantityInLtrNum} Ltr (Invoice: ${invoiceNumber}, Tanker: ${tankerNumber || 'N/A'}) for Station ID ${fs_id}, Product ID ${product_id}`,
        oldValue: { quantity: 0, station_id: fs_id, product_id: product_id },
        newValue: { quantity: quantityInLtrNum, station_id: fs_id, product_id: product_id, invoice_number: invoiceNumber },
        fieldName: 'quantity',
        recordType: 'stock_purchase',
        recordId: stockResult.insertId
      });
      console.log('✅ Audit log created for purchase:', { userId, userName, invoiceNumber });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
      // Don't throw - continue even if audit log fails
    }

    return NextResponse.json({ 
      success: true, 
      message: "Purchase saved successfully",
      data: {
        stockInsert: stockResult
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