import { executeQuery, executeTransaction } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/auditLog";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }

    const query = `
      SELECT 
        pt.*,
        fs_from.station_name as station_from_name,
        fs_to.station_name as station_to_name,
        p.pname as product_name
      FROM product_transfers pt
      LEFT JOIN filling_stations fs_from ON pt.station_from = fs_from.id
      LEFT JOIN filling_stations fs_to ON pt.station_to = fs_to.id
      LEFT JOIN products p ON pt.product_id = p.id
      WHERE pt.id = ?
    `;

    const transfers = await executeQuery(query, [id]);
    
    if (transfers.length === 0) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ transfer: transfers[0] });
  } catch (error) {
    console.error("Error fetching transfer:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const {
      id,
      station_from,
      station_to,
      product_id,
      product_to, // For same station transfer
      transfer_quantity,
      remarks,
      status
    } = data;

    if (!id) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!station_from || !station_to || !product_id || !transfer_quantity) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    const newQuantity = parseFloat(transfer_quantity);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      return NextResponse.json(
        { error: "Transfer quantity must be a positive number" },
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

    const result = await executeTransaction(async (connection) => {
      // Get original transfer data
      const [originalTransfers] = await connection.execute(
        'SELECT * FROM product_transfers WHERE id = ?',
        [id]
      );

      if (originalTransfers.length === 0) {
        throw new Error("Transfer not found");
      }

      const original = originalTransfers[0];
      const oldQuantity = parseFloat(original.transfer_quantity) || 0;
      const oldStationFrom = original.station_from;
      const oldStationTo = original.station_to;
      const oldProductId = original.product_id;
      const oldProductTo = original.product_to;

      // Check if same station transfer
      const isSameStationTransfer = station_from === station_to && product_to;
      const wasSameStationTransfer = oldStationFrom === oldStationTo && oldProductTo;

      // Check if any critical fields changed
      const stationChanged = oldStationFrom !== parseInt(station_from) || oldStationTo !== parseInt(station_to);
      const productChanged = oldProductId !== parseInt(product_id) || oldProductTo !== parseInt(product_to || 0);
      const quantityChanged = Math.abs(oldQuantity - newQuantity) > 0.01;

      // Reverse old transfer first
      if (wasSameStationTransfer) {
        // Reverse same-station transfer: add back to source product, subtract from destination product
        const [oldSourceStock] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [oldStationFrom, oldProductId]
        );
        
        if (oldSourceStock.length > 0) {
          const oldSourceStockValue = parseFloat(oldSourceStock[0].stock) || 0;
          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
            [oldSourceStockValue + oldQuantity, oldStationFrom, oldProductId]
          );
        }

        const [oldDestStock] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [oldStationTo, oldProductTo]
        );
        
        if (oldDestStock.length > 0) {
          const oldDestStockValue = parseFloat(oldDestStock[0].stock) || 0;
          const newDestStock = Math.max(0, oldDestStockValue - oldQuantity);
          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
            [newDestStock, oldStationTo, oldProductTo]
          );
        }
      } else {
        // Reverse different-station transfer: add back to source, subtract from destination
        const [oldSourceStock] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [oldStationFrom, oldProductId]
        );
        
        if (oldSourceStock.length > 0) {
          const oldSourceStockValue = parseFloat(oldSourceStock[0].stock) || 0;
          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
            [oldSourceStockValue + oldQuantity, oldStationFrom, oldProductId]
          );
        }

        const [oldDestStock] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [oldStationTo, oldProductId]
        );
        
        if (oldDestStock.length > 0) {
          const oldDestStockValue = parseFloat(oldDestStock[0].stock) || 0;
          const newDestStock = Math.max(0, oldDestStockValue - oldQuantity);
          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
            [newDestStock, oldStationTo, oldProductId]
          );
        }
      }

      // Apply new transfer
      if (isSameStationTransfer) {
        // Same-station transfer: subtract from source product, add to destination product
        const [newSourceStock] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [station_from, product_id]
        );
        
        if (newSourceStock.length === 0) {
          throw new Error(`No stock found for product ${product_id} at station ${station_from}`);
        }

        const newSourceStockValue = parseFloat(newSourceStock[0].stock) || 0;
        if (newSourceStockValue < newQuantity) {
          throw new Error(`Insufficient stock. Available: ${newSourceStockValue}, Required: ${newQuantity}`);
        }

        await connection.execute(
          'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
          [newSourceStockValue - newQuantity, station_from, product_id]
        );

        const [newDestStock] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [station_to, product_to]
        );
        
        if (newDestStock.length === 0) {
          await connection.execute(
            'INSERT INTO filling_station_stocks (fs_id, product, stock, created_at) VALUES (?, ?, ?, NOW())',
            [station_to, product_to, newQuantity]
          );
        } else {
          const newDestStockValue = parseFloat(newDestStock[0].stock) || 0;
          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
            [newDestStockValue + newQuantity, station_to, product_to]
          );
        }
      } else {
        // Different-station transfer: subtract from source, add to destination
        const [newSourceStock] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [station_from, product_id]
        );
        
        if (newSourceStock.length === 0) {
          throw new Error(`No stock found for product at source station`);
        }

        const newSourceStockValue = parseFloat(newSourceStock[0].stock) || 0;
        if (newSourceStockValue < newQuantity) {
          throw new Error(`Insufficient stock. Available: ${newSourceStockValue}, Required: ${newQuantity}`);
        }

        await connection.execute(
          'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
          [newSourceStockValue - newQuantity, station_from, product_id]
        );

        const [newDestStock] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [station_to, product_id]
        );
        
        if (newDestStock.length === 0) {
          await connection.execute(
            'INSERT INTO filling_station_stocks (fs_id, product, stock, created_at) VALUES (?, ?, ?, NOW())',
            [station_to, product_id, newQuantity]
          );
        } else {
          const newDestStockValue = parseFloat(newDestStock[0].stock) || 0;
          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
            [newDestStockValue + newQuantity, station_to, product_id]
          );
        }
      }

      // Handle quantity-only changes (when only quantity changed, not stations or products)
      if (!stationChanged && !productChanged && quantityChanged) {
        const quantityDiff = newQuantity - oldQuantity;

        if (isSameStationTransfer) {
          // Same-station transfer: adjust source and destination products
          const [sourceStock] = await connection.execute(
            'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
            [station_from, product_id]
          );
          
          if (sourceStock.length === 0) {
            throw new Error(`No stock found for product ${product_id} at station ${station_from}`);
          }

          const sourceStockValue = parseFloat(sourceStock[0].stock) || 0;
          if (quantityDiff > 0 && sourceStockValue < quantityDiff) {
            throw new Error(`Insufficient stock. Available: ${sourceStockValue}, Required additional: ${quantityDiff}`);
          }

          const newSourceStock = sourceStockValue - quantityDiff;
          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
            [newSourceStock, station_from, product_id]
          );

          // Update destination product (same station, different product)
          const [destStock] = await connection.execute(
            'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
            [station_to, product_to]
          );
          
          if (destStock.length === 0) {
            if (quantityDiff > 0) {
              await connection.execute(
                'INSERT INTO filling_station_stocks (fs_id, product, stock, created_at) VALUES (?, ?, ?, NOW())',
                [station_to, product_to, quantityDiff]
              );
            }
          } else {
            const destStockValue = parseFloat(destStock[0].stock) || 0;
            const newDestStock = destStockValue + quantityDiff;
            await connection.execute(
              'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
              [Math.max(0, newDestStock), station_to, product_to]
            );
          }
        } else {
          // Different-station transfer: adjust source and destination stations
          const [sourceStock] = await connection.execute(
            'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
            [station_from, product_id]
          );
          
          if (sourceStock.length === 0) {
            throw new Error(`No stock found for product at source station`);
          }

          const sourceStockValue = parseFloat(sourceStock[0].stock) || 0;
          if (quantityDiff > 0 && sourceStockValue < quantityDiff) {
            throw new Error(`Insufficient stock. Available: ${sourceStockValue}, Required additional: ${quantityDiff}`);
          }

          const newSourceStock = sourceStockValue - quantityDiff;
          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
            [newSourceStock, station_from, product_id]
          );

          // Update destination station
          const [destStock] = await connection.execute(
            'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
            [station_to, product_id]
          );
          
          if (destStock.length === 0) {
            if (quantityDiff > 0) {
              await connection.execute(
                'INSERT INTO filling_station_stocks (fs_id, product, stock, created_at) VALUES (?, ?, ?, NOW())',
                [station_to, product_id, quantityDiff]
              );
            }
          } else {
            const destStockValue = parseFloat(destStock[0].stock) || 0;
            const newDestStock = destStockValue + quantityDiff;
            await connection.execute(
              'UPDATE filling_station_stocks SET stock = ?, created_at = NOW() WHERE fs_id = ? AND product = ?',
              [Math.max(0, newDestStock), station_to, product_id]
            );
          }
        }
      }

      // Update transfer record
      await connection.execute(
        `UPDATE product_transfers 
         SET station_from = ?, station_to = ?, product_id = ?, product_to = ?, transfer_quantity = ?, 
             status = ?, remarks = ?, updated_at = NOW()
         WHERE id = ?`,
        [station_from, station_to, product_id, product_to || null, newQuantity, status, remarks || null, id]
      );

      // Create audit log
      await createAuditLog({
        page: 'Product Transfers',
        uniqueCode: `PROD-TRANSFER-${id}`,
        section: 'Product Transfer',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Product transfer updated: ${newQuantity} units from station ${station_from} to ${station_to}`,
        oldValue: original,
        newValue: {
          station_from,
          station_to,
          product_id,
          transfer_quantity: newQuantity,
          status,
          remarks
        },
        recordType: 'product_transfer',
        recordId: parseInt(id)
      });

      return { success: true };
    });

    return NextResponse.json({
      success: true,
      message: "Product transfer updated successfully"
    });

  } catch (error) {
    console.error("Error updating product transfer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update product transfer" },
      { status: 500 }
    );
  }
}

