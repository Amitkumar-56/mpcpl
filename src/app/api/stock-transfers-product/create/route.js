import { executeQuery, executeTransaction } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/auditLog";

export async function GET() {
  try {
    const [stations, products] = await Promise.all([
      executeQuery("SELECT id, station_name FROM filling_stations ORDER BY station_name"),
      executeQuery("SELECT id, pname FROM products ORDER BY pname")
    ]);

    return NextResponse.json({
      stations: stations || [],
      products: products || []
    });
  } catch (error) {
    console.error("Error fetching form data:", error);
    return NextResponse.json(
      { error: "Failed to fetch form data: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log("🚀 Product Transfer API called");
    const data = await request.json();
    console.log("📝 Received data:", JSON.stringify(data, null, 2));
    
    const {
      station_from,
      station_to,
      product_id,
      product_to, // For same station transfer
      transfer_quantity,
      remarks,
      status = "pending"
    } = data;

    // Validate required fields
    if (!station_from || !station_to || !product_id || !transfer_quantity) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    const quantity = parseFloat(transfer_quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Transfer quantity must be a positive number" },
        { status: 400 }
      );
    }

    // Convert to numbers for comparison
    const stationFromNum = parseInt(station_from);
    const stationToNum = parseInt(station_to);
    const productIdNum = parseInt(product_id);
    const productToNum = product_to ? parseInt(product_to) : null;
    
    // Check if same station transfer (Industrial Oil 40 <-> 60)
    const isSameStationTransfer = stationFromNum === stationToNum && productToNum;
    
    console.log("🔍 Transfer details:", {
      station_from: stationFromNum,
      station_to: stationToNum,
      product_id: productIdNum,
      product_to: productToNum,
      isSameStationTransfer,
      quantity
    });
    
    if (isSameStationTransfer) {
      // Validate product_to is required for same station transfer
      if (!product_to) {
        return NextResponse.json(
          { error: "Product To is required for same station transfer" },
          { status: 400 }
        );
      }
      
      // Validate it's Industrial Oil 40 or 60
      if ((productIdNum != 2 && productIdNum != 3) || (productToNum != 2 && productToNum != 3)) {
        return NextResponse.json(
          { error: "Same station transfer is only allowed between Industrial Oil 40 (ID: 2) and Industrial Oil 60 (ID: 3)" },
          { status: 400 }
        );
      }
      
      // Product from and to should be different
      if (productIdNum === productToNum) {
        return NextResponse.json(
          { error: "Product From and Product To must be different" },
          { status: 400 }
        );
      }
    } else if (stationFromNum === stationToNum) {
      return NextResponse.json(
        { error: "For same station transfer, Product To is required (Industrial Oil 40 ↔ Industrial Oil 60)" },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || null;
    // Ensure userName is fetched from employee_profile if not available
    let userName = currentUser?.userName;
    if (!userName && currentUser?.userId) {
      const users = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [currentUser.userId]
      );
      if (users.length > 0 && users[0].name) {
        userName = users[0].name;
      }
    }

    console.log("🔄 Starting transaction...");
    const result = await executeTransaction(async (connection) => {
      // Use numeric values
      const isSameStationTransfer = stationFromNum === stationToNum && productToNum;
      console.log("📍 Transfer type:", isSameStationTransfer ? "Same Station" : "Different Station");
      
      if (isSameStationTransfer) {
        // Same station transfer: Transfer between products in filling_stations_stock
        // Check source product stock
        const sourceStockQuery = `
          SELECT stock FROM filling_station_stocks 
          WHERE fs_id = ? AND product = ?
        `;
        console.log("🔍 Checking source stock:", { fs_id: stationFromNum, product: productIdNum });
        const [sourceStock] = await connection.execute(sourceStockQuery, [stationFromNum, productIdNum]);
        
        if (sourceStock.length === 0) {
          throw new Error(`No stock found for product ${product_id} at station ${station_from}`);
        }

        const availableStock = parseFloat(sourceStock[0].stock) || 0;
        if (availableStock < quantity) {
          throw new Error(`Insufficient stock. Available: ${availableStock}, Required: ${quantity}`);
        }

        // Update source product stock (subtract)
        const newSourceStock = availableStock - quantity;
        const updateSourceQuery = `
          UPDATE filling_station_stocks 
          SET stock = ?, msg = ?, remark = ?, created_at = NOW()
          WHERE fs_id = ? AND product = ?
        `;
        await connection.execute(updateSourceQuery, [
          newSourceStock,
          `Product transfer to ${productToNum} (same station)`,
          remarks || `Transferred ${quantity} from product ${productIdNum} to product ${productToNum}`,
          stationFromNum,
          productIdNum
        ]);
        console.log("✅ Source product stock updated:", { old: availableStock, new: newSourceStock });

        // Check destination product stock (same station, different product)
        const destStockQuery = `
          SELECT stock FROM filling_station_stocks 
          WHERE fs_id = ? AND product = ?
        `;
        console.log("🔍 Checking destination stock:", { fs_id: stationToNum, product: productToNum });
        const [destStock] = await connection.execute(destStockQuery, [stationToNum, productToNum]);
        
        let newDestStock;
        if (destStock.length === 0) {
          // Insert new stock record for destination product
          const insertDestQuery = `
            INSERT INTO filling_station_stocks (fs_id, product, stock, msg, remark, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
          `;
          await connection.execute(insertDestQuery, [
            stationToNum,
            productToNum,
            quantity,
            `Product transfer from ${productIdNum} (same station)`,
            remarks || `Received ${quantity} from product ${productIdNum}`
          ]);
          newDestStock = quantity;
          console.log("✅ Destination product stock inserted:", newDestStock);
        } else {
          // Update existing stock (add)
          const currentDestStock = parseFloat(destStock[0].stock) || 0;
          newDestStock = currentDestStock + quantity;
          const updateDestQuery = `
            UPDATE filling_station_stocks 
            SET stock = ?, msg = ?, remark = ?, created_at = NOW()
            WHERE fs_id = ? AND product = ?
          `;
          await connection.execute(updateDestQuery, [
            newDestStock,
            `Product transfer from ${productIdNum} (same station)`,
            remarks || `Received ${quantity} from product ${productIdNum}`,
            stationToNum,
            productToNum
          ]);
          console.log("✅ Destination product stock updated:", { old: currentDestStock, new: newDestStock });
        }

        // Insert into filling_history for source product (Outward)
        const sourceHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Outward', ?, ?, ?, NOW(), ?, NOW())
        `;
        await connection.execute(sourceHistoryQuery, [
          stationFromNum,
          productIdNum,
          availableStock,
          -quantity, // Negative for outward
          newSourceStock,
          userId
        ]);
        console.log("✅ Source product history created");

        // Insert into filling_history for destination product (Inward)
        const destHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())
        `;
        const oldDestStock = destStock.length > 0 ? parseFloat(destStock[0].stock) || 0 : 0;
        await connection.execute(destHistoryQuery, [
          stationToNum,
          productToNum,
          oldDestStock,
          quantity, // Positive for inward
          newDestStock,
          userId
        ]);
        console.log("✅ Destination product history created");

      } else {
        // Different station transfer: Regular transfer between stations
        // Check source station stock
        const sourceStockQuery = `
          SELECT stock FROM filling_station_stocks 
          WHERE fs_id = ? AND product = ?
        `;
        console.log("🔍 Checking source stock:", { fs_id: stationFromNum, product: productIdNum });
        const [sourceStock] = await connection.execute(sourceStockQuery, [stationFromNum, productIdNum]);
        
        if (sourceStock.length === 0) {
          throw new Error(`No stock found for product at source station`);
        }

        const availableStock = parseFloat(sourceStock[0].stock) || 0;
        console.log("📊 Source stock available:", availableStock);
        if (availableStock < quantity) {
          throw new Error(`Insufficient stock. Available: ${availableStock}, Required: ${quantity}`);
        }

        // Update source station stock (subtract)
        const newSourceStock = availableStock - quantity;
        const updateSourceQuery = `
          UPDATE filling_station_stocks 
          SET stock = ?, msg = ?, remark = ?, created_at = NOW()
          WHERE fs_id = ? AND product = ?
        `;
        await connection.execute(updateSourceQuery, [
          newSourceStock,
          `Product transfer to station ${stationToNum}`,
          remarks || `Transferred ${quantity} to another station`,
          stationFromNum,
          productIdNum
        ]);
        console.log("✅ Source stock updated:", { old: availableStock, new: newSourceStock });

        // Check destination station stock
        const destStockQuery = `
          SELECT stock FROM filling_station_stocks 
          WHERE fs_id = ? AND product = ?
        `;
        console.log("🔍 Checking destination stock:", { fs_id: stationToNum, product: productIdNum });
        const [destStock] = await connection.execute(destStockQuery, [stationToNum, productIdNum]);
        
        let newDestStock;
        if (destStock.length === 0) {
          // Insert new stock record for destination
          const insertDestQuery = `
            INSERT INTO filling_station_stocks (fs_id, product, stock, msg, remark, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
          `;
          await connection.execute(insertDestQuery, [
            stationToNum,
            productIdNum,
            quantity,
            `Product transfer from station ${stationFromNum}`,
            remarks || `Received ${quantity} from another station`
          ]);
          newDestStock = quantity;
          console.log("✅ Destination stock inserted:", newDestStock);
        } else {
          // Update existing stock (add)
          const currentDestStock = parseFloat(destStock[0].stock) || 0;
          newDestStock = currentDestStock + quantity;
          const updateDestQuery = `
            UPDATE filling_station_stocks 
            SET stock = ?, msg = ?, remark = ?, created_at = NOW()
            WHERE fs_id = ? AND product = ?
          `;
          await connection.execute(updateDestQuery, [
            newDestStock,
            `Product transfer from station ${stationFromNum}`,
            remarks || `Received ${quantity} from another station`,
            stationToNum,
            productIdNum
          ]);
          console.log("✅ Destination stock updated:", { old: currentDestStock, new: newDestStock });
        }

        // Insert into filling_history for source (Outward)
        const sourceHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Outward', ?, ?, ?, NOW(), ?, NOW())
        `;
        await connection.execute(sourceHistoryQuery, [
          stationFromNum,
          productIdNum,
          availableStock,
          -quantity, // Negative for outward
          newSourceStock,
          userId
        ]);
        console.log("✅ Source history created");

        // Insert into filling_history for destination (Inward)
        const destHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())
        `;
        const oldDestStock = destStock.length > 0 ? parseFloat(destStock[0].stock) || 0 : 0;
        await connection.execute(destHistoryQuery, [
          stationToNum,
          productIdNum,
          oldDestStock,
          quantity, // Positive for inward
          newDestStock,
          userId
        ]);
        console.log("✅ Destination history created");
      }

      // Insert into product_transfers table
      const insertTransferQuery = `
        INSERT INTO product_transfers (
          station_from, station_to, product_id, product_to, transfer_quantity, 
          status, remarks, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      console.log("📝 Inserting into product_transfers:", {
        station_from: stationFromNum,
        station_to: stationToNum,
        product_id: productIdNum,
        product_to: productToNum,
        quantity,
        status
      });
      const [transferResult] = await connection.execute(insertTransferQuery, [
        stationFromNum,
        stationToNum,
        productIdNum,
        productToNum || null, // For same station transfer
        quantity,
        status,
        remarks || null,
        userId
      ]);

      const transferId = transferResult.insertId;

      // Insert into filling_history for source (Outward)
      const sourceHistoryQuery = `
        INSERT INTO filling_history 
        (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
        VALUES (?, ?, 'Outward', ?, ?, ?, NOW(), ?, NOW())
      `;
      await connection.execute(sourceHistoryQuery, [
        stationFromNum,
        productIdNum,
        availableStock,
        -quantity, // Negative for outward
        newSourceStock,
        userId
      ]);
      console.log("✅ Source history created");

      // Insert into filling_history for destination (Inward)
      const destHistoryQuery = `
        INSERT INTO filling_history 
        (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
        VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())
      `;
      const oldDestStock = destStock.length > 0 ? parseFloat(destStock[0].stock) || 0 : 0;
      await connection.execute(destHistoryQuery, [
        stationToNum,
        productIdNum,
        oldDestStock,
        quantity, // Positive for inward
        newDestStock,
        userId
      ]);
      console.log("✅ Destination history created");

      // Create audit log
      try {
        await createAuditLog({
          page: 'Product Transfers',
          uniqueCode: `PROD-TRANSFER-${transferId}`,
          section: 'Product Transfer',
          userId: userId,
          userName: userName,
          action: 'create',
          remarks: isSameStationTransfer 
            ? `Product transfer created: ${quantity} units from product ${productIdNum} to product ${productToNum} (same station ${stationFromNum})`
            : `Product transfer created: ${quantity} units from station ${stationFromNum} to ${stationToNum}`,
          oldValue: null,
          newValue: {
            station_from: stationFromNum,
            station_to: stationToNum,
            product_id: productIdNum,
            product_to: productToNum,
            transfer_quantity: quantity,
            status,
            remarks
          },
          recordType: 'product_transfer',
          recordId: transferId
        });
        console.log("✅ Audit log created");
      } catch (auditError) {
        console.log("⚠️ Audit log creation failed (non-critical):", auditError.message);
        // Don't fail the transaction if audit log fails
      }

      console.log("✅ Transaction completed successfully, transfer ID:", transferId);
      return { transferId, success: true };
    });

    console.log("✅ Product transfer created successfully");
    return NextResponse.json({
      success: true,
      message: "Product transfer created successfully",
      transferId: result.transferId
    });

  } catch (error) {
    console.error("❌ Error creating product transfer:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Failed to create product transfer",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

