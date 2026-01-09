import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/auth";
import { executeQuery, executeTransaction } from "@/lib/db";
import { NextResponse } from "next/server";

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
      product_to,
      transfer_quantity,
      remarks,
      status = "pending"
    } = data;

    // Validate required fields
    if (!station_from || !station_to || !transfer_quantity) {
      return NextResponse.json(
        { error: "Station From, Station To and Quantity are required" },
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

    // Convert to numbers
    const stationFromNum = parseInt(station_from);
    const stationToNum = parseInt(station_to);
    
    // Check if same station transfer
    const isSameStationTransfer = stationFromNum === stationToNum;
    
    console.log("🔍 Transfer details:", {
      station_from: stationFromNum,
      station_to: stationToNum,
      product_id,
      product_to,
      isSameStationTransfer,
      quantity
    });
    
    if (isSameStationTransfer) {
      // Same station transfer requires BOTH products
      if (!product_id || !product_to) {
        return NextResponse.json(
          { error: "Product From and Product To are required for same station transfer" },
          { status: 400 }
        );
      }
      
      const productIdNum = parseInt(product_id);
      const productToNum = parseInt(product_to);
      
      // Validate products are different
      if (productIdNum === productToNum) {
        return NextResponse.json(
          { error: "Product From and Product To must be different" },
          { status: 400 }
        );
      }
    } else {
      // Different station transfer requires only product_id
      if (!product_id) {
        return NextResponse.json(
          { error: "Product is required for transfer between different stations" },
          { status: 400 }
        );
      }
    }

    // Get current user
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || null;
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
      if (isSameStationTransfer) {
        // Same station transfer
        const productIdNum = parseInt(product_id);
        const productToNum = parseInt(product_to);
        
        // Check source product stock
        const sourceStockQuery = `
          SELECT stock FROM filling_station_stocks 
          WHERE fs_id = ? AND product = ?
        `;
        console.log("🔍 Checking source stock:", { fs_id: stationFromNum, product: productIdNum });
        const [sourceStock] = await connection.execute(sourceStockQuery, [stationFromNum, productIdNum]);
        
        if (sourceStock.length === 0) {
          throw new Error(`No stock found for source product at station`);
        }

        const availableStock = parseFloat(sourceStock[0].stock) || 0;
        if (availableStock < quantity) {
          throw new Error(`Insufficient stock. Available: ${availableStock}, Required: ${quantity}`);
        }

        // Update source product stock
        const newSourceStock = availableStock - quantity;
        const updateSourceQuery = `
          UPDATE filling_station_stocks 
          SET stock = ?, msg = ?, remark = ?
          WHERE fs_id = ? AND product = ?
        `;
        await connection.execute(updateSourceQuery, [
          newSourceStock,
          `Transferred to product ${productToNum}`,
          remarks || `Transferred ${quantity} units to product ${productToNum}`,
          stationFromNum,
          productIdNum
        ]);
        console.log("✅ Source product stock updated");

        // Check destination product stock
        const destStockQuery = `
          SELECT stock FROM filling_station_stocks 
          WHERE fs_id = ? AND product = ?
        `;
        console.log("🔍 Checking destination stock:", { fs_id: stationToNum, product: productToNum });
        const [destStock] = await connection.execute(destStockQuery, [stationToNum, productToNum]);
        
        let newDestStock;
        let oldDestStock = 0;
        
        if (destStock.length === 0) {
          // Insert new stock record
          const insertDestQuery = `
            INSERT INTO filling_station_stocks (fs_id, product, stock, msg, remark, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
          `;
          await connection.execute(insertDestQuery, [
            stationToNum,
            productToNum,
            quantity,
            `Transferred from product ${productIdNum}`,
            remarks || `Received ${quantity} units from product ${productIdNum}`
          ]);
          newDestStock = quantity;
          console.log("✅ Destination product stock inserted");
        } else {
          // Update existing stock
          oldDestStock = parseFloat(destStock[0].stock) || 0;
          newDestStock = oldDestStock + quantity;
          const updateDestQuery = `
            UPDATE filling_station_stocks 
            SET stock = ?, msg = ?, remark = ?
            WHERE fs_id = ? AND product = ?
          `;
          await connection.execute(updateDestQuery, [
            newDestStock,
            `Transferred from product ${productIdNum}`,
            remarks || `Received ${quantity} units from product ${productIdNum}`,
            stationToNum,
            productToNum
          ]);
          console.log("✅ Destination product stock updated");
        }

        // Insert history for source product
        const sourceHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Outward', ?, ?, ?, NOW(), ?, NOW())
        `;
        await connection.execute(sourceHistoryQuery, [
          stationFromNum,
          productIdNum,
          availableStock,
          -quantity,
          newSourceStock,
          userId
        ]);

        // Insert history for destination product
        const destHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())
        `;
        await connection.execute(destHistoryQuery, [
          stationToNum,
          productToNum,
          oldDestStock,
          quantity,
          newDestStock,
          userId
        ]);

        // Insert into product_transfers table
        const insertTransferQuery = `
          INSERT INTO product_transfers (
            station_from, station_to, product_id, product_to, transfer_quantity, 
            status, remarks, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        const [transferResult] = await connection.execute(insertTransferQuery, [
          stationFromNum,
          stationToNum,
          productIdNum,
          productToNum,
          quantity,
          status,
          remarks || null,
          userId
        ]);

        const transferId = transferResult.insertId;

        // Create audit log
        await createAuditLog({
          page: 'Product Transfers',
          uniqueCode: `PROD-TRANSFER-${transferId}`,
          section: 'Same Station Transfer',
          userId: userId,
          userName: userName,
          action: 'create',
          remarks: `Same station product transfer: ${quantity} units`,
          oldValue: null,
          newValue: {
            station: stationFromNum,
            product_from: productIdNum,
            product_to: productToNum,
            transfer_quantity: quantity,
            source_stock_before: availableStock,
            source_stock_after: newSourceStock,
            dest_stock_before: oldDestStock,
            dest_stock_after: newDestStock
          },
          recordType: 'product_transfer',
          recordId: transferId
        });

        return { transferId, success: true };

      } else {
        // Different station transfer
        const productIdNum = parseInt(product_id);
        
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
        if (availableStock < quantity) {
          throw new Error(`Insufficient stock. Available: ${availableStock}, Required: ${quantity}`);
        }

        // Update source station stock
        const newSourceStock = availableStock - quantity;
        const updateSourceQuery = `
          UPDATE filling_station_stocks 
          SET stock = ?, msg = ?, remark = ?
          WHERE fs_id = ? AND product = ?
        `;
        await connection.execute(updateSourceQuery, [
          newSourceStock,
          `Transferred to station ${stationToNum}`,
          remarks || `Transferred ${quantity} units to another station`,
          stationFromNum,
          productIdNum
        ]);

        // Check destination station stock
        const destStockQuery = `
          SELECT stock FROM filling_station_stocks 
          WHERE fs_id = ? AND product = ?
        `;
        console.log("🔍 Checking destination stock:", { fs_id: stationToNum, product: productIdNum });
        const [destStock] = await connection.execute(destStockQuery, [stationToNum, productIdNum]);
        
        let newDestStock;
        let oldDestStock = 0;
        
        if (destStock.length === 0) {
          // Insert new stock record
          const insertDestQuery = `
            INSERT INTO filling_station_stocks (fs_id, product, stock, msg, remark, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
          `;
          await connection.execute(insertDestQuery, [
            stationToNum,
            productIdNum,
            quantity,
            `Transferred from station ${stationFromNum}`,
            remarks || `Received ${quantity} units from another station`
          ]);
          newDestStock = quantity;
        } else {
          // Update existing stock
          oldDestStock = parseFloat(destStock[0].stock) || 0;
          newDestStock = oldDestStock + quantity;
          const updateDestQuery = `
            UPDATE filling_station_stocks 
            SET stock = ?, msg = ?, remark = ?
            WHERE fs_id = ? AND product = ?
          `;
          await connection.execute(updateDestQuery, [
            newDestStock,
            `Transferred from station ${stationFromNum}`,
            remarks || `Received ${quantity} units from another station`,
            stationToNum,
            productIdNum
          ]);
        }

        // Insert history for source
        const sourceHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Outward', ?, ?, ?, NOW(), ?, NOW())
        `;
        await connection.execute(sourceHistoryQuery, [
          stationFromNum,
          productIdNum,
          availableStock,
          -quantity,
          newSourceStock,
          userId
        ]);

        // Insert history for destination
        const destHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())
        `;
        await connection.execute(destHistoryQuery, [
          stationToNum,
          productIdNum,
          oldDestStock,
          quantity,
          newDestStock,
          userId
        ]);

        // Insert into product_transfers table - added updated_at here
        const insertTransferQuery = `
          INSERT INTO product_transfers (
            station_from, station_to, product_id, transfer_quantity, 
            status, remarks, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        const [transferResult] = await connection.execute(insertTransferQuery, [
          stationFromNum,
          stationToNum,
          productIdNum,
          quantity,
          status,
          remarks || null,
          userId
        ]);

        const transferId = transferResult.insertId;

        // Create audit log
        await createAuditLog({
          page: 'Product Transfers',
          uniqueCode: `PROD-TRANSFER-${transferId}`,
          section: 'Different Station Transfer',
          userId: userId,
          userName: userName,
          action: 'create',
          remarks: `Product transfer: ${quantity} units`,
          oldValue: null,
          newValue: {
            station_from: stationFromNum,
            station_to: stationToNum,
            product_id: productIdNum,
            transfer_quantity: quantity,
            source_stock_before: availableStock,
            source_stock_after: newSourceStock,
            dest_stock_before: oldDestStock,
            dest_stock_after: newDestStock
          },
          recordType: 'product_transfer',
          recordId: transferId
        });

        return { transferId, success: true };
      }
    });

    return NextResponse.json({
      success: true,
      message: "Product transfer created successfully",
      transferId: result.transferId
    });

  } catch (error) {
    console.error("❌ Error creating product transfer:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to create product transfer"
      },
      { status: 500 }
    );
  }
}